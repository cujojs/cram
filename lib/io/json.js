(function (define) {
define(function (require) {

	var has, requireReader, concrete;

	has = require('cram/has');
	requireReader = require('./json/require');

	if (has('amd')) {
		concrete = require('./json/amd');
	}
	else if (has('require-json')) {
		concrete = requireReader;
	}
	else {
		concrete = moduleOnlyReader;
	}

	return concrete;

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