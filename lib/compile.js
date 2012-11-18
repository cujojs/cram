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
				.then(function (ctx) {
					// fill-in anonymous module id
					// TODO: where does this really go?
					if (ctx.modules && ctx.modules[0] && !ctx.modules[0].id) {
						ctx.modules[0].id = absId;
					}
					return ctx;
				})
				.then(deps)
				.then(write);
		});

		function curryChain (func) {
			return function (ctx) {
				return when(func(io, parentCtx, ctx), function () {
					return ctx;
				});
			}
		}

	}

	return compile;

	function toAmdText (io, parentCtx, ctx) {
		var parts, pluginCtx, promise;

		parts = pluginParts(ctx.absId);

		if (parts.pluginId) {
			// plugin-based resources get normalized via plugin
			ctx.pluginId = parts.pluginId;
			ctx.resourceId = parts.resourceId;
			pluginCtx = getCtx(parts.pluginId, parentCtx.config());
			promise = normalizeViaPlugin(pluginCtx, parentCtx, ctx).then(function (newCtx) {
				ctx.text = newCtx.text;
				ctx.absId = newCtx.absId;
			});
		}
		else {
			// get the text of the module
			promise = when(io.readModule(ctx)).then(function (text) {
				ctx.text = text;
			});
		}

		return promise;
	}

	function parseModules (io, parentCtx, ctx) {
		// scan for AMD meta data
		return when(scan(ctx.text), function (modules) {
			ctx.modules = modules || [];
		})
	}

	// TODO: does this really belong in here? i don't think so.
	function writeToCache (io, parentCtx, ctx) {
		var descriptor;
		// write out module descriptor
		descriptor = {
			absId: ctx.absId,
			modules: ctx.modules,
			text: ctx.text
		};
		return when(io.writeMeta(ctx, JSON.stringify(descriptor)));
	}

	function collectDeps (io, parentCtx, ctx) {
		// iterate through modules found in AMD meta data
		return when.map(ctx.modules, function (module) {
			var deps;

			deps = [];

			// convert ids to absolute
			if (module.depList) {
				deps = module.depList = module.depList.map(ctx.toAbsId).map(removeQuotes);
			}
			if (module.requires) {
				module.requires = module.requires.map(ctx.toAbsId).map(removeQuotes);
				deps = deps.concat(
					module.requires.map(function (req) { return req.id; })
				);
			}

			// process each id in both depList and r-val requires
			return deps && deps.length && compile(deps, io, ctx);
		})
		.then(function () {
				return io.collect(ctx.absId, ctx);
		});
	}

	function normalizeViaPlugin (pctx, parentCtx, ctx) {
		var dfd;

		dfd = when.defer();

		// get plugin
		ctx.require([pctx.absId],
			function (plugin) {
				var bid, bctx;

				if (plugin.normalize) {
					ctx.absId = ctx.pluginId + '!'
						+ plugin.normalize(ctx.resourceId, parentCtx.toAbsId, parentCtx.config());
				}

				if (plugin.pluginBuilder) {
					// go get build-time plugin module and try again
					bid = pctx.toAbsId(plugin.pluginBuilder);
					bctx = getCtx(bid, pctx.config());
					when.chain(normalizeViaPlugin(bctx, parentCtx, ctx), dfd);
				}
				else if (!plugin.write) {
					// if there's no write(), then this is a runtime-only plugin
					// and there's no AMD module to write out
					resolve('');
				}
				else {
					plugin.write(ctx.pluginId, ctx.resourceId, resolve);
				}

			},
			dfd.reject
		);

		return dfd.promise;

		function resolve (txt) {
			ctx.text = txt;
			return dfd.resolve(ctx);
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
