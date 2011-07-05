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

		var absId, pluginId;

		if (resolver.isPluginResource(dep)) {
			// push both the plugin id and the full resource id
			absId = resolver.toAbsPluginResourceId(dep);
			pluginId = resolver.parsePluginResourceId(absId).pluginId;
			moduleIds.push(pluginId);
			moduleIds.push(absId);
		}
		else {
			absId = resolver.toAbsMid(dep);
			moduleIds.push(absId);
		}

	});

	return moduleIds;

}

