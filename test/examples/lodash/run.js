curl.config({
	packages: {
		curl: { location: '../../../amd_modules/curl/src/curl' },
		underscore: { location: 'amd_modules/lodash', main: 'lodash' }
	}
});

curl(['underscore']).then(function () { console.log('loaded'); });
