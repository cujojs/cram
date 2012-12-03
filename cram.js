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

		// ensure we have a loader method
		loader = typeof require == 'function'
			? function (path) {
				if (!/^[.\/]/.test(path)) path = './' + path;
				return require(path);
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
		cramFolder = args.cramFolder;
		if (cramFolder && /^\.\.\//.test(cramFolder)) {
			cramFolder = joinPaths(currDir(), cramFolder);
		}
		if (!cramFolder) cramFolder = cramDir();
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

		config = {
			paths: {},
			packages: {}
		};

		// create default mappings to curl, cram, etc.
		config.paths.curl = joinPaths(cramFolder, 'support/curl/src/curl');
		config.paths.cram = cramFolder;
		config.packages.when = {
			location: joinPaths(cramFolder, 'support/when'),
			main: 'when'
		};

		// fill-in missing config data or override with command-line args
		if (args.baseUrl == '.') args.baseUrl = '';
		config.baseUrl = joinPaths(args.baseUrl, config.baseUrl || '');
		config.destUrl = args.destUrl || config.destUrl || '';

		loader(joinPaths(config.paths.curl, '../../dist/curl-for-ssjs/curl.js'));
		// TODO: we're assuming sync operation here. implement when() so
		// we can operate in async environs such as browsers.
		// either that or assume browser has pre-loaded the necessary files.

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
				'cram/lib/grok',
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

	function start (require, when, compile, link, getCtx, grok, writer, reader) {
		var grokked, configs, ids, discovered, io;

		configs = [];

		if (args.grok) {
			grokked = grok(
				{
					readFile: function (filename) {
						var d, r;
						d = when.defer();
						r = reader.getReader(filename);
						r(d.resolve, d.reject);
						return d.promise;
					},
					warn: function (msg) { logger('warning: ' + msg); },
					error: fail
				},
				args.grok
			);
		}

		if (args.configFiles) {
			configs = args.configFiles.map(
				function (file) {
					if (isJsonFile(file)) file = 'json!' + file;
					return curl([file]);
				}
			);
		}

		when.reduce(
			configs,
			function (results, overrides) {
				// merge configs
				results.config = mergeConfigs(results.config, overrides);
				return results;
			},
			grokked
		).then(
			function (results) {
				var config;

				config = results.config;

				if (!results.includes) results.includes = [];

				if(!config.baseUrl) config.baseUrl = '';

				// remove things that curl will try to auto-load
				if (config.main) {
					results.includes = results.includes.concat(config.main);
					delete config.main;
				}
				if (config.preloads) {
					results.includes = config.preloads.concat(results.includes);
					delete config.preloads;
				}

				// fix baseUrl (node.js doesn't know how to find anything
				// that isn't in node_modules or is an absolute file
				// reference).
				// TODO: sniff the need for this hack, somehow
				config.baseUrl = joinPaths(cramFolder, args.baseUrl, config.baseUrl);

				// configure curl
				curl(config);
				return results;
			}
		).then(
			function (results) {
				ids = results.includes;

				// TODO: collect, but exclude "config.excludes" from output

				// collect modules encountered, in order
				// dual array/hashmap
				discovered = [];

				// compile phase:
				// transform it to AMD, if necessary
				// scan for dependencies, etc.
				// cache AST here
				io = {
					readFile: function (filename) {
						var d, r;
						d = when.defer();
						r = reader.getReader(filename);
						r(d.resolve, d.reject);
						return d.promise;
					},
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
						w = writer.getWriter(args.destUrl || '.cram/linked/main.js');
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
				return results.config;
			}
		).then(
			function (config) {
				return getCtx('', config);
			}
		).then(
			function (ctx) {
				return when(compile(ids, io, ctx), function () {
					return ctx;
				});
			}
		).then(
			function (ctx) {
				return link(discovered, io, ctx);
			}
		).then(cleanup, fail);

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
			'-m': 'includes',
			'--main': 'includes',
			'--include': 'includes',
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
			includes: []
		};
		if (!args.length) {
			help(logger, optionMap); quitter();
		}
		// pop off an arg and compare it to list of known option names
		while ((arg = args.shift())) {

			option = optionMap[arg];

			// check if the first arg is a run.js file to grok
			if (arg.charAt(0) != '-' && !('grok' in result)) {
				result.grok = arg;
			}
			else {
				if (!('grok' in result)) result.grok = false;
				// check if arg is a config file or option
				if (arg.charAt(0) != '-') {
					// this must be a config file
					result.configFiles.push(arg);
				}
				else if (option == 'help') {
					help(logger, optionMap); quitter();
				}
				else if (!option) {
					throw new Error('unknown option: ' + arg);
				}
				else if (result[option] && result[option].push) {
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
		var args;

		args = Array.prototype.slice.apply(arguments);

		return args.reduce(joinTwo, '');

		function joinTwo (path1, path2) {
			if (path2.substr(0, 2) == './') path2 = path2.substr(2);
			if (path1 && path1.substr(path1.length - 1) != '/') {
				path1 += '/';
			}
			return path1 + path2;
		}
	}

	function isJsonFile (filename) {
		// parens to appease jshint
		return (/\.json$/).test(filename);
	}

	function mergeConfigs (baseCfg, configFiles) {
		var base, i, len, cfg;
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
			if (isType(base[p], 'Array')) {
				base[p] = mergeArrays(base[p], ext[p]);
			}
			if (isType(base[p], 'Object')) {
				base[p] = mergeObjects(base[p], ext[p]);
			}
			else {
				base[p] = ext[p];
			}
		}
		return base;
	}

	function mergeArrays (base, ext, identity) {
		var merged, prev;

		if (!identity) identity = defaultIdentity;
		merged = (base || []).concat(ext || []).sort(sort);

		return merged.reduce(function (result, item) {
			if (identity(item) != identity(prev)) result.push(item);
			prev = item;
			return result;
		}, []);

		function defaultIdentity (it) {
			if (isType(a, 'Object')) {
				return it.id || it.name;
			}
			else {
				return it;
			}
		}

		function sort (a, b) {
			var ida, idb;
			ida = identity(a);
			idb = identity(b);
			return ida == idb ? 0 ? ida < idb : -1 : 1;
		}

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
		curdir = currDir();
		pos = curdir.indexOf('/cram');
		if (pos >= 0) {
			return curdir.substring(0, pos + 5);
		}
	}

	function currDir () {
		var curdir;
		// find the folder with all of the js modules in it!
		// we're sniffing for features here instead of in has.js
		// since this needs to run first so we can find has.js!
		curdir = typeof environment != 'undefined' && 'user.dir' in environment
			? environment['user.dir']
			: typeof process != 'undefined' && process.cwd && process.cwd();
		if (curdir == undef) {
			throw new Error('Could not determine current working directory.');
		}
		return curdir;
	}

	function simpleRequire (url) {
		var amdModule, cjsModule, simpleDefine;
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

	function help (write, optionsMap) {
		var skipLine, header, usage, autoGrok, footer, multiOptionText, helpMap;

		skipLine ='\n\n';
		header = 'cram, an AMD-compatible module concatenator. An element of cujo.js.';
		usage = 'Usage:\n\t\t`node cram.js [options]`\n\tor\t`ringo cram.js [options]`\n\tor\t`rhino cram.js [options]`';
		autoGrok = 'Auto-grok run.js (app bootstrap) file:\n\t\t`node cram.js run.js build_override.json [options]`\n\tor\t`ringo cram.js run.js build_override.json [options]`\n\tor\t`rhino cram.js run.js build_override.json [options]`';
		footer = 'More help can be found at http://cujojs.com/';
		multiOptionText = 'You may specify more than one by repeating this option.';

		helpMap = {
			'help': {
				help: 'provides this help message.'
			},
			'includes': {
				help: 'includes the following file into the bundle.\n' + multiOptionText
			},
			// TODO: rename this to something less confusing
			'baseUrl': {
				help: 'specifies the relative path between the web app\'s bootstrap html page and \nthe current directory.'
			},
			'configFiles': {
				help: 'specifies an AMD configuration file. \n' + multiOptionText
			},
			'destUrl': {
				help: 'specifies the output folder for the generated bundle(s).'
			},
			'cramFolder': {
				help: 'tells cram where its source files are. [needed for Rhino?]'
			}
		};

		helpMap = fillHelpMap(helpMap, optionsMap);

		write(
			header + skipLine +
			usage + skipLine +
			autoGrok + skipLine +
			helpMapToText(helpMap) + skipLine +
			footer
		);

		function fillHelpMap (helpMap, optionsMap) {
			var p, option, helpItem;

			for (p in optionsMap) {
				option = optionsMap[p];
				helpItem = helpMap[option];
				if (helpItem) {
					if (!helpItem.commands) helpItem.commands = [];
					helpItem.commands.push(p);
				}
			}

			return helpMap;
		}

		function helpMapToText (helpMap) {
			var output, p;
			output = 'Options:\n';
			for (p in helpMap) {
				// options line
				output += '\t' + helpMap[p].commands.join(' ') + '\n';
				// indented, descriptive text
				output += '\t\t' + helpMap[p].help.replace(/\n/, '\n\t\t') + '\n';
			}
			return output;
		}

	}

}(
	typeof global != 'undefined' ? global : this,
	typeof define == 'function' && define.amd && define,
	process && process.argv ? process.argv.slice(2) : Array.prototype.slice.apply(arguments)
));
