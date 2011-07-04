// parameters: moduleId, parentId, config
// Resolver, Loader, JSON are defined in the calling code
function analyze (moduleSource, parentId, config) {
	var resolver, analyzer, moduleIds;

	resolver = new Resolver(parentId, config);
	analyzer = new Analyzer();
	analyzer.loader = new Loader();
	analyzer.resolver = analyzer.loader.resolver = resolver;
	moduleIds = [];

	analyzer.parse(moduleSource).forEach(function (dep) {

		var absId;
		if (resolver.isPluginResource(dep)) {
			absId = resolver.toAbsPluginResourceId(dep);
		}
		else {
			absId = resolver.toAbsMid(dep);
		}
		moduleIds.push({
			id: absId,
			url: resolver.toUrlFromAbsMid(absId)
		});
	});

	return moduleIds;

}

