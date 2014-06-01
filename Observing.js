/** @module delite/Observing */
define([
	"dcl/dcl",
	"./Stateful",
	"./Destroyable"
], function (dcl, Stateful, Destroyable) {
	/**
	 * Mixin class to for widgets
	 * that want to calculate computed properties at once and/or to render UI at once upon multiple property changes.
	 * @class module:delite/Observing
	 */
	return dcl([Stateful, Destroyable], /** @lends module:delite/Observing# */ {
		constructor: function () {
			// TODO: this won't be called for widgets
			this.own(
				this._hComputing = this.observe(this.refreshProperties.bind(this)),
				this._hRendering = this.observe(this.refreshRendering.bind(this))
			);
		},

		/**
		 * Synchronously deliver change records for computed properties
		 * so that `refreshingComputing()` is called if there are pending change records.
		 */
		deliverComputing: function () {
			this._hComputing && this._hComputing.deliver();
			return this._hComputing;
		},

		/**
		 * Discard change records for computed properties.
		 */
		discardComputing: function () {
			this._hComputing && this._hComputing.discardChanges();
			return this._hComputing;
		},

		/**
		 * Synchronously deliver change records for UI rendering
		 * so that `refreshingRendering()` is called if there are pending change records.
		 */
		deliverRendering: function () {
			this._hRendering && this._hRendering.deliver();
			return this._hComputing;
		},

		/**
		 * Discard change records for UI rendering.
		 */
		discardRendering: function () {
			this._hRendering && this._hRendering.discardChanges();
			return this._hComputing;
		},

		/**
		 * Callback function to calculate computed properties upon property changes.
		 * @param {Object} oldValues The hash table of old property values, keyed by property names.
		 */
		computeProperties: function () {},

		/**
		 * Callback function to render UI upon property changes.
		 * @param {Object} oldValues The hash table of old property values, keyed by property names.
		 */
		refreshRendering: function () {}
	});
});
