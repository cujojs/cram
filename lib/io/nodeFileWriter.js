/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file writer for node.js
 * TODO: refactor using streams
 * TODO: create a cjs writer, too?
 */
define(['./nodeback', 'when'], function (nodeback, when) {
'use strict';

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

		// mkdir if necessary
		if (!files[optChannelId]) {
			files[optChannelId] = mkdir(path.dirname(optChannelId));
		}

		// create/append to file
		when(files[optChannelId], function (file) {
			if (file !== true) {
				files[optChannelId] = true;
				fs.writeFile(optChannelId, text, nodeback(success, fail));
			}
			else {
				fs.appendFile(optChannelId, text, nodeback(success, fail));
			}
		});
	}

	function getWriter (optChannelId) {

		// returns a write() function that has memoized its file Id
		function writer (text, callback, errback) {
			return write(optChannelId, text, callback, errback);
		}

		writer.close = function (callback /*, errback */) {
			delete files[optChannelId || defaultChannel];
			callback();
		};

		return writer;
	}

	function closeAll (callback /*, errback */) {
		files = {};
		if (callback) callback();
	}

	/**
	 * Promise-based "mkdir -p"
	 * @param  {String} folder full path to ensure exists
	 * @return {Promise} promise that fulfills once the full path exists, with
	 *  the full path as the value.
	 */
	function mkdir (folder) {
		var folders;
		folders = folder.split(path.sep);
		return when.reduce(folders, function(pathSoFar, folder) {
			var d = when.defer();

			pathSoFar = path.join(pathSoFar, folder);

			fs.mkdir(pathSoFar, function(err) {
				if (err && err.code != 'EEXIST') {
					d.reject();
				} else {
					d.resolve(pathSoFar);
				}
			});

			return d.promise;
		}, '');
	}

});
