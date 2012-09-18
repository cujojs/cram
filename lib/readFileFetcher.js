/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file fetcher for environments that support the readFile() method
 *
 * Licensed under the MIT License at:
 * 		http://www.opensource.org/licenses/mit-license.php
 *
 * @version 0.6
 */
var readFile;
define(function () {
"use strict";

	function fetch (resourceUrl) {
		return readFile(resourceUrl);
	}

	return {
		fetch: fetch,
		toString: function toString () {
			return '[object readFileFetcher]';
		}
	};

});
