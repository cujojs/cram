/** MIT License (c) copyright 2010-2013 B Cavalier & J Hann */
(function (define) {
define(function (require) {

	var path = require('../io/path');
	var ioText = require('../io/text');

	function fromCache (cacheFolder) {
		return function (ctx) {
			var sourceFile, cacheFile;

			// string == plugin urls, which aren't cached
			if (typeof ctx == 'string') return ioText.getReader(ctx)();

			sourceFile = ctx.url();
			cacheFile = path.join(cacheFolder, ctx.absId + '.json');

			return ioText.getReader(cacheFile)()
				.then(checkCached, getFromSource);

			function checkCached (cachedString) {
				var cachedCtx = fromString(cachedString);
				var compileTime = new Date(cachedCtx.compileTime);
				var sourceDate = path.lastModified(sourceFile);
				if (sourceDate <= compileTime) return getFromSource();
				return updateContext(cachedCtx);
			}

			function getFromSource () {
				return ioText.getReader(sourceFile)().then(
					function (source) {
						ctx.source = source;
						return ctx;
					}
				);
			}

			function updateContext (cachedCtx) {
				// copy properties from cachedCtx to ctx
				for (var p in cachedCtx) {
					if (!(p in ctx)) ctx[p] = cachedCtx[p];
				}
				return ctx;
			}
		};

	}

	return fromCache;

	function fromString (string) {
		return JSON.parse(string);
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));
