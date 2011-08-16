define(function () {
"use strict";
	
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

	function setCache (newCache) {
		cache = newCache;
	}

	// extracts all url info from a list of module info returned
	// by the Resolver
	function extractUrls (moduleInfo, resolver) {
		return moduleInfo.map(function (id) {
			return resolver.toUrl(id);
		}).join(',');
	}

	return {
		fetch: fetch,
		store: store,
		setCache: setCache,
		extractUrls: extractUrls,
		toString: function toString () {
			return '[object prefetcher]';
		}
	};

});
