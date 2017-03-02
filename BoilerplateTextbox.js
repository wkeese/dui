/** @module delite/BoilerplateTextbox */
define([
	"dcl/dcl",
	"./FormValueWidget",
	"./handlebars!./BoilerplateTextbox/BoilerplateTextbox.html"
], function (
	dcl,
	FormValueWidget,
	template
) {
	"use strict";

	/**
	 * Base class for both delimiters and editable fields in a BoilerplateTextbox.
	 */
	var Field = dcl(null, {
		constructor: function (args) {
			dcl.mix(this, args);
		},

		/**
		 * Text to display when field has no value.
		 * @member {string}
		 */
		boilerplate: "",

		/**
		 * True if the user can edit the field.  False if field is a delimiter.
		 * @member {boolean}
		 */
		editable: true,

		/**
		 * Value of field, or null if no value is set.
		 * @member {string}
		 */
		value: null,

		/**
		 * Called when focus moved to this field.
		 */
		focus: function () {
		},

		/**
		 * Handler for when the user presses delete key, to restore field to boilerplate text.
		 */
		clear: function () {
		},

		/**
		 * Handler for when the user types a character.
		 * @param {string} char
		 * @returns {boolean} True if focus should be moved to next field.     `
		 */
		type: function () {
		}
	});

	/**
	 * Non-editable field.
	 */
	var Delimiter = dcl(Field, {
		editable: false
	});

	/**
	 * Generic number field.
	 */
	var NumberField = dcl(Field, {
		/**
		 * Number of characters user has typed into this field since it was focused.
		 */
		charactersTyped: 0,

		focus: function () {
			this.charactersTyped = 0;
		},

		clear: function () {
			delete this.value;
			this.charactersTyped = 0;
		},

		type: function (char) {
			if (/[0-9]/.test(char)) {
				if (this.charactersTyped === 0) {
					// For the first character the user types, replace the boilerplate text (ex: "yyyy")
					// with zeros followed by the character the user typed.
					this.value = (new Array(this.boilerplate.length)).join("0") + char;
				} else {
					// Otherwise, slide the other characters over and insert new character at right,
					// for example if the user types "3" then "0002" is changed to "0023".
					this.value = this.value.substr(1) + char;
				}

				this.charactersTyped++;
			}

			// Return true if focus should advance to next field.
			return  this.charactersTyped >= this.boilerplate.length;
		}
	});

	/**
	 * A base class for Textboxes like DateTextbox and TimeTextbox that will enforce a specified pattern.
	 */
	var BoilerplateTextbox = dcl([FormValueWidget], {
		baseClass: "d-boilerplate-textbox",

		template: template,

		// TODO: rename to fields[].
		/**
		 * List of sections of the <input> the user can edit,
		 * @member {BoilerplateTextbox.Field[]}
		 */
		sections: [],

		/**
		 * The index of the section that's currently being edited.
		 */
		currentSectionIndex: -1,

		/**
		 * True if the BoilerplateTextbox was just focused.
		 */
		justFocused: false,

		/**
		 * The value is only stored split up in `sections[]` but the `value` property
		 * is an alternate interface to set/get the value.
		 */
		value: "",
		_setValueAttr: function (value) {
			var start = 0;
			this.sections.forEach(function (section) {
				var length = section.boilerplate.length;
				if (section.editable) {
					section.value = value ? value.substr(start, length) : null;
				}
				start += length;
			});
			this.notifyCurrentValue("sections");
		},
		_getValueAttr: function () {
			// Return concatenated values of fields.
			// If none of the fields have values then return "".
			// Unclear what to return when some (but not all) of the fields have values.
			if (this.sections.some(function (section) { return !section.editable || section.value; })) {
				return this.sections.map(function (section) {
					return section.value || section.boilerplate;
				}).join("");
			} else {
				return "";
			}
		},

		postRender: function () {
			this.on("focus", this.focusHandler.bind(this), this.focusNode);
			this.on("keydown", this.keydownHandler.bind(this), this.focusNode);
			this.on("click", this.clickHandler.bind(this), this.focusNode);
		},

		refreshRendering: function (oldVals) {
			if ("sections" in oldVals) {
				this.focusNode.value = this.sections.map(function (section) {
					return section.value || section.boilerplate;
				}).join("");
			}

			if ("currentSectionIndex" in oldVals && this.currentSectionIndex >= 0) {
				this.sections[this.currentSectionIndex].focus();
			}

			if (this.currentSectionIndex >= 0 && ("currentSectionIndex" in oldVals || "sections" in oldVals)) {
				// Compute starting position of current section.
				var start = 0;
				for (var i = 0; i < this.currentSectionIndex; i++) {
					start += (this.sections[i].value || this.sections[i].boilerplate).length;
				}

				// Select text of current section.
				var currentSection = this.sections[this.currentSectionIndex],
					text = currentSection.value || currentSection.boilerplate;
				this.focusNode.setSelectionRange(start, start + text.length);
			}
		},

		focusHandler: function () {
			this.justFocused = true;

			// On focus, select the first input section.
			// Note: On IE, firefox, and safari you need a delay after focus before setting selection.
			this.defer(function () {
				this.currentSectionIndex = 0;

				// Use notifyCurrentValue() to trigger processing even if currentSection was already set to 0.
				this.notifyCurrentValue("currentSectionIndex");

				this.defer(function () {
					this.justFocused = false;
				}, 100);
			});
		},

		/**
		 * Handler for tab and shift-tab.
		 * @param shift - True if user pressed shift-tab, false if user just pressed tab.
		 * @returns {boolean} True if tab was handled internally, false if browser should handle it.
		 */
		tabHandler: function (shift) {
			var csn;
			if (shift) {
				for (csn = this.currentSectionIndex - 1; csn >= 0; csn--) {
					if (this.sections[csn].editable) {
						this.currentSectionIndex = csn;
						return true;
					}
				}
			} else {
				for (csn = this.currentSectionIndex + 1; csn < this.sections.length; csn++) {
					if (this.sections[csn].editable) {
						this.currentSectionIndex = csn;
						return true;
					}
				}
			}

			// Signal that tab should be handled by browser.
			return false;
		},

		keydownHandler: function (evt) {
			// Handle all keystrokes programatically.
			var currentSection = this.sections[this.currentSectionIndex];

			if (evt.key === "Delete" || evt.key === "Backspace") {
				currentSection.clear();
				this.notifyCurrentValue("sections");
				this.deliver();
				evt.preventDefault();
			} else if (evt.key === "Tab") {
				// Either move to another section or move out of the BoilerplateTextbox competely.
				var handled = this.tabHandler(evt.shiftKey);
				if (handled) {
					this.deliver();
					evt.preventDefault();
				}
			} else {
				// Send keystroke to current field.
				var advance = currentSection.type(evt.key);
				this.notifyCurrentValue("sections");

				if (advance) {
					// User has finished typing this field so go to next field, if there is one.
					for (var csn = this.currentSectionIndex + 1; csn < this.sections.length; csn++) {
						if (this.sections[csn].editable) {
							this.currentSectionIndex = csn;
							break;
						}
					}
				}

				this.deliver();

				evt.preventDefault();
			}
		},

		clickHandler: function () {
			if (!this.justFocused) {
				// Figure out which editable field was clicked, and focus it.
				var start = 0;
				for (var i = 0; i < this.sections.length; i++) {
					var section = this.sections[i],
						end = start + (section.value || section.boilerplate).length;
					if (section.editable && this.focusNode.selectionStart <= end) {
						this.currentSectionIndex = i;
						break;
					}
					start = end;
				}
			}
		}
	});

	BoilerplateTextbox.Field = Field;
	BoilerplateTextbox.Delimiter = Delimiter;
	BoilerplateTextbox.NumberField = NumberField;

	return BoilerplateTextbox;
});
