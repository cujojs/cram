(function (define) {
define(function (require) {

	var has, concrete;

	has = require('./has');

	if (has('path')) {
		concrete = require('./path/path');
	}
	else if (has('amd')) {
		concrete = require('./path/amd');
	}
	else {
		throw new Error('no path support');
	}

	return concrete;

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));