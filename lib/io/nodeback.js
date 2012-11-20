define(function () {

	var slice = Array.prototype.slice;

	function nodeback (success, fail) {
		return function (e) {
			if (e) {
				fail(e);
			}
			else {
				success.apply(this, slice.call(arguments, 1));
			}
		}
	}

	return nodeback;

});
