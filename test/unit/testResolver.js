define(function () {
"use strict";
	var Fixture, Resolver, instance, config, parentId;

	parentId = 'package/subPackage/parentModule';
	config = {
		baseUrl: 'myapp/'
	};

	function testToUrl (api) {
		// rel urls
		api.assertEqual('myapp/package/subPackage/relModule', instance.toUrl('./relModule'), 'get url of a relative module id using a relative baseUrl');
		api.assertEqual('myapp/package/testModule', instance.toUrl('package/absModule'), 'get url of an absolute module id using a relative baseUrl');
		api.assertEqual('myapp/pkgB/testModule', instance.toUrl('pkgB/absModule'), 'get url of a foreign module id using a relative baseUrl');
		// abs urls
		var resolver = new Resolver(parentId, {
			baseUrl: 'http://domain.com/app/'
		});
		api.assertEqual('http://domain.com/app/package/subPackage/relModule', resolver.toUrl('./relModule'), 'get url of a relative module id using an absolute baseUrl');
		api.assertEqual('http://domain.com/app/package/testModule', resolver.toUrl('package/absModule'), 'get url of an absolute module id using an absolute baseUrl');
		api.assertEqual('http://domain.com/app/pkgB/testModule', resolver.toUrl('pkgB/absModule'), 'get url of a foreign module id using an absolute baseUrl');
	}

	Fixture = function (Ctor) {
		Resolver = Ctor;
		instance = new Resolver(parentId, config);
	};
	Fixture.prototype = {
		tests: {
			toUrl: testToUrl
		}
	};

	return Fixture;

});
