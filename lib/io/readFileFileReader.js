/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file reader for environments that support the readFile() method
 */
var readFile;
define(function () {
"use strict";

	function read (resourceUrl) {
		return readFile(resourceUrl);
	}

	return {
		read: read
	};

});
