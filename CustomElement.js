/** @module delite/CustomElement */
define([
	"dcl/dcl",
	"decor/Observable",
	"decor/Destroyable",
	"decor/Stateful",
	"./attr"
], function (dcl, Observable, Destroyable, Stateful, attr) {


	var REGEXP_SHADOW_PROPS = /^_(.+)Attr$/;

	/**
	 * Base class for all custom elements.
	 *
	 * Use this class rather that delite/Widget for non-visual custom elements.
	 * Custom elements can provide custom setters/getters for properties, which are called automatically
	 * when the value is set.  For an attribute XXX, define methods _setXXXAttr() and/or _getXXXAttr().
	 *
	 * @mixin module:delite/CustomElement
	 * @augments module:decor/Stateful
	 * @augments module:decor/Destroyable
	 */
	return dcl([Stateful, Destroyable], /** @lends module:delite/CustomElement# */{
		_getProps: function () {
			// Override _Stateful._getProps() to ignore properties from the HTML*Element superclasses, like "style".
			// You would need to explicitly declare style: "" in your widget to get it here.
			// Intentionally skips methods, because it seems wasteful to have a custom
			// setter for every method; not sure that would work anyway.
			//
			// Also sets up this._propCaseMap, a mapping from lowercase property name to actual name,
			// ex: iconclass --> iconClass, which does include the methods, but again doesn't
			// include props like "style" that are merely inherited from HTMLElement.

			var hash = {}, proto = this, ctor,
				pcm = this._propCaseMap = {};

			do {
				Object.keys(proto).forEach(function (prop) {
					if (!REGEXP_SHADOW_PROPS.test(prop)) {
						if (typeof proto[prop] !== "function") {
							hash[prop] = true;
						}
						pcm[prop.toLowerCase()] = prop;
					}
				});

				proto = Object.getPrototypeOf(proto);
				ctor = proto && proto.constructor;
			} while (proto && ctor !== this._baseElement);

			return hash;
		},

		createdCallback: dcl.advise({
			before: function () {
				// Mark this object as observable with Object.observe() shim
				if (!this._observable) {
					Observable.call(this);
				}

				// Get parameters that were specified declaratively on the widget DOMNode.
				this._parsedAttributes = this._mapAttributes();
			},

			after: function () {
				this._created = true;

				// Now that creation has finished, apply parameters that were specified declaratively.
				// This is consistent with the timing that parameters are applied for programmatic creation.
				this._parsedAttributes.forEach(function (pa) {
					if (pa.event) {
						this.on(pa.event, pa.callback);
					} else {
						this[pa.prop] = pa.value;
					}
				}, this);
			}
		}),

		/**
		 * Helper for _mapAttributes().  Interpret a given attribute specified in markup, returning either:
		 *
		 * - undefined: ignore
		 * - {prop: prop, value: value}: set this[prop] = value
		 * - {event: event, callback: callback}: call this.on(event, callback);
		 *
		 * @param {string} name - Attribute name.
		 * @param {string} value - Attribute value.
		 * @protected
		 */
		_parseAttr: function (name, value) {
			var pcm = this._propCaseMap;
			if (name in pcm) {
				name =  pcm[name]; // convert to correct case for widget
				return {
					prop: name,
					value: attr.parse(this[name], value)
				};
			} else if (/^on-/.test(name)) {
				return {
					event: name.substring(3),
					callback: attr.parseFunction(value, ["event"])
				};
			}
		},

		/**
		 * Parse declaratively specified attributes for widget properties and connects.
		 * @returns {Array} Info about the attributes and their values as returned by _parseAttr().
		 * @private
		 */
		_mapAttributes: function () {
			var attr,
				idx = 0,
				parsedAttrs = [],
				attrsToRemove = [];

			while ((attr = this.attributes[idx++])) {
				var name = attr.name.toLowerCase();	// note: will be lower case already except for IE9
				var parsedAttr = this._parseAttr(name, attr.value);
				if (parsedAttr) {
					parsedAttrs.push(parsedAttr);
					attrsToRemove.push(attr);
				}
			}

			// Remove attributes that were processed, but do it in a separate loop so we don't modify this.attributes
			// while we are looping through it.   (See CustomElement-attr.html test failure on IE10.)
			attrsToRemove.forEach(this.removeAttribute, this);

			return parsedAttrs;
		},

		/**
		 * Release resources used by this custom element and its descendants.
		 * After calling this method, the element can no longer be used,
		 * and should be removed from the document.
		 */
		destroy: function () {
			// Destroy descendants
			this.findCustomElements().forEach(function (w) {
				if (w.destroy) {
					w.destroy();
				}
			});

			if (this.parentNode) {
				this.parentNode.removeChild(this);
			}
		},

		/**
		 * Signal that a synthetic event occurred.
		 *
		 * Emits an event of specified type, based on eventObj.
		 * Also calls onType() method, if present, and returns value from that method.
		 * Modifies eventObj by adding missing parameters (bubbles, cancelable, widget).
		 *
		 * @param {string} type - Name of event.
		 * @param {Object} [eventObj] - Properties to mix in to emitted event.
		 * @returns {boolean} True if the event was *not* canceled, false if it was canceled.
		 * @example
		 * myWidget.emit("query-success", {});
		 * @protected
		 */
		emit: function (type, eventObj) {
			// Emit event, but (for the case of the Widget subclass)
			// avoid spurious emit()'s as parent sets properties on child during startup/destroy
			if (this._started !== false && !this._beingDestroyed) {
				eventObj = eventObj || {};
				var bubbles = "bubbles" in eventObj ? eventObj.bubbles : true;
				var cancelable = "cancelable" in eventObj ? eventObj.cancelable : true;

				// Note: can't use jQuery.trigger() because it doesn't work with addEventListener(),
				// see http://bugs.jquery.com/ticket/11047
				var nativeEvent = this.ownerDocument.createEvent("HTMLEvents");
				nativeEvent.initEvent(type, bubbles, cancelable);
				for (var i in eventObj) {
					if (!(i in nativeEvent)) {
						nativeEvent[i] = eventObj[i];
					}
				}
				return this.dispatchEvent(nativeEvent);
			}
		},

		/**
		 * Call specified function when event occurs.
		 *
		 * Note that the function is not run in any particular scope, so if (for example) you want it to run
		 * in the widget's scope you must do `myWidget.on("click", myWidget.func.bind(myWidget))`.
		 * @param {string|Function} type - Name of event (ex: "click") or extension event like `touch.press`.
		 * @param {Function} func - Callback function.
		 * @param {Element} [node] - Element to attach handler to, defaults to `this`.
		 * @returns {Object} Handle with `remove()` method to cancel the event.
		 */
		on: function (type, func, node) {
			// Shim support for focusin/focusout, plus treat on(focus, "...") like on("focusin", ...) since
			// conceptually when widget.focusNode gets focus, it means the widget itself got focus.
			var captures = {
					focusin: "focus",
					focus: "focus",
					focusout: "blur",
					blur: "blur"
				},
				capture = type in captures,
				adjustedType = capture ? captures[type] : type;

			// TODO: would it be better if node was the first parameter (but optional)?
			node = node || this;

			// Use addEventListener() because jQuery's on() returns a wrapped event object that
			// doesn't have custom properties we add to custom events.  The downside is that we don't
			// get any event normalization like "focusin".
			node.addEventListener(adjustedType, func, capture);
			return this.own({
				remove: function () {
					node.removeEventListener(adjustedType, func, capture);
				}
			})[0];
		},

		// Override Stateful#observe() because the way to get the list of properties to watch is different
		// than for a plain Stateful.  Especially since IE doesn't support prototype swizzling.
		observe: function (callback) {
			var propsToObserve = this._ctor._propsToObserve;
			var h = new Stateful.PropertyListObserver(this, propsToObserve);
			h.open(callback, this);
			return h;
		},

		/**
		 * Search subtree under root returning custom elements found.
		 * @param {Element} [root] Node to search under.
		 */
		findCustomElements: function (root) {
			var outAry = [];

			function getChildrenHelper(root) {
				for (var node = root.firstChild; node; node = node.nextSibling) {
					if (node.nodeType === 1 && node.createdCallback) {
						outAry.push(node);
					} else {
						getChildrenHelper(node);
					}
				}
			}

			getChildrenHelper(root || this);
			return outAry;
		}
	});
});
