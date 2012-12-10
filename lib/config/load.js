(function (define) {
define(function (require) {

	function mergeConfigs (baseCfg, configFiles, loader) {
		var base, i, len, cfg;
		base = baseCfg || {};
		for (i = 0, len = configFiles.length; i < len; i++) {
			cfg = loader(configFiles[i]);
			base = mergeObjects(base, cfg);
		}
		return base;
	}

	// export testable things
	mergeConfigs.mergeObjects = mergeObjects;
	mergeConfigs.mergeArrays = mergeArrays;
	mergeConfigs.isType = isType;

	return mergeConfigs;

	function mergeObjects (base, ext) {
		var p;
		for (p in ext) {
			if (isType(base[p], 'Array')) {
				base[p] = mergeArrays(base[p], ext[p]);
			}
			if (isType(base[p], 'Object')) {
				base[p] = mergeObjects(base[p], ext[p]);
			}
			else {
				base[p] = ext[p];
			}
		}
		return base;
	}

	function mergeArrays (base, ext, identity) {
		var merged, prev;

		if (!identity) identity = defaultIdentity;
		merged = (base || []).concat(ext || []).sort(sort);

		return merged.reduce(function (result, item) {
			if (identity(item) != identity(prev)) result.push(item);
			prev = item;
			return result;
		}, []);

		function defaultIdentity (it) {
			if (isType(a, 'Object')) {
				return it.id || it.name;
			}
			else {
				return it;
			}
		}

		function sort (a, b) {
			var ida, idb;
			ida = identity(a);
			idb = identity(b);
			return ida == idb ? 0 ? ida < idb : -1 : 1;
		}

	}

	function isType (obj, type) {
		return toString.call(obj).slice(8, -1) == type;
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));