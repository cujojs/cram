(function (define) {
define(function (require) {

	var has, concrete;

	has = require('cram/has');

	if (has('amd')) {
		concrete = require('./text/amd');
	}
	else if (has('fs')) {
		concrete = require('./text/fsModule');
	}
	else {
		concrete = failReader;
	}

	return concrete;

	function failReader (absIdOrUrl) {
		throw new Error('Cannot read text files with this javascript engine.');
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));