/** MIT License (c) copyright 2010-2013 B Cavalier & J Hann */

(function (define) {
define(function (require) {

	var when = require('when');
	var normalize = require('cram/lib/transform/normalize');

	function link (filesData, io) {
		// for each file, load its meta data and write its text
		return when.reduce(filesData, function (results, fileCtx) {
				var txt = normalize(fileCtx);
				return when(io.writeModule(fileCtx, txt), function () {
					results.push(fileCtx.absId);
					return results;
				});
		}, []);
	}

	return link;

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));
