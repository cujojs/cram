(function (global) {
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

	global.Loader = SimpleAmdLoader;

	// mock define
	if (!global.define) {
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

}(this));
