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

	return {
		getWriter: getWriter,
		closeAll: closeAll
	};

	function write (optChannelId, text, success, fail) {

		optChannelId = optChannelId || defaultChannel;

		if (!files[optChannelId]) {
			files[optChannelId] = true;
			// ensure path exists
			fs.mkdir(path.dirname('./' + optChannelId), function (err) {
				if (err) fail(err);
				// overwrite file
				fs.writeFile(optChannelId, text, callback);
			});
		}
		else {
			// append to file
			fs.appendFile(optChannelId, text, callback);
		}

		function callback (err) {
			err ? fail(err) : success();
		}
	}

	function getWriter (optChannelId) {

		// returns a write() function that has memoized its file Id
		function writer (text, callback, errback) {
			return write(optChannelId, text, callback, errback);
		}

		writer.close = function (callback, errback) {
			delete files[optChannelId || defaultChannel];
			callback();
		};

		return writer;
	}

	function closeAll (callback, errback) {
		files = {};
		callback();
	}

});
