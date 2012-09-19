define(['require'], function (require) {

	//var findDefinesRx = /(define\s*\(\s*)([^"'\s)])|(\/\*)|(\*\/)|((?:[^\\])\/\/)|(\n|\r|$)|((?:[^\\'])'(?:[^']))|((?:[^\\"])"(?:[^"]))/g;
	var findRValueRequiresAndDefinesRx = /define\s*\((?:\s*[^,]*\s*,)?\s*\[([^\]]+)\]\s*,|require\s*\(\s*(["'][^"']+["'])\s*\)|(?:[^\\]?)(["'])/mg;
	var removeCommentsRx = /\/\*[\s\S]*?\*\/|(?:[^\\])\/\/.*?[\n\r]/g;
	var cleanDepsRx = /["']+\s*([^"']+)["']+/g;

	function Scanner () {

	}

	Scanner.prototype = {

		fetcher: null,

		scan: function () {

		}

	};

	return Scanner;

	function scanFileForIds (source) {
		var ids, inString;

		ids = [];
		inString = false;

		source.replace(removeCommentsRx, '').replace(findRValueRequiresAndDefinesRx, function (m, deps, dep, q) {
			if (q) {
				inString = !inString;
			}
			else if (!inString) {
				ids = ids.concat(deps ? deps.match(cleanDepsRx) : dep);
			}
			return '';
		});

		return ids;
	}

});
