/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file writer for java environments
 */
var java;
define(function () {
"use strict";

	var defaultChannel, files, writers;

	defaultChannel = 'main.js';

	files = {};
	writers = {};

	function write (text, optChannelId) {
		var file, folder, writer;
		optChannelId = optChannelId || defaultChannel;
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
		function writer (text) {
			return write(text, optChannelId);
		}

		writer.close = function () {
			closeWriter(optChannelId);
		};

		return writer;
	}

	function closeWriter (optChannelId) {
		var writer;
		writer = writers[optChannelId || defaultChannel];
		if (writer) {
			writer.close();
		}
	}

	function closeAll () {
		for (var p in writers) closeWriter(p);
	}

	return {
		writer: getWriter,
		closeAll: closeAll
	};


});
