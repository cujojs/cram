define(function (require) {

	var when = require('when');

	function grok (io, filename) {
		var dfd;

		dfd = when.defer();

		// TODO: sniff filename to determine which grokker to use (runjs, etc)

		require(['./grok/runjs'], function (grokker) {

			when(io.readFile(filename),
				function (source) {
					var results;

					results = grokker(source);

					if (results.warnings && results.warnings.length) {
						results.warnings.forEach(prefixFeedback(filename, io.warn));
					}
					if (results.error) {
						prefixFeedback(filename, io.error)(results.error);
					}

					return results;
				}
			).then(dfd.resolve, dfd.reject);

		}, dfd.reject);

		return dfd.promise;
	}

	return grok;

	function prefixFeedback (filename, callback) {
		return function (msg) {
			callback('grokking "' + filename + '": ' + msg);
		}
	}

});
