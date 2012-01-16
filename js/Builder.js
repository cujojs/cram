/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * cram dependency builder
 * writes dependencies to a file.
 *
 * Licensed under the MIT License at:
 * 		http://www.opensource.org/licenses/mit-license.php
 *
 * @version 0.6
 */
define(function () {
"use strict";

	var
		// TODO: add ability to find R-Value require() and insert deps so the def func isn't scanned at run-time
		// state machine to find defines
		insertModuleIdRx = /(define\s*\(\s*)([^"'\s)])|(\/\*)|(\*\/)|((?:[^\\])\/\/)|(\n|\r|$)|((?:[^\\'])'(?:[^']))|((?:[^\\"])"(?:[^"]))/g,
		endsWithSemiRx = /;\s*$/;

	// constructor
	function Builder () {
		this.processed = {};
		this.excludes = [];
	}

	Builder.prototype = {

		/* the following properties must be injected before calling build() */

		// resolver is a module id and or url resolver. it has two methods:
		//   toUrl(moduleId)
		//   toAbsMid(moduleId, parentId)
		Resolver: null,

		// loader is a module loader object with a load function. parameters:
		//   moduleId: the normalized module id
		loader: null,

		// fetcher is a function used to fetch a text resource. plugins
		// 	 use this feature to get text content. It's also used to grab
		//   the source code for modules. parameters:
		//   resourceId: the normalized resource id
		fetcher: null,

		// writer is a function that a plugin may call to add code to the
		//	 built javascript file. by default, a simple define() will be
		//   added. parameters
		//   text: a string of text to output to the built file
		writer: null,

		// processed is a hashMap of the ids of the modules that were output
		// to the built file already. if this is set to a non-empty map at
		// the start of a build, it effectively becomes an "excludes list".
		processed: null,

		// excludes is a list of module ids not to build into output.
		// this list could be derived from a list of pre-built files to be
		// concatenated into the current file.
		excludes: null,

		build: function build (moduleList, config) {
			var resolver, moduleId, absId;

			// moduleList is an array of module info objects:
			moduleList.forEach(function (moduleInfo) {
				moduleId = moduleInfo.moduleId;
				absId = moduleInfo.absId;
				resolver = new this.Resolver(moduleInfo.parentId || '', config);
				// is this a plugin-based module/resource?
				if (resolver.isPluginResource(moduleId)) {
					this.buildPluginResource(moduleId, absId, resolver, config);
				}
				else if (moduleInfo.isPlugin) {
					this.buildPluginModule(moduleId, absId, resolver, config);
				}
				else {
					this.buildAmdModule(moduleId, absId, resolver, config);
				}

			}, this);

		},

		isAlreadyProcessed: function isAlreadyProcessed (moduleId) {
			return !!this.processed[moduleId] || this.excludes.indexOf(moduleId) >= 0;
		},

		buildPluginResource: function buildPluginResource (depId, absId, resolver, config) {
			var self, pluginParts, absPluginId, module, write, api;

			self = this;

			// get parts
			pluginParts = resolver.parsePluginResourceId(depId);
			absId = absId || resolver.toAbsPluginResourceId(depId);
			absPluginId = resolver.toAbsPluginId(pluginParts.pluginId);

			if (this.isAlreadyProcessed(absId)) return;

			this.processed[absId] = true;

			// get plugin module
			this.loader.resolver = resolver;
			module = this.loader.load(absPluginId);

			// check if plugin uses an external build module
			if (module['plugin-builder']) {
				// switch loader's context to plugin's (because plugin-builder
				// module could be relative to plugin module)
				this.loader.resolver = new this.Resolver(absPluginId, config);
				// go get it
				module = this.loader.load(module['plugin-builder']);
			}

			// write output
			if (typeof module.build == 'function') {

				// execute plugin's build operation by giving it the writer, etc
				write = module.build(this.writer, this.fetcher, this.getPluginConfig(config));

				// create the api it needs (api looks like require() function)
				api = function (moduleId) {
					return self.loader.load(moduleId);
				};
				api.load = api;
				api.toUrl = function (moduleId) { return resolver.toUrl(moduleId) };
				api.toAbsMid = function (moduleId) { return resolver.toAbsMid(moduleId) };

				// and calling its returned write method
				write(pluginParts.pluginId, pluginParts.resource, api);

			}
			else {

				// this is a simple plugin that behaves the same in a build
				// as out (e.g. maybe it gets its resources via xhr or has
				// nothing to load) so just write-out a call to load the
				// resource using the plugin just like outside a build
				// JMH 2011-11-02 removed. what the heck does this do???
				//this.buildAmdModule(depId, absId, resolver);

			}
		},

		buildAmdModule: function buildAmdModule (moduleId, absId, resolver, config) {
			var url, source;

			url = resolver.toUrl(absId);

			if (this.isAlreadyProcessed(absId)) return;

			this.processed[absId] = true;

			source = this.fetcher(url);
			if (!source) throw new Error('could not find source for ' + url);

			// keep the root module anonymous so it can be relocated
			if (!config.anonymousRoot || config.rootModule != moduleId) {
				source = this.insertModuleId(moduleId, source);
			}

			// check for trailing semicolon
			if (!endsWithSemiRx.test(source)) {
				source += ';';
			}

			this.writer(source);

		},

		buildPluginModule: function buildAmdModule (moduleId, absId, resolver, config) {
			// HACK! there has to be a better way
			var url, source;

			url = resolver.toUrl(absId);

			if (this.isAlreadyProcessed(moduleId)) return;

			this.processed[moduleId] = true;

			source = this.fetcher(url);
			if (!source) throw new Error('could not find source for ' + url);

			// keep the root module anonymous so it can be relocated
			if (!config.anonymousRoot || config.rootModule != moduleId) {
				source = this.insertModuleId(moduleId, source);
			}

			// check for trailing semicolon
			if (!endsWithSemiRx.test(source)) {
				source += ';';
			}

			this.writer(source);

		},

		insertModuleId: function insertModuleId (moduleId, source) {
			// TODO: specify an option to only replace one define()?
			var commentType = '', found;
			return source.replace(insertModuleIdRx,
				function (m, prefix, suffix, bcStart, bcEnd, lcStart, lcEnd, q, qq) {
					// if already inserted module id
					if (found) {
						// do nothing
					}
					// if in a block comment
					else if (commentType == 'block') {
						if (bcEnd) commentType = '';
					}
					// otherwise, if in a line comment
					else if (commentType == 'line') {
						if (lcEnd) commentType = '';
					}
					// otherwise, if in a quoted string
					else if (commentType == 'quoted') {
						if (q) commentType = '';
					}
					// otherwise, if in a dbl-quoted string
					else if (commentType == 'dbl-quoted') {
						if (qq) commentType = '';
					}
					// otherwise (not in a comment)
					else {
						// if we're starting a block comment
						if (bcStart) {
							commentType = 'block';
						}
						// if we're starting a line comment
						else if (lcStart) {
							commentType = 'line';
						}
						// if we're starting a quoted string
						else if (q) {
							commentType = 'quoted';
						}
						// if we're starting a dbl-quoted string
						else if (qq) {
							commentType = 'dbl-quoted';
						}
						// otherwise (yay! we hit a define() call!!!!)
						else if (lcEnd == null && bcEnd == null) {
							found = true;
							return prefix + '"' + moduleId + '", ' + suffix;
						}
					}
					return m;
				}
			);
		},

		getPluginConfig: function (pluginName, config) {
			return config && config.plugins && config.plugins[pluginName] || {};
		},

		toString: function toString () {
			return '[object Builder]';
		}

	};

	return Builder;

});
