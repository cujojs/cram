(function () {

	var config = {
		baseUrl: '',
		destUrl: 'test/output/built.js',
		paths: {
			curl: './support/curl/src/curl',
			"test-js": 'test'
		},
		pluginPath: 'curl/plugin'
	};

	curl(config, ['test-js/tiny']).then(
		function () {
			setPageState('loaded');
			// this should never get called:
			curl(['some/other/module']);
		},
		function () {
			setPageState('failed');
		}
	);

	// do something DOM-ish (this code should never execute during build!)
	function setPageState (stateClass) {
		var root = document.documentElement;
		root.className = root.className.replace(/loading/, '')
			+ ' ' + stateClass;
	}

}());
