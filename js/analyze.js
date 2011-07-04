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

		var info = resolver.toModuleInfo(dep);
		if (info.pluginData) {
			moduleIds.push({
				id: pluginData.pluginId,
				url: pluginData.pluginUrl
			});
		}
		moduleIds.push({
			id: info.moduleId,
			url: info.moduleUrl
		});
	});

	return moduleIds;

}

