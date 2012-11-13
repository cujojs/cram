/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file writer for node.js
 * TODO: refactor using streams
 * TODO: create a cjs writer, too?
 */
define(['./nodeback'], function (nodeback) {
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
		var dir;

		optChannelId = optChannelId || defaultChannel;

		if (!files[optChannelId]) {
			files[optChannelId] = true;
			// ensure path exists
			dir = path.dirname(optChannelId);
			mkdir(dir, function () {
				// overwrite file
				fs.writeFile(optChannelId, text, nodeback(success, fail));
			}, fail);
		}
		else {
			// append to file
			fs.appendFile(optChannelId, text, nodeback(success, fail));
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
		if (callback) callback();
	}

	function mkdir (folder, callback, errback) {
		var folders;
		folders = folder.split(path.sep);
		_mkdir('', folders, callback, errback);
	}

	function _mkdir (name, all, callback, errback) {
		var next = path.join(name, all.shift());
		fs.mkdir(next, nodeback(function () {
			if (all.length == 0) callback(next);
			else _mkdir(next, all, callback, errback);
		}, errback));
	}

});
