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
		var plugin, dfd, resolver;

		plugin = fileCtx.plugin && fileCtx.plugin();
		dfd = when.defer();

		if (plugin) {
			if (plugin.compile) {
				resolver = {
					write: resolve,
					read: function (absId, callback, errback) {
						when(io.readModule(getCtx(absId)), callback, errback);
					},
					error: dfd.reject
				};
				plugin.compile(fileCtx.absId, parentCtx.require, resolver, parentCtx.config());
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

			// collect dependency ids
			if (module.depList) {
				deps = module.depList;
			}
			if (module.requires) {
				deps = deps.concat(
					module.requires.map(function (req) { return req.id; })
				);
			}

			// process dependencies
			if (deps && deps.length) {
				compile(deps.map(removeQuotes), io, fileCtx).then(function (depCtxs) {
					// correct the ids of the dependencies
					var depCount = module.depList ? module.depList.length : 0;
					depCtxs.forEach(function (depCtx, i) {
						if (i < depCount) {
							module.depList[i] = depCtx.absId;
						}
						else {
							module.requires[i - depCount].id = depCtx.absId;
						}
					});
				});
			}
		});
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
		return id.replace(removeQuotesRx, '');
	}

});
