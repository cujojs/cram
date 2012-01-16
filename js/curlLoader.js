/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * curl loader
 * creates a global instance of curl that works in a typical server-side
 * js environment. i.e. one that has the `load(filePath)` method.
 *
 * Licensed under the MIT License at:
 * 		http://www.opensource.org/licenses/mit-license.php
 *
 * @version 0.6
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

	return function (config) {
		var url = config.paths.curl + '.js';
		load(url);
		curl(config);
		// TODO: implement when so we don't have to assume sync here
		curl('curl/_privileged', function (priv) {
			priv.core.loadScript = loadScript;
		});
	};

});
