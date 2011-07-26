var java;
define(function () {
"use strict";

	function write (text, optChannelId) {
		// this isn't very efficient, but works for now
		var file, writer;
		optChannelId = optChannelId || 'default.js';
		file = java.io.File(optChannelId);
		writer = java.io.FileWriter(file, true);
		writer.write(text);
		writer.close();
	}

	function getWriter (optChannelId) {
		// returns a write() function that has memoized its file Id
		return function (text) {
			return write(text, optChannelId);
		}
	}

	return {
		getWriter: getWriter,
		toString: function toString () {
			return '[object javaFileWriter]';
		}
	};


});
