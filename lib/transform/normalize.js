define(['cram/lib/ctx'], function (getCtx) {

	/**
	 * Normalizes an AMD module to "simplified AMD": the simplest AMD format
	 * for AMD loaders to grok.
	 * 1. Transforms a module by replacing its id with an absolute one, if the
	 * current one is relative or otherwise needs to be normalized/expanded.
	 * 2. Finds r-value require() calls and hoists them to the dependency list.
	 * 3. Ensures that a factory function exists. (TODO)
	 *
	 * TODO: preserve coding style: quotes, commas, spaces/tabs, etc.
	 * TODO: deplist and requires ids should be normalized before we get here???
	 *
	 * It might be interesting to try to remove "require" from the dependency
	 * list, but we'd have to ensure there are no async require() calls.  We
	 * can't remove "exports" in case the dev is using it to resolve circular
	 * dependencies.
	 *
	 * @param meta {Object} the meta-data for a file. contains the text of
	 *   the file plus one or more objects describing module meta-data...
	 * @return {String} the simplified version of the file.
	 */
	function normalize (meta) {
		var insertions, text, pos;

		// these are the insertion operations to perform on the text
		insertions = [];
		text = meta.text;

		meta.modules.forEach(function (module) {

			// create insertion operation for define
			insertions.push({
				pos: module.pos,
				count: module.count,
				insert: function () {
					return writeDefine(module);
				}
			});

			module.requires && module.requires.forEach(function (req, i) {
				req.varName = idToVar(req.id, i);
				insertions.push({
					pos: req.pos,
					count: req.count,
					insert: function () {
						return writeRequire(req);
					}
				});
			});

		});

		pos = 0;

		return insertions
			.sort(sortByPos)
			.reduce(function (snippets, insert) {
				// push leading part of string
				snippets.push(text.substr(0, pos));
				// and insertion string
				snippets.push(insert.insert());
				pos += insert.count;
				return snippets;
			}, [])
			.concat(text.substr(pos))
			.join('');
	}

	return normalize;

	function idToVar (id, i) {
		return '$cram_' + i;
	}

	function writeDefine (module) {
		var depList, argList, requires, reqIds, reqVars;

		depList = module.depList || [];
		argList = module.argList || [];
		requires = module.requires || [];

		if (argList.length > 0 && depList.length == 0) {
			// AMD-wrapped CommonJS
			depList = ['require', 'exports', 'module'].slice(0, argList.length);
		}
		else if (argList.length < depList.length) {
			// create placeholders at end
			argList = depList.map(function (dep, i) {
				return i in argList ? argList[i] : idToVar('', i + requires.length);
			});
		}

		if (requires.length > 0) {
			reqIds = requires.map(function (req) { return req.id; });
			reqVars = reqIds.map(function (req) { return req.varName; });
			depList = depList.concat(reqIds);
			argList = argList.concat(reqVars);
		}

		// TODO: handle non-factory modules: define({}), etc.;
		return 'define(\''
			+ module.id
			+ '\', ['
			+ quoteList(depList)
			+ '], function ('
			+ argList.join(', ')
			+ ')';
	}

	function writeRequire (req) {
		return req.varName;
	}

	function sortByPos (a, b) { return a.pos < b.pos ? a : b; }

//	function joinLists (one, two) {
//		return one && two ? (one + ', ' + two) : one ? one : two || '';
//	}

	function quoteList (list) {
		return '\'' + list.join('\', \'') + '\'';
	}

});
