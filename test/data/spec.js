// red herring define() in here. did it fool us?
/* how about this define() ? */
define([], {

	component: {
		module: 'test/depA'
	},

	plugins: [
		//{ module: 'wire/debug' }
	]
});
// if run from cram folder:
// node cram test/data/wire-run.js -r . -o test/data/wire-bundle.js