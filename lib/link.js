define(['when', 'cram/lib/ctx', 'cram/lib/transform/normalize'], function (when, getCtx, normalize) {

	function link (filesData, io, parentCtx) {

		// for each file, load its meta data and write its text

		return when.reduce(filesData, function (results, fileCtx) {
				var txt = normalize(fileCtx);
				return when(io.writeModule(fileCtx, txt), function () {
					results.push(fileCtx.id);
					return results;
				});
		}, []);

	}

	return link;

});
