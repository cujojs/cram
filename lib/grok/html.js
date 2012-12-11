define([], function () {

	var findScriptElementsRx, parseAttrsRx, curlName;

	findScriptElementsRx = /(<\s*script[^>]*>)|(<\/\s*script\s*>)/g;

	parseAttrsRx = /\s([a-zA-Z\-]+)\s*=\s*(?:['"]([^"']+)['"]|([^\s]+))/g;

	curlName = 'curl';

	function grokHtml () {
		var config, includes, warnings, error;

		// find all script elements

		// find ones that have curl attributes and/or async attributes

		// TODO: should we warn when devs aren't using async attr correctly?

		// find ones that have bootstrap/config operations (curl invocations)

		return {
			config: config,
			includes: includes,
			warnings: warnings,
			error: error
		};
	}

	return grokHtml;

});
