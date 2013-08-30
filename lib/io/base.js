(function (define) {
define(function (require) {

	var ioText = require('./text');

	function ioBase () {

		return {
			read: read,
			write: write,
			append: function () { return this.write.apply(this, arguments); }
		};

		function read (filename) {
			return ioText.getReader(filename)();
		}

		function write (filename, contents) {
			return ioText.getWriter(filename)(contents);
		}

	}

	return ioBase;

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));
