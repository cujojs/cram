define(['when', 'cram/lib/ctx', 'cram/lib/compile/scan'], function (when, getCtx, scan) {

	/**
	 * Takes a list of module ids, iterates through them, descends into
	 * their dependency chain, compiles each dep, and outputs the results.
	 * @param absIds {Array} list of top-level module ids, processed
	 *   in order.
	 * @param io {Object} functions needed to read/write. io has the following
	 * methods:
	 *   readModule: function (absId) { return promise; }
	 *   writeModule: function (absId, contents) { return promise; }
	 *   collect: function (absId) {}
	 *
	 * TODO/FIXME:
	 * - why aren't normalized ids getting output?
	 * - plugin write methods
	 */
	function compile (absIds, io, parentCtx) {

		return when.map(absIds, function (absId) {
			var read, write, parse, deps;

			read = curryChain(toAmdText);
			write = curryChain(writeToCache);
			parse = curryChain(parseModules);
			deps = curryChain(collectDeps);

			return when(getCtx(absId, parentCtx.config()))
				.then(read)
				.then(parse)
				.then(function (fileCtx) {
					// fill-in anonymous module id
					// TODO: where does this really go?
					if (fileCtx.modules && fileCtx.modules[0] && !fileCtx.modules[0].id) {
						fileCtx.modules[0].id = absId;
					}
					return fileCtx;
				})
				.then(deps)
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

	function toAmdText (io, parentCtx, fileCtx) {
		var parts, pluginCtx, promise;

		parts = pluginParts(fileCtx.absId);

		if (parts.pluginId) {
			// plugin-based resources get normalized via plugin
			fileCtx.pluginId = parts.pluginId;
			fileCtx.resourceId = parts.resourceId;
			pluginCtx = getCtx(parts.pluginId, parentCtx.config());
			promise = normalizeViaPlugin(pluginCtx, parentCtx, fileCtx).then(function (newCtx) {
				fileCtx.text = newCtx.text;
				fileCtx.absId = newCtx.absId;
			});
		}
		else {
			// get the text of the module
			promise = when(io.readModule(fileCtx)).then(function (text) {
				fileCtx.text = text;
			});
		}

		return promise;
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
				deps = module.depList = module.depList.map(fileCtx.toAbsId).map(removeQuotes);
			}
			if (module.requires) {
				module.requires = module.requires.map(fileCtx.toAbsId).map(removeQuotes);
				deps = deps.concat(
					module.requires.map(function (req) { return req.id; })
				);
			}

			// process each id in both depList and r-val requires
			return deps && deps.length && compile(deps, io, fileCtx);
		})
		.then(function () {
				return io.collect(fileCtx.absId, fileCtx);
		});
	}

	function normalizeViaPlugin (pluginCtx, parentCtx, fileCtx) {
		var dfd;

		dfd = when.defer();

		// get plugin
		fileCtx.require([pluginCtx.absId],
			function (plugin) {
				var bid, bctx;

				if (plugin.normalize) {
					fileCtx.absId = fileCtx.pluginId + '!'
						+ plugin.normalize(fileCtx.resourceId, parentCtx.toAbsId, parentCtx.config());
				}

				if (plugin.pluginBuilder) {
					// go get build-time plugin module and try again
					bid = pluginCtx.toAbsId(plugin.pluginBuilder);
					bctx = getCtx(bid, pluginCtx.config());
					when.chain(normalizeViaPlugin(bctx, parentCtx, fileCtx), dfd);
				}
				else if (!plugin.write) {
					// if there's no write(), then this is a runtime-only plugin
					// and there's no AMD module to write out
					resolve('');
				}
				else {
					plugin.write(fileCtx.pluginId, fileCtx.resourceId, resolve);
				}

			},
			dfd.reject
		);

		return dfd.promise;

		function resolve (txt) {
			fileCtx.text = txt;
			return dfd.resolve(fileCtx);
		}

//			write = plugin.write.bind(plugin, parts.pluginId, parts.resourceId, dfd.resolve);
//
//			// requirejs plugins must have their load() method called before
//			// calling write() so they can cache the resource. curl's
//			// plugins just need write() to be called
//			if (plugin.load) {
//				plugin.load(resourceId, require, write, config);
//			}
//			else {
//				write();
//			}
	}

	function pluginParts (id) {
		var delPos = id.indexOf('!');
		return {
			resourceId: id.substr(delPos + 1),
			// resourceId can be zero length
			pluginId: delPos >= 0 && id.substr(0, delPos)
		};
	}

	function removeQuotes (id) {
		return id.replace(/^["']|["']$/g, '');
	}

});
