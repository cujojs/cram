(function () {

	var config = {
		baseUrl: '',
		paths: {
			curl: 'support/curl/src/curl',
			"test-js": 'test/data'
		},
		packages: {
			// note: i realize this only works if wire repo is a peer to cram.
			wire: { location: '../wire', main: './wire' }
		},
		pluginPath: 'curl/plugin',
		main: 'wire!test-js/spec'
	};

	curl(config);

}());
