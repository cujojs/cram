(function (global) {
"use strict";

	// constructor
	function Resolver (parentId, config) {
		
		this.parentId = parentId ? parentId.substr(0, parentId.lastIndexOf('/')) : '';
		this.config = config;
		this.baseUrl = config.baseUrl;
		this.pluginPath = config.pluginPath || 'curl/plugin';
		this.paths = extractPathsFromCfg(config);

		// create path matcher
		var pathList = [], paths = this.paths;
		for (var p in paths) {
			pathList.push(p);
		}
		this.pathSearchRx = new RegExp('^(' +
			pathList.sort(function (a, b) { return paths[a].specificity < paths[b].specificity; } )
				.join('|')
				.replace(/\//g, '\\/') +
			')(?=\\/|$)'
		);

	}

	Resolver.prototype = {

		toUrl: function toUrl (id) {
			return resolveUrl(this.toAbsMid(id, this.parentId), this.baseUrl);
		},

		toAbsMid: function toAbsMid (id) {
			return resolvePath(normalizeName(id, this.parentId), this.paths, this.pathSearchRx);
		},

		toModuleInfo: function (id) {
			var absId, pluginParts;
			if (isPlugin(id)) {
				pluginParts = extractPluginIdParts(id);
				absId = this.toAbsMid(pluginParts.resourceId);
				if (pluginParts.pluginId.indexOf('/') < 0) {
					pluginParts.pluginId = joinPath(this.pluginPath, pluginParts.pluginId);
				}
				pluginParts.pluginUrl = this.toUrl(pluginParts.pluginId);
			}
			else {
				absId = this.toAbsMid(id);
			}
			return {
				parentId: this.parentId,
				moduleId: absId,
				moduleUrl: this.toUrl(absId),
				pluginData: pluginParts
			};
		}

	};

	/* the following were copied from Builder.js */

	function isPlugin (moduleId) {
		return moduleId.indexOf('!') >= 0;
	}

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

	/* the following functions and regexes copied from curl.js */

	var
		absUrlRx = /^\/|^[^:]*:\/\//,
		normalizeRx = /^\.(\/|$)/,
		findSlashRx = /\//,
		hasExtRx = /\.\w+$/,
		toString = ({}).toString,
		// the defaults for a typical package descriptor
		defaultDescriptor = {
			main: './lib/main',
			lib: './lib'
		};

	function endsWithSlash (str) {
		return str.charAt(str.length - 1) == '/';
	}

	function removeEndSlash (path) {
		return endsWithSlash(path) ? path.substr(0, path.length - 1) : path;
	}

	function joinPath (path, file) {
		return (!path || endsWithSlash(path) ? path : path + '/') + file;
	}

	function normalizeName (name, baseName) {
		// if name starts with . then use parent's name as a base
		return name.replace(normalizeRx, baseName + '/');
	}

	function isType (obj, type) {
		return toString.call(obj).indexOf('[object ' + type) == 0;
	}

	/* the following functions were adapted from curl.js */

	function resolvePath (name, paths, rx) {
		// searches through the configured path mappings and packages
		// if the resulting module is part of a package, also return the main
		// module so it can be loaded.

		var pathInfo, path;
		path = name.replace(rx, function (match) {

			pathInfo = paths[match] || {};

			// if pathInfo.main and match == name, this is a main module
			if (pathInfo.main && match == name) {
				return pathInfo.main;
			}
			// if pathInfo.lib return pathInfo.lib
			else if (pathInfo.lib) {
				return pathInfo.lib;
			}
			else {
				return pathInfo.path;
			}

		});

		return path;
	}

	function resolveUrl(path, baseUrl) {
		// TODO: deal with possible existing .js extension already?
		return (baseUrl && !absUrlRx.test(path) ? joinPath(baseUrl, path) : path) + (hasExtRx.test(path) ? '' : '.js');
	}

	function extractPathsFromCfg (cfg) {
		var p, pStrip, path, pathList = [], paths = {};

		// fix all paths
		var cfgPaths = cfg['paths'];
		for (p in cfgPaths) {
			pStrip = removeEndSlash(p);
			path = paths[pStrip] = { path: removeEndSlash(cfgPaths[p]) };
			path.specificity = (path.path.match(findSlashRx) || []).length;
			pathList.push(pStrip);
		}

		var cfgPackages = cfg['packages'];
		for (p in cfgPackages) {
			pStrip = removeEndSlash(cfgPackages[p]['name'] || p);
			path = paths[pStrip] = normalizePkgDescriptor(cfgPackages[p], pStrip);
			path.specificity = (path.path.match(findSlashRx) || []).length;
			pathList.push(pStrip);
		}

		return paths;

	}

	function normalizePkgDescriptor (descriptor, name) {
		var lib, main;

		// check for string shortcuts
		if (isType(descriptor, 'String')) {
			// fill in defaults
			descriptor = {
				'path': removeEndSlash(descriptor),
				'main': defaultDescriptor.main,
				'lib': defaultDescriptor.lib
			};
		}

		// we need to do this with brackets to account for google closure
		descriptor.path = descriptor['path'] || (isNaN(name) ? name : descriptor.name);
		descriptor.lib = 'lib' in descriptor && removeEndSlash(normalizeName(descriptor['lib'], descriptor.path));
		descriptor.main = 'main' in descriptor && removeEndSlash(normalizeName(descriptor['main'], descriptor.path));

		return descriptor;
	}

	global.Resolver = Resolver;

}(this));
