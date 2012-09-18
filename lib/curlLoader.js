/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * curl loader
 * creates a global instance of curl that works in a typical server-side
 * js environment. i.e. one that has the `load(filePath)` method.
 */
define(function () {

	function loadScript (def, success, fail) {
		try {
			load(def.url);
			success();
		}
		catch (ex) {
			fail(ex);
		}
	}

	return function () {
		var url = config.paths.curl + '.js';
		load(url);
		curl('curl/_privileged', function (priv) {
			priv.core.loadScript = loadScript;
		});
	};

});
