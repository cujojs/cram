define(['when', 'cram/lib/ctx', 'cram/lib/transform/normalize'], function (when, getCtx, normalize) {

	function link (contexts, io, parentCtx) {

		// for each context, load its meta data and write its text

		return when.reduce(contexts, function (results, context) {
				var txt = normalize(context);
				return when(io.writeModule(context, txt), function () {
					results.push(context.id);
					return results;
				});
		}, []);

	}

	return link;

});
