var readFile;
define(function () {
"use strict";

	function fetch (resourceUrl) {
		return readFile(resourceUrl);
	}

	return {
		fetch: fetch,
		toString: function toString () {
			return '[object readFileFetcher]';
		}
	};

});
