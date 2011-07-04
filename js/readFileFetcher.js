(function (global) {

	function fetch (resourceUrl) {
		return global.readFile(resourceUrl);
	}

	global.fetcher = {
		fetch: fetch,
		toString: function toString () {
			return '[object readFileFetcher]';
		}
	};

}(this));
