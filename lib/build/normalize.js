define(['when'], function (when) {

	// normalize:
	// load text of resource/module
	// transform it to AMD, if necessary

	function normalize (id, require, config) {
		var parts, dfd;

		parts = pluginParts(id);

		dfd = when.defer();

		if (!parts.pluginId) {
			// return text of AMD module
			require.fetch(require.toAbsId(id), dfd.resolve, dfd.reject);
		}
		else {
			// load plugin and use that to create an AMD module
			require([require.toAbsId(parts.pluginId)], normalizeViaPlugin, dfd.reject);
		}

		return dfd;

		function normalizeViaPlugin (plugin) {
			var write;

			if (plugin.pluginBuilder) {
				// go get build-time plugin module and try again
				return require([plugin.pluginBuilder], normalizeViaPlugin, dfd.reject);
			}

			// if there's no write(), then this is a runtime-only plugin
			// and there's no AMD module to write out
			if (!plugin.write) dfd.resolve('');

			write = plugin.write.bind(plugin, parts.pluginId, parts.resourceId, dfd.resolve);

			// requirejs plugins must have their load() method called before
			// calling write() so they can cache the resource. curl's
			// plugins just need write() to be called
			if (plugin.load) {
				plugin.load(resourceId, require, write, config);
			}
			else {
				write();
			}
		}

	}

	return normalize;

	function pluginParts (id) {
		var delPos = id.indexOf('!');
		return {
			resourceId: id.substr(delPos + 1),
			// resourceId can be zero length
			pluginId: delPos >= 0 && id.substr(0, delPos)
		};
	}

});
