(function (global) {
"use strict";

	// constructor
	function Builder () {}

	Builder.prototype = {

		/* the following properties must be injected before calling build() */

		// resolver is a module id and or url resolver. it has two methods:
		//   toUrl(moduleId)
		//   toAbdMid(moduleId, parentId)
		resolver: null,
		// loader is a module loader. parameters:
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

		build: function build (moduleList, config) {
			// TODO: do we really need this much module info? why not just id?
			// moduleList is an array of normalized module ids:
			moduleList.forEach(function (moduleId) {
				// is this a plugin-based module/resource?
				if (this.isPlugin(moduleId)) {
					this.buildPluginResource(moduleId, config);
				}
				else {
					this.buildAmdModule(moduleId);
				}
			});
		},

		isPlugin: function isPlugin (moduleId) {
			return moduleId.indexOf('!') >= 0;
		},

		buildPluginResource: function buildPluginResource (resourceId, config) {
			var pluginParts, module, write;
			// interpret the resourceId
			pluginParts = extractPluginIdParts(resourceId);
			// load plugin module
			module = this.loader(pluginParts.pluginId);
			// execute build operation in plugin by giving it the writer, etc.
			write = module.build(this.writer, this.fetcher, config);
			// and calling it'the returned write method
			write(pluginParts.resourceId, this.resolver);
		},

		buildAmdModule: function buildAmdModule (resourceId) {
			var source = this.fetcher(resourceId);
			this.writer(source);
			}

	};

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

	global.Builder = Builder;

}(this));
