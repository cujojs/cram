(function (global, args) {
"use strict";

	var loader, Loader, has, writer, fetcher, Loader, Resolver, Analyzer,
		Builder, config, moduleIds;

	// parse the arguments sent to this file
	args = parseArgs(args);

	// first, pull in a module loader so we can load modules.
	// this file declares `define` and `Loader`
	load(joinPaths(args.cramFolder, 'SimpleAmdLoader.js'));
	Loader = global.Loader;
	loader = new Loader();
	// give it a stub resolver just to load modules in current folder
	loader.resolver = {
		toUrl: function (moduleId) { return joinPaths(args.cramFolder, moduleId + '.js'); }
	};
	
	// next, load (and run) feature tests
	has = loader.load('jsEngineCaps');

	// bail now if we can't load text files since we can't read a json config.
	// shell script should convert the config to a .js file / AMD module
	// and re-run this file
	if (!has('readFile') && isJsonFile(args.configFile)) {
		print('cram:wrap config in define');
		return;
	}

	// load configuration data
	config = loadConfig(args.configFile);
	config.baseUrl = joinPaths(args.baseUrl, config.baseUrl || '');
	config.rootModule = config.rootModule || args.rootModule;

	// load appropriate modules according to the environment
	if (!has('json')) {
		// json2.js is not a module. it's plain old js so don't use loader
		load(joinPaths(args.cramFolder, 'json2.js'));
	}
	Resolver = loader.load('Resolver');
	Analyzer = loader.load('Analyzer');
	Builder = loader.load('Builder');
	writer = loader.load(has('java') ? 'javaFileWriter' : 'writer');
	if (has('readFile')) {
		fetcher = loader.load('readFileFetcher');
	}
	else if (args.prefetchedFile) {
		fetcher = loader.load('prefetcher');
		fetcher.setCache(args.prefetchedFile);
	}
	else {
		// create a failFetcher! :)
		fetcher = {
			fetch: function () {
				throw new Error('cram: this javascript engine cannot analyze plugins!');
			}
		}
	}

	// if we have a prefetched file, we've already analyzed
	if (!args.prefetchedFile) {

		// analyze
		moduleIds = analyze(config.rootModule, '', config);

		// if we can't fetch our own files
		if (!has('readFile')) {
			// call back to the shell script to fetch files for us
			print('cram:prefetch modules');
			print(JSON.stringify(moduleIds));
			return;
		}
	}

	// build
	build(moduleIds, config);


	if (writer.getOutput) {
		//get output from writer(s) and print to caller
		print(writer.getOutput());
		// don't print?
	}
	else if (writer.closeAll) {
		// clean up
		writer.closeAll();
		print('cram:success');
	}

	return;

	function parseArgs (args) {
		// TODO: make this more robust
		var result;
		result = {
			configFile: args[0],
			rootModule: args[1],
			// base url to find modules
			baseUrl: args[2] || '',
			// cram's modules
			cramFolder: args[3] || '',
			// optional: only specified if shell prefetched files for us
			prefetchedFile: args[4]
		};
		return result;
	}

	function joinPaths (path1, path2) {
		if (path1 && !path1.substr(path1.length - 1) != '/') {
			path1 += '/';
		}
		return path1 + path2;
	}

	function isJsonFile (filename) {
		return /\.json$/.test(filename);
	}

	function loadConfig (filename) {
		var cfg;
		if (isJsonFile(filename)) {
			// eval should be more forgiving than JSON.parse
			cfg = eval('(' + readFile(filename) + ')');
		}
		else {
			cfg = loader.load(filename.replace(/.js$/, ''));
		}
		return cfg;
	}

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
		builder.writer = writer.getWriter(config.destFile);
		
		builder.build(moduleInfo, config);

	}

}(this, arguments));

// run from cram folder:
// java org.mozilla.javascript.tools.debugger.Main js/cram.js test/tinycfg.json test/tiny "" js

