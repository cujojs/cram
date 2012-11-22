/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * cram (cujo resource assembler)
 * An AMD-compliant javascript module optimizer.
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @version 0.6
 */

(function (global, globalDefine, args) {
/*global environment:true*/
'use strict';

	var loader, logger, quitter, has, config, cramFolder, curl,
		toString, undef;

	toString = Object.prototype.toString;

	try {

		// TODO: ensure all load/require operations can be async

		// ensure we have a loader method
		loader = typeof require == 'function'
			? function (id) {
				if (!/^[.\/]/.test(id)) id = './' + id;
				return require(id);
			}
			: load;
		if (!loader) {
			throw new Error('could not create loader()');
		}

		logger = typeof console != 'undefined' ? console.log.bind(console) : print;
		if (!logger) {
			throw new Error('could not create logger()');
		}

		quitter = typeof process !== 'undefined' && process.exit ? process.exit.bind(process) : quit;
		if (!quitter) {
			throw new Error('could not create quitter()');
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
		has = simpleRequire(joinPaths(cramFolder, './lib/has'));

		// bail now if we can't load text files since we can't read a json config.
		// shell script should convert the config to a .js file / AMD module
		// and re-run this file
		if (!has('readFile') && !has('loadJson') && args.configFiles.some(isJsonFile)) {
			logger('Configuration file must be wrapped in define with this javascript engine.');
			return;
		}

		// load appropriate modules according to the environment
		if (!has('json')) {
			// json2.js is not a module. it's plain old js
			loader(joinPaths(cramFolder, './lib/json2.js'));
		}

		// grok run.js file, if specified.
		// we're doing this before curl is loaded since it probably tells
		// us where the desired curl.js is located.  If this becomes
		// problematic, we could probably switch curl versions afterwards?
		if (args.grok) {
			config = grokRunjs(joinPaths(cramFolder, args.grok));
		}

		// merge and load all configuration data
		args.configFiles = args.configFiles.map(function (filename) {
			return joinPaths(cramFolder, filename);
		});
		config = mergeConfigs(config, args.configFiles);

		// fill-in missing config data or override with command-line args
		// TODO: make this more robust
		if (args.baseUrl == '.') args.baseUrl = '';
		config.baseUrl = joinPaths(args.baseUrl, config.baseUrl || '');
		config.destUrl = args.destUrl || config.destUrl || '';
		config.modules = args.modules || [config.main];

		// create path to curl if it wasn't provided
		// TODO: use packages here instead of paths (to set an example?)
		if (!config.paths) {
			config.paths = {};
		}
		if (!config.packages) {
			config.packages = {};
		}
		if (!config.paths.curl && !config.packages.curl) {
			config.paths.curl = joinPaths(cramFolder, 'support/curl/src/curl');
		}
		if (!config.paths.when && !config.packages.when) {
			config.packages.when = {
				location: joinPaths(cramFolder, 'support/when'),
				main: 'when'
			};
		}
		if (!config.paths.cram && !config.packages.cram) {
			config.paths.cram = cramFolder;
		}

		loader(joinPaths(config.paths.curl, '../../dist/curl-for-ssjs/curl.js'));
		// TODO: we're assuming sync operation here. implement when() so
		// we can operate in async environs such as browsers.
		// curl global should be available now
		if (!global.curl) {
			throw new Error('curl() was not loaded.');
		}
		curl = global.curl;

		// configure curl
		curl(config);

		// run!
		curl(
			[
				'require',
				'when',
				'cram/lib/compile',
				'cram/lib/link',
				'cram/lib/ctx',
				has('java') ? 'cram/lib/io/javaFileWriter' : 'cram/lib/io/nodeFileWriter',
				has('readFile') ? 'cram/lib/io/readFileFileReader' : 'cram/lib/io/nodeFileReader'
			],
			start,
			fail
		);

	}
	catch (ex) {
		fail(ex);
	}

	function start (require, when, compile, link, getCtx, writer, reader) {
		var ids, discovered, io, ctx;

		try {

			ids = config.preloads || [];
			if (config.includes) ids = ids.concat(config.includes);
			ids = ids.concat(config.rootModule);

			// TODO: collect, but exclude "config.excludes" from output

			// collect modules encountered, in order
			// dual array/hashmap
			discovered = [];

			// compile phase:
			// transform it to AMD, if necessary
			// scan for dependencies, etc.
			// cache AST here
			io = {
				readModule: function (ctx) {
					var d, r;
					d = when.defer();
					r = reader.getReader(ctx.withExt(ctx.toUrl(ctx.absId)));
					r(d.resolve, d.reject);
					return d.promise;
				},
				writeModule: function (ctx, contents) {
					var d, w;
					d = when.defer();
					w = writer.getWriter('.cram/linked/main.js');
					w(contents, d.resolve, d.reject);
					return d.promise;
				},
				readMeta: function (ctx) {
					var d, r;
					d = when.defer();
					r = reader.getReader(joinPaths('.cram/meta', ctx.absId));
					r(d.resolve, d.reject);
					return d.promise;
				},
				writeMeta: function (ctx, contents) {
					var d, w;
					d = when.defer();
					w = writer.getWriter(joinPaths('.cram/meta', ctx.absId));
					w(contents, d.resolve, d.reject);
					return d.promise;
				},
				collect: collect
			};

			ctx = getCtx('', config);

			compile(ids, io, ctx).then(
				function () {
					return link(discovered, io, ctx);
				}
			).then(cleanup, fail);

		}
		catch (ex) {
			fail(ex);
		}

		function cleanup () {
			if (writer.closeAll) {
				// clean up
				writer.closeAll();
			}
		}

		/**
		 * Collect a bunch of things by id, but preserve their order.
		 * @param id {String}
		 * @param thing {*}
		 * @return {*} thing
		 */
		function collect (id, thing) {
			var top;
			if (id in discovered) return discovered[id];
			top = discovered.length;
			discovered[id] = top;
			discovered[top] = thing;
			return thing;
		}

	}

	/**
	 * Processes command-line arguments.
	 * @param args {Array}
	 * @return {Object}
	 */
	function parseArgs (args) {
		var optionMap, arg, option, result;
		optionMap = {
			'-m': 'modules',
			'--main': 'modules',
			'-b': 'baseUrl',
			'--baseurl': 'baseUrl',
			'--baseUrl': 'baseUrl',
			'-c': 'configFiles',
			'--config': 'configFiles',
			'-o': 'destUrl',
			'--output': 'destUrl',
			'-s': 'cramFolder',
			'--src': 'cramFolder',
			'-?': 'help',
			'-h': 'help',
			'--help': 'help'
		};
		// defaults
		result = {
			baseUrl: '',
			destUrl: '',
			configFiles: [],
			modules: []
		};
		if (!args.length) help();
		// pop off an arg and compare it to list of known option names
		while ((arg = args.shift())) {

			option = optionMap[arg];

			// check if the first arg is a run.js file to grok
			if (arg.charAt(0) != '-' && !('grok' in result)) {
				result.grok = arg;
			}
			else {
				result.grok = false;
				// check if arg is a config file or option
				if (arg.charAt(0) != '-') {
					// this must be a config file
					result.configFiles.push(arg);
				}
				else if (option == 'help') {
					help();
				}
				else if (!option) {
					throw new Error('unknown option: ' + arg);
				}
				else if (result[option].push) {
					// array. push next arg onto array
					result[option].push(args.shift());
				}
				else {
					// grab next arg as value of option
					result[option] = args.shift();
				}
			}

		}
		return result;
	}

	function joinPaths (path1, path2) {
		if (path2.substr(0, 2) == './') path2 = path2.substr(2);
		if (path1 && path1.substr(path1.length - 1) != '/') {
			path1 += '/';
		}
		return path1 + path2;
	}

	function isJsonFile (filename) {
		// parens to appease jshint
		return (/\.json$/).test(filename);
	}

	function grokRunjs (filename) {
		var src, grok, results, config;

		src = loader(filename);
		grok = simpleRequire(joinPaths(cramFolder, 'lib/grok/runjs'));

		results = grok(src);

		if (results.warnings && results.warnings.length) {
			results.warnings.forEach(logger);
		}
		if (results.error) fail(results.error);

		config = results.config;
		config.modules = results.includes;

		return config;
	}

	function mergeConfigs (baseCfg, configFiles) {
		var base, i, len, cfg, p;
		base = baseCfg || {};
		for (i = 0, len = configFiles.length; i < len; i++) {
			cfg = loadConfig(configFiles[i]);
			base = mergeObjects(base, cfg);
		}
		return base;
	}

	function mergeObjects (base, ext) {
		var p;
		for (p in ext) {
			if (isType(base[p], 'Object') || isType(base[p], 'Array')) {
				base[p] = mergeObjects(base[p], ext[p]);
			}
			else {
				base[p] = ext[p];
			}
		}
		return base;
	}

	function isType (obj, type) {
		return toString.call(obj).slice(8, -1) == type;
	}

	function loadConfig (filename) {
		/*jshint evil:true*/
		var cfg;
		if (isJsonFile(filename)) {
			if (has('readFile')) {
				// eval is more forgiving than JSON.parse
				cfg = eval('(' + readFile(filename) + ')');
			}
			else {
				cfg = loader(filename);
			}
		}
		else {
			// assume it's an AMD file with no deps
			cfg = simpleRequire(filename);
		}
		return cfg;
	}

	function cramDir () {
		var curdir, pos;
		// find the folder with all of the js modules in it!
		// we're sniffing for features here instead of in has.js
		// since this needs to run first so we can find has.js!
		curdir = typeof environment != 'undefined' && 'user.dir' in environment
			? environment['user.dir']
			: typeof process != 'undefined' && process.cwd && process.cwd();
		if (curdir == undef) {
			throw new Error('Could not determine current working directory.');
		}
		pos = curdir.indexOf('/cram');
		if (pos >= 0) {
			return curdir.substring(0, pos + 5);
		}
	}

	function simpleRequire (url) {
		var amdModule, cjsModule, simpleDefine;
		// TODO: implement sync XHR or refactor this file to be able to fetch async
		// Create a temporary define function that's sufficient to load a
		// simplified AMD or UMD module. This define must run sync and can only
		// have a definition function, not a module id or dependencies.
		if (!globalDefine) {
			simpleDefine = global.define = function (id, factory) {
				// only get first module declared in file
				if (!amdModule) {
					// grab last argument as factory or module
					factory = arguments[arguments.length - 1];
					amdModule = typeof factory == 'function'
						? factory()
						: factory;
				}
			};
			simpleDefine.amd = {};
		}
		try {
			cjsModule = loader(url + '.js');
		}
		finally {
			if (simpleDefine == global.define) {
				global.define = undef;
			}
		}
		return amdModule || cjsModule;
	}

	function fail (ex) {
		logger('cram failed: ', ex && ex.message || ex);
		if (ex && ex.stack) logger(ex.stack);
		quitter(1);
	}

	function help () {
		var options;
		// TODO: auto-generate help string from config options and meta data
		options = '\t-c, --config config_file\n\t-m, --module module_id\n\t-b, --baseurl base_folder\n\t-s, --src path_to_cram_src_folder\n\t-o, --output build_output_file';
		logger('cram, an AMD-compatible module concatenator. An element of cujo.js.');
		logger();
		logger('Usage:');
		logger('\t\tnode cram.js [options]');
		logger('\tor\tringo cram.js [options]');
		logger('\tor\trhino cram.js [options]');
		logger();
		logger('Options:');
		logger(options);
		logger();
		logger('Auto-grok run.js (app bootstrap) file:');
		logger('\t\tnode cram.js run.js build_override.json [options]');
		logger('\tor\tringo cram.js run.js build_override.json [options]');
		logger('\tor\trhino cram.js run.js build_override.json [options]');
		logger();
		logger('More help can be found at http://cujojs.com/');
		quitter();
	}

}(
	typeof global != 'undefined' ? global : this,
	typeof define == 'function' && define.amd && define,
	process && process.argv ? process.argv.slice(2) : Array.prototype.slice.apply(arguments)
));

// run from cram folder:
// rhino -O -1 bin/../cram.js -c test/tinycfg.json -m js/tiny -b . -o test/output/built.js
// java org.mozilla.javascript.tools.debugger.Main bin/../cram.js -c test/tinycfg.json -m js/tiny -b . -o test/output/built.js
