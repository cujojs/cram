(function (define, frakkedConstructor) { define(function (require) { "use strict";
	var removeCommentsRx, findFuncRx, fracPrefixSrc, fracSuffixSrc,
		undef;

	removeCommentsRx = /\/\*[\s\S]*?\*\/|(?:[^\\])\/\/.*?[\n\r]/g;
	findFuncRx = /(function\s+NAME\s*\([^\{]+\{)|(?:[^\\]?)(["'])|(\{)|(\})/g;

	// TODO: allow individual parameters to be modified
	// TODO: allow function return to be modified or passed to after()
	fracPrefixSrc = 'frak$backs.before.apply(this, arguments); try {';
	fracSuffixSrc = '} catch (ex) { frak$backs.afterThrowing(ex) || throw ex; } finally { frak$backs.after(); }';

	/**
	 * Injects callbacks into a function to gain access to privately-scoped
	 * functions.  Good for unit testing private functions or adding
	 * debug logging.
	 * @param func {Function} function to frak
	 * @param name {String} name of function to decorate with frakbacks
	 * @param frakbacks {Object} callbacks before, after, afterThrowing, etc.
	 * @returns {Function} frakked function to replace original
	 */
	return function frak (func, name, frakbacks) {
		var source;

		// TODO: preserve comments to preserve line numbers while debugging?
		source = func.toString();

		// remove comments (also doing this for Mozilla just in case)
		source = removeComments(source);

		source = frakSourceCode(source, name, fracPrefixSrc, fracSuffixSrc);

		return frakkedConstructor(frakbacks, source);

	};

	function removeComments (source) {
		return source.replace(removeCommentsRx, '');
	}

	function frakSourceCode (source, name, prefix, suffix) {
		var finder, newSource,
			currQuote, braceCount, found;

		finder = new RegExp(findFuncRx.toString().replace(/NAME/, name), 'g');

		newSource = source.replace(finder, function (m, header, qq, sb, eb) {

			// find and skip quotes
			if (qq) {
				currQuote = currQuote == qq ? undef : currQuote;
			}
			else if (!currQuote) {

				// find frakked function start
				if (braceCount == 0 && header) {
					if (found) {
						throw new Error('frak: function ' + name + ' found twice.');
					}
					found = true;
					// inject header and start counting braces
					m += prefix;
					braceCount = 1;
				}

				// count braces
				if (sb) braceCount++;
				if (eb) braceCount--;
				if (braceCount < 0) {
					throw new Error('frak: parsing error. too many closing braces encountered.');
				}

				// detect end of frakked function
				if (braceCount == 0) {
					m = suffix + m;
				}

			}

			return m;
		});

		if (braceCount > 0) {
			throw new Error('frak: parsing error. too few closing braces encountered.');
		}

		return newSource;
	}

});
}(
	typeof define == 'function' && define.amd ? define : function (f) { module.exports = f(require); },
	function (frak$backs) {
		return new Function (arguments[1]);
	}
));