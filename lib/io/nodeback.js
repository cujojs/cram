define(function () {

	function nodeback (success, fail) {
		return function (e) {
			if (e) fail(e);
			else success.apply(this, Array.prototype.slice.call(arguments, 1));
		}
	}

	return nodeback;

});
