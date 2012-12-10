(function (define) {
define(function (require) {

	var has, reader;

	has = require('cram/has');

	if (has('amd')) {
		reader = require('./text/amdReader');
	}
	else if (has('fs')) {
		reader = require('./text/fsModuleReader');
	}
	else {
		reader = failReader;
	}

	return {
		reader: reader
	};

	function failReader (absIdOrUrl) {
		throw new Error('Cannot read text files with this javascript engine.');
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));