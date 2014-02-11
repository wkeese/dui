define(["intern!object",
	"intern/chai!assert",
	"require"
], function (registerSuite, assert, require) {

	registerSuite({
		name: "KeyNav functional tests",

		"setup": function () {
			return this.remote
				.get(require.toUrl("./KeyNavTests.html"))
				.waitForCondition("ready", 10000);
		},

		"tabindex": function () {
			if (/safari|iPhone/.test(this.remote.environmentType.browserName)) {
				// SafariDriver doesn't support tabbing, see https://code.google.com/p/selenium/issues/detail?id=5403
				return;
			}
			return this.remote.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "autofocusInput", "initial element");
					})
				.keys("\uE004") // tab
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "one", "tabbed to one");
					})
				.keys("\uE008\uE004") // shift tab
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "autofocusInput", "shift tabbed back to autofocusInput");
					})
				.keys("\uE008") // release shift
				.keys("\uE004") // tab
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "one", "tabbed to one again");
					})
				.keys("\uE004") // tab
				.execute("return document.activeElement.textContent")
				.then(function (value) {
					assert.equal(value, "six", "tabbed to first element on programmatic KeyNav w/implicit tabIndex");
				})
				.execute("secondInput.focus()")// don't tab from previous KeyNav, it goes to address bar [on chrome]
				.execute("return document.activeElement.value")
				.then(function (value) {
					assert.equal(value, "tabindex=2", "focused input before prog KeyNav w/tabindex=3 setting");
				})
				.keys("\uE004") // tab
				.execute("return document.activeElement.textContent")
				.then(function (value) {
					assert.equal(value, "nine", "tabbed to declarative KeyNav with tabindex=3 setting");
				})
				.keys("\uE004") // tab
				.keys("\uE004") // tab
				.execute("return document.activeElement.textContent")
				.then(function (value) {
					assert.equal(value, "twelve", "tabbed past INPUT to programmatic KeyNav with tabindex=5 setting");
				})
				.keys("\uE004") // tab
				.keys(" ") // click the button, changing previous KeyNav to tabindex=7
				.keys("\uE004") // tab
				.execute("return document.activeElement.textContent")
				.then(function (value) {
					assert.equal(value, "twelve", "dynamic tabindex change worked");
				})

		},
		"intra widget arrow navigation": function () {
			if (/safari|iPhone/.test(this.remote.environmentType.browserName)) {
				// SafariDriver doesn't support tabbing, see https://code.google.com/p/selenium/issues/detail?id=5403
				return;
		}
			return this.remote.execute("autofocusInput.focus();")
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "autofocusInput", "start on autofocusInput");
					})
				.keys("\uE004") // tab
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "one", "tabbed to one");
					})
				.keys("\uE015") // arrow down
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "two", "arrowed to two");
					})
				.keys("\uE015") // arrow down
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "three", "arrowed to three");
					})
				.keys("\uE015") // arrow down
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "four", "arrowed to four");
					})
				.keys("\uE015") // arrow down
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "five", "arrowed to five");
					})
				.keys("\uE015") // arrow down
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "five", "still on five");
					})
				.keys("\uE013") // arrow up
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "four", "back to four");
					})
				.keys("\uE013") // arrow up
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal(value, "three", "back to three");
					})
				.keys("\uE013") // arrow up
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal("two", value, "back to two");
					})
				.keys("\uE013") // arrow up
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal("one", value, "back to one");
					})
				.keys("\uE013") // arrow up
				.execute("return document.activeElement.id")
					.then(function (value) {
						assert.equal("one", value, "still on one");
					});

				// TODO:  test home/end
		}

		// TODO: test letter search
	});
});