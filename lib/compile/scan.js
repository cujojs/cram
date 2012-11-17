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
		// find "require('id')"
		'require\\s*\\(\\s*["\']([^"\']+)["\']\\s*\\)'
		// find "define('id'?,[deps]?," capturing id and deps and factory args
		+ '|define\\s*\\(\\s*(?:(?:\\s*["\']([^"\']*)["\']\\s*,)?\\s*\\[([^\\]]+)\\]\\s*,)?(?:\\s*function\\s*\\(([^)]*)\\))?'
		// block comments
		+ '|(\\/\\*)|(\\*\\/)'
		// line comments
		+ '|((?:[^\\\\])\\/\\/)|(\\n|\\r|$)'
		// quotes and double-quotes
		+ '|((?:[^\\\\\']\'[^\'])|(?:[^\\\\"]"[^"]))',
		'g'
	);
	removeCommentsRx = /\/\*[\s\S]*?\*\/|(?:[^\\])\/\/.*?[\n\r]/g;
	cleanDepsRx = /["']\s*([^"']+)["']/g;
	splitArgsRx = /\s*,\s*/;

	function scan (source) {
		var modules,
			inComment, inString;

		modules = [];

		source.replace(findDefinesRx, function (m, rval, id, deps, args, bcStart, bcEnd, lcStart, lcEnd, q, matchPos) {
			var module;

			// process comments first
			if (inComment) {
				// check if we're leaving a comment
				if ((inComment == '/*' && bcEnd) || (inComment == '//' && lcEnd)) inComment = '';
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
			else if (id || deps) {

				if (deps) {
					deps = deps.replace(removeCommentsRx, '').match(cleanDepsRx);
				}

				if (args) {
					args = args.replace(removeCommentsRx, '').split(splitArgsRx);
				}

				// create a new module if current was created from a define(),
				// rather than a require().
				if (!module || 'id' in module) {
					modules.push((module = {}));
				}

				module.id = id; // probably blank (anonymous)
				module.pos = matchPos;
				module.count = m.length;
				module.depList = deps;
				module.argList = args;

			}

			// process r-value requires
			else if (rval) {

				if (!module) module = {};
				if (!module.requires) module.requires = [];

				module.requires.push({
					id: rval,
					pos: matchPos,
					count: m.length // TODO: do we need this?
				});

			}

			return '';
		});

		return modules;

	}

	return scan;

});
