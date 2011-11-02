/*
	cram dependency analyzer
 	finds module/resource dependencies in a file.

 	Analyzer rules are a bit convoluted because of pluginPath and a few other
 	gotchas:
 	1) module ids must be normalized (absId) in the built file so we have to
 	    send the absolute ids to the Builder
	2) plugin-based resources (plugin!resource) must allow the plugin to
		resolve the resource's path at build time, so we have to send the
		parentId to the Builder's Resolver.
	3) pluginPath is a shortcut to translate module ids, but acts more like a
		shortcut to translate the module url since we have to leave the naked
		plugin module id (e.g. text! rather than curl/plugin.text!) in the
		built file.


*/

define(function () {
"use strict";

	// regexes
	var removeCommentsRx, findDepsRx, findIdsRx, cleanDepsRx, seen, ignores;

	// TODO: this was an easy regexp to create, but find a more performant one?
	removeCommentsRx = /\/\*[\s\S]*?\*\/|(?:[^\\])\/\/.*?[\n\r]/g;

	// regex to find dependency lists courtesy of Brian Cavalier @briancavalier
	findDepsRx = /define\s*\((\s*[^,]*\s*,)?\s*\[([^\]]+)\]\s*,/mg;
	findIdsRx = /define\s*\(\s*["']([^"']+)["']\s*,/mg;

	// regex to remove commas and quotes and separate moduleIds
	cleanDepsRx = /["']+\s*([^"']+)["']+/g;
	
	// It's probably too aggressive to put this so high up in the scope, but
	// for now, it'll do since we always start up a new VM for each build.
	seen = {};

	// these modules -- or pseudo-modules -- will never be recorded
	ignores = {
		'require': true,
		'exports': true,
		'module': true
	};

	// analyzer constructor
	function Analyzer () {}

	Analyzer.prototype = {

		/* the following properties must be injected before calling parse() */

		// resolver is a module id and/or url resolver.
		Resolver: null,

		// loader is an AMD module loader object.
		loader: null,

		// fetcher is a text fetcher
		fetcher: null,

		// scanForIds is a boolean that indicates whether to scan for module
		// ids rather than dependencies. true = ids.
		scanForIds: false,
		
		analyze: function (moduleId, parentId, config) {
			var resolver, absId, pluginParts, absPluginId,
				resource, moduleIds, url, moduleSource;

			resolver = new this.Resolver(parentId, config);
			moduleIds = [];

			if (moduleId in ignores) {
				// do nothing
			}
			else if (resolver.isPluginResource(moduleId)) {

				pluginParts = resolver.parsePluginResourceId(moduleId);
				absPluginId = resolver.toAbsPluginId(pluginParts.pluginId);
				absId = resolver.toAbsPluginResourceId(moduleId);
				resource = pluginParts.resource;

				if (!(absId in seen)) {
					
					seen[absId] = true;

					// add plugin's module and any dependencies
					if (!(pluginParts.pluginId in seen)) {

						url = this.resolver.toPluginUrl(absPluginId);
						moduleSource = this.fetcher.fetch(url);
						moduleIds = moduleIds.concat(this.parse(moduleSource, absPluginId, config));

						moduleIds = moduleIds.concat([{
							moduleId: pluginParts.pluginId,
							absId: absPluginId
						}]);

					}

					// get any special resources/modules from the plugin
					moduleIds = moduleIds.concat(
						this.analyzePluginResource(
							pluginParts.pluginId, absPluginId, resource, parentId, config
						)
					);

					// finally add the plugin resource itself (e.g. text!./some/template.html)
					if (!this.scanForIds) {
						moduleIds = moduleIds.concat([{
							moduleId: moduleId,
							absId: absId,
							parentId: parentId
						}]);
					}

				}

			}
			else {

				absId = resolver.toAbsMid(moduleId);

				if (!(absId in seen)) {

					seen[absId] = true;

					// add any dependencies
					url = resolver.toUrl(absId);
					moduleSource = this.fetcher.fetch(url);
					if (!moduleSource) throw new Error('no module source found for ' + url);

					moduleIds = this.parse(moduleSource, absId, config);

					// finally, add module itself
					if (!this.scanForIds) {
						moduleIds = moduleIds.concat([{
							moduleId: absId,
							absId: absId,
							parentId: parentId
						}]);
					}

				}

			}

			return moduleIds;
		},

		parse: function parse (source, moduleId, config) {
			// collect dependencies found
			var self, ids;

			self = this;
			ids = [];

			// remove those pesky comments
			source = source.replace(removeCommentsRx, '');

			// find any/all define()s
			this.scan(source, this.scanForIds ? findIdsRx : findDepsRx, function (match, id, depsList) {

				if (self.scanForIds) {
					ids.push({
						moduleId: id,
						absId: id
					});
				}
				else if (depsList) {
					// extract the ids
					self.scan(depsList, cleanDepsRx, function (match, depId) {
						ids = ids.concat(self.analyze(depId, moduleId, config));
					});
				}

			});

			return ids;
		},

		scan: function scan (str, rx, lambda) {
			// replace() is a fast, easy way to search with a regex
			str.replace(rx, lambda);
		},

		analyzePluginResource: function (pluginId, absId, resource, parentId, config) {
			var resolver, loader, module, deps, api, self, pcfg;

			deps = [];

			self = this;

			// get plugin module
			loader = this.loader;
			resolver = new this.Resolver('', config);
			loader.resolver = resolver;
			module = loader.load(absId);
			
			if(module === void 0) {
				print("ERR module is undefined:", absId);
				return deps;
			}

			// plugin's loader.resolver is relative to the plugin (useful for
			// loading plugin's shared/common modules)
			resolver = new this.Resolver(parentId, config);
			loader.resolver = resolver;

			// check if plugin uses an external build module
			if (module['plugin-builder']) {
				// swap loader for plugin-relative one
				loader.resolver = new this.Resolver(absId, config);
				// go get it
				module = loader.load(module['plugin-builder']);
				// restore resolver
				loader.resolver = resolver;
			}

			// ask plugin to look for more dependencies
			if (typeof module.analyze == 'function') {				
				api = {
					load: function(id) { return loader.load(id); },
					toUrl: function (id) { return resolver.toUrl(id); },
					toAbsMid: function (id) { return resolver.toAbsMid(id); }
				};
				module.analyze(resource, api, function (resourceId) {
					deps = deps.concat(self.analyze(resourceId, parentId, config));
				}, this.getPluginConfig(pluginId, config));
			}
			
			return deps;
		},

		getPluginConfig: function (pluginName, config) {
			return config && config.plugins && config.plugins[pluginName] || {};
		},

		toString: function toString () {
			return '[object Analyzer]';
		}

	};

	return Analyzer;

});

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
