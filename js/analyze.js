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
			// push the full resource id, not the plugin id due to potential
			// ambiguities with the pluginPath config param. users may try
			// to use a url path instead of an id path and that will not
			// resolve correctly in the analyze phase.
			// TODO: fix the config so this is clearer
			absId = resolver.toAbsPluginResourceId(dep);
//			pluginId = resolver.parsePluginResourceId(absId).pluginId;
//			moduleIds.push(pluginId);
			moduleIds.push(absId);
		}
		else {
			absId = resolver.toAbsMid(dep);
			moduleIds.push(absId);
		}

	});

	return moduleIds;

}

