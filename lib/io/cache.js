(function (define) {
define(function (require) {

	var io = require('./base');
	var path = require('./path');

	function ioCache (cacheFolder) {
		var base = io();

		return {
			read: function (ctx) {
				return base.read(cachePath(ctx)).then(fromString);
			},
			write: function (ctx) {
				return base.write(cachePath(ctx), toString(ctx));
			}
		};

		function cachePath (ctx) {
			path.join(cacheFolder, ctx.absId + '.json')
		}

	}

	return ioCache;

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

	function fromString (string) {
		return JSON.parse(string);
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));
