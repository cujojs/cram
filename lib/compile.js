/** MIT License (c) copyright 2010-2013 B Cavalier & J Hann */

define(['when', 'when/sequence', 'cram/lib/ctx', 'cram/lib/compile/scan'],
function (when, sequence, getCtx, scan) {

	var removeQuotesRx, pseudoModules;

	removeQuotesRx = /^["']|["']$/g;
	pseudoModules = { require: 1, exports: 1, module: 1 };

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
	 */
	function compile (ids, io, parentCtx) {

		return when.map(ids, function (id) {
			var plugin, read, write, parse, deps, absId, tasks;

			absId = parentCtx.toAbsId(id);

			if (id in pseudoModules) return {absId: absId };

			plugin = curryChain(getPlugin);
			read = curryChain(toAmdText);
			write = curryChain(writeToCache);
			parse = curryChain(parseModules);
			deps = curryChain(collectDeps);

			tasks = [plugin, read, parse, addAnonymousId, deps, notify, write];

			return when(getCtx(absId, parentCtx.config), compileContext);

			function compileContext (fileCtx) {
				return sequence(tasks, fileCtx).then(
					function () { return fileCtx; },
					function (ex) {
						ex.message += ' ' + fileCtx.absId;
						throw ex;
					}
				);
			}

			function addAnonymousId (fileCtx) {
				// assign id to first anonymous module
				fileCtx.modules.every(function (module) {
					if (!module.id) module.id = absId;
					else return true;
				});
			}

		});

		function notify (fileCtx) {
			io.collect(fileCtx.absId, fileCtx);
		}

		function curryChain (func) {
			return function (fileCtx) {
				return func(io, parentCtx, fileCtx);
			};
		}

	}

	return compile;

	function getPlugin (io, parentCtx, fileCtx) {
		var parts, dfd;

		dfd = when.defer();
		parts = pluginParts(parentCtx.toAbsId(fileCtx.absId));

		if (!parts.pluginId) {
			// check for moduleLoader
			if (fileCtx.config.moduleLoader) {
				parts = {
					pluginId: fileCtx.config.moduleLoader,
					resourceId: fileCtx.absId
				};
			}
		}

		if (parts.pluginId) {
			// plugin-based resources get normalized via plugin
			getModule(parts.pluginId, parentCtx).then(function (plugin) {
				var pluginCtx;
				if (plugin.cramPlugin) {
					pluginCtx = getCtx(parts.pluginId, parentCtx.config);
					return getModule(plugin.cramPlugin, pluginCtx);
				}
				else {
					return plugin;
				}
			})
			.then(function (plugin) {
				fileCtx.pluginId = parts.pluginId;
				fileCtx.resourceId = parts.resourceId;
				if (plugin.normalize) {
					parts.resourceId = plugin.normalize(parts.resourceId, parentCtx.toAbsId, parentCtx.config);
				}
				else {
					// the AMD spec says that the resourceId should be normalized.
					// this seems like a bad idea since it may not necessarily mimic
					// AMD behavior.  Oh well, following the spec...
					parts.resourceId = parentCtx.toAbsId(parts.resourceId);
				}
				fileCtx.absId = parts.pluginId + '!' + parts.resourceId;
				fileCtx.resourceId = parts.resourceId;
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
		var plugin, dfd, pio;

		plugin = fileCtx.plugin && fileCtx.plugin();
		dfd = when.defer();

		if (plugin) {
			if (plugin.compile) {
				pio = {
					write: resolve,
					read: function (absId, callback, errback) {
						var url = parentCtx.toUrl(absId);
						when(io.readFile(url), callback, errback);
					},
					error: dfd.reject,
					warn: (console.warn ? console.warn : console.log).bind(console),
					info: console.log.bind(console)
				};
				plugin.compile(fileCtx.pluginId, fileCtx.resourceId, parentCtx.require, pio, parentCtx.config);
			}
			else {
				// the resource is not included in the output
				resolve('');
			}
		}
		else {
			// get the text of the module
			when(io.readModule(fileCtx), resolve, dfd.reject);
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
			//if (modules.errors) modules.errors.forEach(io.error);
			if (modules.warnings) modules.warnings.forEach(io.warn);
			if (modules.infos) modules.infos.forEach(io.info);
			fileCtx.modules = modules || [];
		});
	}

	// TODO: does this really belong in here? i don't think so.
	function writeToCache (io, parentCtx, fileCtx) {
		// this will write-out all non-functions
		return when.resolve(io.writeMeta(fileCtx, toString(fileCtx)));

		function toString (fileCtx) {
			var stringable, p;
			stringable = {};
			for (p in fileCtx) {
				// don't write out functions or config
				if (typeof fileCtx[p] != 'function' && p != 'config') {
					stringable[p] = fileCtx[p];
				}
			}
			return JSON.stringify(stringable);
		}
	}

	function collectDeps (io, parentCtx, fileCtx) {
		// not sure this is the best place for this, but can't find another place atm:
		// plugin-based resource that is fetched at run-time, needs plugin to be included
		if (fileCtx.pluginId && !fileCtx.text) {
			return compile([fileCtx.pluginId], io, parentCtx);
		}

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
				return compile(deps.map(removeQuotes), io, fileCtx).then(function (depCtxs) {
					fixDepIds(depCtxs, module);
				});
			}
		});

		function fixDepIds (depCtxs, parentModule) {
			// correct the ids of the dependencies
			var depCount = parentModule.depList ? parentModule.depList.length : 0;
			depCtxs.forEach(function (depCtx, i) {
				if (i < depCount) {
					parentModule.depList[i] = depCtx.absId;
				}
				else {
					parentModule.requires[i - depCount].id = depCtx.absId;
				}
			});
		}
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
