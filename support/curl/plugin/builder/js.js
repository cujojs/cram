/** MIT License (c) copyright B Cavalier & J Hann */

/**
 * curl js! builder plugin
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
define(['./jsEncode'], function (jsEncode) {
			console.log('HERE');

	return {

		normalize: function (resourceId, toAbsId) {
			// remove options
			return resourceId ? toAbsId(resourceId.split('!')[0]) : resourceId;
		},

		compile: function (absId, req, io /*, config*/) {

			var order, exportsPos, exports;

			order = absId.indexOf('!order') > 0; // can't be zero
			exportsPos = absId.indexOf('!exports=');
			exports = exportsPos > 0 && absId.substr(exportsPos + 9); // must be last option!

			io.read(resourceId(absId), function (text) {
				var moduleText =
					'define("' + absId + '", function () {\n' +
						jsEncode(text) + ';\n' +
						'\treturn ';

				moduleText += exports
					? 'window.' + exports
					: 'new Error()';

				moduleText += ';\n});\n';

				io.write(moduleText);

			}, io.error);
		}

	};

	function resourceId (absId) {
		return absId && absId.split('!')[1] || '';
	}

});
