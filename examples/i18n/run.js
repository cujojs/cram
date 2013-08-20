curl.config({
	packages: {
		app: { location: 'app', config: { moduleLoader: 'curl/loader/cjsm11' } }
	},
	main: 'app/main',
	locale: false
});
