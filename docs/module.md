# Running cram.js as a node module

## Syntax

```js
var cram = require('cram');
```

cram.js can be run as a node module and returns a very simple API:

```js
var promise = cram(options);
```

## Options

The `cram` function-module takes an object argument that has similar properties
as the [options](options.md) `cram` allows on the command line:

* `grok`: a string indicating an HTML or JavaScript file to auto-configure.
	It uses the same code inference algorithm as the command line
	[HTML auto-configuration](options.md#html-auto-configuration)
	feature.
* `appRoot`: a string representing the path of the root of the application
	files.  This would typically point at the same directory as `baseUrl` in
	your AMD config.  This option is unnecessary if you specify a `grok`
	parameter that references an HTML file.
* `configFiles`: an array of JSON-formatted files containing AMD configurations.
	These configuration options will override any found by the `grok` option.
* `output`: a string indicating where to write the output bundle file.
* `includes`: an array of the ids of modules to include in the bundle.
* `excludes`: an array of the ids of modules to exclude from the bundle.
* `loader`: a string indicating the location of an AMD loader script.  This
	script will be inserted at the very beginning of the output bundle.

## Example

A simple example:

```js
var cram = require('cram');
var promise = cram({

	// Auto-configure from our app's index.html file.
	grok: './client/index.html',

	// Apply our production options.
	configFiles: [ 'cramOverrides.json', 'productionOverrides.json' ],

	// Add the flurry analytics module.
	includes: [ 'analytics/flurry' ],

	// Exclude the settings module since it will be dynamically loaded.
	excludes: [ 'app/settings' ],

	// Put our bundle here. It will be passed to Uglify next!
	output: './client/bundle.js'
});

promise.then(happyMessage, sadMessage);

function happyMessage () { console.log('Yay!'); }
function sadMessage (ex) { console.error(ex.stack); throw ex; }
```

> **Note:** cram.js does not return a Promises/A+ or ES6 promise.  Be sure to
assimilate the returned promise as follows before chaining it or passing it
to other modules.

```js
// using when.js:
var when = require('when');
var promise = when(cram(options));

// or using ES6 promise or a shim (e.g. when.js 3.0)
var promise = Promise.cast(cram(options));
```
