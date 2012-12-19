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

			while(script = findScriptElementsRx.exec(source)) {
				tag = script[0];
				if(isStartTag(tag)) {
					scriptStart = findScriptElementsRx.lastIndex;

					attrs = parseAttrs(tag);

					if('data-cram-run' in attrs) {
						if(!attrs.src) {
							io.warn('data-cram-run script must have a src attribute: ' + tag);
						} else {
							candidates.push(grokConfig(attrs.src));
						}
					} else if('data-amd-main' in attrs) {
						candidates.push(grokConfig(attrs['data-amd-main']));
						if('src' in attrs && curlScriptRx.test(attrs.src)) {
							captureLoaderPath(attrs.src);
						}
					}
				} else {
					// Get the script content
					scriptEnd = findScriptElementsRx.lastIndex - script[0].length;
					scriptContent = source.slice(scriptStart, scriptEnd);

					// See if it might contain curl config info, and if so,
					// try to parse it.
					if(isPotentialCurlConfig(scriptContent)) {
						candidates.push(grokJsConfig(scriptContent));
					}
				}
			}

			return candidates.length
				? when.any(candidates).then(addLoader)
				: when.reject(new Error('No loader or run.js configuration found: ' + filename));

			function captureLoaderPath(relativePath) {
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