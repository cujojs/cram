(function (define) {
define(function (require) {

	var grokJsConfig = require('./jsConfig');

	return function (io, filename) {
		return io.readFile(filename).then(grokJsConfig);
	};

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));
