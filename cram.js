/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * cram (cujo resource assembler)
 * An AMD-compliant javascript module optimizer.
 *
 * Licensed under the MIT License at:
 * 		http://www.opensource.org/licenses/mit-license.php
 *
 * @version 0.6
 */

/*

	Assumes the following are available in the environment:
	load: function (fileOrUrlString) { return undefined; }
	print: function (...) { return undefined; }
	quit: function () { return undefined; }
	arguments: array-like object containing CLI arguments

 */
var load, print, quit; // prevent syntax checker / linter from complaining
var define, require, curl; // we will create a temporary define()
(function (globalDefine, args) {
"use strict";

	var loader, has, writer, fetcher, Loader, Resolver, Analyzer,
		Builder, config, moduleIds, cramFolder;

	try {

		// ensure we have a load method
		if (!load) load = require; // require works well enough
		if (!load) {
			throw new Error('no load() or require() found in environment.');
		}

		if (!print) print = console && console.log.bind(console);
		if (!print) {
			throw new Error('no print() or console.log() found in environment.');
		}

		if (!quit) quit = process && process.exit.bind(process);
		if (!quit) {
			throw new Error('no quit() or process.exit() found in environment.');
		}

		// parse the arguments sent to this file
		args = parseArgs(args);

		// find cram folder (the folder with all of the javascript modules)
		cramFolder = args.cramFolder || cramDir();
		if (!cramFolder) {
			throw new Error('Cannot find cram source folder with this javascript engine. Use --src path_to_cram_js_folder.');
		}

		// load (and run) feature tests
		// this declares has() function
		has = simpleRequire(joinPaths(cramFolder, './lib/jsEngineCaps'));

		// bail now if we can't load text files since we can't read a json config.
		// shell script should convert the config to a .js file / AMD module
		// and re-run this file
		if (!has('readFile') && isJsonFile(args.configFile)) {
			print('cram:wrap Configuration file must be wrapped in define with this javascript engine.');
			return;
		}

		// load appropriate modules according to the environment
		if (!has('json')) {
			// json2.js is not a module. it's plain old js so don't use loader
			load(joinPaths(cramFolder, './lib/json2.js'));
		}

		// load configuration data
		config = loadConfig(args.configFile);
		config.baseUrl = joinPaths(args.baseUrl, config.baseUrl || '');
		config.destUrl = args.destUrl || config.destUrl || '';
		config.rootModule = args.rootModule || config.rootModule;

		// create path to curl if it wasn't provided
		// TODO: use packages here instead of paths
		if (!config.paths) {
			config.paths = {};
		}
		if (!config.paths.curl) {
			config.paths.curl = joinPaths(cramFolder, './support/curl');
		}
		if (!config.paths.cram) {
			config.paths.cram = cramFolder;
		}

		// get cram modules
		// TODO: we're assuming sync operation here. implement when() so
		// we can operate in async environs such as browsers
		simpleRequire(joinPaths(cramFolder, './lib/curlLoader'));

		// curl global should be available now
		if (!curl) {
			throw new Error('curl loader was not loaded.');
		}

		// configure curl
		curl(config);

		curl(
			[
				has('java') ? 'cram/lib/javaFileWriter' : 'cram/lib/writer',
				has('readFile') ? 'cram/lib/readFileFetcher' : 'cram/lib/prefetcher'
			],
			start,
			fail
		);

	}
	catch (ex) {
		fail(ex);
	}

	return;

	function start (writer, fetcher) {

		try {
		if (!has('readFile') && args.prefetchedFile) {
			fetcher.setCache(args.prefetchedFile);
		}
		else {
			// create a failFetcher! :)
			fetcher = {
				fetch: function () {
					throw new Error('This javascript engine does not support plugins.');
				}
			}
		}

		// if we have a prefetched file, we've already analyzed
		if (!args.prefetchedFile) {

			// analyze
			// moduleIds = analyze(config);

			// if we can't fetch our own files
			if (!has('readFile')) {
				// call back to the shell script to fetch files for us
				print('cram:prefetch modules');
				print(JSON.stringify(moduleIds));
				return;
			}
		}

		// TODO: continue build process here
		// build(...);


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

	}

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
		args = Array.prototype.slice.apply(args);
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
		if (path2.substr(0, 2) == './') path2 = path2.substr(2);
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
			// TODO: extract config from a text file using a regexp...
			throw new Error('can\'t read config from a non-json file:' + filename);
		}
		return cfg;
	}

	function cramDir () {
		var curdir, pos;
		// find the folder with all of the js modules in it!
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

	function simpleRequire (url) {
		var module, simpleDefine;
		// create a temporary define function that's sufficient to load a
		// simplified AMD module. this define must run sync and can only
		// have a definition function, not a module id or dependencies.
		if (!globalDefine) {
			simpleDefine = define = function (id, definitionFunction) {
				// allow for named modules, but not ones with deps
				if (typeof id == 'function') definitionFunction = id;
				// get first module declared (TODO: fix hackishness?)
				if (!module) module = definitionFunction();
			};
		}
		load(url + '.js');
		if (simpleDefine == define) {
			define = undefined;
		}
		return module;
	}

//	function analyze (config) {
//		var i, len, rootId, includes, excludes, resolver, analyzer,
//			loader, moduleIds;
//
//		rootId = config.rootModule;
//		moduleIds = [];
//		includes = config.preloads;
//		excludes = [];
//
//		resolver = new Resolver('', config);
//		analyzer = new Analyzer();
//		loader = new Loader();
//		analyzer.loader = loader;
//		analyzer.fetcher = fetcher;
//		analyzer.Resolver = Resolver;
//		analyzer.resolver = analyzer.loader.resolver = resolver;
//
//		if (includes) {
//			for (i = 0, len = includes.length; i < len; i++) {
//				analyzer.scanForIds = false;
//				moduleIds = moduleIds.concat(analyzer.analyze(includes[i], '', config));
//				analyzer.scanForIds = true;
//				excludes = excludes.concat(analyzer.analyze(includes[i], '', config));
//			}
//		}
////print('excludes:', excludes.map(function (item) { return item.absId; }));
//		config._foundModules = excludes.map(function (info) { return info.absId; });
//
//		analyzer.scanForIds = false;
//		moduleIds = moduleIds.concat(analyzer.analyze(rootId, '', config));
//
//		return moduleIds;
//
//	}
//
//	function build (moduleInfo, config) {
//		var builder, excludes;
//
//		builder = new Builder();
//		builder.Resolver = Resolver;
//		builder.loader = new Loader();
//		builder.fetcher = fetcher.fetch;
//		builder.writer = writer.getWriter(config.destUrl);
//
//		excludes = config.excludeModules || [];
//		if (config._foundModules) {
//			excludes = excludes.concat(config._foundModules);
//		}
//		builder.excludes = excludes;
//
//		builder.build(moduleInfo, config);
//
//	}

	function fail (ex) {
		print('cram:fail', ex.message);
		if (ex.stack) print(ex.stack);
		quit();
	}

	function help () {
		var msg;
		msg = "-c|--config config_file -r|--root root_module_id -b|--baseurl base_folder -s|--src path_to_cram_src_folder -o|--output build_output_file";
		print(msg);
		quit();
	}

}(define, process && process.argv ? process.argv.slice(2) : arguments));

// run from cram folder:
// rhino -O -1 bin/../js/cram.js -c test/tinycfg.json -r js/tiny -b . -o test/output/built.js
// java org.mozilla.javascript.tools.debugger.Main bin/../js/cram.js -c test/tinycfg.json -r js/tiny -b . -o test/output/built.js
