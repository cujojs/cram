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
	 */
	function compile (absIds, io, config) {

		return when.map(absIds, function (absId) {
			var read, write, parse, deps;

			read = curryChain(toAmdText);
			write = curryChain(writeToCache);
			parse = curryChain(parseModules);
			deps = curryChain(collectDeps);

			return when(getCtx(absId, config))
				.then(read)
				.then(parse)
				.then(function (ctx) {
					// fill-in anonymous module id
					// TODO: where does this really go?
					if (ctx.modules && ctx.modules[0] && !ctx.modules[0].id) {
						ctx.modules[0].id = absId;
					}
					return ctx;
				})
				.then(write)
				.then(deps);
		});

		function curryChain (func) {
			return function (ctx) {
				return when(func(io, config, ctx), function () {
					return ctx;
				});
			}
		}

	}

	return compile;

	function toAmdText (io, config, ctx) {
		var parts, pctx, promise;

		parts = pluginParts(ctx.absId);

		if (parts.pluginId) {
			// plugin-based resources get normalized via plugin
			pctx = getCtx(parts.pluginId, config);
			promise = normalizeViaPlugin(pctx, parts.pluginId, parts.resourceId);
		}
		else {
			// get the text of the module
			promise = when(io.readModule(ctx));
		}

		return promise.then(function (text) {
			ctx.text = text;
		});
	}

	function parseModules (io, config, ctx) {
		// scan for AMD meta data
		return when(scan(ctx.text), function (modules) {
			ctx.modules = modules || [];
		})
	}

	// TODO: does this really belong in here? i don't think so.
	function writeToCache (io, config, ctx) {
		var descriptor;
		// write out module descriptor
		descriptor = {
			absId: ctx.absId,
			modules: ctx.modules,
			text: ctx.text
		};
		return when(io.writeMeta(ctx, JSON.stringify(descriptor)));
	}

	function collectDeps (io, config, ctx) {
		// iterate through modules found in AMD meta data
		return when.map(ctx.modules, function (module) {
			var deps, requires;

			// process each id in both depList and r-val requires
			deps = module.depList || [];
			requires = module.requires
				? module.requires.map(function (req) { return req.id; })
				: [];
			deps = deps.concat(requires);
			if (deps && deps.length) {
				deps = deps.map(removeQuotes).map(ctx.toAbsId);
				return compile(deps, io, ctx.config())
					.then(function () { io.collect(module.id || ctx.absId); });
			}
			else {
				return io.collect(module.id || ctx.absId);
			}
		});
	}

	function normalizeViaPlugin (ctx, pluginId, resourceId) {
		var dfd, bid, bctx;

		dfd = when.defer();

		// get plugin
		ctx.require([pluginId],
			function (plugin) {

				if (plugin.pluginBuilder) {
					// go get build-time plugin module and try again
					bid = ctx.toAbsId(plugin.pluginBuilder);
					bctx = getCtx(bid, ctx.config());
					when.chain(normalizeViaPlugin(bctx, bid, resourceId), dfd);
				}
				else if (!plugin.write) {
					// if there's no write(), then this is a runtime-only plugin
					// and there's no AMD module to write out
					dfd.resolve('');
				}
				else {
					// TODO: normalize resourceId first!? ******************

					plugin.write(pluginId, resourceId, resolve);
				}

			},
			dfd.reject
		);

		return dfd.promise;

		function resolve (val) {
			return dfd.resolve(val);
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
