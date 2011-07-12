(function (global) {
"use strict";

	var insertModuleIdRx = /(define\s*\()([^"'])/g;

	// constructor
	function Builder () {}

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
		processed: {},

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
				else {
					this.buildAmdModule(moduleId, absId, resolver);
				}

			}, this);

		},

		isAlreadyProcessed: function isAlreadyProcessed (moduleId) {
			return !!this.processed[moduleId];
		},

		buildPluginResource: function buildPluginResource (depId, absId, resolver, config) {
			var pluginParts, absPluginId, module, write;

			// resolve to absolute path
//			depId = resolver.toAbsPluginResourceId(depId);

			// get parts
			pluginParts = resolver.parsePluginResourceId(depId);
			absPluginId = resolver.toAbsPluginId(pluginParts.pluginId);

//			// write out plugin module
//			this.buildPluginModule(pluginParts.pluginId, resolver);

			if (this.isAlreadyProcessed(depId)) return;
			this.processed[depId] = true;

			// get plugin module
			this.loader.resolver = resolver;
			module = this.loader.load(resolver.toUrl(absPluginId));

			// write output
			if (typeof module.build == 'function') {

				// execute plugin's build operation by giving it the writer, etc
				write = module.build(this.writer, this.fetcher, config);

				// and calling its returned write method
				write(pluginParts.pluginId, pluginParts.resource, resolver);

			}
			else {

				// this is a simple plugin that behaves the same in a build
				// as out (e.g. it probably gets its resources via xhr or has
				// nothing to load) so just write-out a call to load the
				// resource using the plugin just like outside a build
				this.buildAmdModule(depId, resolver);

			}
		},

//		buildPluginModule: function buildPluginModule (moduleId, absId, resolver) {
//			var url, source;
//print(moduleId, absId, this.isAlreadyProcessed(absId));
//			if (this.isAlreadyProcessed(absId)) return;
//			this.processed[absId] = true;
//
//			url = resolver.toUrl(absId);
//print('buildPluginModule', moduleId, absId, url);
//			source = this.insertModuleId(moduleId, this.fetcher(url));
//			this.writer(source);
//
//		},

		buildAmdModule: function buildAmdModule (moduleId, absId, resolver) {
			var url, source;

			url = resolver.toUrl(absId);

			if (this.isAlreadyProcessed(absId)) return;
			this.processed[absId] = true;

			source = this.insertModuleId(moduleId, this.fetcher(url));
			this.writer(source);

		},

		insertModuleId: function insertModuleId (moduleId, source) {
			// TODO: we need a better way to find the right define()
			// if the user has a define("string resource"); will this fail?
			return source.replace(insertModuleIdRx, function (m, prefix, suffix) {
				return prefix + '"' + moduleId + '", ' + suffix;
			});
		},

		toString: function toString () {
			return '[object Builder]';
		}

	};

	global.Builder = Builder;

}(this));
