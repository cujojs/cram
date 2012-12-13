(function(define) {
define(function (require) {

	var when, text, path, grokJsConfig, grokRunJs, findScriptElementsRx, parseAttrsRx, curlName, curlAttrs;

	when = require('when');
	text = require('../io/text');
	grokJsConfig = require('./jsConfig');
	grokRunJs = require('./runjs');
	path = require('../path');

	findScriptElementsRx = /(<\s*script[^>]*>)|(<\/\s*script\s*>)/g;
	parseAttrsRx = /\b([a-zA-Z\-]+)(\s*=\s*(?:['"]([^"']+)['"]|([^\s]+)))?/g;
	curlName = 'curl';

	function grokHtml (io, filename) {

		return io.readFile(filename).then(function(source) {

			var candidates, script, attrs, tag, scriptStart, scriptEnd, scriptContent;

			candidates = [];

			findScriptElementsRx.lastIndex = 0;
			parseAttrsRx.lastIndex = 0;

			while(script = findScriptElementsRx.exec(source)) {
				tag = script[0];
				if(tag[1] != '/') {
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
				? when.any(candidates)
				: when.reject(new Error('No loader configuration found: ' + filename));

			function grokConfig(relativePath) {
				return grokRunJs(io, makePath(relativePath));
			}

			function makePath(suffix) {
				return path.join(path.dirname(filename), suffix);
			}

		});
	}

	return grokHtml;

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
