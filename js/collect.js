// this is the collector used by js engines that have readFile() or another
// method to load non-js files. the fetcher global must be an instance of
// readFileFetcher (or another fetcher that can load non-js files).
function collect (moduleId, parentId, config) {
	var resolver, moduleSource, depIds, moduleIds;

	moduleIds = [];

	resolver = new Resolver(moduleId, config);
	moduleSource = fetcher.fetch(resolver.toUrl(moduleId));

	depIds = analyze(moduleSource, parentId, config);

	depIds.forEach(function (depId) {
		var url;
		url = resolver.toUrl(depId);
		moduleIds = moduleIds.concat(collect(depId, moduleId, config));
	});

	moduleIds = moduleIds.concat(depIds);

	return moduleIds;

}
