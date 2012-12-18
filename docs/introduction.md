# Introduction

cram.js is [cujo.js](http://cujojs.com)'s [AMD](concepts.md#amd) module bundler.

cram.js concatenates the modules of your application into larger bundles that may be loaded much more efficiently than when loaded as separate modules.  cram.js can create AMD-compatible bundles that may be loaded by an AMD loader, such as [curl.js](https://github.com/cujojs/curl) or bundles with an integrated loader.

As you'd expect, cram.js works with [AMD modules](https://github.com/amdjs/amdjs-api/wiki/AMD) as well as raw [CommonJS Modules](http://wiki.commonjs.org/wiki/Modules/1.1).  It can also bundle *non-module* resources like HTML templates, CSS stylesheets, i18n bundles -- and even more powerful things such as [wire.js](https://github.com/cujojs/wire) specs.

cram.js does this in an intuitive way that doesn't require a degree in sorcery or sacrificial chickens.  Simple tasks are simple.  Complex tasks are possible.

## Features

cram.js offers:

* Out-of-the-box, no-configuration operation for simple applications
* Transparency and helpful feedback
* High performance operation
* Choice of execution environment: runs in Node.js, RingoJS, and browsers*

Web apps built with cram.js enjoy:

* All-in-one bundling of Javascript, CSS, and HTML
* Efficient, non-blocking loading of bundles
* Just-in-time loading of bundles*

\* Feature available soon.

## Examples

Tell cram.js to inspect the main page of an app that uses a static index.html file:

`node cram mywebapp/index.html build-options.json`

Instruct cram.js to inspect the run.js file (the AMD configuration file) of a web app that uses dynamic page rendering:

`ringo cram mywebapp/ mywebapp/run.js build-options.json`

Explicitly direct cram.js to create a bundle using options from a JSON file:

`ringo cram --config build-options.json --include mywebapp/curl/src/curl.js -- output mywebapp/app.js`

