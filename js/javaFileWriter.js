/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file writer for java environments
 *
 * Licensed under the MIT License at:
 * 		http://www.opensource.org/licenses/mit-license.php
 *
 * @version 0.6
 */
var java;
define(function () {
"use strict";

	var files, writers;

	files = {};
	writers = {};

	function write (text, optChannelId) {
		var file, folder, writer;
		optChannelId = optChannelId || 'default.js';
		file = files[optChannelId];
		if (!file) {
			file = files[optChannelId] = java.io.File(optChannelId);
			// ensure path exists
			folder = file.getParentFile();
			if (folder) { // could be null for some valid(?) reason
				folder.mkdirs();
			}
		}
		writer = writers[optChannelId];
		if (!writer) {
			writer = writers[optChannelId] = java.io.FileWriter(file, false);
		}
		writer.write(text);
	}

	function getWriter (optChannelId) {
		// returns a write() function that has memoized its file Id
		return function (text) {
			return write(text, optChannelId);
		}
	}

	function closeWriter (optChannelId) {
		var writer;
		writer = writers[optChannelId];
		if (writer) {
			writer.close();
		}
	}

	function closeAll () {
		for (var p in writers) closeWriter(p);
	}

	return {
		getWriter: getWriter,
		closeWriter: closeWriter,
		closeAll: closeAll
	};


});
