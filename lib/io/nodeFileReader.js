/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file reader for node.js
 * TODO: create a cjs reader, too?
 */
define(function () {
"use strict";

	var fs, url, http,
		protocol, hasHttpProtocolRx, needsProtocolRx;

	// Note: these are using node's local require
	fs = require('fs');
	url = require('url');
	http = require('http');

	protocol = 'http:';
	hasHttpProtocolRx = /^https?:/;
	needsProtocolRx = /^\/\//;

	function read (urlOrPath, success, fail) {
		if (needsProtocolRx.test(urlOrPath)) {
			// if there's no protocol, use configured protocol (TODO: make it configurable)
			urlOrPath = protocol + urlOrPath;
		}
		if (hasHttpProtocolRx.test(urlOrPath)) {
			loadFileViaNodeHttp(urlOrPath, success, fail);
		}
		else {
			loadLocalFile(urlOrPath, success, fail);
		}
	}

	return {
		getReader: function (path) {
			return function (callback, errback) {
				read(path, callback, errback);
			};
		}
	};

	function loadLocalFile (uri, success, fail) {
		fs.readFile(uri, function (err, contents) {
			if (err) fail(err);
			else (success(contents));
		});
	}

	function loadFileViaNodeHttp (uri, success, fail) {
		var options, data;
		options = url.parse(uri, false, true);
		data = '';
		http.get(options, function (response) {
			response
				.on('data', function (chunk) { data += chunk; })
				.on('end', function () { success(data); })
				.on('error', fail);
		}).on('error', fail);
	}

});
