/** MIT License (c) copyright 2010-2013 B Cavalier & J Hann */

define(['when', 'cram/lib/transform/normalize'], function (when, normalize) {

	function link (filesData, io, parentCtx) {

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
