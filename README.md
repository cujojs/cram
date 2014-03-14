# cram.js

## cujoJS resource assembler

See the docs/ folder for instructions and useful information.

> **New!** gulp integration via [gulp-cram]()
  by [@bclozel]()!

## Installation

### node.js

```
npm install --save cram
```

To run cram from any folder:

```
npm install --global cram
```

### Bower

TBD

## Release notes

0.8.2

* Fix module parsing code to stop prematurely detecting the end of an
  AMD define when there are regexp literals inside parentheses.
* Only declare global define() during bundling to help isolate problems
  with UMD modules  running under node (as with gulp and grunt).
* Separate argument-parsing code from cramming code so logic to run
  as a module or as a command-line tool can be done more sanely.

0.8.1

* Fix logic to detect whether cram is running as an npm task and ensure
  that the promise returned from the API only resolves once the bundle
  is created.
* Stop appending to the cached AST data.  It should be overwritten.

0.8.0

* Add a minimal JavaScript API.
* Correct regression: `--exclude` CLI option now works again.
* Handle when factory args > dependent module ids when simplifying AMD defines.
  For instance, the curl/loader/cjsm11 cram plugin adds an extra arg now.

0.7.12

* Stop failing when plugins output more than one `define()`.

0.7.11

* Fix compile bug that prevented use of css! plugin.
* Start using when.js 2.x.
* Fix configuration merging errors when inspecting both html and run.js.

0.7.10

* Ensure that baseUrl and output are converted to absolute paths so
  node doesn't try to resolve them using node_modules logic.

0.7.9

* Bug fix: plugins are now responsible for resolving url/filepath.
* Bug fix: Normalize r-value require()s when using loaders, too.
* Bug fix: Infer appRoot from run.js file, not just index.html.
  Improve logged messages a bit, too.
* Bug fix: Excluded modules don't get compiled anymore.
  Force 'curl' and 'curl/_privileged' to be excluded in all cases.

0.7.8

* AMD modules are now published to npm, so manually running bower is
  no longer necessary.
* Failing to supply some AMD configuration properties no longer causes
  cram.js to throw.  (Thanks Blaine!)

0.7.7

* Lots of fixes to the code that groks html files.
* Internal refactoring and reorganization

0.7.6

* Use same logic as curl.js when assigning configuration to modules that
  may be loaded by a plugin or module loader.
* Add a legacy loader example.
* Stop detecting code such as `goog.require('id')` as a CommonJS-style
  `require('id')`.

0.7.5

* Improve support for i18n and CommonJS modules via curl.js 0.8
* Improve module parsing (fixes some issues with lodash).
* Parse literal RegExps better.
* Include simple example apps.
* Find build override json files without absolute paths.
* Fix many other minor things.
