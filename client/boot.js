/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * boot (application loader)
 *
 * boot is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 *		http://www.opensource.org/licenses/mit-license.php
 *
 */

/*global ActiveXObject global */
/*evil true */
/*browser true */
(function (global, XMLHttpRequest, globalEval, cjsmEval) { 'use strict';
	var cfg, cache, globalCtx, nextTurn, undef;

	// set default config and mix-in any global config options
	cfg = extend({
		appJson: 'application.json',
		searchPaths: ['', 'lib/'],
		define: [
			{ $ref: 'cram/cjsm/????????' }, // TODO: requires a transport format
			{ $ref: 'cram/resolveDeps' },
		],
		require: [
			{ $ref: 'cram/locate' },
			{ $ref: 'cram/fetch/text' },
			{ $ref: 'cram/cjsm/raw/parse' },
			{ $ref: 'cram/resolveDeps' },
			{ $ref: 'cram/cjsm/raw/factory' },
			{ $ref: 'cram/exec' }
		]
	}, global.boot || {});
	
	cache = {
		'cram/fetch/text': fetchText,
		'cram/cjsm/raw/factory': createCjsmFactory,
		'cram/cjsm/raw/parse': parseCjsm,
		'cram/resolveDeps': resolveDeps,
		'cram/locate': locate,
		'cram/exec': execFactory
	};
	
	globalCtx = { cfg: cfg, cache: cache };
	
	// get application.json and start boot pipeline
	fetchJson(cfg.appJson)
		.then(function (json) { return resolveRefs(globalCtx, json); })
		.then(function (cfg) { return createPkgContext(cfg, globalCtx.cache); })
		// TODO......
		.then(null, fail);

/*
	1. start out with a very minimal loader that can load json and *either* AMD *or* CJSM.
		a. only understands urls, not module ids.
		b. doesn't even understand transitive dependencies perhaps?
		c. this loader is assembled from smaller, testable bits using cram.js.
	2. look for application.json (it may not exist). if not, use defaults.
		a. paths in application.json are relative to application.json! (same with other json files)
	3. maybe load a module finder (AMD paths/packages resolver, node_modules scanner, ringo, etc.).
		a. also need a module transport adapter (if there are multiple modules in a file)
	4. maybe load a module converter (returns a factory for AMD, CJSM/node, other).
	5. maybe load a language cross-compiler (coffeescript, typescript, etc).
	6. maybe load a whole pipeline instead of the above?
	7. probably load a main module.
	
	pipeline:
	1. perform any id-to-url transforms (AMD internally transforms ids then ids to paths/urls)
	2. check cache for module def, if it's not in cache:
		a. fetch file at url (fetch text or inject script)
		b. unwrap it from transport wrapper (if needed) or prepare it some other way (wrap a naked cjsm)
		c. if dependencies, run pipelines for deps
	3. execute factory to return exported module
 */

	/***** pipeline functions *****/

	function createPkgContext (cfg, cache) {
		// pipelines (require and define) are created just in time
		// TODO: fetch modules in pipelines just in time too?
		return { cfg: extend(cfg), cache: extend(cache) };
	}

	function resolveRefs (pctx, json) {
		// TODO: should this return extend(json) rather than mutating json?
		var promises, p;
		promises = [];
		for (p in json) {
			if ('$ref' == p) {
				promises.push(resolveRefAndReplaceProp(p));
			}
			else if (typeof json[p] == 'object') {
				promises.push(resolveRefs(json[p]));
			}
		}
		return all(promises).then(function () { return json; });
		
		function resolveRefAndReplaceProp (name) {
			return requireModule(pctx, json[p]).then(function (value) {
				json[name] = value;
			});
		}
	}
	
	function fetchJson (url) {
		return when(fetchText(url), globalEval);
	}
	
	function requireModule (pctx, url) {
		if (url in pctx.cache) return pctx.cache[url];
		if (!pctx.require) pctx.require = pipeline(pctx.cfg.require);
		return pctx.cache[url] = pctx.require({ url: url });
	}
	
	function defineModule (pctx, mctx) {
		if (pctx.cache[mctx.url]) throw new Error(mctx.url + ' already defined.');
		if (!pctx.define) pctx.define = pipeline(pctx.cfg.define);
		return pctx.cache[mctx.url] = pipeline(pctx.define)(mctx);
	}
	
	function execFactory (pctx, mctx) {
		return 'exports' in mctx ? mctx.exports : (mctx.exports = mctx.factory());
	}
	
	function resolveDeps (pctx, mctx) {
		var promises, i;
		
		promises = [];
		i = 0;
		
// TODO: implement reduce and replace some of these loopy promises functions
		while (i < mctx.deps.length) promises.push(resolveAndCache(mctx.deps[i++]));
		
		return all(promises);
		
		function resolveAndCache (id) {
			return requireModule(pctx, id).then(function (ctx) {
				pctx.cache[id] = ctx;
				return ctx;
			});
		}
	}
	
	// TODO: place pctx on mctx as "realm" and change signature of these functions everywhere
	function locate (pctx, mctx) {
		var dfd, paths, i;
		dfd = new Deferred();
		paths = pctx.cfg.searchPaths;
		i = 0;
		while (i < paths.length) {
			checkAndSave(paths[i++] + mctx.id);
		}

		return dfd.promise;
		
		function checkAndSave (url) {
			fetchText(url).then(function (source) {
				mctx.source = source;
				mctx.url = url;
				check(source);
			}, notFound);
		}
		
		function check (source, ex) {
			var alreadySource;
			
			alreadySource = 'source' in mctx;

			if (--i == 0) {
				if (alreadySource && source) {
					dfd.reject(new Error(mctx.id + ' was found in multiple locations.'));
				}
				else if (!alreadySource && ex) {
					dfd.reject(new Error(mctx.id + ' was not found in any locations.'));
				}
				else {
					dfd.resolve(mctx);
				}
			}
		}
		
		function notFound (ex) {
			check(null, ex);
		}
		
	}
	
	function fetchText (url) {
		var x, dfd;
		x = new XMLHttpRequest();
		dfd = new Deferred();
		x.open('GET', url, true);
		x.onreadystatechange = function () {
			if (x.readyState === 4) {
				if (x.status < 400) {
					dfd.resolve(x.responseText);
				}
				else {
					dfd.reject(new Error('fetchText() failed. status: ' + x.status + ' - ' + x.statusText));
				}
			}
		};
		x.send(null);
		return dfd.promise;
	}

	/***** CJS/node functions *****/
	
	var removeCommentsRx, findRValueRequiresRx;
	
	removeCommentsRx = /\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g,
	findRValueRequiresRx = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)|[^\\]?(["'])/g,

	function createCjsmFactory (pctx, mctx) {
		// just create a factory
		mctx.factory = function () {
			var exports, module, require, source;

			exports = {};
			module = { id: mctx.id, uri: mctx.url, exports: exports };
			require = function (id) {
				// call execFactory in case dep was bundled with other modules
				return execFactory(pctx, pctx.cache[id]);
			};
			// TODO: fix url earlier in the pipeline?
			source = mctx.source + mctx.url ? '\n/*\n////@ sourceURL=' + mctx.url.replace(/\s/g, '%20') + '\n*/\n' : '';

			cjsmEval(require, exports, module, global, source);

			return exports;
		};

		return mctx;
	}

	function parseCjsm (pctx, mctx) {
		var source, currQuote;

		mctx.deps = [];
		
		// remove comments, then look for require() or quotes
		source = mctx.source.replace(removeCommentsRx, '');
		source.replace(findRValueRequiresRx, function (m, rq, id, qq) {
			// if we encounter a string in the source, don't look for require()
			if (qq) {
				currQuote = currQuote == qq ? undef : currQuote;
			}
			// if we're not inside a quoted string
			else if (!currQuote) {
				mctx.deps.push(id);
			}
			return ''; // uses least RAM/CPU
		});

		return mctx;
	}

	/***** promises / deferreds *****/

	// promise implementation adapted from https://github.com/briancavalier/avow
	function Deferred () {
		var vow, promise, pendingHandlers, bindHandlers;

		promise = { then: then };

		// Create a vow, which has a pending promise plus methods
		// for fulfilling and rejecting the promise
		vow = {
			promise: promise,

			fulfill: function (value) {
				applyAllPending(applyFulfill, value);
			},

			reject: function (reason) {
				applyAllPending(applyReject, reason);
			}
		};

		// Queue of pending handlers, added via then()
		pendingHandlers = [];

		// Arranges for handlers to be called on the eventual value or reason
		bindHandlers = function (onFulfilled, onRejected, vow) {
			pendingHandlers.push(function (apply, value) {
				apply(value, onFulfilled, onRejected, vow.fulfill, vow.reject);
			});
		};

		return vow;

		// Arrange for a handler to be called on the eventual value or reason
		function then (onFulfilled, onRejected) {
			var vow = Deferred();
			bindHandlers(onFulfilled, onRejected, vow);
			return vow.promise;
		}

		// When the promise is fulfilled or rejected, call all pending handlers
		function applyAllPending (apply, value) {
			// Already fulfilled or rejected, ignore silently
			if (!pendingHandlers) {
				return;
			}

			var bindings = pendingHandlers;
			pendingHandlers = undef;

			// The promise is no longer pending, so we can swap bindHandlers
			// to something more direct
			bindHandlers = function (onFulfilled, onRejected, vow) {
				nextTurn(function () {
					apply(value, onFulfilled, onRejected, vow.fulfill, vow.reject);
				});
			};

			// Call all the pending handlers
			nextTurn(function () {
				bindings.forEach(function (binding) {
					binding(apply, value);
				});
			});
		}
	}

	// Call fulfilled handler and forward to the next promise in the chain
	function applyFulfill (val, onFulfilled, _, fulfillNext, rejectNext) {
		return apply(val, onFulfilled, fulfillNext, fulfillNext, rejectNext);
	}

	// Call rejected handler and forward to the next promise in the chain
	function applyReject (val, _, onRejected, fulfillNext, rejectNext) {
		return apply(val, onRejected, rejectNext, fulfillNext, rejectNext);
	}

	// Call a handler with value, and take the appropriate action
	// on the next promise in the chain
	function apply (val, handler, fallback, fulfillNext, rejectNext) {
		var result;
		try {
			if (typeof handler === 'function') {
				result = handler(val);

				if (result && typeof result.then === 'function') {
					result.then(fulfillNext, rejectNext);
				} else {
					fulfillNext(result);
				}

			} else {
				fallback(val);
			}
		} catch (e) {
			rejectNext(e);
		}
	}
	
	function isPromise (it) {
		return it && typeof it.then == 'function';
	}
	
	function when (it, callback, errback) {
		return isPromise(it) ? it.then(callback, errback) : callback(it);
	}
	
	function all (things) {
		var howMany, dfd, results, thing;
		
		howMany = 0;
		dfd = new Deferred();
		results = [];
		
		while (thing = things[howMany]) when(thing, counter(howMany++), dfd.reject);
		
		return dfd.promise;
		
		function counter (i) {
			return function (value) {
				results[i] = value;
				if (--howMany == 0) dfd.resolve(results);
			};
		}
	}
	
	function pipeline (tasks) {
		var promise, i, task;
		promise = when(tasks[0]);
		i = 0;
		while (task = tasks[++i]) promise = promise.then(task);
		return promise;
	}
	
	/***** shims *****/

	// shim XHR, if necessary (IE6). TODO: node/ringo solution?
	if (!XMLHttpRequest) (function (progIds) {

		// create xhr impl that will fail if called.
		XMLHttpRequest = function () { throw new Error('XMLHttpRequest not available'); };

		// keep trying progIds until we find the correct one,
		while (progIds.length) tryProgId(progIds.shift());

		function tryProgId (progId) {
			try {
				new ActiveXObject(progId);
				XMLHttpRequest = function () { return new ActiveXObject(progId); };
				return true;
			}
			catch (ex) {}
		}

	}(['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0']));

	// Use process.nextTick or setImmediate if available, fallback to setTimeout
	nextTurn = isFunction(global.setImmediate)
		? global.setImmediate.bind(global)
		: typeof process === 'object'
			? process.nextTurn
			: function (task) { setTimeout(task, 0); };

	/***** utility functions *****/

	function extend (base, ext) {
		var o, p;
		Base.prototype = ext || null;
		o = new Base();
		Base.prototype = null;
		for (p in ext) o[p] = ext[p];
		return o;
	}
	
	function isFunction (it) { return typeof it == 'function'; }
	
	function Base () {}
	
	function fail (ex) { throw ex; }
	
}(
	typeof global == 'object' ? global : this.window || this.global,
	typeof XMLHttpRequest != 'undefined' && XMLHttpRequest,
	function () { eval(arguments[0]); },
	function (require, exports, module, global) { eval(arguments[4]); }
));