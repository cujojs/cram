define(['when', 'cram/lib/ctx', 'cram/lib/compile/scan'], function (when, getCtx, scan) {

	var removeQuotesRx = /^["']|["']$/g;

	/**
	 * Takes a list of module ids, iterates through them, descends into
	 * their dependency chain, compiles each dep, and outputs the results.
	 * @param ids {Array} list of top-level module ids, processed
	 *   in order.
	 * @param io {Object} functions needed to read/write. io has the following
	 * methods:
	 *   readModule: function (absId) { return promise; }
	 *   writeModule: function (absId, contents) { return promise; }
	 *   collect: function (absId) {}
	 *
	 * TODO/FIXME:
	 * - plugin write methods
	 */
	function compile (ids, io, parentCtx) {

		return when.map(ids, function (id) {
			var plugin, read, write, parse, deps, absId;

			plugin = curryChain(getPlugin);
			read = curryChain(toAmdText);
			write = curryChain(writeToCache);
			parse = curryChain(parseModules);
			deps = curryChain(collectDeps);

			absId = parentCtx.toAbsId(id);

			return when(getCtx(absId, parentCtx.config()))
				// get plugin, if any
				.then(plugin)
				// read file as text
				.then(read)
				// parse file, extracting module info
				.then(parse)
				// HACK: fill-in anonymous module id
				// TODO: where does this really go?
				.then(function (fileCtx) {
					if (fileCtx.modules && fileCtx.modules[0] && !fileCtx.modules[0].id) {
						fileCtx.modules[0].id = absId;
					}
					return fileCtx;
				})
				// process dependencies
				.then(deps)
				// notify collector about this file
				.then(function (fileCtx) {
					io.collect(fileCtx.absId, fileCtx);
					return fileCtx;
				})
				// write file out (TODO: does this really belong in here???)
				.then(write);
		});

		function curryChain (func) {
			return function (fileCtx) {
				return when(func(io, parentCtx, fileCtx), function () {
					return fileCtx;
				});
			}
		}

	}

	return compile;

	function getPlugin (io, parentCtx, fileCtx) {
		var parts, dfd;

		parts = pluginParts(parentCtx.toAbsId(fileCtx.absId));
		dfd = when.defer();

		if (parts.pluginId) {
			// plugin-based resources get normalized via plugin
			getModule(parts.pluginId, parentCtx).then(function (plugin) {
				var pluginCtx;
				if (plugin.pluginBuilder) {
					pluginCtx = getCtx(parts.pluginId, parentCtx.config());
					return getModule(plugin.pluginBuilder, pluginCtx);
				}
				else {
					return plugin;
				}
			})
			.then(function (plugin) {
				fileCtx.pluginId = parts.pluginId;
				fileCtx.resourceId = parts.resourceId;
				if (plugin.normalize) {
					parts.resourceId = plugin.normalize(parts.resourceId, parentCtx.toAbsId, parentCtx.config());
					fileCtx.absId = parts.pluginId + '!' + parts.resourceId;
				}
				// HACK: we're using a function so the plugin property
				// won't get JSON.stringify()ed
				fileCtx.plugin = function () { return plugin; };
				return fileCtx;
			})
			.then(dfd.resolve, dfd.reject);
		}
		else {
			dfd.resolve(fileCtx);
		}

		return dfd.promise;
	}

	function getModule (id, parentCtx) {
		var dfd = when.defer();
		parentCtx.require([id], dfd.resolve, dfd.reject);
		return dfd.promise;
	}

	function toAmdText (io, parentCtx, fileCtx) {
		var plugin, dfd;

		plugin = fileCtx.plugin;
		dfd = when.defer();

		if (plugin) {
			if (plugin.write) {
				plugin.write(fileCtx.pluginId, fileCtx.resourceId, resolve);
			}
			else {
				resolve('');
			}
		}
		else {
			// get the text of the module
			when(io.readModule(fileCtx), resolve);
		}

		return dfd.promise;

		function resolve (val) {
			fileCtx.text = val;
			dfd.resolve(fileCtx);
		}
	}

	function parseModules (io, parentCtx, fileCtx) {
		// scan for AMD meta data
		return when(scan(fileCtx.text), function (modules) {
			fileCtx.modules = modules || [];
		})
	}

	// TODO: does this really belong in here? i don't think so.
	function writeToCache (io, parentCtx, fileCtx) {
		// this will write-out all non-functions
		return when(io.writeMeta(fileCtx, JSON.stringify(fileCtx)));
	}

	function collectDeps (io, parentCtx, fileCtx) {
		// iterate through modules found in AMD meta data
		return when.map(fileCtx.modules, function (module) {
			var deps;

			deps = [];

			// convert ids to absolute

			if (module.depList) {
				deps = module.depList;
			}
			if (module.requires) {
				deps = deps.concat(
					module.requires.map(function (req) { return req.id; })
				);
			}

			return deps && deps.length && compile(deps.map(removeQuotes), io, fileCtx);
		});
	}

//	function normalizeViaPlugin (pluginCtx, parentCtx, fileCtx) {
//		var dfd;
//
//		dfd = when.defer();
//
//		// get plugin
//		fileCtx.require([pluginCtx.absId],
//			function (plugin) {
//				var bid, bctx;
//
//				if (plugin.normalize) {
//					fileCtx.absId = fileCtx.pluginId + '!'
//						+ plugin.normalize(fileCtx.resourceId, parentCtx.toAbsId, parentCtx.config());
//				}
//
//				if (plugin.pluginBuilder) {
//					// go get build-time plugin module and try again
//					bid = pluginCtx.toAbsId(plugin.pluginBuilder);
//					bctx = getCtx(bid, pluginCtx.config());
//					when.chain(normalizeViaPlugin(bctx, parentCtx, fileCtx), dfd);
//				}
//				else if (!plugin.write) {
//					// if there's no write(), then this is a runtime-only plugin
//					// and there's no AMD module to write out
//					resolve('');
//				}
//				else {
//					plugin.write(fileCtx.pluginId, fileCtx.resourceId, resolve);
//				}
//
//			},
//			dfd.reject
//		);
//
//		return dfd.promise;
//
//		function resolve (txt) {
//			fileCtx.text = txt;
//			return dfd.resolve(fileCtx);
//		}
//
////			write = plugin.write.bind(plugin, parts.pluginId, parts.resourceId, dfd.resolve);
////
////			// requirejs plugins must have their load() method called before
////			// calling write() so they can cache the resource. curl's
////			// plugins just need write() to be called
////			if (plugin.load) {
////				plugin.load(resourceId, require, write, config);
////			}
////			else {
////				write();
////			}
//	}

	function pluginParts (id) {
		var delPos = id.indexOf('!');
		return {
			resourceId: id.substr(delPos + 1),
			// resourceId can be zero length
			pluginId: delPos >= 0 && id.substr(0, delPos)
		};
	}

	function removeQuotes (id) {
		return id.replace(removeQuotesRx, '');
	}

});
