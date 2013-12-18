(function (define) {
define(function (require) {

	var when = require('when');

	function configure (readFile, parentCtx) {
		return function toAmdText (fileCtx) {
			var plugin, dfd, resCfg, pio;

			plugin = fileCtx.plugin();
			dfd = when.defer();

			if (!plugin.compile) {
				// plugins with no compile are run-time plugins only
				dfd.resolve('');
			}
			else {
				// grab plugin-specific config, if specified
				if (fileCtx.pluginId && parentCtx.config.plugins[fileCtx.pluginId]) {
					resCfg = parentCtx.config.plugins[fileCtx.pluginId];
				}
				else {
					resCfg = fileCtx.config;
				}
				pio = {
					write: dfd.resolve,
					read: function (url, callback, errback) {
						when(readFile(url), callback, errback);
					},
					error: dfd.reject,
					warn: (console.warn ? console.warn : console.log).bind(console),
					info: console.log.bind(console)
				};
				plugin.compile(
					fileCtx.pluginId,
					fileCtx.resourceId,
					parentCtx.require,
					pio,
					resCfg
				);
			}

			return dfd.promise;
		};
	}

	return configure;

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));
