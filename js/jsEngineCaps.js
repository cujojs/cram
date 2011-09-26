var java, readFile, JSON; // stop the syntax checker / linter from complaining
var environment; // TODO: move to a java-specific file
(function (global) {
"use strict";

	define(function () {

		var features = {};

		// preload some feature tests
		features.readFile = typeof readFile == 'function';
		features.json = typeof JSON != 'undefined';
		features.java = typeof java != 'undefined';
		// features.java = ({}).toString.call(global.java) == '[object JavaPackage]';

		function has (feature) {
			return features[feature];
		}

		// Note: this is not exactly the same as has.js's add() method
		has.add = function (name, value) {
			features[name] = value;
		};

		return has;

	});

}(this));
