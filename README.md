# cram.js

## cujoJS resource assembler

See the docs/ folder for instructions and useful information.

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
