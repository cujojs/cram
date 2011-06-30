(function (global) {

	function fetch (resourceUrl) {
		return global.readFile(resourceUrl);
	}

	global.fetcher = fetcher = {
		fetch: fetch
	};

}(this));
