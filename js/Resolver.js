define(function () {
"use strict";

	// constructor
	function Resolver (parentId, config) {
		
		this.baseName = parentId ? parentId.substr(0, parentId.lastIndexOf('/')) : '';
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

		/* these methods conform to the CommonJS AMD proposal */

		toUrl: function toUrl (id) {
			return resolveUrl(resolvePath(this.toAbsMid(id, this.baseName), this.paths, this.pathSearchRx), this.baseUrl);
		},

		toAbsMid: function toAbsMid (id) {
			return normalizeName(id, this.baseName);
		},

		/* these methods are proprietary to cram/curl.js */

		toUrlFromAbsMid: function toUrlFromAbsMid (absId) {
			return resolveUrl(absId, this.baseUrl);
		},

		isPluginResource: function isPluginResource (id) {
			return isPlugin(id);
		},

		toPluginUrl: function toPluginUrl (id) {
			return this.toUrl(this.toAbsPluginId(id));
		},

		toAbsPluginId: function toAbsPluginId (id) {
			var absId, pluginParts;
			if (id.indexOf('!') >= 0) {
				pluginParts = extractPluginIdParts(id);
				absId = this.toAbsMid(pluginParts.pluginId);
			}
			else {
				absId = id;
			}
			if (absId.indexOf('/') < 0 && 'pluginPath' in this) {
				absId = joinPath(this.pluginPath, absId);
			}
			return absId;
		},

		toAbsPluginResourceId: function toAbsPluginResourceId (id) {
			var absId, pluginParts;
			pluginParts = extractPluginIdParts(id);
			absId = this.toAbsMid(pluginParts.pluginId);
			if (absId.indexOf('/') < 0 && 'pluginPath' in this) {
				absId = joinPath(this.pluginPath, absId);
			}
			return absId + '!' + (pluginParts.resource || '');
		},

		parsePluginResourceId: function (id) {
			return extractPluginIdParts(id);
		},

		toString: function toString () {
			return '[object Resolver]';
		}

	};

	Resolver.isPluginResource = Resolver.prototype.isPluginResource;

	function isPlugin (moduleId) {
		return moduleId.indexOf('!') >= 0;
	}

	function extractPluginIdParts (resourceId) {
		// Note: some plugins don't require a resource. e.g. "domReady!"
		var parts;
		parts = resourceId.split('!', 2);
		return {
			pluginId: parts[0],
			resource: parts[1]
		};
	}

	/* the following functions and regexes copied from curl.js */

	var
		absUrlRx = /^\/|^[^:]+:\/\//,
		normalizeRx = /^\.(\/|$)/,
		findSlashRx = /\//,
		hasExtRx = /\.\w+($|[?#])/,
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
		// TODO: remove this function. instead, add slash to all paths in advance
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

	function normalizePkgDescriptor (descriptor, nameOrIndex) {
		// TODO: remove nameOrIndex param
		// we need to use strings for prop names to account for google closure

		// check for string shortcuts
		if (isType(descriptor, 'String')) {
			descriptor = removeEndSlash(descriptor);
			// fill in defaults
			descriptor = {
				name: descriptor,
				'path': descriptor,
				'main': defaultDescriptor.main,
				'lib': defaultDescriptor.lib
			};
		}

		descriptor.path = descriptor['path'] || ''; // (isNaN(nameOrIndex) ? nameOrIndex : descriptor.name);

		function normalizePkgPart (partName) {
			var path;
			if (partName in descriptor) {
				if (descriptor[partName].charAt(0) != '.') {
					// prefix with path
					path = joinPath(descriptor.path, descriptor[partName]);
				}
				else {
					// use normal . and .. path processing
					path = normalizeName(descriptor[partName], descriptor.path);
				}
				return removeEndSlash(path);
			}
		}
		descriptor.lib = normalizePkgPart('lib');
		descriptor.main = normalizePkgPart('main');

		return descriptor;
	}

	return Resolver;

});
