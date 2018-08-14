/**
 * Plugin to load custom-elements.min.js if it's required.
 *  @module delite/custom-elements
 */
define([
	"require",
	"requirejs-dplugins/has"
], function (req, has) {

	"use strict";

	return /** @lends module:delite/custom-elements */ {
		/**
		 * Load custom-elements.min.js if it's required.
		 * @param {string} path - Simplified path. It will be expanded to convert {{theme}} to the current theme.
		 * @param {Function} require - AMD's require() method.
		 * @param {Function} onload - Callback function which will be called when the loading finishes
		 * and the stylesheet has been inserted.
		 * @private
		 */
		load: function (path, require, onload) {
			if (has("builder") || typeof customElements !== "undefined") {
				onload();
			} else {
				require(["custom-elements/custom-elements.min"], function () {
					onload();
				});
			}
		}
	};
});
