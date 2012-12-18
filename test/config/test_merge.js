(function (define) {
define(function (require) {
var buster, assert, refute, fail, merge;

buster = require('buster');
assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

merge = require('../../lib/config/merge');

buster.testCase('cram/lib/config/merge', {

	'should return a function with helper functions': function () {
		assert.isFunction(merge);
		assert.isFunction(merge.mergeObjects);
		assert.isFunction(merge.mergeArrays);
		assert.isFunction(merge.isType);
	},

	'mergeConfigs': {
		'should accept array-like configFiles': function() {
			var configFiles = {
				length: 2,
				0: { a: 0 },
				1: { b: 1 }
			};

			assert.equals(merge({}, configFiles), { a: 0, b: 1 });
		}
	},

	'mergeObjects': {
		'should create an object': function () {
			assert.isObject(merge.mergeObjects({}, {}));
		},
		'should add new properties in second object to those in first object': function () {
			var obj1, obj2;
			obj1 = { id: 1 };
			obj2 = { foo: 2 };
			assert.equals(merge.mergeObjects(obj1, obj2), { id: 1, foo: 2 });
		},
		'should prefer properties from second object over those in first object': function () {
			var obj1, obj2;
			obj1 = { id: 1 };
			obj2 = { id: 2 };
			assert.equals(merge.mergeObjects(obj1, obj2), { id: 2 });
		},
		'should merge nested objects': function () {
			var obj1, obj2;
			obj1 = { foo: { bar: 42 } };
			obj2 = { foo: { baz: 27 } };
			assert.equals(merge.mergeObjects(obj1, obj2), { foo: { bar: 42, baz: 27 } });
		},
		'should merge nested arrays': function () {
			var obj1, obj2;
			obj1 = { foo: [ 1, 2, 3 ] };
			obj2 = { foo: [ 4, 5 ] };
			assert.equals(merge.mergeObjects(obj1, obj2), { foo: [ 1, 2, 3, 4, 5 ] });
		},
	},
	'isType': {
		'should match first argument\'s constructor name to second argument': function () {
			assert(merge.isType('', 'String'));
			assert(merge.isType(-5, 'Number'));
			assert(merge.isType(false, 'Boolean'));
			assert(merge.isType(new String(''), 'String'));
			assert(merge.isType(new Number(-5), 'Number'));
			assert(merge.isType(new Boolean(false), 'Boolean'));
			assert(merge.isType(new Date(), 'Date'));
			assert(merge.isType([], 'Array'));
			assert(merge.isType({}, 'Object'));
			assert(merge.isType(null, 'Null'));
			assert(merge.isType(void 0, 'Undefined'));
		}
	},
	'mergeArrays': {
		'should create an array from two arrays': function () {
			assert.isArray(merge.mergeArrays([], []));
		},
		'should add new values in second array to those in first array': function () {
			var obj1, obj2, obj3, arr1, arr2, merged;
			obj1 = { id: 1 };
			obj2 = { id: 2 };
			obj3 = { id: 3 };
			arr1 = [obj1, obj2];
			arr2 = [obj3];
			merged = merge.mergeArrays(arr1, arr2);
			assert.equals(merged, [obj1, obj2, obj3]);
		},
		'should not duplicate values that are in both arrays': function () {
			var obj1, obj2, obj3, arr1, arr2, merged;
			obj1 = { id: 1 };
			obj2 = { id: 2 };
			obj3 = { id: 3 };
			arr1 = [obj1, obj2];
			arr2 = [obj1, obj3];
			merged = merge.mergeArrays(arr1, arr2);
			assert.equals(merged, [obj1, obj2, obj3]);
		},
		'should work with array items that are primitives': function () {
			var arr1, arr2, merged;
			arr1 = [1, 2];
			arr2 = [2, 3];
			merged = merge.mergeArrays(arr1, arr2);
			assert.equals(merged, [1, 2,3]);
		},
		'// some tests for user-defined identity functions': function () {

		}
	}

});

});
})(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
);
