(function (define, window) {
define(function () {

	// There are very few things declared at this scope to prevent pollution
	// of the eval() in scopedEval(): window, document, curl().
	var curl, define;

	// mock window, if necessary
	if (!window) window = {};


	return (function (scopedEval) {
		/**
		 * @function grokJsConfig
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
		return function grokJsConfig(source) {
			var config, includes, warnings, error,
				prevWindowCurl, saveCurl, prevDefine, results;

			results = [];

			// these will be collected by the mock curl API
			config = null;
			includes = [];
			warnings = [];

			// save any existing curl and define
			prevWindowCurl = window.curl;
			prevDefine = window.define;

			// create mock curl that will collect calls to it
			window.curl = saveCurl = curl = mockCurlApi();

			// mock define() to prevent calls back into curl.js in memory now
			window.define = define = mockDefine;
			window.define.amd = {}; // for UMD sniffs

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
				window.define = prevDefine;
			}

			if (!error) {
				// check if curl variable was set and if it's a config object.
				// (if config is set, then curl() was called)
				if (!config && curl != saveCurl && isObjectLiteral(saveCurl)) {
					config = curl;
				}
				// if nothing was captured, consider it a failure.
				if (!config && results.length == 0) {
					error = new Error('No configuration or modules included.');
				}
			}

			collectConfig(config, null, null, error);

			return results;

			// mock define
			function mockDefine() {
				var factory = arguments[arguments.length - 1];
				if (factory) factory();
			}

			// mock curl API
			function mockCurlApi() {

				function _curl() {
					var args, config, includes, warnings;

					warnings = [];

					// parse params
					args = Array.prototype.slice.call(arguments);
					if (Object.prototype.toString.call(args[0]) == '[object Object]') {
						config = args.shift();
					}
					if (Object.prototype.toString.call(args[0]) == '[object Array]') {
						includes = args.shift();
					}
					if (typeof args[0] == 'function') {
						warnings.push('Did not inspect code inside `curl()` callback(s).');
					}

					collectConfig(config, includes, warnings);

					return {
						// warn when .then() is called
						then: function (cb, eb) {
							warn('Did not inspect code inside `.then()` callback(s).');
						},
						// warn if .next() is called
						next: function (modules) {
							warn('Did not include any modules mentioned in `.next()`: ' + modules);
						},
						config: function(cfg) {
							collectConfig(cfg);
						}
					};
				}

				return _curl;
			}

			function collectConfig(config, modules, warnings, error) {
				results.push({
					config: config || {},
					prepend: [],
					modules: modules || [],
					append: [],
					warnings: warnings || [],
					errors: error ? [error] : []
				});
			}

			function warn(msg) {
				collectConfig(null, null, [msg]);
			}
		};

		function isObjectLiteral(thing) {
			return thing && thing.toString() == '[object Object]';
		}
	}(
		// eval() function that runs in the same scope as mocked
		// window, document, and curl vars.
		function (source) {
			eval(source);
		}
	));

});
}(typeof define === 'function'
	? define
	: function (factory) { module.exports = factory(); },
	typeof window != 'undefined' && window || typeof global != 'undefined' && global
));
