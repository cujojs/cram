(function (global) {
"use strict";

	define(function () {

		var features = {};

		features.readFile = typeof global.readFile == 'function';
		features.json = typeof global.JSON != 'undefined';
		features.java = typeof global.java != 'undefined';
		// ({}).toString.call(global.java) == '[object JavaPackage]';

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
