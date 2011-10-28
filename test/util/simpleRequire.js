function simpleRequire (absId) {
	var module, simpleDefine;
	// create a temporary define function that's sufficient to load a
	// simplified AMD module. this define must run sync and can only
	// have a definition function, not a module id or dependencies.
	if (!globalDefine) {
		simpleDefine = define = function (definitionFunction) {
			module = definitionFunction();
		};
	}
	load(absId + '.js');
	if (simpleDefine == define) {
		define = undefined;
	}
	return module;
}
