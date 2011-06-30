(function (global) {

	var hasReadFile, hasJson;
	hasReadFile = typeof global.readFile == 'function';
	hasJson = typeof global.JSON != 'undefined';

	print('hasReadFile=' + hasReadFile, 'hasJson=' + hasJson);

}(this));
