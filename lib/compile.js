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
	 */
	function compile (absIds, io, collect, config) {

		return when.map(absIds, function (absId) {

			return when(getCtx(absId, config)).then(
				function (ctx) {
					// get the text of the module
					return when(toText(ctx, io.readModule))
						.then(function (text) {
							ctx.text = text;
							return ctx;
						});
				}
			).then(
				function (ctx) {
					var text, meta;
					// scan for AMD meta data
					text = ctx.text;
					ctx.meta = scan(text) || [];
					return ctx;
				}
			).then(
				function (ctx) {
					var descriptor;
					// write out module descriptor
					descriptor = {
						absId: ctx.absId,
						meta: ctx.meta,
						text: ctx.text
					};
					return when(io.writeModule(ctx, JSON.stringify(descriptor)))
						.then(function () { return ctx; });
				}
			).then(
				function (ctx) {
					// iterate through modules found in AMD meta data
					return when.map(ctx.meta, function (module) {
						var deps;

						// process each id in both depList and r-val requires
						deps = module.depList || [];
						deps = deps.concat(module.requires || []);
						if (deps && deps.length) {
							deps = deps.map(removeQuotes).map(ctx.toAbsId);
							return compile(deps, io, collect, ctx.config())
								.then(function () { collect(module.id || ctx.absId); });
						}
						else {
							return collect(module.id || ctx.absId);
						}
					});
				}
			);
		});

	}

	return compile;

	/**
	 * load text of resource/module
	 * @param ctx
	 * @param reader
	 * @return {*}
	 */
	function toText (ctx, reader) {
		var parts;

		parts = pluginParts(ctx.absId);

		if (!parts.pluginId) {
			// return text of AMD module
			return reader(ctx);
		}
		else {

			// TODO: check plugin to see if it has a run-time requirement in built files.
			// maybe the plugin's write should output this automatically somehow?

			// TODO: ACK! we should scan for deps first and the plugin can specify if it has a run-time module that needs to be included

return '';

			// also: have a config option for always including the plugin?
			// hmmm. or maybe have the dev just specify it explicitly as an "includes" option?

			return normalizeViaPlugin(ctx, parts.pluginId, parts.resourceId);
		}

	}

	function normalizeViaPlugin (ctx, pluginId, resourceId) {
		var dfd, ctx;

		dfd = when.defer();
		ctx = getCtx(pluginId);

		// get plugin
		ctx.require([pluginId],
			function (plugin) {

				if (plugin.pluginBuilder) {
					// go get build-time plugin module and try again
					when.chain(normalizeViaPlugin(ctx, plugin.pluginBuilder, resourceId), dfd);
				}
				else {
					// if there's no write(), then this is a runtime-only plugin
					// and there's no AMD module to write out
					if (!plugin.write) dfd.resolve('');

					// TODO: normalize resourceId first!? ******************

					plugin.write(pluginId, resourceId, dfd.resolve);
				}

			},
			dfd.reject
		);

		return dfd.promise;

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
