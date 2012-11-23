(function (window, global) {
define([], function () {

	// There are very few things declared at this scope to prevent pollution
	// of the eval() in scopedEval(): window, document, curl().
	var curl;

	// mock window and global, if necessary
	if (!window) window = {};
	if (!global) global = {};

	return (function (scopedEval) {

		return function (source) {
			var config, includes, warnings, error,
				prevWindowCurl, prevGlobalCurl;

			// these will be collected by the mock curl API
			config = {};
			includes = [];
			warnings = [];

			// save any existing curl and create mock one
			prevWindowCurl = window.curl;
			prevGlobalCurl = global.curl;
			window.curl = global.curl = (curl = mockCurlApi());

			try {
				// evaluate source file
				scopedEval.call(window, source);
			}
			catch (ex) {
				error = ex;
			}
			finally {
				// restore
				window.curl = prevWindowCurl;
				global.curl = prevGlobalCurl;
			}

			return {
				config: config,
				includes: includes,
				warnings: warnings,
				error: error
			};

			// mock curl API
			function mockCurlApi () {

				function _curl () {
					var args;

					// parse params
					args = Array.prototype.slice.call(arguments);
					if (Object.prototype.toString.call(args[0]) == '[object Object]') {
						collectConfig(args.shift());
					}
					if (Object.prototype.toString.call(args[0]) == '[object Array]') {
						collectModules(args.shift());
					}
					if (typeof args[0] == 'function') {
						warn('Did not inspect code inside `curl()` callback(s).');
					}

					return {
						// warn when .then() is called
						then: function (cb, eb) {
							warn('Did not inspect code inside `.then()` callback(s).');
						},
						// warn if .next() is called
						next: function (modules) {
							warn('Did not include any modules mentioned in `.next()`: ' + modules);
						},
						config: collectConfig
					};
				}

				return _curl;
			}

			function collectConfig (cfg) {
				config = extend(config, cfg);
			}

			function collectModules (modules) {
				includes = includes.concat(modules);
			}

			function warn (msg) {
				//(console.warn || console.log).apply(console, arguments);
				warnings.push(msg);
			}

		};

		function extend (ancestor, descendant) {
			var next, p;
			next = Object.create(ancestor || null);
			for (p in descendant) {
				if (typeof descendant[p] == 'object') {
					next[p] = extend(ancestor[p], descendant[p]);
				}
				else {
					next[p] = descendant[p];
				}
			}
			return next;
		}

	}(
		// eval() function that runs in the same scope as mocked
		// window, document, and curl vars.
		function (source) { eval(source); }
	));

})
}(
	typeof window != 'undefined' && window,
	typeof global != 'undefined' && global
));
