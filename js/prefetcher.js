(function (global) {
"use strict";
	
	// singleton
	var fetcher;

	// cache of resources
	var cache = {};

	// fetches the text of a resource
	// actually, the text is prefetched and injected into this modules
	// since the build process is sync!
	function fetch (resourceUrl) {
		return cache[resourceUrl];
	}

	function store (resourceUrl, text) {
		cache[resourceUrl] = text;
	}

	// extracts all url info from a list of module info returned
	// by the Resolver
	function extractUrls (moduleInfo) {
		return moduleInfo.map(function (info) {
			return info.url;
		}).join(',');
	}

	global.fetcher = fetcher = {
		fetch: fetch,
		store: store,
		extractUrls: extractUrls,
		toString: function toString () {
			return '[object prefetcher]';
		}
	};

}(this));
