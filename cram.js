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

	var config, cramFolder, curl,
		toString, undef;

	toString = Object.prototype.toString;

	try {

		// parse the arguments sent to this file
		args = parseArgs(args);

		// find cram folder (the folder with all of the javascript modules)
		cramFolder = args.cramFolder;
		if (cramFolder && /^\.\.\//.test(cramFolder)) {
			cramFolder = joinPaths(currDir(), cramFolder);
		}
		if (!cramFolder) cramFolder = cramDir();

		config = {
			paths: {
				curl: joinPaths(cramFolder, 'support/curl/src/curl')
			},
			packages: {
				cram: {
					location: cramFolder,
					main: './cram'
				},
				when: {
					location: joinPaths(cramFolder, 'support/when'),
					main: 'when'
				}
			},
			preloads: [
				'cram/lib/has'
			]
		};

		if (!global.curl) {
			globalLoader(joinPaths(config.paths.curl, '../../dist/curl-for-ssjs/curl.js'));
		}
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
				'when',
				'when/sequence',
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

	function start(when, sequence, compile, link, getCtx, grok, ioText, ioJson, mergeConfig) {
		var cramSequence, grokked, configs;

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

		cramSequence = sequence.bind(undef, [
			function (buildContext) {
				buildContext.ctx = getCtx('', buildContext.config);
				return buildContext;
			},
			function (buildContext) {
				return compile(buildContext.modules, buildContext.io, buildContext.ctx);
			},
			function (buildContext) {
				return writeFiles(buildContext.prepend, buildContext.io, buildContext.ctx);
			},
			function (buildContext) {
				return link(buildContext.discovered, buildContext.io, buildContext.ctx);
			},
			function (buildContext) {
				return writeFiles(buildContext.append, buildContext.io, buildContext.ctx);
			}
		]);

		when.join(grokked, configs)
			.spread(mergeGrokResults)
			.then(processGrokResults)
			.then(createBuildContext)
			.then(cramSequence)
			.then(cleanup, fail);

		function mergeGrokResults(grokResult, configs) {
			grokResult.config = mergeConfig(grokResult.config, configs);
			return grokResult;
		}

		function processGrokResults(results) {
			var config;

			config = results.config;

			if (!results.modules) results.modules = [];

			// figure out where modules are located
			if (args.moduleRoot) config.baseUrl = args.moduleRoot;
			if (config.baseUrl == '.') config.baseUrl = cramFolder;
			if (/^\./.test(config.baseUrl)) {
				config.baseUrl = joinPaths(cramFolder, config.baseUrl);
			}

			config.destUrl = args.destUrl || config.destUrl || '';

			// remove things that curl will try to auto-load
			if (config.main) {
				results.modules = results.modules.concat(config.main);
				delete config.main;
			}
			if (config.preloads) {
				results.modules = config.preloads.concat(results.includes);
				delete config.preloads;
			}

			if(results.loader) {
				results.prepend = results.prepend.concat(ioText.getReader(results.loader)());
			}

			// configure curl
			curl(config);
			return results;
		}

		function createBuildContext(results) {
			// TODO: collect, but exclude "config.excludes" from output
			var discovered = [];

			return {
				config: results.config,
				prepend: results.prepend,
				modules: results.modules,
				append: results.append,
				// collect modules encountered, in order
				// dual array/hashmap
				discovered: discovered,

				// compile phase:
				// transform it to AMD, if necessary
				// scan for dependencies, etc.
				// cache AST here
				io: {
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
					collect: function (id, thing) {
						var top;
						if (id in discovered) return discovered[id];
						top = discovered.length;
						discovered[id] = top;
						discovered[top] = thing;
						return thing;
					}
				}
			};
		}

		function writeFiles(files, io, ctx) {
			return when.reduce(files, function(_, file) {
				return io.writeModule(ctx, guardSource(file));
			}, undef);
		}

		function cleanup () {
			return ioText.closeAll && ioText.closeAll();
		}
	}

	function guardSource (source) {
		// ensure that any previous code that didn't end correctly (ends
		// in a comment line without a line feed, for instance) doesn't
		// cause this source code to fail
		return /^\s*;|^\s*\//.test(source) ? source : '\n;' + source;
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
			'-r': 'moduleRoot',
			'--root': 'moduleRoot',
			'--moduleRoot': 'moduleRoot',
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
			moduleRoot: '',
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

	function cramDir () {
		var dir;
		if (typeof __dirname != 'undefined') {
			dir = __dirname;
		}
		else if (typeof module != 'undefined' && module.uri) {
			// remove file: protocol and trailing file name
			dir = module.uri.replace(/^file:|\/[^\/]*$/g, '')  + '/';
		}
		else {
			throw new Error('Could not determine cram\'s working directory.');
		}
		return dir;
	}

	function currDir () {
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

	function quitter (code) {
		if (typeof process !== 'undefined' && process.exit) {
			process.exit(code);
		}
		else if (typeof quit == 'function') {
			quit(code);
		}
		else {
			throw "quitting";
		}

	}

	function help (write, optionsMap) {
		var skipLine, header, usage, autoGrok, footer, multiOptionText, helpMap;

		skipLine ='\n\n';
		header = 'cram, an AMD-compatible module bundler. An element of cujo.js.';
		usage = 'Usage:\n\t\t`node cram.js [options]`\n\tor\t`ringo cram.js [options]`\n\tor\t`cram [options] (if fully installed)';
		autoGrok = 'Auto-grok run.js (app bootstrap) file:\n\t\t`cram index.html build_override.json [options]`\n\tor\t`cram run.js build_override.json -root path/to/modules [options]`';
		footer = 'More help can be found at http://cujojs.com/';
		multiOptionText = 'You may specify more than one by repeating this option.';

		helpMap = {
			'help': {
				help: 'provides this help message.'
			},
			'includes': {
				help: 'includes the following file into the bundle.\n' + multiOptionText
			},
			'moduleRoot': {
				help: 'specifies the path from the current working directory to \nthe location of your packages.  This serves the same \npurpose as (and overrides) baseUrl.'
			},
			'configFiles': {
				help: 'specifies an AMD configuration file. \n' + multiOptionText
			},
			'destUrl': {
				help: 'specifies the output folder for the generated bundle(s).'
			},
			'cramFolder': {
				help: 'tells cram where its source files are. DEPRECATED'
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
				output += '\t\t' + helpMap[p].help.replace(/\n/g, '\n\t\t') + '\n';
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
