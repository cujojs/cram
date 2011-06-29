/*
	cram dependency parser
 	finds module/resource dependencies in a file.
*/

(function (global) {
"use strict";

	// parser singleton
	var parser;

	// regexes
	var removeCommentsRx, findDefineRx, cleanDepsRx;

	// TODO: this was an easy regexp to create, but find a more performant one?
	removeCommentsRx = /\/\*.*?\*\/|\/\/.*?\n/g;

	// regex to find dependency lists courtesy of Brian Cavalier @briancavalier
	findDefineRx = /define\s*\((\s*[^,]*,)?\s*\[([^\]]+)\]\s*,/mg;

	// removes commas and quotes
	cleanDepsRx = /["']+\s*([^,"']+)/g;

	function parse (source) {
		// dependencies found
		var deps = [];

		// remove those pesky comments
		source = source.replace(removeCommentsRx, '');

		// find any/all define()s
		scan(source, findDefineRx, function (match, id, depsList) {

			if (depsList) {
				// extract the ids
				scan(depsList, cleanDepsRx, function (match, depId) {
					deps.push(depId);
				});
			}
		});

		return deps;

	}

	function scan (str, rx, lambda) {
		str.replace(rx, lambda);
	}

	global.parser = parser = {
		parse: parse,
		scan: scan
	};

}(this));

/*

define("a", ["b", "c"], function (b, c) { return b + c; });
define("a", function () { return 1; });
define("a", { foo: 1; });
define("a", 1);
define("a", "foo");
define(["b", "c"], function (b, c) { return b + c; });
define(function () { return 1; });
define({ foo: 1; });
define(1);
define("foo");

define("a", ["b", "c"], myFunc);
define("a", myDepsArray, myFunc); // <- cram won't find these dependencies
define("a", myFunc);
define("a", myObj);
define("a", myValue);
define("a", myString);

*/
