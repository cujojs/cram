(function (window) {
define([], function () {

	// There are very few things declared at this scope to prevent pollution
	// of the eval() in scopedEval(): window, document, curl().
	var curl;

	// mock window, if necessary
	if (!window) window = {};

	/**
	 * @function runjs
	 * @param source {String}
	 * @return {Object}
	 *
	 * @description Records the invocations of curl() inside an app bootstrap
	 * file, such as the run.js file in cujo bootstrap.  (This file is
	 * typically called "main.js" in the RequireJS world.)
	 *
	 * This function can also detect when the file/source configures curl
	 * by declaring a global object, `curl`.  A run.js file should never do
	 * this, but allows us to reuse this function to parse the contents of
	 * script elements in an html file.
	 *
	 * TODO: more intelligent handling of multiple calls to curl.  The current
	 * implementation concatenates all modules together and combines all
	 * configs together via prototypal inheritance.  Doing it this way is
	 * probably all wrong since the most likely use case for multiple
	 * configurations will be to load one set of modules with one
	 * configuration and then load another set using a second config.  However,
	 * this is a very rare scenario so we should probably just signal as
	 * error if the config is called multiple times.
	 */
	return (function (scopedEval) {

		return function (source) {
			var config, includes, warnings, error,
				prevWindowCurl, saveCurl;

			// these will be collected by the mock curl API
			config = null;
			includes = [];
			warnings = [];

			// save any existing curl
			prevWindowCurl = window.curl;

			// create mock curl that will collect calls to it
			window.curl = saveCurl = curl = mockCurlApi();

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
			}

			if (!error) {
				// check if curl variable was set and if it's a config object.
				// (if config is set, then curl() was called)
				if (!config && curl != saveCurl && isObjectLiteral(saveCurl)) {
					config = curl;
				}
				// if nothing was captured, consider it a failure.
				if (!config && includes.length == 0) {
					error = new Error('No configuration or modules included.');
				}
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
				if (config) warn('Multiple calls to configure curl is unsupported.');
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
				if (isObjectLiteral(descendant[p])) {
					next[p] = extend(next[p], descendant[p]);
				}
				else {
					next[p] = descendant[p];
				}
			}
			return next;
		}

		function isObjectLiteral (thing) {
			return thing && thing.toString() == '[object Object]';
		}

	}(
		// eval() function that runs in the same scope as mocked
		// window, document, and curl vars.
		function (source) { eval(source); }
	));

})
}(
	typeof window != 'undefined' && window ||
	typeof global != 'undefined' && global
));
