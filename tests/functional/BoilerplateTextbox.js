define([
	"require",
	"intern",
	"intern!object",
	"intern/chai!assert",
	"intern/dojo/node!leadfoot/keys",
	"intern/dojo/node!leadfoot/helpers/pollUntil"
], function (require, intern, registerSuite, assert, keys, pollUntil) {

	// Functional tests for BoilerplateTextbox.
	// Unfortunately webdriver's imperfect keystroke simulation doesn't work well with BoilerplateTextBox's
	// synthetic handling of keyboard event, except on IE, so I had to instead manually emit synthetic keyboard
	// events.

	registerSuite({
		name: "BoilerplateTextbox functional tests",

		setup: function () {
			return this.remote
				.get(require.toUrl("./BoilerplateTextbox.html"))
				.then(pollUntil("return ready || null;", [],
					intern.config.WAIT_TIMEOUT, intern.config.POLL_INTERVAL));
		},

		beforeEach: function () {
			return this.remote
				.findById("reset").click().end()	// set BoilerplateTextboxes to original values
				.findById("pi").click().end();		// focus on <input> before BoilerplateTextboxes
		},

		basic: function () {
			return this.remote
				.findById("dt1-input").click().end()
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["mm/dd/yyyy", 0, 2], "mm selected");
				})
				.execute("dt1.emit('keydown', {key: '1'}, dt1.focusNode);")
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["01/dd/yyyy", 0, 2], "mm selected, 1 typed");
				})
				.execute("dt1.emit('keydown', {key: '2'}, dt1.focusNode);")
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["12/dd/yyyy", 3, 5], "focus automatically moves to next field");
				})
				.execute("dt1.emit('keydown', {key: '3'}, dt1.focusNode);")
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["12/03/yyyy", 3, 5], "3 typed");
				})
				.execute("dt1.emit('keydown', {key: 'Tab'}, dt1.focusNode);")
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["12/03/yyyy", 6, 10], "tab skips to next field");
				})
				.execute("dt1.emit('keydown', {key: '2'}, dt1.focusNode);")
				.execute("dt1.emit('keydown', {key: '0'}, dt1.focusNode);")
				.execute("dt1.emit('keydown', {key: '1'}, dt1.focusNode);")
				.execute("dt1.emit('keydown', {key: '7'}, dt1.focusNode);")
				.execute("return document.activeElement.value;").then(function (text) {
					assert.strictEqual(text, "12/03/2017", "typed year, focus still on dt1");
				})
				.execute("dt1.emit('keydown', {key: 'Tab', shiftKey: true}, dt1.focusNode);")
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["12/03/2017", 3, 5], "shift-tab goes back to previous field");
				});
		},

		"tab into and out of element": function () {
			if (this.remote.environmentType.brokenSendKeys || !this.remote.environmentType.nativeEvents) {
				return this.skip("no keyboard support");
			}

			return this.remote
				.findById("pi").click().end()
				.pressKeys(keys.TAB)
				.execute("return document.activeElement.id;").then(function (id) {
					assert.strictEqual(id, "dt1-input", "tab into dt1");
				})
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["mm/dd/yyyy", 0, 2], "mm selected");
				})
				.execute("dt1.emit('keydown', {key: 'Tab'}, dt1.focusNode);")
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["mm/dd/yyyy", 3, 5], "dd selected");
				})
				.execute("dt1.emit('keydown', {key: 'Tab'}, dt1.focusNode);")
				.execute("return state(dt1);").then(function (v) {
					assert.deepEqual(v, ["mm/dd/yyyy", 6, 10], "yyyy selected");
				})
				.pressKeys(keys.TAB)
				.execute("return document.activeElement.id;").then(function (id) {
					assert.strictEqual(id, "dt2-input", "tab out of dt1");
				});
		},

		"shift tab to previous element": function () {
			if (this.remote.environmentType.brokenSendKeys || !this.remote.environmentType.nativeEvents) {
				return this.skip("no keyboard support");
			}

			if (this.remote.environmentType.browserName === "internet explorer") {
				return this.skip("shift-tab keydown event broken for IE webdriver, evt.shiftKey not set");
			}

			return this.remote
				.findById("tt1-input").click().end()
				.pressKeys(keys.SHIFT + keys.TAB)
				.execute("return document.activeElement.id;").then(function (id) {
					assert.strictEqual(id, "dt2-input", "shift-tab from first field moves to previous element");
				});
		},

		backspace: function () {
			return this.remote
				.findById("dt2-input").click().end()
				.execute("return state(dt2);").then(function (v) {
					assert.deepEqual(v, ["07/04/2008", 0, 2], "month selected");
				})
				.execute("dt2.emit('keydown', {key: 'Backspace'}, dt2.focusNode);")
				.execute("return state(dt2);").then(function (v) {
					assert.deepEqual(v, ["mm/04/2008", 0, 2], "month cleared");
				})
				.execute("dt2.emit('keydown', {key: '9'}, dt2.focusNode);")
				.execute("return state(dt2);").then(function (v) {
					assert.deepEqual(v, ["09/04/2008", 0, 2], "month partially typed");
				})
				.execute("dt2.emit('keydown', {key: 'Backspace'}, dt2.focusNode);")
				.execute("return state(dt2);").then(function (v) {
					assert.deepEqual(v, ["mm/04/2008", 0, 2], "month cleared again");
				});
		}

		// TODO: if possible, after element is focused and selection is "mm", test clicking "yyyy" to move focus there.
	});
});
