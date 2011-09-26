var define;
(function (global, globalDefine) {
"use strict";

	var cache, currentlyLoadingModuleId;

	// cache of loaded modules
	cache = {};

	function SimpleAmdLoader () {}

	SimpleAmdLoader.prototype = {

		resolver: null,

		load: function (id) {
			if (!(id in cache)) {
				currentlyLoadingModuleId = id;
				global.load(this.resolver.toUrl(id));
				currentlyLoadingModuleId = null;
			}
			return cache[id];
		},

		toString: function toString () {
			return '[object SimpleAmdLoader]';
		}

	};

	// if the global define isn't AMD, we will replace it.
	// but first, let's return our module to it.
	if (globalDefine) {
		globalDefine(function () { return SimpleAmdLoader; });
	}
	else {
		global.Loader = SimpleAmdLoader;
	}

	// declare a simple AMD define if one isn't already available
	if (!globalDefine || !globalDefine.amd) {
		global.define = function () {
			// TODO: allow commonjs and node.js module definition (e.g. exports.module)
			var defFunc, module;

			defFunc = arguments[arguments.length - 1];
			if (arguments.length > 1) {
				// TODO: load dependencies
			}

			if (typeof defFunc == 'function') {
				// TODO: inject dependencies
				module = defFunc();
			}
			else {
				module = defFunc;
			}

			// be sure we're catching the correct define(), a file could have
			// several, but only one can be anonymous.
			if (arguments.length == 3 && arguments[0] != currentlyLoadingModuleId)  {
				// some other named define() is in the file
				cache[arguments[0]] = module;
			}
			else {
				// this is the one we explicitly loaded
				cache[currentlyLoadingModuleId] = module;
			}

		};
	}

	global.define.amd = {};

}(this, define));
