(function (define, freeRequire) {
define(function (require) {

	var when = require('when');

	return {
		getReader: function (absIdOrUrl) {
			return function () {
				return loadModule(absIdOrUrl);
			};
		}
	};

	function loadModule (absIdOrUrl) {
		return when.resolve(freeRequire(absIdOrUrl));
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); },
	typeof require == 'function' && require
));