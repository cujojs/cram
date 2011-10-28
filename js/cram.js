/*
	cram version 0.2.1dev
	(c) copyright 2011 unscriptable.com / John M. Hann

	Assumes the following are available in the environment:
	load: function (fileOrUrlString) { return undefined; }
	print: function (...) { return undefined; }
	quit: function () { return undefined; }
	arguments: array-like object containing CLI arguments
	
 */
var load, print, quit; // prevent syntax checker / linter from complaining
var define; // we will create a temporary define()
(function (globalDefine, args) {
"use strict";

	var loader, has, writer, fetcher, Loader, Resolver, Analyzer,
		Builder, config, moduleIds, cramFolder;

	try {

		// parse the arguments sent to this file
		args = parseArgs(args);

		// find cram folder (the folder with all of the javascript modules)
		cramFolder = args.cramFolder || cramDir();
		if (!cramFolder) {
			throw new Error('Cannot find cram source folder with this javascript engine. Use --src path_to_cram_js_folder.');
		}


		// load (and run) feature tests
		// this declares has function
		has = simpleRequire(joinPaths(cramFolder, 'jsEngineCaps'));

		// bail now if we can't load text files since we can't read a json config.
		// shell script should convert the config to a .js file / AMD module
		// and re-run this file
		if (!has('readFile') && isJsonFile(args.configFile)) {
			print('cram:wrap Configuration file must be wrapped in define with this javascript engine.');
			return;
		}

		// load configuration data
		config = loadConfig(args.configFile);
		config.baseUrl = joinPaths(args.baseUrl, config.baseUrl || '');
		config.destUrl = args.destUrl || config.destUrl || '';
		config.rootModule = args.rootModule || config.rootModule;

		// pull in a module loader so we can load modules.
		// this file declares `define` and `Loader`
		Loader = simpleRequire(joinPaths(cramFolder, 'SimpleAmdLoader'));
		loader = new Loader();
		// give it a stub resolver just to load modules in current folder
		loader.resolver = {
			toUrl: function (moduleId) { return joinPaths(cramFolder, moduleId + '.js'); }
		};

		// load appropriate modules according to the environment
		if (!has('json')) {
			// json2.js is not a module. it's plain old js so don't use loader
			load(joinPaths(cramFolder, 'json2.js'));
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
					throw new Error('This javascript engine cannot analyze plugins!');
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

	}
	catch (ex) {
		fail(ex);
	}

	return;

	function parseArgs (args) {
		var optionMap, arg, option, result;
		optionMap = {
			'-r': 'rootModule',
			'--root': 'rootModule',
			'-b': 'baseUrl',
			'--baseurl': 'baseUrl',
			'-c': 'configFile',
			'--config': 'configFile',
			'-o': 'destUrl',
			'--output': 'destUrl',
			'-s': 'cramFolder',
			'--src': 'cramFolder',
			'--prefetched': 'prefetchedFile',
			'-h': 'help',
			'--help': 'help'
		};
		// defaults
		result = {
			baseUrl: '',
			destUrl: ''
		};
		// pop off an arg and compare it to list of known option names
		while ((arg = args.shift())) {
			option = optionMap[arg];
			if (option == 'help') {
				help();
			}
			else if (!option) {
				throw new Error('unknown option: ', arg);
			}
			result[option] = args.shift(); // grab next arg
		}
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
			// eval is more forgiving than JSON.parse
			cfg = eval('(' + readFile(filename) + ')');
		}
		else {
			// assume config is wrapped in an AMD `define()`
			cfg = loader.load(filename.replace(/.js$/, ''));
		}
		return cfg;
	}

	function cramDir () {
		var curdir, pos;
		// find the folder with al of the js modules in it!
		// we're sniffing for features here instead of in jsEngineCaps
		// since this needs to run first so we can find jsEngineCaps!
		// TODO: node.js and other environments
		if (typeof environment != 'undefined' &&
				typeof environment['user.dir'] != 'undefined') {
			curdir = environment['user.dir'];
			pos = curdir.indexOf('/cram');
			if (pos >= 0) {
				return curdir.substring(0, pos + 5) + '/js';
			}
		}
	}

	function simpleRequire (absId) {
		var module, simpleDefine;
		// create a temporary define function that's sufficient to load a
		// simplified AMD module. this define must run sync and can only
		// have a definition function, not a module id or dependencies.
		if (!globalDefine) {
			simpleDefine = define = function (definitionFunction) {
				module = definitionFunction();
			};
		}
		load(absId + '.js');
		if (simpleDefine == define) {
			define = undefined;
		}
		return module;
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
		builder.writer = writer.getWriter(config.destUrl);
		
		builder.build(moduleInfo, config);

	}

	function fail (ex) {
		print('cram:fail', ex.message);
		quit();
	}

	function help () {
		var msg;
		msg = "-c|--config config_file -r|--root root_module_id -b|--baseurl base_folder -s|--src path_to_cram_src_folder -o|--output build_output_file";
		print(msg);
		quit();
	}

}(define, arguments));

// run from cram folder:
// rhino -O -1 bin/../js/cram.js -c test/tinycfg.json -r js/tiny -b . -o test/output/built.js
// java org.mozilla.javascript.tools.debugger.Main bin/../js/cram.js -c test/tinycfg.json -r js/tiny -b . -o test/output/built.js

