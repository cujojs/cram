(function (define) {
define(function (require) {

	var when, grokJsConfig, hasJsExtRx;

	when = require('when');
	grokJsConfig = require('./jsConfig');

	hasJsExtRx = /\.js$/;

	return function (io, filename) {
		var fullname = ensureJsExt(filename);
		return io.readFile(fullname).then(function(contents) {
			return when(grokJsConfig(contents), function(configs) {
				if(configs.length) {
					configs[0].prepend.push(contents);
				}

				return configs;
			});
		});
	};

	function ensureJsExt (filename) {
		return hasJsExtRx.test(filename) ? filename : filename + '.js';
	}


});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));
