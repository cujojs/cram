// parameters: moduleId, parentId, config
// Resolver, Loader, JSON are defined in the calling code
function analyze (moduleId, parentId, config) {
	var resolver, analyzer, loader, moduleIds;

	resolver = new Resolver(parentId, config);
	analyzer = new Analyzer();
	loader = new Loader();
	analyzer.loader = loader;
	analyzer.fetcher = fetcher;
	analyzer.Resolver = Resolver;
	analyzer.resolver = analyzer.loader.resolver = resolver;

	moduleIds = [];

	moduleIds = analyzer.analyze(moduleId, '', config);

	return moduleIds;

}

