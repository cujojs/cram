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

(function (global, globalDefine, globalLoader, define, args) {
define(function (require) {
/*global environment:true*/
'use strict';

	var quitter, config, cramFolder, curl,
		toString, undef;

	toString = Object.prototype.toString;

	try {

		// TODO: remove the need for quitter()
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

		config = {
			paths: {},
			packages: {},
			preloads: [
				'cram/lib/has'
			]
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

		globalLoader(joinPaths(config.paths.curl, '../../dist/curl-for-ssjs/curl.js'));
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
				'cram/lib/io/text',
				'cram/lib/io/json',
				'cram/lib/config/merge'
			],
			start,
			fail
		);

	}
	catch (ex) {
		fail(ex);
	}

	function start (require, when, compile, link, getCtx, grok, ioText, ioJson, mergeConfig) {
		var grokked, configs, ids, discovered, io;

		grokked = {};
		configs = [];

		if (args.grok) {
			grokked = grok(
				{
					readFile: function (filename) {
						return ioText.getReader(filename)();
					},
					warn: function (msg) { console.log('warning: ' + msg); },
					error: fail
				},
				args.grok
			);
		}

		if (args.configFiles) {
			configs = when.map(
				args.configFiles,
				function (file) {
					return ioJson.getReader(file)();
				}
			);
		}

		when.all([grokked, configs]).then(
			function (results) {
				results[0].config = mergeConfig(results[0].config, configs);
				return results[0];
			}
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
						return ioText.getReader(filename)();
					},
					readModule: function (ctx) {
						return ioText.getReader(ctx.withExt(ctx.toUrl(ctx.absId)))();
					},
					writeModule: function (ctx, contents) {
						return ioText.getWriter(args.destUrl || '.cram/linked/main.js')(contents);
					},
					readMeta: function (ctx) {
						return ioText.getReader(joinPaths('.cram/meta', ctx.absId))();
					},
					writeMeta: function (ctx, contents) {
						return ioText.getWriter(joinPaths('.cram/meta', ctx.absId))(contents);
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
			if (ioText.closeAll) {
				// clean up
				return ioText.closeAll();
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
			help(console.log.bind(console), optionMap); quitter();
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
					help(console.log.bind(console), optionMap); quitter();
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

	function cramDir () {
		// TODO: move sniffs to has.js
		var curdir, pos;
		// find the folder with all of the js modules in it!
		curdir = currDir();
		pos = curdir.indexOf('/cram');
		if (pos >= 0) {
			return curdir.substring(0, pos + 5);
		}
	}

	function currDir () {
		// TODO: move sniffs to has.js
		var curdir;
		curdir = typeof environment != 'undefined' && 'user.dir' in environment
			? environment['user.dir']
			: typeof process != 'undefined' && process.cwd && process.cwd();
		if (curdir == undef) {
			throw new Error('Could not determine current working directory.');
		}
		return curdir;
	}

	function fail (ex) {
		console.log('cram failed: ', ex && ex.message || ex);
		if (ex && ex.stack) console.log(ex.stack);
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

});
}(
	typeof global != 'undefined' ? global : this,
	typeof define == 'function' && define.amd && define,
	typeof curl == 'function' && curl || typeof require == 'function' && require,
	typeof define == 'function' && define.amd || function (factory) { module.exports = factory(require); },
	process && process.argv ? process.argv.slice(2) : Array.prototype.slice.apply(arguments)
));
