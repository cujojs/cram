/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file writer for node.js
 * TODO: refactor using streams
 * TODO: create a cjs writer, too?
 */
define(function () {
"use strict";

	var defaultChannel, fs, path,
		files;

	defaultChannel = 'main.js';

	// Note: these are using node's local require
	fs = require('fs');
	path = require('path');

	files = {};

	function write (optChannelId, text) {
		optChannelId = optChannelId || defaultChannel;
		if (!files[optChannelId]) {
			files[optChannelId] = true;
			// ensure path exists
			fs.mkdirSync(path.dirname('./' + optChannelId));
			// overwrite file
			fs.writeFileSync(optChannelId, text);
		}
		else {
			// append to file
			fs.appendFileSync(optChannelId, text);
		}
	}

	function getWriter (optChannelId) {

		// returns a write() function that has memoized its file Id
		function writer (text) {
			return write(optChannelId, text);
		}

		writer.close = function () {
			delete files[optChannelId || defaultChannel];
		};

		return writer;
	}

	function closeAll () {
		files = {};
	}

	return {
		writer: getWriter,
		closeAll: closeAll
	};


});
