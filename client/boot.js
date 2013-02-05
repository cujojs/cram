/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * boot (application loader)
 *
 * boot is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * 		http://www.opensource.org/licenses/mit-license.php
 *
 */

/*global ActiveXObject global */
/*evil true */
/*browser true */
(function (global, XMLHttpRequest, globalEval) { 'use strict';
	var cfg, cache, nextTurn, undef;

	// set default config and mix-in any global config options
	cfg = extend({
		appJson: 'application.json',
		searchPaths: ['', 'lib/'],
		moduleFinder: 'cram/find/pathlist',
		moduleLoader: 'cram/loader/cjsm'
	}, global.boot || {});
	
	cache = {}; // do we need this?
	
	// get application.json and start boot pipeline
	fetchJson(cfg.appJson)
		.then(resolveRefs, fail)
		.then(extendCfg, fail)
		.then(createContext, fail);

/*
	1. start out with a very minimal loader that can load json and *either* AMD *or* CJSM.
		a. only understands urls, not module ids.
		b. doesn't even understand transitive dependencies perhaps?
	2. look for application.json (it may not exist). if not, use defaults.
		a. paths in application.json are relative to application.json! (same with other json files)
	3. maybe load a module finder (AMD paths/packages resolver, node_modules scanner, ringo, etc.).
	4. maybe load a module converter (returns a factory for AMD, CJSM/node, other).
	5. maybe load a language cross-compiler (coffeescript, typescript, etc).
	6. probably load a main module.
 */

	function createContext (cfg) {
		// TODO: potenitally load a finder and a loader and a main module
	}

	function resolveRefs (json) {
		// TODO: should this return an extended object rather than mutating it?
		var refs, p;
		for (p in json) {
			if ('$ref' == p) {
				refs.push(resolveModule(json[p]));
			}
			else if (typeof json[p] == 'object') {
				refs.push(resolveRefs(json[p]));
			}
		}
		return all(refs).then(function () { return json; });
	}
	
	function fetchJson (url) {
		return when(fetchText(url), globalEval);
	}
	
	function resolveModule (url) {
		if (url in cache) return cache[url];
		// fetch text of module
		// wrap it in a cjs environ wrapper
		// eval it to extract a factory
		// execute factory
		// return exports
	}
	
	function fetchText (url) {
		var x, p;
		x = new XMLHttpRequest();
		p = new Promise();
		x.open('GET', url, true);
		x.onreadystatechange = function () {
			if (x.readyState === 4) {
				if (x.status < 400) {
					p.resolve(x.responseText);
				}
				else {
					p.reject(new Error('fetchText() failed. status: ' + x.statusText));
				}
			}
		};
		x.send(null);
		return p;
	}

	function extendCfg (ext) {
		return cfg = extend(cfg, ext);
	}
	
	function extend (base, ext) {
		var o, p;
		Base.prototype = ext;
		o = new Base();
		Base.prototype = null;
		for (p in ext) o[p] = ext[p];
		return o;
	}
	
	// promise implementation adapted from https://github.com/briancavalier/avow
	function Promise() {
		var vow, promise, pendingHandlers, bindHandlers;

		promise = { then: then };

		// Create a vow, which has a pending promise plus methods
		// for fulfilling and rejecting the promise
		vow = {
			promise: promise,

			fulfill: function(value) {
				applyAllPending(applyFulfill, value);
			},

			reject: function(reason) {
				applyAllPending(applyReject, reason);
			}
		};

		// Queue of pending handlers, added via then()
		pendingHandlers = [];

		// Arranges for handlers to be called on the eventual value or reason
		bindHandlers = function(onFulfilled, onRejected, vow) {
			pendingHandlers.push(function(apply, value) {
				apply(value, onFulfilled, onRejected, vow.fulfill, vow.reject);
			});
		};

		return vow;

		// Arrange for a handler to be called on the eventual value or reason
		function then(onFulfilled, onRejected) {
			var vow = Promise();
			bindHandlers(onFulfilled, onRejected, vow);
			return vow.promise;
		}

		// When the promise is fulfilled or rejected, call all pending handlers
		function applyAllPending(apply, value) {
			// Already fulfilled or rejected, ignore silently
			if(!pendingHandlers) {
				return;
			}

			var bindings = pendingHandlers;
			pendingHandlers = undef;

			// The promise is no longer pending, so we can swap bindHandlers
			// to something more direct
			bindHandlers = function(onFulfilled, onRejected, vow) {
				nextTurn(function() {
					apply(value, onFulfilled, onRejected, vow.fulfill, vow.reject);
				});
			};

			// Call all the pending handlers
			nextTurn(function() {
				bindings.forEach(function(binding) {
					binding(apply, value);
				});
			});
		}
	}

	// Call fulfilled handler and forward to the next promise in the chain
	function applyFulfill(val, onFulfilled, _, fulfillNext, rejectNext) {
		return apply(val, onFulfilled, fulfillNext, fulfillNext, rejectNext);
	}

	// Call rejected handler and forward to the next promise in the chain
	function applyReject(val, _, onRejected, fulfillNext, rejectNext) {
		return apply(val, onRejected, rejectNext, fulfillNext, rejectNext);
	}

	// Call a handler with value, and take the appropriate action
	// on the next promise in the chain
	function apply(val, handler, fallback, fulfillNext, rejectNext) {
		var result;
		try {
			if(typeof handler === 'function') {
				result = handler(val);

				if(result && typeof result.then === 'function') {
					result.then(fulfillNext, rejectNext);
				} else {
					fulfillNext(result);
				}

			} else {
				fallback(val);
			}
		} catch(e) {
			rejectNext(e);
		}
	}
	
	function isPromise (it) {
		return it instanceof Promise;
	}
	
	function when (it, callback, errback) {
		return isPromise(it) ? it.then(callback, errback) : callback(it);
	}
	
	function all (things) {
		var howMany, promise, results, thing;
		
		howMany = 0;
		promise = new Promise();
		results = [];
		
		while (thing = things[howMany]) when(thing, counter(howMany++), promise.reject);
		
		return promise.promise;
		
		function counter (i) {
			return function (value) {
				results[i] = value;
				if (--howMany == 0) promise.resolve(results);
			};
		}
	}
	
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

	function isFunction (it) { return typeof it == 'function'; }
	
	function Base () {}
	
	function fail (ex) { throw ex; }
	
}(
	typeof global == 'object' ? global : this.window || this.global,
	typeof XMLHttpRequest != 'undefined' && XMLHttpRequest,
	function () { /* FB needs direct eval here */ eval(arguments[0]); }
));