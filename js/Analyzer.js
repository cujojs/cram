/*
	cram dependency analyzer
 	finds module/resource dependencies in a file.
*/

(function (global) {
"use strict";

	// regexes
	var removeCommentsRx, findDefineRx, cleanDepsRx;

	// TODO: this was an easy regexp to create, but find a more performant one?
	removeCommentsRx = /\/\*.*?\*\/|\/\/.*?\n/g;

	// regex to find dependency lists courtesy of Brian Cavalier @briancavalier
	findDefineRx = /define\s*\((\s*[^,]*,)?\s*\[([^\]]+)\]\s*,/mg;

	// removes commas and quotes
	cleanDepsRx = /["']+\s*([^,"']+)/g;

	// analyzer constructor
	function Analyzer () {}

	Analyzer.prototype = {

		/* the following properties must be injected before calling parse() */

		// resolver is a module id and or url resolver. it has two methods:
		//   toUrl(moduleId)
		//   toAbsMid(moduleId, parentId)
		resolver: null,

		// loader is a module loader function. parameters:
		//   moduleId: the normalized module id
		loader: null,

		parse: function parse (source, config) {
			// collect dependencies found
			var self, deps;

			self = this;
			deps = [];

			// remove those pesky comments
			source = source.replace(removeCommentsRx, '');

			// find any/all define()s
			this.scan(source, findDefineRx, function (match, id, depsList) {

				if (depsList) {
					// extract the ids
					self.scan(depsList, cleanDepsRx, function (match, depId) {

						if (self.isPlugin(depId)) {
							// push plugin module and ask for any special deps
						}
						else {
							// just a module
							deps.push(depId);
						}

					});
				}

			});

			return deps;

		},

		scan: function scan (str, rx, lambda) {
			// replace() is a fast, easy way to search with a regex
			str.replace(rx, lambda);
		},

		isPlugin: function isPlugin (moduleId) {
			return moduleId.indexOf('!') >= 0;
		},

		analyzePluginResource: function (depId) {
			var pluginParts, module, deps;

			pluginParts = extractPluginIdParts(depId);
			deps = [pluginParts.pluginId];

			// get plugin module
			module = this.loader(pluginParts.pluginId);

			// ask plugin to look for more dependencies
			if (typeof module.analyze == 'function') {
				module.analyze(depId, this.loader.load, function (resourceId) {
					deps.push(resourceId);
				});
			}

			return deps;
		}

	};

	/* this function was copied from Builder.js */

	function extractPluginIdParts (resourceId) {
		var parts;
		parts = resourceId.split('!');
		return {
			all: parts,
			pluginId: parts[0],
			resourceId: parts[1],
			suffixes: parts.slice(2)
		};
	}


	global.Analyzer = Analyzer;

}(this));

/*

define("a", ["b", "c"], function (b, c) { return b + c; });
define("a", function () { return 1; });
define("a", { foo: 1; });
define("a", 1);
define("a", "foo");
define(["b", "c"], function (b, c) { return b + c; });
define(function () { return 1; });
define({ foo: 1; });
define(1);
define("foo");

define("a", ["b", "c"], myFunc);
define("a", myDepsArray, myFunc); // <- cram won't find these dependencies
define("a", myFunc);
define("a", myObj);
define("a", myValue);
define("a", myString);

*/
