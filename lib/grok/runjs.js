(function (define) {
define(function (require) {

	var when, grokJsConfig;

	when = require('when');
	grokJsConfig = require('./jsConfig');

	return function (io, filename) {
		return io.readFile(filename).then(function(contents) {
			return when(grokJsConfig(contents), function(configs) {
				if(configs.length) {
					configs[0].append.push(contents);
				}

				return configs;
			});
		});
	};

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));
