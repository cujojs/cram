/** MIT License (c) copyright B Cavalier & J Hann */

define(function () {
	// TODO: hoist the map and regex to the enclosing scope for better performance
	var map, encodeRx;

	map = { 34: '\\"', 13: '\\r', 12: '\\f', 10: '\\n', 9: '\\t', 8: '\\b' };
	encodeRx = /["\n\f\t\r\b]/g;

	function jsEncode (text) {
		return text.replace(encodeRx, function (c) {
			return map[c.charCodeAt(0)];
		});
	}

	return jsEncode;

});
