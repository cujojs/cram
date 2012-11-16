define(['cram/lib/ctx'], function (getCtx) {

	/**
	 * 1. Transforms a module by replacing its id with an absolute one, if the
	 * current one is relative or otherwise needs to be normalized/expanded.
	 * 2. Finds r-value require() calls and hoists them to the dependency list.
	 *
	 * TODO: preserve coding style: quotes, commas, spaces/tabs, etc.
	 * TODO: deplist and requires ids should be normalized before we get here?
	 */
	function normalize (meta) {
		var depList, argList, requires, reqIds, reqVars, defStr, out;

		depList = meta.depList || [];
		argList = meta.argList || [];
		requires = meta.meta.requires || [];

		if (argList.length > 0 && depList.length == 0) {
			depList = ['require', 'exports', 'module'].slice(0, argList.length);
		}

		if (requires.length > 0) {
			reqIds = requires.map(function (req) { return req.id; });
			reqVars = reqIds.map(idToVar);
			depList = depList.concat(reqIds);
			argList = argList.concat(reqVars);
		}

		// TODO: non-factory modules: define({});
		defStr = 'define('
			+ "'" + meta.absId + "'"
			+ ', '
			+ (depList.length ? "'" + depList.join("', '") + "'" : '')
			+ (argList.length ? 'function (' + argList.join(', ') + ')' : '');

		// TODO: this needs to be much more efficient
		out = meta.text.substring(0, meta.definePos - 1)
			+ defStr
			+ meta.text.substr(meta.definePos + meta.defineLength);

		for (var i = 0; i < requires.length; i++) {
			out = out.substring(0, requires.requirePos - 1)
				+ reqVars[i]
				+ out.substr(requires.requirePos + requires.requireLength);
		}

		return out;

	}

	return normalize;

	function idToVar (id, i) {
		return '$cram_' + i;
	}

});
