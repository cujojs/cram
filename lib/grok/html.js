(function(define) {
define(function (require) {

	var when, text, path, grokJsConfig, grokRunJs, findScriptElementsRx, parseAttrsRx, curlName, curlScriptRx;

	when = require('when');
	text = require('../io/text');
	grokJsConfig = require('./jsConfig');
	grokRunJs = require('./runjs');
	path = require('../path');

	findScriptElementsRx = /(<\s*script[^>]*>)|(<\/\s*script\s*>)/g;
	parseAttrsRx = /\b([a-zA-Z\-]+)(\s*=\s*(?:['"]([^"']+)['"]|([^\s]+)))?/g;
	curlScriptRx = /curl\.js/i;
	curlName = 'curl';

	function grokHtml(io, filename) {

		return io.readFile(filename).then(function(source) {

			var candidates, relativeLoaderPath, script, attrs, tag, scriptStart, scriptEnd, scriptContent;

			candidates = [];

			findScriptElementsRx.lastIndex = 0;
			parseAttrsRx.lastIndex = 0;

			io.info('Parsing ' + filename + ' for curl configuration');

			while(script = findScriptElementsRx.exec(source)) {
				tag = script[0];
				if(isStartTag(tag)) {
					scriptStart = findScriptElementsRx.lastIndex;

					attrs = parseAttrs(tag);

					if('data-curl-run' in attrs) {
						captureDataCurlRun(tag, attrs);
					}
				} else {
					// Get the script content
					scriptEnd = findScriptElementsRx.lastIndex - script[0].length;
					scriptContent = source.slice(scriptStart, scriptEnd);

					// See if it might contain curl config info, and if so,
					// try to parse it.
					if(isPotentialCurlConfig(scriptContent)) {
						io.info('Found potential curl config');
						candidates.push(grokJsConfig(scriptContent));
					}
				}
			}

			return candidates.length
				? when.any(candidates).then(addLoader)
				: when.reject(new Error('No loader or run.js configuration found: ' + filename));

			function captureDataCurlRun (tag, attrs) {
				var src, run, isCurl;

				src = attrs.src;
				run = attrs['data-curl-run'];
				isCurl = src && curlScriptRx.test(src);

				// either <script data-curl-run="main" src="curl.js">, or
				// <script data-curl-run src="run.js">
				if(!src) {
					io.warn('data-curl-run script must have a src attribute: ' + tag);
				} else if(!run && isCurl) {
					io.warn('data-curl-run script must have a value when used with a loader: ' + tag);
				} else if(run && !isCurl) {
					io.warn('data-curl-run script must not have a value when used with a run module: ' + tag);
				} else {
					if(isCurl) {
						io.info('Found data-curl-run: ' + run);
						candidates.push(grokConfig(run));
						captureLoaderPath(src);
					} else {
						io.info('Found data-curl-run: ' + src);
						candidates.push(grokConfig(src));
					}
				}
			}

			function captureLoaderPath(relativePath) {
				io.info('Including loader: ' + relativePath);
				if(relativeLoaderPath) {
					io.warn('Multiple loaders found: "' + relativeLoaderPath + '" and "' + relativePath + '"');
				}
				relativeLoaderPath = relativePath;
			}

			function addLoader(configs) {
				if(configs.length) {
					configs[0].loader = relativeLoaderPath;
				}
				return configs;
			}

			function grokConfig(relativePath) {
				return grokRunJs(io, makePath(relativePath));
			}

			function makePath(suffix) {
				return path.join(path.dirname(filename), suffix);
			}

		});
	}

	return grokHtml;

	function isStartTag(tag) {
		return tag[1] != '/';
	}

	function isPotentialCurlConfig(scriptContent) {
		return scriptContent.indexOf(curlName) > -1;
	}

	function parseAttrs(tag) {
		var attrs = {};

		tag.replace(parseAttrsRx, function(str, name, _, val) {
			attrs[name] = val;
			return '';
		});

		return attrs;
	}

});
})(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
);
