define(function () {
"use strict";

	// output collectors
	var outputs = {};

	function write (text, optChannelId) {
		var output;
		optChannelId = optChannelId || 'default';
		output = outputs[optChannelId];
		if (output) {
			output.push(text);
		}
		else {
			output = outputs[optChannelId] = [text];
		}
	}

	function getWriter (optChannelId) {
		// returns a write() function that has memoized its file Id
		return function (text) {
			return write(text, optChannelId);
		}
	}

	function getOutput (optChannelId) {
		var output;
		optChannelId = optChannelId || 'default';
		output = outputs[optChannelId] || [];
		// since we're going to concatenate the text, why not
		// consolidate, too? (next fetch (if any) will be faster)
		if (output.length > 1) {
			output = outputs[optChannelId] = [output.join('\n')];
		}
		return output[0];
	}

	function clearOutput (optChannelId) {
		optChannelId = optChannelId || 'default';
		delete outputs[optChannelId];
	}

	return {
		getWriter: getWriter,
		getOutput: getOutput,
		clearOutput: clearOutput
	};

});
