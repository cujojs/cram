/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * file reader for node.js and ringojs
 */
(function (define, freeRequire) {
define(function (require) {
"use strict";

	var nodeback, when, fs, url, http,
		protocol, hasHttpProtocolRx, needsProtocolRx;

	nodeback = require('../nodeback');
	when = require('when');

	// TODO: split this into a fsModuleReader and a httpModuleReader

	// Note: these are using node/ringo local require
	fs = freeRequire('fs');
	url = freeRequire('url');
	http = freeRequire('http');

	protocol = 'http:';
	hasHttpProtocolRx = /^https?:/;
	needsProtocolRx = /^\/\//;

	return {
		getReader: function (path) {
			return function (callback, errback) {
				var dfd = when.defer();
				dfd.then(callback, errback);
				read(path, dfd.resolve, dfd.reject);
				return dfd.promise;
			};
		}
	};

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

	function loadLocalFile (uri, success, fail) {
		fs.readFile(uri, nodeback(function (contents) {
			success(contents.toString());
		}, function (ex) {
			fail(ex);
		}));
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
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); },
	typeof require == 'function' && require
));