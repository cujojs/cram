(function (define) {
define(function () {

	var info = console.log.bind(console);

	return {
		info: info,
		warn: info.bind(null, 'warning:')
	};

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));