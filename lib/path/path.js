(function(define, freeRequire) {
define(function() {

	var path = freeRequire('path');

	return {
		join: path.join,
		dirname: path.dirname
	};

});
}(
	typeof define === 'function' ? define : function(factory) { module.exports = factory(); },
	typeof require === 'function' && require
));
