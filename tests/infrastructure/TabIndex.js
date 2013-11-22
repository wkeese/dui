define(["intern!object",
	"intern/chai!assert",
	"require"
], function (registerSuite, assert, require) {

	registerSuite({
		name: "tabIndex functional tests",

		"safari fails": function () {
			return this.remote
				.get(require.toUrl("./TabIndex.html"))
				.waitForCondition("ready", 10000)
				.elementById("d1")
				.click()		// start on first element, before widgets
				.keys("hello");
		}
	});
});