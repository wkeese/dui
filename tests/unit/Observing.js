define([
	"intern!object",
	"intern/chai!assert",
	"delite/Observing",
	"dcl/dcl"
], function (registerSuite, assert, Observing, dcl) {
	registerSuite({
		name: "Observing",
		"Basic": function () {
			var dfd = this.async(1000),
				observing = new (dcl([Observing], {
					foo: undefined,
					bar: undefined,
					refreshRendering: dfd.callback(function (newValues, oldValues) {
						assert.deepEqual(newValues, {foo: "Foo1", bar: "Bar1"});
						assert.deepEqual(oldValues, {foo: "Foo0", bar: "Bar0"});
					})
				}))({
					foo: "Foo0",
					bar: "Bar0"
				});
			// Changes after 1st addRenderingProperties() call should be delivered
			observing.addRenderingProperties("foo");
			observing.bar = "Bar1";
			observing.addRenderingProperties("bar");
			observing.foo = "Foo1";
		},
		"Computed property": function () {
			var computePropertiesCallCount = 0,
				dfd = this.async(1000),
				observing = new (dcl([Observing], {
					foo: undefined,
					computeProperties: dfd.rejectOnError(function (newValues) {
						if (++computePropertiesCallCount > 1) {
							throw new Error("computeProperties() should be called only once.");
						}
						if (newValues.foo < 0) {
							this.foo = 0;
							this.discardComputing();
						}
					}),
					refreshRendering: dfd.callback(function (newValues, oldValues) {
						assert.deepEqual(newValues, {foo: 0});
						assert.deepEqual(oldValues, {foo: 1});
					})
				}))({
					foo: 1
				});
			observing.addRenderingProperties("foo");
			observing.addComputingProperties("foo");
			observing.foo = -1;
		},
		"Synchronous change delivery": function () {
			var finishedMicrotask = false,
				dfd = this.async(1000),
				observing = new (dcl([Observing], {
					foo: undefined,
					bar: undefined,
					computeProperties: dfd.rejectOnError(function () {
						observing.bar = "Bar1";
						this.deliverRendering();
					}),
					refreshRendering: dfd.callback(function (newValues, oldValues) {
						assert.isFalse(finishedMicrotask);
						assert.deepEqual(newValues, {foo: "Foo1", bar: "Bar1"});
						assert.deepEqual(oldValues, {foo: "Foo0", bar: "Bar0"});
					})
				}))({
					foo: "Foo0",
					bar: "Bar0"
				});
			observing.addRenderingProperties("foo", "bar");
			observing.addComputingProperties("foo");
			observing.foo = "Foo1";
			observing.deliverComputing();
			finishedMicrotask = true;
		},
		"Discard changes for refreshRendering()": function () {
			var dfd = this.async(1000),
				observing = new (dcl([Observing], {
					foo: undefined,
					refreshRendering: dfd.rejectOnError(function () {
						throw new Error("refreshRendering() shouldn't be called.");
					})
				}))({
					foo: "Foo0"
				});
			observing.addRenderingProperties("foo");
			observing.foo = "Foo1";
			observing.discardRendering();
			setTimeout(dfd.resolve.bind(dfd), 100);
		}
	});
});
