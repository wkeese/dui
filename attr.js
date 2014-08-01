/**
 * Helper functions for interpreting attributes.
 * @module delite/attr
 */

define([], function () {
	/**
	 * Get a property from a dot-separated string, such as "A.B.C".
	 */
	function getObject(name) {
		try {
			return name.split(".").reduce(function (context, part) {
				return context[part];
			}, this);	// "this" is the global object (i.e. window on browsers)
		} catch (e) {
			// Return undefined to indicate that object doesn't exist.
		}
	}

	var attr = {
		/**
		 * Returns value for Element property based on attribute value in markup.
		 * @param {string} property - Default value of Element's property.  Used to get type.
		 * @param {string} value - Value of attribute in markup.
		 */
		parse: function (property, value) {
			// inner function useful to reduce cyclomatic complexity when using jshint
			function stringToObject(value) {
				var obj;

				try {
					// TODO: remove this code if it isn't being used, so we don't scare people that are afraid of eval.
					/* jshint evil:true */
					// This will only be executed when complex parameters are used in markup
					// <my-tag constraints="max: 3, min: 2"></my-tag>
					// This can be avoided by using such complex parameters only programmatically or by not using
					// them at all.
					// This is harmless if you make sure the JavaScript code that is passed to the attribute
					// is harmless.
					obj = eval("(" + (value[0] === "{" ? "" : "{") + value + (value[0] === "{" ? "" : "}") + ")");
				}
				catch (e) {
					throw new SyntaxError("Error in attribute conversion to object: " + e.message +
						"\nAttribute Value: '" + value + "'");
				}
				return obj;
			}

			switch (typeof property) {
			case "string":
				return value;
			case "number":
				return value - 0;
			case "boolean":
				return value !== "false";
			case "object":
				// Try to interpret value as global variable, ex: store="myStore", array of strings
				// ex: "1, 2, 3", or expression, ex: constraints="min: 10, max: 100"
				return getObject(value) ||
					(property instanceof Array ? (value ? value.split(/\s+/) : []) : stringToObject(value));
			case "function":
				return attr.parseFunction(value, []);
			}
		},

		/**
		 * Helper to parse function attribute in markup.  Unlike parse(), does not require a
		 * corresponding Element property.  Functions can be specified as global variables or as inline javascript:
		 *
		 * ```
		 * <my-widget funcAttr="globalFunction" on-click="console.log(event.pageX);">
		 * ```
		 *
		 * @param {string} value - Value of the attribute.
		 * @param {string[]} params - When generating a function from inline javascript, give it these parameter names.
		 */
		parseFunction: function (value, params) {
			/* jshint evil:true */
			// new Function() will only be executed if you have properties that are of function type in your widget
			// and that you use them in your tag attributes as follows:
			// <my-tag whatever="console.log(param)"></my-tag>
			// This can be avoided by setting the function programmatically or by not setting it at all.
			// This is harmless if you make sure the JavaScript code that is passed to the attribute is harmless.
			// Use Function.bind to get a partial on Function constructor (trick to call it with an array
			// of args instead list of args).
			return getObject(value) ||
				new (Function.bind.apply(Function, [undefined].concat(params).concat([value])))();
		}
	};

	return attr;
});
