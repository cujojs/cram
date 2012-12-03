/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * lightweight has() implementation for cram
 */
var environment; // TODO: move to a java-specific file
(function (define, freeRequire) {
define(function (require) {
	"use strict";

	var features;

	features = {};

	// preload some feature tests
	features.require = typeof freeRequire == 'function';
	features.readFile = typeof readFile == 'function';
	features.loadJson = features.require && freeRequire.extensions && freeRequire.extensions['.json'];
	features.json = typeof JSON != 'undefined';
	features.java = typeof java != 'undefined';
	// features.java = ({}).toString.call(global.java) == '[object JavaPackage]';
	features.fs = hasModule('fs');
	features.path = hasModule('path');

	function has (feature) {
		return features[feature];
	}

	// Note: this is not exactly the same as has.js's add() method
	has.add = function (name, value) {
		features[name] = value;
	};

	return has;

	/* helpers */

	function hasModule (id) {
		// relies on sync require()
		return typeof freeRequire == 'function' && !!freeRequire(id);
	}

});
}(
	typeof define == 'function' && define.amd ? define : function (factory) { module.exports = factory(require); },
	typeof require == 'function' && require
));
