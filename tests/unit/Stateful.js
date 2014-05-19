define([
	"intern!object",
	"intern/chai!assert",
	"delite/Stateful",
	"dcl/dcl"
], function (registerSuite, assert, Stateful, dcl) {
	registerSuite({
		name: "Stateful",
		"getSetWatch": function () {
			var Clz = dcl(Stateful, {
					foo: 3
				}),
				s = new Clz();
			assert.strictEqual(s.foo, 3);
			var watching = s.watch("foo", function (name, oldValue, value) {
				assert.strictEqual(name, "foo");
				assert.strictEqual(oldValue, 3);
				assert.strictEqual(value, 4);
				assert.strictEqual(s.foo, 4);
			});
			s.foo = 4;
			assert.strictEqual(s.foo, 4);
			watching.remove();
			s.foo = 5;
			assert.strictEqual(s.foo, 5);
		},
		"removeWatchHandle": function () {
			var Clz = dcl(Stateful, {
					foo: 3
				}),
				s = new Clz(),
				watched = false;

			var watching = s.watch("foo", function () {
				assert.isFalse(watched);
				watched = true;
			});
			s.foo = 4;
			watching.remove();
			s.foo = 5;
		},
		"removeWatchHandleTwice": function () {
			var Clz = dcl(Stateful, {
					foo: 3
				}),
				s = new Clz(),
				assertions = 0;

			var watching = s.watch("foo", function () {
				assertions++;
			});
			s.watch("foo", function () {
				assertions++;
			});
			s.foo = 4;
			watching.remove();
			watching.remove();
			s.foo = 5;

			assert.strictEqual(assertions, 3, "assertions");

		},
		"setHash": function () {
			var Clz = dcl(Stateful, {
					foo: 0,
					bar: 0
				}),
				s = new Clz(),
				fooCount = 0;
			s.watch("foo", function () {
				fooCount++;
			});
			s.mix({
				foo: 3,
				bar: 5
			});
			assert.strictEqual(s.foo, 3);
			assert.strictEqual(s.bar, 5);
			assert.strictEqual(fooCount, 1);

			var Clz2 = dcl(Stateful, {
					foo: 0,
					bar: 0
				}),
				s2 = new Clz2();
			s2.mix(s);
			assert.strictEqual(s2.foo, 3);
			assert.strictEqual(s2.bar, 5);
			// s watchers should not be copied to s2
			assert.strictEqual(fooCount, 1);
		},
		"wildcard": function () {
			var Clz = dcl(Stateful, {
					foo: 0,
					bar: 0
				}),
				s = new Clz();
			s.mix({
				foo: 3,
				bar: 5
			});
			var wildcard = 0;
			var foo = 0;
			s.watch(function () {
				wildcard++;
			});
			s.watch("foo", function () {
				foo++;
			});
			s.foo = 4;
			s.bar = 6;
			assert.strictEqual(wildcard, 2);
			assert.strictEqual(foo, 1);
		},
		"accessors": function () {
			var StatefulClass1 = dcl(Stateful, {
				foo: 0,
				bar: 0,
				baz: "",

				_getFooAttr: function () {
					return this._fooAttr - 1;
				},

				_setBarAttr: function (value) {
					this._set("bar", value + 1);
				}
			});

			var attr1 = new StatefulClass1();
			attr1.foo = 4;
			attr1.bar = 2;
			attr1.baz = "bar";

			assert.strictEqual(attr1.foo, 3, "attr1.foo getter works");
			assert.strictEqual(attr1.bar, 3, "attr1.bar setter works");
			assert.strictEqual(attr1.baz, "bar", "attribute set properly");
		},
		"paramHandling": function () {
			var StatefulClass2 = dcl(Stateful, {
				foo: null,
				bar: 5,

				_setFooAttr: function (value) {
					this._set("foo", value);
				},
				_setBarAttr: function (value) {
					this._set("bar", value);
				}
			});

			var attr2 = new StatefulClass2({
				foo: function () {
					return "baz";
				},
				bar: 4
			});

			assert.strictEqual(typeof attr2.foo, "function", "function attribute set");
			assert.strictEqual(attr2.foo(), "baz", "function has proper return value");
			assert.strictEqual(attr2.bar, 4, "attribute has proper value");

			// Check if user overrides widget to not process constructor params
			var IgnoreParamsStateful = dcl(Stateful, {
				foo: 3,
				processConstructorParameters: function () {
				}
			});
			var ignore = new IgnoreParamsStateful({
				foo: 4
			});
			assert.strictEqual(ignore.foo, 3, "constructor foo ignored");

			// And make sure it works even if the argument isn't a hash
			var ignore2 = new IgnoreParamsStateful(5, 4, 3, 2, 1);
			assert.strictEqual(ignore2.foo, 3, "ignore2 created");
		},
		"_set": function () {
			var output = [];
			var StatefulClass4 = dcl(Stateful, {
				foo: null,
				bar: null,

				_setFooAttr: function (value) {
					this._set("bar", value);
					this._set("foo", value);
				},
				_setBarAttr: function (value) {
					this._set("foo", value);
					this._set("bar", value);
				}
			});

			var attr4 = new StatefulClass4();
			attr4.watch("foo", function (name, oldValue, value) {
				output.push(name, oldValue, value);
			});
			attr4.watch("bar", function (name, oldValue, value) {
				output.push(name, oldValue, value);
			});
			attr4.foo = 3;
			assert.strictEqual(attr4.bar, 3, "value set properly");
			attr4.bar = 4;
			assert.strictEqual(attr4.foo, 4, "value set properly");
			assert.deepEqual(output, ["bar", null, 3, "foo", null, 3, "foo", 3, 4, "bar", 3, 4]);
		},
		"_get": function () {
			var StatefulClass5 = dcl(Stateful, {
				foo: "",
				_getFooAttr: function () {
					return this._get("foo") + "modified";
				}
			});

			var attr5 = new StatefulClass5();
			assert.strictEqual(attr5.foo, "modified", "value get properly");
			attr5.foo = "further";
			assert.strictEqual(attr5.foo, "furthermodified");
		},
		"moreCorrelatedProperties": function () {
			var Widget = dcl(Stateful, {
				foo: 10,
				_setFooAttr: function (val) {
					this._set("foo", val);
					this._set("bar", val + 1);
				},

				bar: 11,
				_setBarAttr: function (val) {
					this._set("bar", val);
					this._set("foo", val - 1);
				}
			});

			var w1 = new Widget({foo: 30});
			assert.strictEqual(w1.foo, 30, "w1.foo");
			assert.strictEqual(w1.bar, 31, "w1.bar");

			var w2 = new Widget({bar: 30});
			assert.strictEqual(w2.bar, 30, "w2.bar");
			assert.strictEqual(w2.foo, 29, "w2.foo");

			var w3 = new Widget({});
			assert.strictEqual(w3.foo, 10, "w3.foo");
			assert.strictEqual(w3.bar, 11, "w3.bar");
		},
		"subclasses1": function () {
			// Test when superclass and subclass are declared first, and afterwards instantiated
			var SuperClass = dcl(Stateful, {
				foo: null,
				bar: null
			});
			var SubClass = dcl(SuperClass, {
				bar: 5
			});

			var sub = new SubClass();
			var fooWatchedVal;
			sub.watch("foo", function (prop, o, n) {
				fooWatchedVal = n;
			});
			var barWatchedVal;
			sub.watch("bar", function (prop, o, n) {
				barWatchedVal = n;
			});
			sub.foo = 3;
			assert.strictEqual(fooWatchedVal, 3, "foo watch() on SubClass");
			sub.bar = 4;
			assert.strictEqual(barWatchedVal, 4, "bar watch() on SubClass");

			var sup = new SuperClass();
			var superFooWatchedVal;
			sup.watch("foo", function (prop, o, n) {
				superFooWatchedVal = n;
			});
			var superBarWatchedVal;
			sup.watch("bar", function (prop, o, n) {
				superBarWatchedVal = n;
			});
			sup.foo = 5;
			assert.strictEqual(superFooWatchedVal, 5, "foo watch() on SuperClass");
			sup.bar = 6;
			assert.strictEqual(superBarWatchedVal, 6, "bar watch() on SuperClass");
			assert.strictEqual(fooWatchedVal, 3, "SubClass listener on foo not called");
			assert.strictEqual(barWatchedVal, 4, "SubClass listener on bar not called");
		},
		"subclasses2": function () {
			// Test when superclass is declared and instantiated, then subclass is declared and use later
			var SuperClass = dcl(Stateful, {
				foo: null,
				bar: null
			});
			var sup = new SuperClass();
			var superFooWatchedVal;
			sup.watch("foo", function (prop, o, n) {
				superFooWatchedVal = n;
			});
			var superBarWatchedVal;
			sup.watch("bar", function (prop, o, n) {
				superBarWatchedVal = n;
			});
			sup.foo = 5;
			assert.strictEqual(superFooWatchedVal, 5, "foo watch() on SuperClass");
			sup.bar = 6;
			assert.strictEqual(superBarWatchedVal, 6, "bar watch() on SuperClass");

			var customSetterCalled;
			var SubClass = dcl(SuperClass, {
				bar: 5,
				_setBarAttr: function (val) {
					// this should get called even though SuperClass doesn't have a custom setter for "bar"
					customSetterCalled = true;
					this._set("bar", val);
				}
			});
			var sub = new SubClass();
			var fooWatchedVal;
			sub.watch("foo", function (prop, o, n) {
				fooWatchedVal = n;
			});
			var barWatchedVal;
			sub.watch("bar", function (prop, o, n) {
				barWatchedVal = n;
			});
			sub.foo = 3;
			assert.strictEqual(fooWatchedVal, 3, "foo watch() on SubClass");
			sub.bar = 4;
			assert.strictEqual(barWatchedVal, 4, "bar watch() on SubClass");
			assert.ok(customSetterCalled, "SubClass custom setter called");

			assert.strictEqual(superFooWatchedVal, 5, "SuperClass listener on foo not called");
			sup.bar = 6;
			assert.strictEqual(superBarWatchedVal, 6, "SuperClass listener on bar not called");
		},
		"getSetObserve": function () {
			var dfd = this.async(1000),
				count = 0,
				s = new (dcl(Stateful, {
					foo: 3
				}))();
			assert.strictEqual(s.foo, 3);
			var watching = s.observe("foo", dfd.rejectOnError(function (newValue, oldValue) {
				if (++count > 1) {
					throw new Error("Observer callback should not be called after observation is stopped.");
				}

				assert.deepEqual(oldValue, {foo: 3});
				assert.deepEqual(newValue, {foo: 4});
				assert.strictEqual(s.foo, 4);

				watching.remove();
				s.foo = 5;
				assert.strictEqual(s.foo, 5);

				setTimeout(dfd.resolve.bind(dfd), 100);
			}));
			s.foo = 4;
			assert.strictEqual(s.foo, 4);
		},
		"removeObserveHandleTwice": function () {
			var dfd = this.async(1000),
				s = new (dcl(Stateful, {
					foo: 3
				}))(),
				changes = [];

			var watching = s.observe("foo", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "toBeRemoved", newValues: newValues, oldValues: oldValues});
			}));

			s.observe("foo", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "toBeAlive", newValues: newValues, oldValues: oldValues});
			}));

			s.foo = 4;
			watching.remove();
			watching.remove();
			s.foo = 5;

			setTimeout(dfd.callback(function () {
				assert.deepEqual(changes, [
					{id: "toBeAlive", newValues: {foo: 5}, oldValues: {foo: 3}}
				]);
			}), 100);
		},
		"setHash: observe()": function () {
			var dfd = this.async(1000),
				s = new (dcl(Stateful, {
					foo: 0,
					bar: 0
				}))(),
				changes = [];

			s.observe("foo", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "foo", newValues: newValues, oldValues: oldValues});
			}));

			s.mix({
				foo: 3,
				bar: 5
			});

			assert.strictEqual(s.foo, 3);
			assert.strictEqual(s.bar, 5);

			setTimeout(dfd.rejectOnError(function () {
				assert.deepEqual(changes, [{id: "foo", newValues: {foo: 3}, oldValues: {foo: 0}}]);

				var Clz2 = dcl(Stateful, {
						foo: 0,
						bar: 0
					}),
					s2 = new Clz2();
				s2.mix(s);
				assert.strictEqual(s2.foo, 3);
				assert.strictEqual(s2.bar, 5);

				setTimeout(dfd.callback(function () {
					// s watchers should not be copied to s2
					assert.strictEqual(changes.length, 1);
				}), 100);
			}), 100);
		},
		"wildcard: observe()": function () {
			var dfd = this.async(1000),
				s = new (dcl(Stateful, {
					foo: 0,
					bar: 0
				}))();
			s.mix({
				foo: 3,
				bar: 5
			});
			var changes = [];
			s.observe(dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "*", newValues: newValues, oldValues: oldValues});
			}));
			s.observe("foo", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "foo", newValues: newValues, oldValues: oldValues});
			}));
			s.foo = 4;
			s.bar = 6;
			setTimeout(dfd.callback(function () {
				assert.deepEqual(changes, [
					{id: "*", newValues: {foo: 4, bar: 6}, oldValues: {foo: 3, bar: 5}},
					{id: "foo", newValues: {foo: 4}, oldValues: {foo: 3}}
				]);
			}), 100);
		},
		"_set: observe()": function () {
			var dfd = this.async(1000),
				StatefulClass4 = dcl(Stateful, {
					foo: null,
					bar: null,
					_setFooAttr: function (value) {
						this._set("bar", value);
						this._set("foo", value);
					},
					_setBarAttr: function (value) {
						this._set("foo", value);
						this._set("bar", value);
					}
				}),
				attr4 = new StatefulClass4(),
				changes = [];
			attr4.observe("foo", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "foo", newValues: newValues, oldValues: oldValues});
			}));
			attr4.observe("bar", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "bar", newValues: newValues, oldValues: oldValues});
			}));
			attr4.foo = 3;
			assert.strictEqual(attr4.bar, 3, "value set properly");
			attr4.bar = 4;
			assert.strictEqual(attr4.foo, 4, "value set properly");

			setTimeout(dfd.callback(function () {
				assert.deepEqual(changes, [
					{id: "foo", newValues: {foo: 4}, oldValues: {foo: null}},
					{id: "bar", newValues: {bar: 4}, oldValues: {bar: null}},
				]);
			}), 100);
		},
		"subclasses1: observe()": function () {
			// Test when superclass and subclass are declared first, and afterwards instantiated
			var dfd = this.async(1000),
				SuperClass = dcl(Stateful, {
					foo: null,
					bar: null
				}),
				SubClass = dcl(SuperClass, {
					bar: 5
				}),
				sub = new SubClass(),
				changes = [];
			sub.observe("foo", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "subfoo", newValues: newValues, oldValues: oldValues});
			}));
			sub.observe("bar", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "subbar", newValues: newValues, oldValues: oldValues});
			}));
			sub.foo = 3;
			sub.bar = 4;

			var sup = new SuperClass();
			sup.observe("foo", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "supfoo", newValues: newValues, oldValues: oldValues});
			}));
			sup.observe("bar", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "supbar", newValues: newValues, oldValues: oldValues});
			}));
			sup.foo = 5;
			sup.bar = 6;

			setTimeout(dfd.callback(function () {
				assert.deepEqual(changes, [
					{id: "subfoo", newValues: {foo: 3}, oldValues: {foo: null}},
					{id: "subbar", newValues: {bar: 4}, oldValues: {bar: 5}},
					{id: "supfoo", newValues: {foo: 5}, oldValues: {foo: null}},
					{id: "supbar", newValues: {bar: 6}, oldValues: {bar: null}}
				]);
			}), 100);
		},
		"subclasses2: observe()": function () {
			// Test when superclass is declared and instantiated, then subclass is declared and use later
			var dfd = this.async(1000),
				SuperClass = dcl(Stateful, {
					foo: null,
					bar: null
				}),
				sup = new SuperClass(),
				changes = [];
			sup.observe("foo", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "supfoo", newValues: newValues, oldValues: oldValues});
			}));
			sup.observe("bar", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "supbar", newValues: newValues, oldValues: oldValues});
			}));
			sup.foo = 5;
			sup.bar = 6;

			var customSetterCalled,
				SubClass = dcl(SuperClass, {
					bar: 5,
					_setBarAttr: function (val) {
						// this should get called even though SuperClass doesn't have a custom setter for "bar"
						customSetterCalled = true;
						this._set("bar", val);
					}
				}),
				sub = new SubClass();
			sub.observe("foo",  dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "subfoo", newValues: newValues, oldValues: oldValues});
			}));
			sub.observe("bar", dfd.rejectOnError(function (newValues, oldValues) {
				changes.push({id: "subbar", newValues: newValues, oldValues: oldValues});
			}));
			sub.foo = 3;
			sub.bar = 4;
			assert.ok(customSetterCalled, "SubClass custom setter called");

			setTimeout(dfd.rejectOnError(function () {
				assert.deepEqual(changes, [
					{id: "supfoo", newValues: {foo: 5}, oldValues: {foo: null}},
					{id: "supbar", newValues: {bar: 6}, oldValues: {bar: null}},
					{id: "subfoo", newValues: {foo: 3}, oldValues: {foo: null}},
					{id: "subbar", newValues: {bar: 4}, oldValues: {bar: 5}}
				]);
				sup.bar = 6;
				setTimeout(dfd.callback(function () {
					assert.strictEqual(changes.length, 4);
				}), 100);
			}), 100);
		},
		"observe(): Setting a value that is same as the current property value": function () {
			var dfd = this.async(1000),
				stateful = new (dcl(Stateful, {
					foo: undefined,
					bar: undefined,
					baz: undefined
				}))({
					foo: "Foo",
					bar: NaN,
					baz: 0
				});
			stateful.observe(dfd.callback(function (newValues, oldValues) {
				assert.deepEqual(newValues, {baz: -0});
				assert.deepEqual(oldValues, {baz: 0});
			}));
			stateful.foo = "Foo";
			stateful.bar = NaN;
			stateful.baz = -0;
		},
		"notifyCurrentValue()": function () {
			var dfd = this.async(1000),
				stateful = new (dcl(Stateful, {
					foo: undefined
				}))({
					foo: "Foo"
				});
			stateful.observe(dfd.callback(function (newValues, oldValues) {
				assert.deepEqual(newValues, {foo: "Foo"});
				assert.deepEqual(oldValues, {foo: "Foo"});
			}));
			stateful.notifyCurrentValue("foo");
		},
		"Stateful.PropertyListObserver#addProperties()": function () {
			var dfd = this.async(1000),
				stateful = new (dcl(Stateful, {
					foo: undefined,
					bar: undefined,
					baz: undefined
				}))(),
				hObserve = stateful.observe(dfd.callback(function (newValues, oldValues) {
					assert.deepEqual(newValues, {foo: "foo", bar: "bar"});
					assert.deepEqual(oldValues, {foo: undefined, bar: undefined});
				}));
			hObserve.addProperties("foo", "bar");
			stateful.foo = "foo";
			stateful.bar = "bar";
			stateful.baz = "baz";
		},
		"Stateful.PropertyListObserver#addDependants()": function () {
			var dfd = this.async(1000),
				stateful = new (dcl(Stateful, {
					foo: undefined
				}))(),
				hObserve = stateful.observe(dfd.callback(function (newValues, oldValues) {
					assert.deepEqual(newValues, {foo: 0});
					assert.deepEqual(oldValues, {foo: undefined});
				})),
				hCompute = stateful.observe(dfd.rejectOnError(function (newValues) {
					if ("foo" in newValues) {
						if (this.foo < 0) {
							this.foo = 0;
						}
					}
				}));
			hObserve.addDependants(hCompute);
			stateful.foo = -1;
		},
		"Stateful.PropertyListObserver#deliver(), Stateful.PropertyListObserver#discardChanges()": function () {
			var changes = [],
				stateful = new (dcl(Stateful, {
					foo: undefined
				}))({
					foo: "Foo0"
				}),
				hObserve = stateful.observe(function (newValues, oldValues) {
					changes.push({newValues: newValues, oldValues: oldValues});
				});
			stateful.foo = "Foo1";
			hObserve.discardChanges();
			stateful.foo = "Foo2";
			hObserve.deliver();
			assert.deepEqual(changes, [{newValues: {foo: "Foo2"}, oldValues: {foo: "Foo1"}}]);
		}
	});
});
