/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file reader for node.js
 * TODO: create a cjs reader, too?
 */
define(function (require) {
"use strict";

	var fs, url, http,
		protocol, hasHttpProtocolRx, needsProtocolRx;

	fs = require('fs');
	url = require('url');
	http = require('http');

	protocol = 'http:';
	hasHttpProtocolRx = /^https?:/;
	needsProtocolRx = /^\/\//;

	// TODO: make this and all the things async
	function read (urlOrPath) {
		if (needsProtocolRx.test(urlOrPath)) {
			// if there's no protocol, use configured protocol (TODO: make it configurable)
			urlOrPath = protocol + urlOrPath;
		}
		if (hasHttpProtocolRx.test(urlOrPath)) {
			return loadFileViaNodeHttp(urlOrPath, success, fail);
		}
		else {
			return loadLocalFile(urlOrPath, success, fail);
		}
	}

	return {
		read: read
	};

	function loadLocalFile (uri, success, fail) {
		return fs.readFileSync(uri);
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
