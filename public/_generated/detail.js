(function () {
	'use strict';

	function noop() {}

	function assign(tar, src) {
		for (var k in src) tar[k] = src[k];
		return tar;
	}

	function assignTrue(tar, src) {
		for (var k in src) tar[k] = 1;
		return tar;
	}

	function addLoc(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detachNode(node) {
		node.parentNode.removeChild(node);
	}

	function detachAfter(before) {
		while (before.nextSibling) {
			before.parentNode.removeChild(before.nextSibling);
		}
	}

	function reinsertChildren(parent, target) {
		while (parent.firstChild) target.appendChild(parent.firstChild);
	}

	function destroyEach(iterations, detach) {
		for (var i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detach);
		}
	}

	function createFragment() {
		return document.createDocumentFragment();
	}

	function createElement(name) {
		return document.createElement(name);
	}

	function createSvgElement(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	function createText(data) {
		return document.createTextNode(data);
	}

	function createComment() {
		return document.createComment('');
	}

	function addListener(node, event, handler, options) {
		node.addEventListener(event, handler, options);
	}

	function removeListener(node, event, handler, options) {
		node.removeEventListener(event, handler, options);
	}

	function setAttribute(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function toNumber(value) {
		return value === '' ? undefined : +value;
	}

	function setData(text, data) {
		text.data = '' + data;
	}

	function setStyle(node, key, value) {
		node.style.setProperty(key, value);
	}

	function addResizeListener(element, fn) {
		if (getComputedStyle(element).position === 'static') {
			element.style.position = 'relative';
		}

		const object = document.createElement('object');
		object.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
		object.type = 'text/html';

		let win;

		object.onload = () => {
			win = object.contentDocument.defaultView;
			win.addEventListener('resize', fn);
		};

		if (/Trident/.test(navigator.userAgent)) {
			element.appendChild(object);
			object.data = 'about:blank';
		} else {
			object.data = 'about:blank';
			element.appendChild(object);
		}

		return {
			cancel: () => {
				win && win.removeEventListener && win.removeEventListener('resize', fn);
				element.removeChild(object);
			}
		};
	}

	function blankObject() {
		return Object.create(null);
	}

	function destroy(detach) {
		this.destroy = noop;
		this.fire('destroy');
		this.set = noop;

		this._fragment.d(detach !== false);
		this._fragment = null;
		this._state = {};
	}

	function destroyDev(detach) {
		destroy.call(this, detach);
		this.destroy = function() {
			console.warn('Component was already destroyed');
		};
	}

	function _differs(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function fire(eventName, data) {
		var handlers =
			eventName in this._handlers && this._handlers[eventName].slice();
		if (!handlers) return;

		for (var i = 0; i < handlers.length; i += 1) {
			var handler = handlers[i];

			if (!handler.__calling) {
				try {
					handler.__calling = true;
					handler.call(this, data);
				} finally {
					handler.__calling = false;
				}
			}
		}
	}

	function flush(component) {
		component._lock = true;
		callAll(component._beforecreate);
		callAll(component._oncreate);
		callAll(component._aftercreate);
		component._lock = false;
	}

	function get() {
		return this._state;
	}

	function init(component, options) {
		component._handlers = blankObject();
		component._slots = blankObject();
		component._bind = options._bind;
		component._staged = {};

		component.options = options;
		component.root = options.root || component;
		component.store = options.store || component.root.store;

		if (!options.root) {
			component._beforecreate = [];
			component._oncreate = [];
			component._aftercreate = [];
		}
	}

	function on(eventName, handler) {
		var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
		handlers.push(handler);

		return {
			cancel: function() {
				var index = handlers.indexOf(handler);
				if (~index) handlers.splice(index, 1);
			}
		};
	}

	function set(newState) {
		this._set(assign({}, newState));
		if (this.root._lock) return;
		flush(this.root);
	}

	function _set(newState) {
		var oldState = this._state,
			changed = {},
			dirty = false;

		newState = assign(this._staged, newState);
		this._staged = {};

		for (var key in newState) {
			if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
		}
		if (!dirty) return;

		this._state = assign(assign({}, oldState), newState);
		this._recompute(changed, this._state);
		if (this._bind) this._bind(changed, this._state);

		if (this._fragment) {
			this.fire("state", { changed: changed, current: this._state, previous: oldState });
			this._fragment.p(changed, this._state);
			this.fire("update", { changed: changed, current: this._state, previous: oldState });
		}
	}

	function _stage(newState) {
		assign(this._staged, newState);
	}

	function setDev(newState) {
		if (typeof newState !== 'object') {
			throw new Error(
				this._debugName + '.set was called without an object of data key-values to update.'
			);
		}

		this._checkReadOnly(newState);
		set.call(this, newState);
	}

	function callAll(fns) {
		while (fns && fns.length) fns.shift()();
	}

	function _mount(target, anchor) {
		this._fragment[this._fragment.i ? 'i' : 'm'](target, anchor || null);
	}

	var protoDev = {
		destroy: destroyDev,
		get,
		fire,
		on,
		set: setDev,
		_recompute: noop,
		_set,
		_stage,
		_mount,
		_differs
	};

	// Computes the decimal coefficient and exponent of the specified number x with
	// significant digits p, where x is positive and p is in [1, 21] or undefined.
	// For example, formatDecimal(1.23) returns ["123", 0].
	function formatDecimal(x, p) {
	  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
	  var i, coefficient = x.slice(0, i);

	  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
	  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
	  return [
	    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
	    +x.slice(i + 1)
	  ];
	}

	function exponent(x) {
	  return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
	}

	function formatGroup(grouping, thousands) {
	  return function(value, width) {
	    var i = value.length,
	        t = [],
	        j = 0,
	        g = grouping[0],
	        length = 0;

	    while (i > 0 && g > 0) {
	      if (length + g + 1 > width) g = Math.max(1, width - length);
	      t.push(value.substring(i -= g, i + g));
	      if ((length += g + 1) > width) break;
	      g = grouping[j = (j + 1) % grouping.length];
	    }

	    return t.reverse().join(thousands);
	  };
	}

	function formatNumerals(numerals) {
	  return function(value) {
	    return value.replace(/[0-9]/g, function(i) {
	      return numerals[+i];
	    });
	  };
	}

	// [[fill]align][sign][symbol][0][width][,][.precision][~][type]
	var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

	function formatSpecifier(specifier) {
	  return new FormatSpecifier(specifier);
	}

	formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

	function FormatSpecifier(specifier) {
	  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
	  var match;
	  this.fill = match[1] || " ";
	  this.align = match[2] || ">";
	  this.sign = match[3] || "-";
	  this.symbol = match[4] || "";
	  this.zero = !!match[5];
	  this.width = match[6] && +match[6];
	  this.comma = !!match[7];
	  this.precision = match[8] && +match[8].slice(1);
	  this.trim = !!match[9];
	  this.type = match[10] || "";
	}

	FormatSpecifier.prototype.toString = function() {
	  return this.fill
	      + this.align
	      + this.sign
	      + this.symbol
	      + (this.zero ? "0" : "")
	      + (this.width == null ? "" : Math.max(1, this.width | 0))
	      + (this.comma ? "," : "")
	      + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0))
	      + (this.trim ? "~" : "")
	      + this.type;
	};

	// Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
	function formatTrim(s) {
	  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
	    switch (s[i]) {
	      case ".": i0 = i1 = i; break;
	      case "0": if (i0 === 0) i0 = i; i1 = i; break;
	      default: if (i0 > 0) { if (!+s[i]) break out; i0 = 0; } break;
	    }
	  }
	  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
	}

	var prefixExponent;

	function formatPrefixAuto(x, p) {
	  var d = formatDecimal(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1],
	      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
	      n = coefficient.length;
	  return i === n ? coefficient
	      : i > n ? coefficient + new Array(i - n + 1).join("0")
	      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
	      : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
	}

	function formatRounded(x, p) {
	  var d = formatDecimal(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1];
	  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
	      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
	      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
	}

	var formatTypes = {
	  "%": function(x, p) { return (x * 100).toFixed(p); },
	  "b": function(x) { return Math.round(x).toString(2); },
	  "c": function(x) { return x + ""; },
	  "d": function(x) { return Math.round(x).toString(10); },
	  "e": function(x, p) { return x.toExponential(p); },
	  "f": function(x, p) { return x.toFixed(p); },
	  "g": function(x, p) { return x.toPrecision(p); },
	  "o": function(x) { return Math.round(x).toString(8); },
	  "p": function(x, p) { return formatRounded(x * 100, p); },
	  "r": formatRounded,
	  "s": formatPrefixAuto,
	  "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
	  "x": function(x) { return Math.round(x).toString(16); }
	};

	function identity(x) {
	  return x;
	}

	var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

	function formatLocale(locale) {
	  var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity,
	      currency = locale.currency,
	      decimal = locale.decimal,
	      numerals = locale.numerals ? formatNumerals(locale.numerals) : identity,
	      percent = locale.percent || "%";

	  function newFormat(specifier) {
	    specifier = formatSpecifier(specifier);

	    var fill = specifier.fill,
	        align = specifier.align,
	        sign = specifier.sign,
	        symbol = specifier.symbol,
	        zero = specifier.zero,
	        width = specifier.width,
	        comma = specifier.comma,
	        precision = specifier.precision,
	        trim = specifier.trim,
	        type = specifier.type;

	    // The "n" type is an alias for ",g".
	    if (type === "n") comma = true, type = "g";

	    // The "" type, and any invalid type, is an alias for ".12~g".
	    else if (!formatTypes[type]) precision == null && (precision = 12), trim = true, type = "g";

	    // If zero fill is specified, padding goes after sign and before digits.
	    if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

	    // Compute the prefix and suffix.
	    // For SI-prefix, the suffix is lazily computed.
	    var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
	        suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? percent : "";

	    // What format function should we use?
	    // Is this an integer type?
	    // Can this type generate exponential notation?
	    var formatType = formatTypes[type],
	        maybeSuffix = /[defgprs%]/.test(type);

	    // Set the default precision if not specified,
	    // or clamp the specified precision to the supported range.
	    // For significant precision, it must be in [1, 21].
	    // For fixed precision, it must be in [0, 20].
	    precision = precision == null ? 6
	        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
	        : Math.max(0, Math.min(20, precision));

	    function format(value) {
	      var valuePrefix = prefix,
	          valueSuffix = suffix,
	          i, n, c;

	      if (type === "c") {
	        valueSuffix = formatType(value) + valueSuffix;
	        value = "";
	      } else {
	        value = +value;

	        // Perform the initial formatting.
	        var valueNegative = value < 0;
	        value = formatType(Math.abs(value), precision);

	        // Trim insignificant zeros.
	        if (trim) value = formatTrim(value);

	        // If a negative value rounds to zero during formatting, treat as positive.
	        if (valueNegative && +value === 0) valueNegative = false;

	        // Compute the prefix and suffix.
	        valuePrefix = (valueNegative ? (sign === "(" ? sign : "-") : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
	        valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

	        // Break the formatted value into the integer “value” part that can be
	        // grouped, and fractional or exponential “suffix” part that is not.
	        if (maybeSuffix) {
	          i = -1, n = value.length;
	          while (++i < n) {
	            if (c = value.charCodeAt(i), 48 > c || c > 57) {
	              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
	              value = value.slice(0, i);
	              break;
	            }
	          }
	        }
	      }

	      // If the fill character is not "0", grouping is applied before padding.
	      if (comma && !zero) value = group(value, Infinity);

	      // Compute the padding.
	      var length = valuePrefix.length + value.length + valueSuffix.length,
	          padding = length < width ? new Array(width - length + 1).join(fill) : "";

	      // If the fill character is "0", grouping is applied after padding.
	      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

	      // Reconstruct the final output based on the desired alignment.
	      switch (align) {
	        case "<": value = valuePrefix + value + valueSuffix + padding; break;
	        case "=": value = valuePrefix + padding + value + valueSuffix; break;
	        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
	        default: value = padding + valuePrefix + value + valueSuffix; break;
	      }

	      return numerals(value);
	    }

	    format.toString = function() {
	      return specifier + "";
	    };

	    return format;
	  }

	  function formatPrefix(specifier, value) {
	    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
	        e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
	        k = Math.pow(10, -e),
	        prefix = prefixes[8 + e / 3];
	    return function(value) {
	      return f(k * value) + prefix;
	    };
	  }

	  return {
	    format: newFormat,
	    formatPrefix: formatPrefix
	  };
	}

	var locale;
	var format;
	var formatPrefix;

	defaultLocale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["$", ""]
	});

	function defaultLocale(definition) {
	  locale = formatLocale(definition);
	  format = locale.format;
	  formatPrefix = locale.formatPrefix;
	  return locale;
	}

	/* src/library/Button.html generated by Svelte v2.15.3 */

	const file = "src/library/Button.html";

	function create_main_fragment(component, ctx) {
		var button, slot_content_default = component._slotted.default;

		function click_handler(event) {
			component.fire('click');
		}

		return {
			c: function create() {
				button = createElement("button");
				addListener(button, "click", click_handler);
				button.className = "svelte-1d81900";
				addLoc(button, file, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, button, anchor);

				if (slot_content_default) {
					append(button, slot_content_default);
				}
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(button);
				}

				if (slot_content_default) {
					reinsertChildren(button, slot_content_default);
				}

				removeListener(button, "click", click_handler);
			}
		};
	}

	function Button(options) {
		this._debugName = '<Button>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Button.prototype, protoDev);

	Button.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/icons/svg/baseline-add-24px.svg generated by Svelte v2.15.3 */

	const file$1 = "src/library/icons/svg/baseline-add-24px.svg";

	function create_main_fragment$1(component, ctx) {
		var svg, path0, path1;

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path0 = createSvgElement("path");
				path1 = createSvgElement("path");
				setAttribute(path0, "d", "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z");
				addLoc(path0, file$1, 0, 83, 83);
				setAttribute(path1, "d", "M0 0h24v24H0z");
				setAttribute(path1, "fill", "none");
				addLoc(path1, file$1, 0, 130, 130);
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "width", "24");
				setAttribute(svg, "height", "24");
				setAttribute(svg, "viewBox", "0 0 24 24");
				addLoc(svg, file$1, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path0);
				append(svg, path1);
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(svg);
				}
			}
		};
	}

	function Baseline_add_24px(options) {
		this._debugName = '<Baseline_add_24px>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		this._intro = true;

		this._fragment = create_main_fragment$1(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Baseline_add_24px.prototype, protoDev);

	Baseline_add_24px.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/icons/svg/baseline-remove-24px.svg generated by Svelte v2.15.3 */

	const file$2 = "src/library/icons/svg/baseline-remove-24px.svg";

	function create_main_fragment$2(component, ctx) {
		var svg, path0, path1;

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path0 = createSvgElement("path");
				path1 = createSvgElement("path");
				setAttribute(path0, "d", "M19 13H5v-2h14v2z");
				addLoc(path0, file$2, 0, 83, 83);
				setAttribute(path1, "d", "M0 0h24v24H0z");
				setAttribute(path1, "fill", "none");
				addLoc(path1, file$2, 0, 112, 112);
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "width", "24");
				setAttribute(svg, "height", "24");
				setAttribute(svg, "viewBox", "0 0 24 24");
				addLoc(svg, file$2, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path0);
				append(svg, path1);
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(svg);
				}
			}
		};
	}

	function Baseline_remove_24px(options) {
		this._debugName = '<Baseline_remove_24px>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		this._intro = true;

		this._fragment = create_main_fragment$2(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Baseline_remove_24px.prototype, protoDev);

	Baseline_remove_24px.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/icons/svg/baseline-home-24px.svg generated by Svelte v2.15.3 */

	const file$3 = "src/library/icons/svg/baseline-home-24px.svg";

	function create_main_fragment$3(component, ctx) {
		var svg, path0, path1;

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path0 = createSvgElement("path");
				path1 = createSvgElement("path");
				setAttribute(path0, "d", "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z");
				addLoc(path0, file$3, 0, 83, 83);
				setAttribute(path1, "d", "M0 0h24v24H0z");
				setAttribute(path1, "fill", "none");
				addLoc(path1, file$3, 0, 130, 130);
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "width", "24");
				setAttribute(svg, "height", "24");
				setAttribute(svg, "viewBox", "0 0 24 24");
				addLoc(svg, file$3, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path0);
				append(svg, path1);
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(svg);
				}
			}
		};
	}

	function Baseline_home_24px(options) {
		this._debugName = '<Baseline_home_24px>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		this._intro = true;

		this._fragment = create_main_fragment$3(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Baseline_home_24px.prototype, protoDev);

	Baseline_home_24px.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/icons/Navigation.html generated by Svelte v2.15.3 */



	function Icon({name}) {
	  if (name === "home") return Baseline_home_24px;
	  if (name === "add") return Baseline_add_24px;
	  if (name === "remove") return Baseline_remove_24px;
	}

	function data() {
	  return {
	    color: "black"
	  }
	}
	const file$4 = "src/library/icons/Navigation.html";

	function create_main_fragment$4(component, ctx) {
		var div;

		var switch_value = ctx.Icon;

		function switch_props(ctx) {
			return {
				root: component.root,
				store: component.store
			};
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
		}

		return {
			c: function create() {
				div = createElement("div");
				if (switch_instance) switch_instance._fragment.c();
				setStyle(div, "fill", ctx.color);
				addLoc(div, file$4, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				if (switch_instance) {
					switch_instance._mount(div, null);
				}
			},

			p: function update(changed, ctx) {
				if (switch_value !== (switch_value = ctx.Icon)) {
					if (switch_instance) {
						switch_instance.destroy();
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						switch_instance._fragment.c();
						switch_instance._mount(div, null);
					} else {
						switch_instance = null;
					}
				}

				if (changed.color) {
					setStyle(div, "fill", ctx.color);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (switch_instance) switch_instance.destroy();
			}
		};
	}

	function Navigation(options) {
		this._debugName = '<Navigation>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data(), options.data);

		this._recompute({ name: 1 }, this._state);
		if (!('name' in this._state)) console.warn("<Navigation> was created without expected data property 'name'");
		if (!('color' in this._state)) console.warn("<Navigation> was created without expected data property 'color'");
		this._intro = true;

		this._fragment = create_main_fragment$4(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Navigation.prototype, protoDev);

	Navigation.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('Icon' in newState && !this._updatingReadonlyProperty) throw new Error("<Navigation>: Cannot set read-only property 'Icon'");
	};

	Navigation.prototype._recompute = function _recompute(changed, state) {
		if (changed.name) {
			if (this._differs(state.Icon, (state.Icon = Icon(state)))) changed.Icon = true;
		}
	};

	var EOL = {},
	    EOF = {},
	    QUOTE = 34,
	    NEWLINE = 10,
	    RETURN = 13;

	function objectConverter(columns) {
	  return new Function("d", "return {" + columns.map(function(name, i) {
	    return JSON.stringify(name) + ": d[" + i + "]";
	  }).join(",") + "}");
	}

	function customConverter(columns, f) {
	  var object = objectConverter(columns);
	  return function(row, i) {
	    return f(object(row), i, columns);
	  };
	}

	// Compute unique columns in order of discovery.
	function inferColumns(rows) {
	  var columnSet = Object.create(null),
	      columns = [];

	  rows.forEach(function(row) {
	    for (var column in row) {
	      if (!(column in columnSet)) {
	        columns.push(columnSet[column] = column);
	      }
	    }
	  });

	  return columns;
	}

	function dsv(delimiter) {
	  var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
	      DELIMITER = delimiter.charCodeAt(0);

	  function parse(text, f) {
	    var convert, columns, rows = parseRows(text, function(row, i) {
	      if (convert) return convert(row, i - 1);
	      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
	    });
	    rows.columns = columns || [];
	    return rows;
	  }

	  function parseRows(text, f) {
	    var rows = [], // output rows
	        N = text.length,
	        I = 0, // current character index
	        n = 0, // current line number
	        t, // current token
	        eof = N <= 0, // current token followed by EOF?
	        eol = false; // current token followed by EOL?

	    // Strip the trailing newline.
	    if (text.charCodeAt(N - 1) === NEWLINE) --N;
	    if (text.charCodeAt(N - 1) === RETURN) --N;

	    function token() {
	      if (eof) return EOF;
	      if (eol) return eol = false, EOL;

	      // Unescape quotes.
	      var i, j = I, c;
	      if (text.charCodeAt(j) === QUOTE) {
	        while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
	        if ((i = I) >= N) eof = true;
	        else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
	        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
	        return text.slice(j + 1, i - 1).replace(/""/g, "\"");
	      }

	      // Find next delimiter or newline.
	      while (I < N) {
	        if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
	        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
	        else if (c !== DELIMITER) continue;
	        return text.slice(j, i);
	      }

	      // Return last token before EOF.
	      return eof = true, text.slice(j, N);
	    }

	    while ((t = token()) !== EOF) {
	      var row = [];
	      while (t !== EOL && t !== EOF) row.push(t), t = token();
	      if (f && (row = f(row, n++)) == null) continue;
	      rows.push(row);
	    }

	    return rows;
	  }

	  function format(rows, columns) {
	    if (columns == null) columns = inferColumns(rows);
	    return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
	      return columns.map(function(column) {
	        return formatValue(row[column]);
	      }).join(delimiter);
	    })).join("\n");
	  }

	  function formatRows(rows) {
	    return rows.map(formatRow).join("\n");
	  }

	  function formatRow(row) {
	    return row.map(formatValue).join(delimiter);
	  }

	  function formatValue(text) {
	    return text == null ? ""
	        : reFormat.test(text += "") ? "\"" + text.replace(/"/g, "\"\"") + "\""
	        : text;
	  }

	  return {
	    parse: parse,
	    parseRows: parseRows,
	    format: format,
	    formatRows: formatRows
	  };
	}

	var csv = dsv(",");

	var csvParse = csv.parse;

	var tsv = dsv("\t");

	var tsvParse = tsv.parse;

	// Copyright 2018 The Lucid Authors.All Rights Reserved.


	// // Basic usage examples: 
	// import {load} from 'lucid-components';
	// 
	// load("test.csv").then(response => console.log("1", response));
	// load(["test.csv", "test.tsv"]).then(response => console.log("2", response[0], response[1]));
	// load('3a.jpg').then(response => {this.refs.img.src = response.src;})
	// 
	// // You can also namespace requests, which will cancel previous requests
	// load("test.csv", "namespace").then(response => console.log("This will never be called."))
	// load("test.tsv", "namespace").then(response => console.log("This will interrupt the previous one and be resolved instead."))



	// We will cache requests and parsing.
	const cache = new Map();
	const suppress = new Map();
	const namespaces = new Map();

	// Mapping file extensions to loaders
	const loaders = new Map([
	  ['gif', image],
	  ['png', image],
	  ['jpeg', image],
	  ['jpg', image],
	  ['csv', csv$1],
	  ['tsv', tsv$1],
	  ['txt', text],
	  ['text', text],
	  ['json', json],
	]);

	// Loaders
	function handleErrors(response) {
	  if (response.ok) {
	    return response;
	  } else {
	    throw new Error(response.status + ':' + response.statusText);
	  }
	}

	function image(url) {
	  return new Promise((resolve, reject) => {
	    let img = new Image();
	    img.onload = event => resolve(img);
	    img.onerror = event => reject(event);
	    img.src = url;
	  })
	}

	function json(url) {
	  return fetch(url).then(handleErrors).then(response => response.json())
	}

	function text(url) {
	  return fetch(url).then(handleErrors).then(response => response.text());
	}

	function csv$1(url) {
	  return text(url).then(text => Promise.resolve(csvParse(text)));
	}

	function tsv$1(url) {
	  return text(url).then(text => Promise.resolve(tsvParse(text)));
	}


	// Load a url or an array of urls.
	function load(url, namespace) {

	  // We will to create a namespace if we don't have one.
	  let ns = namespace != null ? namespace : Date.now() + "" + Math.random();

	  // Create a unique ID for this request
	  let requestID = "namespace:" + ns + ", url:" + url + ", random:" + Date.now() + "" + Math.random();
	  suppress.set(requestID, false);

	  // If we have a previous request in this namespace, mark it as suppressed so 
	  // that the promise is never resolved. Then we reset the current namespace to 
	  // the current request.
	  if (namespaces.has(ns)) {
	    const pendingRequestID = namespaces.get(ns);
	    suppress.set(pendingRequestID, true);
	  }
	  namespaces.set(ns, requestID);
	  
	  return new Promise((resolve, reject) => {
	    let p;
	    if (Array.isArray(url)) {
	      const promises = url.map(u => _loadURL(u));
	      p = Promise.all(promises);
	    } else {
	      p =  _loadURL(url);
	    }
	    p
	      .then(val => {
	        //check to see if we've suppressed this request.
	        if (!suppress.get(requestID)) {
	          resolve(val);
	        }
	      })
	      .catch(error => {
	        //check to see if we've suppressed this request.
	        if (!suppress.get(requestID)) {
	          reject(error);
	        }
	      });
	    
	  });
	}

	// Private loading function
	function _loadURL(url) {
	  let id = url;
	  if (cache.has(id)) {
	    return cache.get(id);
	  } else {
	    let extension = parseFileExtensionFromURL(url, loaders);
	    let loader = loaders.get(extension);
	    let p = loader(url);
	    cache.set(id, p);
	    return p;
	  }
	}

	// Helpers

	// Returns a filetype extension from a given url string
	function parseFileExtensionFromURL(url, loaders) {
	  const parts = url.split(".");
	  const ext = parts[parts.length - 1];
	  if (!loaders.has(ext)) {
	    console.warn('Trying to load url: ' + url + ' with an unknown filetype. Assuming "text".');
	  }
	  return loaders.has(ext) ? ext : 'text';
	}

	function ascending(a, b) {
	  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

	function bisector(compare) {
	  if (compare.length === 1) compare = ascendingComparator(compare);
	  return {
	    left: function(a, x, lo, hi) {
	      if (lo == null) lo = 0;
	      if (hi == null) hi = a.length;
	      while (lo < hi) {
	        var mid = lo + hi >>> 1;
	        if (compare(a[mid], x) < 0) lo = mid + 1;
	        else hi = mid;
	      }
	      return lo;
	    },
	    right: function(a, x, lo, hi) {
	      if (lo == null) lo = 0;
	      if (hi == null) hi = a.length;
	      while (lo < hi) {
	        var mid = lo + hi >>> 1;
	        if (compare(a[mid], x) > 0) hi = mid;
	        else lo = mid + 1;
	      }
	      return lo;
	    }
	  };
	}

	function ascendingComparator(f) {
	  return function(d, x) {
	    return ascending(f(d), x);
	  };
	}

	var ascendingBisect = bisector(ascending);

	var classesToKeep = [
	  235, //"fireboat"
	  287, //"streetcar"
	  237, //"speedboat"
	  982, //"scuba diver"
	  507, //"snorkel"
	  41, //"dalmation"
	  176, //"Labrador retriever"
	  3, //"Siberian husky"
	  2, //"English setter"
	  112, //"Doberman"
	  158, //"Tibetan terrier"
	  14, //"sea lion"
	  442, //"great white shark"
	  450, //"goldfish"
	  454, //"lionfish"
	  513, //"oil filter"
	  523, //"digital clock"
	  529, //"digital watch"
	  930, //"comic book"
	  600, //"spider web"
	  605, //"barn spider"
	  736, //"head cabbage"
	  744, //"artichoke"
	  358, //"yellow lady's slipper"
	  756, //"croquet ball"
	  936, //"volleyball"
	  942, //"parachute"
	  943, //"sleeping bag"
	  366, //"lakeside"
	  365, //"coral reef"
	  367, //"seashore"
	  484, //"vine snake"
	  483, //"water snake"
	  488, //"indian cobra"
	  489, //"green mamba"
	  387, //"goldfinch"
	  388, //"house finch"
	  399, //"vulture"
	  411, //"lorikeet"
	  405, //"peacock"
	];

	// To add
	// 547, //abacus
	// 671, //frying pan
	// 672, //wok
	// 6, //grey whale

	/* src/AtlasDataLoader.html generated by Svelte v2.15.3 */



	function data$1() {
	  return {
	    fingerprint: Math.random() + Date.now(),
	    // root: "assets",
	    root: "https://storage.googleapis.com/activation-atlas/build",
	    id: "inceptionv1",
	    layer: 0,
	    classFilter: 0,
	    filter: 0,
	    layout: 0,
	    config: null,
	    layers: null,
	    labels: null
	  };
	}
	function onupdate({ changed, current, previous }) {
	  this.set({data: null});
	  if (changed.layer || changed.classFilter || changed.id || changed.layout || changed.filter) {

	    const {root, id, layer, classFilter, filter, fingerprint, layout} = this.get();

	    load(`${root}/${id}/${id}.json`, fingerprint).then(response => {
	      let config = response;
	      this.set({config});

	      if (classFilter !== null) {
	  
	        if (config.class_filter == null) { config.class_filter = "None"; }
	        if (config.filter == null) { config.filter = "None"; }
	        if (!Array.isArray(config.grid_size)) { config.grid_size = [config.grid_size]; }
	        if (!Array.isArray(config.class_filter)) { config.class_filter = [config.class_filter]; }
	        if (!Array.isArray(config.layer)) { config.layer = [config.layer]; }
	        if (!Array.isArray(config.layout)) { config.layout = [config.layout]; }
	        if (!Array.isArray(config.filter)) { config.filter = [config.filter]; }
	        // console.log(config.layout, layout, Array.isArray(config.layout))
	        //https://storage.googleapis.com/activation-atlas/build/class_filter_inceptionv1/web/web--grid_size=8--layout=5_0.1_cosine,10_0.1_cosine,15_0.1_cosine--class_filter=7--filter=None--layer=mixed4a--model=InceptionV1--sample_images=1000000--sample_type=random.json
	        //https://storage.googleapis.com/activation-atlas/build/class_filter_inceptionv1/web/web--grid_size%3D16--layout%3D10_0.1_cosine--class_filter%3D1--filter%3DNone--layer%3Dmixed4a--model%3DInceptionV1--sample_images%3D1000000--sample_type%3Drandom.json
	        // console.log(config)
	        let gridUrls = config.grid_size.map(g => `${root}/${id}/web/web--grid_size=${g}--layout=${config.layout[layout]}--class_filter=${config.class_filter[classFilter]}--filter=${config.filter[filter]}--layer=${config.layer[layer]}--model=${config.model}--sample_images=${config.sample_images}--sample_type=${config.sample_type}.json`);
	        // console.log(gridUrls)
	        load(gridUrls).then(responses => {
	          let layers = Array(responses.length);
	          responses.forEach((g, i) => {
	            let gridSize = config.grid_size[i];
	            let tileSize = config.tile_size;
	            let numRows = gridSize / tileSize;
	            let t = [...Array(numRows).keys()];
	            // let tiles = t.map(x => Array(numRows))
	            // for (let x = 0; x < numRows; x++) {
	            //   for (let y = 0; y < numRows; y++) {
	            //     tiles[x][y] = {
	            //       //render/render--x%3D0--y%3D0--tries%3D4--alpha%3DFalse--tile_size%3D10--whiten%3Dtrue--steps%3D1024--icon_size%3D80--grid_size%3D10--layout%3D50_0.05_cosine--class_filter%3DNone--filter%3DNone--layer%3Dmixed4d--model%3DInceptionV1--sample_images%3D1000000--sample_type%3Drandom.jpg?_ga=2.191103914.-1445069976.1518735995
	            //       //assets/alexnet/render/render--x=0--y=0--tries={config.tries}--tile_size={config.tile_size}--whiten={config.whiten}--steps={config.steps}--icon_size=80--grid_size=16--layout={config.layout}--class_filter=${config.class_filter[classFilter]}--filter=None--layer={layer}--model={config.model}--sample_images={config.sample_images}--sample_type={config.sample_type}.jpg
	            //       url: `${root}/${id}/render/render--x=${x}--y=${y}--tries=${config.tries}--alpha=${config.alpha ? "True" : "False"}--tile_size=${config.tile_size}--whiten=${config.whiten}--steps=${config.steps}--icon_size=${config.icon_size}--grid_size=${gridSize}--layout=${config.layout}--class_filter=${config.class_filter[classFilter]}--filter=None--layer=${config.layer[layer]}--model=${config.model}--sample_images=${config.sample_images}--sample_type=${config.sample_type}.jpg`
	            //     }
	            //   }
	            // }
	            let ic = [...Array(gridSize).keys()];
	            let icons = ic.map(x => Array(gridSize));
	            for (const gd of g) {
	              if (gd.x !== undefined) { gd.grid_x = gd.x; }
	              if (gd.y !== undefined) { gd.grid_y = gd.y; }
	              if (gd.n !== undefined) { gd.num_activations = gd.n; }
	              if (gd.i !== undefined) { gd.top_class_indices = gd.i; }
	              if (gd.v !== undefined) { gd.top_class_values = gd.v; }
	              if (gd.f !== undefined) { 
	                gd.full_class_values = gd.f; 
	                gd.full_class_indices = classesToKeep;
	              }
	              let x = gd.grid_x;
	              let y = gd.grid_y;
	              let tileX = Math.floor(x / tileSize);
	              let tileY = Math.floor(y / tileSize);
	              gd.localX = x % tileSize;
	              gd.localY = y % tileSize;
	                        //activation-atlas/o/build%2Finceptionv1_mixed4d%2Frender%2Frender--x=0--y=0--tries=4--alpha=False--tile_size=10--whiten=true--steps=1024--icon_size=80--grid_size=10--layout=50_0.05_cosine--class_filter=None--filter=None--layer=mixed4d--model=InceptionV1--sample_images=1000000--sample_type=random.jpg
	              gd.url = `${root}/${id}/render/render--x=${tileX}--y=${tileY}--tries=${config.tries}--alpha=${config.alpha ? "True" : "False"}--tile_size=${config.tile_size}--whiten=${config.whiten}--steps=${config.steps}--icon_size=${config.icon_size}--grid_size=${gridSize}--layout=${config.layout[layout]}--class_filter=${config.class_filter[classFilter]}--filter=${config.filter[filter]}--layer=${config.layer[layer]}--model=${config.model}--sample_images=${config.sample_images}--sample_type=${config.sample_type}.jpg`;
	              icons[gd.grid_x][gd.grid_y] = gd;
	            }
	            layers[i] = icons;
	          });
	          this.set({layers});
	          load(`${root}/labels--model-${config.model}.txt`).then(response => {
	            const labels = response.split("\n");
	            this.set({labels});
	          });
	        });
	      }
	    });
	  }     
	}
	function create_main_fragment$5(component, ctx) {

		return {
			c: noop,

			m: noop,

			p: noop,

			d: noop
		};
	}

	function AtlasDataLoader(options) {
		this._debugName = '<AtlasDataLoader>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$1(), options.data);
		this._intro = true;
		this._handlers.update = [onupdate];

		this._fragment = create_main_fragment$5(this, this._state);

		this.root._oncreate.push(() => {
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(AtlasDataLoader.prototype, protoDev);

	AtlasDataLoader.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	function isDate(obj) {
	    return Object.prototype.toString.call(obj) === '[object Date]';
	}

	var scheduler = {
	    components: [],
	    running: false,
	    add: function (component) {
	        if (~scheduler.components.indexOf(component))
	            return;
	        scheduler.components.push(component);
	        if (!scheduler.running) {
	            scheduler.running = true;
	            requestAnimationFrame(scheduler.next);
	        }
	    },
	    next: function () {
	        var now = window.performance.now();
	        var hasComponents = false;
	        var i = scheduler.components.length;
	        while (i--) {
	            var component = scheduler.components[i];
	            var data = {};
	            var hasTweens = false;
	            for (var key in component._currentTweens) {
	                var t = component._currentTweens[key];
	                if (now >= t.end) {
	                    data[key] = t.to;
	                    delete component._currentTweens[key];
	                    t.fulfil();
	                }
	                else {
	                    hasTweens = true;
	                    hasComponents = true;
	                    if (now >= t.start) {
	                        var p = (now - t.start) / t.duration;
	                        data[key] = t.value(t.ease(p));
	                    }
	                }
	            }
	            component._tweening = true;
	            component.set(data);
	            component._tweening = false;
	            if (!hasTweens)
	                scheduler.components.splice(i, 1);
	        }
	        if (hasComponents) {
	            requestAnimationFrame(scheduler.next);
	        }
	        else {
	            scheduler.running = false;
	        }
	    }
	};
	function snap(to) {
	    return function () { return to; };
	}
	function interpolate(a, b) {
	    if (a === b || a !== a)
	        return snap(a);
	    var type = typeof a;
	    if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
	        throw new Error('Cannot interpolate values of different type');
	    }
	    if (Array.isArray(a)) {
	        var arr_1 = b.map(function (bi, i) {
	            return interpolate(a[i], bi);
	        });
	        return function (t) {
	            return arr_1.map(function (fn) { return fn(t); });
	        };
	    }
	    if (type === 'object') {
	        if (!a || !b)
	            throw new Error('Object cannot be null');
	        if (isDate(a) && isDate(b)) {
	            a = a.getTime();
	            b = b.getTime();
	            var delta_1 = b - a;
	            return function (t) {
	                return new Date(a + t * delta_1);
	            };
	        }
	        var keys_1 = Object.keys(b);
	        var interpolators_1 = {};
	        var result_1 = {};
	        keys_1.forEach(function (key) {
	            interpolators_1[key] = interpolate(a[key], b[key]);
	        });
	        return function (t) {
	            keys_1.forEach(function (key) {
	                result_1[key] = interpolators_1[key](t);
	            });
	            return result_1;
	        };
	    }
	    if (type === 'number') {
	        var delta_2 = b - a;
	        return function (t) {
	            return a + t * delta_2;
	        };
	    }
	    throw new Error("Cannot interpolate " + type + " values");
	}
	function linear$1(x) {
	    return x;
	}
	function tween(key, to, options) {
	    var _this = this;
	    if (options === void 0) { options = {}; }
	    if (!this._currentTweens) {
	        this._currentTweens = Object.create(null);
	        this._tweening = false;
	        var set_1 = this.set;
	        this.set = function (data) {
	            if (!_this._tweening) {
	                for (var key_1 in data) {
	                    if (_this._currentTweens[key_1])
	                        _this._currentTweens[key_1].abort();
	                }
	            }
	            set_1.call(_this, data);
	        };
	    }
	    if (this._currentTweens[key])
	        this._currentTweens[key].abort();
	    var start = window.performance.now() + (options.delay || 0);
	    var duration = options.duration || 400;
	    var end = start + duration;
	    var t = {
	        key: key,
	        value: (options.interpolate || interpolate)(this.get()[key], to),
	        to: to,
	        start: start,
	        end: end,
	        duration: duration,
	        ease: options.easing || linear$1,
	        running: true,
	        abort: function () {
	            t.running = false;
	            delete _this._currentTweens[key];
	        }
	    };
	    this._currentTweens[key] = t;
	    scheduler.add(this);
	    var promise = new Promise(function (fulfil) {
	        t.fulfil = fulfil;
	    });
	    promise.abort = t.abort;
	    return promise;
	}

	function cubicInOut(t) {
	  return t < 0.5
	    ? 4.0 * t * t * t
	    : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0
	}

	/* src/Zoom.html generated by Svelte v2.15.3 */



	function scale({width, unit}) {
	  return width / unit
	}

	function data$2() {
	  return {
	    width: 100,
	    height: 100,
	    gcx: 0.5,
	    gcy: 0.5,
	    scx: 0.5,
	    scy: 0.5,
	    unit: 100,

	    //tweenTarget: {
	    //  scale: null, gcx: null, gcy: null
	    //}
	  }
	}
	var methods = {
	  tween,
	  setScale(scale) {
	    const {width} = this.get();
	    this.set({'unit': width / scale});
	  },
	  panTo(newgcx, newgcy, duration) {
	    if (duration === undefined) duration = 1000;
	    if(duration == 0) {
	      this.set({gcx: newgcx, gcy: newgcy});
	    } else {
	      this.tween('gcx', newgcx, {duration, easing: cubicInOut});
	      this.tween('gcy', newgcy, {duration, easing: cubicInOut});
	    }
	  },
	  scaleTo(newScale, duration) {
	    if (duration === undefined) duration = 1000;
	    const {width} = this.get();
	    this.tween('unit', width / newScale, {duration, easing: cubicInOut});
	  },
	  transitionTo(newgcx, newgcy, newScale, duration) {
	    if (duration === undefined) duration = 1000;
	    const {width} = this.get();
	    const newUnit = width / newScale;
	    this.tween('unit', newUnit, {duration, easing: cubicInOut});
	    this.tween('gcx', newgcx, {duration, easing: cubicInOut});
	    this.tween('gcy', newgcy, {duration, easing: cubicInOut});
	  },
	};

	function oncreate() {
	}
	const file$6 = "src/Zoom.html";

	function create_main_fragment$6(component, ctx) {
		var div;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "svelte-16epbqg svelte-ref-capture";
				addLoc(div, file$6, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				component.refs.capture = div;
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (component.refs.capture === div) component.refs.capture = null;
			}
		};
	}

	function Zoom(options) {
		this._debugName = '<Zoom>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$2(), options.data);

		this._recompute({ width: 1, unit: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<Zoom> was created without expected data property 'width'");
		if (!('unit' in this._state)) console.warn("<Zoom> was created without expected data property 'unit'");
		this._intro = true;

		this._fragment = create_main_fragment$6(this, this._state);

		this.root._oncreate.push(() => {
			oncreate.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Zoom.prototype, protoDev);
	assign(Zoom.prototype, methods);

	Zoom.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('scale' in newState && !this._updatingReadonlyProperty) throw new Error("<Zoom>: Cannot set read-only property 'scale'");
	};

	Zoom.prototype._recompute = function _recompute(changed, state) {
		if (changed.width || changed.unit) {
			if (this._differs(state.scale, (state.scale = scale(state)))) changed.scale = true;
		}
	};

	/* src/components/Figure.html generated by Svelte v2.15.3 */

	function data$3() {
	  return {
	    ready: false,
	    onscreen: false,
	  }
	}
	function oncreate$1() {
	  this.refs.figure.addEventListener("ready", event => {
	    this.set({ready: true});
	  });
	  this.refs.figure.addEventListener("onscreen", event => {
	    this.set({onscreen: true});
	    this.fire("onscreen");
	  });
	  this.refs.figure.addEventListener("offscreen", event => {
	    this.set({onscreen: false});
	    this.fire("offscreen");
	  });
	}
	const file$7 = "src/components/Figure.html";

	function create_main_fragment$7(component, ctx) {
		var d_figure, slot_content_default = component._slotted.default;

		return {
			c: function create() {
				d_figure = createElement("d-figure");
				addLoc(d_figure, file$7, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, d_figure, anchor);

				if (slot_content_default) {
					append(d_figure, slot_content_default);
				}

				component.refs.figure = d_figure;
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(d_figure);
				}

				if (slot_content_default) {
					reinsertChildren(d_figure, slot_content_default);
				}

				if (component.refs.figure === d_figure) component.refs.figure = null;
			}
		};
	}

	function Figure(options) {
		this._debugName = '<Figure>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$3(), options.data);
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$7(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$1.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Figure.prototype, protoDev);

	Figure.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/Atlas.html generated by Svelte v2.15.3 */



	function maxAttributionValue({layers, layer}) {
	  // return 0.25;
	  if (layers == null) return 0;
	  const l = layers[layer];
	  let max$$1 = 0;
	  l.forEach(x => {
	    x.forEach(y => {
	      if (y && y.num_activations > 500) {
	        const v = y.full_class_values[0];
	        if (v > max$$1) max$$1 = v;
	      }
	    });
	  });
	  return max$$1;
	  // return layers ? max(l, d => d ? max(d, dd => dd ? (dd.n > 50 ? (dd.top_class_values[dd.top_class_indices.indexOf(classHeatmap)]) : 0) : 0): 0) : 0;
	  }

	function aspectRatio({viewWidth, viewHeight}) {
		return viewWidth / viewHeight;
	}

	function minViewDimInPx({viewWidth, viewHeight}) {
		return Math.min(viewWidth, viewHeight);
	}

	function topLeft({gcx, gcy, scale, viewWidth, viewHeight, minViewDimInPx}) {
	  return {
	    x: viewWidth / 2 - gcx * minViewDimInPx * scale,
	    y: viewHeight / 2 - gcy * minViewDimInPx * scale} 
	}

	function currentZoomIndex({scale, gridSize}) {
	  let s = 0;
	  if (gridSize != null) {
	    s = gridSize;
	  } else {
	    if (scale > 1) s = 0;
	    if (scale > 2) s = 1;
	    if (scale > 4) s = 2;
	    if (scale > 8) s = 3;
	    if (scale > 16) s = 4;
	  }
	  return +s;
	}

	function numIconsWide({currentZoomIndex, layers}) {
	  if(layers && currentZoomIndex){
	    return layers[currentZoomIndex].length
	  }
	}

	function iconSizeInPixels({config, minViewDimInPx, currentZoomIndex, scale}) {
	  if(config){
	    return minViewDimInPx / (config.grid_size[currentZoomIndex]) * scale;
	  }
	}

	function showHoverIcon({mouseMoveMode, onCanvas, currentIconInfo, enableHover}) {
	  return enableHover && onCanvas && (mouseMoveMode == 'hover') && currentIconInfo
	}

	function layerScale({minViewDimInPx, config, currentZoomIndex, scale}) {
	  if(config){
	    return (minViewDimInPx / (config.icon_size * config.grid_size[currentZoomIndex])) * scale
	  }
	}

	function gridSelected({lastRecordedCanvasPos, topLeft, layerScale, config}) {
	  if(config){
	    return {
	      x: Math.floor((lastRecordedCanvasPos.x - topLeft.x) / (layerScale * config.icon_size)),
	      y: Math.floor((lastRecordedCanvasPos.y - topLeft.y) / (layerScale * config.icon_size))
	    }        
	  }
	}

	function topLeftCornerHover({config, layerScale, topLeft, gridSelected}) {
	  if(config){
	    return {
	      x: gridSelected.x * config.icon_size * layerScale + topLeft.x - 1,
	      y: gridSelected.y * config.icon_size * layerScale + topLeft.y - 1
	    }
	  }
	}

	function currentIconInfo({layers, currentZoomIndex, gridSelected, classHeatmap}) {
	  if(layers && layers[currentZoomIndex] && 
	     layers[currentZoomIndex][gridSelected.y] && 
	     layers[currentZoomIndex][gridSelected.y][gridSelected.x]
	     ){
	      const iconInfo = layers[currentZoomIndex][gridSelected.y][gridSelected.x];
	      if(iconInfo.num_activations > 0){
	        return iconInfo
	      }
	  }
	}

	function data$4() {
	  return {
	    id: "inceptionv1",
	    
	    config: null,
	    layers: null,
	    labels: null,

	    layer: 0,
	    layout: 0,
	    classFilter: 0,
	    filter: 0,

	    minActivations: 1,

	    showLabels: false,
	    showHoverImage: false,

	    context: null,

	    alphaAttributionFactor: 0.02,
	    scaleCountFactor: 1,
	    classHeatmap: -1,
	    classHeatmapMultiplier: 1,
	    classHeatmapPositive: 1,

	    gridSize: null,
	    showGrid: false,

	    // for initial state, and going back to "home"
	    homeX: .5,
	    homeY: .5,
	    homeScale: 1,

	    iconCrop: 0.02,

	    // zoom factor
	    zoomFactors: {out: 0.5, in: 2},

	    // turn off features
	    enableClickToZoom: true,
	    enableHover: true,
	    enableDragToPan: true,


	    backgroundColor: 'white',
	    strokeColor: 'rgb(220, 220, 220)',

	    // for positioning the hover icon
	    lastRecordedCanvasPos: {x: -100, y: -100},

	    // for managing panning off the screen
	    mouseDownScreenPos: {x: 0, y: 0},

	    // can be "hover" or "pan"
	    mouseMoveMode: 'hover',
	    onCanvas: false,

	    screenResolution: 1,

	    mouseDownTimer: 0,
	    mouseMoveFunction: function(){},
	    mouseUpFunction: function(){},

	  }
	}
	var methods$1 = {
	  fullscreen() {
	    this.refs.root.webkitRequestFullscreen();
	  },
	  mouseEnter() {
	    this.set({onCanvas: true});
	  },
	  mouseDown(event) {
	    // should this be set once, somewhere else? oncreate? 
	    this.set({mouseMoveFunction: this.mouseMove.bind(this), mouseUpFunction: this.mouseUp.bind(this)});

	    const {mouseMoveFunction, mouseUpFunction} = this.get();

	    event.preventDefault();

	    // set event listeners on window
	    window.addEventListener("mousemove", mouseMoveFunction);
	    window.addEventListener("mouseup",mouseUpFunction);
	    // do I need to unset local listener? 

	    this.set({mouseMoveMode: 'pan'});
	    this.set({mouseDownTimer: Date.now()});

	    // canvas position
	    this.set({lastRecordedCanvasPos: {x: event.offsetX, y: event.offsetY}});

	    // screenPosition at mousedown
	    this.set({mouseDownScreenPos: {x: event.screenX, y: event.screenY}});

	  },
	  mouseMove(event) {
	    const { mouseMoveMode } = this.get();

	    this.set({lastRecordedCanvasPos: {x: event.offsetX, y: event.offsetY}});

	    if (mouseMoveMode == 'pan') {
	      const {mouseDownScreenPos, gcx, gcy, enableDragToPan} = this.get();

	      // update gcx, gcy, mouseDownScreenPos
	      this.set({
	        mouseDownScreenPos: {x: event.screenX, y: event.screenY}
	      });

	      if(enableDragToPan){
	        this.refs.zoom.panTo(
	          this.toPercent(mouseDownScreenPos.x - event.screenX) + gcx,
	          this.toPercent(mouseDownScreenPos.y - event.screenY) + gcy,
	          0
	        );
	      } 
	    }

	  },
	  mouseOut(event) {
	    this.set({
	      onCanvas: false
	    });
	  },
	  mouseUp(event) {
	    const {mouseDownTimer, mouseMoveMode, scale, zoomFactors, mouseMoveFunction, mouseUpFunction, lastRecordedCanvasPos, topLeft, gcx, gcy, enableClickToZoom} = this.get();

	    // reset mode to hover
	    this.set({mouseMoveMode: 'hover'});

	    // remove body event listeners
	    window.removeEventListener("mousemove", mouseMoveFunction);
	    window.removeEventListener("mouseup", mouseUpFunction);

	    // calculate offsets to determine to zoom or not
	    const clickDiff = (Date.now() - mouseDownTimer);
	    const clickDistance = Math.sqrt(
	      Math.pow(event.offsetX - lastRecordedCanvasPos.x, 2) + 
	      Math.pow(event.offsetY - lastRecordedCanvasPos.y, 2)
	      );


	    // 200ms and 5 pixels distance is fairly arbitrary
	    if(clickDiff < 200 && clickDistance < 5) {
	      // ZOOM!
	      if(enableClickToZoom){
	        // use shift key to determine to zoom in or zoom out
	        let zoomBy = zoomFactors.in;
	        if(event.shiftKey){
	          zoomBy = zoomFactors.out;
	        }

	        let newCenter = {x: 0.5, y: 0.5};

	        // go home if scale < 1
	        let newScale = zoomBy * scale;
	        if(newScale > 1){
	          // use current mouse position to find new center position
	          const fixedPoint = {
	            x: this.toPercent(event.offsetX - topLeft.x),
	            y: this.toPercent(event.offsetY - topLeft.y)
	          };
	          newCenter = {
	            x: fixedPoint.x - ((fixedPoint.x - gcx)/zoomBy),
	            y: fixedPoint.y - ((fixedPoint.y - gcy)/zoomBy)
	          };
	        } else {
	          newScale = 1;
	        }
	        this.transitionTo(newCenter.x, newCenter.y, newScale, 500);
	      }
	    }
	  },
	  home() {
	    const {homeX, homeY, homeScale} = this.get();
	    this.transitionTo(homeX,homeY,homeScale,800);
	  },
	  transitionTo(x, y, scale, duration) {
	    this.refs.zoom.transitionTo(x,y,scale,duration);
	  },
	  zoomit(multiplier) {
	    const { scale } = this.get();
	    this.refs.zoom.scaleTo(scale * multiplier, 500);
	  },
	  iconToCanvasPosition(icon, layerIndex) {
	    const {config, scaleCountFactor, topLeft, layerScale, currentZoomIndex} = this.get();

	    const proportionalScaleCountFactor = scaleCountFactor / (currentZoomIndex + 1);
	    const scaleModifier = (Math.sqrt(Math.min(proportionalScaleCountFactor, icon.num_activations) / proportionalScaleCountFactor)); 
	    const iconWidth = config.icon_size * layerScale * scaleModifier;

	    const sx = icon.localX * config.icon_size;
	    const sy = icon.localY * config.icon_size;

	    const tilePos_x = icon.grid_y * config.icon_size;
	    const tilePos_y = icon.grid_x * config.icon_size;

	    // pixel coordinate in the global coordinate space
	    const globalPixelPos_x = tilePos_x * layerScale;
	    const globalPixelPos_y = tilePos_y * layerScale;

	    const canvasPos_x = globalPixelPos_x + topLeft.x;
	    const canvasPos_y = globalPixelPos_y + topLeft.y;      

	    // calc scale adjust factor to center the image for the icon in it's box
	    const scaleAdjustFactor =  (1 - scaleModifier) * config.icon_size * layerScale  / 2;

	    const dx = canvasPos_x + scaleAdjustFactor;
	    const dy = canvasPos_y + scaleAdjustFactor;

	    return {sx, sy, dx, dy, iconWidth}
	  },
	  toPercent(p) {
	    const {scale, minViewDimInPx} = this.get();
	    return p / (scale * minViewDimInPx);
	  },
	  toPixels(p) {
	    const {scale, minViewDimInPx} = this.get();
	    return p * scale * minViewDimInPx;
	  },
	  clear() {
	    const {viewHeight, viewWidth, context, backgroundColor} = this.get();
	    context.globalAlpha = 1;
	    context.fillStyle= backgroundColor;
	    context.clearRect(0, 0, viewWidth, viewHeight);
	    context.fillRect(0, 0, viewWidth, viewHeight);
	  },
	  updateIconHoverImage() {
	    const {currentIconInfo, currentZoomIndex, iconCrop, config, showHoverImage} = this.get();
	    if(currentIconInfo && showHoverImage){
	      load(currentIconInfo.url).then(response => {
	        const hoverImageContext = this.refs.hoverImage.getContext('2d');
	        const {sx, sy, dx, dy, iconWidth} = this.iconToCanvasPosition(currentIconInfo, currentZoomIndex);
	        const iconOffset = (iconCrop * config.icon_size) / 2;
	        const edgeLength = Math.min(this.refs.hoverImage.height, this.refs.hoverImage.width);
	        hoverImageContext.drawImage(response,
	                        //source
	                        sy + iconOffset, sx + iconOffset, config.icon_size - iconOffset * 2, config.icon_size - iconOffset * 2,
	                        //destination
	                        0, 0, edgeLength, edgeLength
	                      );
	      });
	    }
	  },
	  render() {

	    const {minActivations, viewHeight, viewWidth, context, backgroundColor, config, layers, currentZoomIndex, strokeColor, maxAttributionValue, classHeatmapMultiplier} = this.get();

	    this.clear();
	    context.imageSmoothingQuality = "low";
	    context.imageSmoothingEnabled = false;

	    if (config && layers) {
	      layers.forEach((icons, layerIndex) => {
	        const visibleLayers = [currentZoomIndex];

	        if (visibleLayers.indexOf(layerIndex) > -1) {

	          icons.forEach((columns, x) => {
	            columns.forEach((icon, y) => {
	              if (icon.num_activations >= minActivations) {

	                const {dx, dy, iconWidth} = this.iconToCanvasPosition(icon, layerIndex);

	                // If icon is in the viewport
	                if (dx > -iconWidth && dx < viewWidth && dy > -iconWidth && dy < viewHeight) {
	                  
	                  // We want to draw a box before the icon has loaded so there isn't just whiteness.
	                  const {sx, sy, dx, dy, iconWidth} = this.iconToCanvasPosition(icon, layerIndex);
	                  context.globalAlpha = 0.75;
	                  context.strokeStyle = strokeColor;
	                  context.fillStyle = "white";
	                  context.beginPath();
	                  context.rect(dx, dy, iconWidth, iconWidth);
	                  context.stroke();
	                  context.fill();
	                  context.closePath();

	                  load(icon.url).then(response => {
	                    // check that we're still on the right layer/zoom
	                    const {currentZoomIndex, iconCrop, showLabels,} = this.get();
	                    if(currentZoomIndex == layerIndex) {
	                      const {alphaAttributionFactor, labels, config, classHeatmap, classHeatmapMultiplier, classHeatmapPositive} = this.get();

	                      let a = 1;
	                      if (classHeatmap > -1) {
	                        let i = icon.full_class_indices.indexOf(classHeatmap);
	                        if (i > -1) {
	                          a = icon.full_class_values[i] / maxAttributionValue;
	                          a = a * classHeatmapPositive;
	                          a = Math.max(0, a) * classHeatmapMultiplier;
	                        } else {
	                          a = 0.0;
	                        }
	                      }
	                      // let a = Math.min(1,
	                      //   Math.max(0.2, Math.pow(icon.top_class_values[0], 2) * 
	                      //   1000 * alphaAttributionFactor));

	                      // get current values in case they changed while loading
	                      const {sx, sy, dx, dy, iconWidth} = this.iconToCanvasPosition(icon, layerIndex);

	                      // draw the icon
	                      context.globalAlpha = a;
	                      const iconOffset = (iconCrop * config.icon_size) / 2;
	                      context.clearRect(dx + 1, dy + 1, iconWidth - 2, iconWidth - 2);
	                      context.drawImage(response,
	                        //source
	                        sy + iconOffset, sx + iconOffset, config.icon_size - iconOffset * 2, config.icon_size - iconOffset * 2,
	                        //destination
	                        dx, dy, iconWidth, iconWidth
	                      );
	                      context.globalAlpha = 1;

	                      if (showLabels && labels) {
	                        context.globalAlpha = 1;
	                        context.font="10px Helvetica";
	                        // context.lineWidth = 2;
	                        // context.strokeStyle = "rgba(0, 0, 0, 0.8)";
	                        // context.strokeText(labels[icon.top_class_indices[0]], dx + 4, dy + iconWidth - 4, iconWidth - 8);
	                        context.fillStyle = "rgba(255, 255, 255, 1)";
	                        context.fillText(labels[icon.top_class_indices[0]], dx + 4, dy + iconWidth - 4, iconWidth - 8);
	                      }

	                    }

	                  });
	                }
	              }
	            });
	          });
	        }
	      });
	    }
	  }
	  };

	function oncreate$2() {
	  this.home();
	}
	function onupdate$1({ changed, current, previous }) {
	  this.set({context: this.refs.canvas.getContext('2d')});
	  if (changed.maxAttributionValue || changed.minActivations || changed.classHeatmap || changed.classHeatmapMultiplier || changed.classHeatmapPositive || changed.labels || changed.showLabels || changed.viewWidth || changed.viewHeight || changed.scale || changed.iconCrop || changed.currentZoomIndex || changed.layers || changed.alphaAttributionFactor || changed.scaleCountFactor || changed.gcx || changed.gcy) {
	    this.render();
	  }
	  if (changed.currentIconInfo) {
	    this.updateIconHoverImage();
	  }

	}
	const file$8 = "src/Atlas.html";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.top = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$8(component, ctx) {
		var figure_updating = {}, text0, text1, div1, div0, zoom_updating = {}, text2, canvas, canvas_width_value, canvas_height_value, text3, div0_class_value, text4, div1_resize_listener;

		var figure_initial_data = {};
		if (ctx.ready  !== void 0) {
			figure_initial_data.ready = ctx.ready ;
			figure_updating.ready = true;
		}
		var figure = new Figure({
			root: component.root,
			store: component.store,
			data: figure_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!figure_updating.ready && changed.ready) {
					newState.ready = childState.ready;
				}
				component._set(newState);
				figure_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			figure._bind({ ready: 1 }, figure.get());
		});

		var if_block0 = (ctx.ready) && create_if_block_4(component, ctx);

		var zoom_initial_data = { width: ctx.viewWidth, height: ctx.viewHeight };
		if (ctx.scale
	         !== void 0) {
			zoom_initial_data.scale = ctx.scale
	        ;
			zoom_updating.scale = true;
		}
		if (ctx.unit
	         !== void 0) {
			zoom_initial_data.unit = ctx.unit
	        ;
			zoom_updating.unit = true;
		}
		if (ctx.gcx
	         !== void 0) {
			zoom_initial_data.gcx = ctx.gcx
	        ;
			zoom_updating.gcx = true;
		}
		if (ctx.gcy
	         !== void 0) {
			zoom_initial_data.gcy = ctx.gcy
	        ;
			zoom_updating.gcy = true;
		}
		var zoom = new Zoom({
			root: component.root,
			store: component.store,
			data: zoom_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!zoom_updating.scale && changed.scale) {
					newState.scale = childState.scale;
				}

				if (!zoom_updating.unit && changed.unit) {
					newState.unit = childState.unit;
				}

				if (!zoom_updating.gcx && changed.gcx) {
					newState.gcx = childState.gcx;
				}

				if (!zoom_updating.gcy && changed.gcy) {
					newState.gcy = childState.gcy;
				}
				component._set(newState);
				zoom_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			zoom._bind({ scale: 1, unit: 1, gcx: 1, gcy: 1 }, zoom.get());
		});

		component.refs.zoom = zoom;

		var if_block1 = (ctx.showHoverIcon) && create_if_block_3(component, ctx);

		function mousedown_handler(event) {
			component.mouseDown(event);
		}

		function mousemove_handler(event) {
			component.mouseMove(event);
		}

		function mouseenter_handler(event) {
			component.mouseEnter(event);
		}

		function mouseout_handler(event) {
			component.mouseOut(event);
		}

		var if_block2 = (ctx.labels && ctx.showHoverIcon && ctx.currentIconInfo && ctx.currentIconInfo.top_class_indices) && create_if_block(component, ctx);

		function div1_resize_handler() {
			component.set({ viewWidth: div1.clientWidth, viewHeight: div1.clientHeight });
		}

		return {
			c: function create() {
				figure._fragment.c();
				text0 = createText("\n\n");
				if (if_block0) if_block0.c();
				text1 = createText("\n\n  ");
				div1 = createElement("div");
				div0 = createElement("div");
				zoom._fragment.c();
				text2 = createText("\n      ");
				canvas = createElement("canvas");
				text3 = createText("\n      ");
				if (if_block1) if_block1.c();
				text4 = createText("\n\n    ");
				if (if_block2) if_block2.c();
				canvas.width = canvas_width_value = ctx.viewWidth * ctx.screenResolution;
				canvas.height = canvas_height_value = ctx.viewHeight * ctx.screenResolution;
				setStyle(canvas, "width", "" + ctx.viewWidth + "px");
				setStyle(canvas, "height", "" + ctx.viewHeight + "px");
				canvas.className = "svelte-ptap6b svelte-ref-canvas";
				addLoc(canvas, file$8, 35, 6, 689);
				addListener(div0, "mousedown", mousedown_handler);
				addListener(div0, "mousemove", mousemove_handler);
				addListener(div0, "mouseenter", mouseenter_handler);
				addListener(div0, "mouseout", mouseout_handler);
				div0.className = div0_class_value = "" + ((ctx.mouseMoveMode == 'pan' & ctx.enableDragToPan) ? 'panning' : '') + " svelte-ptap6b" + " svelte-ref-stage";
				addLoc(div0, file$8, 20, 4, 276);
				component.root._beforecreate.push(div1_resize_handler);
				div1.className = "svelte-ptap6b svelte-ref-root";
				addLoc(div1, file$8, 15, 2, 186);
			},

			m: function mount(target, anchor) {
				figure._mount(target, anchor);
				insert(target, text0, anchor);
				if (if_block0) if_block0.m(target, anchor);
				insert(target, text1, anchor);
				insert(target, div1, anchor);
				append(div1, div0);
				zoom._mount(div0, null);
				append(div0, text2);
				append(div0, canvas);
				component.refs.canvas = canvas;
				append(div0, text3);
				if (if_block1) if_block1.m(div0, null);
				component.refs.stage = div0;
				append(div1, text4);
				if (if_block2) if_block2.m(div1, null);
				div1_resize_listener = addResizeListener(div1, div1_resize_handler);
				component.refs.root = div1;
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var figure_changes = {};
				if (!figure_updating.ready && changed.ready) {
					figure_changes.ready = ctx.ready ;
					figure_updating.ready = ctx.ready  !== void 0;
				}
				figure._set(figure_changes);
				figure_updating = {};

				if (ctx.ready) {
					if (if_block0) {
						if_block0.p(changed, ctx);
					} else {
						if_block0 = create_if_block_4(component, ctx);
						if_block0.c();
						if_block0.m(text1.parentNode, text1);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				var zoom_changes = {};
				if (changed.viewWidth) zoom_changes.width = ctx.viewWidth;
				if (changed.viewHeight) zoom_changes.height = ctx.viewHeight;
				if (!zoom_updating.scale && changed.scale) {
					zoom_changes.scale = ctx.scale
	        ;
					zoom_updating.scale = ctx.scale
	         !== void 0;
				}
				if (!zoom_updating.unit && changed.unit) {
					zoom_changes.unit = ctx.unit
	        ;
					zoom_updating.unit = ctx.unit
	         !== void 0;
				}
				if (!zoom_updating.gcx && changed.gcx) {
					zoom_changes.gcx = ctx.gcx
	        ;
					zoom_updating.gcx = ctx.gcx
	         !== void 0;
				}
				if (!zoom_updating.gcy && changed.gcy) {
					zoom_changes.gcy = ctx.gcy
	        ;
					zoom_updating.gcy = ctx.gcy
	         !== void 0;
				}
				zoom._set(zoom_changes);
				zoom_updating = {};

				if ((changed.viewWidth || changed.screenResolution) && canvas_width_value !== (canvas_width_value = ctx.viewWidth * ctx.screenResolution)) {
					canvas.width = canvas_width_value;
				}

				if ((changed.viewHeight || changed.screenResolution) && canvas_height_value !== (canvas_height_value = ctx.viewHeight * ctx.screenResolution)) {
					canvas.height = canvas_height_value;
				}

				if (changed.viewWidth) {
					setStyle(canvas, "width", "" + ctx.viewWidth + "px");
				}

				if (changed.viewHeight) {
					setStyle(canvas, "height", "" + ctx.viewHeight + "px");
				}

				if (ctx.showHoverIcon) {
					if (if_block1) {
						if_block1.p(changed, ctx);
					} else {
						if_block1 = create_if_block_3(component, ctx);
						if_block1.c();
						if_block1.m(div0, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if ((changed.mouseMoveMode || changed.enableDragToPan) && div0_class_value !== (div0_class_value = "" + ((ctx.mouseMoveMode == 'pan' & ctx.enableDragToPan) ? 'panning' : '') + " svelte-ptap6b" + " svelte-ref-stage")) {
					div0.className = div0_class_value;
				}

				if (ctx.labels && ctx.showHoverIcon && ctx.currentIconInfo && ctx.currentIconInfo.top_class_indices) {
					if (if_block2) {
						if_block2.p(changed, ctx);
					} else {
						if_block2 = create_if_block(component, ctx);
						if_block2.c();
						if_block2.m(div1, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}
			},

			d: function destroy$$1(detach) {
				figure.destroy(detach);
				if (detach) {
					detachNode(text0);
				}

				if (if_block0) if_block0.d(detach);
				if (detach) {
					detachNode(text1);
					detachNode(div1);
				}

				zoom.destroy();
				if (component.refs.zoom === zoom) component.refs.zoom = null;
				if (component.refs.canvas === canvas) component.refs.canvas = null;
				if (if_block1) if_block1.d();
				removeListener(div0, "mousedown", mousedown_handler);
				removeListener(div0, "mousemove", mousemove_handler);
				removeListener(div0, "mouseenter", mouseenter_handler);
				removeListener(div0, "mouseout", mouseout_handler);
				if (component.refs.stage === div0) component.refs.stage = null;
				if (if_block2) if_block2.d();
				div1_resize_listener.cancel();
				if (component.refs.root === div1) component.refs.root = null;
			}
		};
	}

	// (3:0) {#if ready}
	function create_if_block_4(component, ctx) {
		var atlasdataloader_updating = {};

		var atlasdataloader_initial_data = {
		 	id: ctx.id,
		 	layer: ctx.layer,
		 	layout: ctx.layout,
		 	classFilter: ctx.classFilter,
		 	filter: ctx.filter
		 };
		if (ctx.config
	     !== void 0) {
			atlasdataloader_initial_data.config = ctx.config
	    ;
			atlasdataloader_updating.config = true;
		}
		if (ctx.layers 
	     !== void 0) {
			atlasdataloader_initial_data.layers = ctx.layers 
	    ;
			atlasdataloader_updating.layers = true;
		}
		if (ctx.labels 
	   !== void 0) {
			atlasdataloader_initial_data.labels = ctx.labels 
	  ;
			atlasdataloader_updating.labels = true;
		}
		var atlasdataloader = new AtlasDataLoader({
			root: component.root,
			store: component.store,
			data: atlasdataloader_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasdataloader_updating.config && changed.config) {
					newState.config = childState.config;
				}

				if (!atlasdataloader_updating.layers && changed.layers) {
					newState.layers = childState.layers;
				}

				if (!atlasdataloader_updating.labels && changed.labels) {
					newState.labels = childState.labels;
				}
				component._set(newState);
				atlasdataloader_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasdataloader._bind({ config: 1, layers: 1, labels: 1 }, atlasdataloader.get());
		});

		return {
			c: function create() {
				atlasdataloader._fragment.c();
			},

			m: function mount(target, anchor) {
				atlasdataloader._mount(target, anchor);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlasdataloader_changes = {};
				if (changed.id) atlasdataloader_changes.id = ctx.id;
				if (changed.layer) atlasdataloader_changes.layer = ctx.layer;
				if (changed.layout) atlasdataloader_changes.layout = ctx.layout;
				if (changed.classFilter) atlasdataloader_changes.classFilter = ctx.classFilter;
				if (changed.filter) atlasdataloader_changes.filter = ctx.filter;
				if (!atlasdataloader_updating.config && changed.config) {
					atlasdataloader_changes.config = ctx.config
	    ;
					atlasdataloader_updating.config = ctx.config
	     !== void 0;
				}
				if (!atlasdataloader_updating.layers && changed.layers) {
					atlasdataloader_changes.layers = ctx.layers 
	    ;
					atlasdataloader_updating.layers = ctx.layers 
	     !== void 0;
				}
				if (!atlasdataloader_updating.labels && changed.labels) {
					atlasdataloader_changes.labels = ctx.labels 
	  ;
					atlasdataloader_updating.labels = ctx.labels 
	   !== void 0;
				}
				atlasdataloader._set(atlasdataloader_changes);
				atlasdataloader_updating = {};
			},

			d: function destroy$$1(detach) {
				atlasdataloader.destroy(detach);
			}
		};
	}

	// (42:6) {#if showHoverIcon}
	function create_if_block_3(component, ctx) {
		var div;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "icon svelte-ptap6b";
				setStyle(div, "width", (ctx.iconSizeInPixels + 2 + 'px'));
				setStyle(div, "height", (ctx.iconSizeInPixels + 2 + 'px'));
				setStyle(div, "left", (ctx.topLeftCornerHover.x + 'px'));
				setStyle(div, "top", (ctx.topLeftCornerHover.y + 'px'));
				addLoc(div, file$8, 42, 8, 921);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
			},

			p: function update(changed, ctx) {
				if (changed.iconSizeInPixels) {
					setStyle(div, "width", (ctx.iconSizeInPixels + 2 + 'px'));
					setStyle(div, "height", (ctx.iconSizeInPixels + 2 + 'px'));
				}

				if (changed.topLeftCornerHover) {
					setStyle(div, "left", (ctx.topLeftCornerHover.x + 'px'));
					setStyle(div, "top", (ctx.topLeftCornerHover.y + 'px'));
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}
			}
		};
	}

	// (47:4) {#if labels && showHoverIcon && currentIconInfo && currentIconInfo.top_class_indices}
	function create_if_block(component, ctx) {
		var div1, table, text0, text1, div0, text2, text3_value = ctx.currentIconInfo.num_activations, text3, text4;

		function select_block_type(ctx) {
			if (ctx.classHeatmap > -1) return create_if_block_2;
			return create_else_block;
		}

		var current_block_type = select_block_type(ctx);
		var if_block0 = current_block_type(component, ctx);

		var if_block1 = (ctx.showHoverImage) && create_if_block_1(component, ctx);

		return {
			c: function create() {
				div1 = createElement("div");
				table = createElement("table");
				if_block0.c();
				text0 = createText("\n        ");
				if (if_block1) if_block1.c();
				text1 = createText("\n        ");
				div0 = createElement("div");
				text2 = createText("Average of ");
				text3 = createText(text3_value);
				text4 = createText(" activations");
				table.className = "svelte-ptap6b";
				addLoc(table, file$8, 48, 8, 1379);
				setStyle(div0, "font-size", "10px");
				setStyle(div0, "margin-top", "4px");
				setStyle(div0, "color", "#999");
				setStyle(div0, "text-align", "right");
				addLoc(div0, file$8, 71, 8, 2414);
				div1.className = "hover svelte-ptap6b";
				setStyle(div1, "top", ((ctx.topLeftCornerHover.y + ctx.iconSizeInPixels + 10) + 'px'));
				setStyle(div1, "left", ((ctx.topLeftCornerHover.x + ctx.iconSizeInPixels + 10) + 'px'));
				addLoc(div1, file$8, 47, 6, 1219);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, table);
				if_block0.m(table, null);
				append(div1, text0);
				if (if_block1) if_block1.m(div1, null);
				append(div1, text1);
				append(div1, div0);
				append(div0, text2);
				append(div0, text3);
				append(div0, text4);
			},

			p: function update(changed, ctx) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0.d(1);
					if_block0 = current_block_type(component, ctx);
					if_block0.c();
					if_block0.m(table, null);
				}

				if (ctx.showHoverImage) {
					if (!if_block1) {
						if_block1 = create_if_block_1(component, ctx);
						if_block1.c();
						if_block1.m(div1, text1);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if ((changed.currentIconInfo) && text3_value !== (text3_value = ctx.currentIconInfo.num_activations)) {
					setData(text3, text3_value);
				}

				if (changed.topLeftCornerHover || changed.iconSizeInPixels) {
					setStyle(div1, "top", ((ctx.topLeftCornerHover.y + ctx.iconSizeInPixels + 10) + 'px'));
					setStyle(div1, "left", ((ctx.topLeftCornerHover.x + ctx.iconSizeInPixels + 10) + 'px'));
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				if_block0.d();
				if (if_block1) if_block1.d();
			}
		};
	}

	// (59:8) {:else}
	function create_else_block(component, ctx) {
		var each_anchor;

		var each_value = ctx.currentIconInfo.top_class_indices.slice(0,5);

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(component, get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_anchor = createComment();
			},

			m: function mount(target, anchor) {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(target, anchor);
				}

				insert(target, each_anchor, anchor);
			},

			p: function update(changed, ctx) {
				if (changed.currentIconInfo || changed.labels) {
					each_value = ctx.currentIconInfo.top_class_indices.slice(0,5);

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(each_anchor.parentNode, each_anchor);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			d: function destroy$$1(detach) {
				destroyEach(each_blocks, detach);

				if (detach) {
					detachNode(each_anchor);
				}
			}
		};
	}

	// (50:8) {#if classHeatmap > -1}
	function create_if_block_2(component, ctx) {
		var tr0, text0, tr1, td0, text1, text2_value = ctx.labels[ctx.currentIconInfo.top_class_indices[0]], text2, text3, td1, text4_value = (ctx.currentIconInfo.top_class_values[0].toPrecision(2)), text4;

		return {
			c: function create() {
				tr0 = createElement("tr");
				text0 = createText("\n          ");
				tr1 = createElement("tr");
				td0 = createElement("td");
				text1 = createText("top class: ");
				text2 = createText(text2_value);
				text3 = createText("\n            ");
				td1 = createElement("td");
				text4 = createText(text4_value);
				addLoc(tr0, file$8, 50, 10, 1429);
				td0.className = "svelte-ptap6b";
				addLoc(td0, file$8, 55, 12, 1698);
				setStyle(td1, "text-align", "right");
				td1.className = "svelte-ptap6b";
				addLoc(td1, file$8, 56, 12, 1777);
				addLoc(tr1, file$8, 54, 10, 1681);
			},

			m: function mount(target, anchor) {
				insert(target, tr0, anchor);
				insert(target, text0, anchor);
				insert(target, tr1, anchor);
				append(tr1, td0);
				append(td0, text1);
				append(td0, text2);
				append(tr1, text3);
				append(tr1, td1);
				append(td1, text4);
			},

			p: function update(changed, ctx) {
				if ((changed.labels || changed.currentIconInfo) && text2_value !== (text2_value = ctx.labels[ctx.currentIconInfo.top_class_indices[0]])) {
					setData(text2, text2_value);
				}

				if ((changed.currentIconInfo) && text4_value !== (text4_value = (ctx.currentIconInfo.top_class_values[0].toPrecision(2)))) {
					setData(text4, text4_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(tr0);
					detachNode(text0);
					detachNode(tr1);
				}
			}
		};
	}

	// (60:10) {#each currentIconInfo.top_class_indices.slice(0,5) as top, i}
	function create_each_block(component, ctx) {
		var tr, td0, text0_value = ctx.i + 1, text0, text1, text2, td1, text3_value = ctx.labels[ctx.top], text3, text4, td2, text5_value = ctx.currentIconInfo.top_class_values[ctx.i].toPrecision(2), text5;

		return {
			c: function create() {
				tr = createElement("tr");
				td0 = createElement("td");
				text0 = createText(text0_value);
				text1 = createText(".");
				text2 = createText("\n              ");
				td1 = createElement("td");
				text3 = createText(text3_value);
				text4 = createText("\n              ");
				td2 = createElement("td");
				text5 = createText(text5_value);
				setStyle(td0, "width", "10px");
				setStyle(td0, "text-align", "right");
				setStyle(td0, "padding-right", "4px");
				td0.className = "svelte-ptap6b";
				addLoc(td0, file$8, 61, 14, 2004);
				td1.className = "" + (ctx.i == 0 ? 'first': '') + " svelte-ptap6b";
				addLoc(td1, file$8, 62, 14, 2096);
				setStyle(td2, "text-align", "right");
				td2.className = "svelte-ptap6b";
				addLoc(td2, file$8, 63, 14, 2164);
				addLoc(tr, file$8, 60, 12, 1985);
			},

			m: function mount(target, anchor) {
				insert(target, tr, anchor);
				append(tr, td0);
				append(td0, text0);
				append(td0, text1);
				append(tr, text2);
				append(tr, td1);
				append(td1, text3);
				append(tr, text4);
				append(tr, td2);
				append(td2, text5);
			},

			p: function update(changed, ctx) {
				if ((changed.labels || changed.currentIconInfo) && text3_value !== (text3_value = ctx.labels[ctx.top])) {
					setData(text3, text3_value);
				}

				if ((changed.currentIconInfo) && text5_value !== (text5_value = ctx.currentIconInfo.top_class_values[ctx.i].toPrecision(2))) {
					setData(text5, text5_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(tr);
				}
			}
		};
	}

	// (69:8) {#if showHoverImage}
	function create_if_block_1(component, ctx) {
		var canvas;

		return {
			c: function create() {
				canvas = createElement("canvas");
				addLoc(canvas, file$8, 69, 10, 2359);
			},

			m: function mount(target, anchor) {
				insert(target, canvas, anchor);
				component.refs.hoverImage = canvas;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(canvas);
				}

				if (component.refs.hoverImage === canvas) component.refs.hoverImage = null;
			}
		};
	}

	function Atlas(options) {
		this._debugName = '<Atlas>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$4(), options.data);

		this._recompute({ layers: 1, layer: 1, viewWidth: 1, viewHeight: 1, gcx: 1, gcy: 1, scale: 1, minViewDimInPx: 1, gridSize: 1, currentZoomIndex: 1, config: 1, lastRecordedCanvasPos: 1, topLeft: 1, layerScale: 1, gridSelected: 1, classHeatmap: 1, mouseMoveMode: 1, onCanvas: 1, currentIconInfo: 1, enableHover: 1 }, this._state);
		if (!('layers' in this._state)) console.warn("<Atlas> was created without expected data property 'layers'");
		if (!('layer' in this._state)) console.warn("<Atlas> was created without expected data property 'layer'");
		if (!('viewWidth' in this._state)) console.warn("<Atlas> was created without expected data property 'viewWidth'");
		if (!('viewHeight' in this._state)) console.warn("<Atlas> was created without expected data property 'viewHeight'");
		if (!('gcx' in this._state)) console.warn("<Atlas> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<Atlas> was created without expected data property 'gcy'");
		if (!('scale' in this._state)) console.warn("<Atlas> was created without expected data property 'scale'");

		if (!('gridSize' in this._state)) console.warn("<Atlas> was created without expected data property 'gridSize'");

		if (!('config' in this._state)) console.warn("<Atlas> was created without expected data property 'config'");
		if (!('mouseMoveMode' in this._state)) console.warn("<Atlas> was created without expected data property 'mouseMoveMode'");
		if (!('onCanvas' in this._state)) console.warn("<Atlas> was created without expected data property 'onCanvas'");

		if (!('enableHover' in this._state)) console.warn("<Atlas> was created without expected data property 'enableHover'");
		if (!('lastRecordedCanvasPos' in this._state)) console.warn("<Atlas> was created without expected data property 'lastRecordedCanvasPos'");



		if (!('classHeatmap' in this._state)) console.warn("<Atlas> was created without expected data property 'classHeatmap'");
		if (!('ready' in this._state)) console.warn("<Atlas> was created without expected data property 'ready'");
		if (!('id' in this._state)) console.warn("<Atlas> was created without expected data property 'id'");
		if (!('layout' in this._state)) console.warn("<Atlas> was created without expected data property 'layout'");
		if (!('classFilter' in this._state)) console.warn("<Atlas> was created without expected data property 'classFilter'");
		if (!('filter' in this._state)) console.warn("<Atlas> was created without expected data property 'filter'");
		if (!('labels' in this._state)) console.warn("<Atlas> was created without expected data property 'labels'");
		if (!('enableDragToPan' in this._state)) console.warn("<Atlas> was created without expected data property 'enableDragToPan'");
		if (!('unit' in this._state)) console.warn("<Atlas> was created without expected data property 'unit'");
		if (!('screenResolution' in this._state)) console.warn("<Atlas> was created without expected data property 'screenResolution'");



		if (!('showHoverImage' in this._state)) console.warn("<Atlas> was created without expected data property 'showHoverImage'");
		this._intro = true;
		this._handlers.update = [onupdate$1];

		this._fragment = create_main_fragment$8(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$2.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Atlas.prototype, protoDev);
	assign(Atlas.prototype, methods$1);

	Atlas.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('maxAttributionValue' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'maxAttributionValue'");
		if ('aspectRatio' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'aspectRatio'");
		if ('minViewDimInPx' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'minViewDimInPx'");
		if ('topLeft' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'topLeft'");
		if ('currentZoomIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'currentZoomIndex'");
		if ('numIconsWide' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'numIconsWide'");
		if ('iconSizeInPixels' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'iconSizeInPixels'");
		if ('layerScale' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'layerScale'");
		if ('gridSelected' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'gridSelected'");
		if ('currentIconInfo' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'currentIconInfo'");
		if ('showHoverIcon' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'showHoverIcon'");
		if ('topLeftCornerHover' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'topLeftCornerHover'");
	};

	Atlas.prototype._recompute = function _recompute(changed, state) {
		if (changed.layers || changed.layer) {
			if (this._differs(state.maxAttributionValue, (state.maxAttributionValue = maxAttributionValue(state)))) changed.maxAttributionValue = true;
		}

		if (changed.viewWidth || changed.viewHeight) {
			if (this._differs(state.aspectRatio, (state.aspectRatio = aspectRatio(state)))) changed.aspectRatio = true;
			if (this._differs(state.minViewDimInPx, (state.minViewDimInPx = minViewDimInPx(state)))) changed.minViewDimInPx = true;
		}

		if (changed.gcx || changed.gcy || changed.scale || changed.viewWidth || changed.viewHeight || changed.minViewDimInPx) {
			if (this._differs(state.topLeft, (state.topLeft = topLeft(state)))) changed.topLeft = true;
		}

		if (changed.scale || changed.gridSize) {
			if (this._differs(state.currentZoomIndex, (state.currentZoomIndex = currentZoomIndex(state)))) changed.currentZoomIndex = true;
		}

		if (changed.currentZoomIndex || changed.layers) {
			if (this._differs(state.numIconsWide, (state.numIconsWide = numIconsWide(state)))) changed.numIconsWide = true;
		}

		if (changed.config || changed.minViewDimInPx || changed.currentZoomIndex || changed.scale) {
			if (this._differs(state.iconSizeInPixels, (state.iconSizeInPixels = iconSizeInPixels(state)))) changed.iconSizeInPixels = true;
		}

		if (changed.minViewDimInPx || changed.config || changed.currentZoomIndex || changed.scale) {
			if (this._differs(state.layerScale, (state.layerScale = layerScale(state)))) changed.layerScale = true;
		}

		if (changed.lastRecordedCanvasPos || changed.topLeft || changed.layerScale || changed.config) {
			if (this._differs(state.gridSelected, (state.gridSelected = gridSelected(state)))) changed.gridSelected = true;
		}

		if (changed.layers || changed.currentZoomIndex || changed.gridSelected || changed.classHeatmap) {
			if (this._differs(state.currentIconInfo, (state.currentIconInfo = currentIconInfo(state)))) changed.currentIconInfo = true;
		}

		if (changed.mouseMoveMode || changed.onCanvas || changed.currentIconInfo || changed.enableHover) {
			if (this._differs(state.showHoverIcon, (state.showHoverIcon = showHoverIcon(state)))) changed.showHoverIcon = true;
		}

		if (changed.config || changed.layerScale || changed.topLeft || changed.gridSelected) {
			if (this._differs(state.topLeftCornerHover, (state.topLeftCornerHover = topLeftCornerHover(state)))) changed.topLeftCornerHover = true;
		}
	};

	/* src/AtlasReticle.html generated by Svelte v2.15.3 */

	function h({scale}) {
		return 1 / scale;
	}

	function w({scale, aspectRatio}) {
		return 1 / scale * aspectRatio;
	}

	function l({gcx, w, width}) {
		return gcx - w / 2;
	}

	function t({gcy, h, height, aspectRatio}) {
		return gcy - h / 2;
	}

	function r({l, w}) {
		return l + w;
	}

	function b({t, h}) {
		return t + h;
	}

	function left({l, width, gcx, gcy, scale, aspectRatio, w, r}) {
		return l * width;
	}

	function right({r, width}) {
		return r * width;
	}

	function top({t, height}) {
		return t * height;
	}

	function bottom({b, height}) {
		return b * height;
	}

	function data$5() {
	  return {
	    width: 0,
	    height: 0,
	    dragging: false,
	    startPos: {x: -100, y: -100},
	    background: true,
	    round: false,
	    color: "#ff6600",
	    enableDragging: true,
	  }
	}
	var methods$2 = {
	  mouseUp() {
	    const { startPos, height, width, scale, aspectRatio, gcx, gcy} = this.get();
	    this.set({dragging: false});
	  },
	  mouseDown(event) {
	    const {enableDragging} = this.get();
	    if(enableDragging){
	      event.preventDefault();
	      this.set({dragging: true, startPos: {x: event.screenX, y: event.screenY}});
	    }
	  },
	  mouseMove(event) {
	    const {dragging, startPos, scale, width, aspectRatio, height, left, top} = this.get();
	    if(dragging){
	       this.set({
	          gcx: (event.screenX - startPos.x + left) / width + 1 / scale * aspectRatio / 2, 
	          gcy: (event.screenY - startPos.y + top) / height + 1 / scale / 2, 
	       });
	       this.set({
	        startPos: {x: event.screenX, y: event.screenY}
	       });
	    }
	  },
	};

	const file$9 = "src/AtlasReticle.html";

	function create_main_fragment$9(component, ctx) {
		var div, div_resize_listener;

		var if_block = (ctx.scale) && create_if_block$1(component, ctx);

		function div_resize_handler() {
			component.set({ width: div.clientWidth, height: div.clientHeight });
		}

		return {
			c: function create() {
				div = createElement("div");
				if (if_block) if_block.c();
				component.root._beforecreate.push(div_resize_handler);
				div.className = "root svelte-ctiyrz";
				addLoc(div, file$9, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
				div_resize_listener = addResizeListener(div, div_resize_handler);
			},

			p: function update(changed, ctx) {
				if (ctx.scale) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$1(component, ctx);
						if_block.c();
						if_block.m(div, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (if_block) if_block.d();
				div_resize_listener.cancel();
			}
		};
	}

	// (2:2) {#if scale}
	function create_if_block$1(component, ctx) {
		var svg, path, path_class_value, path_d_value, text, div, div_class_value;

		function mousemove_handler(event) {
			component.mouseMove(event);
		}

		function mouseup_handler(event) {
			component.mouseUp(event);
		}

		var if_block = (ctx.annotationValue) && create_if_block_1$1(component, ctx);

		function mousemove_handler_1(event) {
			component.mouseMove(event);
		}

		function mousedown_handler(event) {
			component.mouseDown(event);
		}

		function mouseup_handler_1(event) {
			component.mouseUp(event);
		}

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path = createSvgElement("path");
				text = createText("\n  ");
				div = createElement("div");
				if (if_block) if_block.c();
				addListener(path, "mousemove", mousemove_handler);
				addListener(path, "mouseup", mouseup_handler);
				setAttribute(path, "class", path_class_value = "" + (ctx.background ? '' : 'transparent') + " svelte-ctiyrz");
				setAttribute(path, "d", path_d_value = "M0,0 L" + ctx.width + ",0 L" + ctx.width + "," + ctx.height + " L0," + ctx.height + " z M" + ctx.left + "," + ctx.top + " L" + ctx.left + "," + ctx.bottom + " L" + ctx.right + "," + ctx.bottom + "  L" + ctx.right + "," + ctx.top + " z");
				addLoc(path, file$9, 3, 4, 114);
				setAttribute(svg, "width", ctx.width);
				setAttribute(svg, "height", ctx.height);
				setAttribute(svg, "class", "svelte-ctiyrz");
				addLoc(svg, file$9, 2, 2, 87);
				addListener(div, "mousemove", mousemove_handler_1);
				addListener(div, "mousedown", mousedown_handler);
				addListener(div, "mouseup", mouseup_handler_1);
				div.className = div_class_value = "reticle " + (ctx.round ? 'round' : '') + " svelte-ctiyrz";
				setStyle(div, "box-sizing", "content-box");
				setStyle(div, "border-color", ctx.color);
				setStyle(div, "top", "" + (ctx.top-2.5) + "px");
				setStyle(div, "left", "" + (ctx.left-2.5) + "px");
				setStyle(div, "width", "" + (ctx.right-ctx.left-1) + "px");
				setStyle(div, "height", "" + (ctx.bottom-ctx.top-1) + "px");
				setStyle(div, "cursor", "" + (ctx.enableDragging ? 'move' : 'default') + "\n      ");
				addLoc(div, file$9, 10, 2, 383);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path);
				insert(target, text, anchor);
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
			},

			p: function update(changed, ctx) {
				if ((changed.background) && path_class_value !== (path_class_value = "" + (ctx.background ? '' : 'transparent') + " svelte-ctiyrz")) {
					setAttribute(path, "class", path_class_value);
				}

				if ((changed.width || changed.height || changed.left || changed.top || changed.bottom || changed.right) && path_d_value !== (path_d_value = "M0,0 L" + ctx.width + ",0 L" + ctx.width + "," + ctx.height + " L0," + ctx.height + " z M" + ctx.left + "," + ctx.top + " L" + ctx.left + "," + ctx.bottom + " L" + ctx.right + "," + ctx.bottom + "  L" + ctx.right + "," + ctx.top + " z")) {
					setAttribute(path, "d", path_d_value);
				}

				if (changed.width) {
					setAttribute(svg, "width", ctx.width);
				}

				if (changed.height) {
					setAttribute(svg, "height", ctx.height);
				}

				if (ctx.annotationValue) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block_1$1(component, ctx);
						if_block.c();
						if_block.m(div, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.round) && div_class_value !== (div_class_value = "reticle " + (ctx.round ? 'round' : '') + " svelte-ctiyrz")) {
					div.className = div_class_value;
				}

				if (changed.color) {
					setStyle(div, "border-color", ctx.color);
				}

				if (changed.top) {
					setStyle(div, "top", "" + (ctx.top-2.5) + "px");
				}

				if (changed.left) {
					setStyle(div, "left", "" + (ctx.left-2.5) + "px");
				}

				if (changed.right || changed.left) {
					setStyle(div, "width", "" + (ctx.right-ctx.left-1) + "px");
				}

				if (changed.bottom || changed.top) {
					setStyle(div, "height", "" + (ctx.bottom-ctx.top-1) + "px");
				}

				if (changed.enableDragging) {
					setStyle(div, "cursor", "" + (ctx.enableDragging ? 'move' : 'default') + "\n      ");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(svg);
				}

				removeListener(path, "mousemove", mousemove_handler);
				removeListener(path, "mouseup", mouseup_handler);
				if (detach) {
					detachNode(text);
					detachNode(div);
				}

				if (if_block) if_block.d();
				removeListener(div, "mousemove", mousemove_handler_1);
				removeListener(div, "mousedown", mousedown_handler);
				removeListener(div, "mouseup", mouseup_handler_1);
			}
		};
	}

	// (25:4) {#if annotationValue}
	function create_if_block_1$1(component, ctx) {
		var div1, div0, p, text;

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				p = createElement("p");
				text = createText(ctx.annotationValue);
				p.className = "annotation svelte-ctiyrz";
				addLoc(p, file$9, 27, 10, 951);
				div0.className = "annotationTab svelte-ctiyrz";
				setStyle(div0, "background", ctx.color);
				addLoc(div0, file$9, 26, 8, 885);
				div1.className = "annotationTabParent svelte-ctiyrz";
				setStyle(div1, "top", "" + (ctx.w * ctx.width-2)/2 + "px");
				addLoc(div1, file$9, 25, 6, 810);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, p);
				append(p, text);
			},

			p: function update(changed, ctx) {
				if (changed.annotationValue) {
					setData(text, ctx.annotationValue);
				}

				if (changed.color) {
					setStyle(div0, "background", ctx.color);
				}

				if (changed.w || changed.width) {
					setStyle(div1, "top", "" + (ctx.w * ctx.width-2)/2 + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}
			}
		};
	}

	function AtlasReticle(options) {
		this._debugName = '<AtlasReticle>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$5(), options.data);

		this._recompute({ scale: 1, aspectRatio: 1, gcx: 1, w: 1, width: 1, gcy: 1, h: 1, height: 1, l: 1, t: 1, r: 1, b: 1 }, this._state);
		if (!('scale' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'scale'");
		if (!('aspectRatio' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'aspectRatio'");
		if (!('gcx' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'gcx'");

		if (!('width' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'width'");
		if (!('gcy' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'gcy'");

		if (!('height' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'height'");




		if (!('background' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'background'");




		if (!('round' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'round'");
		if (!('color' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'color'");
		if (!('enableDragging' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'enableDragging'");
		if (!('annotationValue' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'annotationValue'");
		this._intro = true;

		this._fragment = create_main_fragment$9(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(AtlasReticle.prototype, protoDev);
	assign(AtlasReticle.prototype, methods$2);

	AtlasReticle.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('h' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'h'");
		if ('w' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'w'");
		if ('l' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'l'");
		if ('t' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 't'");
		if ('r' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'r'");
		if ('b' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'b'");
		if ('left' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'left'");
		if ('right' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'right'");
		if ('top' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'top'");
		if ('bottom' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'bottom'");
	};

	AtlasReticle.prototype._recompute = function _recompute(changed, state) {
		if (changed.scale) {
			if (this._differs(state.h, (state.h = h(state)))) changed.h = true;
		}

		if (changed.scale || changed.aspectRatio) {
			if (this._differs(state.w, (state.w = w(state)))) changed.w = true;
		}

		if (changed.gcx || changed.w || changed.width) {
			if (this._differs(state.l, (state.l = l(state)))) changed.l = true;
		}

		if (changed.gcy || changed.h || changed.height || changed.aspectRatio) {
			if (this._differs(state.t, (state.t = t(state)))) changed.t = true;
		}

		if (changed.l || changed.w) {
			if (this._differs(state.r, (state.r = r(state)))) changed.r = true;
		}

		if (changed.t || changed.h) {
			if (this._differs(state.b, (state.b = b(state)))) changed.b = true;
		}

		if (changed.l || changed.width || changed.gcx || changed.gcy || changed.scale || changed.aspectRatio || changed.w || changed.r) {
			if (this._differs(state.left, (state.left = left(state)))) changed.left = true;
		}

		if (changed.r || changed.width) {
			if (this._differs(state.right, (state.right = right(state)))) changed.right = true;
		}

		if (changed.t || changed.height) {
			if (this._differs(state.top, (state.top = top(state)))) changed.top = true;
		}

		if (changed.b || changed.height) {
			if (this._differs(state.bottom, (state.bottom = bottom(state)))) changed.bottom = true;
		}
	};

	/* src/library/Placeholder.html generated by Svelte v2.15.3 */

	function width({clientWidth}) {
		return clientWidth;
	}

	function height({width, aspectRatio}) {
		return width / aspectRatio;
	}

	function data$6() {
	  return {
	    display: "block",
	    aspectRatio: 1,
	    clientWidth: 0,
	    
	  }
	}
	const file$a = "src/library/Placeholder.html";

	function create_main_fragment$a(component, ctx) {
		var div1, div0, slot_content_default = component._slotted.default, div1_resize_listener;

		function div1_resize_handler() {
			component.set({ clientWidth: div1.clientWidth });
		}

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				div0.className = "container svelte-xqvv98";
				addLoc(div0, file$a, 1, 2, 103);
				component.root._beforecreate.push(div1_resize_handler);
				div1.className = "root svelte-xqvv98";
				setStyle(div1, "display", ctx.display);
				setStyle(div1, "padding-bottom", "" + 100 / ctx.aspectRatio + "%");
				addLoc(div1, file$a, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);

				if (slot_content_default) {
					append(div0, slot_content_default);
				}

				div1_resize_listener = addResizeListener(div1, div1_resize_handler);
			},

			p: function update(changed, ctx) {
				if (changed.display) {
					setStyle(div1, "display", ctx.display);
				}

				if (changed.aspectRatio) {
					setStyle(div1, "padding-bottom", "" + 100 / ctx.aspectRatio + "%");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				if (slot_content_default) {
					reinsertChildren(div0, slot_content_default);
				}

				div1_resize_listener.cancel();
			}
		};
	}

	function Placeholder(options) {
		this._debugName = '<Placeholder>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$6(), options.data);

		this._recompute({ clientWidth: 1, width: 1, aspectRatio: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<Placeholder> was created without expected data property 'clientWidth'");

		if (!('aspectRatio' in this._state)) console.warn("<Placeholder> was created without expected data property 'aspectRatio'");
		if (!('display' in this._state)) console.warn("<Placeholder> was created without expected data property 'display'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$a(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Placeholder.prototype, protoDev);

	Placeholder.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('width' in newState && !this._updatingReadonlyProperty) throw new Error("<Placeholder>: Cannot set read-only property 'width'");
		if ('height' in newState && !this._updatingReadonlyProperty) throw new Error("<Placeholder>: Cannot set read-only property 'height'");
	};

	Placeholder.prototype._recompute = function _recompute(changed, state) {
		if (changed.clientWidth) {
			if (this._differs(state.width, (state.width = width(state)))) changed.width = true;
		}

		if (changed.width || changed.aspectRatio) {
			if (this._differs(state.height, (state.height = height(state)))) changed.height = true;
		}
	};

	/* src/components/AppMiniMap.html generated by Svelte v2.15.3 */

	function data$7() {
	  return {
	    scaleCountFactor: 200
	  }
	}
	const file$b = "src/components/AppMiniMap.html";

	function create_main_fragment$b(component, ctx) {
		var div, text, atlasreticle_updating = {};

		var atlas_initial_data = {
		 	id: ctx.id,
		 	classHeatmap: ctx.classHeatmap,
		 	gridSize: 1,
		 	iconCrop: 0.3,
		 	scaleCountFactor: ctx.scaleCountFactor,
		 	alphaAttributionFactor: 10,
		 	backgroundColor: "#f0f0f0"
		 };
		var atlas = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas_initial_data
		});

		component.refs.overview = atlas;

		var atlasreticle_initial_data = { enableDragging: true };
		if (ctx.aspectRatio
	       !== void 0) {
			atlasreticle_initial_data.aspectRatio = ctx.aspectRatio
	      ;
			atlasreticle_updating.aspectRatio = true;
		}
		if (ctx.scale
	       !== void 0) {
			atlasreticle_initial_data.scale = ctx.scale
	      ;
			atlasreticle_updating.scale = true;
		}
		if (ctx.gcx
	       !== void 0) {
			atlasreticle_initial_data.gcx = ctx.gcx
	      ;
			atlasreticle_updating.gcx = true;
		}
		if (ctx.gcy
	       !== void 0) {
			atlasreticle_initial_data.gcy = ctx.gcy
	      ;
			atlasreticle_updating.gcy = true;
		}
		var atlasreticle = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasreticle_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio = childState.aspectRatio;
				}

				if (!atlasreticle_updating.scale && changed.scale) {
					newState.scale = childState.scale;
				}

				if (!atlasreticle_updating.gcx && changed.gcx) {
					newState.gcx = childState.gcx;
				}

				if (!atlasreticle_updating.gcy && changed.gcy) {
					newState.gcy = childState.gcy;
				}
				component._set(newState);
				atlasreticle_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle.get());
		});

		var placeholder = new Placeholder({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() }
		});

		return {
			c: function create() {
				div = createElement("div");
				atlas._fragment.c();
				text = createText("\n    ");
				atlasreticle._fragment.c();
				placeholder._fragment.c();
				div.className = "svelte-kiaj48 svelte-ref-root";
				addLoc(div, file$b, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				atlas._mount(placeholder._slotted.default, null);
				append(placeholder._slotted.default, text);
				atlasreticle._mount(placeholder._slotted.default, null);
				placeholder._mount(div, null);
				component.refs.root = div;
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlas_changes = {};
				if (changed.id) atlas_changes.id = ctx.id;
				if (changed.classHeatmap) atlas_changes.classHeatmap = ctx.classHeatmap;
				if (changed.scaleCountFactor) atlas_changes.scaleCountFactor = ctx.scaleCountFactor;
				atlas._set(atlas_changes);

				var atlasreticle_changes = {};
				if (!atlasreticle_updating.aspectRatio && changed.aspectRatio) {
					atlasreticle_changes.aspectRatio = ctx.aspectRatio
	      ;
					atlasreticle_updating.aspectRatio = ctx.aspectRatio
	       !== void 0;
				}
				if (!atlasreticle_updating.scale && changed.scale) {
					atlasreticle_changes.scale = ctx.scale
	      ;
					atlasreticle_updating.scale = ctx.scale
	       !== void 0;
				}
				if (!atlasreticle_updating.gcx && changed.gcx) {
					atlasreticle_changes.gcx = ctx.gcx
	      ;
					atlasreticle_updating.gcx = ctx.gcx
	       !== void 0;
				}
				if (!atlasreticle_updating.gcy && changed.gcy) {
					atlasreticle_changes.gcy = ctx.gcy
	      ;
					atlasreticle_updating.gcy = ctx.gcy
	       !== void 0;
				}
				atlasreticle._set(atlasreticle_changes);
				atlasreticle_updating = {};
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				atlas.destroy();
				if (component.refs.overview === atlas) component.refs.overview = null;
				atlasreticle.destroy();
				placeholder.destroy();
				if (component.refs.root === div) component.refs.root = null;
			}
		};
	}

	function AppMiniMap(options) {
		this._debugName = '<AppMiniMap>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$7(), options.data);
		if (!('id' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'id'");
		if (!('classHeatmap' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'classHeatmap'");
		if (!('scaleCountFactor' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'scaleCountFactor'");
		if (!('aspectRatio' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'aspectRatio'");
		if (!('scale' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'scale'");
		if (!('gcx' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'gcy'");
		this._intro = true;

		this._fragment = create_main_fragment$b(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(AppMiniMap.prototype, protoDev);

	AppMiniMap.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	function noop$1() {}

	function assign$1(target) {
		var k,
			source,
			i = 1,
			len = arguments.length;
		for (; i < len; i++) {
			source = arguments[i];
			for (k in source) target[k] = source[k];
		}

		return target;
	}

	function insertNode(node, target, anchor) {
		target.insertBefore(node, anchor);
	}

	function detachNode$1(node) {
		node.parentNode.removeChild(node);
	}

	function createElement$1(name) {
		return document.createElement(name);
	}

	function blankObject$1() {
		return Object.create(null);
	}

	function destroy$1(detach) {
		this.destroy = noop$1;
		this.fire('destroy');
		this.set = this.get = noop$1;

		if (detach !== false) this._fragment.u();
		this._fragment.d();
		this._fragment = this._state = null;
	}

	function _differs$1(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function dispatchObservers(component, group, changed, newState, oldState) {
		for (var key in group) {
			if (!changed[key]) continue;

			var newValue = newState[key];
			var oldValue = oldState[key];

			var callbacks = group[key];
			if (!callbacks) continue;

			for (var i = 0; i < callbacks.length; i += 1) {
				var callback = callbacks[i];
				if (callback.__calling) continue;

				callback.__calling = true;
				callback.call(component, newValue, oldValue);
				callback.__calling = false;
			}
		}
	}

	function fire$1(eventName, data) {
		var handlers =
			eventName in this._handlers && this._handlers[eventName].slice();
		if (!handlers) return;

		for (var i = 0; i < handlers.length; i += 1) {
			handlers[i].call(this, data);
		}
	}

	function get$1(key) {
		return key ? this._state[key] : this._state;
	}

	function init$1(component, options) {
		component._observers = { pre: blankObject$1(), post: blankObject$1() };
		component._handlers = blankObject$1();
		component._bind = options._bind;

		component.options = options;
		component.root = options.root || component;
		component.store = component.root.store || options.store;
	}

	function observe$1(key, callback, options) {
		var group = options && options.defer
			? this._observers.post
			: this._observers.pre;

		(group[key] || (group[key] = [])).push(callback);

		if (!options || options.init !== false) {
			callback.__calling = true;
			callback.call(this, this._state[key]);
			callback.__calling = false;
		}

		return {
			cancel: function() {
				var index = group[key].indexOf(callback);
				if (~index) group[key].splice(index, 1);
			}
		};
	}

	function on$1(eventName, handler) {
		if (eventName === 'teardown') return this.on('destroy', handler);

		var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
		handlers.push(handler);

		return {
			cancel: function() {
				var index = handlers.indexOf(handler);
				if (~index) handlers.splice(index, 1);
			}
		};
	}

	function set$1(newState) {
		this._set(assign$1({}, newState));
		if (this.root._lock) return;
		this.root._lock = true;
		callAll$1(this.root._beforecreate);
		callAll$1(this.root._oncreate);
		callAll$1(this.root._aftercreate);
		this.root._lock = false;
	}

	function _set$1(newState) {
		var oldState = this._state,
			changed = {},
			dirty = false;

		for (var key in newState) {
			if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
		}
		if (!dirty) return;

		this._state = assign$1({}, oldState, newState);
		this._recompute(changed, this._state);
		if (this._bind) this._bind(changed, this._state);

		if (this._fragment) {
			dispatchObservers(this, this._observers.pre, changed, this._state, oldState);
			this._fragment.p(changed, this._state);
			dispatchObservers(this, this._observers.post, changed, this._state, oldState);
		}
	}

	function callAll$1(fns) {
		while (fns && fns.length) fns.shift()();
	}

	function _mount$1(target, anchor) {
		this._fragment[this._fragment.i ? 'i' : 'm'](target, anchor || null);
	}

	function _unmount() {
		if (this._fragment) this._fragment.u();
	}

	var proto$1 = {
		destroy: destroy$1,
		get: get$1,
		fire: fire$1,
		observe: observe$1,
		on: on$1,
		set: set$1,
		teardown: destroy$1,
		_recompute: noop$1,
		_set: _set$1,
		_mount: _mount$1,
		_unmount: _unmount,
		_differs: _differs$1
	};

	/* src/Sprite.html generated by Svelte v1.57.1 */

	// We need to create a global cache of loaded images independent of any sprite instance.
	const cache$1 = new Map();

	function realHeight(width, height) {
	  return height ? height : width;
	}

	function data$8() {
	  return {
	    url: '',
	    index: 0,
	    width: 100,
	    loaded: null,
	    columns: Infinity,
	    height: null,
	    img: null
	  }
	}
	var methods$3 = {
	  draw() {
	    if (this.refs.canvas) {
	      const context = this.refs.canvas.getContext('2d');
	      const { img, index, width, realHeight, columns, loaded } = this.get();
	      context.clearRect(0, 0, width, realHeight);
	      const sx = Array.isArray(index) ? index[0] * width : (index % columns) * width;
	      const sy = Array.isArray(index) ? index[1] * realHeight : Math.floor(index / columns) * realHeight;
	      if (loaded) {
	        context.drawImage(img, sx, sy, width, realHeight, 0, 0, width, realHeight);
	      } else {
	        context.fillStyle = '#ccc';
	        context.fillRect(0, 0, width, realHeight);
	        context.fillStyle = "#eee";
	        context.textAlign = 'center';
	        context.font = '16px sans-serif';
	        context.fillText('...', width / 2, realHeight / 2);
	      }
	    }
	  }
	};

	function oncreate$3() {
	  const done = (e) => {
	    this.set({loaded: true});
	    const {img} = this.get();
	    img.removeEventListener('loaded', done);
	  };
	  // TODO this redraws one too many times on when you change the index and url at the same time. 
	  // could add the svelte extras dependency for 'observeMany', but not sure it's worth it.
	  this.observe('index', index => {
	    this.draw();
	  }, { init: false });
	  this.observe('img', index => {
	    this.draw();
	  }, { init: false });
	  this.observe('loaded', loaded => {
	    this.draw();
	  }, { init: false });
	  this.observe('url', url => {
	    // Clear any pending events for old urls.
	    const currentImg = this.get('img');
	    if (currentImg) {currentImg.removeEventListener('load', done); }
	    // Check if we've already seen this url in the global cache
	    if (cache$1.has(url)) {
	      const cached = cache$1.get(url);
	      // If we've seen it, we need to check if we're currently loading it.
	      if (cached.loaded) {
	        // If it's loaded, just start using it!
	        this.set({
	          loaded: true,
	          img: cached.img
	        });
	      } else {
	        // If it's not loaded, we need to wait until the other request is done before we start drawing.
	        this.set({
	          loaded: false,
	          img: cached.img
	        });
	        cached.img.addEventListener('load', done);
	      }
	    } else {
	      // If we haven't seen the url yet, we need to load the image.
	      const img = new Image();
	      this.set({ 
	        loaded: false,
	        img: img
	       });
	      const data = {img};
	      // We need this event to persist, so that we still know when an abandoned image is done loading.
	      const finished = (e) => {
	        data.loaded = true;
	        img.removeEventListener('load', finished);
	      };
	      img.addEventListener('load', finished);
	      img.addEventListener('load', done);
	      cache$1.set(url, data);
	      img.src = url;
	    }
	  });
	}
	function create_main_fragment$c(component, state) {
		var canvas;

		return {
			c: function create() {
				canvas = createElement$1("canvas");
				this.h();
			},

			h: function hydrate() {
				canvas.width = state.width;
				canvas.height = state.realHeight;
			},

			m: function mount(target, anchor) {
				insertNode(canvas, target, anchor);
				component.refs.canvas = canvas;
			},

			p: function update(changed, state) {
				if (changed.width) {
					canvas.width = state.width;
				}

				if (changed.realHeight) {
					canvas.height = state.realHeight;
				}
			},

			u: function unmount() {
				detachNode$1(canvas);
			},

			d: function destroy$$1() {
				if (component.refs.canvas === canvas) component.refs.canvas = null;
			}
		};
	}

	function Sprite(options) {
		init$1(this, options);
		this.refs = {};
		this._state = assign$1(data$8(), options.data);
		this._recompute({ width: 1, height: 1 }, this._state);

		var _oncreate = oncreate$3.bind(this);

		if (!options.root) {
			this._oncreate = [];
		}

		this._fragment = create_main_fragment$c(this, this._state);

		this.root._oncreate.push(_oncreate);

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);

			callAll$1(this._oncreate);
		}
	}

	assign$1(Sprite.prototype, methods$3, proto$1);

	Sprite.prototype._recompute = function _recompute(changed, state) {
		if (changed.width || changed.height) {
			if (this._differs(state.realHeight, (state.realHeight = realHeight(state.width, state.height)))) changed.realHeight = true;
		}
	};

	var EOL$1 = {},
	    EOF$1 = {},
	    QUOTE$1 = 34,
	    NEWLINE$1 = 10,
	    RETURN$1 = 13;

	function objectConverter$1(columns) {
	  return new Function("d", "return {" + columns.map(function(name, i) {
	    return JSON.stringify(name) + ": d[" + i + "]";
	  }).join(",") + "}");
	}

	function customConverter$1(columns, f) {
	  var object = objectConverter$1(columns);
	  return function(row, i) {
	    return f(object(row), i, columns);
	  };
	}

	// Compute unique columns in order of discovery.
	function inferColumns$1(rows) {
	  var columnSet = Object.create(null),
	      columns = [];

	  rows.forEach(function(row) {
	    for (var column in row) {
	      if (!(column in columnSet)) {
	        columns.push(columnSet[column] = column);
	      }
	    }
	  });

	  return columns;
	}

	function dsv$1(delimiter) {
	  var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
	      DELIMITER = delimiter.charCodeAt(0);

	  function parse(text, f) {
	    var convert, columns, rows = parseRows(text, function(row, i) {
	      if (convert) return convert(row, i - 1);
	      columns = row, convert = f ? customConverter$1(row, f) : objectConverter$1(row);
	    });
	    rows.columns = columns || [];
	    return rows;
	  }

	  function parseRows(text, f) {
	    var rows = [], // output rows
	        N = text.length,
	        I = 0, // current character index
	        n = 0, // current line number
	        t, // current token
	        eof = N <= 0, // current token followed by EOF?
	        eol = false; // current token followed by EOL?

	    // Strip the trailing newline.
	    if (text.charCodeAt(N - 1) === NEWLINE$1) --N;
	    if (text.charCodeAt(N - 1) === RETURN$1) --N;

	    function token() {
	      if (eof) return EOF$1;
	      if (eol) return eol = false, EOL$1;

	      // Unescape quotes.
	      var i, j = I, c;
	      if (text.charCodeAt(j) === QUOTE$1) {
	        while (I++ < N && text.charCodeAt(I) !== QUOTE$1 || text.charCodeAt(++I) === QUOTE$1);
	        if ((i = I) >= N) eof = true;
	        else if ((c = text.charCodeAt(I++)) === NEWLINE$1) eol = true;
	        else if (c === RETURN$1) { eol = true; if (text.charCodeAt(I) === NEWLINE$1) ++I; }
	        return text.slice(j + 1, i - 1).replace(/""/g, "\"");
	      }

	      // Find next delimiter or newline.
	      while (I < N) {
	        if ((c = text.charCodeAt(i = I++)) === NEWLINE$1) eol = true;
	        else if (c === RETURN$1) { eol = true; if (text.charCodeAt(I) === NEWLINE$1) ++I; }
	        else if (c !== DELIMITER) continue;
	        return text.slice(j, i);
	      }

	      // Return last token before EOF.
	      return eof = true, text.slice(j, N);
	    }

	    while ((t = token()) !== EOF$1) {
	      var row = [];
	      while (t !== EOL$1 && t !== EOF$1) row.push(t), t = token();
	      if (f && (row = f(row, n++)) == null) continue;
	      rows.push(row);
	    }

	    return rows;
	  }

	  function format(rows, columns) {
	    if (columns == null) columns = inferColumns$1(rows);
	    return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
	      return columns.map(function(column) {
	        return formatValue(row[column]);
	      }).join(delimiter);
	    })).join("\n");
	  }

	  function formatRows(rows) {
	    return rows.map(formatRow).join("\n");
	  }

	  function formatRow(row) {
	    return row.map(formatValue).join(delimiter);
	  }

	  function formatValue(text) {
	    return text == null ? ""
	        : reFormat.test(text += "") ? "\"" + text.replace(/"/g, "\"\"") + "\""
	        : text;
	  }

	  return {
	    parse: parse,
	    parseRows: parseRows,
	    format: format,
	    formatRows: formatRows
	  };
	}

	var csv$2 = dsv$1(",");

	var csvParse$1 = csv$2.parse;

	var tsv$2 = dsv$1("\t");

	var tsvParse$1 = tsv$2.parse;

	// Copyright 2018 The Lucid Authors.All Rights Reserved.


	// // Basic usage examples: 
	// import {load} from 'lucid-components';
	// 
	// load("test.csv").then(response => console.log("1", response));
	// load(["test.csv", "test.tsv"]).then(response => console.log("2", response[0], response[1]));
	// load('3a.jpg').then(response => {this.refs.img.src = response.src;})
	// 
	// // You can also namespace requests, which will cancel previous requests
	// load("test.csv", "namespace").then(response => console.log("This will never be called."))
	// load("test.tsv", "namespace").then(response => console.log("This will interrupt the previous one and be resolved instead."))



	// We will cache requests and parsing.
	const cache$1$1 = new Map();
	const suppress$1 = new Map();
	const namespaces$1 = new Map();

	// Mapping file extensions to loaders
	const loaders$1 = new Map([
	  ['gif', image$1],
	  ['png', image$1],
	  ['jpeg', image$1],
	  ['jpg', image$1],
	  ['csv', csv$1$1],
	  ['tsv', tsv$1$1],
	  ['txt', text$1],
	  ['text', text$1],
	  ['json', json$1],
	]);

	// Loaders
	function handleErrors$1(response) {
	  if (response.ok) {
	    return response;
	  } else {
	    throw new Error(response.status + ':' + response.statusText);
	  }
	}

	function image$1(url) {
	  return new Promise((resolve, reject) => {
	    let img = new Image();
	    img.onload = event => resolve(img);
	    img.onerror = event => reject(event);
	    img.src = url;
	  })
	}

	function json$1(url) {
	  return fetch(url).then(handleErrors$1).then(response => response.json())
	}

	function text$1(url) {
	  return fetch(url).then(handleErrors$1).then(response => response.text());
	}

	function csv$1$1(url) {
	  return text$1(url).then(text => Promise.resolve(csvParse$1(text)));
	}

	function tsv$1$1(url) {
	  return text$1(url).then(text => Promise.resolve(tsvParse$1(text)));
	}


	// Load a url or an array of urls.
	function load$1(url, namespace) {

	  // We will to create a namespace if we don't have one.
	  let ns = namespace != null ? namespace : Date.now() + "" + Math.random();

	  // Create a unique ID for this request
	  let requestID = "namespace:" + ns + ", url:" + url + ", random:" + Date.now() + "" + Math.random();
	  suppress$1.set(requestID, false);

	  // If we have a previous request in this namespace, mark it as suppressed so 
	  // that the promise is never resolved. Then we reset the current namespace to 
	  // the current request.
	  if (namespaces$1.has(ns)) {
	    const pendingRequestID = namespaces$1.get(ns);
	    suppress$1.set(pendingRequestID, true);
	  }
	  namespaces$1.set(ns, requestID);
	  
	  return new Promise((resolve, reject) => {
	    let p;
	    if (Array.isArray(url)) {
	      const promises = url.map(u => _loadURL$1(u));
	      p = Promise.all(promises);
	    } else {
	      p =  _loadURL$1(url);
	    }
	    p
	      .then(val => {
	        //check to see if we've suppressed this request.
	        if (!suppress$1.get(requestID)) {
	          resolve(val);
	        }
	      })
	      .catch(error => {
	        //check to see if we've suppressed this request.
	        if (!suppress$1.get(requestID)) {
	          reject(error);
	        }
	      });
	    
	  });
	}

	// Private loading function
	function _loadURL$1(url) {
	  let id = url;
	  if (cache$1$1.has(id)) {
	    return cache$1$1.get(id);
	  } else {
	    let extension = parseFileExtensionFromURL$1(url, loaders$1);
	    let loader = loaders$1.get(extension);
	    let p = loader(url);
	    cache$1$1.set(id, p);
	    return p;
	  }
	}

	// Helpers

	// Returns a filetype extension from a given url string
	function parseFileExtensionFromURL$1(url, loaders) {
	  const parts = url.split(".");
	  const ext = parts[parts.length - 1];
	  if (!loaders.has(ext)) {
	    console.warn('Trying to load url: ' + url + ' with an unknown filetype. Assuming "text".');
	  }
	  return loaders.has(ext) ? ext : 'text';
	}
	//# sourceMappingURL=index.js.map

	/* src/AtlasThumbnail.html generated by Svelte v2.15.3 */



	function height$1({clientWidth}) {
		return clientWidth;
	}

	function id({model, layerName}) {
		return model + "_" + layerName;
	}

	function data$9() {
	  return {
	    root: "https://storage.googleapis.com/activation-atlas/build",
	    model: "inceptionv1",
	    layerName: "mixed4d",
	    grid: 1,
	    layout: 0,
	    gridSize: 10,
	    classHeatmap: -1,
	    icons: []
	  };
	}
	var methods$4 = {
	  render() {
	    const {gridSize, icons, classHeatmap} = this.get();
	    const context = this.refs.canvas.getContext('2d');
	    let imageData = context.getImageData(0, 0, gridSize, gridSize);
	    let data = imageData.data;
	    // for (var i = 0; i < data.length; i += 4) {
	      // data[i] = 100;
	      // data[i + 1] = 100;
	      // data[i + 2] = 100;
	      // data[i + 3] = 255;
	    // }
	    for (const icon of icons) {
	      let heatmapMultiplier = 0.5;
	      if (classHeatmap > -1) {
	        let ci = classesToKeep.indexOf(classHeatmap);
	        let value = Math.max(0, icon.f[ci]);
	        heatmapMultiplier = Math.max(0.05, value * 5);
	        // console.log(ci, value)
	      }
	      const y = icon.x; //x,y switched on purpose 
	      const x = icon.y; //x,y switched on purpose
	      // data[y * gridSize * 4 + x * 4 + 0] = (heatmapMultiplier) * 255 * 20;
	      // data[y * gridSize * 4 + x * 4 + 1] = (heatmapMultiplier) * 130 * 20;
	      // data[y * gridSize * 4 + x * 4 + 2] = (heatmapMultiplier) * 1 * 20;
	      data[y * gridSize * 4 + x * 4 + 3] = icon.n * heatmapMultiplier;
	    }
	    
	    context.putImageData(imageData, 0, 0);
	  }
	};

	function oncreate$4() {
	  const {root, id, grid} = this.get();
	  load$1(`${root}/${id}/${id}.json`).then(config => {
	    // console.log("config: ", config)
	    if (config.class_filter == null) { config.class_filter = "None"; }
	    if (config.filter == null) { config.filter = "None"; }
	    if (!Array.isArray(config.layout)) {config.layout = [config.layout];}
	    if (!Array.isArray(config.layer)) {config.layer = [config.layer];}
	    if (!Array.isArray(config.filter)) {config.filter = [config.filter];}
	    this.set({gridSize: config.grid_size[grid]});
	    const url = `${root}/${id}/web/web--grid_size=${config.grid_size[grid]}--layout=${config.layout[0]}--class_filter=${config.class_filter}--filter=${config.filter[0]}--layer=${config.layer[0]}--model=${config.model}--sample_images=${config.sample_images}--sample_type=${config.sample_type}.json`;
	    // console.log("config", config)
	    load$1(url).then(web => {
	      // console.log("web", web)
	      this.set({icons: web});
	      this.render();
	    });
	  });
	}
	function onupdate$2({changed}) {
	  if (changed.classHeatmap) {
	    this.render();
	  }
	}
	const file$c = "src/AtlasThumbnail.html";

	function create_main_fragment$d(component, ctx) {
		var div, canvas, div_resize_listener;

		function div_resize_handler() {
			component.set({ clientWidth: div.clientWidth });
		}

		return {
			c: function create() {
				div = createElement("div");
				canvas = createElement("canvas");
				canvas.width = ctx.gridSize;
				canvas.height = ctx.gridSize;
				setStyle(canvas, "width", "" + ctx.clientWidth + "px");
				setStyle(canvas, "height", "" + ctx.height + "px");
				canvas.className = "svelte-sjakuy";
				addLoc(canvas, file$c, 2, 2, 54);
				component.root._beforecreate.push(div_resize_handler);
				setStyle(div, "height", "" + ctx.height + "px");
				addLoc(div, file$c, 1, 0, 1);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, canvas);
				component.refs.canvas = canvas;
				div_resize_listener = addResizeListener(div, div_resize_handler);
			},

			p: function update(changed, ctx) {
				if (changed.gridSize) {
					canvas.width = ctx.gridSize;
					canvas.height = ctx.gridSize;
				}

				if (changed.clientWidth) {
					setStyle(canvas, "width", "" + ctx.clientWidth + "px");
				}

				if (changed.height) {
					setStyle(canvas, "height", "" + ctx.height + "px");
					setStyle(div, "height", "" + ctx.height + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (component.refs.canvas === canvas) component.refs.canvas = null;
				div_resize_listener.cancel();
			}
		};
	}

	function AtlasThumbnail(options) {
		this._debugName = '<AtlasThumbnail>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$9(), options.data);

		this._recompute({ clientWidth: 1, model: 1, layerName: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'clientWidth'");
		if (!('model' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'model'");
		if (!('layerName' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'layerName'");

		if (!('gridSize' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'gridSize'");
		this._intro = true;
		this._handlers.update = [onupdate$2];

		this._fragment = create_main_fragment$d(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$4.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(AtlasThumbnail.prototype, protoDev);
	assign(AtlasThumbnail.prototype, methods$4);

	AtlasThumbnail.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('height' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasThumbnail>: Cannot set read-only property 'height'");
		if ('id' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasThumbnail>: Cannot set read-only property 'id'");
	};

	AtlasThumbnail.prototype._recompute = function _recompute(changed, state) {
		if (changed.clientWidth) {
			if (this._differs(state.height, (state.height = height$1(state)))) changed.height = true;
		}

		if (changed.model || changed.layerName) {
			if (this._differs(state.id, (state.id = id(state)))) changed.id = true;
		}
	};

	/* src/components/AppLayerChooser.html generated by Svelte v2.15.3 */

	function data$a() { return {
	  layerName: "mixed4c",
	  layers: [
	    "mixed3b",
	    "mixed4a",
	    "mixed4b",
	    "mixed4c",
	    "mixed4d",
	    "mixed4e",
	    "mixed5a",
	    "mixed5b",
	  ],
	  classHeatmap: -1
	}; }
	const file$d = "src/components/AppLayerChooser.html";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.layer = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$e(component, ctx) {
		var div;

		var each_value = ctx.layers;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(component, get_each_context$1(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "stack";
				addLoc(div, file$d, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.layerName || changed.layers || changed.classHeatmap) {
					each_value = ctx.layers;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$1(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				destroyEach(each_blocks, detach);
			}
		};
	}

	// (2:0) {#each layers as layer, i}
	function create_each_block$1(component, ctx) {
		var label, input, input_value_value, text0, div, text1, span, text2_value = ctx.layer, text2, text3, label_class_value;

		function input_change_handler() {
			component.set({ layerName: input.__value });
		}

		var atlasthumbnail_initial_data = {
		 	layerName: ctx.layer,
		 	classHeatmap: ctx.classHeatmap
		 };
		var atlasthumbnail = new AtlasThumbnail({
			root: component.root,
			store: component.store,
			data: atlasthumbnail_initial_data
		});

		return {
			c: function create() {
				label = createElement("label");
				input = createElement("input");
				text0 = createText("\n    ");
				div = createElement("div");
				atlasthumbnail._fragment.c();
				text1 = createText("\n    ");
				span = createElement("span");
				text2 = createText(text2_value);
				text3 = createText("\n  ");
				component._bindingGroups[0].push(input);
				addListener(input, "change", input_change_handler);
				setAttribute(input, "type", "radio");
				input.__value = input_value_value = ctx.layer;
				input.value = input.__value;
				input.className = "svelte-hzvbih";
				addLoc(input, file$d, 3, 4, 114);
				setStyle(div, "width", "50px");
				setStyle(div, "position", "relative");
				addLoc(div, file$d, 4, 4, 172);
				span.className = "svelte-hzvbih";
				addLoc(span, file$d, 7, 4, 291);
				label.className = label_class_value = "layer " + (ctx.layerName == ctx.layer ? 'selected' : '') + " svelte-hzvbih";
				addLoc(label, file$d, 2, 2, 49);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, input);

				input.checked = input.__value === ctx.layerName;

				append(label, text0);
				append(label, div);
				atlasthumbnail._mount(div, null);
				append(label, text1);
				append(label, span);
				append(span, text2);
				append(label, text3);
			},

			p: function update(changed, ctx) {
				if (changed.layerName) input.checked = input.__value === ctx.layerName;
				if ((changed.layers) && input_value_value !== (input_value_value = ctx.layer)) {
					input.__value = input_value_value;
				}

				input.value = input.__value;

				var atlasthumbnail_changes = {};
				if (changed.layers) atlasthumbnail_changes.layerName = ctx.layer;
				if (changed.classHeatmap) atlasthumbnail_changes.classHeatmap = ctx.classHeatmap;
				atlasthumbnail._set(atlasthumbnail_changes);

				if ((changed.layers) && text2_value !== (text2_value = ctx.layer)) {
					setData(text2, text2_value);
				}

				if ((changed.layerName || changed.layers) && label_class_value !== (label_class_value = "layer " + (ctx.layerName == ctx.layer ? 'selected' : '') + " svelte-hzvbih")) {
					label.className = label_class_value;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(label);
				}

				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input), 1);
				removeListener(input, "change", input_change_handler);
				atlasthumbnail.destroy();
			}
		};
	}

	function AppLayerChooser(options) {
		this._debugName = '<AppLayerChooser>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$a(), options.data);
		if (!('layers' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'layers'");
		if (!('layerName' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'layerName'");
		if (!('classHeatmap' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'classHeatmap'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._fragment = create_main_fragment$e(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(AppLayerChooser.prototype, protoDev);

	AppLayerChooser.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	var inceptionLabels = {
	  inception: [
	    "dummy",
	    "kit fox",
	    "English setter",
	    "Siberian husky",
	    "Australian terrier",
	    "English springer",
	    "grey whale",
	    "lesser panda",
	    "Egyptian cat",
	    "ibex",
	    "Persian cat",
	    "cougar",
	    "gazelle",
	    "porcupine",
	    "sea lion",
	    "malamute",
	    "badger",
	    "Great Dane",
	    "Walker hound",
	    "Welsh springer spaniel",
	    "whippet",
	    "Scottish deerhound",
	    "killer whale",
	    "mink",
	    "African elephant",
	    "Weimaraner",
	    "soft - coated wheaten terrier",
	    "Dandie Dinmont",
	    "red wolf",
	    "Old English sheepdog",
	    "jaguar",
	    "otterhound",
	    "bloodhound",
	    "Airedale",
	    "hyena",
	    "meerkat",
	    "giant schnauzer",
	    "titi",
	    "three - toed sloth",
	    "sorrel",
	    "black - footed ferret",
	    "dalmatian",
	    "black - and - tan coonhound",
	    "papillon",
	    "skunk",
	    "Staffordshire bullterrier",
	    "Mexican hairless",
	    "Bouvier des Flandres",
	    "weasel",
	    "miniature poodle",
	    "Cardigan",
	    "malinois",
	    "bighorn",
	    "fox squirrel",
	    "colobus",
	    "tiger cat",
	    "Lhasa",
	    "impala",
	    "coyote",
	    "Yorkshire terrier",
	    "Newfoundland",
	    "brown bear",
	    "red fox",
	    "Norwegian elkhound",
	    "Rottweiler",
	    "hartebeest",
	    "Saluki",
	    "grey fox",
	    "schipperke",
	    "Pekinese",
	    "Brabancon griffon",
	    "West Highland white terrier",
	    "Sealyham terrier",
	    "guenon",
	    "mongoose",
	    "indri",
	    "tiger",
	    "Irish wolfhound",
	    "wild boar",
	    "EntleBucher",
	    "zebra",
	    "ram",
	    "French bulldog",
	    "orangutan",
	    "basenji",
	    "leopard",
	    "Bernese mountain dog",
	    "Maltese dog",
	    "Norfolk terrier",
	    "toy terrier",
	    "vizsla",
	    "cairn",
	    "squirrel monkey",
	    "groenendael",
	    "clumber",
	    "Siamese cat",
	    "chimpanzee",
	    "komondor",
	    "Afghan hound",
	    "Japanese spaniel",
	    "proboscis monkey",
	    "guinea pig",
	    "white wolf",
	    "ice bear",
	    "gorilla",
	    "borzoi",
	    "toy poodle",
	    "Kerry blue terrier",
	    "ox",
	    "Scotch terrier",
	    "Tibetan mastiff",
	    "spider monkey",
	    "Doberman",
	    "Boston bull",
	    "Greater Swiss Mountain dog",
	    "Appenzeller",
	    "Shih - Tzu",
	    "Irish water spaniel",
	    "Pomeranian",
	    "Bedlington terrier",
	    "warthog",
	    "Arabian camel",
	    "siamang",
	    "miniature schnauzer",
	    "collie",
	    "golden retriever",
	    "Irish terrier",
	    "affenpinscher",
	    "Border collie",
	    "hare",
	    "boxer",
	    "silky terrier",
	    "beagle",
	    "Leonberg",
	    "German short - haired pointer",
	    "patas",
	    "dhole",
	    "baboon",
	    "macaque",
	    "Chesapeake Bay retriever",
	    "bull mastiff",
	    "kuvasz",
	    "capuchin",
	    "pug",
	    "curly - coated retriever",
	    "Norwich terrier",
	    "flat - coated retriever",
	    "hog",
	    "keeshond",
	    "Eskimo dog",
	    "Brittany spaniel",
	    "standard poodle",
	    "Lakeland terrier",
	    "snow leopard",
	    "Gordon setter",
	    "dingo",
	    "standard schnauzer",
	    "hamster",
	    "Tibetan terrier",
	    "Arctic fox",
	    "wire - haired fox terrier",
	    "basset",
	    "water buffalo",
	    "American black bear",
	    "Angora",
	    "bison",
	    "howler monkey",
	    "hippopotamus",
	    "chow",
	    "giant panda",
	    "American Staffordshire terrier",
	    "Shetland sheepdog",
	    "Great Pyrenees",
	    "Chihuahua",
	    "tabby",
	    "marmoset",
	    "Labrador retriever",
	    "Saint Bernard",
	    "armadillo",
	    "Samoyed",
	    "bluetick",
	    "redbone",
	    "polecat",
	    "marmot",
	    "kelpie",
	    "gibbon",
	    "llama",
	    "miniature pinscher",
	    "wood rabbit",
	    "Italian greyhound",
	    "lion",
	    "cocker spaniel",
	    "Irish setter",
	    "dugong",
	    "Indian elephant",
	    "beaver",
	    "Sussex spaniel",
	    "Pembroke",
	    "Blenheim spaniel",
	    "Madagascar cat",
	    "Rhodesian ridgeback",
	    "lynx",
	    "African hunting dog",
	    "langur",
	    "Ibizan hound",
	    "timber wolf",
	    "cheetah",
	    "English foxhound",
	    "briard",
	    "sloth bear",
	    "Border terrier",
	    "German shepherd",
	    "otter",
	    "koala",
	    "tusker",
	    "echidna",
	    "wallaby",
	    "platypus",
	    "wombat",
	    "revolver",
	    "umbrella",
	    "schooner",
	    "soccer ball",
	    "accordion",
	    "ant",
	    "starfish",
	    "chambered nautilus",
	    "grand piano",
	    "laptop",
	    "strawberry",
	    "airliner",
	    "warplane",
	    "airship",
	    "balloon",
	    "space shuttle",
	    "fireboat",
	    "gondola",
	    "speedboat",
	    "lifeboat",
	    "canoe",
	    "yawl",
	    "catamaran",
	    "trimaran",
	    "container ship",
	    "liner",
	    "pirate",
	    "aircraft carrier",
	    "submarine",
	    "wreck",
	    "half track",
	    "tank",
	    "missile",
	    "bobsled",
	    "dogsled",
	    "bicycle - built -for-two",
	    "mountain bike",
	    "freight car",
	    "passenger car",
	    "barrow",
	    "shopping cart",
	    "motor scooter",
	    "forklift",
	    "electric locomotive",
	    "steam locomotive",
	    "amphibian",
	    "ambulance",
	    "beach wagon",
	    "cab",
	    "convertible",
	    "jeep",
	    "limousine",
	    "minivan",
	    "Model T",
	    "racer",
	    "sports car",
	    "go-kart",
	    "golfcart",
	    "moped",
	    "snowplow",
	    "fire engine",
	    "garbage truck",
	    "pickup",
	    "tow truck",
	    "trailer truck",
	    "moving van",
	    "police van",
	    "recreational vehicle",
	    "streetcar",
	    "snowmobile",
	    "tractor",
	    "mobile home",
	    "tricycle",
	    "unicycle",
	    "horse cart",
	    "jinrikisha",
	    "oxcart",
	    "bassinet",
	    "cradle",
	    "crib",
	    "four-poster",
	    "bookcase",
	    "china cabinet",
	    "medicine chest",
	    "chiffonier",
	    "table lamp",
	    "file",
	    "park bench",
	    "barber chair",
	    "throne",
	    "folding chair",
	    "rocking chair",
	    "studio couch",
	    "toilet seat",
	    "desk",
	    "pool table",
	    "dining table",
	    "entertainment center",
	    "wardrobe",
	    "Granny Smith",
	    "orange",
	    "lemon",
	    "fig",
	    "pineapple",
	    "banana",
	    "jackfruit",
	    "custard apple",
	    "pomegranate",
	    "acorn",
	    "hip",
	    "ear",
	    "rapeseed",
	    "corn",
	    "buckeye",
	    "organ",
	    "upright",
	    "chime",
	    "drum",
	    "gong",
	    "maraca",
	    "marimba",
	    "steel drum",
	    "banjo",
	    "cello",
	    "violin",
	    "harp",
	    "acoustic guitar",
	    "electric guitar",
	    "cornet",
	    "French horn",
	    "trombone",
	    "harmonica",
	    "ocarina",
	    "panpipe",
	    "bassoon",
	    "oboe",
	    "sax",
	    "flute",
	    "daisy",
	    "yellow lady's slipper",
	    "cliff",
	    "valley",
	    "alp",
	    "volcano",
	    "promontory",
	    "sandbar",
	    "coral reef",
	    "lakeside",
	    "seashore",
	    "geyser",
	    "hatchet",
	    "cleaver",
	    "letter opener",
	    "plane",
	    "power drill",
	    "lawn mower",
	    "hammer",
	    "corkscrew",
	    "can opener",
	    "plunger",
	    "screwdriver",
	    "shovel",
	    "plow",
	    "chain saw",
	    "cock",
	    "hen",
	    "ostrich",
	    "brambling",
	    "goldfinch",
	    "house finch",
	    "junco",
	    "indigo bunting",
	    "robin",
	    "bulbul",
	    "jay",
	    "magpie",
	    "chickadee",
	    "water ouzel",
	    "kite",
	    "bald eagle",
	    "vulture",
	    "great grey owl",
	    "black grouse",
	    "ptarmigan",
	    "ruffed grouse",
	    "prairie chicken",
	    "peacock",
	    "quail",
	    "partridge",
	    "African grey",
	    "macaw",
	    "sulphur-crested cockatoo",
	    "lorikeet",
	    "coucal",
	    "bee eater",
	    "hornbill",
	    "hummingbird",
	    "jacamar",
	    "toucan",
	    "drake",
	    "red-breasted merganser",
	    "goose",
	    "black swan",
	    "white stork",
	    "black stork",
	    "spoonbill",
	    "flamingo",
	    "American egret",
	    "little blue heron",
	    "bittern",
	    "crane",
	    "limpkin",
	    "American coot",
	    "bustard",
	    "ruddy turnstone",
	    "red - backed sandpiper",
	    "redshank",
	    "dowitcher",
	    "oystercatcher",
	    "European gallinule",
	    "pelican",
	    "king penguin",
	    "albatross",
	    "great white shark",
	    "tiger shark",
	    "hammerhead",
	    "electric ray",
	    "stingray",
	    "barracouta",
	    "coho",
	    "tench",
	    "goldfish",
	    "eel",
	    "rock beauty",
	    "anemone fish",
	    "lionfish",
	    "puffer",
	    "sturgeon",
	    "gar",
	    "loggerhead",
	    "leatherback turtle",
	    "mud turtle",
	    "terrapin",
	    "box turtle",
	    "banded gecko",
	    "common iguana",
	    "American chameleon",
	    "whiptail",
	    "agama",
	    "frilled lizard",
	    "alligator lizard",
	    "Gila monster",
	    "green lizard",
	    "African chameleon",
	    "Komodo dragon",
	    "triceratops",
	    "African crocodile",
	    "American alligator",
	    "thunder snake",
	    "ringneck snake",
	    "hognose snake",
	    "green snake",
	    "king snake",
	    "garter snake",
	    "water snake",
	    "vine snake",
	    "night snake",
	    "boa constrictor",
	    "rock python",
	    "Indian cobra",
	    "green mamba",
	    "sea snake",
	    "horned viper",
	    "diamondback",
	    "sidewinder",
	    "European fire salamander",
	    "common newt",
	    "eft",
	    "spotted salamander",
	    "axolotl",
	    "bullfrog",
	    "tree frog",
	    "tailed frog",
	    "whistle",
	    "wing",
	    "paintbrush",
	    "hand blower",
	    "oxygen mask",
	    "snorkel",
	    "loudspeaker",
	    "microphone",
	    "screen",
	    "mouse",
	    "electric fan",
	    "oil filter",
	    "strainer",
	    "space heater",
	    "stove",
	    "guillotine",
	    "barometer",
	    "rule",
	    "odometer",
	    "scale",
	    "analog clock",
	    "digital clock",
	    "wall clock",
	    "hourglass",
	    "sundial",
	    "parking meter",
	    "stopwatch",
	    "digital watch",
	    "stethoscope",
	    "syringe",
	    "magnetic compass",
	    "binoculars",
	    "projector",
	    "sunglasses",
	    "loupe",
	    "radio telescope",
	    "bow",
	    "cannon [ground]",
	    "assault rifle",
	    "rifle",
	    "projectile",
	    "computer keyboard",
	    "typewriter keyboard",
	    "crane",
	    "lighter",
	    "abacus",
	    "cash machine",
	    "slide rule",
	    "desktop computer",
	    "hand - held computer",
	    "notebook",
	    "web site",
	    "harvester",
	    "thresher",
	    "printer",
	    "slot",
	    "vending machine",
	    "sewing machine",
	    "joystick",
	    "switch",
	    "hook",
	    "car wheel",
	    "paddlewheel",
	    "pinwheel",
	    "potter's wheel",
	    "gas pump",
	    "carousel",
	    "swing",
	    "reel",
	    "radiator",
	    "puck",
	    "hard disc",
	    "sunglass",
	    "pick",
	    "car mirror",
	    "solar dish",
	    "remote control",
	    "disk brake",
	    "buckle",
	    "hair slide",
	    "knot",
	    "combination lock",
	    "padlock",
	    "nail",
	    "safety pin",
	    "screw",
	    "muzzle",
	    "seat belt",
	    "ski",
	    "candle",
	    "jack - o'-lantern",
	    "spotlight",
	    "torch",
	    "neck brace",
	    "pier",
	    "tripod",
	    "maypole",
	    "mousetrap",
	    "spider web",
	    "trilobite",
	    "harvestman",
	    "scorpion",
	    "black and gold garden spider",
	    "barn spider",
	    "garden spider",
	    "black widow",
	    "tarantula",
	    "wolf spider",
	    "tick",
	    "centipede",
	    "isopod",
	    "Dungeness crab",
	    "rock crab",
	    "fiddler crab",
	    "king crab",
	    "American lobster",
	    "spiny lobster",
	    "crayfish",
	    "hermit crab",
	    "tiger beetle",
	    "ladybug",
	    "ground beetle",
	    "long - horned beetle",
	    "leaf beetle",
	    "dung beetle",
	    "rhinoceros beetle",
	    "weevil",
	    "fly",
	    "bee",
	    "grasshopper",
	    "cricket",
	    "walking stick",
	    "cockroach",
	    "mantis",
	    "cicada",
	    "leafhopper",
	    "lacewing",
	    "dragonfly",
	    "damselfly",
	    "admiral",
	    "ringlet",
	    "monarch",
	    "cabbage butterfly",
	    "sulphur butterfly",
	    "lycaenid",
	    "jellyfish",
	    "sea anemone",
	    "brain coral",
	    "flatworm",
	    "nematode",
	    "conch",
	    "snail",
	    "slug",
	    "sea slug",
	    "chiton",
	    "sea urchin",
	    "sea cucumber",
	    "iron",
	    "espresso maker",
	    "microwave",
	    "Dutch oven",
	    "rotisserie",
	    "toaster",
	    "waffle iron",
	    "vacuum",
	    "dishwasher",
	    "refrigerator",
	    "washer",
	    "Crock Pot",
	    "frying pan",
	    "wok",
	    "caldron",
	    "coffeepot",
	    "teapot",
	    "spatula",
	    "altar",
	    "triumphal arch",
	    "patio",
	    "steel arch bridge",
	    "suspension bridge",
	    "viaduct",
	    "barn",
	    "greenhouse",
	    "palace",
	    "monastery",
	    "library",
	    "apiary",
	    "boathouse",
	    "church",
	    "mosque",
	    "stupa",
	    "planetarium",
	    "restaurant",
	    "cinema",
	    "home theater",
	    "lumbermill",
	    "coil",
	    "obelisk",
	    "totem pole",
	    "castle",
	    "prison",
	    "grocery store",
	    "bakery",
	    "barbershop",
	    "bookshop",
	    "butcher shop",
	    "confectionery",
	    "shoe shop",
	    "tobacco shop",
	    "toyshop",
	    "fountain",
	    "cliff dwelling",
	    "yurt",
	    "dock",
	    "brass",
	    "megalith",
	    "bannister",
	    "breakwater",
	    "dam",
	    "chainlink fence",
	    "picket fence",
	    "worm fence",
	    "stone wall",
	    "grille",
	    "sliding door",
	    "turnstile",
	    "mountain tent",
	    "scoreboard",
	    "honeycomb",
	    "plate rack",
	    "pedestal",
	    "beacon",
	    "mashed potato",
	    "bell pepper",
	    "head cabbage",
	    "broccoli",
	    "cauliflower",
	    "zucchini",
	    "spaghetti squash",
	    "acorn squash",
	    "butternut squash",
	    "cucumber",
	    "artichoke",
	    "cardoon",
	    "mushroom",
	    "shower curtain",
	    "jean",
	    "carton",
	    "handkerchief",
	    "sandal",
	    "ashcan",
	    "safe",
	    "plate",
	    "necklace",
	    "croquet ball",
	    "fur coat",
	    "thimble",
	    "pajama",
	    "running shoe",
	    "cocktail shaker",
	    "chest",
	    "manhole cover",
	    "modem",
	    "tub",
	    "tray",
	    "balance beam",
	    "bagel",
	    "prayer rug",
	    "kimono",
	    "hot pot",
	    "whiskey jug",
	    "knee pad",
	    "book jacket",
	    "spindle",
	    "ski mask",
	    "beer bottle",
	    "crash helmet",
	    "bottlecap",
	    "tile roof",
	    "mask",
	    "maillot",
	    "Petri dish",
	    "football helmet",
	    "bathing cap",
	    "teddy bear",
	    "holster",
	    "pop bottle",
	    "photocopier",
	    "vestment",
	    "crossword puzzle",
	    "golf ball",
	    "trifle",
	    "suit",
	    "water tower",
	    "feather boa",
	    "cloak",
	    "red wine",
	    "drumstick",
	    "shield",
	    "Christmas stocking",
	    "hoopskirt",
	    "menu",
	    "stage",
	    "bonnet",
	    "meat loaf",
	    "baseball",
	    "face powder",
	    "scabbard",
	    "sunscreen",
	    "beer glass",
	    "hen-of - the - woods",
	    "guacamole",
	    "lampshade",
	    "wool",
	    "hay",
	    "bow tie",
	    "mailbag",
	    "water jug",
	    "bucket",
	    "dishrag",
	    "soup bowl",
	    "eggnog",
	    "mortar",
	    "trench coat",
	    "paddle",
	    "chain",
	    "swab",
	    "mixing bowl",
	    "potpie",
	    "wine bottle",
	    "shoji",
	    "bulletproof vest",
	    "drilling platform",
	    "binder",
	    "cardigan",
	    "sweatshirt",
	    "pot",
	    "birdhouse",
	    "hamper",
	    "ping-pong ball",
	    "pencil box",
	    "pay - phone",
	    "consomme",
	    "apron",
	    "punching bag",
	    "backpack",
	    "groom",
	    "bearskin",
	    "pencil sharpener",
	    "broom",
	    "mosquito net",
	    "abaya",
	    "mortarboard",
	    "poncho",
	    "crutch",
	    "Polaroid camera",
	    "space bar",
	    "cup",
	    "racket",
	    "traffic light",
	    "quill",
	    "radio",
	    "dough",
	    "cuirass",
	    "military uniform",
	    "lipstick",
	    "shower cap",
	    "monitor",
	    "oscilloscope",
	    "mitten",
	    "brassiere",
	    "French loaf",
	    "vase",
	    "milk can",
	    "rugby ball",
	    "paper towel",
	    "earthstar",
	    "envelope",
	    "miniskirt",
	    "cowboy hat",
	    "trolleybus",
	    "perfume",
	    "bathtub",
	    "hotdog",
	    "coral fungus",
	    "bullet train",
	    "pillow",
	    "toilet tissue",
	    "cassette",
	    "carpenter's kit",
	    "ladle",
	    "stinkhorn",
	    "lotion",
	    "hair spray",
	    "academic gown",
	    "dome",
	    "crate",
	    "wig",
	    "burrito",
	    "pill bottle",
	    "chain mail",
	    "theater curtain",
	    "window shade",
	    "barrel",
	    "washbasin",
	    "ballpoint",
	    "basketball",
	    "bath towel",
	    "cowboy boot",
	    "gown",
	    "window screen",
	    "agaric",
	    "cellular telephone",
	    "nipple",
	    "barbell",
	    "mailbox",
	    "lab coat",
	    "fire screen",
	    "minibus",
	    "packet",
	    "maze",
	    "pole",
	    "horizontal bar",
	    "sombrero",
	    "pickelhaube",
	    "rain barrel",
	    "wallet",
	    "cassette player",
	    "comic book",
	    "piggy bank",
	    "street sign",
	    "bell cote",
	    "fountain pen",
	    "Windsor tie",
	    "volleyball",
	    "overskirt",
	    "sarong",
	    "purse",
	    "bolo tie",
	    "bib",
	    "parachute",
	    "sleeping bag",
	    "television",
	    "swimming trunks",
	    "measuring cup",
	    "espresso",
	    "pizza",
	    "breastplate",
	    "shopping basket",
	    "wooden spoon",
	    "saltshaker",
	    "chocolate sauce",
	    "ballplayer",
	    "goblet",
	    "gyromitra",
	    "stretcher",
	    "water bottle",
	    "dial telephone",
	    "soap dispenser",
	    "jersey",
	    "school bus",
	    "jigsaw puzzle",
	    "plastic bag",
	    "reflex camera",
	    "diaper",
	    "Band Aid",
	    "ice lolly",
	    "velvet",
	    "tennis ball",
	    "gasmask",
	    "doormat",
	    "Loafer",
	    "ice cream",
	    "pretzel",
	    "quilt",
	    "maillot",
	    "tape player",
	    "clog",
	    "iPod",
	    "bolete",
	    "scuba diver",
	    "pitcher",
	    "matchstick",
	    "bikini",
	    "sock",
	    "CD player",
	    "lens cap",
	    "thatch",
	    "vault",
	    "beaker",
	    "bubble",
	    "cheeseburger",
	    "parallel bars",
	    "flagpole",
	    "coffee mug",
	    "rubber eraser",
	    "stole",
	    "carbonara",
	    "dumbbell",
	  ]
	};

	/* src/components/AppClassFilter.html generated by Svelte v2.15.3 */



	function labels({inceptionLabels: inceptionLabels$$1}) {
	  let out = classesToKeep.map(k => {
	    let l = inceptionLabels$$1.inception[k];
	    return {label: l, i: k};
	  });
	  return [{label: "show all", i: -1}].concat(out);
	}

	function data$b() {
	  return {
	    classesToKeep,
	    inceptionLabels,
	    classHeatmap: 235
	  }
	}
	const file$e = "src/components/AppClassFilter.html";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.l = list[i];
		return child_ctx;
	}

	function create_main_fragment$f(component, ctx) {
		var div;

		var each_value = ctx.labels;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(component, get_each_context$2(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "chooser svelte-h2ed57";
				addLoc(div, file$e, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.classHeatmap || changed.labels) {
					each_value = ctx.labels;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$2(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				destroyEach(each_blocks, detach);
			}
		};
	}

	// (2:2) {#each labels as l}
	function create_each_block$2(component, ctx) {
		var label, input, input_value_value, text0, span, text1_value = ctx.l.label, text1, span_title_value, text2, label_class_value;

		function input_change_handler() {
			component.set({ classHeatmap: input.__value });
		}

		return {
			c: function create() {
				label = createElement("label");
				input = createElement("input");
				text0 = createText("\n      ");
				span = createElement("span");
				text1 = createText(text1_value);
				text2 = createText("\n    ");
				component._bindingGroups[0].push(input);
				addListener(input, "change", input_change_handler);
				setAttribute(input, "type", "radio");
				input.__value = input_value_value = ctx.l.i;
				input.value = input.__value;
				input.className = "svelte-h2ed57";
				addLoc(input, file$e, 3, 6, 111);
				span.title = span_title_value = ctx.l.i;
				addLoc(span, file$e, 4, 6, 172);
				label.className = label_class_value = "" + (ctx.classHeatmap === ctx.l.i ? 'selected' : '') + " svelte-h2ed57";
				addLoc(label, file$e, 2, 4, 48);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, input);

				input.checked = input.__value === ctx.classHeatmap;

				append(label, text0);
				append(label, span);
				append(span, text1);
				append(label, text2);
			},

			p: function update(changed, ctx) {
				if (changed.classHeatmap) input.checked = input.__value === ctx.classHeatmap;
				if ((changed.labels) && input_value_value !== (input_value_value = ctx.l.i)) {
					input.__value = input_value_value;
				}

				input.value = input.__value;
				if ((changed.labels) && text1_value !== (text1_value = ctx.l.label)) {
					setData(text1, text1_value);
				}

				if ((changed.labels) && span_title_value !== (span_title_value = ctx.l.i)) {
					span.title = span_title_value;
				}

				if ((changed.classHeatmap || changed.labels) && label_class_value !== (label_class_value = "" + (ctx.classHeatmap === ctx.l.i ? 'selected' : '') + " svelte-h2ed57")) {
					label.className = label_class_value;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(label);
				}

				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input), 1);
				removeListener(input, "change", input_change_handler);
			}
		};
	}

	function AppClassFilter(options) {
		this._debugName = '<AppClassFilter>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$b(), options.data);

		this._recompute({ inceptionLabels: 1 }, this._state);
		if (!('inceptionLabels' in this._state)) console.warn("<AppClassFilter> was created without expected data property 'inceptionLabels'");

		if (!('classHeatmap' in this._state)) console.warn("<AppClassFilter> was created without expected data property 'classHeatmap'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._fragment = create_main_fragment$f(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(AppClassFilter.prototype, protoDev);

	AppClassFilter.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('labels' in newState && !this._updatingReadonlyProperty) throw new Error("<AppClassFilter>: Cannot set read-only property 'labels'");
	};

	AppClassFilter.prototype._recompute = function _recompute(changed, state) {
		if (changed.inceptionLabels) {
			if (this._differs(state.labels, (state.labels = labels(state)))) changed.labels = true;
		}
	};

	/* src/library/App/Panel.html generated by Svelte v2.15.3 */

	const file$f = "src/library/App/Panel.html";

	function create_main_fragment$g(component, ctx) {
		var div2, div0, slot_content_head = component._slotted.head, text, div1, slot_content_body = component._slotted.body;

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				text = createText("\n  ");
				div1 = createElement("div");
				div0.className = "head svelte-xv78tq";
				addLoc(div0, file$f, 1, 2, 21);
				div1.className = "body svelte-xv78tq";
				addLoc(div1, file$f, 4, 2, 81);
				div2.className = "root svelte-xv78tq";
				addLoc(div2, file$f, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);

				if (slot_content_head) {
					append(div0, slot_content_head);
				}

				append(div2, text);
				append(div2, div1);

				if (slot_content_body) {
					append(div1, slot_content_body);
				}
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div2);
				}

				if (slot_content_head) {
					reinsertChildren(div0, slot_content_head);
				}

				if (slot_content_body) {
					reinsertChildren(div1, slot_content_body);
				}
			}
		};
	}

	function Panel(options) {
		this._debugName = '<Panel>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$g(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Panel.prototype, protoDev);

	Panel.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/components/App.html generated by Svelte v2.15.3 */

	function realGridSize({gridSize}) {
		return (gridSize + 1) * 20;
	}

	function scaleCountFactor({iconScaleFactor, realGridSize}) {
		return 1000000 / (realGridSize * realGridSize * iconScaleFactor);
	}

	function data$c() {
	  return {
	    layerName: "mixed4c",
	    gridSize: 1,
	    classHeatmap: -1,
	    iconScaleFactor: 0.8,
	    iconCrop: 0.3,
	    showClassFilter: true,
	    showLayerChooser: true,
	    homeX: .5,
	    homeY: .5,
	    homeScale: 1,
	  }
	}
	var format_1 = format(".3f");

	const file$g = "src/components/App.html";

	function create_main_fragment$h(component, ctx) {
		var div19, div1, h30, text1, div0, appclassfilter_updating = {}, text2, div3, h31, text4, div2, applayerchooser_updating = {}, text5, div8, div7, atlas_updating = {}, text6, div6, div4, appminimap_updating = {}, text7, div5, text8, text9, text10, div18, h32, text12, div17, div12, div9, text13, raw0_value = format_1(ctx.gcx), raw0_before, text14, div10, text15, raw1_value = format_1(ctx.gcy), raw1_before, text16, div11, text17, raw2_value = format_1(ctx.scale), raw2_before, text18, div13, h40, text20, label0, input0, text21, text22, div14, h41, text24, label1, input1, text25, text26, label2, input2, text27, text28, label3, input3, text29, text30, label4, input4, text31, text32, label5, input5, text33, text34, div15, h42, text35, raw3_before, text36, input6, text37, br0, text38, h43, text39, raw4_before, text40, input7, text41, div16, h44, text42, raw5_before, text43, input8, text44, br1, text45, h45, text47, br2, text48, label6, input9, text49, text50, br3, text51, label7, input10, text52;

		var appclassfilter_initial_data = {};
		if (ctx.classHeatmap
	           !== void 0) {
			appclassfilter_initial_data.classHeatmap = ctx.classHeatmap
	          ;
			appclassfilter_updating.classHeatmap = true;
		}
		var appclassfilter = new AppClassFilter({
			root: component.root,
			store: component.store,
			data: appclassfilter_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!appclassfilter_updating.classHeatmap && changed.classHeatmap) {
					newState.classHeatmap = childState.classHeatmap;
				}
				component._set(newState);
				appclassfilter_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			appclassfilter._bind({ classHeatmap: 1 }, appclassfilter.get());
		});

		var panel0 = new Panel({
			root: component.root,
			store: component.store,
			slots: { default: createFragment(), body: createFragment(), head: createFragment() }
		});

		var applayerchooser_initial_data = { classHeatmap: ctx.classHeatmap };
		if (ctx.layerName
	             !== void 0) {
			applayerchooser_initial_data.layerName = ctx.layerName
	            ;
			applayerchooser_updating.layerName = true;
		}
		var applayerchooser = new AppLayerChooser({
			root: component.root,
			store: component.store,
			data: applayerchooser_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!applayerchooser_updating.layerName && changed.layerName) {
					newState.layerName = childState.layerName;
				}
				component._set(newState);
				applayerchooser_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			applayerchooser._bind({ layerName: 1 }, applayerchooser.get());
		});

		var panel1 = new Panel({
			root: component.root,
			store: component.store,
			slots: { default: createFragment(), body: createFragment(), head: createFragment() }
		});

		var atlas_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	strokeColor: "#666",
		 	backgroundColor: "#f0f0f0",
		 	showHoverImage: false,
		 	scaleCountFactor: ctx.scaleCountFactor,
		 	classHeatmap: ctx.classHeatmap,
		 	homeX: ctx.homeX,
		 	homeY: ctx.homeY,
		 	homeScale: ctx.homeScale
		 };
		if (ctx.iconCrop 
	           !== void 0) {
			atlas_initial_data.iconCrop = ctx.iconCrop 
	          ;
			atlas_updating.iconCrop = true;
		}
		if (ctx.classHeatmapMultiplier
	           !== void 0) {
			atlas_initial_data.classHeatmapMultiplier = ctx.classHeatmapMultiplier
	          ;
			atlas_updating.classHeatmapMultiplier = true;
		}
		if (ctx.classHeatmapPositive
	           !== void 0) {
			atlas_initial_data.classHeatmapPositive = ctx.classHeatmapPositive
	          ;
			atlas_updating.classHeatmapPositive = true;
		}
		if (ctx.gridSize
	           !== void 0) {
			atlas_initial_data.gridSize = ctx.gridSize
	          ;
			atlas_updating.gridSize = true;
		}
		if (ctx.showLabels
	           !== void 0) {
			atlas_initial_data.showLabels = ctx.showLabels
	          ;
			atlas_updating.showLabels = true;
		}
		if (ctx.aspectRatio
	           !== void 0) {
			atlas_initial_data.aspectRatio = ctx.aspectRatio
	          ;
			atlas_updating.aspectRatio = true;
		}
		if (ctx.scale
	           !== void 0) {
			atlas_initial_data.scale = ctx.scale
	          ;
			atlas_updating.scale = true;
		}
		if (ctx.gcx
	           !== void 0) {
			atlas_initial_data.gcx = ctx.gcx
	          ;
			atlas_updating.gcx = true;
		}
		if (ctx.gcy
	           !== void 0) {
			atlas_initial_data.gcy = ctx.gcy
	          ;
			atlas_updating.gcy = true;
		}
		var atlas = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas_updating.iconCrop && changed.iconCrop) {
					newState.iconCrop = childState.iconCrop;
				}

				if (!atlas_updating.classHeatmapMultiplier && changed.classHeatmapMultiplier) {
					newState.classHeatmapMultiplier = childState.classHeatmapMultiplier;
				}

				if (!atlas_updating.classHeatmapPositive && changed.classHeatmapPositive) {
					newState.classHeatmapPositive = childState.classHeatmapPositive;
				}

				if (!atlas_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio = childState.aspectRatio;
				}

				if (!atlas_updating.scale && changed.scale) {
					newState.scale = childState.scale;
				}

				if (!atlas_updating.gcx && changed.gcx) {
					newState.gcx = childState.gcx;
				}

				if (!atlas_updating.gcy && changed.gcy) {
					newState.gcy = childState.gcy;
				}
				component._set(newState);
				atlas_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas._bind({ iconCrop: 1, classHeatmapMultiplier: 1, classHeatmapPositive: 1, gridSize: 1, showLabels: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas.get());
		});

		component.refs.atlas = atlas;

		var appminimap_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	enableDragging: true,
		 	classHeatmap: ctx.classHeatmap,
		 	scaleCountFactor: ctx.scaleCountFactor
		 };
		if (ctx.aspectRatio
	               !== void 0) {
			appminimap_initial_data.aspectRatio = ctx.aspectRatio
	              ;
			appminimap_updating.aspectRatio = true;
		}
		if (ctx.scale
	               !== void 0) {
			appminimap_initial_data.scale = ctx.scale
	              ;
			appminimap_updating.scale = true;
		}
		if (ctx.gcx
	               !== void 0) {
			appminimap_initial_data.gcx = ctx.gcx
	              ;
			appminimap_updating.gcx = true;
		}
		if (ctx.gcy
	               !== void 0) {
			appminimap_initial_data.gcy = ctx.gcy
	              ;
			appminimap_updating.gcy = true;
		}
		var appminimap = new AppMiniMap({
			root: component.root,
			store: component.store,
			data: appminimap_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!appminimap_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio = childState.aspectRatio;
				}

				if (!appminimap_updating.scale && changed.scale) {
					newState.scale = childState.scale;
				}

				if (!appminimap_updating.gcx && changed.gcx) {
					newState.gcx = childState.gcx;
				}

				if (!appminimap_updating.gcy && changed.gcy) {
					newState.gcy = childState.gcy;
				}
				component._set(newState);
				appminimap_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			appminimap._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, appminimap.get());
		});

		var navigation0_initial_data = { name: "home", color: "white" };
		var navigation0 = new Navigation({
			root: component.root,
			store: component.store,
			data: navigation0_initial_data
		});

		var button0 = new Button({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() }
		});

		button0.on("click", function(event) {
			component.refs.atlas.home();
		});

		var navigation1_initial_data = { name: "add", color: "white" };
		var navigation1 = new Navigation({
			root: component.root,
			store: component.store,
			data: navigation1_initial_data
		});

		var button1 = new Button({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() }
		});

		button1.on("click", function(event) {
			component.refs.atlas.zoomit(2);
		});

		var navigation2_initial_data = { name: "remove", color: "white" };
		var navigation2 = new Navigation({
			root: component.root,
			store: component.store,
			data: navigation2_initial_data
		});

		var button2 = new Button({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() }
		});

		button2.on("click", function(event) {
			component.refs.atlas.zoomit(0.5);
		});

		function input0_change_handler() {
			component.set({ showLabels: input0.checked });
		}

		function input1_change_handler() {
			component.set({ gridSize: input1.__value });
		}

		function input2_change_handler() {
			component.set({ gridSize: input2.__value });
		}

		function input3_change_handler() {
			component.set({ gridSize: input3.__value });
		}

		function input4_change_handler() {
			component.set({ gridSize: input4.__value });
		}

		function input5_change_handler() {
			component.set({ gridSize: input5.__value });
		}

		function input6_change_input_handler() {
			component.set({ iconScaleFactor: toNumber(input6.value) });
		}

		function input7_change_input_handler() {
			component.set({ iconCrop: toNumber(input7.value) });
		}

		function input8_change_input_handler() {
			component.set({ classHeatmapMultiplier: toNumber(input8.value) });
		}

		function input9_change_handler() {
			component.set({ classHeatmapPositive: input9.__value });
		}

		function input10_change_handler() {
			component.set({ classHeatmapPositive: input10.__value });
		}

		var panel2 = new Panel({
			root: component.root,
			store: component.store,
			slots: { default: createFragment(), body: createFragment(), head: createFragment() }
		});

		return {
			c: function create() {
				div19 = createElement("div");
				div1 = createElement("div");
				h30 = createElement("h3");
				h30.textContent = "Class Filter";
				text1 = createText("\n        ");
				div0 = createElement("div");
				appclassfilter._fragment.c();
				panel0._fragment.c();
				text2 = createText("\n    ");
				div3 = createElement("div");
				h31 = createElement("h3");
				h31.textContent = "Layer";
				text4 = createText("\n        ");
				div2 = createElement("div");
				applayerchooser._fragment.c();
				panel1._fragment.c();
				text5 = createText("\n  ");
				div8 = createElement("div");
				div7 = createElement("div");
				atlas._fragment.c();
				text6 = createText("\n        ");
				div6 = createElement("div");
				div4 = createElement("div");
				appminimap._fragment.c();
				text7 = createText("\n          ");
				div5 = createElement("div");
				navigation0._fragment.c();
				button0._fragment.c();
				text8 = createText("\n            ");
				navigation1._fragment.c();
				button1._fragment.c();
				text9 = createText("\n            ");
				navigation2._fragment.c();
				button2._fragment.c();
				text10 = createText("\n  ");
				div18 = createElement("div");
				h32 = createElement("h3");
				h32.textContent = "Options";
				text12 = createText("\n      ");
				div17 = createElement("div");
				div12 = createElement("div");
				div9 = createElement("div");
				text13 = createText("x: ");
				raw0_before = createElement('noscript');
				text14 = createText("\n          ");
				div10 = createElement("div");
				text15 = createText("y: ");
				raw1_before = createElement('noscript');
				text16 = createText("\n          ");
				div11 = createElement("div");
				text17 = createText("scale: ");
				raw2_before = createElement('noscript');
				text18 = createText("\n        ");
				div13 = createElement("div");
				h40 = createElement("h4");
				h40.textContent = "Attribution";
				text20 = createText("\n          ");
				label0 = createElement("label");
				input0 = createElement("input");
				text21 = createText(" show labels");
				text22 = createText("\n        ");
				div14 = createElement("div");
				h41 = createElement("h4");
				h41.textContent = "grid size";
				text24 = createText("\n          ");
				label1 = createElement("label");
				input1 = createElement("input");
				text25 = createText(" 20x20");
				text26 = createText("\n          ");
				label2 = createElement("label");
				input2 = createElement("input");
				text27 = createText(" 40x40");
				text28 = createText("\n          ");
				label3 = createElement("label");
				input3 = createElement("input");
				text29 = createText(" 80x80");
				text30 = createText("\n          ");
				label4 = createElement("label");
				input4 = createElement("input");
				text31 = createText(" 160x160");
				text32 = createText("\n          ");
				label5 = createElement("label");
				input5 = createElement("input");
				text33 = createText(" 320x320");
				text34 = createText("\n        ");
				div15 = createElement("div");
				h42 = createElement("h4");
				text35 = createText("icon density: ");
				raw3_before = createElement('noscript');
				text36 = createText("\n          ");
				input6 = createElement("input");
				text37 = createText("\n          ");
				br0 = createElement("br");
				text38 = createText("\n          ");
				h43 = createElement("h4");
				text39 = createText("icon crop: ");
				raw4_before = createElement('noscript');
				text40 = createText("\n          ");
				input7 = createElement("input");
				text41 = createText("\n        ");
				div16 = createElement("div");
				h44 = createElement("h4");
				text42 = createText("class filter intensity: ");
				raw5_before = createElement('noscript');
				text43 = createText("\n          ");
				input8 = createElement("input");
				text44 = createText("\n          ");
				br1 = createElement("br");
				text45 = createText("\n          ");
				h45 = createElement("h4");
				h45.textContent = "class filter positive/negative";
				text47 = createText("\n          ");
				br2 = createElement("br");
				text48 = createText("\n          ");
				label6 = createElement("label");
				input9 = createElement("input");
				text49 = createText(" positive influence");
				text50 = createText("\n          ");
				br3 = createElement("br");
				text51 = createText("\n          ");
				label7 = createElement("label");
				input10 = createElement("input");
				text52 = createText(" negative influence");
				panel2._fragment.c();
				setAttribute(h30, "slot", "head");
				h30.className = "svelte-z55voj";
				addLoc(h30, file$g, 3, 8, 126);
				setAttribute(div0, "slot", "body");
				addLoc(div0, file$g, 4, 8, 168);
				div1.className = "filter svelte-z55voj";
				setStyle(div1, "display", (ctx.showClassFilter ? 'block' : 'none'));
				addLoc(div1, file$g, 1, 4, 28);
				setAttribute(h31, "slot", "head");
				h31.className = "svelte-z55voj";
				addLoc(h31, file$g, 13, 8, 398);
				setAttribute(div2, "slot", "body");
				addLoc(div2, file$g, 14, 8, 433);
				div3.className = "stack svelte-z55voj";
				setStyle(div3, "display", (ctx.showLayerChooser ? 'block' : 'none'));
				addLoc(div3, file$g, 11, 4, 300);
				div4.className = "map svelte-z55voj";
				setStyle(div4, "display", (ctx.scale > 1.0 ? 'block' : 'none'));
				addLoc(div4, file$g, 46, 10, 1198);
				div5.className = "buttons svelte-z55voj";
				addLoc(div5, file$g, 58, 10, 1577);
				div6.className = "svelte-z55voj svelte-ref-controls";
				addLoc(div6, file$g, 45, 8, 1169);
				div7.className = "atlas svelte-z55voj";
				addLoc(div7, file$g, 23, 4, 611);
				div8.className = "main svelte-z55voj";
				addLoc(div8, file$g, 22, 2, 588);
				setAttribute(h32, "slot", "head");
				h32.className = "svelte-z55voj";
				addLoc(h32, file$g, 68, 6, 1996);
				addLoc(div9, file$g, 72, 10, 2095);
				addLoc(div10, file$g, 73, 10, 2139);
				addLoc(div11, file$g, 74, 10, 2183);
				addLoc(div12, file$g, 71, 8, 2079);
				h40.className = "svelte-z55voj";
				addLoc(h40, file$g, 77, 8, 2260);
				addListener(input0, "change", input0_change_handler);
				setAttribute(input0, "type", "checkbox");
				addLoc(input0, file$g, 78, 17, 2298);
				addLoc(label0, file$g, 78, 10, 2291);
				addLoc(div13, file$g, 76, 8, 2246);
				h41.className = "svelte-z55voj";
				addLoc(h41, file$g, 81, 10, 2421);
				component._bindingGroups[0].push(input1);
				addListener(input1, "change", input1_change_handler);
				setAttribute(input1, "type", "radio");
				input1.__value = 0;
				input1.value = input1.__value;
				addLoc(input1, file$g, 82, 17, 2457);
				label1.className = "svelte-z55voj";
				addLoc(label1, file$g, 82, 10, 2450);
				component._bindingGroups[0].push(input2);
				addListener(input2, "change", input2_change_handler);
				setAttribute(input2, "type", "radio");
				input2.__value = 1;
				input2.value = input2.__value;
				addLoc(input2, file$g, 83, 17, 2537);
				label2.className = "svelte-z55voj";
				addLoc(label2, file$g, 83, 10, 2530);
				component._bindingGroups[0].push(input3);
				addListener(input3, "change", input3_change_handler);
				setAttribute(input3, "type", "radio");
				input3.__value = 2;
				input3.value = input3.__value;
				addLoc(input3, file$g, 84, 17, 2617);
				label3.className = "svelte-z55voj";
				addLoc(label3, file$g, 84, 10, 2610);
				component._bindingGroups[0].push(input4);
				addListener(input4, "change", input4_change_handler);
				setAttribute(input4, "type", "radio");
				input4.__value = 3;
				input4.value = input4.__value;
				addLoc(input4, file$g, 85, 17, 2697);
				label4.className = "svelte-z55voj";
				addLoc(label4, file$g, 85, 10, 2690);
				component._bindingGroups[0].push(input5);
				addListener(input5, "change", input5_change_handler);
				setAttribute(input5, "type", "radio");
				input5.__value = 4;
				input5.value = input5.__value;
				addLoc(input5, file$g, 86, 17, 2779);
				label5.className = "svelte-z55voj";
				addLoc(label5, file$g, 86, 10, 2772);
				div14.className = "grid-size svelte-z55voj";
				addLoc(div14, file$g, 80, 8, 2387);
				h42.className = "svelte-z55voj";
				addLoc(h42, file$g, 89, 10, 2883);
				addListener(input6, "change", input6_change_input_handler);
				addListener(input6, "input", input6_change_input_handler);
				setAttribute(input6, "type", "range");
				input6.min = 0.2;
				input6.max = 10;
				input6.step = 0.1;
				addLoc(input6, file$g, 90, 10, 2940);
				addLoc(br0, file$g, 91, 10, 3028);
				h43.className = "svelte-z55voj";
				addLoc(h43, file$g, 92, 10, 3043);
				addListener(input7, "change", input7_change_input_handler);
				addListener(input7, "input", input7_change_input_handler);
				setAttribute(input7, "type", "range");
				input7.min = 0;
				input7.max = 0.5;
				input7.step = 0.01;
				addLoc(input7, file$g, 93, 10, 3090);
				addLoc(div15, file$g, 88, 8, 2867);
				h44.className = "svelte-z55voj";
				addLoc(h44, file$g, 96, 10, 3256);
				addListener(input8, "change", input8_change_input_handler);
				addListener(input8, "input", input8_change_input_handler);
				setAttribute(input8, "type", "range");
				input8.min = "0.5";
				input8.max = "2";
				input8.step = "0.1";
				addLoc(input8, file$g, 97, 10, 3330);
				addLoc(br1, file$g, 98, 10, 3418);
				h45.className = "svelte-z55voj";
				addLoc(h45, file$g, 99, 10, 3433);
				addLoc(br2, file$g, 100, 10, 3483);
				component._bindingGroups[1].push(input9);
				addListener(input9, "change", input9_change_handler);
				setAttribute(input9, "type", "radio");
				input9.__value = 1;
				input9.value = input9.__value;
				addLoc(input9, file$g, 101, 17, 3505);
				addLoc(label6, file$g, 101, 10, 3498);
				addLoc(br3, file$g, 102, 10, 3603);
				component._bindingGroups[1].push(input10);
				addListener(input10, "change", input10_change_handler);
				setAttribute(input10, "type", "radio");
				input10.__value = -1;
				input10.value = input10.__value;
				addLoc(input10, file$g, 103, 17, 3625);
				addLoc(label7, file$g, 103, 10, 3618);
				setStyle(div16, "display", (ctx.classHeatmap > -1 ? 'block' : 'none'));
				addLoc(div16, file$g, 95, 8, 3184);
				setAttribute(div17, "slot", "body");
				div17.className = "options-body svelte-z55voj";
				addLoc(div17, file$g, 69, 6, 2031);
				div18.className = "options svelte-z55voj";
				addLoc(div18, file$g, 66, 2, 1956);
				div19.className = "container svelte-z55voj";
				addLoc(div19, file$g, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div19, anchor);
				append(div19, div1);
				append(panel0._slotted.head, h30);
				append(panel0._slotted.default, text1);
				append(panel0._slotted.body, div0);
				appclassfilter._mount(div0, null);
				panel0._mount(div1, null);
				append(div19, text2);
				append(div19, div3);
				append(panel1._slotted.head, h31);
				append(panel1._slotted.default, text4);
				append(panel1._slotted.body, div2);
				applayerchooser._mount(div2, null);
				panel1._mount(div3, null);
				append(div19, text5);
				append(div19, div8);
				append(div8, div7);
				atlas._mount(div7, null);
				append(div7, text6);
				append(div7, div6);
				append(div6, div4);
				appminimap._mount(div4, null);
				append(div6, text7);
				append(div6, div5);
				navigation0._mount(button0._slotted.default, null);
				button0._mount(div5, null);
				append(div5, text8);
				navigation1._mount(button1._slotted.default, null);
				button1._mount(div5, null);
				append(div5, text9);
				navigation2._mount(button2._slotted.default, null);
				button2._mount(div5, null);
				component.refs.controls = div6;
				append(div19, text10);
				append(div19, div18);
				append(panel2._slotted.head, h32);
				append(panel2._slotted.default, text12);
				append(panel2._slotted.body, div17);
				append(div17, div12);
				append(div12, div9);
				append(div9, text13);
				append(div9, raw0_before);
				raw0_before.insertAdjacentHTML("afterend", raw0_value);
				append(div12, text14);
				append(div12, div10);
				append(div10, text15);
				append(div10, raw1_before);
				raw1_before.insertAdjacentHTML("afterend", raw1_value);
				append(div12, text16);
				append(div12, div11);
				append(div11, text17);
				append(div11, raw2_before);
				raw2_before.insertAdjacentHTML("afterend", raw2_value);
				append(div17, text18);
				append(div17, div13);
				append(div13, h40);
				append(div13, text20);
				append(div13, label0);
				append(label0, input0);

				input0.checked = ctx.showLabels;

				append(label0, text21);
				append(div17, text22);
				append(div17, div14);
				append(div14, h41);
				append(div14, text24);
				append(div14, label1);
				append(label1, input1);

				input1.checked = input1.__value === ctx.gridSize;

				append(label1, text25);
				append(div14, text26);
				append(div14, label2);
				append(label2, input2);

				input2.checked = input2.__value === ctx.gridSize;

				append(label2, text27);
				append(div14, text28);
				append(div14, label3);
				append(label3, input3);

				input3.checked = input3.__value === ctx.gridSize;

				append(label3, text29);
				append(div14, text30);
				append(div14, label4);
				append(label4, input4);

				input4.checked = input4.__value === ctx.gridSize;

				append(label4, text31);
				append(div14, text32);
				append(div14, label5);
				append(label5, input5);

				input5.checked = input5.__value === ctx.gridSize;

				append(label5, text33);
				append(div17, text34);
				append(div17, div15);
				append(div15, h42);
				append(h42, text35);
				append(h42, raw3_before);
				raw3_before.insertAdjacentHTML("afterend", ctx.iconScaleFactor);
				append(div15, text36);
				append(div15, input6);

				input6.value = ctx.iconScaleFactor;

				append(div15, text37);
				append(div15, br0);
				append(div15, text38);
				append(div15, h43);
				append(h43, text39);
				append(h43, raw4_before);
				raw4_before.insertAdjacentHTML("afterend", ctx.iconCrop);
				append(div15, text40);
				append(div15, input7);

				input7.value = ctx.iconCrop;

				append(div17, text41);
				append(div17, div16);
				append(div16, h44);
				append(h44, text42);
				append(h44, raw5_before);
				raw5_before.insertAdjacentHTML("afterend", ctx.classHeatmapMultiplier);
				append(div16, text43);
				append(div16, input8);

				input8.value = ctx.classHeatmapMultiplier;

				append(div16, text44);
				append(div16, br1);
				append(div16, text45);
				append(div16, h45);
				append(div16, text47);
				append(div16, br2);
				append(div16, text48);
				append(div16, label6);
				append(label6, input9);

				input9.checked = input9.__value === ctx.classHeatmapPositive;

				append(label6, text49);
				append(div16, text50);
				append(div16, br3);
				append(div16, text51);
				append(div16, label7);
				append(label7, input10);

				input10.checked = input10.__value === ctx.classHeatmapPositive;

				append(label7, text52);
				panel2._mount(div18, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var appclassfilter_changes = {};
				if (!appclassfilter_updating.classHeatmap && changed.classHeatmap) {
					appclassfilter_changes.classHeatmap = ctx.classHeatmap
	          ;
					appclassfilter_updating.classHeatmap = ctx.classHeatmap
	           !== void 0;
				}
				appclassfilter._set(appclassfilter_changes);
				appclassfilter_updating = {};

				if (changed.showClassFilter) {
					setStyle(div1, "display", (ctx.showClassFilter ? 'block' : 'none'));
				}

				var applayerchooser_changes = {};
				if (changed.classHeatmap) applayerchooser_changes.classHeatmap = ctx.classHeatmap;
				if (!applayerchooser_updating.layerName && changed.layerName) {
					applayerchooser_changes.layerName = ctx.layerName
	            ;
					applayerchooser_updating.layerName = ctx.layerName
	             !== void 0;
				}
				applayerchooser._set(applayerchooser_changes);
				applayerchooser_updating = {};

				if (changed.showLayerChooser) {
					setStyle(div3, "display", (ctx.showLayerChooser ? 'block' : 'none'));
				}

				var atlas_changes = {};
				if (changed.layerName) atlas_changes.id = "inceptionv1_" + ctx.layerName;
				if (changed.scaleCountFactor) atlas_changes.scaleCountFactor = ctx.scaleCountFactor;
				if (changed.classHeatmap) atlas_changes.classHeatmap = ctx.classHeatmap;
				if (changed.homeX) atlas_changes.homeX = ctx.homeX;
				if (changed.homeY) atlas_changes.homeY = ctx.homeY;
				if (changed.homeScale) atlas_changes.homeScale = ctx.homeScale;
				if (!atlas_updating.iconCrop && changed.iconCrop) {
					atlas_changes.iconCrop = ctx.iconCrop 
	          ;
					atlas_updating.iconCrop = ctx.iconCrop 
	           !== void 0;
				}
				if (!atlas_updating.classHeatmapMultiplier && changed.classHeatmapMultiplier) {
					atlas_changes.classHeatmapMultiplier = ctx.classHeatmapMultiplier
	          ;
					atlas_updating.classHeatmapMultiplier = ctx.classHeatmapMultiplier
	           !== void 0;
				}
				if (!atlas_updating.classHeatmapPositive && changed.classHeatmapPositive) {
					atlas_changes.classHeatmapPositive = ctx.classHeatmapPositive
	          ;
					atlas_updating.classHeatmapPositive = ctx.classHeatmapPositive
	           !== void 0;
				}
				if (!atlas_updating.gridSize && changed.gridSize) {
					atlas_changes.gridSize = ctx.gridSize
	          ;
					atlas_updating.gridSize = ctx.gridSize
	           !== void 0;
				}
				if (!atlas_updating.showLabels && changed.showLabels) {
					atlas_changes.showLabels = ctx.showLabels
	          ;
					atlas_updating.showLabels = ctx.showLabels
	           !== void 0;
				}
				if (!atlas_updating.aspectRatio && changed.aspectRatio) {
					atlas_changes.aspectRatio = ctx.aspectRatio
	          ;
					atlas_updating.aspectRatio = ctx.aspectRatio
	           !== void 0;
				}
				if (!atlas_updating.scale && changed.scale) {
					atlas_changes.scale = ctx.scale
	          ;
					atlas_updating.scale = ctx.scale
	           !== void 0;
				}
				if (!atlas_updating.gcx && changed.gcx) {
					atlas_changes.gcx = ctx.gcx
	          ;
					atlas_updating.gcx = ctx.gcx
	           !== void 0;
				}
				if (!atlas_updating.gcy && changed.gcy) {
					atlas_changes.gcy = ctx.gcy
	          ;
					atlas_updating.gcy = ctx.gcy
	           !== void 0;
				}
				atlas._set(atlas_changes);
				atlas_updating = {};

				var appminimap_changes = {};
				if (changed.layerName) appminimap_changes.id = "inceptionv1_" + ctx.layerName;
				if (changed.classHeatmap) appminimap_changes.classHeatmap = ctx.classHeatmap;
				if (changed.scaleCountFactor) appminimap_changes.scaleCountFactor = ctx.scaleCountFactor;
				if (!appminimap_updating.aspectRatio && changed.aspectRatio) {
					appminimap_changes.aspectRatio = ctx.aspectRatio
	              ;
					appminimap_updating.aspectRatio = ctx.aspectRatio
	               !== void 0;
				}
				if (!appminimap_updating.scale && changed.scale) {
					appminimap_changes.scale = ctx.scale
	              ;
					appminimap_updating.scale = ctx.scale
	               !== void 0;
				}
				if (!appminimap_updating.gcx && changed.gcx) {
					appminimap_changes.gcx = ctx.gcx
	              ;
					appminimap_updating.gcx = ctx.gcx
	               !== void 0;
				}
				if (!appminimap_updating.gcy && changed.gcy) {
					appminimap_changes.gcy = ctx.gcy
	              ;
					appminimap_updating.gcy = ctx.gcy
	               !== void 0;
				}
				appminimap._set(appminimap_changes);
				appminimap_updating = {};

				if (changed.scale) {
					setStyle(div4, "display", (ctx.scale > 1.0 ? 'block' : 'none'));
				}

				if ((changed.gcx) && raw0_value !== (raw0_value = format_1(ctx.gcx))) {
					detachAfter(raw0_before);
					raw0_before.insertAdjacentHTML("afterend", raw0_value);
				}

				if ((changed.gcy) && raw1_value !== (raw1_value = format_1(ctx.gcy))) {
					detachAfter(raw1_before);
					raw1_before.insertAdjacentHTML("afterend", raw1_value);
				}

				if ((changed.scale) && raw2_value !== (raw2_value = format_1(ctx.scale))) {
					detachAfter(raw2_before);
					raw2_before.insertAdjacentHTML("afterend", raw2_value);
				}

				if (changed.showLabels) input0.checked = ctx.showLabels;
				if (changed.gridSize) input1.checked = input1.__value === ctx.gridSize;
				if (changed.gridSize) input2.checked = input2.__value === ctx.gridSize;
				if (changed.gridSize) input3.checked = input3.__value === ctx.gridSize;
				if (changed.gridSize) input4.checked = input4.__value === ctx.gridSize;
				if (changed.gridSize) input5.checked = input5.__value === ctx.gridSize;
				if (changed.iconScaleFactor) {
					detachAfter(raw3_before);
					raw3_before.insertAdjacentHTML("afterend", ctx.iconScaleFactor);
				}

				if (changed.iconScaleFactor) input6.value = ctx.iconScaleFactor;
				if (changed.iconCrop) {
					detachAfter(raw4_before);
					raw4_before.insertAdjacentHTML("afterend", ctx.iconCrop);
				}

				if (changed.iconCrop) input7.value = ctx.iconCrop;
				if (changed.classHeatmapMultiplier) {
					detachAfter(raw5_before);
					raw5_before.insertAdjacentHTML("afterend", ctx.classHeatmapMultiplier);
				}

				if (changed.classHeatmapMultiplier) input8.value = ctx.classHeatmapMultiplier;
				if (changed.classHeatmapPositive) input9.checked = input9.__value === ctx.classHeatmapPositive;
				if (changed.classHeatmapPositive) input10.checked = input10.__value === ctx.classHeatmapPositive;
				if (changed.classHeatmap) {
					setStyle(div16, "display", (ctx.classHeatmap > -1 ? 'block' : 'none'));
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div19);
				}

				appclassfilter.destroy();
				panel0.destroy();
				applayerchooser.destroy();
				panel1.destroy();
				atlas.destroy();
				if (component.refs.atlas === atlas) component.refs.atlas = null;
				appminimap.destroy();
				navigation0.destroy();
				button0.destroy();
				navigation1.destroy();
				button1.destroy();
				navigation2.destroy();
				button2.destroy();
				if (component.refs.controls === div6) component.refs.controls = null;
				removeListener(input0, "change", input0_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input1), 1);
				removeListener(input1, "change", input1_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input2), 1);
				removeListener(input2, "change", input2_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input3), 1);
				removeListener(input3, "change", input3_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input4), 1);
				removeListener(input4, "change", input4_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input5), 1);
				removeListener(input5, "change", input5_change_handler);
				removeListener(input6, "change", input6_change_input_handler);
				removeListener(input6, "input", input6_change_input_handler);
				removeListener(input7, "change", input7_change_input_handler);
				removeListener(input7, "input", input7_change_input_handler);
				removeListener(input8, "change", input8_change_input_handler);
				removeListener(input8, "input", input8_change_input_handler);
				component._bindingGroups[1].splice(component._bindingGroups[1].indexOf(input9), 1);
				removeListener(input9, "change", input9_change_handler);
				component._bindingGroups[1].splice(component._bindingGroups[1].indexOf(input10), 1);
				removeListener(input10, "change", input10_change_handler);
				panel2.destroy();
			}
		};
	}

	function App(options) {
		this._debugName = '<App>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$c(), options.data);

		this._recompute({ gridSize: 1, iconScaleFactor: 1, realGridSize: 1 }, this._state);
		if (!('gridSize' in this._state)) console.warn("<App> was created without expected data property 'gridSize'");
		if (!('iconScaleFactor' in this._state)) console.warn("<App> was created without expected data property 'iconScaleFactor'");

		if (!('showClassFilter' in this._state)) console.warn("<App> was created without expected data property 'showClassFilter'");
		if (!('classHeatmap' in this._state)) console.warn("<App> was created without expected data property 'classHeatmap'");
		if (!('showLayerChooser' in this._state)) console.warn("<App> was created without expected data property 'showLayerChooser'");
		if (!('layerName' in this._state)) console.warn("<App> was created without expected data property 'layerName'");

		if (!('iconCrop' in this._state)) console.warn("<App> was created without expected data property 'iconCrop'");
		if (!('classHeatmapMultiplier' in this._state)) console.warn("<App> was created without expected data property 'classHeatmapMultiplier'");
		if (!('classHeatmapPositive' in this._state)) console.warn("<App> was created without expected data property 'classHeatmapPositive'");
		if (!('showLabels' in this._state)) console.warn("<App> was created without expected data property 'showLabels'");
		if (!('aspectRatio' in this._state)) console.warn("<App> was created without expected data property 'aspectRatio'");
		if (!('scale' in this._state)) console.warn("<App> was created without expected data property 'scale'");
		if (!('gcx' in this._state)) console.warn("<App> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<App> was created without expected data property 'gcy'");
		if (!('homeX' in this._state)) console.warn("<App> was created without expected data property 'homeX'");
		if (!('homeY' in this._state)) console.warn("<App> was created without expected data property 'homeY'");
		if (!('homeScale' in this._state)) console.warn("<App> was created without expected data property 'homeScale'");
		this._bindingGroups = [[], []];
		this._intro = true;

		this._fragment = create_main_fragment$h(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(App.prototype, protoDev);

	App.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('realGridSize' in newState && !this._updatingReadonlyProperty) throw new Error("<App>: Cannot set read-only property 'realGridSize'");
		if ('scaleCountFactor' in newState && !this._updatingReadonlyProperty) throw new Error("<App>: Cannot set read-only property 'scaleCountFactor'");
	};

	App.prototype._recompute = function _recompute(changed, state) {
		if (changed.gridSize) {
			if (this._differs(state.realGridSize, (state.realGridSize = realGridSize(state)))) changed.realGridSize = true;
		}

		if (changed.iconScaleFactor || changed.realGridSize) {
			if (this._differs(state.scaleCountFactor, (state.scaleCountFactor = scaleCountFactor(state)))) changed.scaleCountFactor = true;
		}
	};

	new App({
	  target: document.querySelector("#app")
	});

}());
//# sourceMappingURL=detail.js.map
