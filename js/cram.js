(function () {
"use strict";

	var loader, Loader, has, writer, fetcher, Resolver, Analyzer, Builder,
		config, rootModule, moduleIds;

	// first, load a module loader so we can load modules from here
	// this file defines `define` and `Loader`
	load('SimpleAmdLoader.js');
	loader = new Loader();
	// give it a stub resolver just to load modules in same folder
	loader.resolver = {
		toUrl: function (moduleId) { return moduleId; }
	};
	
	// next, load (and run) feature tests
	has = loader.load('jsEngineCaps');

	// load appropriate modules according to the environment
	if (!has('json')) {
		// json2.js is not a module
		load('json2.js');
	}
	writer = loader.load(has('java') ? 'javaFileWriter' : 'writer');
	fetcher = loader.load(has('readFile') ? 'readFileFetcher' : 'prefetcher');
	Resolver = loader.load('Resolver');
	Analyzer = loader.load('Analyzer');
	Builder = loader.load('Builder');

	// load configuration data
	// TODO

	// build!
	moduleIds = analyze(rootModule, '', config);
	// TODO: if (!has('readFile')) prefetch files here
	build(moduleIds, config);

	// clean up
	// TODO:
	// if (has('java')) flush writers
	// if (!has('java')) get output from writers and print to caller

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

		moduleIds = analyzer.analyze(moduleId, parentId, config);

		return moduleIds;

	}

	function build (moduleInfo, config) {
		var builder;

		builder = new Builder();
		builder.Resolver = Resolver;
		builder.loader = new Loader();
		builder.fetcher = fetcher.fetch;
		builder.writer = writer.getWriter();
		builder.build(moduleInfo, config);

	}

}());
