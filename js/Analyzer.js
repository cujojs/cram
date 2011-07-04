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

		// resolver is a module id and/or url resolver.
		resolver: null,

		// loader is an AMD module loader object.
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

						if (self.resolver.isPluginResource(depId)) {
							deps.push.apply(deps, self.analyzePluginResource(depId));
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

		analyzePluginResource: function (depId) {
			var resolver, pluginParts, module, url, deps;

			resolver = this.resolver;

			// resolve to absolute path
			depId = resolver.toAbsPluginResourceId(depId);
			// get parts
			pluginParts = resolver.parsePluginResourceId(depId);

			deps = [pluginParts.pluginId];

			// get plugin module
			url = resolver.toUrl(pluginParts.pluginId);
			module = this.loader.load(url);

			// ask plugin to look for more dependencies
			if (typeof module.analyze == 'function') {
				module.analyze(depId, this.loader.load, function (resourceId) {
					// TODO: is it the plugin's job or the builder's job to
					// resolve the abs module id of these dependencies?
					// during the build phase, we hand a resolver to the plugin
					// module. should we do that here? or should we use the
					// following code?
					var absId = resolver.toAbsMid(resourceId);
					deps.push(absId);
				});
			}

			return deps;
		},

		toString: function toString () {
			return '[object Analyzer]';
		}

	};

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
