(function (define) {
define(function (require) {

	var has, amdReader, requireReader, reader;

	has = require('cram/has');
	amdReader = require('./json/amdReader');
	requireReader = require('./json/requireReader');

	if (has('amd')) {
		reader = amdReader;
	}
	else if (has('require-json')) {
		reader = requireReader;
	}
	else {
		reader = moduleOnlyReader;
	}

	return {
		reader: reader
	};

	function moduleOnlyReader (absIdOrUrl) {
		if (isJsonFile(absIdOrUrl)) {
			throw new Error('Cannot read json files with this javascript engine. Use an AMD or CJS module instead.');
		}
		else {
			return requireReader;
		}
	}

	function isJsonFile (filename) {
		// parens to appease jshint
		return (/\.json$/).test(filename);
	}
});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));