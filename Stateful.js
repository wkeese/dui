/** @module delite/Stateful */
define([
	"dcl/dcl",
	"liaison/Observable"
], function (dcl, Observable) {
	var EMPTY_ARRAY = [],
		apn = {};

	function propNames(name) {
		// summary:
		//		Helper function to map "foo" --> "_setFooAttr" with caching to avoid recomputing strings.
		//		Note: in dojo/Stateful they are _fooGetter and _fooSetter.

		if (apn[name]) {
			return apn[name];
		}
		var uc = name.replace(/^[a-z]|-[a-zA-Z]/g, function (c) {
			return c.charAt(c.length - 1).toUpperCase();
		});
		var ret = apn[name] = {
			p: "_" + name + "Attr",		// shadow property, since real property hidden by setter/getter
			s: "_set" + uc + "Attr",	// converts dashes to camel case, ex: accept-charset --> _setAcceptCharsetAttr
			g: "_get" + uc + "Attr"
		};
		return ret;
	}

	function areSameValues(lhs, rhs) {
		return lhs === rhs && (lhs !== 0 || 1 / lhs === 1 / rhs) || lhs !== lhs && rhs !== rhs;
	}

	var Stateful = dcl(null, {
		// summary:
		//		Base class for objects that provide named properties with optional getter/setter
		//		control and the ability to watch for property changes.
		//
		//		The class also provides the functionality to auto-magically manage getters
		//		and setters for class attributes/properties.  Note though that expando properties
		//		(i.e. properties added to an instance but not in the prototype) are not supported.
		//
		//		Getters and Setters should follow the format of _setXxxAttr or _getXxxAttr where
		//		the xxx is a name of the attribute to handle.  So an attribute of "foo"
		//		would have a custom getter of _getFooAttr and a custom setter of _setFooAttr.
		//		Setters must save and announce the new property value by calling this._set("foo", val),
		//		and getters should access the property value as this._fooAttr.
		//
		// example:
		//	|	var MyClass = dcl(Stateful, { foo: "initial" });
		//	|	var obj = new MyClass();
		//	|	obj.watch("foo", function(){
		//	|		console.log("foo changed to " + this.foo);
		//	|	});
		//	|	obj.foo = bar;
		//
		//		Stateful by default interprets the first parameter passed to the constructor as
		//		a set of properties to set on the widget immediately after it is created.
		//
		// example:
		//	|	var MyClass = dcl(Stateful, { foo: "initial" });
		//	|	var obj = new MyClass({ foo: "special"});

		_getProps: function () {
			// summary:
			//		Return the list of properties that should be watchable

			var list = [];
			for (var prop in this) {
				if (typeof this[prop] !== "function" && !/^_/.test(prop)) {
					list.push(prop);
				}
			}
			return list;
		},

		_introspect: function (/*String[]*/ props) {
			// summary:
			//		Sets up ES5 getters/setters for each class property.
			//		Inside _introspect(), "this" is a reference to the prototype rather than any individual instance.

			props.forEach(function (prop) {
				var names = propNames(prop),
					shadowProp = names.p,
					getter = names.g,
					setter = names.s;

				// Setup ES5 getter and setter for this property, if not already setup.
				// For a property named foo, saves raw value in _fooAttr.
				// ES5 setter intentionally does late checking for this[names.s] in case a subclass sets up a
				// _setFooAttr method.
				if (!(shadowProp in this)) {
					this[shadowProp] = this[prop];
					delete this[prop]; // make sure custom setters fire
					Object.defineProperty(this, prop, {
						enumerable: true,
						set: function (x) {
							setter in this ? this[setter](x) : this._set(prop, x);
						},
						get: function () {
							return getter in this ? this[getter]() : this[shadowProp];
						}
					});
				}
			}, this);
		},

		constructor: dcl.advise({
			before: function () {
				// First time this class is instantiated, introspect it.
				// Use _introspected flag on constructor, rather than prototype, to avoid hits when superclass
				// was already inspected but this class wasn't.
				var ctor = this.constructor;
				if (!ctor._introspected) {
					// note: inside _introspect() this refs prototype
					ctor.prototype._introspect(ctor.prototype._getProps());
					ctor._introspected = true;
				}
				if (!this._observable) {
					Observable.call(this);
				}
			},

			after: function (args) {
				// Automatic setting of params during construction.
				// In after() advice so that it runs after all the subclass constructor methods.
				this.processConstructorParameters(args);
			}
		}),

		processConstructorParameters: function (args) {
			// summary:
			//		Called after Object is created to process parameters passed to constructor
			if (args.length) {
				this.mix(args[0]);
			}
		},

		mix: function (/*Object*/ hash) {
			// summary:
			//		Set a hash of properties on a Stateful instance
			//	|	myObj.mix({
			//	|		foo: "Howdy",
			//	|		bar: 3
			//	|	})

			for (var x in hash) {
				if (hash.hasOwnProperty(x) && x !== "_watchCallbacks") {
					this[x] = hash[x];
				}
			}
		},

		_set: function (name, value) {		// note: called _changeAttrValue() in dojo/Stateful
			// summary:
			//		Internal helper for directly changing an attribute value.
			// name: String
			//		The property to set.
			// value: Mixed
			//		The value to set in the property.
			// description:
			//		Directly change the value of an attribute on an object, bypassing any
			//		accessor setter.  Also notifies callbacks registered via watch().
			//		It is designed to be used by descendant class when there are two values
			//		of attributes that are linked, but calling .set() is not appropriate.

			var shadowPropName = propNames(name).p;
			var oldValue = this[shadowPropName];
			this[shadowPropName] = value;
			if (this._watchCallbacks) {
				this._watchCallbacks(name, oldValue, value);
			}
			// Even if Object.observe() is natively available,
			// automatic change record emission won't happen if there is a ECMAScript setter
			!areSameValues(value, oldValue) && Observable.getNotifier(this).notify({
				// Property is never new because setting up shadow property defines the property
				type: Observable.CHANGETYPE_UPDATE,
				object: this,
				name: name + "",
				oldValue: oldValue
			});
		},

		_get: function (name) {
			// summary:
			//		Internal helper for directly accessing an attribute value.
			// description:
			//		Directly get the value of an attribute on an object, bypassing any accessor getter.
			//		It is designed to be used by descendant class if they want
			//		to access the value in their custom getter before returning it.
			// name: String
			//		The property to get.

			return this[propNames(name).p];
		},

		/**
		 * Observe for change in properties.
		 * Callback is called at the end of micro-task of changes
		 * with two arguments, `newValues` and `oldValues`,
		 * which are hash tables of new/old values keyed by changed property.
		 * Multiple changes to a property in a micro-task is squashed in `newValues` and `oldValues`.
		 * @method module:delite/Stateful#observe
		 * @param {function} callback The callback.
		 * @returns {module:delite/Stateful.PropertyListObserver}
		 *     The observer that can be used to stop observation
		 *     or synchronously deliver/discard pending change records.
		 * @example
		 *     var stateful = new (dcl(Stateful, {
		 *             foo: undefined,
		 *             bar: undefined,
		 *             baz: undefined
		 *         }))({
		 *             foo: 3,
		 *             bar: 5,
		 *             baz: 7
		 *         });
		 *     stateful.observe(function (newValues, oldValues) {
		 *         // newValues is {foo: 6, bar: 8, baz: 10}
		 *         // oldValues is {foo: 3, bar: 5, baz: 7}
		 *     });
		 *     stateful.foo = 4;
		 *     stateful.bar = 6;
		 *     stateful.baz = 8;
		 *     stateful.foo = 6;
		 *     stateful.bar = 8;
		 *     stateful.baz = 10;
		 */
		observe: function (callback) {
			var h = new Stateful.PropertyListObserver(this);
			h.open(callback);
			return h;
		},

		/**
		 * Notify current value to observers.
		 * Handy to manually schedule invocation of observer callbacks when there is no change in value.
		 * @method module:delite/Stateful#notifyCurrentValue
		 * @param {string} name The property name.
		 */
		notifyCurrentValue: function (name) {
			var value = this[propNames(name).p];
			if (this._watchCallbacks) {
				this._watchCallbacks(name, value, value);
			}
			Observable.getNotifier(this).notify({
				// Property is never new because setting up shadow property defines the property
				type: Observable.CHANGETYPE_UPDATE,
				object: this,
				name: name + "",
				oldValue: value
			});
		},

		watch: function (/*String?*/ name, /*Function*/ callback) {
			// summary:
			//		Watches a property for changes
			// name:
			//		Indicates the property to watch. This is optional (the callback may be the
			//		only parameter), and if omitted, all the properties will be watched
			// returns:
			//		An object handle for the watch. The unwatch method of this object
			//		can be used to discontinue watching this property:
			//		|	var watchHandle = obj.watch("foo", callback);
			//		|	watchHandle.unwatch(); // callback won't be called now
			// callback:
			//		The function to execute when the property changes. This will be called after
			//		the property has been changed. The callback will be called with the |this|
			//		set to the instance, the first argument as the name of the property, the
			//		second argument as the old value and the third argument as the new value.

			console.warn("Stateful.watch() is deprecated. To be removed soon. Use Stateful.observe() instead.");

			var callbacks = this._watchCallbacks;
			if (!callbacks) {
				var self = this;
				callbacks = this._watchCallbacks = function (name, oldValue, value, ignoreCatchall) {
					var notify = function (propertyCallbacks) {
						if (propertyCallbacks) {
							propertyCallbacks = propertyCallbacks.slice();
							for (var i = 0, l = propertyCallbacks.length; i < l; i++) {
								propertyCallbacks[i].call(self, name, oldValue, value);
							}
						}
					};
					notify(callbacks["_" + name]);
					if (!ignoreCatchall) {
						notify(callbacks["*"]); // the catch-all
					}
				}; // we use a function instead of an object so it will be ignored by JSON conversion
			}
			if (!callback && typeof name === "function") {
				callback = name;
				name = "*";
			} else {
				// prepend with dash to prevent name conflicts with function (like "name" property)
				name = "_" + name;
			}
			var propertyCallbacks = callbacks[name];
			if (typeof propertyCallbacks !== "object") {
				propertyCallbacks = callbacks[name] = [];
			}
			propertyCallbacks.push(callback);

			return {
				remove: function () {
					var index = propertyCallbacks.indexOf(callback);
					if (index > -1) {
						propertyCallbacks.splice(index, 1);
					}
				}
			}; //Object
		}
	});

	dcl.chainAfter(Stateful, "_introspect");

	var REGEXP_SHADOW_PROPS = /^_(.+)Attr$/;

	/**
	 * An observer to all multiple {@link module:delite/Stateful Stateful} properties at once.
	 * @class module:delite/Stateful.PropertyListObserver
	 * @property {Object} o The {@link module:delite/Stateful Stateful} being observed.
	 */
	Stateful.PropertyListObserver = function (o) {
		this.o = o;
		this.dependants = [];
	};

	Stateful.PropertyListObserver.prototype = /** @lends module:delite/Stateful.PropertyListObserver# */ {
		/**
		 * Converts `Object.observe()`-style change records to hash tables of new/old property values.
		 * @param {Array} records `Object.observe()`-style change records.
		 * @returns {Object[]} Hash tables of new/old property values.
		 * @private
		 */
		_filter: function (records) {
			var s,
				self = this,
				newValues = {},
				oldValues = {};
			records.forEach(function (record) {
				var noShadow = !Observable.useNative || !REGEXP_SHADOW_PROPS.test(record.name);
				if (noShadow && !(record.name in newValues)) {
					newValues[record.name] = self.o[record.name];
					if ("oldValue" in record) {
						oldValues[record.name] = record.oldValue;
					}
				}
			});
			/* jshint unused: false */
			for (s in newValues) {
				return [newValues, oldValues];
			}
		},

		/**
		 * Add observers that should run before this observer.
		 * @param {...module:delite/Stateful.PropertyListObserver} observers The observers.
		 */
		addDependants: function () {
			EMPTY_ARRAY.forEach.call(arguments, function (arg) {
				if (this.dependants.indexOf(arg) < 0) {
					this.dependants.push(arg);
				}
			}, this);
			return this;
		},

		/**
		 * Starts the observation.
		 * {@link module:delite/Stateful#observe `Stateful#observe()`} calls this method automatically.
		 * @param {function} callback The change callback.
		 * @param {Object} thisObject The object that should works as "this" object for callback.
		 */
		open: function (callback, thisObject) {
			this.boundCallback = function (records) {
				if (!this.closed && !this.beingDiscarded) {
					if (this._recordsQueue) {
						EMPTY_ARRAY.push.apply(this._recordsQueue, records);
					} else {
						if (this.dependants.length > 0) {
							this._recordsQueue = [];
							this.dependants.forEach(function (dependant) {
								dependant.deliver();
							});
							this.deliver();
							EMPTY_ARRAY.push.apply(records, this._recordsQueue);
							this._recordsQueue = undefined;
						}
						var args = this._filter.call(this, records);
						args && callback.apply(thisObject, args);
					}
				}
			}.bind(this);
			this.h = Observable.observe(this.o, this.boundCallback);
			return this.o;
		},

		/**
		 * Synchronously delivers pending change records.
		 */
		deliver: function () {
			this.boundCallback && Observable.deliverChangeRecords(this.boundCallback);
		},

		/**
		 * Discards pending change records.
		 */
		discardChanges: function () {
			this.beingDiscarded = true;
			this.boundCallback && Observable.deliverChangeRecords(this.boundCallback);
			this.beingDiscarded = false;
			return this.o;
		},

		/**
		 * Does nothing, just exists for API compatibility with liaison and other data binding libraries.
		 */
		setValue: function () {},

		/**
		 * Stops the observation.
		 */
		close: function () {
			if (this.h) {
				this.h.remove();
				this.h = null;
			}
			this.closed = true;
		}
	};

	/**
	 * Synonym for {@link module:delite/Stateful.PropertyListObserver#close `close()`}.
	 * @method
	 */
	Stateful.PropertyListObserver.prototype.remove = Stateful.PropertyListObserver.prototype.close;

	return Stateful;
});
