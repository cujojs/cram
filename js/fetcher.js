(function (global) {
"use strict";
	
	// singleton
	var fetcher;

	// cache of resources
	var cache = {};

	// fetches the text of a resource
	// actually, the text is prefetched and injected into this modules
	// since the build process is sync!
	function fetch (resourceId) {
		return cache[resourceId];
	}

	function store (resourceId, text) {
		cache[resourceId] = text;
	}

	global.fetcher = fetcher = {
		fetch: fetch,
		store: store
	};

}(this));
