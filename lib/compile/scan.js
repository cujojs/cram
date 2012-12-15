define([], function () {

	/*
	 * This function should work for most AMD and UMD formats.
	 * things we need to know about the module:
	 *		- where to insert (or replace) module id
	 *		- what are the dependencies
	 *			- r-value requires should be moved to dep list and
	 *			  variable name assigned. then, substitute require('...') with variable
	 */

	var findDefinesRx, removeCommentsRx, cleanDepsRx, splitArgsRx;

	// findDefinesRx = /require\s*\(\s*["']([^"']+)["']\s*\)|define\s*\(\s*(?:(?:\s*["']([^"']*)["']\s*,)?\s*\[([^\]]+)\]\s*,)?|(\/\*)|(\*\/)|((?:[^\\])\/\/)|(\n|\r|$)|((?:[^\\']'[^'])|(?:[^\\"]"[^"]))/g;
	findDefinesRx = new RegExp(
		// find "require('id')" (r-val)
		'require\\s*\\(\\s*["\']([^"\']+)["\']\\s*\\)'
		// find "define('id'?,[deps]?," capturing id and deps and factory args
		+ '|(define)\\s*\\('
		+ '|(?:["\']([^"\']*)["\']\\s*,)'
		+ '|(?:\\[([^\\]]*?)\\]\\s*,)'
		+ '|(function)?\\s*(?:\\(([^)]*)\\))?\\s*({)'
		// block comments
		+ '|(\\/\\*)|(\\*\\/)'
		// line comments
		+ '|(\\/{2})|(\\n|\\r|$)'
		// quotes and double-quotes
		// hmmm... this gobbles up characters on either side of the quote.
		// seems problematic. is it?
		+ "|[^\\\\'](')(?!')" + '|[^\\\\"](")(?!")',
		'g'
	);
	removeCommentsRx = /\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g;
	cleanDepsRx = /["']/g;
	splitArgsRx = /\s*,\s*/;

	function scan (source) {
		var modules,
			module,
			inComment, inString, inDefine, inModule;

		modules = [];

		source.replace(findDefinesRx, function (m, rval, def, id, deps, factory, args, fStart, bcStart, bcEnd, lcStart, lcEnd, q, qq, matchPos) {

			// quotes can only be one or the other, so reuse variable
			q = q || qq;

			// process comments first
			if (inComment) {
				// check if we're leaving a comment
				if ((inComment == '/*' && bcEnd != null) || (inComment == '//' && lcEnd != null)) inComment = '';
			}
			else if (bcStart || lcStart) {
				inComment = bcStart || lcStart;
			}

			// process strings next
			else if (inString) {
				// check if we're leaving the string
				if (inString == q) inString = '';
			}
			else if (q) {
				inString = q;
			}

			// process defines
			else if (def) {
				if (inModule) {
					// is there anything to do to close-out previous module?
				}
				module = {};
				modules.push(module);
				module.pos = matchPos;
				inModule = false;
				inDefine = true;
			}
			else if (inDefine && !inModule) {

				if (id) {
					module.id = id;
				}

				else if (deps) {
					module.depList = deps.replace(removeCommentsRx, '')
						.replace(cleanDepsRx, '')
						.split(splitArgsRx);
				}

				else if (fStart) {
					if (factory) module.factory = !!factory;
					if (args) {
						module.argList = args.replace(removeCommentsRx, '')
							.split(splitArgsRx);
					}
					module.count = matchPos + m.length - module.pos;
					inModule = true;
					inDefine = false;
				}

			}

			// process r-value requires
			else if (rval) {

				if (!inModule) throw new Error('global sync require() encountered.');
				if (!module.requires) module.requires = [];

				module.requires.push({
					id: rval,
					pos: matchPos,
					count: m.length
				});

			}

			return '';
		});

		return modules;

	}

	return scan;

});
