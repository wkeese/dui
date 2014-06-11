/** @module delite/CssState */
define([
	"dcl/dcl",
	"jquery/core",
	"./Widget",
	"jquery/attributes/classes"	// addClass(), removeClass()
], function (dcl, $, Widget) {

	/**
	 * Update the visual state of the widget by setting CSS classes on widget root node
	 * based on widget properties:
	 *
	 * - `this.disabled` --> `d-disabled`
	 * - `this.readOnly` --> `d-readonly`
	 * - `this.selected` --> `d-selected` (ex: currently selected tab)
	 * - `this.focused` --> `d-focused` (widget or a descendant node has focus, or was recently clicked)
	 * - `this.checked == true` --> `d-checked` (ex: a checkbox or a ToggleButton in a checked state)
	 * - `this.checked == "mixed"` --> `d-mixed` (half-checked aka indeterminate checkbox)
	 * - `this.state == "Error"` --> `d-error` (ValidationTextBox value is invalid)
	 * - `this.state == "Incomplete"` --> `d-incomplete` (user hasn't finished typing value yet)
	 *
	 * @mixin module:delite/CssState
	 * @augments module:delite/Widget
	 */
	return dcl(Widget, /** lends module:delite/CssState# */ {

		/**
		 * List of boolean properties to watch.
		 * @member {string[]} module:delite/CssState#booleanCssProps
		 * @default ["disabled", "readOnly", "selected", "focused", "opened"]
		 */
		booleanCssProps: ["disabled", "readOnly", "selected", "focused", "opened"],

		postCreate: function () {
			// Monitoring changes to disabled, readonly, etc. state, and update CSS class of root node
			this.booleanCssProps.forEach(function (name) {
				this.watch(name, function (name, oval, nval) {
					$(this).toggleClass("d-" + name.toLowerCase(), nval);
				}.bind(this));
			}, this);
			this.watch("checked", function (name, oval, nval) {
				$(this).removeClass(oval === "mixed" ? "d-mixed" : "d-checked")
					.addClass(nval === "mixed" ? "d-mixed" : nval ? "d-checked": "");
			}.bind(this));
			this.watch("state", function (name, oval, nval) {
				$(this).removeClass("d-" + oval.toLowerCase()).addClass("d-" + nval.toLowerCase());
			}.bind(this));
		}
	});
});
