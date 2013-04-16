/** MIT License (c) copyright 2010-2013 B Cavalier & J Hann */

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
