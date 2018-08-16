---
layout: doc
title: delite/register
---

# delite/register

**register** is a utility module for defining custom elements.

## Usage

You declare a new widget that is based off a DOM object that either is
`HTMLElement` or implements `HTMLElement`, and also extends [`delite/CustomElement`](CustomElement.md) directly or indirectly.
Typically you will extend [`delite/Widget`](Widget.md) or a subclass of [`delite/Widget`](Widget.md) rather than extending
[`delite/CustomElement`](CustomElement.md) directly.

To register the most basic of widgets, you would do the following:

```js
require(["delite/register", "delite/Widget"], function (register, Widget) {
	var MyWidget = register("my-widget", [HTMLElement, Widget], {
		foo: "bar"
	});
});
```

You can instantiate the widget programatically:

```js
var mywidget1 = new MyWidget();
```

or using the custom tag in your HTML:

```html
<my-widget></my-widget>
```

You can think of `register` as a combination of a class declaration system (internally it uses [dcl](http://dcljs.org),
and [customElements.define](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements)
from the custom elements standards.


`register()` takes three arguments:

* `tag` - Is a string that provides the custom element tag name which can be used to instantiate the widget.  The string
  should be unique and should contain at least one dash (`-`).  If there is already a widget
  registered with that tag name, `.register()` will throw an exception.

* `extensions...` - An array of constructor functions which are used
  to create the prototype of the widget class.  They are mixed in left to right.  The first
  class/constructor function must have `HTMLElement` in its prototype chain.  This serves as the
  foundation for the widget.   Widget should typically be directly or indirectly pulled in too.

* `props` - A set of properties for the widget

## Extensions

As mentioned above, the first extension must be a class/constructor function that has `HTMLElement` in its prototype
chain.  This will serve as the base element for the custom element that is part of your widget.  `HTMLElement` has an
interface that is roughly equivalent to the `<div>` tag and is the ancestor of all the HTML* DOM Elements.  If your
widget doesn't need any special features offered by other tags, `HTMLElement` is likely your best base for your widget.

If your widget through is designed to be an "extension" of another HTML element, for example a `<button>`, then you
should consider utilising a different base for your widget.  This will ensure your widget will "behave" like that other
root HTML element.  For example, to create something that extends a `<button>`, you would do something like this:

```js
require(["delite/register", "delite/Widget"], function (register, Widget) {
	var MyButton = register("my-widget", [HTMLButtonElement, Widget], {
		foo: "bar"
	});
});
```

And if you then wanted to instantiate this widget in HTML, you would use the following in markup:

```html
<button is="my-button"></button>
```

You can also extend other widgets, but not base classes like [`delite/Widget`](Widget.md) that don't have `HTMLElement` in their
prototype chain.  If you are subclassing another widget, you should just use that as the base instead of one of the
`HTML*` elements.  For example, to create your own subclass of `deliteful/Button`:

```js
require(["delite/register", "deliteful/Button"], function (register, Button) {
	var MyButtonSubClass = register("my-button-subclass", Button, {
		foo: "bar"
	});
});
```

And instantiate programatically:

```js
var mybutton1 = new MyButtonSubClass();
```

or declaratively via HTML using the `is` attribute:

```html
<button is="my-button-subclass"></button>
```

Because `deliteful/Button` has `HTMLButtonElement` as its base, it means that any subclasses need to utilise that root
tag when instantiating via element creation.  This means you should know if the widget you are descending from builds
on top of a base other than `HTMLElement`.


## Standards

`register()` tries to conform to the custom elements standard.
Internally, it calls `customElements.define()`, and if that method
isn't defined by the browser, then it loads the webcomponentjs polyfill.

