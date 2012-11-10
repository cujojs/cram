/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file reader for environments that support the readFile() method
 */
var readFile;
define(function () {
"use strict";

	function read (resourceUrl, success, fail) {
		success(readFile(resourceUrl));
	}

	return {
		getReader: function (path) {
			return function (callback, errback) {
				read(path, callback, errback);
			};
		}
	};

});
