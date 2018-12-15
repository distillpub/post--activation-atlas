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

	function detachBetween(before, after) {
		while (before.nextSibling && before.nextSibling !== after) {
			before.parentNode.removeChild(before.nextSibling);
		}
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

	function setXlinkAttribute(node, attribute, value) {
		node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
	}

	function setData(text, data) {
		text.data = '' + data;
	}

	function setStyle(node, key, value) {
		node.style.setProperty(key, value);
	}

	function selectOption(select, value) {
		for (var i = 0; i < select.options.length; i += 1) {
			var option = select.options[i];

			if (option.__value === value) {
				option.selected = true;
				return;
			}
		}
	}

	function selectValue(select) {
		var selectedOption = select.querySelector(':checked') || select.options[0];
		return selectedOption && selectedOption.__value;
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

	function getSpreadUpdate(levels, updates) {
		var update = {};

		var to_null_out = {};
		var accounted_for = {};

		var i = levels.length;
		while (i--) {
			var o = levels[i];
			var n = updates[i];

			if (n) {
				for (var key in o) {
					if (!(key in n)) to_null_out[key] = 1;
				}

				for (var key in n) {
					if (!accounted_for[key]) {
						update[key] = n[key];
						accounted_for[key] = 1;
					}
				}

				levels[i] = n;
			} else {
				for (var key in o) {
					accounted_for[key] = 1;
				}
			}
		}

		for (var key in to_null_out) {
			if (!(key in update)) update[key] = undefined;
		}

		return update;
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

	function _differsImmutable(a, b) {
		return a != a ? b == b : a !== b;
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

	function removeFromStore() {
		this.store._remove(this);
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

	function Store(state, options) {
		this._handlers = {};
		this._dependents = [];

		this._computed = blankObject();
		this._sortedComputedProperties = [];

		this._state = assign({}, state);
		this._differs = options && options.immutable ? _differsImmutable : _differs;
	}

	assign(Store.prototype, {
		_add(component, props) {
			this._dependents.push({
				component: component,
				props: props
			});
		},

		_init(props) {
			const state = {};
			for (let i = 0; i < props.length; i += 1) {
				const prop = props[i];
				state['$' + prop] = this._state[prop];
			}
			return state;
		},

		_remove(component) {
			let i = this._dependents.length;
			while (i--) {
				if (this._dependents[i].component === component) {
					this._dependents.splice(i, 1);
					return;
				}
			}
		},

		_set(newState, changed) {
			const previous = this._state;
			this._state = assign(assign({}, previous), newState);

			for (let i = 0; i < this._sortedComputedProperties.length; i += 1) {
				this._sortedComputedProperties[i].update(this._state, changed);
			}

			this.fire('state', {
				changed,
				previous,
				current: this._state
			});

			this._dependents
				.filter(dependent => {
					const componentState = {};
					let dirty = false;

					for (let j = 0; j < dependent.props.length; j += 1) {
						const prop = dependent.props[j];
						if (prop in changed) {
							componentState['$' + prop] = this._state[prop];
							dirty = true;
						}
					}

					if (dirty) {
						dependent.component._stage(componentState);
						return true;
					}
				})
				.forEach(dependent => {
					dependent.component.set({});
				});

			this.fire('update', {
				changed,
				previous,
				current: this._state
			});
		},

		_sortComputedProperties() {
			const computed = this._computed;
			const sorted = this._sortedComputedProperties = [];
			const visited = blankObject();
			let currentKey;

			function visit(key) {
				const c = computed[key];

				if (c) {
					c.deps.forEach(dep => {
						if (dep === currentKey) {
							throw new Error(`Cyclical dependency detected between ${dep} <-> ${key}`);
						}

						visit(dep);
					});

					if (!visited[key]) {
						visited[key] = true;
						sorted.push(c);
					}
				}
			}

			for (const key in this._computed) {
				visit(currentKey = key);
			}
		},

		compute(key, deps, fn) {
			let value;

			const c = {
				deps,
				update: (state, changed, dirty) => {
					const values = deps.map(dep => {
						if (dep in changed) dirty = true;
						return state[dep];
					});

					if (dirty) {
						const newValue = fn.apply(null, values);
						if (this._differs(newValue, value)) {
							value = newValue;
							changed[key] = true;
							state[key] = value;
						}
					}
				}
			};

			this._computed[key] = c;
			this._sortComputedProperties();

			const state = assign({}, this._state);
			const changed = {};
			c.update(state, changed, true);
			this._set(state, changed);
		},

		fire,

		get,

		on,

		set(newState) {
			const oldState = this._state;
			const changed = this._changed = {};
			let dirty = false;

			for (const key in newState) {
				if (this._computed[key]) throw new Error(`'${key}' is a read-only computed property`);
				if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
			}
			if (!dirty) return;

			this._set(newState, changed);
		}
	});

	var Labels = {
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

	/* src/library/Radar.html generated by Svelte v2.15.3 */

	function data() {
	  return {
	    display: "block", // "inline", "inline-block", "block"
	    ready: false,
	    onscreen: false,
	    offscreen: true
	  }
	}
	function oncreate() {
	  this.refs.element.addEventListener("ready", event => {
	    this.set({ready: true});
	  });
	  this.refs.element.addEventListener("onscreen", event => {
	    this.set({onscreen: true});
	    this.fire("onscreen");
	  });
	  this.refs.element.addEventListener("offscreen", event => {
	    this.set({onscreen: false});
	    this.fire("offscreen");
	  });
	}
	const file = "src/library/Radar.html";

	function create_main_fragment(component, ctx) {
		var d_figure, slot_content_default = component._slotted.default;

		return {
			c: function create() {
				d_figure = createElement("d-figure");
				setStyle(d_figure, "display", ctx.display);
				addLoc(d_figure, file, 6, 0, 173);
			},

			m: function mount(target, anchor) {
				insert(target, d_figure, anchor);

				if (slot_content_default) {
					append(d_figure, slot_content_default);
				}

				component.refs.element = d_figure;
			},

			p: function update(changed, ctx) {
				if (changed.display) {
					setStyle(d_figure, "display", ctx.display);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(d_figure);
				}

				if (slot_content_default) {
					reinsertChildren(d_figure, slot_content_default);
				}

				if (component.refs.element === d_figure) component.refs.element = null;
			}
		};
	}

	function Radar(options) {
		this._debugName = '<Radar>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data(), options.data);
		if (!('display' in this._state)) console.warn("<Radar> was created without expected data property 'display'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment(this, this._state);

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

	assign(Radar.prototype, protoDev);

	Radar.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/Loading.html generated by Svelte v2.15.3 */

	const file$1 = "src/library/Loading.html";

	function create_main_fragment$1(component, ctx) {
		var div, span;

		return {
			c: function create() {
				div = createElement("div");
				span = createElement("span");
				span.textContent = "Loading …";
				span.className = "svelte-19e83wz";
				addLoc(span, file$1, 1, 2, 8);
				div.className = "svelte-19e83wz";
				addLoc(div, file$1, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, span);
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}
			}
		};
	}

	function Loading(options) {
		this._debugName = '<Loading>';
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

	assign(Loading.prototype, protoDev);

	Loading.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/LazyComponent.html generated by Svelte v2.15.3 */

	function ready({radarReady, component}) {
		return (radarReady && component) ? true : false;
	}

	function finalHeight({width, height, aspectRatio, minHeight}) {
	  if (height) {
	    return height;
	  } else if (aspectRatio) {
	    let h = width / aspectRatio;
	    if (minHeight) {
	      return Math.min(minHeight, h);
	    } else {
	      return h;
	    }
	  }
	}

	function data$1() {
	  return {
	    component: null,
	    url: null,
	    componentData: null,
	    radarReady: false,
	    onscreen: false,
	    offsreen: true,
	    height: false,
	    width: null,
	    aspectRatio: null,
	    minHeight: null
	  }
	}
	function oncreate$1() {
	  // TODO: Make sure we have some sizes set.
	  const {height, aspectRatio} = this.get();
	  if (!height && !aspectRatio) {
	    console.warn(`Require 'height'${height} or 'aspectRatio'${aspectRatio} not set on LazyComponent.html`, this);
	  }
	  // Import a remote component if given
	  const {url} = this.get();
	  if (url) {
	    import(url).then(c => {
	      this.set({component: c.default});
	    });
	  }
	}
	const file$2 = "src/library/LazyComponent.html";

	function create_main_fragment$2(component, ctx) {
		var div, div_resize_listener, radar_updating = {};

		function select_block_type(ctx) {
			if (ctx.ready) return create_if_block;
			return create_else_block;
		}

		var current_block_type = select_block_type(ctx);
		var if_block = current_block_type(component, ctx);

		function div_resize_handler() {
			component.set({ width: div.clientWidth });
		}

		var radar_initial_data = {
		 	offscreen: ctx.offscreen,
		 	onscreen: ctx.onscreen
		 };
		if (ctx.radarReady !== void 0) {
			radar_initial_data.ready = ctx.radarReady;
			radar_updating.ready = true;
		}
		var radar = new Radar({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: radar_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!radar_updating.ready && changed.ready) {
					newState.radarReady = childState.ready;
				}
				component._set(newState);
				radar_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			radar._bind({ ready: 1 }, radar.get());
		});

		return {
			c: function create() {
				div = createElement("div");
				if_block.c();
				radar._fragment.c();
				component.root._beforecreate.push(div_resize_handler);
				setStyle(div, "height", "" + ctx.finalHeight + "px");
				div.className = "svelte-1texnz1 svelte-ref-container";
				addLoc(div, file$2, 20, 2, 755);
			},

			m: function mount(target, anchor) {
				append(radar._slotted.default, div);
				if_block.m(div, null);
				div_resize_listener = addResizeListener(div, div_resize_handler);
				component.refs.container = div;
				radar._mount(target, anchor);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block.d(1);
					if_block = current_block_type(component, ctx);
					if_block.c();
					if_block.m(div, null);
				}

				if (changed.finalHeight) {
					setStyle(div, "height", "" + ctx.finalHeight + "px");
				}

				var radar_changes = {};
				if (changed.offscreen) radar_changes.offscreen = ctx.offscreen;
				if (changed.onscreen) radar_changes.onscreen = ctx.onscreen;
				if (!radar_updating.ready && changed.radarReady) {
					radar_changes.ready = ctx.radarReady;
					radar_updating.ready = ctx.radarReady !== void 0;
				}
				radar._set(radar_changes);
				radar_updating = {};
			},

			d: function destroy$$1(detach) {
				if_block.d();
				div_resize_listener.cancel();
				if (component.refs.container === div) component.refs.container = null;
				radar.destroy(detach);
			}
		};
	}

	// (24:4) {:else}
	function create_else_block(component, ctx) {

		var loading = new Loading({
			root: component.root,
			store: component.store
		});

		return {
			c: function create() {
				loading._fragment.c();
			},

			m: function mount(target, anchor) {
				loading._mount(target, anchor);
			},

			p: noop,

			d: function destroy$$1(detach) {
				loading.destroy(detach);
			}
		};
	}

	// (22:4) {#if ready}
	function create_if_block(component, ctx) {
		var switch_instance_anchor;

		var switch_instance_spread_levels = [
			ctx.componentData
		];

		var switch_value = ctx.component;

		function switch_props(ctx) {
			var switch_instance_initial_data = {};
			for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
				switch_instance_initial_data = assign(switch_instance_initial_data, switch_instance_spread_levels[i]);
			}
			return {
				root: component.root,
				store: component.store,
				data: switch_instance_initial_data
			};
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
		}

		return {
			c: function create() {
				if (switch_instance) switch_instance._fragment.c();
				switch_instance_anchor = createComment();
			},

			m: function mount(target, anchor) {
				if (switch_instance) {
					switch_instance._mount(target, anchor);
				}

				insert(target, switch_instance_anchor, anchor);
			},

			p: function update(changed, ctx) {
				var switch_instance_changes = changed.componentData ? getSpreadUpdate(switch_instance_spread_levels, [
					ctx.componentData
				]) : {};

				if (switch_value !== (switch_value = ctx.component)) {
					if (switch_instance) {
						switch_instance.destroy();
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						switch_instance._fragment.c();
						switch_instance._mount(switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				}

				else if (switch_value) {
					switch_instance._set(switch_instance_changes);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(switch_instance_anchor);
				}

				if (switch_instance) switch_instance.destroy(detach);
			}
		};
	}

	function LazyComponent(options) {
		this._debugName = '<LazyComponent>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$1(), options.data);

		this._recompute({ radarReady: 1, component: 1, width: 1, height: 1, aspectRatio: 1, minHeight: 1 }, this._state);
		if (!('radarReady' in this._state)) console.warn("<LazyComponent> was created without expected data property 'radarReady'");
		if (!('component' in this._state)) console.warn("<LazyComponent> was created without expected data property 'component'");
		if (!('width' in this._state)) console.warn("<LazyComponent> was created without expected data property 'width'");
		if (!('height' in this._state)) console.warn("<LazyComponent> was created without expected data property 'height'");
		if (!('aspectRatio' in this._state)) console.warn("<LazyComponent> was created without expected data property 'aspectRatio'");
		if (!('minHeight' in this._state)) console.warn("<LazyComponent> was created without expected data property 'minHeight'");
		if (!('offscreen' in this._state)) console.warn("<LazyComponent> was created without expected data property 'offscreen'");
		if (!('onscreen' in this._state)) console.warn("<LazyComponent> was created without expected data property 'onscreen'");


		if (!('componentData' in this._state)) console.warn("<LazyComponent> was created without expected data property 'componentData'");
		this._intro = true;

		this._fragment = create_main_fragment$2(this, this._state);

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

	assign(LazyComponent.prototype, protoDev);

	LazyComponent.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('ready' in newState && !this._updatingReadonlyProperty) throw new Error("<LazyComponent>: Cannot set read-only property 'ready'");
		if ('finalHeight' in newState && !this._updatingReadonlyProperty) throw new Error("<LazyComponent>: Cannot set read-only property 'finalHeight'");
	};

	LazyComponent.prototype._recompute = function _recompute(changed, state) {
		if (changed.radarReady || changed.component) {
			if (this._differs(state.ready, (state.ready = ready(state)))) changed.ready = true;
		}

		if (changed.width || changed.height || changed.aspectRatio || changed.minHeight) {
			if (this._differs(state.finalHeight, (state.finalHeight = finalHeight(state)))) changed.finalHeight = true;
		}
	};

	/* src/library/NotebookLink.html generated by Svelte v2.15.3 */

	function data$2() {
	  return {
	    url: "",
	    text: "Try in a notebook",
	    emphasis: 1, // 0,1,2
	  }
	}
	const file$3 = "src/library/NotebookLink.html";

	function create_main_fragment$3(component, ctx) {
		var a, svg, path, text0, span, text1, a_class_value;

		return {
			c: function create() {
				a = createElement("a");
				svg = createSvgElement("svg");
				path = createSvgElement("path");
				text0 = createText("\n  ");
				span = createElement("span");
				text1 = createText(ctx.text);
				setAttribute(path, "d", "M14,2c0-0.3-0.2-0.5-0.5-0.5S13,1.7,13,2v12c0,0.6-0.4,1-1,1H3.1c-0.3,0-0.5-0.1-0.7-0.3L1.7,14h8.8c0.8,0,1.5-0.7,1.5-1.5\n      l0-11C12,0.7,11.3,0,10.5,0l-9,0C0.7,0,0,0.7,0,1.5v12.1c0,0.3,0.1,0.5,0.3,0.7l1.4,1.4C1.9,15.9,2.1,16,2.4,16h10.1\n      c0.8,0,1.5-0.7,1.5-1.5l0-1.8C14,9,14,2,14,2z M9.1,9.6c0,0.3-0.2,0.5-0.5,0.5H5.4c-0.3,0-0.5-0.2-0.5-0.5s0.2-0.5,0.5-0.5h3.1\n      C8.8,9.1,9.1,9.3,9.1,9.6z M2.3,4.7C2.1,4.5,2.1,4.2,2.3,4C2.5,3.8,2.8,3.8,3,4l2.8,2.6L3,9.3C2.9,9.4,2.8,9.4,2.7,9.4\n      c-0.1,0-0.3-0.1-0.4-0.2c-0.2-0.2-0.2-0.5,0-0.7l2-1.9L2.3,4.7z");
				setAttribute(path, "class", "svelte-1i7b4jt");
				addLoc(path, file$3, 2, 4, 81);
				setAttribute(svg, "viewBox", "0 0 18 18");
				setAttribute(svg, "class", "svelte-1i7b4jt");
				addLoc(svg, file$3, 1, 2, 51);
				span.className = "svelte-1i7b4jt";
				addLoc(span, file$3, 8, 2, 660);
				a.href = ctx.url;
				a.className = a_class_value = "root emphasis-" + ctx.emphasis + " svelte-1i7b4jt";
				addLoc(a, file$3, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
				append(a, svg);
				append(svg, path);
				append(a, text0);
				append(a, span);
				append(span, text1);
			},

			p: function update(changed, ctx) {
				if (changed.text) {
					setData(text1, ctx.text);
				}

				if (changed.url) {
					a.href = ctx.url;
				}

				if ((changed.emphasis) && a_class_value !== (a_class_value = "root emphasis-" + ctx.emphasis + " svelte-1i7b4jt")) {
					a.className = a_class_value;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(a);
				}
			}
		};
	}

	function NotebookLink(options) {
		this._debugName = '<NotebookLink>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$2(), options.data);
		if (!('url' in this._state)) console.warn("<NotebookLink> was created without expected data property 'url'");
		if (!('emphasis' in this._state)) console.warn("<NotebookLink> was created without expected data property 'emphasis'");
		if (!('text' in this._state)) console.warn("<NotebookLink> was created without expected data property 'text'");
		this._intro = true;

		this._fragment = create_main_fragment$3(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(NotebookLink.prototype, protoDev);

	NotebookLink.prototype._checkReadOnly = function _checkReadOnly(newState) {
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

	function range(start, stop, step) {
	  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

	  var i = -1,
	      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
	      range = new Array(n);

	  while (++i < n) {
	    range[i] = start + i * step;
	  }

	  return range;
	}

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

	/* src/AtlasDataLoader.html generated by Svelte v2.15.3 */



	function data$3() {
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
	function create_main_fragment$4(component, ctx) {

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
		this._state = assign(data$3(), options.data);
		this._intro = true;
		this._handlers.update = [onupdate];

		this._fragment = create_main_fragment$4(this, this._state);

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

	function data$4() {
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

	function oncreate$2() {
	}
	const file$5 = "src/Zoom.html";

	function create_main_fragment$5(component, ctx) {
		var div;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "svelte-16epbqg svelte-ref-capture";
				addLoc(div, file$5, 0, 0, 0);
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
		this._state = assign(data$4(), options.data);

		this._recompute({ width: 1, unit: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<Zoom> was created without expected data property 'width'");
		if (!('unit' in this._state)) console.warn("<Zoom> was created without expected data property 'unit'");
		this._intro = true;

		this._fragment = create_main_fragment$5(this, this._state);

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

	function data$5() {
	  return {
	    ready: false,
	    onscreen: false,
	  }
	}
	function oncreate$3() {
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
	const file$6 = "src/components/Figure.html";

	function create_main_fragment$6(component, ctx) {
		var d_figure, slot_content_default = component._slotted.default;

		return {
			c: function create() {
				d_figure = createElement("d-figure");
				addLoc(d_figure, file$6, 0, 0, 0);
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
		this._state = assign(data$5(), options.data);
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$6(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$3.call(this);
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

	function data$6() {
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

	function oncreate$4() {
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
	const file$7 = "src/Atlas.html";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.top = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$7(component, ctx) {
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

		var if_block2 = (ctx.labels && ctx.showHoverIcon && ctx.currentIconInfo && ctx.currentIconInfo.top_class_indices) && create_if_block$1(component, ctx);

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
				addLoc(canvas, file$7, 35, 6, 689);
				addListener(div0, "mousedown", mousedown_handler);
				addListener(div0, "mousemove", mousemove_handler);
				addListener(div0, "mouseenter", mouseenter_handler);
				addListener(div0, "mouseout", mouseout_handler);
				div0.className = div0_class_value = "" + ((ctx.mouseMoveMode == 'pan' & ctx.enableDragToPan) ? 'panning' : '') + " svelte-ptap6b" + " svelte-ref-stage";
				addLoc(div0, file$7, 20, 4, 276);
				component.root._beforecreate.push(div1_resize_handler);
				div1.className = "svelte-ptap6b svelte-ref-root";
				addLoc(div1, file$7, 15, 2, 186);
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
						if_block2 = create_if_block$1(component, ctx);
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
				addLoc(div, file$7, 42, 8, 921);
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
	function create_if_block$1(component, ctx) {
		var div1, table, text0, text1, div0, text2, text3_value = ctx.currentIconInfo.num_activations, text3, text4;

		function select_block_type(ctx) {
			if (ctx.classHeatmap > -1) return create_if_block_2;
			return create_else_block$1;
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
				addLoc(table, file$7, 48, 8, 1379);
				setStyle(div0, "font-size", "10px");
				setStyle(div0, "margin-top", "4px");
				setStyle(div0, "color", "#999");
				setStyle(div0, "text-align", "right");
				addLoc(div0, file$7, 71, 8, 2414);
				div1.className = "hover svelte-ptap6b";
				setStyle(div1, "top", ((ctx.topLeftCornerHover.y + ctx.iconSizeInPixels + 10) + 'px'));
				setStyle(div1, "left", ((ctx.topLeftCornerHover.x + ctx.iconSizeInPixels + 10) + 'px'));
				addLoc(div1, file$7, 47, 6, 1219);
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
	function create_else_block$1(component, ctx) {
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
				addLoc(tr0, file$7, 50, 10, 1429);
				td0.className = "svelte-ptap6b";
				addLoc(td0, file$7, 55, 12, 1698);
				setStyle(td1, "text-align", "right");
				td1.className = "svelte-ptap6b";
				addLoc(td1, file$7, 56, 12, 1777);
				addLoc(tr1, file$7, 54, 10, 1681);
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
				addLoc(td0, file$7, 61, 14, 2004);
				td1.className = "" + (ctx.i == 0 ? 'first': '') + " svelte-ptap6b";
				addLoc(td1, file$7, 62, 14, 2096);
				setStyle(td2, "text-align", "right");
				td2.className = "svelte-ptap6b";
				addLoc(td2, file$7, 63, 14, 2164);
				addLoc(tr, file$7, 60, 12, 1985);
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
				addLoc(canvas, file$7, 69, 10, 2359);
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
		this._state = assign(data$6(), options.data);

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

		this._fragment = create_main_fragment$7(this, this._state);

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

	/* src/AtlasNav.html generated by Svelte v2.15.3 */

	const file$8 = "src/AtlasNav.html";

	function create_main_fragment$8(component, ctx) {
		var div, button0, text1, button1, text3, button2, text5, button3, text7, select, option0, option1, option2, option3, option4, option5, option6, option7, select_updating = false;

		function click_handler(event) {
			component.fire('home');
		}

		function click_handler_1(event) {
			component.fire('zoomout');
		}

		function click_handler_2(event) {
			component.fire('zoomin');
		}

		function click_handler_3(event) {
			component.fire('fullscreen');
		}

		function select_change_handler() {
			select_updating = true;
			component.set({ layer_name: selectValue(select) });
			select_updating = false;
		}

		return {
			c: function create() {
				div = createElement("div");
				button0 = createElement("button");
				button0.textContent = "Home";
				text1 = createText("\n  ");
				button1 = createElement("button");
				button1.textContent = "Zoom Out";
				text3 = createText("\n  \n  \n  \n  ");
				button2 = createElement("button");
				button2.textContent = "Zoom In";
				text5 = createText("\n  ");
				button3 = createElement("button");
				button3.textContent = "Fullscreen";
				text7 = createText("\n  \n  ");
				select = createElement("select");
				option0 = createElement("option");
				option0.textContent = "mixed3b";
				option1 = createElement("option");
				option1.textContent = "mixed4a";
				option2 = createElement("option");
				option2.textContent = "mixed4b";
				option3 = createElement("option");
				option3.textContent = "mixed4c";
				option4 = createElement("option");
				option4.textContent = "mixed4d";
				option5 = createElement("option");
				option5.textContent = "mixed4e";
				option6 = createElement("option");
				option6.textContent = "mixed5a";
				option7 = createElement("option");
				option7.textContent = "mixed5b";
				addListener(button0, "click", click_handler);
				button0.className = "svelte-1swd199";
				addLoc(button0, file$8, 1, 2, 20);
				addListener(button1, "click", click_handler_1);
				button1.className = "svelte-1swd199";
				addLoc(button1, file$8, 2, 2, 68);
				addListener(button2, "click", click_handler_2);
				button2.className = "svelte-1swd199";
				addLoc(button2, file$8, 7, 2, 419);
				addListener(button3, "click", click_handler_3);
				button3.className = "svelte-1swd199";
				addLoc(button3, file$8, 8, 2, 472);
				option0.__value = "mixed3b";
				option0.value = option0.__value;
				addLoc(option0, file$8, 11, 4, 655);
				option1.__value = "mixed4a";
				option1.value = option1.__value;
				addLoc(option1, file$8, 12, 4, 700);
				option2.__value = "mixed4b";
				option2.value = option2.__value;
				addLoc(option2, file$8, 13, 4, 745);
				option3.__value = "mixed4c";
				option3.value = option3.__value;
				addLoc(option3, file$8, 14, 4, 790);
				option4.__value = "mixed4d";
				option4.value = option4.__value;
				addLoc(option4, file$8, 15, 4, 835);
				option5.__value = "mixed4e";
				option5.value = option5.__value;
				addLoc(option5, file$8, 16, 4, 880);
				option6.__value = "mixed5a";
				option6.value = option6.__value;
				addLoc(option6, file$8, 17, 4, 925);
				option7.__value = "mixed5b";
				option7.value = option7.__value;
				addLoc(option7, file$8, 18, 4, 970);
				addListener(select, "change", select_change_handler);
				if (!('layer_name' in ctx)) component.root._beforecreate.push(select_change_handler);
				select.name = "layer";
				addLoc(select, file$8, 10, 2, 605);
				div.className = "nav svelte-1swd199";
				addLoc(div, file$8, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, button0);
				append(div, text1);
				append(div, button1);
				append(div, text3);
				append(div, button2);
				append(div, text5);
				append(div, button3);
				append(div, text7);
				append(div, select);
				append(select, option0);
				append(select, option1);
				append(select, option2);
				append(select, option3);
				append(select, option4);
				append(select, option5);
				append(select, option6);
				append(select, option7);

				selectOption(select, ctx.layer_name);
			},

			p: function update(changed, ctx) {
				if (!select_updating && changed.layer_name) selectOption(select, ctx.layer_name);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				removeListener(button0, "click", click_handler);
				removeListener(button1, "click", click_handler_1);
				removeListener(button2, "click", click_handler_2);
				removeListener(button3, "click", click_handler_3);
				removeListener(select, "change", select_change_handler);
			}
		};
	}

	function AtlasNav(options) {
		this._debugName = '<AtlasNav>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		if (!('layer_name' in this._state)) console.warn("<AtlasNav> was created without expected data property 'layer_name'");
		this._intro = true;

		this._fragment = create_main_fragment$8(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(AtlasNav.prototype, protoDev);

	AtlasNav.prototype._checkReadOnly = function _checkReadOnly(newState) {
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

	function data$7() {
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

		var if_block = (ctx.scale) && create_if_block$2(component, ctx);

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
						if_block = create_if_block$2(component, ctx);
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
	function create_if_block$2(component, ctx) {
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
		this._state = assign(data$7(), options.data);

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

	/* src/diagrams/Cover.html generated by Svelte v2.15.3 */

	function data$8()  {
	  return {
	    layer_name: "mixed5a",
	    layer: 0,
	    gcx: 0.2,
	    gcy: 0.299
	  }
	}
	var methods$3 = {
	  goto(x, y, scale) {
	    this.refs.detail.transitionTo(x, y, scale, 1200);
	  }
	};

	const file$a = "src/diagrams/Cover.html";

	function create_main_fragment$a(component, ctx) {
		var atlasnav_updating = {}, text0, div9, div2, div1, atlas0_updating = {}, text1, div0, text2, div8, div7, div4, div3, atlas1_updating = {}, text3, atlasreticle_updating = {}, text4, div6, b, text6, span0, text8, span1, text10, span2, text12, span3, text14, span4, text16, span5, text18, d_footnote, text20, div5;

		var atlasnav_initial_data = {};
		if (ctx.unit
	   !== void 0) {
			atlasnav_initial_data.unit = ctx.unit
	  ;
			atlasnav_updating.unit = true;
		}
		if (ctx.layer_name
	 !== void 0) {
			atlasnav_initial_data.layer_name = ctx.layer_name
	;
			atlasnav_updating.layer_name = true;
		}
		var atlasnav = new AtlasNav({
			root: component.root,
			store: component.store,
			data: atlasnav_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasnav_updating.unit && changed.unit) {
					newState.unit = childState.unit;
				}

				if (!atlasnav_updating.layer_name && changed.layer_name) {
					newState.layer_name = childState.layer_name;
				}
				component._set(newState);
				atlasnav_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasnav._bind({ unit: 1, layer_name: 1 }, atlasnav.get());
		});

		atlasnav.on("home", function(event) {
			component.refs.detail.home();
		});
		atlasnav.on("fullscreen", function(event) {
			component.refs.detail.fullscreen();
		});
		atlasnav.on("zoomin", function(event) {
			component.refs.detail.zoomit(2);
		});
		atlasnav.on("zoomout", function(event) {
			component.refs.detail.zoomit(0.5);
		});

		var atlas0_initial_data = {
		 	id: "inceptionv1_" + ctx.layer_name,
		 	iconCrop: 0.2,
		 	homeScale: 8,
		 	homeX: .22,
		 	homeY: .32,
		 	scaleCountFactor: 10,
		 	alphaAttributionFactor: 10,
		 	showLabels: true,
		 	strokeColor: "#666",
		 	backgroundColor: "#333"
		 };
		if (ctx.scale 
	         !== void 0) {
			atlas0_initial_data.scale = ctx.scale 
	        ;
			atlas0_updating.scale = true;
		}
		if (ctx.gcx 
	         !== void 0) {
			atlas0_initial_data.gcx = ctx.gcx 
	        ;
			atlas0_updating.gcx = true;
		}
		if (ctx.gcy 
	         !== void 0) {
			atlas0_initial_data.gcy = ctx.gcy 
	        ;
			atlas0_updating.gcy = true;
		}
		if (ctx.layer
	         !== void 0) {
			atlas0_initial_data.layer = ctx.layer
	        ;
			atlas0_updating.layer = true;
		}
		if (ctx.aspectRatio
	         !== void 0) {
			atlas0_initial_data.aspectRatio = ctx.aspectRatio
	        ;
			atlas0_updating.aspectRatio = true;
		}
		var atlas0 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas0_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas0_updating.scale && changed.scale) {
					newState.scale = childState.scale;
				}

				if (!atlas0_updating.gcx && changed.gcx) {
					newState.gcx = childState.gcx;
				}

				if (!atlas0_updating.gcy && changed.gcy) {
					newState.gcy = childState.gcy;
				}

				if (!atlas0_updating.layer && changed.layer) {
					newState.layer = childState.layer;
				}

				if (!atlas0_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio = childState.aspectRatio;
				}
				component._set(newState);
				atlas0_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas0._bind({ scale: 1, gcx: 1, gcy: 1, layer: 1, aspectRatio: 1 }, atlas0.get());
		});

		component.refs.detail = atlas0;

		var atlas1_initial_data = {
		 	id: "inceptionv1_" + ctx.layer_name,
		 	gridSize: 2,
		 	iconCrop: 0.3,
		 	scaleCountFactor: 200,
		 	alphaAttributionFactor: 10
		 };
		if (ctx.layer 
	             !== void 0) {
			atlas1_initial_data.layer = ctx.layer 
	            ;
			atlas1_updating.layer = true;
		}
		var atlas1 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas1_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas1_updating.layer && changed.layer) {
					newState.layer = childState.layer;
				}
				component._set(newState);
				atlas1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas1._bind({ layer: 1 }, atlas1.get());
		});

		component.refs.overview = atlas1;

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

		function click_handler(event) {
			component.goto(.55, .08, 8);
		}

		function click_handler_1(event) {
			component.goto(.90, .26, 8);
		}

		function click_handler_2(event) {
			component.goto(.13, .26, 8);
		}

		function click_handler_3(event) {
			component.goto(.23, .76, 8);
		}

		function click_handler_4(event) {
			component.goto(.54, .93, 8);
		}

		function click_handler_5(event) {
			component.goto(.46, .52, 8);
		}

		var notebooklink_initial_data = { url: "" };
		var notebooklink = new NotebookLink({
			root: component.root,
			store: component.store,
			data: notebooklink_initial_data
		});

		return {
			c: function create() {
				atlasnav._fragment.c();
				text0 = createText("\n\n\n\n");
				div9 = createElement("div");
				div2 = createElement("div");
				div1 = createElement("div");
				atlas0._fragment.c();
				text1 = createText("\n      ");
				div0 = createElement("div");
				text2 = createText("\n\n  ");
				div8 = createElement("div");
				div7 = createElement("div");
				div4 = createElement("div");
				div3 = createElement("div");
				atlas1._fragment.c();
				text3 = createText("\n          ");
				atlasreticle._fragment.c();
				text4 = createText("\n      ");
				div6 = createElement("div");
				b = createElement("b");
				b.textContent = "An activation atlas";
				text6 = createText(" of the second to last layer of the InceptionV1 vision classification network reveals many fully realized features, such as  \n        ");
				span0 = createElement("span");
				span0.textContent = "electronics";
				text8 = createText(", \n        ");
				span1 = createElement("span");
				span1.textContent = "vehicles";
				text10 = createText(", \n        ");
				span2 = createElement("span");
				span2.textContent = "food";
				text12 = createText(", \n        ");
				span3 = createElement("span");
				span3.textContent = "birds";
				text14 = createText(", \n        ");
				span4 = createElement("span");
				span4.textContent = "dogs";
				text16 = createText(", and\n        ");
				span5 = createElement("span");
				span5.textContent = "backgrounds";
				text18 = createText(".\n        Each grid cell is labeled with the classification it most supports.\n        ");
				d_footnote = createElement("d-footnote");
				d_footnote.textContent = "More specifically, We show a linear approximation of the effect of these average activation vectors of a grid cell on the logits.";
				text20 = createText("\n        ");
				div5 = createElement("div");
				notebooklink._fragment.c();
				div0.className = "shadow svelte-196acv4";
				addLoc(div0, file$a, 32, 6, 962);
				setStyle(div1, "margin-left", "20px");
				setStyle(div1, "position", "relative");
				setStyle(div1, "width", "calc(100% - 20px)");
				setStyle(div1, "height", "100%");
				addLoc(div1, file$a, 13, 4, 446);
				div2.className = "detail svelte-196acv4";
				setStyle(div2, "grid-column", "screen/text");
				addLoc(div2, file$a, 12, 2, 387);
				setStyle(div3, "position", "absolute");
				setStyle(div3, "width", "100%");
				setStyle(div3, "height", "100%");
				setStyle(div3, "top", "0");
				setStyle(div3, "left", "0");
				addLoc(div3, file$a, 39, 8, 1269);
				setStyle(div4, "position", "relative");
				setStyle(div4, "padding-top", "100%");
				setStyle(div4, "height", "0");
				setStyle(div4, "overflow", "hidden");
				addLoc(div4, file$a, 38, 6, 1182);
				addLoc(b, file$a, 58, 8, 1811);
				addListener(span0, "click", click_handler);
				span0.className = "link svelte-196acv4";
				addLoc(span0, file$a, 59, 8, 1971);
				addListener(span1, "click", click_handler_1);
				span1.className = "link svelte-196acv4";
				addLoc(span1, file$a, 60, 8, 2048);
				addListener(span2, "click", click_handler_2);
				span2.className = "link svelte-196acv4";
				addLoc(span2, file$a, 61, 8, 2122);
				addListener(span3, "click", click_handler_3);
				span3.className = "link svelte-196acv4";
				addLoc(span3, file$a, 62, 8, 2192);
				addListener(span4, "click", click_handler_4);
				span4.className = "link svelte-196acv4";
				addLoc(span4, file$a, 63, 8, 2263);
				addListener(span5, "click", click_handler_5);
				span5.className = "link svelte-196acv4";
				addLoc(span5, file$a, 64, 8, 2336);
				addLoc(d_footnote, file$a, 66, 8, 2488);
				setStyle(div5, "margin-top", "16px");
				addLoc(div5, file$a, 67, 8, 2651);
				div6.className = "figcaption";
				addLoc(div6, file$a, 57, 6, 1778);
				setStyle(div7, "margin-right", "20px");
				setStyle(div7, "position", "relative");
				setStyle(div7, "width", "calc(100% - 20px)");
				setStyle(div7, "height", "100%");
				addLoc(div7, file$a, 37, 4, 1083);
				div8.className = "overview svelte-196acv4";
				setStyle(div8, "grid-column", "text-end / screen-end");
				addLoc(div8, file$a, 36, 2, 1012);
				div9.className = "base-grid";
				setStyle(div9, "min-height", "500px");
				addLoc(div9, file$a, 11, 0, 334);
			},

			m: function mount(target, anchor) {
				atlasnav._mount(target, anchor);
				insert(target, text0, anchor);
				insert(target, div9, anchor);
				append(div9, div2);
				append(div2, div1);
				atlas0._mount(div1, null);
				append(div1, text1);
				append(div1, div0);
				append(div9, text2);
				append(div9, div8);
				append(div8, div7);
				append(div7, div4);
				append(div4, div3);
				atlas1._mount(div3, null);
				append(div3, text3);
				atlasreticle._mount(div3, null);
				append(div7, text4);
				append(div7, div6);
				append(div6, b);
				append(div6, text6);
				append(div6, span0);
				append(div6, text8);
				append(div6, span1);
				append(div6, text10);
				append(div6, span2);
				append(div6, text12);
				append(div6, span3);
				append(div6, text14);
				append(div6, span4);
				append(div6, text16);
				append(div6, span5);
				append(div6, text18);
				append(div6, d_footnote);
				append(div6, text20);
				append(div6, div5);
				notebooklink._mount(div5, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlasnav_changes = {};
				if (!atlasnav_updating.unit && changed.unit) {
					atlasnav_changes.unit = ctx.unit
	  ;
					atlasnav_updating.unit = ctx.unit
	   !== void 0;
				}
				if (!atlasnav_updating.layer_name && changed.layer_name) {
					atlasnav_changes.layer_name = ctx.layer_name
	;
					atlasnav_updating.layer_name = ctx.layer_name
	 !== void 0;
				}
				atlasnav._set(atlasnav_changes);
				atlasnav_updating = {};

				var atlas0_changes = {};
				if (changed.layer_name) atlas0_changes.id = "inceptionv1_" + ctx.layer_name;
				if (!atlas0_updating.scale && changed.scale) {
					atlas0_changes.scale = ctx.scale 
	        ;
					atlas0_updating.scale = ctx.scale 
	         !== void 0;
				}
				if (!atlas0_updating.gcx && changed.gcx) {
					atlas0_changes.gcx = ctx.gcx 
	        ;
					atlas0_updating.gcx = ctx.gcx 
	         !== void 0;
				}
				if (!atlas0_updating.gcy && changed.gcy) {
					atlas0_changes.gcy = ctx.gcy 
	        ;
					atlas0_updating.gcy = ctx.gcy 
	         !== void 0;
				}
				if (!atlas0_updating.layer && changed.layer) {
					atlas0_changes.layer = ctx.layer
	        ;
					atlas0_updating.layer = ctx.layer
	         !== void 0;
				}
				if (!atlas0_updating.aspectRatio && changed.aspectRatio) {
					atlas0_changes.aspectRatio = ctx.aspectRatio
	        ;
					atlas0_updating.aspectRatio = ctx.aspectRatio
	         !== void 0;
				}
				atlas0._set(atlas0_changes);
				atlas0_updating = {};

				var atlas1_changes = {};
				if (changed.layer_name) atlas1_changes.id = "inceptionv1_" + ctx.layer_name;
				if (!atlas1_updating.layer && changed.layer) {
					atlas1_changes.layer = ctx.layer 
	            ;
					atlas1_updating.layer = ctx.layer 
	             !== void 0;
				}
				atlas1._set(atlas1_changes);
				atlas1_updating = {};

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
				atlasnav.destroy(detach);
				if (detach) {
					detachNode(text0);
					detachNode(div9);
				}

				atlas0.destroy();
				if (component.refs.detail === atlas0) component.refs.detail = null;
				atlas1.destroy();
				if (component.refs.overview === atlas1) component.refs.overview = null;
				atlasreticle.destroy();
				removeListener(span0, "click", click_handler);
				removeListener(span1, "click", click_handler_1);
				removeListener(span2, "click", click_handler_2);
				removeListener(span3, "click", click_handler_3);
				removeListener(span4, "click", click_handler_4);
				removeListener(span5, "click", click_handler_5);
				notebooklink.destroy();
			}
		};
	}

	function Cover(options) {
		this._debugName = '<Cover>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$8(), options.data);
		if (!('unit' in this._state)) console.warn("<Cover> was created without expected data property 'unit'");
		if (!('layer_name' in this._state)) console.warn("<Cover> was created without expected data property 'layer_name'");
		if (!('scale' in this._state)) console.warn("<Cover> was created without expected data property 'scale'");
		if (!('gcx' in this._state)) console.warn("<Cover> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<Cover> was created without expected data property 'gcy'");
		if (!('layer' in this._state)) console.warn("<Cover> was created without expected data property 'layer'");
		if (!('aspectRatio' in this._state)) console.warn("<Cover> was created without expected data property 'aspectRatio'");
		this._intro = true;

		this._fragment = create_main_fragment$a(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Cover.prototype, protoDev);
	assign(Cover.prototype, methods$3);

	Cover.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/Placeholder.html generated by Svelte v2.15.3 */

	function width({clientWidth}) {
		return clientWidth;
	}

	function height({width, aspectRatio}) {
		return width / aspectRatio;
	}

	function data$9() {
	  return {
	    display: "block",
	    aspectRatio: 1,
	    clientWidth: 0,
	    
	  }
	}
	const file$b = "src/library/Placeholder.html";

	function create_main_fragment$b(component, ctx) {
		var div1, div0, slot_content_default = component._slotted.default, div1_resize_listener;

		function div1_resize_handler() {
			component.set({ clientWidth: div1.clientWidth });
		}

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				div0.className = "container svelte-xqvv98";
				addLoc(div0, file$b, 1, 2, 103);
				component.root._beforecreate.push(div1_resize_handler);
				div1.className = "root svelte-xqvv98";
				setStyle(div1, "display", ctx.display);
				setStyle(div1, "padding-bottom", "" + 100 / ctx.aspectRatio + "%");
				addLoc(div1, file$b, 0, 0, 0);
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
		this._state = assign(data$9(), options.data);

		this._recompute({ clientWidth: 1, width: 1, aspectRatio: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<Placeholder> was created without expected data property 'clientWidth'");

		if (!('aspectRatio' in this._state)) console.warn("<Placeholder> was created without expected data property 'aspectRatio'");
		if (!('display' in this._state)) console.warn("<Placeholder> was created without expected data property 'display'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$b(this, this._state);

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

	/* src/library/LazyImage.html generated by Svelte v2.15.3 */

	function data$a() {
	  return {
	    ready: false,
	    src: "",
	    alt: "",
	    display: "block", //"inline", "inline-block", "block"
	    aspectRatio: 1, // width/height
	    border: true,
	    background: true,
	  }
	}
	const file$c = "src/library/LazyImage.html";

	function create_main_fragment$c(component, ctx) {
		var div, if_block_anchor, radar_updating = {}, div_class_value;

		function select_block_type(ctx) {
			if (ctx.ready) return create_if_block$3;
			return create_else_block$2;
		}

		var current_block_type = select_block_type(ctx);
		var if_block = current_block_type(component, ctx);

		var placeholder_initial_data = { aspectRatio: ctx.aspectRatio };
		var placeholder = new Placeholder({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: placeholder_initial_data
		});

		var radar_initial_data = {};
		if (ctx.ready !== void 0) {
			radar_initial_data.ready = ctx.ready;
			radar_updating.ready = true;
		}
		var radar = new Radar({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: radar_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!radar_updating.ready && changed.ready) {
					newState.ready = childState.ready;
				}
				component._set(newState);
				radar_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			radar._bind({ ready: 1 }, radar.get());
		});

		return {
			c: function create() {
				div = createElement("div");
				if_block.c();
				if_block_anchor = createComment();
				placeholder._fragment.c();
				radar._fragment.c();
				div.className = div_class_value = "" + (ctx.background ? 'background' : '') + " " + (ctx.border ? 'border' : '') + " svelte-lat22x";
				addLoc(div, file$c, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if_block.m(placeholder._slotted.default, null);
				append(placeholder._slotted.default, if_block_anchor);
				placeholder._mount(radar._slotted.default, null);
				radar._mount(div, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block.d(1);
					if_block = current_block_type(component, ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}

				var placeholder_changes = {};
				if (changed.aspectRatio) placeholder_changes.aspectRatio = ctx.aspectRatio;
				placeholder._set(placeholder_changes);

				var radar_changes = {};
				if (!radar_updating.ready && changed.ready) {
					radar_changes.ready = ctx.ready;
					radar_updating.ready = ctx.ready !== void 0;
				}
				radar._set(radar_changes);
				radar_updating = {};

				if ((changed.background || changed.border) && div_class_value !== (div_class_value = "" + (ctx.background ? 'background' : '') + " " + (ctx.border ? 'border' : '') + " svelte-lat22x")) {
					div.className = div_class_value;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if_block.d();
				placeholder.destroy();
				radar.destroy();
			}
		};
	}

	// (6:6) {:else}
	function create_else_block$2(component, ctx) {

		var loading = new Loading({
			root: component.root,
			store: component.store
		});

		return {
			c: function create() {
				loading._fragment.c();
			},

			m: function mount(target, anchor) {
				loading._mount(target, anchor);
			},

			p: noop,

			d: function destroy$$1(detach) {
				loading.destroy(detach);
			}
		};
	}

	// (4:6) {#if ready}
	function create_if_block$3(component, ctx) {
		var img;

		return {
			c: function create() {
				img = createElement("img");
				img.src = ctx.src;
				img.alt = ctx.alt;
				img.className = "svelte-lat22x svelte-ref-image";
				addLoc(img, file$c, 4, 8, 151);
			},

			m: function mount(target, anchor) {
				insert(target, img, anchor);
				component.refs.image = img;
			},

			p: function update(changed, ctx) {
				if (changed.src) {
					img.src = ctx.src;
				}

				if (changed.alt) {
					img.alt = ctx.alt;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(img);
				}

				if (component.refs.image === img) component.refs.image = null;
			}
		};
	}

	function LazyImage(options) {
		this._debugName = '<LazyImage>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$a(), options.data);
		if (!('background' in this._state)) console.warn("<LazyImage> was created without expected data property 'background'");
		if (!('border' in this._state)) console.warn("<LazyImage> was created without expected data property 'border'");
		if (!('ready' in this._state)) console.warn("<LazyImage> was created without expected data property 'ready'");
		if (!('aspectRatio' in this._state)) console.warn("<LazyImage> was created without expected data property 'aspectRatio'");
		if (!('src' in this._state)) console.warn("<LazyImage> was created without expected data property 'src'");
		if (!('alt' in this._state)) console.warn("<LazyImage> was created without expected data property 'alt'");
		this._intro = true;

		this._fragment = create_main_fragment$c(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(LazyImage.prototype, protoDev);

	LazyImage.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Overview.html generated by Svelte v2.15.3 */

	const file$d = "src/diagrams/Overview.html";

	function create_main_fragment$d(component, ctx) {
		var div8, div1, h40, text1, text2, div0, text4, div3, h41, text6, text7, div2, text9, div5, h42, text11, text12, div4, text14, div7, h43, text16, text17, div6;

		var lazyimage0_initial_data = {
		 	src: "assets/images/overview-neuron.jpg",
		 	border: false
		 };
		var lazyimage0 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage0_initial_data
		});

		var lazyimage1_initial_data = {
		 	src: "assets/images/overview-pairwise.jpg",
		 	border: false
		 };
		var lazyimage1 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage1_initial_data
		});

		var lazyimage2_initial_data = {
		 	src: "assets/images/activation-grid.png",
		 	border: false
		 };
		var lazyimage2 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage2_initial_data
		});

		var lazyimage3_initial_data = {
		 	src: "assets/images/overview-atlas.jpg",
		 	border: false
		 };
		var lazyimage3 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage3_initial_data
		});

		return {
			c: function create() {
				div8 = createElement("div");
				div1 = createElement("div");
				h40 = createElement("h4");
				h40.textContent = "Individual Neurons";
				text1 = createText("\n    ");
				lazyimage0._fragment.c();
				text2 = createText("\n    ");
				div0 = createElement("div");
				div0.textContent = "Visualizing individual neurons make hidden layers somewhate meaningful, but misses interactions between neurons.";
				text4 = createText("\n  ");
				div3 = createElement("div");
				h41 = createElement("h4");
				h41.textContent = "Pairwise Interactions";
				text6 = createText("\n    ");
				lazyimage1._fragment.c();
				text7 = createText("\n    ");
				div2 = createElement("div");
				div2.textContent = "Studying pairwise interaction surfaces some interaction effects, but doesn't show interactions between many and the space of possible pairs is huge.";
				text9 = createText("\n  ");
				div5 = createElement("div");
				h42 = createElement("h4");
				h42.textContent = "Spatial Activations";
				text11 = createText("\n    ");
				lazyimage2._fragment.c();
				text12 = createText("\n    ");
				div4 = createElement("div");
				div4.textContent = "Spatial activations show important combinations of many neurons, but are focused on a single example.";
				text14 = createText("\n  ");
				div7 = createElement("div");
				h43 = createElement("h4");
				h43.textContent = "Activation Atlas";
				text16 = createText("\n    ");
				lazyimage3._fragment.c();
				text17 = createText("\n    ");
				div6 = createElement("div");
				div6.textContent = "Activation atlases show important combinations of neurons, but give a bigger picture overview.";
				h40.className = "svelte-7yn287";
				addLoc(h40, file$d, 2, 4, 27);
				div0.className = "figcaption svelte-7yn287";
				addLoc(div0, file$d, 7, 4, 148);
				addLoc(div1, file$d, 1, 2, 17);
				h41.className = "svelte-7yn287";
				addLoc(h41, file$d, 10, 4, 312);
				div2.className = "figcaption svelte-7yn287";
				addLoc(div2, file$d, 15, 4, 438);
				addLoc(div3, file$d, 9, 2, 302);
				h42.className = "svelte-7yn287";
				addLoc(h42, file$d, 18, 4, 638);
				div4.className = "figcaption svelte-7yn287";
				addLoc(div4, file$d, 23, 4, 760);
				addLoc(div5, file$d, 17, 2, 628);
				h43.className = "svelte-7yn287";
				addLoc(h43, file$d, 26, 4, 913);
				div6.className = "figcaption svelte-7yn287";
				addLoc(div6, file$d, 31, 4, 1031);
				addLoc(div7, file$d, 25, 2, 903);
				div8.className = "svelte-7yn287 svelte-ref-root";
				addLoc(div8, file$d, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div8, anchor);
				append(div8, div1);
				append(div1, h40);
				append(div1, text1);
				lazyimage0._mount(div1, null);
				append(div1, text2);
				append(div1, div0);
				append(div8, text4);
				append(div8, div3);
				append(div3, h41);
				append(div3, text6);
				lazyimage1._mount(div3, null);
				append(div3, text7);
				append(div3, div2);
				append(div8, text9);
				append(div8, div5);
				append(div5, h42);
				append(div5, text11);
				lazyimage2._mount(div5, null);
				append(div5, text12);
				append(div5, div4);
				append(div8, text14);
				append(div8, div7);
				append(div7, h43);
				append(div7, text16);
				lazyimage3._mount(div7, null);
				append(div7, text17);
				append(div7, div6);
				component.refs.root = div8;
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div8);
				}

				lazyimage0.destroy();
				lazyimage1.destroy();
				lazyimage2.destroy();
				lazyimage3.destroy();
				if (component.refs.root === div8) component.refs.root = null;
			}
		};
	}

	function Overview(options) {
		this._debugName = '<Overview>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign({}, options.data);
		this._intro = true;

		this._fragment = create_main_fragment$d(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Overview.prototype, protoDev);

	Overview.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/ModelOverview.html generated by Svelte v2.15.3 */

	const file$e = "src/diagrams/ModelOverview.html";

	function create_main_fragment$e(component, ctx) {
		var div;

		var lazyimage_initial_data = {
		 	src: "assets/images/model.svg",
		 	alt: "model",
		 	aspectRatio: 1072 / 178.3,
		 	border: false,
		 	background: false
		 };
		var lazyimage = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage_initial_data
		});

		return {
			c: function create() {
				div = createElement("div");
				lazyimage._fragment.c();
				div.className = "svelte-rd22a7 svelte-ref-root";
				addLoc(div, file$e, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				lazyimage._mount(div, null);
				component.refs.root = div;
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				lazyimage.destroy();
				if (component.refs.root === div) component.refs.root = null;
			}
		};
	}

	function ModelOverview(options) {
		this._debugName = '<ModelOverview>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign({}, options.data);
		this._intro = true;

		this._fragment = create_main_fragment$e(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ModelOverview.prototype, protoDev);

	ModelOverview.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/GridDetail.html generated by Svelte v2.15.3 */

	const file$f = "src/diagrams/GridDetail.html";

	function create_main_fragment$f(component, ctx) {
		var div4, div1, text0, div0, text2, div3, text3, div2;

		var lazyimage0_initial_data = {
		 	src: "assets/images/dogcat.jpg",
		 	alt: "input image"
		 };
		var lazyimage0 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage0_initial_data
		});

		var lazyimage1_initial_data = {
		 	src: "assets/images/dogcat-grid.jpg",
		 	alt: "activation grid"
		 };
		var lazyimage1 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage1_initial_data
		});

		return {
			c: function create() {
				div4 = createElement("div");
				div1 = createElement("div");
				lazyimage0._fragment.c();
				text0 = createText("\n    ");
				div0 = createElement("div");
				div0.textContent = "Input image from ImageNet.";
				text2 = createText("\n  ");
				div3 = createElement("div");
				lazyimage1._fragment.c();
				text3 = createText("\n    ");
				div2 = createElement("div");
				div2.textContent = "Activation grid from InceptionV1, layer mixed4d.";
				div0.className = "figcaption svelte-scrtb8";
				addLoc(div0, file$f, 7, 4, 116);
				addLoc(div1, file$f, 2, 2, 22);
				div2.className = "figcaption svelte-scrtb8";
				addLoc(div2, file$f, 14, 4, 287);
				addLoc(div3, file$f, 9, 2, 184);
				div4.className = "root svelte-scrtb8";
				addLoc(div4, file$f, 1, 0, 1);
			},

			m: function mount(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div1);
				lazyimage0._mount(div1, null);
				append(div1, text0);
				append(div1, div0);
				append(div4, text2);
				append(div4, div3);
				lazyimage1._mount(div3, null);
				append(div3, text3);
				append(div3, div2);
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div4);
				}

				lazyimage0.destroy();
				lazyimage1.destroy();
			}
		};
	}

	function GridDetail(options) {
		this._debugName = '<GridDetail>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		this._intro = true;

		this._fragment = create_main_fragment$f(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(GridDetail.prototype, protoDev);

	GridDetail.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/ClassAtlas.html generated by Svelte v2.15.3 */

	function ticks$1({gridSize}) {
		return range(1, gridSize);
	}

	function src({root, classFilter, gridSize}) {
		return `${root}render--x=0--y=0--tries=3--alpha=False--tile_size=8--whiten=true--steps=1024--icon_size=80--grid_size=${gridSize}--layout=20_0.01_cosine--class_filter=${classFilter}--filter=None--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg`;
	}

	function data$b() {
	  return {
	    root: `https://storage.googleapis.com/activation-atlas/build/class_filter_inceptionv1/render/`,
	    classFilter: 62,
	    gridSize: 8
	  }
	}
	const file$g = "src/diagrams/ClassAtlas.html";

	function get_each1_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.i = list[i];
		return child_ctx;
	}

	function get_each0_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.i = list[i];
		return child_ctx;
	}

	function create_main_fragment$g(component, ctx) {
		var div, text, svg, each0_anchor;

		var lazyimage_initial_data = {
		 	src: ctx.src,
		 	alt: "class activation atlas"
		 };
		var lazyimage = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage_initial_data
		});

		var each0_value = ctx.ticks;

		var each0_blocks = [];

		for (var i = 0; i < each0_value.length; i += 1) {
			each0_blocks[i] = create_each_block_1(component, get_each0_context(ctx, each0_value, i));
		}

		var each1_value = ctx.ticks;

		var each1_blocks = [];

		for (var i = 0; i < each1_value.length; i += 1) {
			each1_blocks[i] = create_each_block$1(component, get_each1_context(ctx, each1_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");
				lazyimage._fragment.c();
				text = createText("\n\n  ");
				svg = createSvgElement("svg");

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].c();
				}

				each0_anchor = createComment();

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].c();
				}
				setAttribute(svg, "viewBox", "0 0 500 500");
				setAttribute(svg, "class", "svelte-hfoyhc");
				addLoc(svg, file$g, 7, 2, 81);
				div.className = "svelte-hfoyhc svelte-ref-root";
				addLoc(div, file$g, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				lazyimage._mount(div, null);
				append(div, text);
				append(div, svg);

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].m(svg, null);
				}

				append(svg, each0_anchor);

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].m(svg, null);
				}

				component.refs.root = div;
			},

			p: function update(changed, ctx) {
				var lazyimage_changes = {};
				if (changed.src) lazyimage_changes.src = ctx.src;
				lazyimage._set(lazyimage_changes);

				if (changed.ticks || changed.gridSize) {
					each0_value = ctx.ticks;

					for (var i = 0; i < each0_value.length; i += 1) {
						const child_ctx = get_each0_context(ctx, each0_value, i);

						if (each0_blocks[i]) {
							each0_blocks[i].p(changed, child_ctx);
						} else {
							each0_blocks[i] = create_each_block_1(component, child_ctx);
							each0_blocks[i].c();
							each0_blocks[i].m(svg, each0_anchor);
						}
					}

					for (; i < each0_blocks.length; i += 1) {
						each0_blocks[i].d(1);
					}
					each0_blocks.length = each0_value.length;
				}

				if (changed.ticks || changed.gridSize) {
					each1_value = ctx.ticks;

					for (var i = 0; i < each1_value.length; i += 1) {
						const child_ctx = get_each1_context(ctx, each1_value, i);

						if (each1_blocks[i]) {
							each1_blocks[i].p(changed, child_ctx);
						} else {
							each1_blocks[i] = create_each_block$1(component, child_ctx);
							each1_blocks[i].c();
							each1_blocks[i].m(svg, null);
						}
					}

					for (; i < each1_blocks.length; i += 1) {
						each1_blocks[i].d(1);
					}
					each1_blocks.length = each1_value.length;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				lazyimage.destroy();

				destroyEach(each0_blocks, detach);

				destroyEach(each1_blocks, detach);

				if (component.refs.root === div) component.refs.root = null;
			}
		};
	}

	// (9:2) {#each ticks as i}
	function create_each_block_1(component, ctx) {
		var line, line_y__value, line_y__value_1;

		return {
			c: function create() {
				line = createSvgElement("line");
				setAttribute(line, "x2", 500);
				setAttribute(line, "y1", line_y__value = 500 * ctx.i / ctx.gridSize);
				setAttribute(line, "y2", line_y__value_1 = 500 * ctx.i / ctx.gridSize);
				setAttribute(line, "stroke", "black");
				setAttribute(line, "stroke-opacity", "0.15");
				setAttribute(line, "stroke-dasharray", "2,2");
				addLoc(line, file$g, 9, 4, 134);
			},

			m: function mount(target, anchor) {
				insert(target, line, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.ticks || changed.gridSize) && line_y__value !== (line_y__value = 500 * ctx.i / ctx.gridSize)) {
					setAttribute(line, "y1", line_y__value);
				}

				if ((changed.ticks || changed.gridSize) && line_y__value_1 !== (line_y__value_1 = 500 * ctx.i / ctx.gridSize)) {
					setAttribute(line, "y2", line_y__value_1);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(line);
				}
			}
		};
	}

	// (13:2) {#each ticks as i}
	function create_each_block$1(component, ctx) {
		var line, line_x__value, line_x__value_1;

		return {
			c: function create() {
				line = createSvgElement("line");
				setAttribute(line, "y2", 500);
				setAttribute(line, "x1", line_x__value = 500 * ctx.i / ctx.gridSize);
				setAttribute(line, "x2", line_x__value_1 = 500 * ctx.i / ctx.gridSize);
				setAttribute(line, "stroke", "black");
				setAttribute(line, "stroke-opacity", "0.15");
				setAttribute(line, "stroke-dasharray", "2,2");
				addLoc(line, file$g, 13, 4, 297);
			},

			m: function mount(target, anchor) {
				insert(target, line, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.ticks || changed.gridSize) && line_x__value !== (line_x__value = 500 * ctx.i / ctx.gridSize)) {
					setAttribute(line, "x1", line_x__value);
				}

				if ((changed.ticks || changed.gridSize) && line_x__value_1 !== (line_x__value_1 = 500 * ctx.i / ctx.gridSize)) {
					setAttribute(line, "x2", line_x__value_1);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(line);
				}
			}
		};
	}

	function ClassAtlas(options) {
		this._debugName = '<ClassAtlas>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$b(), options.data);

		this._recompute({ gridSize: 1, root: 1, classFilter: 1 }, this._state);
		if (!('gridSize' in this._state)) console.warn("<ClassAtlas> was created without expected data property 'gridSize'");
		if (!('root' in this._state)) console.warn("<ClassAtlas> was created without expected data property 'root'");
		if (!('classFilter' in this._state)) console.warn("<ClassAtlas> was created without expected data property 'classFilter'");
		this._intro = true;

		this._fragment = create_main_fragment$g(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ClassAtlas.prototype, protoDev);

	ClassAtlas.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('ticks' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassAtlas>: Cannot set read-only property 'ticks'");
		if ('src' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassAtlas>: Cannot set read-only property 'src'");
	};

	ClassAtlas.prototype._recompute = function _recompute(changed, state) {
		if (changed.gridSize) {
			if (this._differs(state.ticks, (state.ticks = ticks$1(state)))) changed.ticks = true;
		}

		if (changed.root || changed.classFilter || changed.gridSize) {
			if (this._differs(state.src, (state.src = src(state)))) changed.src = true;
		}
	};

	/* src/diagrams/ClassSubset.html generated by Svelte v2.15.3 */

	function data$c() {
	  return {
	    layout: 0,
	    currentClass: 62,
	    // classes: [7,9,1,2,12,13,14,24,61,62,76,80,81,169,188,225,226,233,249,288,309,312,322,323,378,652,665,780,804,901,946,992,274,279,286,543,544,55,76,622,631,645,643,671,672,507,982,897,701,777,831,990,677,822,947,348,355,746,827, 721,582,827,359,361,367,359,367,364,543,544,737,738,737,738,736,744,176,67,28,205,102,62,791,287,235],
	    classes: [62,7,2,12,80,225,652,233,322,323,378,665,780,804,901,946,992,622,631,643,671,672,507,982,990,677,822,947,348,355,721,582,361,364,737,738,736,744,791,287,235],
	  }
	}
	const file$h = "src/diagrams/ClassSubset.html";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.c = list[i];
		return child_ctx;
	}

	function create_main_fragment$h(component, ctx) {
		var h4, text0, text1_value = ctx.$inceptionLabels[ctx.currentClass], text1, text2, text3, div3, div0, text4, div2, div1, text5, div4;

		var classatlas_initial_data = { classFilter: ctx.currentClass };
		var classatlas = new ClassAtlas({
			root: component.root,
			store: component.store,
			data: classatlas_initial_data
		});

		var each_value = ctx.classes;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(component, get_each_context$1(ctx, each_value, i));
		}

		var notebooklink_initial_data = { url: "" };
		var notebooklink = new NotebookLink({
			root: component.root,
			store: component.store,
			data: notebooklink_initial_data
		});

		return {
			c: function create() {
				h4 = createElement("h4");
				text0 = createText("Class Activation Atlas for “");
				text1 = createText(text1_value);
				text2 = createText("”");
				text3 = createText("\n");
				div3 = createElement("div");
				div0 = createElement("div");
				classatlas._fragment.c();
				text4 = createText("\n  ");
				div2 = createElement("div");
				div1 = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				text5 = createText("\n");
				div4 = createElement("div");
				notebooklink._fragment.c();
				h4.className = "svelte-15rolwy";
				addLoc(h4, file$h, 0, 0, 0);
				setStyle(div0, "position", "relative");
				addLoc(div0, file$h, 2, 2, 88);
				div1.className = "chooser svelte-15rolwy";
				addLoc(div1, file$h, 6, 4, 214);
				div2.className = "chooser-container svelte-15rolwy";
				addLoc(div2, file$h, 5, 2, 178);
				div3.className = "svelte-15rolwy svelte-ref-root";
				addLoc(div3, file$h, 1, 0, 71);
				setStyle(div4, "margin-top", "16px");
				addLoc(div4, file$h, 16, 0, 485);
			},

			m: function mount(target, anchor) {
				insert(target, h4, anchor);
				append(h4, text0);
				append(h4, text1);
				append(h4, text2);
				insert(target, text3, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				classatlas._mount(div0, null);
				append(div3, text4);
				append(div3, div2);
				append(div2, div1);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div1, null);
				}

				component.refs.root = div3;
				insert(target, text5, anchor);
				insert(target, div4, anchor);
				notebooklink._mount(div4, null);
			},

			p: function update(changed, ctx) {
				if ((changed.$inceptionLabels || changed.currentClass) && text1_value !== (text1_value = ctx.$inceptionLabels[ctx.currentClass])) {
					setData(text1, text1_value);
				}

				var classatlas_changes = {};
				if (changed.currentClass) classatlas_changes.classFilter = ctx.currentClass;
				classatlas._set(classatlas_changes);

				if (changed.currentClass || changed.classes || changed.$inceptionLabels) {
					each_value = ctx.classes;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$2(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div1, null);
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
					detachNode(h4);
					detachNode(text3);
					detachNode(div3);
				}

				classatlas.destroy();

				destroyEach(each_blocks, detach);

				if (component.refs.root === div3) component.refs.root = null;
				if (detach) {
					detachNode(text5);
					detachNode(div4);
				}

				notebooklink.destroy();
			}
		};
	}

	// (8:6) {#each classes as c}
	function create_each_block$2(component, ctx) {
		var label, input, input_value_value, text0, text1_value = ctx.$inceptionLabels[ctx.c], text1, text2, text3_value = ctx.c, text3, text4, label_class_value;

		function input_change_handler() {
			component.set({ currentClass: input.__value });
		}

		return {
			c: function create() {
				label = createElement("label");
				input = createElement("input");
				text0 = createText("\n          ");
				text1 = createText(text1_value);
				text2 = createText(" (");
				text3 = createText(text3_value);
				text4 = createText(")");
				component._bindingGroups[0].push(input);
				addListener(input, "change", input_change_handler);
				setAttribute(input, "type", "radio");
				input.__value = input_value_value = ctx.c;
				input.value = input.__value;
				input.className = "svelte-15rolwy";
				addLoc(input, file$h, 9, 10, 336);
				label.className = label_class_value = "" + (ctx.currentClass === ctx.c ? 'selected' : '') + " svelte-15rolwy";
				addLoc(label, file$h, 8, 8, 271);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, input);

				input.checked = input.__value === ctx.currentClass;

				append(label, text0);
				append(label, text1);
				append(label, text2);
				append(label, text3);
				append(label, text4);
			},

			p: function update(changed, ctx) {
				if (changed.currentClass) input.checked = input.__value === ctx.currentClass;
				if ((changed.classes) && input_value_value !== (input_value_value = ctx.c)) {
					input.__value = input_value_value;
				}

				input.value = input.__value;
				if ((changed.$inceptionLabels || changed.classes) && text1_value !== (text1_value = ctx.$inceptionLabels[ctx.c])) {
					setData(text1, text1_value);
				}

				if ((changed.classes) && text3_value !== (text3_value = ctx.c)) {
					setData(text3, text3_value);
				}

				if ((changed.currentClass || changed.classes) && label_class_value !== (label_class_value = "" + (ctx.currentClass === ctx.c ? 'selected' : '') + " svelte-15rolwy")) {
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

	function ClassSubset(options) {
		this._debugName = '<ClassSubset>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<ClassSubset> references store properties, but no store was provided");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(assign(this.store._init(["inceptionLabels"]), data$c()), options.data);
		this.store._add(this, ["inceptionLabels"]);
		if (!('$inceptionLabels' in this._state)) console.warn("<ClassSubset> was created without expected data property '$inceptionLabels'");
		if (!('currentClass' in this._state)) console.warn("<ClassSubset> was created without expected data property 'currentClass'");
		if (!('classes' in this._state)) console.warn("<ClassSubset> was created without expected data property 'classes'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$h(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ClassSubset.prototype, protoDev);

	ClassSubset.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/ClassComparison.html generated by Svelte v2.15.3 */

	function leftIndex({$classComparisons, classComparisonIndex}) {
		return $classComparisons[classComparisonIndex].left;
	}

	function rightIndex({$classComparisons, classComparisonIndex}) {
		return $classComparisons[classComparisonIndex].right;
	}

	function data$d() {
	  return {
	    classComparisonIndex: 0,
	    showControls: true
	  };
	}
	const file$i = "src/diagrams/ClassComparison.html";

	function click_handler(event) {
		const { component, ctx } = this._svelte;

		component.set({classComparisonIndex: ctx.i});
	}

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.comparison = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$i(component, ctx) {
		var text0, div4, div1, h40, text1, text2_value = ctx.$inceptionLabels[ctx.leftIndex], text2, text3, text4, div0, text5, div3, h41, text6, text7_value = ctx.$inceptionLabels[ctx.rightIndex], text7, text8, text9, div2;

		var if_block = (ctx.showControls) && create_if_block$4(component, ctx);

		var classatlas0_initial_data = { classFilter: ctx.leftIndex };
		var classatlas0 = new ClassAtlas({
			root: component.root,
			store: component.store,
			data: classatlas0_initial_data
		});

		var classatlas1_initial_data = { classFilter: ctx.rightIndex };
		var classatlas1 = new ClassAtlas({
			root: component.root,
			store: component.store,
			data: classatlas1_initial_data
		});

		return {
			c: function create() {
				if (if_block) if_block.c();
				text0 = createText("\n\n");
				div4 = createElement("div");
				div1 = createElement("div");
				h40 = createElement("h4");
				text1 = createText("“");
				text2 = createText(text2_value);
				text3 = createText("”");
				text4 = createText("\n    ");
				div0 = createElement("div");
				classatlas0._fragment.c();
				text5 = createText("\n  ");
				div3 = createElement("div");
				h41 = createElement("h4");
				text6 = createText("“");
				text7 = createText(text7_value);
				text8 = createText("”");
				text9 = createText("\n    ");
				div2 = createElement("div");
				classatlas1._fragment.c();
				h40.className = "svelte-a1781g";
				addLoc(h40, file$i, 8, 4, 307);
				div0.className = "atlas";
				addLoc(div0, file$i, 9, 4, 352);
				addLoc(div1, file$i, 7, 2, 297);
				h41.className = "svelte-a1781g";
				addLoc(h41, file$i, 14, 4, 449);
				div2.className = "atlas";
				addLoc(div2, file$i, 15, 4, 495);
				addLoc(div3, file$i, 13, 2, 439);
				setStyle(div4, "display", "grid");
				setStyle(div4, "grid-auto-flow", "column");
				setStyle(div4, "grid-column-gap", "20px");
				setStyle(div4, "grid-auto-columns", "1fr");
				addLoc(div4, file$i, 6, 0, 195);
			},

			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, text0, anchor);
				insert(target, div4, anchor);
				append(div4, div1);
				append(div1, h40);
				append(h40, text1);
				append(h40, text2);
				append(h40, text3);
				append(div1, text4);
				append(div1, div0);
				classatlas0._mount(div0, null);
				append(div4, text5);
				append(div4, div3);
				append(div3, h41);
				append(h41, text6);
				append(h41, text7);
				append(h41, text8);
				append(div3, text9);
				append(div3, div2);
				classatlas1._mount(div2, null);
			},

			p: function update(changed, ctx) {
				if (ctx.showControls) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$4(component, ctx);
						if_block.c();
						if_block.m(text0.parentNode, text0);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.$inceptionLabels || changed.leftIndex) && text2_value !== (text2_value = ctx.$inceptionLabels[ctx.leftIndex])) {
					setData(text2, text2_value);
				}

				var classatlas0_changes = {};
				if (changed.leftIndex) classatlas0_changes.classFilter = ctx.leftIndex;
				classatlas0._set(classatlas0_changes);

				if ((changed.$inceptionLabels || changed.rightIndex) && text7_value !== (text7_value = ctx.$inceptionLabels[ctx.rightIndex])) {
					setData(text7, text7_value);
				}

				var classatlas1_changes = {};
				if (changed.rightIndex) classatlas1_changes.classFilter = ctx.rightIndex;
				classatlas1._set(classatlas1_changes);
			},

			d: function destroy$$1(detach) {
				if (if_block) if_block.d(detach);
				if (detach) {
					detachNode(text0);
					detachNode(div4);
				}

				classatlas0.destroy();
				classatlas1.destroy();
			}
		};
	}

	// (1:0) {#if showControls}
	function create_if_block$4(component, ctx) {
		var each_anchor;

		var each_value = ctx.$classComparisons;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$3(component, get_each_context$2(ctx, each_value, i));
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
				if (changed.$classComparisons) {
					each_value = ctx.$classComparisons;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$3(component, child_ctx);
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

	// (2:2) {#each $classComparisons as comparison, i}
	function create_each_block$3(component, ctx) {
		var button, text0_value = ctx.comparison.leftLabel, text0, text1, text2_value = ctx.comparison.rightLabel, text2;

		return {
			c: function create() {
				button = createElement("button");
				text0 = createText(text0_value);
				text1 = createText(" vs. ");
				text2 = createText(text2_value);
				button._svelte = { component, ctx };

				addListener(button, "click", click_handler);
				addLoc(button, file$i, 2, 4, 68);
			},

			m: function mount(target, anchor) {
				insert(target, button, anchor);
				append(button, text0);
				append(button, text1);
				append(button, text2);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if ((changed.$classComparisons) && text0_value !== (text0_value = ctx.comparison.leftLabel)) {
					setData(text0, text0_value);
				}

				if ((changed.$classComparisons) && text2_value !== (text2_value = ctx.comparison.rightLabel)) {
					setData(text2, text2_value);
				}

				button._svelte.ctx = ctx;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(button);
				}

				removeListener(button, "click", click_handler);
			}
		};
	}

	function ClassComparison(options) {
		this._debugName = '<ClassComparison>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<ClassComparison> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["classComparisons","inceptionLabels"]), data$d()), options.data);
		this.store._add(this, ["classComparisons","inceptionLabels"]);

		this._recompute({ $classComparisons: 1, classComparisonIndex: 1 }, this._state);
		if (!('$classComparisons' in this._state)) console.warn("<ClassComparison> was created without expected data property '$classComparisons'");
		if (!('classComparisonIndex' in this._state)) console.warn("<ClassComparison> was created without expected data property 'classComparisonIndex'");
		if (!('showControls' in this._state)) console.warn("<ClassComparison> was created without expected data property 'showControls'");
		if (!('$inceptionLabels' in this._state)) console.warn("<ClassComparison> was created without expected data property '$inceptionLabels'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$i(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ClassComparison.prototype, protoDev);

	ClassComparison.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('leftIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassComparison>: Cannot set read-only property 'leftIndex'");
		if ('rightIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassComparison>: Cannot set read-only property 'rightIndex'");
	};

	ClassComparison.prototype._recompute = function _recompute(changed, state) {
		if (changed.$classComparisons || changed.classComparisonIndex) {
			if (this._differs(state.leftIndex, (state.leftIndex = leftIndex(state)))) changed.leftIndex = true;
			if (this._differs(state.rightIndex, (state.rightIndex = rightIndex(state)))) changed.rightIndex = true;
		}
	};

	/* src/diagrams/ClassGradient.html generated by Svelte v2.15.3 */

	function height$1({width}) {
		return width;
	}

	function outerWidth({width, margin}) {
		return width + margin.left + margin.right;
	}

	function outerHeight({height, margin}) {
		return height + margin.top + margin.bottom;
	}

	function cellWidth({width}) {
		return width / 10;
	}

	function comparison({currentClassComparisonIndex, $classComparisons}) {
		return $classComparisons[currentClassComparisonIndex];
	}

	function data$e() {
	  return {
	    width: 504,
	    selected: 0,
	    margin: {
	      top: 60,
	      right: 80,
	      bottom: 40,
	      left: 80
	    },
	    color: '#9a9cad',
	    currentClassComparisonIndex: 0
	  }
	}
	const file$j = "src/diagrams/ClassGradient.html";

	function get_each_context$3(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.annotation = list[i];
		child_ctx.iter = i;
		return child_ctx;
	}

	function get_each1_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.tick = list[i];
		return child_ctx;
	}

	function get_each0_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.tick = list[i];
		return child_ctx;
	}

	function create_main_fragment$j(component, ctx) {
		var div, svg, defs, marker, path, g5, image, image_xlink_href_value, image_alt_value, g1, text2, tspan0, text0, tspan1, text1_value = ctx.comparison.leftLabel, text1, text5, tspan2, text3, tspan3, text4_value = ctx.comparison.rightLabel, text4, g0, line0, line1, g1_transform_value, g3, g2, line2, line3, text10, tspan4, text6, tspan5, text7, tspan6, text8, tspan7, text9, g3_transform_value, g4, line4, line4_y__value, line4_y__value_1, line5, line5_y__value, line5_y__value_1, g4_transform_value, each0_anchor, each1_anchor, g5_transform_value, svg_viewBox_value;

		var each0_value = range(11);

		var each0_blocks = [];

		for (var i = 0; i < each0_value.length; i += 1) {
			each0_blocks[i] = create_each_block_2(component, get_each0_context$1(ctx, each0_value, i));
		}

		var each1_value = range(11);

		var each1_blocks = [];

		for (var i = 0; i < each1_value.length; i += 1) {
			each1_blocks[i] = create_each_block_1$1(component, get_each1_context$1(ctx, each1_value, i));
		}

		var if_block = (ctx.comparison.annotation) && create_if_block$5(component, ctx);

		return {
			c: function create() {
				div = createElement("div");
				svg = createSvgElement("svg");
				defs = createSvgElement("defs");
				marker = createSvgElement("marker");
				path = createSvgElement("path");
				g5 = createSvgElement("g");
				image = createSvgElement("image");
				g1 = createSvgElement("g");
				text2 = createSvgElement("text");
				tspan0 = createSvgElement("tspan");
				text0 = createText("more attributed to ");
				tspan1 = createSvgElement("tspan");
				text1 = createText(text1_value);
				text5 = createSvgElement("text");
				tspan2 = createSvgElement("tspan");
				text3 = createText("more attributed to ");
				tspan3 = createSvgElement("tspan");
				text4 = createText(text4_value);
				g0 = createSvgElement("g");
				line0 = createSvgElement("line");
				line1 = createSvgElement("line");
				g3 = createSvgElement("g");
				g2 = createSvgElement("g");
				line2 = createSvgElement("line");
				line3 = createSvgElement("line");
				text10 = createSvgElement("text");
				tspan4 = createSvgElement("tspan");
				text6 = createText("positioned");
				tspan5 = createSvgElement("tspan");
				text7 = createText("by similarity");
				tspan6 = createSvgElement("tspan");
				text8 = createText("(one-dimensional");
				tspan7 = createSvgElement("tspan");
				text9 = createText("t-SNE)");
				g4 = createSvgElement("g");
				line4 = createSvgElement("line");
				line5 = createSvgElement("line");

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].c();
				}

				each0_anchor = createComment();

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].c();
				}

				each1_anchor = createComment();
				if (if_block) if_block.c();
				setAttribute(path, "d", "M0,0 L0,10 L10,5 z");
				setAttribute(path, "fill", ctx.color);
				addLoc(path, file$j, 11, 10, 462);
				setAttribute(marker, "id", 'arrow');
				setAttribute(marker, "markerWidth", "7");
				setAttribute(marker, "markerHeight", "7");
				setAttribute(marker, "refX", "10");
				setAttribute(marker, "refY", "5");
				setAttribute(marker, "orient", "auto");
				setAttribute(marker, "markerUnits", "strokeWidth");
				setAttribute(marker, "viewBox", "0 0 10 10");
				addLoc(marker, file$j, 10, 7, 316);
				addLoc(defs, file$j, 9, 3, 302);
				setAttribute(image, "id", "comparisonImg");
				setAttribute(image, "width", ctx.width);
				setAttribute(image, "height", ctx.height);
				setXlinkAttribute(image, "xlink:href", image_xlink_href_value = "https://storage.googleapis.com/activation-atlas/build/gradients/gradients/gradients--comparison=" + ctx.comparison.id + "--tries=4--alpha=False--tile_size=10--whiten=true--steps=1024--icon_size=90--grid_size=10--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg");
				setAttribute(image, "alt", image_alt_value = ctx.comparison.label);
				addLoc(image, file$j, 19, 6, 625);
				setAttribute(tspan0, "x", "-10");
				setAttribute(tspan0, "dy", "1.3em");
				addLoc(tspan0, file$j, 31, 10, 1167);
				setAttribute(tspan1, "x", "-10");
				setAttribute(tspan1, "dy", "1.3em");
				setAttribute(tspan1, "font-weight", "bold");
				addLoc(tspan1, file$j, 32, 10, 1231);
				setAttribute(text2, "y", "-50");
				setAttribute(text2, "text-anchor", "end");
				setAttribute(text2, "class", "svelte-1jr0ob8");
				addLoc(text2, file$j, 30, 8, 1124);
				setAttribute(tspan2, "x", "10");
				setAttribute(tspan2, "dy", "1.3em");
				addLoc(tspan2, file$j, 35, 10, 1356);
				setAttribute(tspan3, "x", "10");
				setAttribute(tspan3, "dy", "1.3em");
				setAttribute(tspan3, "font-weight", "bold");
				addLoc(tspan3, file$j, 36, 10, 1419);
				setAttribute(text5, "y", "-50");
				setAttribute(text5, "class", "svelte-1jr0ob8");
				addLoc(text5, file$j, 34, 8, 1331);
				setAttribute(line0, "x2", "-50");
				setAttribute(line0, "transform", "translate(-120,0)");
				setAttribute(line0, "stroke", ctx.color);
				setAttribute(line0, "marker-end", "url(#" + 'arrow' + ")");
				addLoc(line0, file$j, 40, 10, 1564);
				setAttribute(line1, "x2", "50");
				setAttribute(line1, "transform", "translate(120,0)");
				setAttribute(line1, "stroke", ctx.color);
				setAttribute(line1, "marker-end", "url(#" + 'arrow' + ")");
				addLoc(line1, file$j, 41, 10, 1671);
				setAttribute(g0, "transform", "translate(0, -28)");
				addLoc(g0, file$j, 39, 8, 1520);
				setAttribute(g1, "transform", g1_transform_value = "translate(" + ctx.width / 2 + ", 0)");
				addLoc(g1, file$j, 29, 6, 1074);
				setAttribute(line2, "y2", "-50");
				setAttribute(line2, "transform", "translate(0,-38)");
				setAttribute(line2, "stroke", ctx.color);
				setAttribute(line2, "marker-end", "url(#" + 'arrow' + ")");
				addLoc(line2, file$j, 49, 10, 1936);
				setAttribute(line3, "y2", "50");
				setAttribute(line3, "transform", "translate(0,30)");
				setAttribute(line3, "stroke", ctx.color);
				setAttribute(line3, "marker-end", "url(#" + 'arrow' + ")");
				addLoc(line3, file$j, 50, 10, 2042);
				setAttribute(g2, "transform", "translate(10, 0)");
				addLoc(g2, file$j, 48, 8, 1893);
				setAttribute(tspan4, "x", "0");
				setAttribute(tspan4, "y", "-1.8em");
				addLoc(tspan4, file$j, 53, 10, 2202);
				setAttribute(tspan5, "x", "0");
				setAttribute(tspan5, "y", "-0.6em");
				addLoc(tspan5, file$j, 54, 10, 2255);
				setAttribute(tspan6, "x", "0");
				setAttribute(tspan6, "y", "0.6em");
				addLoc(tspan6, file$j, 55, 10, 2311);
				setAttribute(tspan7, "x", "0");
				setAttribute(tspan7, "y", "1.8em");
				addLoc(tspan7, file$j, 56, 10, 2369);
				setAttribute(text10, "alignment-baseline", "middle");
				setAttribute(text10, "class", "svelte-1jr0ob8");
				addLoc(text10, file$j, 52, 8, 2157);
				setAttribute(g3, "transform", g3_transform_value = "translate(" + (- ctx.margin.left + 8) + "," + ctx.height/2 + ")");
				addLoc(g3, file$j, 47, 6, 1827);
				setAttribute(line4, "y1", line4_y__value = -ctx.margin.top + 4);
				setAttribute(line4, "y2", line4_y__value_1 = ctx.height + 8);
				setAttribute(line4, "stroke", "white");
				setAttribute(line4, "stroke-width", "5");
				setAttribute(line4, "stroke-opacity", "0.6");
				addLoc(line4, file$j, 63, 8, 2513);
				setAttribute(line5, "y1", line5_y__value = -ctx.margin.top + 4);
				setAttribute(line5, "y2", line5_y__value_1 = ctx.height + 8);
				setAttribute(line5, "stroke", "black");
				addLoc(line5, file$j, 64, 8, 2627);
				setAttribute(g4, "transform", g4_transform_value = "translate(" + ctx.width / 2 + ", 0)");
				addLoc(g4, file$j, 62, 6, 2463);
				setAttribute(g5, "transform", g5_transform_value = "translate(" + ctx.margin.left + "," + ctx.margin.top + ")");
				addLoc(g5, file$j, 15, 4, 542);
				setAttribute(svg, "class", "overlay svelte-1jr0ob8");
				setAttribute(svg, "viewBox", svg_viewBox_value = "0 0 " + ctx.outerWidth + " " + ctx.outerHeight);
				addLoc(svg, file$j, 5, 2, 210);
				div.className = "overlay-wrap svelte-1jr0ob8";
				addLoc(div, file$j, 4, 0, 180);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, svg);
				append(svg, defs);
				append(defs, marker);
				append(marker, path);
				append(svg, g5);
				append(g5, image);
				append(g5, g1);
				append(g1, text2);
				append(text2, tspan0);
				append(tspan0, text0);
				append(text2, tspan1);
				append(tspan1, text1);
				append(g1, text5);
				append(text5, tspan2);
				append(tspan2, text3);
				append(text5, tspan3);
				append(tspan3, text4);
				append(g1, g0);
				append(g0, line0);
				append(g0, line1);
				append(g5, g3);
				append(g3, g2);
				append(g2, line2);
				append(g2, line3);
				append(g3, text10);
				append(text10, tspan4);
				append(tspan4, text6);
				append(text10, tspan5);
				append(tspan5, text7);
				append(text10, tspan6);
				append(tspan6, text8);
				append(text10, tspan7);
				append(tspan7, text9);
				append(g5, g4);
				append(g4, line4);
				append(g4, line5);

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].m(g5, null);
				}

				append(g5, each0_anchor);

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].m(g5, null);
				}

				append(g5, each1_anchor);
				if (if_block) if_block.m(g5, null);
			},

			p: function update(changed, ctx) {
				if (changed.color) {
					setAttribute(path, "fill", ctx.color);
				}

				if (changed.width) {
					setAttribute(image, "width", ctx.width);
				}

				if (changed.height) {
					setAttribute(image, "height", ctx.height);
				}

				if ((changed.comparison) && image_xlink_href_value !== (image_xlink_href_value = "https://storage.googleapis.com/activation-atlas/build/gradients/gradients/gradients--comparison=" + ctx.comparison.id + "--tries=4--alpha=False--tile_size=10--whiten=true--steps=1024--icon_size=90--grid_size=10--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg")) {
					setXlinkAttribute(image, "xlink:href", image_xlink_href_value);
				}

				if ((changed.comparison) && image_alt_value !== (image_alt_value = ctx.comparison.label)) {
					setAttribute(image, "alt", image_alt_value);
				}

				if ((changed.comparison) && text1_value !== (text1_value = ctx.comparison.leftLabel)) {
					setData(text1, text1_value);
				}

				if ((changed.comparison) && text4_value !== (text4_value = ctx.comparison.rightLabel)) {
					setData(text4, text4_value);
				}

				if (changed.color) {
					setAttribute(line0, "stroke", ctx.color);
					setAttribute(line1, "stroke", ctx.color);
				}

				if ((changed.width) && g1_transform_value !== (g1_transform_value = "translate(" + ctx.width / 2 + ", 0)")) {
					setAttribute(g1, "transform", g1_transform_value);
				}

				if (changed.color) {
					setAttribute(line2, "stroke", ctx.color);
					setAttribute(line3, "stroke", ctx.color);
				}

				if ((changed.margin || changed.height) && g3_transform_value !== (g3_transform_value = "translate(" + (- ctx.margin.left + 8) + "," + ctx.height/2 + ")")) {
					setAttribute(g3, "transform", g3_transform_value);
				}

				if ((changed.margin) && line4_y__value !== (line4_y__value = -ctx.margin.top + 4)) {
					setAttribute(line4, "y1", line4_y__value);
				}

				if ((changed.height) && line4_y__value_1 !== (line4_y__value_1 = ctx.height + 8)) {
					setAttribute(line4, "y2", line4_y__value_1);
				}

				if ((changed.margin) && line5_y__value !== (line5_y__value = -ctx.margin.top + 4)) {
					setAttribute(line5, "y1", line5_y__value);
				}

				if ((changed.height) && line5_y__value_1 !== (line5_y__value_1 = ctx.height + 8)) {
					setAttribute(line5, "y2", line5_y__value_1);
				}

				if ((changed.width) && g4_transform_value !== (g4_transform_value = "translate(" + ctx.width / 2 + ", 0)")) {
					setAttribute(g4, "transform", g4_transform_value);
				}

				if (changed.width || changed.height) {
					each0_value = range(11);

					for (var i = 0; i < each0_value.length; i += 1) {
						const child_ctx = get_each0_context$1(ctx, each0_value, i);

						if (each0_blocks[i]) {
							each0_blocks[i].p(changed, child_ctx);
						} else {
							each0_blocks[i] = create_each_block_2(component, child_ctx);
							each0_blocks[i].c();
							each0_blocks[i].m(g5, each0_anchor);
						}
					}

					for (; i < each0_blocks.length; i += 1) {
						each0_blocks[i].d(1);
					}
					each0_blocks.length = each0_value.length;
				}

				if (changed.width || changed.height) {
					each1_value = range(11);

					for (var i = 0; i < each1_value.length; i += 1) {
						const child_ctx = get_each1_context$1(ctx, each1_value, i);

						if (each1_blocks[i]) {
							each1_blocks[i].p(changed, child_ctx);
						} else {
							each1_blocks[i] = create_each_block_1$1(component, child_ctx);
							each1_blocks[i].c();
							each1_blocks[i].m(g5, each1_anchor);
						}
					}

					for (; i < each1_blocks.length; i += 1) {
						each1_blocks[i].d(1);
					}
					each1_blocks.length = each1_value.length;
				}

				if (ctx.comparison.annotation) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$5(component, ctx);
						if_block.c();
						if_block.m(g5, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.margin) && g5_transform_value !== (g5_transform_value = "translate(" + ctx.margin.left + "," + ctx.margin.top + ")")) {
					setAttribute(g5, "transform", g5_transform_value);
				}

				if ((changed.outerWidth || changed.outerHeight) && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + ctx.outerWidth + " " + ctx.outerHeight)) {
					setAttribute(svg, "viewBox", svg_viewBox_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				destroyEach(each0_blocks, detach);

				destroyEach(each1_blocks, detach);

				if (if_block) if_block.d();
			}
		};
	}

	// (68:6) {#each range(11) as tick}
	function create_each_block_2(component, ctx) {
		var line, line_transform_value;

		return {
			c: function create() {
				line = createSvgElement("line");
				setAttribute(line, "x2", ctx.width);
				setAttribute(line, "transform", line_transform_value = "translate(0, " + ctx.tick * (ctx.height / 10) + ")");
				setAttribute(line, "stroke", "black");
				setAttribute(line, "stroke-opacity", "0.15");
				setAttribute(line, "stroke-dasharray", "2,2");
				addLoc(line, file$j, 68, 8, 2747);
			},

			m: function mount(target, anchor) {
				insert(target, line, anchor);
			},

			p: function update(changed, ctx) {
				if (changed.width) {
					setAttribute(line, "x2", ctx.width);
				}

				if ((changed.height) && line_transform_value !== (line_transform_value = "translate(0, " + ctx.tick * (ctx.height / 10) + ")")) {
					setAttribute(line, "transform", line_transform_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(line);
				}
			}
		};
	}

	// (72:6) {#each range(11) as tick}
	function create_each_block_1$1(component, ctx) {
		var line, line_transform_value;

		return {
			c: function create() {
				line = createSvgElement("line");
				setAttribute(line, "y2", ctx.width);
				setAttribute(line, "transform", line_transform_value = "translate(" + ctx.tick * (ctx.height / 10) + ", 0)");
				setAttribute(line, "stroke", "black");
				setAttribute(line, "stroke-opacity", "0.15");
				setAttribute(line, "stroke-dasharray", "2,2");
				addLoc(line, file$j, 72, 8, 2930);
			},

			m: function mount(target, anchor) {
				insert(target, line, anchor);
			},

			p: function update(changed, ctx) {
				if (changed.width) {
					setAttribute(line, "y2", ctx.width);
				}

				if ((changed.height) && line_transform_value !== (line_transform_value = "translate(" + ctx.tick * (ctx.height / 10) + ", 0)")) {
					setAttribute(line, "transform", line_transform_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(line);
				}
			}
		};
	}

	// (78:6) {#if comparison.annotation}
	function create_if_block$5(component, ctx) {
		var each_anchor;

		var each_value = ctx.comparison.annotation;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$4(component, get_each_context$3(ctx, each_value, i));
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
				if (changed.comparison || changed.cellWidth || changed.Math || changed.width) {
					each_value = ctx.comparison.annotation;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$3(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$4(component, child_ctx);
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

	// (79:8) {#each comparison.annotation as annotation,iter}
	function create_each_block$4(component, ctx) {
		var g0, line, line_x__value, line_x__value_1, text1, text0_value = ctx.annotation.desc, text0, text1_x_value, g0_transform_value, g1, circle0, circle0_r_value, circle1, circle1_r_value, g1_transform_value;

		return {
			c: function create() {
				g0 = createSvgElement("g");
				line = createSvgElement("line");
				text1 = createSvgElement("text");
				text0 = createText(text0_value);
				g1 = createSvgElement("g");
				circle0 = createSvgElement("circle");
				circle1 = createSvgElement("circle");
				setAttribute(line, "x1", line_x__value = (ctx.annotation.pos.y + 0.5) * ctx.cellWidth + ctx.cellWidth / 2 * ctx.Math.sqrt(2));
				setAttribute(line, "x2", line_x__value_1 = ctx.width + 10);
				setAttribute(line, "stroke", "black");
				setAttribute(line, "stroke-opacity", "0.4");
				addLoc(line, file$j, 80, 12, 3283);
				setAttribute(text1, "x", text1_x_value = ctx.width + 20);
				setAttribute(text1, "alignment-baseline", "middle");
				setAttribute(text1, "class", "svelte-1jr0ob8");
				addLoc(text1, file$j, 81, 12, 3428);
				setAttribute(g0, "transform", g0_transform_value = "translate(0, " + (ctx.annotation.pos.x + 0.5) * ctx.cellWidth + ")");
				addLoc(g0, file$j, 79, 10, 3202);
				setAttribute(circle0, "r", circle0_r_value = ctx.cellWidth / 2 * ctx.Math.sqrt(2));
				setAttribute(circle0, "fill", "none");
				setAttribute(circle0, "stroke", "white");
				setAttribute(circle0, "stroke-opacity", "0.5");
				setAttribute(circle0, "stroke-width", "5");
				addLoc(circle0, file$j, 84, 12, 3645);
				setAttribute(circle1, "r", circle1_r_value = ctx.cellWidth / 2 * ctx.Math.sqrt(2));
				setAttribute(circle1, "fill", "none");
				setAttribute(circle1, "stroke", "black");
				setAttribute(circle1, "stroke-opacity", "1");
				addLoc(circle1, file$j, 85, 12, 3765);
				setAttribute(g1, "transform", g1_transform_value = "translate(" + (ctx.annotation.pos.y + 0.5) * ctx.cellWidth + ", " + (ctx.annotation.pos.x + 0.5) * ctx.cellWidth + ")");
				addLoc(g1, file$j, 83, 10, 3527);
			},

			m: function mount(target, anchor) {
				insert(target, g0, anchor);
				append(g0, line);
				append(g0, text1);
				append(text1, text0);
				insert(target, g1, anchor);
				append(g1, circle0);
				append(g1, circle1);
			},

			p: function update(changed, ctx) {
				if ((changed.comparison || changed.cellWidth || changed.Math) && line_x__value !== (line_x__value = (ctx.annotation.pos.y + 0.5) * ctx.cellWidth + ctx.cellWidth / 2 * ctx.Math.sqrt(2))) {
					setAttribute(line, "x1", line_x__value);
				}

				if ((changed.width) && line_x__value_1 !== (line_x__value_1 = ctx.width + 10)) {
					setAttribute(line, "x2", line_x__value_1);
				}

				if ((changed.comparison) && text0_value !== (text0_value = ctx.annotation.desc)) {
					setData(text0, text0_value);
				}

				if ((changed.width) && text1_x_value !== (text1_x_value = ctx.width + 20)) {
					setAttribute(text1, "x", text1_x_value);
				}

				if ((changed.comparison || changed.cellWidth) && g0_transform_value !== (g0_transform_value = "translate(0, " + (ctx.annotation.pos.x + 0.5) * ctx.cellWidth + ")")) {
					setAttribute(g0, "transform", g0_transform_value);
				}

				if ((changed.cellWidth || changed.Math) && circle0_r_value !== (circle0_r_value = ctx.cellWidth / 2 * ctx.Math.sqrt(2))) {
					setAttribute(circle0, "r", circle0_r_value);
				}

				if ((changed.cellWidth || changed.Math) && circle1_r_value !== (circle1_r_value = ctx.cellWidth / 2 * ctx.Math.sqrt(2))) {
					setAttribute(circle1, "r", circle1_r_value);
				}

				if ((changed.comparison || changed.cellWidth) && g1_transform_value !== (g1_transform_value = "translate(" + (ctx.annotation.pos.y + 0.5) * ctx.cellWidth + ", " + (ctx.annotation.pos.x + 0.5) * ctx.cellWidth + ")")) {
					setAttribute(g1, "transform", g1_transform_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(g0);
					detachNode(g1);
				}
			}
		};
	}

	function ClassGradient(options) {
		this._debugName = '<ClassGradient>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<ClassGradient> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(assign({ Math : Math }, this.store._init(["classComparisons"])), data$e()), options.data);
		this.store._add(this, ["classComparisons"]);

		this._recompute({ width: 1, margin: 1, height: 1, currentClassComparisonIndex: 1, $classComparisons: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<ClassGradient> was created without expected data property 'width'");
		if (!('margin' in this._state)) console.warn("<ClassGradient> was created without expected data property 'margin'");

		if (!('currentClassComparisonIndex' in this._state)) console.warn("<ClassGradient> was created without expected data property 'currentClassComparisonIndex'");
		if (!('$classComparisons' in this._state)) console.warn("<ClassGradient> was created without expected data property '$classComparisons'");


		if (!('color' in this._state)) console.warn("<ClassGradient> was created without expected data property 'color'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$j(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(ClassGradient.prototype, protoDev);

	ClassGradient.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('height' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassGradient>: Cannot set read-only property 'height'");
		if ('outerWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassGradient>: Cannot set read-only property 'outerWidth'");
		if ('outerHeight' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassGradient>: Cannot set read-only property 'outerHeight'");
		if ('cellWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassGradient>: Cannot set read-only property 'cellWidth'");
		if ('comparison' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassGradient>: Cannot set read-only property 'comparison'");
	};

	ClassGradient.prototype._recompute = function _recompute(changed, state) {
		if (changed.width) {
			if (this._differs(state.height, (state.height = height$1(state)))) changed.height = true;
		}

		if (changed.width || changed.margin) {
			if (this._differs(state.outerWidth, (state.outerWidth = outerWidth(state)))) changed.outerWidth = true;
		}

		if (changed.height || changed.margin) {
			if (this._differs(state.outerHeight, (state.outerHeight = outerHeight(state)))) changed.outerHeight = true;
		}

		if (changed.width) {
			if (this._differs(state.cellWidth, (state.cellWidth = cellWidth(state)))) changed.cellWidth = true;
		}

		if (changed.currentClassComparisonIndex || changed.$classComparisons) {
			if (this._differs(state.comparison, (state.comparison = comparison(state)))) changed.comparison = true;
		}
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

	function identity$1(x) {
	  return x;
	}

	var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

	function formatLocale(locale) {
	  var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity$1,
	      currency = locale.currency,
	      decimal = locale.decimal,
	      numerals = locale.numerals ? formatNumerals(locale.numerals) : identity$1,
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

	/* src/diagrams/Adversarial.html generated by Svelte v2.15.3 */

	function data$f() {
	  return {
	    image: "",
	    left: "", 
	    right: "",
	    classifications: [],
	    aspectRatio: 1
	  }
	}
	var f = format(".1f");

	const file$k = "src/diagrams/Adversarial.html";

	function get_each_context_1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.row = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function get_each_context$4(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.c = list[i];
		return child_ctx;
	}

	function create_main_fragment$k(component, ctx) {
		var div;

		var each_value = ctx.classifications;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$5(component, get_each_context$4(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "adversarial svelte-1ghs2gk";
				setStyle(div, "grid-template-columns", "repeat(" + ctx.classifications.length + ", 1fr)");
				addLoc(div, file$k, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.classifications || changed.left || changed.right || changed.aspectRatio) {
					each_value = ctx.classifications;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$4(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$5(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				if (changed.classifications) {
					setStyle(div, "grid-template-columns", "repeat(" + ctx.classifications.length + ", 1fr)");
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

	// (10:8) {#each c.rows as row, i}
	function create_each_block_1$2(component, ctx) {
		var tr, td0, text0_value = ctx.i + 1, text0, text1, text2, td1, text3_value = ctx.row[0], text3, text4, td2, text5_value = f(ctx.row[1]), text5, text6, tr_class_value;

		return {
			c: function create() {
				tr = createElement("tr");
				td0 = createElement("td");
				text0 = createText(text0_value);
				text1 = createText(".");
				text2 = createText("\n          ");
				td1 = createElement("td");
				text3 = createText(text3_value);
				text4 = createText("\n          ");
				td2 = createElement("td");
				text5 = createText(text5_value);
				text6 = createText("%");
				td0.className = "svelte-1ghs2gk";
				addLoc(td0, file$k, 11, 10, 385);
				td1.className = "svelte-1ghs2gk";
				addLoc(td1, file$k, 12, 10, 414);
				td2.className = "svelte-1ghs2gk";
				addLoc(td2, file$k, 13, 10, 442);
				tr.className = tr_class_value = "" + (ctx.row[0] === ctx.left ? 'left' : '') + " " + (ctx.row[0] === ctx.right ? 'right' : '') + " svelte-1ghs2gk";
				addLoc(tr, file$k, 10, 8, 296);
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
				append(td2, text6);
			},

			p: function update(changed, ctx) {
				if ((changed.classifications) && text3_value !== (text3_value = ctx.row[0])) {
					setData(text3, text3_value);
				}

				if ((changed.classifications) && text5_value !== (text5_value = f(ctx.row[1]))) {
					setData(text5, text5_value);
				}

				if ((changed.classifications || changed.left || changed.right) && tr_class_value !== (tr_class_value = "" + (ctx.row[0] === ctx.left ? 'left' : '') + " " + (ctx.row[0] === ctx.right ? 'right' : '') + " svelte-1ghs2gk")) {
					tr.className = tr_class_value;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(tr);
				}
			}
		};
	}

	// (2:2) {#each classifications as c}
	function create_each_block$5(component, ctx) {
		var div1, text0, table, text1, div0, text2_value = ctx.c.caption, text2, text3;

		var lazyimage_initial_data = {
		 	src: ctx.c.image,
		 	alt: "" + ctx.left + " / " + ctx.right,
		 	aspectRatio: ctx.aspectRatio
		 };
		var lazyimage = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage_initial_data
		});

		var each_value_1 = ctx.c.rows;

		var each_blocks = [];

		for (var i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1$2(component, get_each_context_1(ctx, each_value_1, i));
		}

		return {
			c: function create() {
				div1 = createElement("div");
				lazyimage._fragment.c();
				text0 = createText("\n      ");
				table = createElement("table");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				text1 = createText("\n      ");
				div0 = createElement("div");
				text2 = createText(text2_value);
				text3 = createText("\n    ");
				table.className = "svelte-1ghs2gk";
				addLoc(table, file$k, 8, 6, 247);
				div0.className = "figcaption";
				addLoc(div0, file$k, 17, 6, 515);
				addLoc(div1, file$k, 2, 4, 131);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				lazyimage._mount(div1, null);
				append(div1, text0);
				append(div1, table);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(table, null);
				}

				append(div1, text1);
				append(div1, div0);
				append(div0, text2);
				append(div1, text3);
			},

			p: function update(changed, ctx) {
				var lazyimage_changes = {};
				if (changed.classifications) lazyimage_changes.src = ctx.c.image;
				if (changed.left || changed.right) lazyimage_changes.alt = "" + ctx.left + " / " + ctx.right;
				if (changed.aspectRatio) lazyimage_changes.aspectRatio = ctx.aspectRatio;
				lazyimage._set(lazyimage_changes);

				if (changed.classifications || changed.left || changed.right) {
					each_value_1 = ctx.c.rows;

					for (var i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block_1$2(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(table, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value_1.length;
				}

				if ((changed.classifications) && text2_value !== (text2_value = ctx.c.caption)) {
					setData(text2, text2_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				lazyimage.destroy();

				destroyEach(each_blocks, detach);
			}
		};
	}

	function Adversarial(options) {
		this._debugName = '<Adversarial>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$f(), options.data);
		if (!('classifications' in this._state)) console.warn("<Adversarial> was created without expected data property 'classifications'");
		if (!('left' in this._state)) console.warn("<Adversarial> was created without expected data property 'left'");
		if (!('right' in this._state)) console.warn("<Adversarial> was created without expected data property 'right'");
		if (!('aspectRatio' in this._state)) console.warn("<Adversarial> was created without expected data property 'aspectRatio'");
		this._intro = true;

		this._fragment = create_main_fragment$k(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Adversarial.prototype, protoDev);

	Adversarial.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Samples.html generated by Svelte v2.15.3 */

	const file$l = "src/diagrams/Samples.html";

	function create_main_fragment$l(component, ctx) {
		var div3, div0, h40, text1, text2, div1, h41, text4, text5, div2, h42, text7;

		var lazyimage0_initial_data = {
		 	src: "assets/images/render--x%3D0--y%3D0--tries%3D4--alpha%3DFalse--tile_size%3D20--whiten%3Dtrue--steps%3D1024--icon_size%3D80--grid_size%3D20--layout%3D50_0.05_cosine--class_filter%3DNone--filter%3D10000--layer%3Dmixed4c--model%3DInceptionV1--sample_images%3D1000000--sample_type%3Drandom.jpg",
		 	alt: "10,000 activations"
		 };
		var lazyimage0 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage0_initial_data
		});

		var lazyimage1_initial_data = {
		 	src: "assets/images/render--x%3D0--y%3D0--tries%3D4--alpha%3DFalse--tile_size%3D20--whiten%3Dtrue--steps%3D1024--icon_size%3D80--grid_size%3D20--layout%3D50_0.05_cosine--class_filter%3DNone--filter%3D100000--layer%3Dmixed4c--model%3DInceptionV1--sample_images%3D1000000--sample_type%3Drandom.jpg",
		 	alt: "100,000 activations"
		 };
		var lazyimage1 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage1_initial_data
		});

		var lazyimage2_initial_data = {
		 	src: "assets/images/render--x%3D0--y%3D0--tries%3D4--alpha%3DFalse--tile_size%3D20--whiten%3Dtrue--steps%3D1024--icon_size%3D80--grid_size%3D20--layout%3D50_0.05_cosine--class_filter%3DNone--filter%3D1000000--layer%3Dmixed4c--model%3DInceptionV1--sample_images%3D1000000--sample_type%3Drandom.jpg",
		 	alt: "1,000,000 activations"
		 };
		var lazyimage2 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage2_initial_data
		});

		return {
			c: function create() {
				div3 = createElement("div");
				div0 = createElement("div");
				h40 = createElement("h4");
				h40.textContent = "10,000 activations";
				text1 = createText("\n    ");
				lazyimage0._fragment.c();
				text2 = createText("\n  ");
				div1 = createElement("div");
				h41 = createElement("h4");
				h41.textContent = "100,000 activations";
				text4 = createText("\n    ");
				lazyimage1._fragment.c();
				text5 = createText("\n  ");
				div2 = createElement("div");
				h42 = createElement("h4");
				h42.textContent = "1,000,000 activations";
				text7 = createText("\n    ");
				lazyimage2._fragment.c();
				addLoc(h40, file$l, 2, 4, 27);
				addLoc(div0, file$l, 1, 2, 17);
				addLoc(h41, file$l, 9, 4, 430);
				addLoc(div1, file$l, 8, 2, 420);
				addLoc(h42, file$l, 16, 4, 836);
				addLoc(div2, file$l, 15, 2, 826);
				div3.className = "svelte-fa3qj3 svelte-ref-root";
				addLoc(div3, file$l, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, h40);
				append(div0, text1);
				lazyimage0._mount(div0, null);
				append(div3, text2);
				append(div3, div1);
				append(div1, h41);
				append(div1, text4);
				lazyimage1._mount(div1, null);
				append(div3, text5);
				append(div3, div2);
				append(div2, h42);
				append(div2, text7);
				lazyimage2._mount(div2, null);
				component.refs.root = div3;
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div3);
				}

				lazyimage0.destroy();
				lazyimage1.destroy();
				lazyimage2.destroy();
				if (component.refs.root === div3) component.refs.root = null;
			}
		};
	}

	function Samples(options) {
		this._debugName = '<Samples>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign({}, options.data);
		this._intro = true;

		this._fragment = create_main_fragment$l(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Samples.prototype, protoDev);

	Samples.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/ClassGrids.html generated by Svelte v2.15.3 */

	const file$m = "src/diagrams/ClassGrids.html";

	function create_main_fragment$m(component, ctx) {
		var div9, div2, div0, text0, div1, b0, text2, text3, div5, div3, text4, div4, b1, text6, text7, div8, div6, text8, div7, b2, text10;

		var lazyimage0_initial_data = {
		 	src: "assets/images/grid-size-32x32.png",
		 	alt: "32 x 32"
		 };
		var lazyimage0 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage0_initial_data
		});

		var lazyimage1_initial_data = {
		 	src: "assets/images/grid-size-8x8.png",
		 	alt: "8 x 8"
		 };
		var lazyimage1 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage1_initial_data
		});

		var lazyimage2_initial_data = {
		 	src: "assets/images/grid-size-2x2.png",
		 	alt: "2 x 2"
		 };
		var lazyimage2 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage2_initial_data
		});

		return {
			c: function create() {
				div9 = createElement("div");
				div2 = createElement("div");
				div0 = createElement("div");
				lazyimage0._fragment.c();
				text0 = createText("\n      ");
				div1 = createElement("div");
				b0 = createElement("b");
				b0.textContent = "32 x 32";
				text2 = createText(" When the grid is too small, the feature visualizations are too small to see.");
				text3 = createText("\n  ");
				div5 = createElement("div");
				div3 = createElement("div");
				lazyimage1._fragment.c();
				text4 = createText("\n      ");
				div4 = createElement("div");
				b1 = createElement("b");
				b1.textContent = "8 x 8";
				text6 = createText(" When just right, the activation atlas shows all the concepts with feature visualizations that are big enough to see.");
				text7 = createText("\n  ");
				div8 = createElement("div");
				div6 = createElement("div");
				lazyimage2._fragment.c();
				text8 = createText("\n      ");
				div7 = createElement("div");
				b2 = createElement("b");
				b2.textContent = "2 x 2";
				text10 = createText(" When the grid is too big, concepts are lost in the averages. One sees less diversity within related concepts.");
				div0.className = "atlas";
				addLoc(div0, file$m, 2, 6, 114);
				addLoc(b0, file$m, 5, 30, 252);
				div1.className = "figcaption svelte-dmx176";
				addLoc(div1, file$m, 5, 6, 228);
				addLoc(div2, file$m, 1, 2, 102);
				div3.className = "atlas";
				addLoc(div3, file$m, 8, 6, 373);
				addLoc(b1, file$m, 11, 30, 507);
				div4.className = "figcaption svelte-dmx176";
				addLoc(div4, file$m, 11, 6, 483);
				addLoc(div5, file$m, 7, 2, 361);
				div6.className = "atlas";
				addLoc(div6, file$m, 14, 6, 666);
				addLoc(b2, file$m, 17, 30, 800);
				div7.className = "figcaption svelte-dmx176";
				addLoc(div7, file$m, 17, 6, 776);
				addLoc(div8, file$m, 13, 2, 654);
				setStyle(div9, "display", "grid");
				setStyle(div9, "grid-auto-flow", "column");
				setStyle(div9, "grid-column-gap", "20px");
				setStyle(div9, "grid-auto-columns", "1fr");
				addLoc(div9, file$m, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div9, anchor);
				append(div9, div2);
				append(div2, div0);
				lazyimage0._mount(div0, null);
				append(div2, text0);
				append(div2, div1);
				append(div1, b0);
				append(div1, text2);
				append(div9, text3);
				append(div9, div5);
				append(div5, div3);
				lazyimage1._mount(div3, null);
				append(div5, text4);
				append(div5, div4);
				append(div4, b1);
				append(div4, text6);
				append(div9, text7);
				append(div9, div8);
				append(div8, div6);
				lazyimage2._mount(div6, null);
				append(div8, text8);
				append(div8, div7);
				append(div7, b2);
				append(div7, text10);
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div9);
				}

				lazyimage0.destroy();
				lazyimage1.destroy();
				lazyimage2.destroy();
			}
		};
	}

	function ClassGrids(options) {
		this._debugName = '<ClassGrids>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		this._intro = true;

		this._fragment = create_main_fragment$m(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ClassGrids.prototype, protoDev);

	ClassGrids.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/ActivationGrid.html generated by Svelte v2.15.3 */



	function width$1({inputWidth, columnWidth, columnMargin}) {
		return inputWidth * 2 + columnWidth * 3 + 4 * columnMargin;
	}

	function height$2({inputWidth}) {
		return inputWidth + 40;
	}

	function clippedCount({timerCount, numCells}) {
		return Math.round(timerCount) % (numCells * numCells);
	}

	function windowX({clippedCount, numCells}) {
		return clippedCount % numCells;
	}

	function windowY({clippedCount, numCells}) {
		return Math.floor(clippedCount / numCells);
	}

	function cellWidth$1({inputWidth, numCells, cellPadding}) {
		return (inputWidth + cellPadding) / numCells - cellPadding;
	}

	function numInputCells({numCells, windowSize}) {
		return numCells + windowSize - 1;
	}

	function inputCellWidth({inputWidth, numInputCells, cellPadding}) {
		return (inputWidth + cellPadding) / numInputCells - cellPadding;
	}

	function activations({numCells}) {
		return range(numCells).map(i => range(numCells).map( i => range(6).map(i => Math.random() - 0.5)));
	}

	function data$g() {
	  return {
	    paused: true,
	    inputWidth: 250,
	    columnWidth: 150,
	    columnMargin: 50,
	    numCells: 14,
	    cellPadding: 0,

	    windowSize: 3,
	    windowX: 0,
	    windowY: 0,

	    activations: range,

	    timerCount: 47

	  };
	}
	var format_1 = format(" .5f");

	const file$n = "src/diagrams/ActivationGrid.html";

	function mouseover_handler_1(event) {
		const { component, ctx } = this._svelte;

		component.set({timerCount: ctx.y * ctx.numCells + ctx.x});
	}

	function get_each_context_1$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.x = list[i];
		return child_ctx;
	}

	function get_each2_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.y = list[i];
		return child_ctx;
	}

	function get_each1_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.activation = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function mouseover_handler(event) {
		const { component, ctx } = this._svelte;

		component.set({timerCount: ctx.Math.min(ctx.numCells - 1, ctx.Math.max(0, ctx.y - ctx.windowSize + 2)) * ctx.numCells + ctx.Math.min(ctx.numCells - 1, ctx.Math.max(0, ctx.x - ctx.windowSize + 2))});
	}

	function get_each_context$5(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.x = list[i];
		return child_ctx;
	}

	function get_each0_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.y = list[i];
		return child_ctx;
	}

	function create_main_fragment$n(component, ctx) {
		var div, figure_updating = {}, text0, svg, clipPath0, rect0, rect0_x_value, rect0_y_value, clipPath1, rect1, rect1_x_value, rect1_y_value, rect1_width_value, rect1_height_value, g7, g0, text2, text1, image0, rect2, rect2_x_value, rect2_y_value, rect2_width_value, rect2_height_value, g2, path0, path0_transform_value, path0_d_value, text4, text3, g1, image1, g1_transform_value, rect3, text8, tspan0, text5, tspan1, text6, tspan2, text7, text8_transform_value, g2_transform_value, g3, path1, path1_transform_value, path1_d_value, text10, text9, text15, tspan3, text11, tspan4, text12, tspan5, text13, tspan6, text14, text15_transform_value, g3_transform_value, g5, path2, path2_transform_value, path2_d_value, text17, text16, g4, image2, g4_transform_value, rect4, text21, tspan7, text18, tspan8, text19, tspan9, text20, text21_transform_value, g5_transform_value, g6, path3, path3_transform_value, path3_d_value, text23, text22, image3, rect5, rect5_x_value, rect5_y_value, g6_transform_value, svg_viewBox_value, text24;

		var figure_initial_data = {};
		if (ctx.onscreen  !== void 0) {
			figure_initial_data.onscreen = ctx.onscreen ;
			figure_updating.onscreen = true;
		}
		var figure = new Figure({
			root: component.root,
			store: component.store,
			data: figure_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!figure_updating.onscreen && changed.onscreen) {
					newState.onscreen = childState.onscreen;
				}
				component._set(newState);
				figure_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			figure._bind({ onscreen: 1 }, figure.get());
		});

		figure.on("onscreen", function(event) {
			component.set({timerCount: 47});
		});

		var each0_value = range(ctx.numInputCells);

		var each0_blocks = [];

		for (var i = 0; i < each0_value.length; i += 1) {
			each0_blocks[i] = create_each_block_3(component, get_each0_context$2(ctx, each0_value, i));
		}

		var each1_value = ctx.activations[ctx.windowX][ctx.windowY];

		var each1_blocks = [];

		for (var i = 0; i < each1_value.length; i += 1) {
			each1_blocks[i] = create_each_block_2$1(component, get_each1_context$2(ctx, each1_value, i));
		}

		var each2_value = range(ctx.numCells);

		var each2_blocks = [];

		for (var i = 0; i < each2_value.length; i += 1) {
			each2_blocks[i] = create_each_block$6(component, get_each2_context(ctx, each2_value, i));
		}

		var notebooklink_initial_data = {
		 	url: "https://colab.sandbox.google.com/github/tensorflow/lucid/blob/master/notebooks/building-blocks/ActivationGrid.ipynb"
		 };
		var notebooklink = new NotebookLink({
			root: component.root,
			store: component.store,
			data: notebooklink_initial_data
		});

		function mouseout_handler(event) {
			component.set({timerCount: 47});
		}

		return {
			c: function create() {
				div = createElement("div");
				figure._fragment.c();
				text0 = createText("\n\n  ");
				svg = createSvgElement("svg");
				clipPath0 = createSvgElement("clipPath");
				rect0 = createSvgElement("rect");
				clipPath1 = createSvgElement("clipPath");
				rect1 = createSvgElement("rect");
				g7 = createSvgElement("g");
				g0 = createSvgElement("g");
				text2 = createSvgElement("text");
				text1 = createText("Input image");
				image0 = createSvgElement("image");

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].c();
				}

				rect2 = createSvgElement("rect");
				g2 = createSvgElement("g");
				path0 = createSvgElement("path");
				text4 = createSvgElement("text");
				text3 = createText("Image patch");
				g1 = createSvgElement("g");
				image1 = createSvgElement("image");
				rect3 = createSvgElement("rect");
				text8 = createSvgElement("text");
				tspan0 = createSvgElement("tspan");
				text5 = createText("Overlapping patches");
				tspan1 = createSvgElement("tspan");
				text6 = createText("of the input image are");
				tspan2 = createSvgElement("tspan");
				text7 = createText("evaluated one by one.");
				g3 = createSvgElement("g");
				path1 = createSvgElement("path");
				text10 = createSvgElement("text");
				text9 = createText("Activations");

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].c();
				}

				text15 = createSvgElement("text");
				tspan3 = createSvgElement("tspan");
				text11 = createText("We record a single ");
				tspan4 = createSvgElement("tspan");
				text12 = createText("activation value for each ");
				tspan5 = createSvgElement("tspan");
				text13 = createText("of the 512 neurons.");
				tspan6 = createSvgElement("tspan");
				text14 = createText("(values shown are mocked)");
				g5 = createSvgElement("g");
				path2 = createSvgElement("path");
				text17 = createSvgElement("text");
				text16 = createText("Feature visualization");
				g4 = createSvgElement("g");
				image2 = createSvgElement("image");
				rect4 = createSvgElement("rect");
				text21 = createSvgElement("text");
				tspan7 = createSvgElement("tspan");
				text18 = createText("We then produce a  ");
				tspan8 = createSvgElement("tspan");
				text19 = createText("feature visualization");
				tspan9 = createSvgElement("tspan");
				text20 = createText("and place them on a grid.");
				g6 = createSvgElement("g");
				path3 = createSvgElement("path");
				text23 = createSvgElement("text");
				text22 = createText("Activation grid");
				image3 = createSvgElement("image");

				for (var i = 0; i < each2_blocks.length; i += 1) {
					each2_blocks[i].c();
				}

				rect5 = createSvgElement("rect");
				text24 = createText("\n  ");
				notebooklink._fragment.c();
				setAttribute(rect0, "x", rect0_x_value = ctx.windowX * ctx.cellWidth);
				setAttribute(rect0, "y", rect0_y_value = ctx.windowY * ctx.cellWidth);
				setAttribute(rect0, "width", ctx.cellWidth);
				setAttribute(rect0, "height", ctx.cellWidth);
				addLoc(rect0, file$n, 5, 6, 280);
				setAttribute(clipPath0, "id", "activationGridClipRect");
				addLoc(clipPath0, file$n, 4, 4, 235);
				setAttribute(rect1, "x", rect1_x_value = ctx.windowX * ctx.inputCellWidth);
				setAttribute(rect1, "y", rect1_y_value = ctx.windowY * ctx.inputCellWidth);
				setAttribute(rect1, "width", rect1_width_value = ctx.inputCellWidth * ctx.windowSize);
				setAttribute(rect1, "height", rect1_height_value = ctx.inputCellWidth * ctx.windowSize);
				addLoc(rect1, file$n, 9, 6, 444);
				setAttribute(clipPath1, "id", "activationGridClipRectInput");
				addLoc(clipPath1, file$n, 8, 4, 394);
				setAttribute(text2, "class", "head svelte-qwhwb1");
				setAttribute(text2, "dy", "-13");
				addLoc(text2, file$n, 15, 8, 700);
				setXlinkAttribute(image0, "xlink:href", "assets/images/dogcat.jpg");
				setAttribute(image0, "width", ctx.inputWidth);
				setAttribute(image0, "height", ctx.inputWidth);
				addLoc(image0, file$n, 16, 8, 755);
				setAttribute(rect2, "stroke", "rgb(255, 170, 0)");
				setAttribute(rect2, "pointer-events", "none");
				setAttribute(rect2, "stroke-width", "2");
				setAttribute(rect2, "fill-opacity", "0");
				setAttribute(rect2, "x", rect2_x_value = ctx.windowX * ctx.inputCellWidth);
				setAttribute(rect2, "y", rect2_y_value = ctx.windowY * ctx.inputCellWidth);
				setAttribute(rect2, "width", rect2_width_value = ctx.inputCellWidth * ctx.windowSize);
				setAttribute(rect2, "height", rect2_height_value = ctx.inputCellWidth * ctx.windowSize);
				addLoc(rect2, file$n, 29, 8, 1552);
				setAttribute(g0, "transform", "translate(0, 0)");
				addLoc(g0, file$n, 14, 6, 660);
				setAttribute(path0, "class", "arrow svelte-qwhwb1");
				setAttribute(path0, "transform", path0_transform_value = "translate(0," + ctx.columnWidth / 2 + ")");
				setAttribute(path0, "d", path0_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5");
				addLoc(path0, file$n, 33, 8, 1869);
				setAttribute(text4, "class", "head svelte-qwhwb1");
				setAttribute(text4, "dy", "-13");
				addLoc(text4, file$n, 34, 8, 2014);
				setAttribute(image1, "image-rendering", "pixelated");
				setXlinkAttribute(image1, "xlink:href", "assets/images/dogcat.jpg");
				setAttribute(image1, "width", ctx.inputWidth);
				setAttribute(image1, "height", ctx.inputWidth);
				setAttribute(image1, "clip-path", "url(#activationGridClipRectInput)");
				addLoc(image1, file$n, 36, 10, 2215);
				setAttribute(g1, "transform", g1_transform_value = "scale(" + ctx.columnWidth / (ctx.inputCellWidth * ctx.windowSize) + ")translate(-" + ctx.windowX * ctx.inputCellWidth + ", -" + ctx.windowY * ctx.inputCellWidth + ")");
				addLoc(g1, file$n, 35, 8, 2069);
				setAttribute(rect3, "stroke", "rgb(255, 170, 0)");
				setAttribute(rect3, "stroke-width", "4");
				setAttribute(rect3, "fill-opacity", "0");
				setAttribute(rect3, "width", ctx.columnWidth);
				setAttribute(rect3, "height", ctx.columnWidth);
				addLoc(rect3, file$n, 42, 8, 2443);
				setAttribute(tspan0, "x", "0");
				setAttribute(tspan0, "dy", "1.4em");
				addLoc(tspan0, file$n, 44, 10, 2637);
				setAttribute(tspan1, "x", "0");
				setAttribute(tspan1, "dy", "1.4em");
				addLoc(tspan1, file$n, 45, 10, 2697);
				setAttribute(tspan2, "x", "0");
				setAttribute(tspan2, "dy", "1.4em");
				addLoc(tspan2, file$n, 46, 10, 2760);
				setAttribute(text8, "class", "figcaption svelte-qwhwb1");
				setAttribute(text8, "transform", text8_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")");
				addLoc(text8, file$n, 43, 8, 2556);
				setAttribute(g2, "transform", g2_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin) + ", 0)");
				addLoc(g2, file$n, 32, 6, 1803);
				setAttribute(path1, "class", "arrow svelte-qwhwb1");
				setAttribute(path1, "transform", path1_transform_value = "translate(0," + ctx.columnWidth / 2 + ")");
				setAttribute(path1, "d", path1_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5");
				addLoc(path1, file$n, 51, 8, 2957);
				setAttribute(text10, "class", "head svelte-qwhwb1");
				setAttribute(text10, "dy", "-13");
				addLoc(text10, file$n, 52, 8, 3102);
				setAttribute(tspan3, "x", "0");
				setAttribute(tspan3, "dy", "1.4em");
				addLoc(tspan3, file$n, 68, 10, 4048);
				setAttribute(tspan4, "x", "0");
				setAttribute(tspan4, "dy", "1.4em");
				addLoc(tspan4, file$n, 69, 10, 4108);
				setAttribute(tspan5, "x", "0");
				setAttribute(tspan5, "dy", "1.4em");
				addLoc(tspan5, file$n, 70, 10, 4175);
				setAttribute(tspan6, "x", "0");
				setAttribute(tspan6, "dy", "1.4em");
				addLoc(tspan6, file$n, 71, 10, 4235);
				setAttribute(text15, "class", "figcaption svelte-qwhwb1");
				setAttribute(text15, "transform", text15_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")");
				addLoc(text15, file$n, 67, 6, 3967);
				setAttribute(g3, "transform", g3_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + ctx.columnWidth + ctx.columnMargin) + ", 0)");
				addLoc(g3, file$n, 50, 6, 2862);
				setAttribute(path2, "class", "arrow svelte-qwhwb1");
				setAttribute(path2, "transform", path2_transform_value = "translate(0," + ctx.columnWidth / 2 + ")");
				setAttribute(path2, "d", path2_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5");
				addLoc(path2, file$n, 77, 8, 4451);
				setAttribute(text17, "class", "head svelte-qwhwb1");
				setAttribute(text17, "dy", "-13");
				addLoc(text17, file$n, 78, 8, 4596);
				setAttribute(image2, "image-rendering", "pixelated");
				setXlinkAttribute(image2, "xlink:href", "assets/images/dogcat-grid.jpg");
				setAttribute(image2, "width", ctx.inputWidth);
				setAttribute(image2, "height", ctx.inputWidth);
				setAttribute(image2, "clip-path", "url(#activationGridClipRect)");
				addLoc(image2, file$n, 80, 10, 4777);
				setAttribute(g4, "transform", g4_transform_value = "scale(" + ctx.columnWidth / ctx.cellWidth + ")translate(-" + ctx.windowX * ctx.cellWidth + ", -" + ctx.windowY * ctx.cellWidth + ")");
				addLoc(g4, file$n, 79, 8, 4661);
				setAttribute(rect4, "stroke", "#ff6600");
				setAttribute(rect4, "stroke-width", "4");
				setAttribute(rect4, "fill-opacity", "0");
				setAttribute(rect4, "width", ctx.columnWidth);
				setAttribute(rect4, "height", ctx.columnWidth);
				addLoc(rect4, file$n, 86, 8, 5006);
				setAttribute(tspan7, "x", "0");
				setAttribute(tspan7, "dy", "1.4em");
				addLoc(tspan7, file$n, 89, 10, 5192);
				setAttribute(tspan8, "x", "0");
				setAttribute(tspan8, "dy", "1.4em");
				addLoc(tspan8, file$n, 90, 10, 5252);
				setAttribute(tspan9, "x", "0");
				setAttribute(tspan9, "dy", "1.4em");
				addLoc(tspan9, file$n, 91, 10, 5314);
				setAttribute(text21, "class", "figcaption svelte-qwhwb1");
				setAttribute(text21, "transform", text21_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")");
				addLoc(text21, file$n, 88, 8, 5111);
				setAttribute(g5, "transform", g5_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + 2 * (ctx.columnWidth + ctx.columnMargin)) + ", 0)");
				addLoc(g5, file$n, 76, 6, 4350);
				setAttribute(path3, "class", "arrow svelte-qwhwb1");
				setAttribute(path3, "transform", path3_transform_value = "translate(0," + ctx.columnWidth / 2 + ")");
				setAttribute(path3, "d", path3_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5");
				addLoc(path3, file$n, 96, 8, 5521);
				setAttribute(text23, "class", "head svelte-qwhwb1");
				setAttribute(text23, "dy", "-13");
				addLoc(text23, file$n, 97, 8, 5666);
				setXlinkAttribute(image3, "xlink:href", "assets/images/dogcat-grid.jpg");
				setAttribute(image3, "width", ctx.inputWidth);
				setAttribute(image3, "height", ctx.inputWidth);
				addLoc(image3, file$n, 98, 8, 5725);
				setAttribute(rect5, "stroke", "#ff6600");
				setAttribute(rect5, "pointer-events", "none");
				setAttribute(rect5, "stroke-width", "2");
				setAttribute(rect5, "fill-opacity", "0");
				setAttribute(rect5, "x", rect5_x_value = ctx.windowX * ctx.cellWidth);
				setAttribute(rect5, "y", rect5_y_value = ctx.windowY * ctx.cellWidth);
				setAttribute(rect5, "width", ctx.cellWidth);
				setAttribute(rect5, "height", ctx.cellWidth);
				addLoc(rect5, file$n, 110, 8, 6298);
				setAttribute(g6, "transform", g6_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + 3 * (ctx.columnWidth + ctx.columnMargin)) + ", 0)");
				addLoc(g6, file$n, 95, 6, 5420);
				setAttribute(g7, "transform", "translate(0, 30)");
				addLoc(g7, file$n, 12, 4, 604);
				setStyle(svg, "width", "100%");
				setAttribute(svg, "viewBox", svg_viewBox_value = "0 0 " + ctx.width + " " + ctx.height);
				addLoc(svg, file$n, 3, 2, 173);
				addListener(div, "mouseout", mouseout_handler);
				setStyle(div, "position", "relative");
				setStyle(div, "background", "white");
				setStyle(div, "text-align", "right");
				addLoc(div, file$n, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				figure._mount(div, null);
				append(div, text0);
				append(div, svg);
				append(svg, clipPath0);
				append(clipPath0, rect0);
				append(svg, clipPath1);
				append(clipPath1, rect1);
				append(svg, g7);
				append(g7, g0);
				append(g0, text2);
				append(text2, text1);
				append(g0, image0);

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].m(g0, null);
				}

				append(g0, rect2);
				append(g7, g2);
				append(g2, path0);
				append(g2, text4);
				append(text4, text3);
				append(g2, g1);
				append(g1, image1);
				append(g2, rect3);
				append(g2, text8);
				append(text8, tspan0);
				append(tspan0, text5);
				append(text8, tspan1);
				append(tspan1, text6);
				append(text8, tspan2);
				append(tspan2, text7);
				append(g7, g3);
				append(g3, path1);
				append(g3, text10);
				append(text10, text9);

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].m(g3, null);
				}

				append(g3, text15);
				append(text15, tspan3);
				append(tspan3, text11);
				append(text15, tspan4);
				append(tspan4, text12);
				append(text15, tspan5);
				append(tspan5, text13);
				append(text15, tspan6);
				append(tspan6, text14);
				append(g7, g5);
				append(g5, path2);
				append(g5, text17);
				append(text17, text16);
				append(g5, g4);
				append(g4, image2);
				append(g5, rect4);
				append(g5, text21);
				append(text21, tspan7);
				append(tspan7, text18);
				append(text21, tspan8);
				append(tspan8, text19);
				append(text21, tspan9);
				append(tspan9, text20);
				append(g7, g6);
				append(g6, path3);
				append(g6, text23);
				append(text23, text22);
				append(g6, image3);

				for (var i = 0; i < each2_blocks.length; i += 1) {
					each2_blocks[i].m(g6, null);
				}

				append(g6, rect5);
				append(div, text24);
				notebooklink._mount(div, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var figure_changes = {};
				if (!figure_updating.onscreen && changed.onscreen) {
					figure_changes.onscreen = ctx.onscreen ;
					figure_updating.onscreen = ctx.onscreen  !== void 0;
				}
				figure._set(figure_changes);
				figure_updating = {};

				if ((changed.windowX || changed.cellWidth) && rect0_x_value !== (rect0_x_value = ctx.windowX * ctx.cellWidth)) {
					setAttribute(rect0, "x", rect0_x_value);
				}

				if ((changed.windowY || changed.cellWidth) && rect0_y_value !== (rect0_y_value = ctx.windowY * ctx.cellWidth)) {
					setAttribute(rect0, "y", rect0_y_value);
				}

				if (changed.cellWidth) {
					setAttribute(rect0, "width", ctx.cellWidth);
					setAttribute(rect0, "height", ctx.cellWidth);
				}

				if ((changed.windowX || changed.inputCellWidth) && rect1_x_value !== (rect1_x_value = ctx.windowX * ctx.inputCellWidth)) {
					setAttribute(rect1, "x", rect1_x_value);
				}

				if ((changed.windowY || changed.inputCellWidth) && rect1_y_value !== (rect1_y_value = ctx.windowY * ctx.inputCellWidth)) {
					setAttribute(rect1, "y", rect1_y_value);
				}

				if ((changed.inputCellWidth || changed.windowSize) && rect1_width_value !== (rect1_width_value = ctx.inputCellWidth * ctx.windowSize)) {
					setAttribute(rect1, "width", rect1_width_value);
				}

				if ((changed.inputCellWidth || changed.windowSize) && rect1_height_value !== (rect1_height_value = ctx.inputCellWidth * ctx.windowSize)) {
					setAttribute(rect1, "height", rect1_height_value);
				}

				if (changed.inputWidth) {
					setAttribute(image0, "width", ctx.inputWidth);
					setAttribute(image0, "height", ctx.inputWidth);
				}

				if (changed.numInputCells || changed.windowX || changed.windowSize || changed.windowY || changed.inputCellWidth || changed.cellPadding || changed.Math || changed.numCells) {
					each0_value = range(ctx.numInputCells);

					for (var i = 0; i < each0_value.length; i += 1) {
						const child_ctx = get_each0_context$2(ctx, each0_value, i);

						if (each0_blocks[i]) {
							each0_blocks[i].p(changed, child_ctx);
						} else {
							each0_blocks[i] = create_each_block_3(component, child_ctx);
							each0_blocks[i].c();
							each0_blocks[i].m(g0, rect2);
						}
					}

					for (; i < each0_blocks.length; i += 1) {
						each0_blocks[i].d(1);
					}
					each0_blocks.length = each0_value.length;
				}

				if ((changed.windowX || changed.inputCellWidth) && rect2_x_value !== (rect2_x_value = ctx.windowX * ctx.inputCellWidth)) {
					setAttribute(rect2, "x", rect2_x_value);
				}

				if ((changed.windowY || changed.inputCellWidth) && rect2_y_value !== (rect2_y_value = ctx.windowY * ctx.inputCellWidth)) {
					setAttribute(rect2, "y", rect2_y_value);
				}

				if ((changed.inputCellWidth || changed.windowSize) && rect2_width_value !== (rect2_width_value = ctx.inputCellWidth * ctx.windowSize)) {
					setAttribute(rect2, "width", rect2_width_value);
				}

				if ((changed.inputCellWidth || changed.windowSize) && rect2_height_value !== (rect2_height_value = ctx.inputCellWidth * ctx.windowSize)) {
					setAttribute(rect2, "height", rect2_height_value);
				}

				if ((changed.columnWidth) && path0_transform_value !== (path0_transform_value = "translate(0," + ctx.columnWidth / 2 + ")")) {
					setAttribute(path0, "transform", path0_transform_value);
				}

				if ((changed.columnMargin) && path0_d_value !== (path0_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5")) {
					setAttribute(path0, "d", path0_d_value);
				}

				if (changed.inputWidth) {
					setAttribute(image1, "width", ctx.inputWidth);
					setAttribute(image1, "height", ctx.inputWidth);
				}

				if ((changed.columnWidth || changed.inputCellWidth || changed.windowSize || changed.windowX || changed.windowY) && g1_transform_value !== (g1_transform_value = "scale(" + ctx.columnWidth / (ctx.inputCellWidth * ctx.windowSize) + ")translate(-" + ctx.windowX * ctx.inputCellWidth + ", -" + ctx.windowY * ctx.inputCellWidth + ")")) {
					setAttribute(g1, "transform", g1_transform_value);
				}

				if (changed.columnWidth) {
					setAttribute(rect3, "width", ctx.columnWidth);
					setAttribute(rect3, "height", ctx.columnWidth);
				}

				if ((changed.columnWidth) && text8_transform_value !== (text8_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")")) {
					setAttribute(text8, "transform", text8_transform_value);
				}

				if ((changed.inputWidth || changed.columnMargin) && g2_transform_value !== (g2_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin) + ", 0)")) {
					setAttribute(g2, "transform", g2_transform_value);
				}

				if ((changed.columnWidth) && path1_transform_value !== (path1_transform_value = "translate(0," + ctx.columnWidth / 2 + ")")) {
					setAttribute(path1, "transform", path1_transform_value);
				}

				if ((changed.columnMargin) && path1_d_value !== (path1_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5")) {
					setAttribute(path1, "d", path1_d_value);
				}

				if (changed.activations || changed.columnWidth || changed.inputWidth || changed.windowX || changed.windowY) {
					each1_value = ctx.activations[ctx.windowX][ctx.windowY];

					for (var i = 0; i < each1_value.length; i += 1) {
						const child_ctx = get_each1_context$2(ctx, each1_value, i);

						if (each1_blocks[i]) {
							each1_blocks[i].p(changed, child_ctx);
						} else {
							each1_blocks[i] = create_each_block_2$1(component, child_ctx);
							each1_blocks[i].c();
							each1_blocks[i].m(g3, text15);
						}
					}

					for (; i < each1_blocks.length; i += 1) {
						each1_blocks[i].d(1);
					}
					each1_blocks.length = each1_value.length;
				}

				if ((changed.columnWidth) && text15_transform_value !== (text15_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")")) {
					setAttribute(text15, "transform", text15_transform_value);
				}

				if ((changed.inputWidth || changed.columnMargin || changed.columnWidth) && g3_transform_value !== (g3_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + ctx.columnWidth + ctx.columnMargin) + ", 0)")) {
					setAttribute(g3, "transform", g3_transform_value);
				}

				if ((changed.columnWidth) && path2_transform_value !== (path2_transform_value = "translate(0," + ctx.columnWidth / 2 + ")")) {
					setAttribute(path2, "transform", path2_transform_value);
				}

				if ((changed.columnMargin) && path2_d_value !== (path2_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5")) {
					setAttribute(path2, "d", path2_d_value);
				}

				if (changed.inputWidth) {
					setAttribute(image2, "width", ctx.inputWidth);
					setAttribute(image2, "height", ctx.inputWidth);
				}

				if ((changed.columnWidth || changed.cellWidth || changed.windowX || changed.windowY) && g4_transform_value !== (g4_transform_value = "scale(" + ctx.columnWidth / ctx.cellWidth + ")translate(-" + ctx.windowX * ctx.cellWidth + ", -" + ctx.windowY * ctx.cellWidth + ")")) {
					setAttribute(g4, "transform", g4_transform_value);
				}

				if (changed.columnWidth) {
					setAttribute(rect4, "width", ctx.columnWidth);
					setAttribute(rect4, "height", ctx.columnWidth);
				}

				if ((changed.columnWidth) && text21_transform_value !== (text21_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")")) {
					setAttribute(text21, "transform", text21_transform_value);
				}

				if ((changed.inputWidth || changed.columnMargin || changed.columnWidth) && g5_transform_value !== (g5_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + 2 * (ctx.columnWidth + ctx.columnMargin)) + ", 0)")) {
					setAttribute(g5, "transform", g5_transform_value);
				}

				if ((changed.columnWidth) && path3_transform_value !== (path3_transform_value = "translate(0," + ctx.columnWidth / 2 + ")")) {
					setAttribute(path3, "transform", path3_transform_value);
				}

				if ((changed.columnMargin) && path3_d_value !== (path3_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5")) {
					setAttribute(path3, "d", path3_d_value);
				}

				if (changed.inputWidth) {
					setAttribute(image3, "width", ctx.inputWidth);
					setAttribute(image3, "height", ctx.inputWidth);
				}

				if (changed.numCells || changed.windowY || changed.windowX || changed.cellWidth || changed.cellPadding) {
					each2_value = range(ctx.numCells);

					for (var i = 0; i < each2_value.length; i += 1) {
						const child_ctx = get_each2_context(ctx, each2_value, i);

						if (each2_blocks[i]) {
							each2_blocks[i].p(changed, child_ctx);
						} else {
							each2_blocks[i] = create_each_block$6(component, child_ctx);
							each2_blocks[i].c();
							each2_blocks[i].m(g6, rect5);
						}
					}

					for (; i < each2_blocks.length; i += 1) {
						each2_blocks[i].d(1);
					}
					each2_blocks.length = each2_value.length;
				}

				if ((changed.windowX || changed.cellWidth) && rect5_x_value !== (rect5_x_value = ctx.windowX * ctx.cellWidth)) {
					setAttribute(rect5, "x", rect5_x_value);
				}

				if ((changed.windowY || changed.cellWidth) && rect5_y_value !== (rect5_y_value = ctx.windowY * ctx.cellWidth)) {
					setAttribute(rect5, "y", rect5_y_value);
				}

				if (changed.cellWidth) {
					setAttribute(rect5, "width", ctx.cellWidth);
					setAttribute(rect5, "height", ctx.cellWidth);
				}

				if ((changed.inputWidth || changed.columnMargin || changed.columnWidth) && g6_transform_value !== (g6_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + 3 * (ctx.columnWidth + ctx.columnMargin)) + ", 0)")) {
					setAttribute(g6, "transform", g6_transform_value);
				}

				if ((changed.width || changed.height) && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + ctx.width + " " + ctx.height)) {
					setAttribute(svg, "viewBox", svg_viewBox_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				figure.destroy();

				destroyEach(each0_blocks, detach);

				destroyEach(each1_blocks, detach);

				destroyEach(each2_blocks, detach);

				notebooklink.destroy();
				removeListener(div, "mouseout", mouseout_handler);
			}
		};
	}

	// (19:10) {#each range(numInputCells) as x}
	function create_each_block_4(component, ctx) {
		var rect, rect_fill_opacity_value, rect_x_value, rect_y_value;

		return {
			c: function create() {
				rect = createSvgElement("rect");
				rect._svelte = { component, ctx };

				addListener(rect, "mouseover", mouseover_handler);
				setAttribute(rect, "stroke", "white");
				setAttribute(rect, "fill", "#aaa");
				setAttribute(rect, "fill-opacity", rect_fill_opacity_value = ctx.x >= ctx.windowX && ctx.x < (ctx.windowX + ctx.windowSize) && ctx.y >= ctx.windowY && ctx.y < (ctx.windowY + ctx.windowSize) ? 0.01 : 0.5);
				setAttribute(rect, "stroke-opacity", "0.2");
				setAttribute(rect, "stroke-width", "1");
				setAttribute(rect, "x", rect_x_value = ctx.x * (ctx.inputCellWidth + ctx.cellPadding));
				setAttribute(rect, "y", rect_y_value = ctx.y * (ctx.inputCellWidth + ctx.cellPadding));
				setAttribute(rect, "width", ctx.inputCellWidth);
				setAttribute(rect, "height", ctx.inputCellWidth);
				addLoc(rect, file$n, 19, 12, 939);
			},

			m: function mount(target, anchor) {
				insert(target, rect, anchor);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				rect._svelte.ctx = ctx;
				if ((changed.numInputCells || changed.windowX || changed.windowSize || changed.windowY) && rect_fill_opacity_value !== (rect_fill_opacity_value = ctx.x >= ctx.windowX && ctx.x < (ctx.windowX + ctx.windowSize) && ctx.y >= ctx.windowY && ctx.y < (ctx.windowY + ctx.windowSize) ? 0.01 : 0.5)) {
					setAttribute(rect, "fill-opacity", rect_fill_opacity_value);
				}

				if ((changed.numInputCells || changed.inputCellWidth || changed.cellPadding) && rect_x_value !== (rect_x_value = ctx.x * (ctx.inputCellWidth + ctx.cellPadding))) {
					setAttribute(rect, "x", rect_x_value);
				}

				if ((changed.numInputCells || changed.inputCellWidth || changed.cellPadding) && rect_y_value !== (rect_y_value = ctx.y * (ctx.inputCellWidth + ctx.cellPadding))) {
					setAttribute(rect, "y", rect_y_value);
				}

				if (changed.inputCellWidth) {
					setAttribute(rect, "width", ctx.inputCellWidth);
					setAttribute(rect, "height", ctx.inputCellWidth);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(rect);
				}

				removeListener(rect, "mouseover", mouseover_handler);
			}
		};
	}

	// (18:8) {#each range(numInputCells) as y}
	function create_each_block_3(component, ctx) {
		var each_anchor;

		var each_value = range(ctx.numInputCells);

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block_4(component, get_each_context$5(ctx, each_value, i));
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
				if (changed.numInputCells || changed.windowX || changed.windowSize || changed.windowY || changed.inputCellWidth || changed.cellPadding || changed.Math || changed.numCells) {
					each_value = range(ctx.numInputCells);

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$5(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block_4(component, child_ctx);
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

	// (55:8) {#if i !== activations[windowX][windowY].length - 1}
	function create_if_block$6(component, ctx) {
		var g, text_1, text, line, line_x__value, g_transform_value;

		return {
			c: function create() {
				g = createSvgElement("g");
				text_1 = createSvgElement("text");
				text = createText("…");
				line = createSvgElement("line");
				setAttribute(text_1, "transform", "rotate(90)translate(-7, -25)");
				setAttribute(text_1, "font-size", "11");
				addLoc(text_1, file$n, 56, 10, 3361);
				setAttribute(line, "y1", "7");
				setAttribute(line, "y2", "7");
				setAttribute(line, "stroke", "#eee");
				setAttribute(line, "x2", line_x__value = ctx.inputWidth * 2 / 3 - 20);
				addLoc(line, file$n, 57, 10, 3440);
				setAttribute(g, "transform", g_transform_value = "translate(0," + (20 + 20 * (ctx.activations[0][0].length - 1)) + ")");
				addLoc(g, file$n, 55, 8, 3279);
			},

			m: function mount(target, anchor) {
				insert(target, g, anchor);
				append(g, text_1);
				append(text_1, text);
				append(g, line);
			},

			p: function update(changed, ctx) {
				if ((changed.inputWidth) && line_x__value !== (line_x__value = ctx.inputWidth * 2 / 3 - 20)) {
					setAttribute(line, "x2", line_x__value);
				}

				if ((changed.activations) && g_transform_value !== (g_transform_value = "translate(0," + (20 + 20 * (ctx.activations[0][0].length - 1)) + ")")) {
					setAttribute(g, "transform", g_transform_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(g);
				}
			}
		};
	}

	// (54:6) {#each activations[windowX][windowY] as activation, i}
	function create_each_block_2$1(component, ctx) {
		var g, text3, text0, text1_value = ctx.i === ctx.activations[0][0].length - 1 ? 512 : ctx.i, text1, text2, text5, text4_value = format_1(ctx.activation), text4, text5_dx_value, line, g_transform_value;

		var if_block = (ctx.i !== ctx.activations[ctx.windowX][ctx.windowY].length - 1) && create_if_block$6(component, ctx);

		return {
			c: function create() {
				if (if_block) if_block.c();
				g = createSvgElement("g");
				text3 = createSvgElement("text");
				text0 = createText("neuron ");
				text1 = createText(text1_value);
				text2 = createText(":");
				text5 = createSvgElement("text");
				text4 = createText(text4_value);
				line = createSvgElement("line");
				setAttribute(text3, "font-size", "11");
				setAttribute(text3, "fill", "#999");
				setAttribute(text3, "dy", "");
				addLoc(text3, file$n, 61, 10, 3648);
				setAttribute(text5, "text-anchor", "end");
				setAttribute(text5, "font-size", "11");
				setAttribute(text5, "font-family", "monospace");
				setAttribute(text5, "dx", text5_dx_value = ctx.inputWidth * 2 / 3 - 20);
				addLoc(text5, file$n, 62, 10, 3755);
				setAttribute(line, "y1", "7");
				setAttribute(line, "y2", "7");
				setAttribute(line, "stroke", "#eee");
				setAttribute(line, "x2", ctx.columnWidth);
				addLoc(line, file$n, 63, 10, 3883);
				setAttribute(g, "transform", g_transform_value = "translate(0," + (ctx.i === ctx.activations[0][0].length - 1 ? 20 + 20 * (ctx.i + 1) : 20 + 20 * ctx.i) + ")");
				addLoc(g, file$n, 60, 8, 3537);
			},

			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, g, anchor);
				append(g, text3);
				append(text3, text0);
				append(text3, text1);
				append(text3, text2);
				append(g, text5);
				append(text5, text4);
				append(g, line);
			},

			p: function update(changed, ctx) {
				if (ctx.i !== ctx.activations[ctx.windowX][ctx.windowY].length - 1) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$6(component, ctx);
						if_block.c();
						if_block.m(g.parentNode, g);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.activations) && text1_value !== (text1_value = ctx.i === ctx.activations[0][0].length - 1 ? 512 : ctx.i)) {
					setData(text1, text1_value);
				}

				if ((changed.activations || changed.windowX || changed.windowY) && text4_value !== (text4_value = format_1(ctx.activation))) {
					setData(text4, text4_value);
				}

				if ((changed.inputWidth) && text5_dx_value !== (text5_dx_value = ctx.inputWidth * 2 / 3 - 20)) {
					setAttribute(text5, "dx", text5_dx_value);
				}

				if (changed.columnWidth) {
					setAttribute(line, "x2", ctx.columnWidth);
				}

				if ((changed.activations) && g_transform_value !== (g_transform_value = "translate(0," + (ctx.i === ctx.activations[0][0].length - 1 ? 20 + 20 * (ctx.i + 1) : 20 + 20 * ctx.i) + ")")) {
					setAttribute(g, "transform", g_transform_value);
				}
			},

			d: function destroy$$1(detach) {
				if (if_block) if_block.d(detach);
				if (detach) {
					detachNode(g);
				}
			}
		};
	}

	// (101:10) {#each range(numCells) as x}
	function create_each_block_1$3(component, ctx) {
		var rect, rect_fill_opacity_value, rect_x_value, rect_y_value;

		return {
			c: function create() {
				rect = createSvgElement("rect");
				rect._svelte = { component, ctx };

				addListener(rect, "mouseover", mouseover_handler_1);
				setAttribute(rect, "stroke", "#ddd");
				setAttribute(rect, "fill", "#aaa");
				setAttribute(rect, "fill-opacity", rect_fill_opacity_value = ctx.y === ctx.windowY && ctx.x === ctx.windowX ? 0.01 : 0.5);
				setAttribute(rect, "stroke-width", "1");
				setAttribute(rect, "x", rect_x_value = ctx.x * (ctx.cellWidth + ctx.cellPadding));
				setAttribute(rect, "y", rect_y_value = ctx.y * (ctx.cellWidth + ctx.cellPadding));
				setAttribute(rect, "width", ctx.cellWidth);
				setAttribute(rect, "height", ctx.cellWidth);
				addLoc(rect, file$n, 101, 12, 5904);
			},

			m: function mount(target, anchor) {
				insert(target, rect, anchor);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				rect._svelte.ctx = ctx;
				if ((changed.numCells || changed.windowY || changed.windowX) && rect_fill_opacity_value !== (rect_fill_opacity_value = ctx.y === ctx.windowY && ctx.x === ctx.windowX ? 0.01 : 0.5)) {
					setAttribute(rect, "fill-opacity", rect_fill_opacity_value);
				}

				if ((changed.numCells || changed.cellWidth || changed.cellPadding) && rect_x_value !== (rect_x_value = ctx.x * (ctx.cellWidth + ctx.cellPadding))) {
					setAttribute(rect, "x", rect_x_value);
				}

				if ((changed.numCells || changed.cellWidth || changed.cellPadding) && rect_y_value !== (rect_y_value = ctx.y * (ctx.cellWidth + ctx.cellPadding))) {
					setAttribute(rect, "y", rect_y_value);
				}

				if (changed.cellWidth) {
					setAttribute(rect, "width", ctx.cellWidth);
					setAttribute(rect, "height", ctx.cellWidth);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(rect);
				}

				removeListener(rect, "mouseover", mouseover_handler_1);
			}
		};
	}

	// (100:8) {#each range(numCells) as y}
	function create_each_block$6(component, ctx) {
		var each_anchor;

		var each_value_1 = range(ctx.numCells);

		var each_blocks = [];

		for (var i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1$3(component, get_each_context_1$1(ctx, each_value_1, i));
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
				if (changed.numCells || changed.windowY || changed.windowX || changed.cellWidth || changed.cellPadding) {
					each_value_1 = range(ctx.numCells);

					for (var i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block_1$3(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(each_anchor.parentNode, each_anchor);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value_1.length;
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

	function ActivationGrid(options) {
		this._debugName = '<ActivationGrid>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(assign({ Math : Math }, data$g()), options.data);

		this._recompute({ inputWidth: 1, columnWidth: 1, columnMargin: 1, timerCount: 1, numCells: 1, clippedCount: 1, cellPadding: 1, windowSize: 1, numInputCells: 1 }, this._state);
		if (!('inputWidth' in this._state)) console.warn("<ActivationGrid> was created without expected data property 'inputWidth'");
		if (!('columnWidth' in this._state)) console.warn("<ActivationGrid> was created without expected data property 'columnWidth'");
		if (!('columnMargin' in this._state)) console.warn("<ActivationGrid> was created without expected data property 'columnMargin'");
		if (!('timerCount' in this._state)) console.warn("<ActivationGrid> was created without expected data property 'timerCount'");
		if (!('numCells' in this._state)) console.warn("<ActivationGrid> was created without expected data property 'numCells'");

		if (!('cellPadding' in this._state)) console.warn("<ActivationGrid> was created without expected data property 'cellPadding'");
		if (!('windowSize' in this._state)) console.warn("<ActivationGrid> was created without expected data property 'windowSize'");

		if (!('onscreen' in this._state)) console.warn("<ActivationGrid> was created without expected data property 'onscreen'");
		this._intro = true;

		this._fragment = create_main_fragment$n(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ActivationGrid.prototype, protoDev);

	ActivationGrid.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('width' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'width'");
		if ('height' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'height'");
		if ('clippedCount' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'clippedCount'");
		if ('windowX' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'windowX'");
		if ('windowY' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'windowY'");
		if ('cellWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'cellWidth'");
		if ('numInputCells' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'numInputCells'");
		if ('inputCellWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'inputCellWidth'");
		if ('activations' in newState && !this._updatingReadonlyProperty) throw new Error("<ActivationGrid>: Cannot set read-only property 'activations'");
	};

	ActivationGrid.prototype._recompute = function _recompute(changed, state) {
		if (changed.inputWidth || changed.columnWidth || changed.columnMargin) {
			if (this._differs(state.width, (state.width = width$1(state)))) changed.width = true;
		}

		if (changed.inputWidth) {
			if (this._differs(state.height, (state.height = height$2(state)))) changed.height = true;
		}

		if (changed.timerCount || changed.numCells) {
			if (this._differs(state.clippedCount, (state.clippedCount = clippedCount(state)))) changed.clippedCount = true;
		}

		if (changed.clippedCount || changed.numCells) {
			if (this._differs(state.windowX, (state.windowX = windowX(state)))) changed.windowX = true;
			if (this._differs(state.windowY, (state.windowY = windowY(state)))) changed.windowY = true;
		}

		if (changed.inputWidth || changed.numCells || changed.cellPadding) {
			if (this._differs(state.cellWidth, (state.cellWidth = cellWidth$1(state)))) changed.cellWidth = true;
		}

		if (changed.numCells || changed.windowSize) {
			if (this._differs(state.numInputCells, (state.numInputCells = numInputCells(state)))) changed.numInputCells = true;
		}

		if (changed.inputWidth || changed.numInputCells || changed.cellPadding) {
			if (this._differs(state.inputCellWidth, (state.inputCellWidth = inputCellWidth(state)))) changed.inputCellWidth = true;
		}

		if (changed.numCells) {
			if (this._differs(state.activations, (state.activations = activations(state)))) changed.activations = true;
		}
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

	function data$h() {
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
	var methods$4 = {
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

	function oncreate$5() {
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
	function create_main_fragment$o(component, state) {
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
		this._state = assign$1(data$h(), options.data);
		this._recompute({ width: 1, height: 1 }, this._state);

		var _oncreate = oncreate$5.bind(this);

		if (!options.root) {
			this._oncreate = [];
		}

		this._fragment = create_main_fragment$o(this, this._state);

		this.root._oncreate.push(_oncreate);

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);

			callAll$1(this._oncreate);
		}
	}

	assign$1(Sprite.prototype, methods$4, proto$1);

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

	/* src/diagrams/Process.html generated by Svelte v2.15.3 */



	function columnWidth({width, columnPadding}) {
		return (width + columnPadding) / 3 - columnPadding;
	}

	function inputWidth({columnWidth, inputPadding}) {
		return (columnWidth + inputPadding) / 3 - inputPadding;
	}

	function cellWidth$2({inputWidth, numCells, cellPadding}) {
		return (inputWidth + cellPadding) / numCells - cellPadding;
	}

	function iconWidth({columnWidth, numIcons}) {
		return columnWidth / numIcons;
	}

	function data$i() {
	  return {
	    width: 1000,
	    height: 380,
	    columnPadding: 50,
	    inputPadding: 20,
	    numCells: 6,
	    cellPadding: 0,
	    numIcons: 10,
	    iconHighlight: {x: 2, y: 0},
	    layoutData: [],
	    webData: [],
	    webURL: "https://storage.googleapis.com/activation-atlas/build/process/web/web--grid_size=10--layout=50_0.05_cosine--class_filter=None--filter=30000--layer=mixed4c--model=InceptionV1--sample_images=1000000--sample_type=random.json",
	    dataURL: "https://storage.googleapis.com/activation-atlas/build/process/layout_data/layout_data--layout=50_0.05_cosine--class_filter=None--filter=30000--layer=mixed4c--model=InceptionV1--sample_images=1000000--sample_type=random.json",
	    renderURL: "https://storage.googleapis.com/activation-atlas/build/process/render/render--x=0--y=0--tries=4--alpha=False--tile_size=10--whiten=true--steps=2048--icon_size=80--grid_size=10--layout=50_0.05_cosine--class_filter=None--filter=30000--layer=mixed4c--model=InceptionV1--sample_images=1000000--sample_type=random.jpg",
	    inputs: [
	      { id: "dogcat", x:2, y:1, px:.25, py:.033 },
	      { id: "dog", x:3, y:3, px:.28, py:.066 },
	      { id: "ocean", x:2, y:3, px:.25, py:.85 },
	    ]
	  }
	}
	function pointerPath(sx, sy, ex, ey) {
	  return `M${sx},${sy} L${sx + 10},${sy} L${sx + 40},${ey} L${ex},${ey} m-5,-5 l5,5 l-5,5`;
	}

	function oncreate$6() {
	  console.log("loading");
	  const {dataURL, webURL} = this.get();
	  load$1([dataURL, webURL]).then(responses => {
	    this.set({
	      layoutData: responses[0].slice(0, 10000),
	      webData: responses[1]
	    });
	  });
	}
	const file$o = "src/diagrams/Process.html";

	function get_each_context_2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.x = list[i];
		return child_ctx;
	}

	function get_each3_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.y = list[i];
		return child_ctx;
	}

	function get_each2_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.icon = list[i];
		return child_ctx;
	}

	function get_each_context_1$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.x = list[i];
		return child_ctx;
	}

	function get_each_context$6(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.y = list[i];
		return child_ctx;
	}

	function get_each1_context$3(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.input = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function get_each0_context$3(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.point = list[i];
		return child_ctx;
	}

	function create_main_fragment$p(component, ctx) {
		var svg, g2, g0, g0_transform_value, g1, image, image_opacity_value, each2_anchor, g1_transform_value, rect0, rect0_x_value, rect0_y_value, path, path_d_value, rect1, rect1_x_value, rect1_y_value, svg_viewBox_value, text0, div4, div0, text2, div1, text4, div3, text5, div2;

		var each0_value = ctx.layoutData;

		var each0_blocks = [];

		for (var i = 0; i < each0_value.length; i += 1) {
			each0_blocks[i] = create_each_block_6(component, get_each0_context$3(ctx, each0_value, i));
		}

		var each1_value = ctx.inputs;

		var each1_blocks = [];

		for (var i = 0; i < each1_value.length; i += 1) {
			each1_blocks[i] = create_each_block_3$1(component, get_each1_context$3(ctx, each1_value, i));
		}

		var each2_value = ctx.webData;

		var each2_blocks = [];

		for (var i = 0; i < each2_value.length; i += 1) {
			each2_blocks[i] = create_each_block_2$2(component, get_each2_context$1(ctx, each2_value, i));
		}

		var each3_value = range(ctx.numIcons);

		var each3_blocks = [];

		for (var i = 0; i < each3_value.length; i += 1) {
			each3_blocks[i] = create_each_block$7(component, get_each3_context(ctx, each3_value, i));
		}

		var notebooklink_initial_data = { url: "" };
		var notebooklink = new NotebookLink({
			root: component.root,
			store: component.store,
			data: notebooklink_initial_data
		});

		return {
			c: function create() {
				svg = createSvgElement("svg");
				g2 = createSvgElement("g");
				g0 = createSvgElement("g");

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].c();
				}

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].c();
				}

				g1 = createSvgElement("g");
				image = createSvgElement("image");

				for (var i = 0; i < each2_blocks.length; i += 1) {
					each2_blocks[i].c();
				}

				each2_anchor = createComment();

				for (var i = 0; i < each3_blocks.length; i += 1) {
					each3_blocks[i].c();
				}

				rect0 = createSvgElement("rect");
				path = createSvgElement("path");
				rect1 = createSvgElement("rect");
				text0 = createText("\n");
				div4 = createElement("div");
				div0 = createElement("div");
				div0.textContent = "A randomized set of one million images is fed through the network, collecting one random spatial activation per image.";
				text2 = createText("\n  ");
				div1 = createElement("div");
				div1.textContent = "The activations are fed through UMAP to reduce them to two dimensions. They are then plotted, with similar activations placed near each other.";
				text4 = createText("\n  ");
				div3 = createElement("div");
				text5 = createText("We then draw a grid and average the activations that fall within a cell and run feature inversion on the averaged activation.\n    ");
				div2 = createElement("div");
				notebooklink._fragment.c();
				setAttribute(g0, "transform", g0_transform_value = "translate(" + (ctx.columnWidth + ctx.columnPadding) * 1 + ", 0)");
				addLoc(g0, file$o, 4, 4, 120);
				setAttribute(image, "opacity", image_opacity_value = ctx.webData.length > 0 ? 1 : 0);
				setXlinkAttribute(image, "xlink:href", ctx.renderURL);
				setAttribute(image, "width", ctx.columnWidth);
				setAttribute(image, "height", ctx.columnWidth);
				addLoc(image, file$o, 61, 6, 2890);
				setAttribute(g1, "transform", g1_transform_value = "translate(" + (ctx.columnWidth + ctx.columnPadding) * 2 + ", 0)");
				addLoc(g1, file$o, 60, 4, 2818);
				setAttribute(rect0, "fill", "none");
				setAttribute(rect0, "stroke", "black");
				setAttribute(rect0, "stroke-width", "2");
				setAttribute(rect0, "x", rect0_x_value = (ctx.columnWidth + ctx.columnPadding) * 1 + ctx.iconHighlight.x * ctx.iconWidth);
				setAttribute(rect0, "y", rect0_y_value = ctx.iconHighlight.y * ctx.iconWidth);
				setAttribute(rect0, "width", ctx.iconWidth);
				setAttribute(rect0, "height", ctx.iconWidth);
				addLoc(rect0, file$o, 73, 4, 3501);
				setAttribute(path, "fill", "none");
				setAttribute(path, "stroke", "black");
				setAttribute(path, "d", path_d_value = "M" + ((ctx.columnWidth + ctx.columnPadding) * 1 + ctx.iconHighlight.x * ctx.iconWidth + ctx.iconWidth / 2) + "," + ctx.iconHighlight.y * ctx.iconWidth + "l0,-30 l" + (ctx.columnWidth + ctx.columnPadding) + ",0 l0,25 m-5,-5 l5,5 l5,-5");
				addLoc(path, file$o, 74, 4, 3692);
				setAttribute(rect1, "fill", "none");
				setAttribute(rect1, "stroke", "black");
				setAttribute(rect1, "stroke-width", "2");
				setAttribute(rect1, "x", rect1_x_value = (ctx.columnWidth + ctx.columnPadding) * 2 + ctx.iconHighlight.x * ctx.iconWidth);
				setAttribute(rect1, "y", rect1_y_value = ctx.iconHighlight.y * ctx.iconWidth);
				setAttribute(rect1, "width", ctx.iconWidth);
				setAttribute(rect1, "height", ctx.iconWidth);
				addLoc(rect1, file$o, 75, 4, 3912);
				setAttribute(g2, "transform", "translate(0, 40)");
				addLoc(g2, file$o, 1, 2, 60);
				setStyle(svg, "width", "100%");
				setAttribute(svg, "viewBox", svg_viewBox_value = "0 0 " + ctx.width + " " + ctx.height);
				addLoc(svg, file$o, 0, 0, 0);
				div0.className = "figcaption";
				addLoc(div0, file$o, 82, 2, 4232);
				div1.className = "figcaption";
				addLoc(div1, file$o, 83, 2, 4383);
				setStyle(div2, "margin-top", "8px");
				setStyle(div2, "text-align", "right");
				addLoc(div2, file$o, 85, 4, 4712);
				div3.className = "figcaption";
				addLoc(div3, file$o, 84, 2, 4558);
				setStyle(div4, "display", "grid");
				setStyle(div4, "grid-column-gap", "" + ctx.columnPadding / ctx.width * 100 + "%");
				setStyle(div4, "grid-template-columns", "1fr 1fr 1fr");
				addLoc(div4, file$o, 81, 0, 4116);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				append(svg, g2);
				append(g2, g0);

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].m(g0, null);
				}

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].m(g2, null);
				}

				append(g2, g1);
				append(g1, image);

				for (var i = 0; i < each2_blocks.length; i += 1) {
					each2_blocks[i].m(g1, null);
				}

				append(g1, each2_anchor);

				for (var i = 0; i < each3_blocks.length; i += 1) {
					each3_blocks[i].m(g1, null);
				}

				append(g2, rect0);
				append(g2, path);
				append(g2, rect1);
				insert(target, text0, anchor);
				insert(target, div4, anchor);
				append(div4, div0);
				append(div4, text2);
				append(div4, div1);
				append(div4, text4);
				append(div4, div3);
				append(div3, text5);
				append(div3, div2);
				notebooklink._mount(div2, null);
			},

			p: function update(changed, ctx) {
				if (changed.layoutData || changed.columnWidth) {
					each0_value = ctx.layoutData;

					for (var i = 0; i < each0_value.length; i += 1) {
						const child_ctx = get_each0_context$3(ctx, each0_value, i);

						if (each0_blocks[i]) {
							each0_blocks[i].p(changed, child_ctx);
						} else {
							each0_blocks[i] = create_each_block_6(component, child_ctx);
							each0_blocks[i].c();
							each0_blocks[i].m(g0, null);
						}
					}

					for (; i < each0_blocks.length; i += 1) {
						each0_blocks[i].d(1);
					}
					each0_blocks.length = each0_value.length;
				}

				if ((changed.columnWidth || changed.columnPadding) && g0_transform_value !== (g0_transform_value = "translate(" + (ctx.columnWidth + ctx.columnPadding) * 1 + ", 0)")) {
					setAttribute(g0, "transform", g0_transform_value);
				}

				if (changed.columnWidth || changed.inputs || changed.cellWidth || changed.cellPadding || changed.inputWidth || changed.columnPadding || changed.inputPadding || changed.x || changed.y || changed.Math || changed.numCells) {
					each1_value = ctx.inputs;

					for (var i = 0; i < each1_value.length; i += 1) {
						const child_ctx = get_each1_context$3(ctx, each1_value, i);

						if (each1_blocks[i]) {
							each1_blocks[i].p(changed, child_ctx);
						} else {
							each1_blocks[i] = create_each_block_3$1(component, child_ctx);
							each1_blocks[i].c();
							each1_blocks[i].m(g2, g1);
						}
					}

					for (; i < each1_blocks.length; i += 1) {
						each1_blocks[i].d(1);
					}
					each1_blocks.length = each1_value.length;
				}

				if ((changed.webData) && image_opacity_value !== (image_opacity_value = ctx.webData.length > 0 ? 1 : 0)) {
					setAttribute(image, "opacity", image_opacity_value);
				}

				if (changed.renderURL) {
					setXlinkAttribute(image, "xlink:href", ctx.renderURL);
				}

				if (changed.columnWidth) {
					setAttribute(image, "width", ctx.columnWidth);
					setAttribute(image, "height", ctx.columnWidth);
				}

				if (changed.webData || changed.iconWidth) {
					each2_value = ctx.webData;

					for (var i = 0; i < each2_value.length; i += 1) {
						const child_ctx = get_each2_context$1(ctx, each2_value, i);

						if (each2_blocks[i]) {
							each2_blocks[i].p(changed, child_ctx);
						} else {
							each2_blocks[i] = create_each_block_2$2(component, child_ctx);
							each2_blocks[i].c();
							each2_blocks[i].m(g1, each2_anchor);
						}
					}

					for (; i < each2_blocks.length; i += 1) {
						each2_blocks[i].d(1);
					}
					each2_blocks.length = each2_value.length;
				}

				if (changed.numIcons || changed.iconWidth) {
					each3_value = range(ctx.numIcons);

					for (var i = 0; i < each3_value.length; i += 1) {
						const child_ctx = get_each3_context(ctx, each3_value, i);

						if (each3_blocks[i]) {
							each3_blocks[i].p(changed, child_ctx);
						} else {
							each3_blocks[i] = create_each_block$7(component, child_ctx);
							each3_blocks[i].c();
							each3_blocks[i].m(g1, null);
						}
					}

					for (; i < each3_blocks.length; i += 1) {
						each3_blocks[i].d(1);
					}
					each3_blocks.length = each3_value.length;
				}

				if ((changed.columnWidth || changed.columnPadding) && g1_transform_value !== (g1_transform_value = "translate(" + (ctx.columnWidth + ctx.columnPadding) * 2 + ", 0)")) {
					setAttribute(g1, "transform", g1_transform_value);
				}

				if ((changed.columnWidth || changed.columnPadding || changed.iconHighlight || changed.iconWidth) && rect0_x_value !== (rect0_x_value = (ctx.columnWidth + ctx.columnPadding) * 1 + ctx.iconHighlight.x * ctx.iconWidth)) {
					setAttribute(rect0, "x", rect0_x_value);
				}

				if ((changed.iconHighlight || changed.iconWidth) && rect0_y_value !== (rect0_y_value = ctx.iconHighlight.y * ctx.iconWidth)) {
					setAttribute(rect0, "y", rect0_y_value);
				}

				if (changed.iconWidth) {
					setAttribute(rect0, "width", ctx.iconWidth);
					setAttribute(rect0, "height", ctx.iconWidth);
				}

				if ((changed.columnWidth || changed.columnPadding || changed.iconHighlight || changed.iconWidth) && path_d_value !== (path_d_value = "M" + ((ctx.columnWidth + ctx.columnPadding) * 1 + ctx.iconHighlight.x * ctx.iconWidth + ctx.iconWidth / 2) + "," + ctx.iconHighlight.y * ctx.iconWidth + "l0,-30 l" + (ctx.columnWidth + ctx.columnPadding) + ",0 l0,25 m-5,-5 l5,5 l5,-5")) {
					setAttribute(path, "d", path_d_value);
				}

				if ((changed.columnWidth || changed.columnPadding || changed.iconHighlight || changed.iconWidth) && rect1_x_value !== (rect1_x_value = (ctx.columnWidth + ctx.columnPadding) * 2 + ctx.iconHighlight.x * ctx.iconWidth)) {
					setAttribute(rect1, "x", rect1_x_value);
				}

				if ((changed.iconHighlight || changed.iconWidth) && rect1_y_value !== (rect1_y_value = ctx.iconHighlight.y * ctx.iconWidth)) {
					setAttribute(rect1, "y", rect1_y_value);
				}

				if (changed.iconWidth) {
					setAttribute(rect1, "width", ctx.iconWidth);
					setAttribute(rect1, "height", ctx.iconWidth);
				}

				if ((changed.width || changed.height) && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + ctx.width + " " + ctx.height)) {
					setAttribute(svg, "viewBox", svg_viewBox_value);
				}

				if (changed.columnPadding || changed.width) {
					setStyle(div4, "grid-column-gap", "" + ctx.columnPadding / ctx.width * 100 + "%");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(svg);
				}

				destroyEach(each0_blocks, detach);

				destroyEach(each1_blocks, detach);

				destroyEach(each2_blocks, detach);

				destroyEach(each3_blocks, detach);

				if (detach) {
					detachNode(text0);
					detachNode(div4);
				}

				notebooklink.destroy();
			}
		};
	}

	// (6:6) {#each layoutData as point}
	function create_each_block_6(component, ctx) {
		var g, rect, g_transform_value;

		return {
			c: function create() {
				g = createSvgElement("g");
				rect = createSvgElement("rect");
				setAttribute(rect, "fill", "#999");
				setAttribute(rect, "fill-opacity", "0.5");
				setAttribute(rect, "width", "2");
				setAttribute(rect, "height", "2");
				addLoc(rect, file$o, 7, 10, 316);
				setAttribute(g, "transform", g_transform_value = "translate(" + ctx.point[1] * ctx.columnWidth + ", " + ctx.point[0] * ctx.columnWidth + ")");
				addLoc(g, file$o, 6, 8, 228);
			},

			m: function mount(target, anchor) {
				insert(target, g, anchor);
				append(g, rect);
			},

			p: function update(changed, ctx) {
				if ((changed.layoutData || changed.columnWidth) && g_transform_value !== (g_transform_value = "translate(" + ctx.point[1] * ctx.columnWidth + ", " + ctx.point[0] * ctx.columnWidth + ")")) {
					setAttribute(g, "transform", g_transform_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(g);
				}
			}
		};
	}

	// (25:12) {#each range(numCells) as x}
	function create_each_block_5(component, ctx) {
		var rect, rect_x_value, rect_y_value;

		return {
			c: function create() {
				rect = createSvgElement("rect");
				setAttribute(rect, "stroke", "white");
				setAttribute(rect, "fill", "#aaa");
				setAttribute(rect, "fill-opacity", "0.6");
				setAttribute(rect, "stroke-width", "2");
				setAttribute(rect, "x", rect_x_value = ctx.x * (ctx.cellWidth + ctx.cellPadding));
				setAttribute(rect, "y", rect_y_value = ctx.y * (ctx.cellWidth + ctx.cellPadding));
				setAttribute(rect, "width", ctx.cellWidth);
				setAttribute(rect, "height", ctx.cellWidth);
				addLoc(rect, file$o, 25, 14, 1104);
			},

			m: function mount(target, anchor) {
				insert(target, rect, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.numCells || changed.cellWidth || changed.cellPadding) && rect_x_value !== (rect_x_value = ctx.x * (ctx.cellWidth + ctx.cellPadding))) {
					setAttribute(rect, "x", rect_x_value);
				}

				if ((changed.numCells || changed.cellWidth || changed.cellPadding) && rect_y_value !== (rect_y_value = ctx.y * (ctx.cellWidth + ctx.cellPadding))) {
					setAttribute(rect, "y", rect_y_value);
				}

				if (changed.cellWidth) {
					setAttribute(rect, "width", ctx.cellWidth);
					setAttribute(rect, "height", ctx.cellWidth);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(rect);
				}
			}
		};
	}

	// (24:10) {#each range(numCells) as y}
	function create_each_block_4$1(component, ctx) {
		var each_anchor;

		var each_value_1 = range(ctx.numCells);

		var each_blocks = [];

		for (var i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_5(component, get_each_context_1$2(ctx, each_value_1, i));
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
				if (changed.numCells || changed.cellWidth || changed.cellPadding) {
					each_value_1 = range(ctx.numCells);

					for (var i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block_5(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(each_anchor.parentNode, each_anchor);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value_1.length;
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

	// (46:8) {#if i !== inputs.length - 1}
	function create_if_block$7(component, ctx) {
		var line, line_y__value, line_y__value_1, line_x__value;

		return {
			c: function create() {
				line = createSvgElement("line");
				setAttribute(line, "stroke-dasharray", "2 2");
				setAttribute(line, "y1", line_y__value = ctx.inputWidth + 10);
				setAttribute(line, "y2", line_y__value_1 = ctx.inputWidth + 10);
				setAttribute(line, "x2", line_x__value = (ctx.inputWidth + ctx.inputPadding) * 3 - ctx.inputPadding);
				setAttribute(line, "stroke", "#ddd");
				addLoc(line, file$o, 46, 10, 2354);
			},

			m: function mount(target, anchor) {
				insert(target, line, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.inputWidth) && line_y__value !== (line_y__value = ctx.inputWidth + 10)) {
					setAttribute(line, "y1", line_y__value);
				}

				if ((changed.inputWidth) && line_y__value_1 !== (line_y__value_1 = ctx.inputWidth + 10)) {
					setAttribute(line, "y2", line_y__value_1);
				}

				if ((changed.inputWidth || changed.inputPadding) && line_x__value !== (line_x__value = (ctx.inputWidth + ctx.inputPadding) * 3 - ctx.inputPadding)) {
					setAttribute(line, "x2", line_x__value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(line);
				}
			}
		};
	}

	// (16:4) {#each inputs as input, i}
	function create_each_block_3$1(component, ctx) {
		var g2, image0, image0_xlink_href_value, g0, image1, image1_xlink_href_value, g0_transform_value, rect, rect_x_value, rect_y_value, path0, path0_d_value, g1, text5, text0, text1_value = (ctx.Math.random() + "").slice(0, 5), text1, text2, text3_value = (ctx.Math.random() + "").slice(0, 5), text3, text4, text5_dy_value, text5_transform_value, g1_transform_value, g2_transform_value, path1, path1_d_value;

		var each_value = range(ctx.numCells);

		var each_blocks = [];

		for (var i_1 = 0; i_1 < each_value.length; i_1 += 1) {
			each_blocks[i_1] = create_each_block_4$1(component, get_each_context$6(ctx, each_value, i_1));
		}

		var if_block = (ctx.i !== ctx.inputs.length - 1) && create_if_block$7(component, ctx);

		return {
			c: function create() {
				g2 = createSvgElement("g");
				image0 = createSvgElement("image");
				g0 = createSvgElement("g");
				image1 = createSvgElement("image");

				for (var i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
					each_blocks[i_1].c();
				}

				rect = createSvgElement("rect");
				path0 = createSvgElement("path");
				g1 = createSvgElement("g");
				text5 = createSvgElement("text");
				text0 = createText("[");
				text1 = createText(text1_value);
				text2 = createText(", ");
				text3 = createText(text3_value);
				text4 = createText(", …]\n          ");
				if (if_block) if_block.c();
				path1 = createSvgElement("path");
				setXlinkAttribute(image0, "xlink:href", image0_xlink_href_value = "assets/images/" + ctx.input.id + ".jpg");
				setAttribute(image0, "width", ctx.inputWidth);
				setAttribute(image0, "height", ctx.inputWidth);
				addLoc(image0, file$o, 19, 8, 732);
				setXlinkAttribute(image1, "xlink:href", image1_xlink_href_value = "assets/images/" + ctx.input.id + ".jpg");
				setAttribute(image1, "width", ctx.inputWidth);
				setAttribute(image1, "height", ctx.inputWidth);
				addLoc(image1, file$o, 22, 10, 920);
				setAttribute(g0, "transform", g0_transform_value = "translate(" + (ctx.inputWidth + ctx.inputPadding) + ", 0)");
				addLoc(g0, file$o, 21, 8, 852);
				setAttribute(rect, "fill", "none");
				setAttribute(rect, "stroke", "black");
				setAttribute(rect, "stroke-width", "2");
				setAttribute(rect, "x", rect_x_value = (ctx.inputWidth + ctx.inputPadding) * 1 + ctx.input.x * (ctx.cellWidth + ctx.cellPadding));
				setAttribute(rect, "y", rect_y_value = ctx.input.y * (ctx.cellWidth + ctx.cellPadding));
				setAttribute(rect, "width", ctx.cellWidth);
				setAttribute(rect, "height", ctx.cellWidth);
				addLoc(rect, file$o, 32, 8, 1373);
				setAttribute(path0, "fill", "none");
				setAttribute(path0, "stroke", "black");
				setAttribute(path0, "d", path0_d_value = "M" + ((ctx.inputWidth + ctx.inputPadding) * 1 + ctx.input.x * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth) + "," + (ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2) + " L" + ((ctx.inputWidth + ctx.inputPadding) * 2 - 10) + "," + (ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2) + " m-5,-5 l5,5 l-5,5");
				addLoc(path0, file$o, 33, 8, 1582);
				setAttribute(text5, "font-size", "9");
				setAttribute(text5, "dy", text5_dy_value = ctx.cellWidth / 1.5);
				setAttribute(text5, "transform", text5_transform_value = "translate(" + ctx.x * (ctx.cellWidth + ctx.cellPadding) + ", " + ctx.y * (ctx.cellWidth + ctx.cellPadding) + ")");
				addLoc(text5, file$o, 39, 10, 2030);
				setAttribute(g1, "transform", g1_transform_value = "translate(" + (ctx.inputWidth + ctx.inputPadding) * 2 + ", " + ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ")");
				addLoc(g1, file$o, 38, 8, 1920);
				setAttribute(g2, "transform", g2_transform_value = "translate(0, " + (ctx.inputWidth + 20) * ctx.i + ")");
				addLoc(g2, file$o, 17, 6, 647);
				setAttribute(path1, "fill", "none");
				setAttribute(path1, "stroke", "black");
				setAttribute(path1, "d", path1_d_value = pointerPath(ctx.columnWidth, ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2 + (ctx.inputWidth + 20) * ctx.i, (ctx.columnWidth + ctx.columnPadding) + ctx.columnWidth * ctx.input.px, ctx.columnWidth * ctx.input.py));
				addLoc(path1, file$o, 50, 6, 2525);
			},

			m: function mount(target, anchor) {
				insert(target, g2, anchor);
				append(g2, image0);
				append(g2, g0);
				append(g0, image1);

				for (var i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
					each_blocks[i_1].m(g0, null);
				}

				append(g2, rect);
				append(g2, path0);
				append(g2, g1);
				append(g1, text5);
				append(text5, text0);
				append(text5, text1);
				append(text5, text2);
				append(text5, text3);
				append(text5, text4);
				if (if_block) if_block.m(g2, null);
				insert(target, path1, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.inputs) && image0_xlink_href_value !== (image0_xlink_href_value = "assets/images/" + ctx.input.id + ".jpg")) {
					setXlinkAttribute(image0, "xlink:href", image0_xlink_href_value);
				}

				if (changed.inputWidth) {
					setAttribute(image0, "width", ctx.inputWidth);
					setAttribute(image0, "height", ctx.inputWidth);
				}

				if ((changed.inputs) && image1_xlink_href_value !== (image1_xlink_href_value = "assets/images/" + ctx.input.id + ".jpg")) {
					setXlinkAttribute(image1, "xlink:href", image1_xlink_href_value);
				}

				if (changed.inputWidth) {
					setAttribute(image1, "width", ctx.inputWidth);
					setAttribute(image1, "height", ctx.inputWidth);
				}

				if (changed.numCells || changed.cellWidth || changed.cellPadding) {
					each_value = range(ctx.numCells);

					for (var i_1 = 0; i_1 < each_value.length; i_1 += 1) {
						const child_ctx = get_each_context$6(ctx, each_value, i_1);

						if (each_blocks[i_1]) {
							each_blocks[i_1].p(changed, child_ctx);
						} else {
							each_blocks[i_1] = create_each_block_4$1(component, child_ctx);
							each_blocks[i_1].c();
							each_blocks[i_1].m(g0, null);
						}
					}

					for (; i_1 < each_blocks.length; i_1 += 1) {
						each_blocks[i_1].d(1);
					}
					each_blocks.length = each_value.length;
				}

				if ((changed.inputWidth || changed.inputPadding) && g0_transform_value !== (g0_transform_value = "translate(" + (ctx.inputWidth + ctx.inputPadding) + ", 0)")) {
					setAttribute(g0, "transform", g0_transform_value);
				}

				if ((changed.inputWidth || changed.inputPadding || changed.inputs || changed.cellWidth || changed.cellPadding) && rect_x_value !== (rect_x_value = (ctx.inputWidth + ctx.inputPadding) * 1 + ctx.input.x * (ctx.cellWidth + ctx.cellPadding))) {
					setAttribute(rect, "x", rect_x_value);
				}

				if ((changed.inputs || changed.cellWidth || changed.cellPadding) && rect_y_value !== (rect_y_value = ctx.input.y * (ctx.cellWidth + ctx.cellPadding))) {
					setAttribute(rect, "y", rect_y_value);
				}

				if (changed.cellWidth) {
					setAttribute(rect, "width", ctx.cellWidth);
					setAttribute(rect, "height", ctx.cellWidth);
				}

				if ((changed.inputWidth || changed.inputPadding || changed.inputs || changed.cellWidth || changed.cellPadding) && path0_d_value !== (path0_d_value = "M" + ((ctx.inputWidth + ctx.inputPadding) * 1 + ctx.input.x * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth) + "," + (ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2) + " L" + ((ctx.inputWidth + ctx.inputPadding) * 2 - 10) + "," + (ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2) + " m-5,-5 l5,5 l-5,5")) {
					setAttribute(path0, "d", path0_d_value);
				}

				if ((changed.Math) && text1_value !== (text1_value = (ctx.Math.random() + "").slice(0, 5))) {
					setData(text1, text1_value);
				}

				if ((changed.Math) && text3_value !== (text3_value = (ctx.Math.random() + "").slice(0, 5))) {
					setData(text3, text3_value);
				}

				if ((changed.cellWidth) && text5_dy_value !== (text5_dy_value = ctx.cellWidth / 1.5)) {
					setAttribute(text5, "dy", text5_dy_value);
				}

				if ((changed.x || changed.cellWidth || changed.cellPadding || changed.y) && text5_transform_value !== (text5_transform_value = "translate(" + ctx.x * (ctx.cellWidth + ctx.cellPadding) + ", " + ctx.y * (ctx.cellWidth + ctx.cellPadding) + ")")) {
					setAttribute(text5, "transform", text5_transform_value);
				}

				if ((changed.inputWidth || changed.inputPadding || changed.inputs || changed.cellWidth || changed.cellPadding) && g1_transform_value !== (g1_transform_value = "translate(" + (ctx.inputWidth + ctx.inputPadding) * 2 + ", " + ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ")")) {
					setAttribute(g1, "transform", g1_transform_value);
				}

				if (ctx.i !== ctx.inputs.length - 1) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$7(component, ctx);
						if_block.c();
						if_block.m(g2, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.inputWidth) && g2_transform_value !== (g2_transform_value = "translate(0, " + (ctx.inputWidth + 20) * ctx.i + ")")) {
					setAttribute(g2, "transform", g2_transform_value);
				}

				if ((changed.columnWidth || changed.inputs || changed.cellWidth || changed.cellPadding || changed.inputWidth || changed.columnPadding) && path1_d_value !== (path1_d_value = pointerPath(ctx.columnWidth, ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2 + (ctx.inputWidth + 20) * ctx.i, (ctx.columnWidth + ctx.columnPadding) + ctx.columnWidth * ctx.input.px, ctx.columnWidth * ctx.input.py))) {
					setAttribute(path1, "d", path1_d_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(g2);
				}

				destroyEach(each_blocks, detach);

				if (if_block) if_block.d();
				if (detach) {
					detachNode(path1);
				}
			}
		};
	}

	// (63:6) {#each webData as icon}
	function create_each_block_2$2(component, ctx) {
		var rect, rect_fill_opacity_value, rect_x_value, rect_y_value;

		return {
			c: function create() {
				rect = createSvgElement("rect");
				setAttribute(rect, "stroke", "none");
				setAttribute(rect, "fill", "white");
				setAttribute(rect, "fill-opacity", rect_fill_opacity_value = +ctx.icon.n > 50 ? 0 : 1);
				setAttribute(rect, "x", rect_x_value = ctx.icon.y * ctx.iconWidth);
				setAttribute(rect, "y", rect_y_value = ctx.icon.x * ctx.iconWidth);
				setAttribute(rect, "width", ctx.iconWidth);
				setAttribute(rect, "height", ctx.iconWidth);
				addLoc(rect, file$o, 63, 10, 3040);
			},

			m: function mount(target, anchor) {
				insert(target, rect, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.webData) && rect_fill_opacity_value !== (rect_fill_opacity_value = +ctx.icon.n > 50 ? 0 : 1)) {
					setAttribute(rect, "fill-opacity", rect_fill_opacity_value);
				}

				if ((changed.webData || changed.iconWidth) && rect_x_value !== (rect_x_value = ctx.icon.y * ctx.iconWidth)) {
					setAttribute(rect, "x", rect_x_value);
				}

				if ((changed.webData || changed.iconWidth) && rect_y_value !== (rect_y_value = ctx.icon.x * ctx.iconWidth)) {
					setAttribute(rect, "y", rect_y_value);
				}

				if (changed.iconWidth) {
					setAttribute(rect, "width", ctx.iconWidth);
					setAttribute(rect, "height", ctx.iconWidth);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(rect);
				}
			}
		};
	}

	// (67:8) {#each range(numIcons) as x}
	function create_each_block_1$4(component, ctx) {
		var rect, rect_x_value, rect_y_value;

		return {
			c: function create() {
				rect = createSvgElement("rect");
				setAttribute(rect, "stroke", "#ddd");
				setAttribute(rect, "stroke-opacity", "0.5");
				setAttribute(rect, "fill", "none");
				setAttribute(rect, "stroke-width", "1");
				setAttribute(rect, "x", rect_x_value = ctx.x * ctx.iconWidth);
				setAttribute(rect, "y", rect_y_value = ctx.y * ctx.iconWidth);
				setAttribute(rect, "width", ctx.iconWidth);
				setAttribute(rect, "height", ctx.iconWidth);
				addLoc(rect, file$o, 67, 10, 3292);
			},

			m: function mount(target, anchor) {
				insert(target, rect, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.numIcons || changed.iconWidth) && rect_x_value !== (rect_x_value = ctx.x * ctx.iconWidth)) {
					setAttribute(rect, "x", rect_x_value);
				}

				if ((changed.numIcons || changed.iconWidth) && rect_y_value !== (rect_y_value = ctx.y * ctx.iconWidth)) {
					setAttribute(rect, "y", rect_y_value);
				}

				if (changed.iconWidth) {
					setAttribute(rect, "width", ctx.iconWidth);
					setAttribute(rect, "height", ctx.iconWidth);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(rect);
				}
			}
		};
	}

	// (66:6) {#each range(numIcons) as y}
	function create_each_block$7(component, ctx) {
		var each_anchor;

		var each_value_2 = range(ctx.numIcons);

		var each_blocks = [];

		for (var i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_1$4(component, get_each_context_2(ctx, each_value_2, i));
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
				if (changed.numIcons || changed.iconWidth) {
					each_value_2 = range(ctx.numIcons);

					for (var i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block_1$4(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(each_anchor.parentNode, each_anchor);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value_2.length;
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

	function Process(options) {
		this._debugName = '<Process>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(assign({ Math : Math }, data$i()), options.data);

		this._recompute({ width: 1, columnPadding: 1, columnWidth: 1, inputPadding: 1, inputWidth: 1, numCells: 1, cellPadding: 1, numIcons: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<Process> was created without expected data property 'width'");
		if (!('columnPadding' in this._state)) console.warn("<Process> was created without expected data property 'columnPadding'");

		if (!('inputPadding' in this._state)) console.warn("<Process> was created without expected data property 'inputPadding'");

		if (!('numCells' in this._state)) console.warn("<Process> was created without expected data property 'numCells'");
		if (!('cellPadding' in this._state)) console.warn("<Process> was created without expected data property 'cellPadding'");
		if (!('numIcons' in this._state)) console.warn("<Process> was created without expected data property 'numIcons'");
		if (!('height' in this._state)) console.warn("<Process> was created without expected data property 'height'");
		if (!('layoutData' in this._state)) console.warn("<Process> was created without expected data property 'layoutData'");
		if (!('inputs' in this._state)) console.warn("<Process> was created without expected data property 'inputs'");

		if (!('x' in this._state)) console.warn("<Process> was created without expected data property 'x'");
		if (!('y' in this._state)) console.warn("<Process> was created without expected data property 'y'");

		if (!('webData' in this._state)) console.warn("<Process> was created without expected data property 'webData'");
		if (!('renderURL' in this._state)) console.warn("<Process> was created without expected data property 'renderURL'");

		if (!('iconHighlight' in this._state)) console.warn("<Process> was created without expected data property 'iconHighlight'");
		this._intro = true;

		this._fragment = create_main_fragment$p(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$6.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Process.prototype, protoDev);

	Process.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('columnWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<Process>: Cannot set read-only property 'columnWidth'");
		if ('inputWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<Process>: Cannot set read-only property 'inputWidth'");
		if ('cellWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<Process>: Cannot set read-only property 'cellWidth'");
		if ('iconWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<Process>: Cannot set read-only property 'iconWidth'");
	};

	Process.prototype._recompute = function _recompute(changed, state) {
		if (changed.width || changed.columnPadding) {
			if (this._differs(state.columnWidth, (state.columnWidth = columnWidth(state)))) changed.columnWidth = true;
		}

		if (changed.columnWidth || changed.inputPadding) {
			if (this._differs(state.inputWidth, (state.inputWidth = inputWidth(state)))) changed.inputWidth = true;
		}

		if (changed.inputWidth || changed.numCells || changed.cellPadding) {
			if (this._differs(state.cellWidth, (state.cellWidth = cellWidth$2(state)))) changed.cellWidth = true;
		}

		if (changed.columnWidth || changed.numIcons) {
			if (this._differs(state.iconWidth, (state.iconWidth = iconWidth(state)))) changed.iconWidth = true;
		}
	};

	/* src/diagrams/OneLayer.html generated by Svelte v2.15.3 */

	function data$j() {
	  return {
	    layerName: "mixed4c",
	    gridSize: 1
	  }
	}
	const file$p = "src/diagrams/OneLayer.html";

	function create_main_fragment$q(component, ctx) {
		var div, atlas_updating = {};

		var atlas_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2"
		 };
		if (ctx.gridSize  !== void 0) {
			atlas_initial_data.gridSize = ctx.gridSize ;
			atlas_updating.gridSize = true;
		}
		if (ctx.showLabels  !== void 0) {
			atlas_initial_data.showLabels = ctx.showLabels ;
			atlas_updating.showLabels = true;
		}
		var atlas = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}
				component._set(newState);
				atlas_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas._bind({ gridSize: 1, showLabels: 1 }, atlas.get());
		});

		return {
			c: function create() {
				div = createElement("div");
				atlas._fragment.c();
				div.className = "atlas svelte-1wfbhjw";
				setStyle(div, "grid-column", "screen");
				addLoc(div, file$p, 22, 0, 1143);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				atlas._mount(div, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlas_changes = {};
				if (changed.layerName) atlas_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas_updating.gridSize && changed.gridSize) {
					atlas_changes.gridSize = ctx.gridSize ;
					atlas_updating.gridSize = ctx.gridSize  !== void 0;
				}
				if (!atlas_updating.showLabels && changed.showLabels) {
					atlas_changes.showLabels = ctx.showLabels ;
					atlas_updating.showLabels = ctx.showLabels  !== void 0;
				}
				atlas._set(atlas_changes);
				atlas_updating = {};
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				atlas.destroy();
			}
		};
	}

	function OneLayer(options) {
		this._debugName = '<OneLayer>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$j(), options.data);
		if (!('layerName' in this._state)) console.warn("<OneLayer> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<OneLayer> was created without expected data property 'gridSize'");
		if (!('showLabels' in this._state)) console.warn("<OneLayer> was created without expected data property 'showLabels'");
		this._intro = true;

		this._fragment = create_main_fragment$q(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(OneLayer.prototype, protoDev);

	OneLayer.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/AtlasThumbnail.html generated by Svelte v2.15.3 */



	function height$3({clientWidth}) {
		return clientWidth;
	}

	function id({model, layerName}) {
		return model + "_" + layerName;
	}

	function data$k() {
	  return {
	    root: "https://storage.googleapis.com/activation-atlas/build",
	    model: "inceptionv1",
	    layerName: "mixed4d",
	    grid: 2,
	    layout: 0,
	    gridSize: 10,
	    classHeatmap: -1,
	    icons: []
	  };
	}
	var methods$5 = {
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
	      let heatmapMultiplier = 1;
	      if (classHeatmap > -1) {
	        let ci = classesToKeep.indexOf(classHeatmap);
	        let value = Math.max(0, icon.f[ci]);
	        heatmapMultiplier = Math.max(0.1, value * 20);
	        // console.log(ci, value)
	      }
	      const y = icon.x; //x,y switched on purpose 
	      const x = icon.y; //x,y switched on purpose
	      // data[y * gridSize * 4 + x * 4 + 0] = (heatmapMultiplier) * 255 * 20;
	      // data[y * gridSize * 4 + x * 4 + 1] = (heatmapMultiplier) * 130 * 20;
	      // data[y * gridSize * 4 + x * 4 + 2] = (heatmapMultiplier) * 1 * 20;
	      data[y * gridSize * 4 + x * 4 + 3] = (icon.n + 30) * heatmapMultiplier;
	    }
	    
	    context.putImageData(imageData, 0, 0);
	  }
	};

	function oncreate$7() {
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
	const file$q = "src/AtlasThumbnail.html";

	function create_main_fragment$r(component, ctx) {
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
				addLoc(canvas, file$q, 2, 2, 54);
				component.root._beforecreate.push(div_resize_handler);
				setStyle(div, "height", "" + ctx.height + "px");
				addLoc(div, file$q, 1, 0, 1);
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
		this._state = assign(data$k(), options.data);

		this._recompute({ clientWidth: 1, model: 1, layerName: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'clientWidth'");
		if (!('model' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'model'");
		if (!('layerName' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'layerName'");

		if (!('gridSize' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'gridSize'");
		this._intro = true;
		this._handlers.update = [onupdate$2];

		this._fragment = create_main_fragment$r(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$7.call(this);
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
	assign(AtlasThumbnail.prototype, methods$5);

	AtlasThumbnail.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('height' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasThumbnail>: Cannot set read-only property 'height'");
		if ('id' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasThumbnail>: Cannot set read-only property 'id'");
	};

	AtlasThumbnail.prototype._recompute = function _recompute(changed, state) {
		if (changed.clientWidth) {
			if (this._differs(state.height, (state.height = height$3(state)))) changed.height = true;
		}

		if (changed.model || changed.layerName) {
			if (this._differs(state.id, (state.id = id(state)))) changed.id = true;
		}
	};

	/* src/diagrams/LayerAnnotation.html generated by Svelte v2.15.3 */

	function data$l() {
	  return {
	    layerName: "mixed4c",
	    gridSize: 2,
	    homeScale: 14,
	    showLabels: true
	  }
	}
	const file$r = "src/diagrams/LayerAnnotation.html";

	function create_main_fragment$s(component, ctx) {
		var div2, div0, atlas_updating = {}, text0, div1, text1, atlasreticle_updating = {};

		var atlas_initial_data = { id: "inceptionv1_" + ctx.layerName };
		if (ctx.gridSize
	       !== void 0) {
			atlas_initial_data.gridSize = ctx.gridSize
	      ;
			atlas_updating.gridSize = true;
		}
		if (ctx.homeX 
	       !== void 0) {
			atlas_initial_data.homeX = ctx.homeX 
	      ;
			atlas_updating.homeX = true;
		}
		if (ctx.homeY 
	       !== void 0) {
			atlas_initial_data.homeY = ctx.homeY 
	      ;
			atlas_updating.homeY = true;
		}
		if (ctx.homeScale
	       !== void 0) {
			atlas_initial_data.homeScale = ctx.homeScale
	      ;
			atlas_updating.homeScale = true;
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
		if (ctx.showLabels
	     !== void 0) {
			atlas_initial_data.showLabels = ctx.showLabels
	    ;
			atlas_updating.showLabels = true;
		}
		var atlas = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas_updating.homeX && changed.homeX) {
					newState.homeX = childState.homeX;
				}

				if (!atlas_updating.homeY && changed.homeY) {
					newState.homeY = childState.homeY;
				}

				if (!atlas_updating.homeScale && changed.homeScale) {
					newState.homeScale = childState.homeScale;
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

				if (!atlas_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}
				component._set(newState);
				atlas_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas._bind({ gridSize: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1, showLabels: 1 }, atlas.get());
		});

		var atlasthumbnail_initial_data = {
		 	layerName: ctx.layerName,
		 	gridSize: 1
		 };
		var atlasthumbnail = new AtlasThumbnail({
			root: component.root,
			store: component.store,
			data: atlasthumbnail_initial_data
		});

		var atlasreticle_initial_data = {};
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

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				atlas._fragment.c();
				text0 = createText("\n  ");
				div1 = createElement("div");
				atlasthumbnail._fragment.c();
				text1 = createText("\n    ");
				atlasreticle._fragment.c();
				div0.className = "detail svelte-tlu8r4";
				addLoc(div0, file$r, 3, 2, 67);
				div1.className = "atlas svelte-tlu8r4";
				addLoc(div1, file$r, 17, 2, 323);
				setStyle(div2, "display", "grid");
				setStyle(div2, "grid-template-columns", "1fr 200px");
				addLoc(div2, file$r, 2, 0, 2);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				atlas._mount(div0, null);
				append(div2, text0);
				append(div2, div1);
				atlasthumbnail._mount(div1, null);
				append(div1, text1);
				atlasreticle._mount(div1, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlas_changes = {};
				if (changed.layerName) atlas_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas_updating.gridSize && changed.gridSize) {
					atlas_changes.gridSize = ctx.gridSize
	      ;
					atlas_updating.gridSize = ctx.gridSize
	       !== void 0;
				}
				if (!atlas_updating.homeX && changed.homeX) {
					atlas_changes.homeX = ctx.homeX 
	      ;
					atlas_updating.homeX = ctx.homeX 
	       !== void 0;
				}
				if (!atlas_updating.homeY && changed.homeY) {
					atlas_changes.homeY = ctx.homeY 
	      ;
					atlas_updating.homeY = ctx.homeY 
	       !== void 0;
				}
				if (!atlas_updating.homeScale && changed.homeScale) {
					atlas_changes.homeScale = ctx.homeScale
	      ;
					atlas_updating.homeScale = ctx.homeScale
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
				if (!atlas_updating.showLabels && changed.showLabels) {
					atlas_changes.showLabels = ctx.showLabels
	    ;
					atlas_updating.showLabels = ctx.showLabels
	     !== void 0;
				}
				atlas._set(atlas_changes);
				atlas_updating = {};

				var atlasthumbnail_changes = {};
				if (changed.layerName) atlasthumbnail_changes.layerName = ctx.layerName;
				atlasthumbnail._set(atlasthumbnail_changes);

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
					detachNode(div2);
				}

				atlas.destroy();
				atlasthumbnail.destroy();
				atlasreticle.destroy();
			}
		};
	}

	function LayerAnnotation(options) {
		this._debugName = '<LayerAnnotation>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$l(), options.data);
		if (!('layerName' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'gridSize'");
		if (!('homeX' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'homeX'");
		if (!('homeY' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'homeY'");
		if (!('homeScale' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'homeScale'");
		if (!('aspectRatio' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'aspectRatio'");
		if (!('scale' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'scale'");
		if (!('gcx' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'gcy'");
		if (!('showLabels' in this._state)) console.warn("<LayerAnnotation> was created without expected data property 'showLabels'");
		this._intro = true;

		this._fragment = create_main_fragment$s(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(LayerAnnotation.prototype, protoDev);

	LayerAnnotation.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/ClippedIcon.html generated by Svelte v2.15.3 */

	function height$4({width}) {
		return width;
	}

	function data$m() {
	  return {
	    iconCrop: 0.02,
	    width: null,
	    icon: null,
	    config: null
	  }
	}
	var methods$6 = {
	  render() {
	    const {icon, config, width, height, iconCrop} = this.get();
	    let context = this.refs.canvas.getContext('2d');
	    context.clearRect(0, 0, width, height);

	    if(icon){
	      const iconOffset = (iconCrop * config.icon_size) / 2;

	      load$1(icon.url).then(response => {

	        context.drawImage(
	          response,
	          //source
	          // NOTE X/Y swap
	          icon.localY * config.icon_size + iconOffset, 
	          icon.localX * config.icon_size + iconOffset, 
	          (config.icon_size - iconOffset * 2),
	          config.icon_size - iconOffset * 2,
	          //destination
	          0,
	          0, 
	          width,
	          height
	        );
	      });        
	    }
	  }
	};

	function oncreate$8() {
	  this.render();
	}
	const file$s = "src/ClippedIcon.html";

	function create_main_fragment$t(component, ctx) {
		var div, canvas;

		return {
			c: function create() {
				div = createElement("div");
				canvas = createElement("canvas");
				setStyle(canvas, "position", "absolute");
				setStyle(canvas, "top", "0");
				setStyle(canvas, "left", "calc(50% - " + ctx.width / 2 + "px)");
				canvas.className = "singleIcon";
				canvas.width = ctx.width;
				canvas.height = ctx.height;
				addLoc(canvas, file$s, 1, 2, 121);
				setStyle(div, "position", "relative");
				setStyle(div, "overflow", "hidden");
				setStyle(div, "height", "" + ctx.width + "px");
				setStyle(div, "border-right", "solid 1px rgba(255, 255, 255, 0.2)");
				addLoc(div, file$s, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, canvas);
				component.refs.canvas = canvas;
			},

			p: function update(changed, ctx) {
				if (changed.width) {
					setStyle(canvas, "left", "calc(50% - " + ctx.width / 2 + "px)");
					canvas.width = ctx.width;
				}

				if (changed.height) {
					canvas.height = ctx.height;
				}

				if (changed.width) {
					setStyle(div, "height", "" + ctx.width + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (component.refs.canvas === canvas) component.refs.canvas = null;
			}
		};
	}

	function ClippedIcon(options) {
		this._debugName = '<ClippedIcon>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$m(), options.data);

		this._recompute({ width: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<ClippedIcon> was created without expected data property 'width'");
		this._intro = true;

		this._fragment = create_main_fragment$t(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$8.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ClippedIcon.prototype, protoDev);
	assign(ClippedIcon.prototype, methods$6);

	ClippedIcon.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('height' in newState && !this._updatingReadonlyProperty) throw new Error("<ClippedIcon>: Cannot set read-only property 'height'");
	};

	ClippedIcon.prototype._recompute = function _recompute(changed, state) {
		if (changed.width) {
			if (this._differs(state.height, (state.height = height$4(state)))) changed.height = true;
		}
	};

	/* src/SetOfIcons.html generated by Svelte v2.15.3 */

	function pathZoomIndex({layers}) {
	  if(layers){
	    return layers.length - 1
	  }
	  return 1
	}

	function data$n() {
	  return {
	    container: null,
	    arrow: null,
	    arrowHeight: 30,
	    imgList: [],
	  }
	}
	var methods$7 = {
	  drawArrow() {
	    const {arrow, width, color, arrowHeight} = this.get();

	    const vertAdjust = arrowHeight / 2;
	    arrow.clearRect(0, 0, width, arrowHeight);
	    
	    arrow.lineWidth=2;
	    arrow.strokeStyle=color;
	    arrow.fillStyle=color;
	    arrow.beginPath();
	    arrow.moveTo(2, vertAdjust);
	    arrow.lineTo(width, vertAdjust);
	    arrow.stroke();
	    arrow.beginPath();
	    arrow.arc(4,vertAdjust,4,0,2*Math.PI);
	    arrow.fill();
	    arrow.beginPath();
	    arrow.moveTo(width, vertAdjust);
	    arrow.lineTo(width - 10, vertAdjust - 5);
	    arrow.lineTo(width - 10, vertAdjust + 5);
	    arrow.fill();

	  },
	  render() {
	    const {pointList} = this.get();

	    if(pointList){

	      let lastIcon = {};

	      let imgList = [];
	      pointList.forEach((globalPosPercent) => {
	        let thisIcon = this.getIconData({x: globalPosPercent[0], y: globalPosPercent[1]});

	        if(thisIcon != lastIcon){
	          imgList.push(thisIcon);
	        }
	        lastIcon = thisIcon;
	      });
	      this.set({imgList});
	      console.log(imgList);
	    }
	  },
	  getIconData(globalPosPercent) {
	    const {layers, pathZoomIndex} = this.get();
	    if(layers && layers[pathZoomIndex]) {

	      const gridSelected = {
	        // assumes layers is always square
	        x: Math.floor(globalPosPercent.x * layers[pathZoomIndex].length),
	        y: Math.floor(globalPosPercent.y * layers[pathZoomIndex].length),
	      };
	    
	      if(layers[pathZoomIndex][gridSelected.y] && 
	          layers[pathZoomIndex][gridSelected.y][gridSelected.x]
	        ){
	          const currentIcon = layers[pathZoomIndex][gridSelected.y][gridSelected.x];
	          if(currentIcon.num_activations > 0){
	            return layers[pathZoomIndex][gridSelected.y][gridSelected.x];
	          }
	        }
	    }
	  }
	};

	function onupdate$3({ changed, current, previous }) {
	  this.set({container: this.refs.icons, arrow: this.refs.arrow.getContext('2d')});
	  if (changed.pointList, changed.layers) {
	    this.render();
	  }
	  if (changed.width) {
	    this.drawArrow();
	  }
	}
	const file$t = "src/SetOfIcons.html";

	function get_each_context$7(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.icon = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$u(component, ctx) {
		var div1, canvas, text, div0, div1_resize_listener;

		var each_value = ctx.imgList;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$8(component, get_each_context$7(ctx, each_value, i));
		}

		function div1_resize_handler() {
			component.set({ width: div1.clientWidth, height: div1.clientHeight });
		}

		return {
			c: function create() {
				div1 = createElement("div");
				canvas = createElement("canvas");
				text = createText("\n  ");
				div0 = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				canvas.width = ctx.width;
				canvas.height = ctx.arrowHeight;
				addLoc(canvas, file$t, 1, 2, 71);
				div0.className = "icons svelte-106o8is";
				addLoc(div0, file$t, 2, 2, 136);
				component.root._beforecreate.push(div1_resize_handler);
				addLoc(div1, file$t, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, canvas);
				component.refs.arrow = canvas;
				append(div1, text);
				append(div1, div0);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div0, null);
				}

				component.refs.icons = div0;
				div1_resize_listener = addResizeListener(div1, div1_resize_handler);
				component.refs.annotation = div1;
			},

			p: function update(changed, ctx) {
				if (changed.width) {
					canvas.width = ctx.width;
				}

				if (changed.arrowHeight) {
					canvas.height = ctx.arrowHeight;
				}

				if (changed.imgList || changed.config) {
					each_value = ctx.imgList;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$7(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$8(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
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
					detachNode(div1);
				}

				if (component.refs.arrow === canvas) component.refs.arrow = null;

				destroyEach(each_blocks, detach);

				if (component.refs.icons === div0) component.refs.icons = null;
				div1_resize_listener.cancel();
				if (component.refs.annotation === div1) component.refs.annotation = null;
			}
		};
	}

	// (4:4) {#each imgList as icon, i}
	function create_each_block$8(component, ctx) {

		var clippedicon_initial_data = {
		 	icon: ctx.icon,
		 	width: 100,
		 	config: ctx.config
		 };
		var clippedicon = new ClippedIcon({
			root: component.root,
			store: component.store,
			data: clippedicon_initial_data
		});

		return {
			c: function create() {
				clippedicon._fragment.c();
			},

			m: function mount(target, anchor) {
				clippedicon._mount(target, anchor);
			},

			p: function update(changed, ctx) {
				var clippedicon_changes = {};
				if (changed.imgList) clippedicon_changes.icon = ctx.icon;
				if (changed.config) clippedicon_changes.config = ctx.config;
				clippedicon._set(clippedicon_changes);
			},

			d: function destroy$$1(detach) {
				clippedicon.destroy(detach);
			}
		};
	}

	function SetOfIcons(options) {
		this._debugName = '<SetOfIcons>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$n(), options.data);

		this._recompute({ layers: 1 }, this._state);
		if (!('layers' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'layers'");
		if (!('width' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'width'");
		if (!('height' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'height'");
		if (!('arrowHeight' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'arrowHeight'");
		if (!('imgList' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'imgList'");
		if (!('config' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'config'");
		this._intro = true;
		this._handlers.update = [onupdate$3];

		this._fragment = create_main_fragment$u(this, this._state);

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

	assign(SetOfIcons.prototype, protoDev);
	assign(SetOfIcons.prototype, methods$7);

	SetOfIcons.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('pathZoomIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<SetOfIcons>: Cannot set read-only property 'pathZoomIndex'");
	};

	SetOfIcons.prototype._recompute = function _recompute(changed, state) {
		if (changed.layers) {
			if (this._differs(state.pathZoomIndex, (state.pathZoomIndex = pathZoomIndex(state)))) changed.pathZoomIndex = true;
		}
	};

	/* src/diagrams/ShowAPath.html generated by Svelte v2.15.3 */

	function numIcons({pointList}) {
		return pointList.length;
	}

	function edgeLength({viewWidth, viewHeight}) {
	  if(viewWidth && viewHeight){
	    return Math.min(viewWidth, viewHeight)
	  }
	  return 0
	}

	function topLeft$1({viewWidth, viewHeight, edgeLength}) {
	  if(viewWidth && viewHeight){
	    return [(viewWidth - edgeLength) / 2, (viewHeight - edgeLength) / 2]
	  }
	  return [0,0]
	}

	function path_d({pointList, topLeft, edgeLength}) {
	  // need to adjust for size
	  let path_d = [];
	  let d = "M";
	  pointList.forEach(function(point){
	      d = d + (point[0]) * edgeLength  + 
	        " " + (point[1]) * edgeLength + " L";

	    
	  });
	  path_d.push(d.substring(0, d.length - 2));
	  return path_d
	}

	function data$o() {
	  return {
	    gridSize: 1,
	    height: 160,
	    color: '#ff6600',
	    uniqueId: Math.random(),
	    atlasMargin: 20,
	  }
	}
	const file$u = "src/diagrams/ShowAPath.html";

	function create_main_fragment$v(component, ctx) {
		var div3, div0, text0, div2, div1, atlasthumbnail_updating = {}, text1, svg, defs, marker0, circle, marker0_id_value, marker1, path0, marker1_id_value, path1, path1_marker_end_value, path1_marker_start_value, text2, atlasdataloader_updating = {};

		var setoficons_initial_data = {
		 	pointList: ctx.pointList,
		 	layers: ctx.layers,
		 	config: ctx.config,
		 	color: ctx.color
		 };
		var setoficons = new SetOfIcons({
			root: component.root,
			store: component.store,
			data: setoficons_initial_data
		});

		var atlasthumbnail_initial_data = {
		 	layerName: ctx.layerName,
		 	gridSize: 1
		 };
		if (ctx.viewWidth !== void 0) {
			atlasthumbnail_initial_data.clientWidth = ctx.viewWidth;
			atlasthumbnail_updating.clientWidth = true;
		}
		if (ctx.viewHeight !== void 0) {
			atlasthumbnail_initial_data.height = ctx.viewHeight;
			atlasthumbnail_updating.height = true;
		}
		var atlasthumbnail = new AtlasThumbnail({
			root: component.root,
			store: component.store,
			data: atlasthumbnail_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasthumbnail_updating.clientWidth && changed.clientWidth) {
					newState.viewWidth = childState.clientWidth;
				}

				if (!atlasthumbnail_updating.height && changed.height) {
					newState.viewHeight = childState.height;
				}
				component._set(newState);
				atlasthumbnail_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasthumbnail._bind({ clientWidth: 1, height: 1 }, atlasthumbnail.get());
		});

		var atlasdataloader_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	layer: 0,
		 	layout: 0,
		 	classFilter: 0,
		 	filter: 0
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
				div3 = createElement("div");
				div0 = createElement("div");
				setoficons._fragment.c();
				text0 = createText("\n  ");
				div2 = createElement("div");
				div1 = createElement("div");
				atlasthumbnail._fragment.c();
				text1 = createText("\n    ");
				svg = createSvgElement("svg");
				defs = createSvgElement("defs");
				marker0 = createSvgElement("marker");
				circle = createSvgElement("circle");
				marker1 = createSvgElement("marker");
				path0 = createSvgElement("path");
				path1 = createSvgElement("path");
				text2 = createText("\n  ");
				atlasdataloader._fragment.c();
				addLoc(div0, file$u, 1, 2, 91);
				div1.className = "thumbnail svelte-19vqpwh";
				addLoc(div1, file$u, 10, 4, 313);
				setAttribute(circle, "cx", "5");
				setAttribute(circle, "cy", "5");
				setAttribute(circle, "r", "3");
				addLoc(circle, file$u, 36, 10, 954);
				setAttribute(marker0, "id", marker0_id_value = 'head' + ctx.uniqueId);
				setAttribute(marker0, "fill", ctx.color);
				setAttribute(marker0, "viewBox", "0 0 10 10");
				setAttribute(marker0, "refX", "5");
				setAttribute(marker0, "refY", "5");
				setAttribute(marker0, "markerWidth", "5");
				setAttribute(marker0, "markerHeight", "5");
				setAttribute(marker0, "orient", "auto-start-reverse");
				addLoc(marker0, file$u, 26, 8, 705);
				setAttribute(path0, "d", "M 0 0 L 10 5 L 0 10 z");
				addLoc(path0, file$u, 47, 10, 1233);
				setAttribute(marker1, "id", marker1_id_value = 'arrow' + ctx.uniqueId);
				setAttribute(marker1, "fill", ctx.color);
				setAttribute(marker1, "viewBox", "0 0 10 10");
				setAttribute(marker1, "refX", "5");
				setAttribute(marker1, "refY", "5");
				setAttribute(marker1, "markerWidth", "3");
				setAttribute(marker1, "markerHeight", "3");
				setAttribute(marker1, "orient", "auto-start-reverse");
				addLoc(marker1, file$u, 38, 8, 1010);
				addLoc(defs, file$u, 25, 6, 690);
				setAttribute(path1, "d", ctx.path_d);
				setAttribute(path1, "stroke", ctx.color);
				setAttribute(path1, "stroke-width", "3");
				setAttribute(path1, "fill", "transparent");
				setAttribute(path1, "marker-end", path1_marker_end_value = "url(#" + ('arrow' + ctx.uniqueId) + ")");
				setAttribute(path1, "marker-start", path1_marker_start_value = "url(#" + ('head' + ctx.uniqueId) + ")");
				addLoc(path1, file$u, 50, 6, 1306);
				setAttribute(svg, "class", "pathArrow svelte-19vqpwh");
				setStyle(svg, "width", ctx.edgeLength);
				setStyle(svg, "height", ctx.edgeLength);
				setStyle(svg, "left", (ctx.viewWidth - ctx.edgeLength) / 2);
				setStyle(svg, "top", (ctx.viewHeight - ctx.edgeLength) / 2);
				addLoc(svg, file$u, 18, 4, 490);
				div2.className = "atlas svelte-19vqpwh";
				setStyle(div2, "width", "" + (ctx.height-ctx.atlasMargin*2) + "px");
				setStyle(div2, "height", "" + (ctx.height-ctx.atlasMargin*2) + "px");
				setStyle(div2, "margin", "" + ctx.atlasMargin + "px");
				addLoc(div2, file$u, 9, 2, 193);
				div3.className = "showapath";
				setStyle(div3, "display", "grid");
				setStyle(div3, "grid-template-columns", "1fr " + ctx.height + "px");
				addLoc(div3, file$u, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div0);
				setoficons._mount(div0, null);
				append(div3, text0);
				append(div3, div2);
				append(div2, div1);
				atlasthumbnail._mount(div1, null);
				append(div2, text1);
				append(div2, svg);
				append(svg, defs);
				append(defs, marker0);
				append(marker0, circle);
				append(defs, marker1);
				append(marker1, path0);
				append(svg, path1);
				component.refs.clickPath = path1;
				append(div3, text2);
				atlasdataloader._mount(div3, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var setoficons_changes = {};
				if (changed.pointList) setoficons_changes.pointList = ctx.pointList;
				if (changed.layers) setoficons_changes.layers = ctx.layers;
				if (changed.config) setoficons_changes.config = ctx.config;
				if (changed.color) setoficons_changes.color = ctx.color;
				setoficons._set(setoficons_changes);

				var atlasthumbnail_changes = {};
				if (changed.layerName) atlasthumbnail_changes.layerName = ctx.layerName;
				if (!atlasthumbnail_updating.clientWidth && changed.viewWidth) {
					atlasthumbnail_changes.clientWidth = ctx.viewWidth;
					atlasthumbnail_updating.clientWidth = ctx.viewWidth !== void 0;
				}
				if (!atlasthumbnail_updating.height && changed.viewHeight) {
					atlasthumbnail_changes.height = ctx.viewHeight;
					atlasthumbnail_updating.height = ctx.viewHeight !== void 0;
				}
				atlasthumbnail._set(atlasthumbnail_changes);
				atlasthumbnail_updating = {};

				if ((changed.uniqueId) && marker0_id_value !== (marker0_id_value = 'head' + ctx.uniqueId)) {
					setAttribute(marker0, "id", marker0_id_value);
				}

				if (changed.color) {
					setAttribute(marker0, "fill", ctx.color);
				}

				if ((changed.uniqueId) && marker1_id_value !== (marker1_id_value = 'arrow' + ctx.uniqueId)) {
					setAttribute(marker1, "id", marker1_id_value);
				}

				if (changed.color) {
					setAttribute(marker1, "fill", ctx.color);
				}

				if (changed.path_d) {
					setAttribute(path1, "d", ctx.path_d);
				}

				if (changed.color) {
					setAttribute(path1, "stroke", ctx.color);
				}

				if ((changed.uniqueId) && path1_marker_end_value !== (path1_marker_end_value = "url(#" + ('arrow' + ctx.uniqueId) + ")")) {
					setAttribute(path1, "marker-end", path1_marker_end_value);
				}

				if ((changed.uniqueId) && path1_marker_start_value !== (path1_marker_start_value = "url(#" + ('head' + ctx.uniqueId) + ")")) {
					setAttribute(path1, "marker-start", path1_marker_start_value);
				}

				if (changed.edgeLength) {
					setStyle(svg, "width", ctx.edgeLength);
					setStyle(svg, "height", ctx.edgeLength);
				}

				if (changed.viewWidth || changed.edgeLength) {
					setStyle(svg, "left", (ctx.viewWidth - ctx.edgeLength) / 2);
				}

				if (changed.viewHeight || changed.edgeLength) {
					setStyle(svg, "top", (ctx.viewHeight - ctx.edgeLength) / 2);
				}

				if (changed.height || changed.atlasMargin) {
					setStyle(div2, "width", "" + (ctx.height-ctx.atlasMargin*2) + "px");
					setStyle(div2, "height", "" + (ctx.height-ctx.atlasMargin*2) + "px");
				}

				if (changed.atlasMargin) {
					setStyle(div2, "margin", "" + ctx.atlasMargin + "px");
				}

				var atlasdataloader_changes = {};
				if (changed.layerName) atlasdataloader_changes.id = "inceptionv1_" + ctx.layerName;
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

				if (changed.height) {
					setStyle(div3, "grid-template-columns", "1fr " + ctx.height + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div3);
				}

				setoficons.destroy();
				atlasthumbnail.destroy();
				if (component.refs.clickPath === path1) component.refs.clickPath = null;
				atlasdataloader.destroy();
			}
		};
	}

	function ShowAPath(options) {
		this._debugName = '<ShowAPath>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$o(), options.data);

		this._recompute({ pointList: 1, viewWidth: 1, viewHeight: 1, edgeLength: 1, topLeft: 1 }, this._state);
		if (!('pointList' in this._state)) console.warn("<ShowAPath> was created without expected data property 'pointList'");
		if (!('viewWidth' in this._state)) console.warn("<ShowAPath> was created without expected data property 'viewWidth'");
		if (!('viewHeight' in this._state)) console.warn("<ShowAPath> was created without expected data property 'viewHeight'");


		if (!('height' in this._state)) console.warn("<ShowAPath> was created without expected data property 'height'");
		if (!('layers' in this._state)) console.warn("<ShowAPath> was created without expected data property 'layers'");
		if (!('config' in this._state)) console.warn("<ShowAPath> was created without expected data property 'config'");
		if (!('color' in this._state)) console.warn("<ShowAPath> was created without expected data property 'color'");
		if (!('atlasMargin' in this._state)) console.warn("<ShowAPath> was created without expected data property 'atlasMargin'");
		if (!('layerName' in this._state)) console.warn("<ShowAPath> was created without expected data property 'layerName'");
		if (!('uniqueId' in this._state)) console.warn("<ShowAPath> was created without expected data property 'uniqueId'");

		if (!('labels' in this._state)) console.warn("<ShowAPath> was created without expected data property 'labels'");
		this._intro = true;

		this._fragment = create_main_fragment$v(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ShowAPath.prototype, protoDev);

	ShowAPath.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('numIcons' in newState && !this._updatingReadonlyProperty) throw new Error("<ShowAPath>: Cannot set read-only property 'numIcons'");
		if ('edgeLength' in newState && !this._updatingReadonlyProperty) throw new Error("<ShowAPath>: Cannot set read-only property 'edgeLength'");
		if ('topLeft' in newState && !this._updatingReadonlyProperty) throw new Error("<ShowAPath>: Cannot set read-only property 'topLeft'");
		if ('path_d' in newState && !this._updatingReadonlyProperty) throw new Error("<ShowAPath>: Cannot set read-only property 'path_d'");
	};

	ShowAPath.prototype._recompute = function _recompute(changed, state) {
		if (changed.pointList) {
			if (this._differs(state.numIcons, (state.numIcons = numIcons(state)))) changed.numIcons = true;
		}

		if (changed.viewWidth || changed.viewHeight) {
			if (this._differs(state.edgeLength, (state.edgeLength = edgeLength(state)))) changed.edgeLength = true;
		}

		if (changed.viewWidth || changed.viewHeight || changed.edgeLength) {
			if (this._differs(state.topLeft, (state.topLeft = topLeft$1(state)))) changed.topLeft = true;
		}

		if (changed.pointList || changed.topLeft || changed.edgeLength) {
			if (this._differs(state.path_d, (state.path_d = path_d(state)))) changed.path_d = true;
		}
	};

	/* src/diagrams/VerticalLayerAnnotation.html generated by Svelte v2.15.3 */

	function data$p() {
	  return {
	    layerName: "mixed4c",
	    gridSize: 3,
	    homeScale: 16 * 3,
	    showLabels: true
	  }
	}
	const file$v = "src/diagrams/VerticalLayerAnnotation.html";

	function create_main_fragment$w(component, ctx) {
		var div2, div0, atlas_updating = {}, text0, div1, text1, atlasreticle_updating = {}, text2;

		var atlas_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	enableDragToPan: true,
		 	enableClickToZoom: false
		 };
		if (ctx.gridSize
	       !== void 0) {
			atlas_initial_data.gridSize = ctx.gridSize
	      ;
			atlas_updating.gridSize = true;
		}
		if (ctx.homeX 
	       !== void 0) {
			atlas_initial_data.homeX = ctx.homeX 
	      ;
			atlas_updating.homeX = true;
		}
		if (ctx.homeY 
	       !== void 0) {
			atlas_initial_data.homeY = ctx.homeY 
	      ;
			atlas_updating.homeY = true;
		}
		if (ctx.homeScale
	       !== void 0) {
			atlas_initial_data.homeScale = ctx.homeScale
	      ;
			atlas_updating.homeScale = true;
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
		if (ctx.showLabels
	       !== void 0) {
			atlas_initial_data.showLabels = ctx.showLabels
	      ;
			atlas_updating.showLabels = true;
		}
		var atlas = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas_updating.homeX && changed.homeX) {
					newState.homeX = childState.homeX;
				}

				if (!atlas_updating.homeY && changed.homeY) {
					newState.homeY = childState.homeY;
				}

				if (!atlas_updating.homeScale && changed.homeScale) {
					newState.homeScale = childState.homeScale;
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

				if (!atlas_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}
				component._set(newState);
				atlas_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas._bind({ gridSize: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1, showLabels: 1 }, atlas.get());
		});

		var atlasthumbnail_initial_data = { layerName: ctx.layerName };
		var atlasthumbnail = new AtlasThumbnail({
			root: component.root,
			store: component.store,
			data: atlasthumbnail_initial_data
		});

		var atlasreticle_initial_data = {};
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

		var if_block = (ctx.gcx && ctx.gcy) && create_if_block$8(component, ctx);

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				atlas._fragment.c();
				text0 = createText("\n  ");
				div1 = createElement("div");
				atlasthumbnail._fragment.c();
				text1 = createText("\n    ");
				atlasreticle._fragment.c();
				text2 = createText("\n    ");
				if (if_block) if_block.c();
				div0.className = "detail svelte-1dvwfeg";
				addLoc(div0, file$v, 3, 2, 19);
				div1.className = "atlas svelte-1dvwfeg";
				addLoc(div1, file$v, 19, 2, 336);
				addLoc(div2, file$v, 2, 0, 2);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				atlas._mount(div0, null);
				append(div2, text0);
				append(div2, div1);
				atlasthumbnail._mount(div1, null);
				append(div1, text1);
				atlasreticle._mount(div1, null);
				append(div1, text2);
				if (if_block) if_block.m(div1, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlas_changes = {};
				if (changed.layerName) atlas_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas_updating.gridSize && changed.gridSize) {
					atlas_changes.gridSize = ctx.gridSize
	      ;
					atlas_updating.gridSize = ctx.gridSize
	       !== void 0;
				}
				if (!atlas_updating.homeX && changed.homeX) {
					atlas_changes.homeX = ctx.homeX 
	      ;
					atlas_updating.homeX = ctx.homeX 
	       !== void 0;
				}
				if (!atlas_updating.homeY && changed.homeY) {
					atlas_changes.homeY = ctx.homeY 
	      ;
					atlas_updating.homeY = ctx.homeY 
	       !== void 0;
				}
				if (!atlas_updating.homeScale && changed.homeScale) {
					atlas_changes.homeScale = ctx.homeScale
	      ;
					atlas_updating.homeScale = ctx.homeScale
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
				if (!atlas_updating.showLabels && changed.showLabels) {
					atlas_changes.showLabels = ctx.showLabels
	      ;
					atlas_updating.showLabels = ctx.showLabels
	       !== void 0;
				}
				atlas._set(atlas_changes);
				atlas_updating = {};

				var atlasthumbnail_changes = {};
				if (changed.layerName) atlasthumbnail_changes.layerName = ctx.layerName;
				atlasthumbnail._set(atlasthumbnail_changes);

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

				if (ctx.gcx && ctx.gcy) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$8(component, ctx);
						if_block.c();
						if_block.m(div1, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div2);
				}

				atlas.destroy();
				atlasthumbnail.destroy();
				atlasreticle.destroy();
				if (if_block) if_block.d();
			}
		};
	}

	// (30:4) {#if gcx && gcy}
	function create_if_block$8(component, ctx) {
		var label, text0, raw0_value = ctx.gcx.toPrecision(4), raw0_before, raw0_after, text1, raw1_value = ctx.gcy.toPrecision(4), raw1_before;

		return {
			c: function create() {
				label = createElement("label");
				text0 = createText("gcx: ");
				raw0_before = createElement('noscript');
				raw0_after = createElement('noscript');
				text1 = createText(", gcy: ");
				raw1_before = createElement('noscript');
				label.className = "svelte-1dvwfeg";
				addLoc(label, file$v, 30, 4, 522);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, text0);
				append(label, raw0_before);
				raw0_before.insertAdjacentHTML("afterend", raw0_value);
				append(label, raw0_after);
				append(label, text1);
				append(label, raw1_before);
				raw1_before.insertAdjacentHTML("afterend", raw1_value);
			},

			p: function update(changed, ctx) {
				if ((changed.gcx) && raw0_value !== (raw0_value = ctx.gcx.toPrecision(4))) {
					detachBetween(raw0_before, raw0_after);
					raw0_before.insertAdjacentHTML("afterend", raw0_value);
				}

				if ((changed.gcy) && raw1_value !== (raw1_value = ctx.gcy.toPrecision(4))) {
					detachAfter(raw1_before);
					raw1_before.insertAdjacentHTML("afterend", raw1_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(label);
				}
			}
		};
	}

	function VerticalLayerAnnotation(options) {
		this._debugName = '<VerticalLayerAnnotation>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$p(), options.data);
		if (!('layerName' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'gridSize'");
		if (!('homeX' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'homeX'");
		if (!('homeY' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'homeY'");
		if (!('homeScale' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'homeScale'");
		if (!('aspectRatio' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'aspectRatio'");
		if (!('scale' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'scale'");
		if (!('gcx' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'gcy'");
		if (!('showLabels' in this._state)) console.warn("<VerticalLayerAnnotation> was created without expected data property 'showLabels'");
		this._intro = true;

		this._fragment = create_main_fragment$w(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(VerticalLayerAnnotation.prototype, protoDev);

	VerticalLayerAnnotation.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/AtlasStack.html generated by Svelte v2.15.3 */

	function data$q() { return {
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
	  ]
	}; }
	const file$w = "src/AtlasStack.html";

	function get_each_context$8(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.layer = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$x(component, ctx) {
		var div;

		var each_value = ctx.layers;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$9(component, get_each_context$8(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "stack svelte-1wgfm4";
				addLoc(div, file$w, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.layerName || changed.layers) {
					each_value = ctx.layers;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$8(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$9(component, child_ctx);
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
	function create_each_block$9(component, ctx) {
		var label, input, input_value_value, text0, span, text1_value = ctx.layer, text1, text2, text3, label_class_value;

		function input_change_handler() {
			component.set({ layerName: input.__value });
		}

		var atlasthumbnail_initial_data = { layerName: ctx.layer };
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
				span = createElement("span");
				text1 = createText(text1_value);
				text2 = createText("\n    ");
				atlasthumbnail._fragment.c();
				text3 = createText("\n  ");
				component._bindingGroups[0].push(input);
				addListener(input, "change", input_change_handler);
				setAttribute(input, "type", "radio");
				input.__value = input_value_value = ctx.layer;
				input.value = input.__value;
				input.className = "svelte-1wgfm4";
				addLoc(input, file$w, 3, 4, 114);
				addLoc(span, file$w, 4, 4, 172);
				label.className = label_class_value = "layer " + (ctx.layerName == ctx.layer ? 'selected' : '') + " svelte-1wgfm4";
				addLoc(label, file$w, 2, 2, 49);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, input);

				input.checked = input.__value === ctx.layerName;

				append(label, text0);
				append(label, span);
				append(span, text1);
				append(label, text2);
				atlasthumbnail._mount(label, null);
				append(label, text3);
			},

			p: function update(changed, ctx) {
				if (changed.layerName) input.checked = input.__value === ctx.layerName;
				if ((changed.layers) && input_value_value !== (input_value_value = ctx.layer)) {
					input.__value = input_value_value;
				}

				input.value = input.__value;
				if ((changed.layers) && text1_value !== (text1_value = ctx.layer)) {
					setData(text1, text1_value);
				}

				var atlasthumbnail_changes = {};
				if (changed.layers) atlasthumbnail_changes.layerName = ctx.layer;
				atlasthumbnail._set(atlasthumbnail_changes);

				if ((changed.layerName || changed.layers) && label_class_value !== (label_class_value = "layer " + (ctx.layerName == ctx.layer ? 'selected' : '') + " svelte-1wgfm4")) {
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

	function AtlasStack(options) {
		this._debugName = '<AtlasStack>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$q(), options.data);
		if (!('layers' in this._state)) console.warn("<AtlasStack> was created without expected data property 'layers'");
		if (!('layerName' in this._state)) console.warn("<AtlasStack> was created without expected data property 'layerName'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._fragment = create_main_fragment$x(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(AtlasStack.prototype, protoDev);

	AtlasStack.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/AllLayerComparison.html generated by Svelte v2.15.3 */

	function data$r() {
	  return {
	    layerName: "mixed4a",
	    gridSize: 0
	  }
	}
	const file$x = "src/diagrams/AllLayerComparison.html";

	function create_main_fragment$y(component, ctx) {
		var div0, label0, input0, text0, text1, label1, input1, text2, text3, label2, input2, text4, text5, label3, input3, text6, text7, label4, input4, text8, text9, label5, input5, text10, text11, div3, div1, atlasstack_updating = {}, text12, div2, atlas_updating = {};

		function input0_change_handler() {
			component.set({ gridSize: input0.__value });
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
			component.set({ showLabels: input5.checked });
		}

		var atlasstack_initial_data = {};
		if (ctx.LayerName !== void 0) {
			atlasstack_initial_data.LayerName = ctx.LayerName;
			atlasstack_updating.LayerName = true;
		}
		var atlasstack = new AtlasStack({
			root: component.root,
			store: component.store,
			data: atlasstack_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasstack_updating.LayerName && changed.LayerName) {
					newState.LayerName = childState.LayerName;
				}
				component._set(newState);
				atlasstack_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasstack._bind({ LayerName: 1 }, atlasstack.get());
		});

		var atlas_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	showHoverImage: "1"
		 };
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
		var atlas = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}
				component._set(newState);
				atlas_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas._bind({ gridSize: 1, showLabels: 1 }, atlas.get());
		});

		return {
			c: function create() {
				div0 = createElement("div");
				label0 = createElement("label");
				input0 = createElement("input");
				text0 = createText(" 0");
				text1 = createText("\n  ");
				label1 = createElement("label");
				input1 = createElement("input");
				text2 = createText(" 1");
				text3 = createText("\n  ");
				label2 = createElement("label");
				input2 = createElement("input");
				text4 = createText(" 2");
				text5 = createText("\n  ");
				label3 = createElement("label");
				input3 = createElement("input");
				text6 = createText(" 3");
				text7 = createText("\n  ");
				label4 = createElement("label");
				input4 = createElement("input");
				text8 = createText(" 4");
				text9 = createText("\n|\n  ");
				label5 = createElement("label");
				input5 = createElement("input");
				text10 = createText(" show labels");
				text11 = createText("\n");
				div3 = createElement("div");
				div1 = createElement("div");
				atlasstack._fragment.c();
				text12 = createText("\n  ");
				div2 = createElement("div");
				atlas._fragment.c();
				component._bindingGroups[0].push(input0);
				addListener(input0, "change", input0_change_handler);
				setAttribute(input0, "type", "radio");
				input0.__value = 0;
				input0.value = input0.__value;
				addLoc(input0, file$x, 2, 9, 66);
				addLoc(label0, file$x, 2, 2, 59);
				component._bindingGroups[0].push(input1);
				addListener(input1, "change", input1_change_handler);
				setAttribute(input1, "type", "radio");
				input1.__value = 1;
				input1.value = input1.__value;
				addLoc(input1, file$x, 3, 9, 134);
				addLoc(label1, file$x, 3, 2, 127);
				component._bindingGroups[0].push(input2);
				addListener(input2, "change", input2_change_handler);
				setAttribute(input2, "type", "radio");
				input2.__value = 2;
				input2.value = input2.__value;
				addLoc(input2, file$x, 4, 9, 202);
				addLoc(label2, file$x, 4, 2, 195);
				component._bindingGroups[0].push(input3);
				addListener(input3, "change", input3_change_handler);
				setAttribute(input3, "type", "radio");
				input3.__value = 3;
				input3.value = input3.__value;
				addLoc(input3, file$x, 5, 9, 270);
				addLoc(label3, file$x, 5, 2, 263);
				component._bindingGroups[0].push(input4);
				addListener(input4, "change", input4_change_handler);
				setAttribute(input4, "type", "radio");
				input4.__value = 4;
				input4.value = input4.__value;
				addLoc(input4, file$x, 6, 9, 338);
				addLoc(label4, file$x, 6, 2, 331);
				addListener(input5, "change", input5_change_handler);
				setAttribute(input5, "type", "checkbox");
				addLoc(input5, file$x, 8, 9, 408);
				addLoc(label5, file$x, 8, 2, 401);
				setStyle(div0, "grid-column", "text/screen-end");
				div0.className = "svelte-1m8cpqe svelte-ref-controls";
				addLoc(div0, file$x, 1, 0, 1);
				div1.className = "stack";
				addLoc(div1, file$x, 12, 2, 517);
				div2.className = "atlas svelte-1m8cpqe";
				addLoc(div2, file$x, 15, 2, 581);
				div3.className = "container svelte-1m8cpqe";
				addLoc(div3, file$x, 11, 0, 482);
			},

			m: function mount(target, anchor) {
				insert(target, div0, anchor);
				append(div0, label0);
				append(label0, input0);

				input0.checked = input0.__value === ctx.gridSize;

				append(label0, text0);
				append(div0, text1);
				append(div0, label1);
				append(label1, input1);

				input1.checked = input1.__value === ctx.gridSize;

				append(label1, text2);
				append(div0, text3);
				append(div0, label2);
				append(label2, input2);

				input2.checked = input2.__value === ctx.gridSize;

				append(label2, text4);
				append(div0, text5);
				append(div0, label3);
				append(label3, input3);

				input3.checked = input3.__value === ctx.gridSize;

				append(label3, text6);
				append(div0, text7);
				append(div0, label4);
				append(label4, input4);

				input4.checked = input4.__value === ctx.gridSize;

				append(label4, text8);
				append(div0, text9);
				append(div0, label5);
				append(label5, input5);

				input5.checked = ctx.showLabels;

				append(label5, text10);
				component.refs.controls = div0;
				insert(target, text11, anchor);
				insert(target, div3, anchor);
				append(div3, div1);
				atlasstack._mount(div1, null);
				append(div3, text12);
				append(div3, div2);
				atlas._mount(div2, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if (changed.gridSize) input0.checked = input0.__value === ctx.gridSize;
				if (changed.gridSize) input1.checked = input1.__value === ctx.gridSize;
				if (changed.gridSize) input2.checked = input2.__value === ctx.gridSize;
				if (changed.gridSize) input3.checked = input3.__value === ctx.gridSize;
				if (changed.gridSize) input4.checked = input4.__value === ctx.gridSize;
				if (changed.showLabels) input5.checked = ctx.showLabels;

				var atlasstack_changes = {};
				if (!atlasstack_updating.LayerName && changed.LayerName) {
					atlasstack_changes.LayerName = ctx.LayerName;
					atlasstack_updating.LayerName = ctx.LayerName !== void 0;
				}
				atlasstack._set(atlasstack_changes);
				atlasstack_updating = {};

				var atlas_changes = {};
				if (changed.layerName) atlas_changes.id = "inceptionv1_" + ctx.layerName;
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
				atlas._set(atlas_changes);
				atlas_updating = {};
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div0);
				}

				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input0), 1);
				removeListener(input0, "change", input0_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input1), 1);
				removeListener(input1, "change", input1_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input2), 1);
				removeListener(input2, "change", input2_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input3), 1);
				removeListener(input3, "change", input3_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input4), 1);
				removeListener(input4, "change", input4_change_handler);
				removeListener(input5, "change", input5_change_handler);
				if (component.refs.controls === div0) component.refs.controls = null;
				if (detach) {
					detachNode(text11);
					detachNode(div3);
				}

				atlasstack.destroy();
				atlas.destroy();
			}
		};
	}

	function AllLayerComparison(options) {
		this._debugName = '<AllLayerComparison>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$r(), options.data);
		if (!('gridSize' in this._state)) console.warn("<AllLayerComparison> was created without expected data property 'gridSize'");
		if (!('showLabels' in this._state)) console.warn("<AllLayerComparison> was created without expected data property 'showLabels'");
		if (!('LayerName' in this._state)) console.warn("<AllLayerComparison> was created without expected data property 'LayerName'");
		if (!('layerName' in this._state)) console.warn("<AllLayerComparison> was created without expected data property 'layerName'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._fragment = create_main_fragment$y(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(AllLayerComparison.prototype, protoDev);

	AllLayerComparison.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Focus1.html generated by Svelte v2.15.3 */

	function data$s() {
	  return {
	    layerName: "mixed5b",
	    gridSize: 1,
	    classHeatmap: 235,
	    homeX: 0.844,
	    homeY: 0.510,
	    homeScale: 6
	  }
	}
	const file$y = "src/diagrams/Focus1.html";

	function create_main_fragment$z(component, ctx) {
		var div4, div0, atlas0_updating = {}, text0, atlasreticle_updating = {}, text1, div3, div1, atlas1_updating = {}, text2, div2;

		var atlas0_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2"
		 };
		if (ctx.gridSize
	     !== void 0) {
			atlas0_initial_data.gridSize = ctx.gridSize
	    ;
			atlas0_updating.gridSize = true;
		}
		if (ctx.showLabels
	     !== void 0) {
			atlas0_initial_data.showLabels = ctx.showLabels
	    ;
			atlas0_updating.showLabels = true;
		}
		if (ctx.classHeatmap
	   !== void 0) {
			atlas0_initial_data.classHeatmap = ctx.classHeatmap
	  ;
			atlas0_updating.classHeatmap = true;
		}
		var atlas0 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas0_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas0_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas0_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas0_updating.classHeatmap && changed.classHeatmap) {
					newState.classHeatmap = childState.classHeatmap;
				}
				component._set(newState);
				atlas0_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas0._bind({ gridSize: 1, showLabels: 1, classHeatmap: 1 }, atlas0.get());
		});

		var atlasreticle_initial_data = {
		 	background: false,
		 	round: true,
		 	enableDragging: false
		 };
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

		var atlas1_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas1_initial_data.gridSize = ctx.gridSize
	        ;
			atlas1_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas1_initial_data.showLabels = ctx.showLabels
	        ;
			atlas1_updating.showLabels = true;
		}
		if (ctx.classHeatmap
	         !== void 0) {
			atlas1_initial_data.classHeatmap = ctx.classHeatmap
	        ;
			atlas1_updating.classHeatmap = true;
		}
		if (ctx.homeX 
	         !== void 0) {
			atlas1_initial_data.homeX = ctx.homeX 
	        ;
			atlas1_updating.homeX = true;
		}
		if (ctx.homeY 
	         !== void 0) {
			atlas1_initial_data.homeY = ctx.homeY 
	        ;
			atlas1_updating.homeY = true;
		}
		if (ctx.homeScale
	         !== void 0) {
			atlas1_initial_data.homeScale = ctx.homeScale
	        ;
			atlas1_updating.homeScale = true;
		}
		if (ctx.aspectRatio
	         !== void 0) {
			atlas1_initial_data.aspectRatio = ctx.aspectRatio
	        ;
			atlas1_updating.aspectRatio = true;
		}
		if (ctx.scale
	         !== void 0) {
			atlas1_initial_data.scale = ctx.scale
	        ;
			atlas1_updating.scale = true;
		}
		if (ctx.gcx
	         !== void 0) {
			atlas1_initial_data.gcx = ctx.gcx
	        ;
			atlas1_updating.gcx = true;
		}
		if (ctx.gcy
	       !== void 0) {
			atlas1_initial_data.gcy = ctx.gcy
	      ;
			atlas1_updating.gcy = true;
		}
		var atlas1 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas1_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas1_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas1_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas1_updating.classHeatmap && changed.classHeatmap) {
					newState.classHeatmap = childState.classHeatmap;
				}

				if (!atlas1_updating.homeX && changed.homeX) {
					newState.homeX = childState.homeX;
				}

				if (!atlas1_updating.homeY && changed.homeY) {
					newState.homeY = childState.homeY;
				}

				if (!atlas1_updating.homeScale && changed.homeScale) {
					newState.homeScale = childState.homeScale;
				}

				if (!atlas1_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio = childState.aspectRatio;
				}

				if (!atlas1_updating.scale && changed.scale) {
					newState.scale = childState.scale;
				}

				if (!atlas1_updating.gcx && changed.gcx) {
					newState.gcx = childState.gcx;
				}

				if (!atlas1_updating.gcy && changed.gcy) {
					newState.gcy = childState.gcy;
				}
				component._set(newState);
				atlas1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas1._bind({ gridSize: 1, showLabels: 1, classHeatmap: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas1.get());
		});

		return {
			c: function create() {
				div4 = createElement("div");
				div0 = createElement("div");
				atlas0._fragment.c();
				text0 = createText("\n  ");
				atlasreticle._fragment.c();
				text1 = createText("\n  ");
				div3 = createElement("div");
				div1 = createElement("div");
				atlas1._fragment.c();
				text2 = createText("\n    ");
				div2 = createElement("div");
				div2.textContent = "When we map opacity to the amount that each activation contributes to \"fireboat\", we see a main cluster of icons showing red boats and splashing, spraying water. While there are some stray areas elsewhere, it seems that this is region of the atlas that is dedicated specifically to classifying red boats with splashing water nearby.";
				div0.className = "atlas svelte-xuwjkq";
				addLoc(div0, file$y, 1, 2, 22);
				div1.className = "detail svelte-xuwjkq";
				addLoc(div1, file$y, 22, 4, 409);
				div2.className = "figcaption svelte-xuwjkq";
				addLoc(div2, file$y, 43, 4, 894);
				div3.className = "details";
				addLoc(div3, file$y, 21, 2, 383);
				div4.className = "focus svelte-xuwjkq";
				addLoc(div4, file$y, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div0);
				atlas0._mount(div0, null);
				append(div0, text0);
				atlasreticle._mount(div0, null);
				append(div4, text1);
				append(div4, div3);
				append(div3, div1);
				atlas1._mount(div1, null);
				append(div3, text2);
				append(div3, div2);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlas0_changes = {};
				if (changed.layerName) atlas0_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas0_updating.gridSize && changed.gridSize) {
					atlas0_changes.gridSize = ctx.gridSize
	    ;
					atlas0_updating.gridSize = ctx.gridSize
	     !== void 0;
				}
				if (!atlas0_updating.showLabels && changed.showLabels) {
					atlas0_changes.showLabels = ctx.showLabels
	    ;
					atlas0_updating.showLabels = ctx.showLabels
	     !== void 0;
				}
				if (!atlas0_updating.classHeatmap && changed.classHeatmap) {
					atlas0_changes.classHeatmap = ctx.classHeatmap
	  ;
					atlas0_updating.classHeatmap = ctx.classHeatmap
	   !== void 0;
				}
				atlas0._set(atlas0_changes);
				atlas0_updating = {};

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

				var atlas1_changes = {};
				if (changed.layerName) atlas1_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas1_updating.gridSize && changed.gridSize) {
					atlas1_changes.gridSize = ctx.gridSize
	        ;
					atlas1_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas1_updating.showLabels && changed.showLabels) {
					atlas1_changes.showLabels = ctx.showLabels
	        ;
					atlas1_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas1_updating.classHeatmap && changed.classHeatmap) {
					atlas1_changes.classHeatmap = ctx.classHeatmap
	        ;
					atlas1_updating.classHeatmap = ctx.classHeatmap
	         !== void 0;
				}
				if (!atlas1_updating.homeX && changed.homeX) {
					atlas1_changes.homeX = ctx.homeX 
	        ;
					atlas1_updating.homeX = ctx.homeX 
	         !== void 0;
				}
				if (!atlas1_updating.homeY && changed.homeY) {
					atlas1_changes.homeY = ctx.homeY 
	        ;
					atlas1_updating.homeY = ctx.homeY 
	         !== void 0;
				}
				if (!atlas1_updating.homeScale && changed.homeScale) {
					atlas1_changes.homeScale = ctx.homeScale
	        ;
					atlas1_updating.homeScale = ctx.homeScale
	         !== void 0;
				}
				if (!atlas1_updating.aspectRatio && changed.aspectRatio) {
					atlas1_changes.aspectRatio = ctx.aspectRatio
	        ;
					atlas1_updating.aspectRatio = ctx.aspectRatio
	         !== void 0;
				}
				if (!atlas1_updating.scale && changed.scale) {
					atlas1_changes.scale = ctx.scale
	        ;
					atlas1_updating.scale = ctx.scale
	         !== void 0;
				}
				if (!atlas1_updating.gcx && changed.gcx) {
					atlas1_changes.gcx = ctx.gcx
	        ;
					atlas1_updating.gcx = ctx.gcx
	         !== void 0;
				}
				if (!atlas1_updating.gcy && changed.gcy) {
					atlas1_changes.gcy = ctx.gcy
	      ;
					atlas1_updating.gcy = ctx.gcy
	       !== void 0;
				}
				atlas1._set(atlas1_changes);
				atlas1_updating = {};
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div4);
				}

				atlas0.destroy();
				atlasreticle.destroy();
				atlas1.destroy();
			}
		};
	}

	function Focus1(options) {
		this._debugName = '<Focus1>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$s(), options.data);
		if (!('layerName' in this._state)) console.warn("<Focus1> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<Focus1> was created without expected data property 'gridSize'");
		if (!('showLabels' in this._state)) console.warn("<Focus1> was created without expected data property 'showLabels'");
		if (!('classHeatmap' in this._state)) console.warn("<Focus1> was created without expected data property 'classHeatmap'");
		if (!('aspectRatio' in this._state)) console.warn("<Focus1> was created without expected data property 'aspectRatio'");
		if (!('scale' in this._state)) console.warn("<Focus1> was created without expected data property 'scale'");
		if (!('gcx' in this._state)) console.warn("<Focus1> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<Focus1> was created without expected data property 'gcy'");
		if (!('homeX' in this._state)) console.warn("<Focus1> was created without expected data property 'homeX'");
		if (!('homeY' in this._state)) console.warn("<Focus1> was created without expected data property 'homeY'");
		if (!('homeScale' in this._state)) console.warn("<Focus1> was created without expected data property 'homeScale'");
		this._intro = true;

		this._fragment = create_main_fragment$z(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Focus1.prototype, protoDev);

	Focus1.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/components/Loupe.html generated by Svelte v2.15.3 */

	function data$t() {
	  return {
	    label: "",
	    width: 0,
	    height: 0,
	    color: "#ff6600"
	  }
	}
	const file$z = "src/components/Loupe.html";

	function create_main_fragment$A(component, ctx) {
		var div2, div0, slot_content_default = component._slotted.default, text0, div1, text1;

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				text0 = createText("\n  ");
				div1 = createElement("div");
				text1 = createText(ctx.label);
				div0.className = "loupe svelte-1hgfn8v";
				setStyle(div0, "border-color", ctx.color);
				addLoc(div0, file$z, 1, 2, 67);
				div1.className = "label svelte-1hgfn8v";
				setStyle(div1, "background-color", ctx.color);
				addLoc(div1, file$z, 4, 2, 146);
				div2.className = "root svelte-1hgfn8v";
				setStyle(div2, "width", "" + ctx.width + "px");
				setStyle(div2, "height", "" + ctx.height + "px");
				addLoc(div2, file$z, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);

				if (slot_content_default) {
					append(div0, slot_content_default);
				}

				append(div2, text0);
				append(div2, div1);
				append(div1, text1);
			},

			p: function update(changed, ctx) {
				if (changed.color) {
					setStyle(div0, "border-color", ctx.color);
				}

				if (changed.label) {
					setData(text1, ctx.label);
				}

				if (changed.color) {
					setStyle(div1, "background-color", ctx.color);
				}

				if (changed.width) {
					setStyle(div2, "width", "" + ctx.width + "px");
				}

				if (changed.height) {
					setStyle(div2, "height", "" + ctx.height + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div2);
				}

				if (slot_content_default) {
					reinsertChildren(div0, slot_content_default);
				}
			}
		};
	}

	function Loupe(options) {
		this._debugName = '<Loupe>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$t(), options.data);
		if (!('width' in this._state)) console.warn("<Loupe> was created without expected data property 'width'");
		if (!('height' in this._state)) console.warn("<Loupe> was created without expected data property 'height'");
		if (!('color' in this._state)) console.warn("<Loupe> was created without expected data property 'color'");
		if (!('label' in this._state)) console.warn("<Loupe> was created without expected data property 'label'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$A(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Loupe.prototype, protoDev);

	Loupe.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Focus2.html generated by Svelte v2.15.3 */

	function data$u() {
	  return {
	    loupeSize: 245,
	    layerName: "mixed4d",
	    gridSize: 1,
	    classHeatmap: 235,
	    highlights: [
	      {
	        homeX: 0.221,
	        homeY: 0.138,
	        homeScale: 10
	      },
	      {
	        homeX: 0.709,
	        homeY: 0.421,
	        homeScale: 10
	      },
	      {
	        homeX: 0.873,
	        homeY: 0.415,
	        homeScale: 10
	      },
	      {
	        homeX: 0.789,
	        homeY: 0.861,
	        homeScale: 10
	      }
	    ]

	  }
	}
	const file$A = "src/diagrams/Focus2.html";

	function create_main_fragment$B(component, ctx) {
		var div3, div0, atlas0_updating = {}, text0, atlasreticle0_updating = {}, text1, atlasreticle1_updating = {}, text2, atlasreticle2_updating = {}, text3, div2, atlas1_updating = {}, text4, atlas2_updating = {}, text5, atlas3_updating = {}, text6, div1, text7, text8, text9;

		var atlas0_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2"
		 };
		if (ctx.gridSize
	       !== void 0) {
			atlas0_initial_data.gridSize = ctx.gridSize
	      ;
			atlas0_updating.gridSize = true;
		}
		if (ctx.showLabels
	       !== void 0) {
			atlas0_initial_data.showLabels = ctx.showLabels
	      ;
			atlas0_updating.showLabels = true;
		}
		if (ctx.classHeatmap
	     !== void 0) {
			atlas0_initial_data.classHeatmap = ctx.classHeatmap
	    ;
			atlas0_updating.classHeatmap = true;
		}
		var atlas0 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas0_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas0_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas0_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas0_updating.classHeatmap && changed.classHeatmap) {
					newState.classHeatmap = childState.classHeatmap;
				}
				component._set(newState);
				atlas0_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas0._bind({ gridSize: 1, showLabels: 1, classHeatmap: 1 }, atlas0.get());
		});

		var atlasreticle0_initial_data = {
		 	background: false,
		 	enableDragging: false,
		 	round: true,
		 	annotationValue: 1
		 };
		if (ctx.aspectRatio0 !== void 0) {
			atlasreticle0_initial_data.aspectRatio = ctx.aspectRatio0;
			atlasreticle0_updating.aspectRatio = true;
		}
		if (ctx.scale0 !== void 0) {
			atlasreticle0_initial_data.scale = ctx.scale0;
			atlasreticle0_updating.scale = true;
		}
		if (ctx.gcx0 !== void 0) {
			atlasreticle0_initial_data.gcx = ctx.gcx0;
			atlasreticle0_updating.gcx = true;
		}
		if (ctx.gcy0 !== void 0) {
			atlasreticle0_initial_data.gcy = ctx.gcy0;
			atlasreticle0_updating.gcy = true;
		}
		var atlasreticle0 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle0_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasreticle0_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio0 = childState.aspectRatio;
				}

				if (!atlasreticle0_updating.scale && changed.scale) {
					newState.scale0 = childState.scale;
				}

				if (!atlasreticle0_updating.gcx && changed.gcx) {
					newState.gcx0 = childState.gcx;
				}

				if (!atlasreticle0_updating.gcy && changed.gcy) {
					newState.gcy0 = childState.gcy;
				}
				component._set(newState);
				atlasreticle0_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle0._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle0.get());
		});

		var atlasreticle1_initial_data = {
		 	background: false,
		 	enableDragging: false,
		 	round: true,
		 	annotationValue: 2
		 };
		if (ctx.aspectRatio1 !== void 0) {
			atlasreticle1_initial_data.aspectRatio = ctx.aspectRatio1;
			atlasreticle1_updating.aspectRatio = true;
		}
		if (ctx.scale1 !== void 0) {
			atlasreticle1_initial_data.scale = ctx.scale1;
			atlasreticle1_updating.scale = true;
		}
		if (ctx.gcx1 !== void 0) {
			atlasreticle1_initial_data.gcx = ctx.gcx1;
			atlasreticle1_updating.gcx = true;
		}
		if (ctx.gcy1 !== void 0) {
			atlasreticle1_initial_data.gcy = ctx.gcy1;
			atlasreticle1_updating.gcy = true;
		}
		var atlasreticle1 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle1_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasreticle1_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio1 = childState.aspectRatio;
				}

				if (!atlasreticle1_updating.scale && changed.scale) {
					newState.scale1 = childState.scale;
				}

				if (!atlasreticle1_updating.gcx && changed.gcx) {
					newState.gcx1 = childState.gcx;
				}

				if (!atlasreticle1_updating.gcy && changed.gcy) {
					newState.gcy1 = childState.gcy;
				}
				component._set(newState);
				atlasreticle1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle1._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle1.get());
		});

		var atlasreticle2_initial_data = {
		 	background: false,
		 	enableDragging: false,
		 	round: true,
		 	annotationValue: 3
		 };
		if (ctx.aspectRatio2 !== void 0) {
			atlasreticle2_initial_data.aspectRatio = ctx.aspectRatio2;
			atlasreticle2_updating.aspectRatio = true;
		}
		if (ctx.scale2 !== void 0) {
			atlasreticle2_initial_data.scale = ctx.scale2;
			atlasreticle2_updating.scale = true;
		}
		if (ctx.gcx2 !== void 0) {
			atlasreticle2_initial_data.gcx = ctx.gcx2;
			atlasreticle2_updating.gcx = true;
		}
		if (ctx.gcy2 !== void 0) {
			atlasreticle2_initial_data.gcy = ctx.gcy2;
			atlasreticle2_updating.gcy = true;
		}
		var atlasreticle2 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle2_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasreticle2_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio2 = childState.aspectRatio;
				}

				if (!atlasreticle2_updating.scale && changed.scale) {
					newState.scale2 = childState.scale;
				}

				if (!atlasreticle2_updating.gcx && changed.gcx) {
					newState.gcx2 = childState.gcx;
				}

				if (!atlasreticle2_updating.gcy && changed.gcy) {
					newState.gcy2 = childState.gcy;
				}
				component._set(newState);
				atlasreticle2_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle2._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle2.get());
		});

		var atlas1_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas1_initial_data.gridSize = ctx.gridSize
	        ;
			atlas1_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas1_initial_data.showLabels = ctx.showLabels
	        ;
			atlas1_updating.showLabels = true;
		}
		if (ctx.classHeatmap
	         !== void 0) {
			atlas1_initial_data.classHeatmap = ctx.classHeatmap
	        ;
			atlas1_updating.classHeatmap = true;
		}
		if (ctx.highlights[0].homeX !== void 0) {
			atlas1_initial_data.homeX = ctx.highlights[0].homeX;
			atlas1_updating.homeX = true;
		}
		if (ctx.highlights[0].homeY !== void 0) {
			atlas1_initial_data.homeY = ctx.highlights[0].homeY;
			atlas1_updating.homeY = true;
		}
		if (ctx.highlights[0].homeScale !== void 0) {
			atlas1_initial_data.homeScale = ctx.highlights[0].homeScale;
			atlas1_updating.homeScale = true;
		}
		if (ctx.aspectRatio0 !== void 0) {
			atlas1_initial_data.aspectRatio = ctx.aspectRatio0;
			atlas1_updating.aspectRatio = true;
		}
		if (ctx.scale0 !== void 0) {
			atlas1_initial_data.scale = ctx.scale0;
			atlas1_updating.scale = true;
		}
		if (ctx.gcx0 !== void 0) {
			atlas1_initial_data.gcx = ctx.gcx0;
			atlas1_updating.gcx = true;
		}
		if (ctx.gcy0 !== void 0) {
			atlas1_initial_data.gcy = ctx.gcy0;
			atlas1_updating.gcy = true;
		}
		var atlas1 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas1_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas1_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas1_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas1_updating.classHeatmap && changed.classHeatmap) {
					newState.classHeatmap = childState.classHeatmap;
				}

				if (!atlas1_updating.homeX && changed.homeX) {
					ctx.highlights[0].homeX = childState.homeX;
					newState.highlights = ctx.highlights;
				}

				if (!atlas1_updating.homeY && changed.homeY) {
					ctx.highlights[0].homeY = childState.homeY;
					newState.highlights = ctx.highlights;
				}

				if (!atlas1_updating.homeScale && changed.homeScale) {
					ctx.highlights[0].homeScale = childState.homeScale;
					newState.highlights = ctx.highlights;
				}

				if (!atlas1_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio0 = childState.aspectRatio;
				}

				if (!atlas1_updating.scale && changed.scale) {
					newState.scale0 = childState.scale;
				}

				if (!atlas1_updating.gcx && changed.gcx) {
					newState.gcx0 = childState.gcx;
				}

				if (!atlas1_updating.gcy && changed.gcy) {
					newState.gcy0 = childState.gcy;
				}
				component._set(newState);
				atlas1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas1._bind({ gridSize: 1, showLabels: 1, classHeatmap: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas1.get());
		});

		var loupe0_initial_data = {
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 1
		 };
		var loupe0 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe0_initial_data
		});

		var atlas2_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas2_initial_data.gridSize = ctx.gridSize
	        ;
			atlas2_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas2_initial_data.showLabels = ctx.showLabels
	        ;
			atlas2_updating.showLabels = true;
		}
		if (ctx.classHeatmap
	         !== void 0) {
			atlas2_initial_data.classHeatmap = ctx.classHeatmap
	        ;
			atlas2_updating.classHeatmap = true;
		}
		if (ctx.highlights[1].homeX !== void 0) {
			atlas2_initial_data.homeX = ctx.highlights[1].homeX;
			atlas2_updating.homeX = true;
		}
		if (ctx.highlights[1].homeY !== void 0) {
			atlas2_initial_data.homeY = ctx.highlights[1].homeY;
			atlas2_updating.homeY = true;
		}
		if (ctx.highlights[1].homeScale !== void 0) {
			atlas2_initial_data.homeScale = ctx.highlights[1].homeScale;
			atlas2_updating.homeScale = true;
		}
		if (ctx.aspectRatio1 !== void 0) {
			atlas2_initial_data.aspectRatio = ctx.aspectRatio1;
			atlas2_updating.aspectRatio = true;
		}
		if (ctx.scale1 !== void 0) {
			atlas2_initial_data.scale = ctx.scale1;
			atlas2_updating.scale = true;
		}
		if (ctx.gcx1 !== void 0) {
			atlas2_initial_data.gcx = ctx.gcx1;
			atlas2_updating.gcx = true;
		}
		if (ctx.gcy1 !== void 0) {
			atlas2_initial_data.gcy = ctx.gcy1;
			atlas2_updating.gcy = true;
		}
		var atlas2 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas2_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas2_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas2_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas2_updating.classHeatmap && changed.classHeatmap) {
					newState.classHeatmap = childState.classHeatmap;
				}

				if (!atlas2_updating.homeX && changed.homeX) {
					ctx.highlights[1].homeX = childState.homeX;
					newState.highlights = ctx.highlights;
				}

				if (!atlas2_updating.homeY && changed.homeY) {
					ctx.highlights[1].homeY = childState.homeY;
					newState.highlights = ctx.highlights;
				}

				if (!atlas2_updating.homeScale && changed.homeScale) {
					ctx.highlights[1].homeScale = childState.homeScale;
					newState.highlights = ctx.highlights;
				}

				if (!atlas2_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio1 = childState.aspectRatio;
				}

				if (!atlas2_updating.scale && changed.scale) {
					newState.scale1 = childState.scale;
				}

				if (!atlas2_updating.gcx && changed.gcx) {
					newState.gcx1 = childState.gcx;
				}

				if (!atlas2_updating.gcy && changed.gcy) {
					newState.gcy1 = childState.gcy;
				}
				component._set(newState);
				atlas2_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas2._bind({ gridSize: 1, showLabels: 1, classHeatmap: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas2.get());
		});

		var loupe1_initial_data = {
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 2
		 };
		var loupe1 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe1_initial_data
		});

		var atlas3_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas3_initial_data.gridSize = ctx.gridSize
	        ;
			atlas3_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas3_initial_data.showLabels = ctx.showLabels
	        ;
			atlas3_updating.showLabels = true;
		}
		if (ctx.classHeatmap
	         !== void 0) {
			atlas3_initial_data.classHeatmap = ctx.classHeatmap
	        ;
			atlas3_updating.classHeatmap = true;
		}
		if (ctx.highlights[2].homeX !== void 0) {
			atlas3_initial_data.homeX = ctx.highlights[2].homeX;
			atlas3_updating.homeX = true;
		}
		if (ctx.highlights[2].homeY !== void 0) {
			atlas3_initial_data.homeY = ctx.highlights[2].homeY;
			atlas3_updating.homeY = true;
		}
		if (ctx.highlights[2].homeScale !== void 0) {
			atlas3_initial_data.homeScale = ctx.highlights[2].homeScale;
			atlas3_updating.homeScale = true;
		}
		if (ctx.aspectRatio2 !== void 0) {
			atlas3_initial_data.aspectRatio = ctx.aspectRatio2;
			atlas3_updating.aspectRatio = true;
		}
		if (ctx.scale2 !== void 0) {
			atlas3_initial_data.scale = ctx.scale2;
			atlas3_updating.scale = true;
		}
		if (ctx.gcx2 !== void 0) {
			atlas3_initial_data.gcx = ctx.gcx2;
			atlas3_updating.gcx = true;
		}
		if (ctx.gcy2 !== void 0) {
			atlas3_initial_data.gcy = ctx.gcy2;
			atlas3_updating.gcy = true;
		}
		var atlas3 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas3_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas3_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas3_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas3_updating.classHeatmap && changed.classHeatmap) {
					newState.classHeatmap = childState.classHeatmap;
				}

				if (!atlas3_updating.homeX && changed.homeX) {
					ctx.highlights[2].homeX = childState.homeX;
					newState.highlights = ctx.highlights;
				}

				if (!atlas3_updating.homeY && changed.homeY) {
					ctx.highlights[2].homeY = childState.homeY;
					newState.highlights = ctx.highlights;
				}

				if (!atlas3_updating.homeScale && changed.homeScale) {
					ctx.highlights[2].homeScale = childState.homeScale;
					newState.highlights = ctx.highlights;
				}

				if (!atlas3_updating.aspectRatio && changed.aspectRatio) {
					newState.aspectRatio2 = childState.aspectRatio;
				}

				if (!atlas3_updating.scale && changed.scale) {
					newState.scale2 = childState.scale;
				}

				if (!atlas3_updating.gcx && changed.gcx) {
					newState.gcx2 = childState.gcx;
				}

				if (!atlas3_updating.gcy && changed.gcy) {
					newState.gcy2 = childState.gcy;
				}
				component._set(newState);
				atlas3_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas3._bind({ gridSize: 1, showLabels: 1, classHeatmap: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas3.get());
		});

		var loupe2_initial_data = {
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 3
		 };
		var loupe2 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe2_initial_data
		});

		return {
			c: function create() {
				div3 = createElement("div");
				div0 = createElement("div");
				atlas0._fragment.c();
				text0 = createText("\n    ");
				atlasreticle0._fragment.c();
				text1 = createText("\n    ");
				atlasreticle1._fragment.c();
				text2 = createText("\n    ");
				atlasreticle2._fragment.c();
				text3 = createText("\n  ");
				div2 = createElement("div");
				atlas1._fragment.c();
				loupe0._fragment.c();
				text4 = createText("\n    ");
				atlas2._fragment.c();
				loupe1._fragment.c();
				text5 = createText("\n    ");
				atlas3._fragment.c();
				loupe2._fragment.c();
				text6 = createText("\n    ");
				div1 = createElement("div");
				text7 = createText("In ");
				text8 = createText(ctx.layerName);
				text9 = createText(" we see we see the attribution toward \"fireboat\" is high in several clusters located in different positions around the atlas. One is very focused on windows, another on geysers and splashing water, and yet another on crane-like objects.");
				div0.className = "atlas svelte-1luklhy";
				addLoc(div0, file$A, 1, 2, 22);
				div1.className = "figcaption svelte-1luklhy";
				addLoc(div1, file$A, 106, 4, 2858);
				div2.className = "details svelte-1luklhy";
				addLoc(div2, file$A, 42, 2, 945);
				div3.className = "focus svelte-1luklhy";
				addLoc(div3, file$A, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div0);
				atlas0._mount(div0, null);
				append(div0, text0);
				atlasreticle0._mount(div0, null);
				append(div0, text1);
				atlasreticle1._mount(div0, null);
				append(div0, text2);
				atlasreticle2._mount(div0, null);
				append(div3, text3);
				append(div3, div2);
				atlas1._mount(loupe0._slotted.default, null);
				loupe0._mount(div2, null);
				append(div2, text4);
				atlas2._mount(loupe1._slotted.default, null);
				loupe1._mount(div2, null);
				append(div2, text5);
				atlas3._mount(loupe2._slotted.default, null);
				loupe2._mount(div2, null);
				append(div2, text6);
				append(div2, div1);
				append(div1, text7);
				append(div1, text8);
				append(div1, text9);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlas0_changes = {};
				if (changed.layerName) atlas0_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas0_updating.gridSize && changed.gridSize) {
					atlas0_changes.gridSize = ctx.gridSize
	      ;
					atlas0_updating.gridSize = ctx.gridSize
	       !== void 0;
				}
				if (!atlas0_updating.showLabels && changed.showLabels) {
					atlas0_changes.showLabels = ctx.showLabels
	      ;
					atlas0_updating.showLabels = ctx.showLabels
	       !== void 0;
				}
				if (!atlas0_updating.classHeatmap && changed.classHeatmap) {
					atlas0_changes.classHeatmap = ctx.classHeatmap
	    ;
					atlas0_updating.classHeatmap = ctx.classHeatmap
	     !== void 0;
				}
				atlas0._set(atlas0_changes);
				atlas0_updating = {};

				var atlasreticle0_changes = {};
				if (!atlasreticle0_updating.aspectRatio && changed.aspectRatio0) {
					atlasreticle0_changes.aspectRatio = ctx.aspectRatio0;
					atlasreticle0_updating.aspectRatio = ctx.aspectRatio0 !== void 0;
				}
				if (!atlasreticle0_updating.scale && changed.scale0) {
					atlasreticle0_changes.scale = ctx.scale0;
					atlasreticle0_updating.scale = ctx.scale0 !== void 0;
				}
				if (!atlasreticle0_updating.gcx && changed.gcx0) {
					atlasreticle0_changes.gcx = ctx.gcx0;
					atlasreticle0_updating.gcx = ctx.gcx0 !== void 0;
				}
				if (!atlasreticle0_updating.gcy && changed.gcy0) {
					atlasreticle0_changes.gcy = ctx.gcy0;
					atlasreticle0_updating.gcy = ctx.gcy0 !== void 0;
				}
				atlasreticle0._set(atlasreticle0_changes);
				atlasreticle0_updating = {};

				var atlasreticle1_changes = {};
				if (!atlasreticle1_updating.aspectRatio && changed.aspectRatio1) {
					atlasreticle1_changes.aspectRatio = ctx.aspectRatio1;
					atlasreticle1_updating.aspectRatio = ctx.aspectRatio1 !== void 0;
				}
				if (!atlasreticle1_updating.scale && changed.scale1) {
					atlasreticle1_changes.scale = ctx.scale1;
					atlasreticle1_updating.scale = ctx.scale1 !== void 0;
				}
				if (!atlasreticle1_updating.gcx && changed.gcx1) {
					atlasreticle1_changes.gcx = ctx.gcx1;
					atlasreticle1_updating.gcx = ctx.gcx1 !== void 0;
				}
				if (!atlasreticle1_updating.gcy && changed.gcy1) {
					atlasreticle1_changes.gcy = ctx.gcy1;
					atlasreticle1_updating.gcy = ctx.gcy1 !== void 0;
				}
				atlasreticle1._set(atlasreticle1_changes);
				atlasreticle1_updating = {};

				var atlasreticle2_changes = {};
				if (!atlasreticle2_updating.aspectRatio && changed.aspectRatio2) {
					atlasreticle2_changes.aspectRatio = ctx.aspectRatio2;
					atlasreticle2_updating.aspectRatio = ctx.aspectRatio2 !== void 0;
				}
				if (!atlasreticle2_updating.scale && changed.scale2) {
					atlasreticle2_changes.scale = ctx.scale2;
					atlasreticle2_updating.scale = ctx.scale2 !== void 0;
				}
				if (!atlasreticle2_updating.gcx && changed.gcx2) {
					atlasreticle2_changes.gcx = ctx.gcx2;
					atlasreticle2_updating.gcx = ctx.gcx2 !== void 0;
				}
				if (!atlasreticle2_updating.gcy && changed.gcy2) {
					atlasreticle2_changes.gcy = ctx.gcy2;
					atlasreticle2_updating.gcy = ctx.gcy2 !== void 0;
				}
				atlasreticle2._set(atlasreticle2_changes);
				atlasreticle2_updating = {};

				var atlas1_changes = {};
				if (changed.layerName) atlas1_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas1_updating.gridSize && changed.gridSize) {
					atlas1_changes.gridSize = ctx.gridSize
	        ;
					atlas1_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas1_updating.showLabels && changed.showLabels) {
					atlas1_changes.showLabels = ctx.showLabels
	        ;
					atlas1_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas1_updating.classHeatmap && changed.classHeatmap) {
					atlas1_changes.classHeatmap = ctx.classHeatmap
	        ;
					atlas1_updating.classHeatmap = ctx.classHeatmap
	         !== void 0;
				}
				if (!atlas1_updating.homeX && changed.highlights) {
					atlas1_changes.homeX = ctx.highlights[0].homeX;
					atlas1_updating.homeX = ctx.highlights[0].homeX !== void 0;
				}
				if (!atlas1_updating.homeY && changed.highlights) {
					atlas1_changes.homeY = ctx.highlights[0].homeY;
					atlas1_updating.homeY = ctx.highlights[0].homeY !== void 0;
				}
				if (!atlas1_updating.homeScale && changed.highlights) {
					atlas1_changes.homeScale = ctx.highlights[0].homeScale;
					atlas1_updating.homeScale = ctx.highlights[0].homeScale !== void 0;
				}
				if (!atlas1_updating.aspectRatio && changed.aspectRatio0) {
					atlas1_changes.aspectRatio = ctx.aspectRatio0;
					atlas1_updating.aspectRatio = ctx.aspectRatio0 !== void 0;
				}
				if (!atlas1_updating.scale && changed.scale0) {
					atlas1_changes.scale = ctx.scale0;
					atlas1_updating.scale = ctx.scale0 !== void 0;
				}
				if (!atlas1_updating.gcx && changed.gcx0) {
					atlas1_changes.gcx = ctx.gcx0;
					atlas1_updating.gcx = ctx.gcx0 !== void 0;
				}
				if (!atlas1_updating.gcy && changed.gcy0) {
					atlas1_changes.gcy = ctx.gcy0;
					atlas1_updating.gcy = ctx.gcy0 !== void 0;
				}
				atlas1._set(atlas1_changes);
				atlas1_updating = {};

				var loupe0_changes = {};
				if (changed.loupeSize) loupe0_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe0_changes.height = ctx.loupeSize;
				loupe0._set(loupe0_changes);

				var atlas2_changes = {};
				if (changed.layerName) atlas2_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas2_updating.gridSize && changed.gridSize) {
					atlas2_changes.gridSize = ctx.gridSize
	        ;
					atlas2_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas2_updating.showLabels && changed.showLabels) {
					atlas2_changes.showLabels = ctx.showLabels
	        ;
					atlas2_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas2_updating.classHeatmap && changed.classHeatmap) {
					atlas2_changes.classHeatmap = ctx.classHeatmap
	        ;
					atlas2_updating.classHeatmap = ctx.classHeatmap
	         !== void 0;
				}
				if (!atlas2_updating.homeX && changed.highlights) {
					atlas2_changes.homeX = ctx.highlights[1].homeX;
					atlas2_updating.homeX = ctx.highlights[1].homeX !== void 0;
				}
				if (!atlas2_updating.homeY && changed.highlights) {
					atlas2_changes.homeY = ctx.highlights[1].homeY;
					atlas2_updating.homeY = ctx.highlights[1].homeY !== void 0;
				}
				if (!atlas2_updating.homeScale && changed.highlights) {
					atlas2_changes.homeScale = ctx.highlights[1].homeScale;
					atlas2_updating.homeScale = ctx.highlights[1].homeScale !== void 0;
				}
				if (!atlas2_updating.aspectRatio && changed.aspectRatio1) {
					atlas2_changes.aspectRatio = ctx.aspectRatio1;
					atlas2_updating.aspectRatio = ctx.aspectRatio1 !== void 0;
				}
				if (!atlas2_updating.scale && changed.scale1) {
					atlas2_changes.scale = ctx.scale1;
					atlas2_updating.scale = ctx.scale1 !== void 0;
				}
				if (!atlas2_updating.gcx && changed.gcx1) {
					atlas2_changes.gcx = ctx.gcx1;
					atlas2_updating.gcx = ctx.gcx1 !== void 0;
				}
				if (!atlas2_updating.gcy && changed.gcy1) {
					atlas2_changes.gcy = ctx.gcy1;
					atlas2_updating.gcy = ctx.gcy1 !== void 0;
				}
				atlas2._set(atlas2_changes);
				atlas2_updating = {};

				var loupe1_changes = {};
				if (changed.loupeSize) loupe1_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe1_changes.height = ctx.loupeSize;
				loupe1._set(loupe1_changes);

				var atlas3_changes = {};
				if (changed.layerName) atlas3_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas3_updating.gridSize && changed.gridSize) {
					atlas3_changes.gridSize = ctx.gridSize
	        ;
					atlas3_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas3_updating.showLabels && changed.showLabels) {
					atlas3_changes.showLabels = ctx.showLabels
	        ;
					atlas3_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas3_updating.classHeatmap && changed.classHeatmap) {
					atlas3_changes.classHeatmap = ctx.classHeatmap
	        ;
					atlas3_updating.classHeatmap = ctx.classHeatmap
	         !== void 0;
				}
				if (!atlas3_updating.homeX && changed.highlights) {
					atlas3_changes.homeX = ctx.highlights[2].homeX;
					atlas3_updating.homeX = ctx.highlights[2].homeX !== void 0;
				}
				if (!atlas3_updating.homeY && changed.highlights) {
					atlas3_changes.homeY = ctx.highlights[2].homeY;
					atlas3_updating.homeY = ctx.highlights[2].homeY !== void 0;
				}
				if (!atlas3_updating.homeScale && changed.highlights) {
					atlas3_changes.homeScale = ctx.highlights[2].homeScale;
					atlas3_updating.homeScale = ctx.highlights[2].homeScale !== void 0;
				}
				if (!atlas3_updating.aspectRatio && changed.aspectRatio2) {
					atlas3_changes.aspectRatio = ctx.aspectRatio2;
					atlas3_updating.aspectRatio = ctx.aspectRatio2 !== void 0;
				}
				if (!atlas3_updating.scale && changed.scale2) {
					atlas3_changes.scale = ctx.scale2;
					atlas3_updating.scale = ctx.scale2 !== void 0;
				}
				if (!atlas3_updating.gcx && changed.gcx2) {
					atlas3_changes.gcx = ctx.gcx2;
					atlas3_updating.gcx = ctx.gcx2 !== void 0;
				}
				if (!atlas3_updating.gcy && changed.gcy2) {
					atlas3_changes.gcy = ctx.gcy2;
					atlas3_updating.gcy = ctx.gcy2 !== void 0;
				}
				atlas3._set(atlas3_changes);
				atlas3_updating = {};

				var loupe2_changes = {};
				if (changed.loupeSize) loupe2_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe2_changes.height = ctx.loupeSize;
				loupe2._set(loupe2_changes);

				if (changed.layerName) {
					setData(text8, ctx.layerName);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div3);
				}

				atlas0.destroy();
				atlasreticle0.destroy();
				atlasreticle1.destroy();
				atlasreticle2.destroy();
				atlas1.destroy();
				loupe0.destroy();
				atlas2.destroy();
				loupe1.destroy();
				atlas3.destroy();
				loupe2.destroy();
			}
		};
	}

	function Focus2(options) {
		this._debugName = '<Focus2>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$u(), options.data);
		if (!('layerName' in this._state)) console.warn("<Focus2> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<Focus2> was created without expected data property 'gridSize'");
		if (!('showLabels' in this._state)) console.warn("<Focus2> was created without expected data property 'showLabels'");
		if (!('classHeatmap' in this._state)) console.warn("<Focus2> was created without expected data property 'classHeatmap'");
		if (!('aspectRatio0' in this._state)) console.warn("<Focus2> was created without expected data property 'aspectRatio0'");
		if (!('scale0' in this._state)) console.warn("<Focus2> was created without expected data property 'scale0'");
		if (!('gcx0' in this._state)) console.warn("<Focus2> was created without expected data property 'gcx0'");
		if (!('gcy0' in this._state)) console.warn("<Focus2> was created without expected data property 'gcy0'");
		if (!('aspectRatio1' in this._state)) console.warn("<Focus2> was created without expected data property 'aspectRatio1'");
		if (!('scale1' in this._state)) console.warn("<Focus2> was created without expected data property 'scale1'");
		if (!('gcx1' in this._state)) console.warn("<Focus2> was created without expected data property 'gcx1'");
		if (!('gcy1' in this._state)) console.warn("<Focus2> was created without expected data property 'gcy1'");
		if (!('aspectRatio2' in this._state)) console.warn("<Focus2> was created without expected data property 'aspectRatio2'");
		if (!('scale2' in this._state)) console.warn("<Focus2> was created without expected data property 'scale2'");
		if (!('gcx2' in this._state)) console.warn("<Focus2> was created without expected data property 'gcx2'");
		if (!('gcy2' in this._state)) console.warn("<Focus2> was created without expected data property 'gcy2'");
		if (!('loupeSize' in this._state)) console.warn("<Focus2> was created without expected data property 'loupeSize'");
		if (!('highlights' in this._state)) console.warn("<Focus2> was created without expected data property 'highlights'");
		this._intro = true;

		this._fragment = create_main_fragment$B(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Focus2.prototype, protoDev);

	Focus2.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Focus3.html generated by Svelte v2.15.3 */

	function data$v() {
	  return {
	    layerName: "mixed4d",
	    gridSize: 1
	  }
	}
	const file$B = "src/diagrams/Focus3.html";

	function create_main_fragment$C(component, ctx) {
		var div4, div1, h40, text1, div0, atlas0_updating = {}, text2, atlasreticle0_updating = {}, text3, atlasreticle1_updating = {}, text4, atlasreticle2_updating = {}, text5, atlasreticle3_updating = {}, text6, div3, h41, text8, div2, atlas1_updating = {}, text9, atlasreticle4_updating = {}, text10, atlasreticle5_updating = {}, text11, atlasreticle6_updating = {}, text12, atlasreticle7_updating = {};

		var atlas0_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	classHeatmap: 235
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas0_initial_data.gridSize = ctx.gridSize
	        ;
			atlas0_updating.gridSize = true;
		}
		var atlas0 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas0_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas0_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}
				component._set(newState);
				atlas0_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas0._bind({ gridSize: 1 }, atlas0.get());
		});

		var atlasreticle0_initial_data = {
		 	background: false,
		 	round: true,
		 	annotationValue: 1,
		 	enableDragging: false
		 };
		if (ctx.$focus3aspectRatio0 !== void 0) {
			atlasreticle0_initial_data.aspectRatio = ctx.$focus3aspectRatio0;
			atlasreticle0_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale0 !== void 0) {
			atlasreticle0_initial_data.scale = ctx.$focus3scale0;
			atlasreticle0_updating.scale = true;
		}
		if (ctx.$focus3gcx0 !== void 0) {
			atlasreticle0_initial_data.gcx = ctx.$focus3gcx0;
			atlasreticle0_updating.gcx = true;
		}
		if (ctx.$focus3gcy0 !== void 0) {
			atlasreticle0_initial_data.gcy = ctx.$focus3gcy0;
			atlasreticle0_updating.gcy = true;
		}
		var atlasreticle0 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle0_initial_data,
			_bind(changed, childState) {
				var newStoreState = {};
				if (!atlasreticle0_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio0 = childState.aspectRatio;
				}

				if (!atlasreticle0_updating.scale && changed.scale) {
					newStoreState.focus3scale0 = childState.scale;
				}

				if (!atlasreticle0_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx0 = childState.gcx;
				}

				if (!atlasreticle0_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy0 = childState.gcy;
				}
				component.store.set(newStoreState);
				atlasreticle0_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle0._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle0.get());
		});

		var atlasreticle1_initial_data = {
		 	background: false,
		 	round: true,
		 	annotationValue: 2,
		 	enableDragging: false
		 };
		if (ctx.$focus3aspectRatio1 !== void 0) {
			atlasreticle1_initial_data.aspectRatio = ctx.$focus3aspectRatio1;
			atlasreticle1_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale1 !== void 0) {
			atlasreticle1_initial_data.scale = ctx.$focus3scale1;
			atlasreticle1_updating.scale = true;
		}
		if (ctx.$focus3gcx1 !== void 0) {
			atlasreticle1_initial_data.gcx = ctx.$focus3gcx1;
			atlasreticle1_updating.gcx = true;
		}
		if (ctx.$focus3gcy1 !== void 0) {
			atlasreticle1_initial_data.gcy = ctx.$focus3gcy1;
			atlasreticle1_updating.gcy = true;
		}
		var atlasreticle1 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle1_initial_data,
			_bind(changed, childState) {
				var newStoreState = {};
				if (!atlasreticle1_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio1 = childState.aspectRatio;
				}

				if (!atlasreticle1_updating.scale && changed.scale) {
					newStoreState.focus3scale1 = childState.scale;
				}

				if (!atlasreticle1_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx1 = childState.gcx;
				}

				if (!atlasreticle1_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy1 = childState.gcy;
				}
				component.store.set(newStoreState);
				atlasreticle1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle1._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle1.get());
		});

		var atlasreticle2_initial_data = {
		 	background: false,
		 	round: true,
		 	annotationValue: 3,
		 	enableDragging: false
		 };
		if (ctx.$focus3aspectRatio2 !== void 0) {
			atlasreticle2_initial_data.aspectRatio = ctx.$focus3aspectRatio2;
			atlasreticle2_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale2 !== void 0) {
			atlasreticle2_initial_data.scale = ctx.$focus3scale2;
			atlasreticle2_updating.scale = true;
		}
		if (ctx.$focus3gcx2 !== void 0) {
			atlasreticle2_initial_data.gcx = ctx.$focus3gcx2;
			atlasreticle2_updating.gcx = true;
		}
		if (ctx.$focus3gcy2 !== void 0) {
			atlasreticle2_initial_data.gcy = ctx.$focus3gcy2;
			atlasreticle2_updating.gcy = true;
		}
		var atlasreticle2 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle2_initial_data,
			_bind(changed, childState) {
				var newStoreState = {};
				if (!atlasreticle2_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio2 = childState.aspectRatio;
				}

				if (!atlasreticle2_updating.scale && changed.scale) {
					newStoreState.focus3scale2 = childState.scale;
				}

				if (!atlasreticle2_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx2 = childState.gcx;
				}

				if (!atlasreticle2_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy2 = childState.gcy;
				}
				component.store.set(newStoreState);
				atlasreticle2_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle2._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle2.get());
		});

		var atlasreticle3_initial_data = {
		 	background: false,
		 	round: true,
		 	annotationValue: 4,
		 	enableDragging: false
		 };
		if (ctx.$focus3aspectRatio3 !== void 0) {
			atlasreticle3_initial_data.aspectRatio = ctx.$focus3aspectRatio3;
			atlasreticle3_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale3 !== void 0) {
			atlasreticle3_initial_data.scale = ctx.$focus3scale3;
			atlasreticle3_updating.scale = true;
		}
		if (ctx.$focus3gcx3 !== void 0) {
			atlasreticle3_initial_data.gcx = ctx.$focus3gcx3;
			atlasreticle3_updating.gcx = true;
		}
		if (ctx.$focus3gcy3 !== void 0) {
			atlasreticle3_initial_data.gcy = ctx.$focus3gcy3;
			atlasreticle3_updating.gcy = true;
		}
		var atlasreticle3 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle3_initial_data,
			_bind(changed, childState) {
				var newStoreState = {};
				if (!atlasreticle3_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio3 = childState.aspectRatio;
				}

				if (!atlasreticle3_updating.scale && changed.scale) {
					newStoreState.focus3scale3 = childState.scale;
				}

				if (!atlasreticle3_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx3 = childState.gcx;
				}

				if (!atlasreticle3_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy3 = childState.gcy;
				}
				component.store.set(newStoreState);
				atlasreticle3_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle3._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle3.get());
		});

		var atlas1_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	classHeatmap: 287
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas1_initial_data.gridSize = ctx.gridSize
	        ;
			atlas1_updating.gridSize = true;
		}
		var atlas1 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas1_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas1_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}
				component._set(newState);
				atlas1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas1._bind({ gridSize: 1 }, atlas1.get());
		});

		var atlasreticle4_initial_data = {
		 	background: false,
		 	round: true,
		 	color: "#ffaa00",
		 	annotationValue: 1,
		 	enableDragging: false
		 };
		if (ctx.$focus3aspectRatio0 !== void 0) {
			atlasreticle4_initial_data.aspectRatio = ctx.$focus3aspectRatio0;
			atlasreticle4_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale0 !== void 0) {
			atlasreticle4_initial_data.scale = ctx.$focus3scale0;
			atlasreticle4_updating.scale = true;
		}
		if (ctx.$focus3gcx0 !== void 0) {
			atlasreticle4_initial_data.gcx = ctx.$focus3gcx0;
			atlasreticle4_updating.gcx = true;
		}
		if (ctx.$focus3gcy0 !== void 0) {
			atlasreticle4_initial_data.gcy = ctx.$focus3gcy0;
			atlasreticle4_updating.gcy = true;
		}
		var atlasreticle4 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle4_initial_data,
			_bind(changed, childState) {
				var newStoreState = {};
				if (!atlasreticle4_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio0 = childState.aspectRatio;
				}

				if (!atlasreticle4_updating.scale && changed.scale) {
					newStoreState.focus3scale0 = childState.scale;
				}

				if (!atlasreticle4_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx0 = childState.gcx;
				}

				if (!atlasreticle4_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy0 = childState.gcy;
				}
				component.store.set(newStoreState);
				atlasreticle4_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle4._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle4.get());
		});

		var atlasreticle5_initial_data = {
		 	background: false,
		 	round: true,
		 	color: "#ffaa00",
		 	annotationValue: 2,
		 	enableDragging: false
		 };
		if (ctx.$focus3aspectRatio1 !== void 0) {
			atlasreticle5_initial_data.aspectRatio = ctx.$focus3aspectRatio1;
			atlasreticle5_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale1 !== void 0) {
			atlasreticle5_initial_data.scale = ctx.$focus3scale1;
			atlasreticle5_updating.scale = true;
		}
		if (ctx.$focus3gcx1 !== void 0) {
			atlasreticle5_initial_data.gcx = ctx.$focus3gcx1;
			atlasreticle5_updating.gcx = true;
		}
		if (ctx.$focus3gcy1 !== void 0) {
			atlasreticle5_initial_data.gcy = ctx.$focus3gcy1;
			atlasreticle5_updating.gcy = true;
		}
		var atlasreticle5 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle5_initial_data,
			_bind(changed, childState) {
				var newStoreState = {};
				if (!atlasreticle5_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio1 = childState.aspectRatio;
				}

				if (!atlasreticle5_updating.scale && changed.scale) {
					newStoreState.focus3scale1 = childState.scale;
				}

				if (!atlasreticle5_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx1 = childState.gcx;
				}

				if (!atlasreticle5_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy1 = childState.gcy;
				}
				component.store.set(newStoreState);
				atlasreticle5_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle5._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle5.get());
		});

		var atlasreticle6_initial_data = {
		 	background: false,
		 	round: true,
		 	color: "#ffaa00",
		 	annotationValue: 3,
		 	enableDragging: false
		 };
		if (ctx.$focus3aspectRatio2 !== void 0) {
			atlasreticle6_initial_data.aspectRatio = ctx.$focus3aspectRatio2;
			atlasreticle6_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale2 !== void 0) {
			atlasreticle6_initial_data.scale = ctx.$focus3scale2;
			atlasreticle6_updating.scale = true;
		}
		if (ctx.$focus3gcx2 !== void 0) {
			atlasreticle6_initial_data.gcx = ctx.$focus3gcx2;
			atlasreticle6_updating.gcx = true;
		}
		if (ctx.$focus3gcy2 !== void 0) {
			atlasreticle6_initial_data.gcy = ctx.$focus3gcy2;
			atlasreticle6_updating.gcy = true;
		}
		var atlasreticle6 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle6_initial_data,
			_bind(changed, childState) {
				var newStoreState = {};
				if (!atlasreticle6_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio2 = childState.aspectRatio;
				}

				if (!atlasreticle6_updating.scale && changed.scale) {
					newStoreState.focus3scale2 = childState.scale;
				}

				if (!atlasreticle6_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx2 = childState.gcx;
				}

				if (!atlasreticle6_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy2 = childState.gcy;
				}
				component.store.set(newStoreState);
				atlasreticle6_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle6._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle6.get());
		});

		var atlasreticle7_initial_data = {
		 	background: false,
		 	round: true,
		 	color: "#ffaa00",
		 	annotationValue: 4,
		 	enableDragging: false
		 };
		if (ctx.$focus3aspectRatio3 !== void 0) {
			atlasreticle7_initial_data.aspectRatio = ctx.$focus3aspectRatio3;
			atlasreticle7_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale3 !== void 0) {
			atlasreticle7_initial_data.scale = ctx.$focus3scale3;
			atlasreticle7_updating.scale = true;
		}
		if (ctx.$focus3gcx3 !== void 0) {
			atlasreticle7_initial_data.gcx = ctx.$focus3gcx3;
			atlasreticle7_updating.gcx = true;
		}
		if (ctx.$focus3gcy3 !== void 0) {
			atlasreticle7_initial_data.gcy = ctx.$focus3gcy3;
			atlasreticle7_updating.gcy = true;
		}
		var atlasreticle7 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle7_initial_data,
			_bind(changed, childState) {
				var newStoreState = {};
				if (!atlasreticle7_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio3 = childState.aspectRatio;
				}

				if (!atlasreticle7_updating.scale && changed.scale) {
					newStoreState.focus3scale3 = childState.scale;
				}

				if (!atlasreticle7_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx3 = childState.gcx;
				}

				if (!atlasreticle7_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy3 = childState.gcy;
				}
				component.store.set(newStoreState);
				atlasreticle7_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle7._bind({ aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlasreticle7.get());
		});

		return {
			c: function create() {
				div4 = createElement("div");
				div1 = createElement("div");
				h40 = createElement("h4");
				h40.textContent = "Activations for Fireboat";
				text1 = createText("\n    ");
				div0 = createElement("div");
				atlas0._fragment.c();
				text2 = createText("\n      ");
				atlasreticle0._fragment.c();
				text3 = createText("\n      ");
				atlasreticle1._fragment.c();
				text4 = createText("\n      ");
				atlasreticle2._fragment.c();
				text5 = createText("\n      ");
				atlasreticle3._fragment.c();
				text6 = createText("\n  ");
				div3 = createElement("div");
				h41 = createElement("h4");
				h41.textContent = "Activations for Streetcar";
				text8 = createText("\n    ");
				div2 = createElement("div");
				atlas1._fragment.c();
				text9 = createText("\n      ");
				atlasreticle4._fragment.c();
				text10 = createText("\n      ");
				atlasreticle5._fragment.c();
				text11 = createText("\n      ");
				atlasreticle6._fragment.c();
				text12 = createText("\n      ");
				atlasreticle7._fragment.c();
				h40.className = "svelte-7wmkxl";
				addLoc(h40, file$B, 3, 4, 69);
				div0.className = "atlas svelte-7wmkxl";
				addLoc(div0, file$B, 4, 4, 107);
				div1.className = "column svelte-7wmkxl";
				addLoc(div1, file$B, 1, 2, 22);
				h41.className = "svelte-7wmkxl";
				addLoc(h41, file$B, 57, 4, 1508);
				div2.className = "atlas svelte-7wmkxl";
				addLoc(div2, file$B, 58, 4, 1547);
				div3.className = "column svelte-7wmkxl";
				addLoc(div3, file$B, 55, 2, 1460);
				div4.className = "focus svelte-7wmkxl";
				addLoc(div4, file$B, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div1);
				append(div1, h40);
				append(div1, text1);
				append(div1, div0);
				atlas0._mount(div0, null);
				append(div0, text2);
				atlasreticle0._mount(div0, null);
				append(div0, text3);
				atlasreticle1._mount(div0, null);
				append(div0, text4);
				atlasreticle2._mount(div0, null);
				append(div0, text5);
				atlasreticle3._mount(div0, null);
				append(div4, text6);
				append(div4, div3);
				append(div3, h41);
				append(div3, text8);
				append(div3, div2);
				atlas1._mount(div2, null);
				append(div2, text9);
				atlasreticle4._mount(div2, null);
				append(div2, text10);
				atlasreticle5._mount(div2, null);
				append(div2, text11);
				atlasreticle6._mount(div2, null);
				append(div2, text12);
				atlasreticle7._mount(div2, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlas0_changes = {};
				if (changed.layerName) atlas0_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas0_updating.gridSize && changed.gridSize) {
					atlas0_changes.gridSize = ctx.gridSize
	        ;
					atlas0_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				atlas0._set(atlas0_changes);
				atlas0_updating = {};

				var atlasreticle0_changes = {};
				if (!atlasreticle0_updating.aspectRatio && changed.$focus3aspectRatio0) {
					atlasreticle0_changes.aspectRatio = ctx.$focus3aspectRatio0;
					atlasreticle0_updating.aspectRatio = ctx.$focus3aspectRatio0 !== void 0;
				}
				if (!atlasreticle0_updating.scale && changed.$focus3scale0) {
					atlasreticle0_changes.scale = ctx.$focus3scale0;
					atlasreticle0_updating.scale = ctx.$focus3scale0 !== void 0;
				}
				if (!atlasreticle0_updating.gcx && changed.$focus3gcx0) {
					atlasreticle0_changes.gcx = ctx.$focus3gcx0;
					atlasreticle0_updating.gcx = ctx.$focus3gcx0 !== void 0;
				}
				if (!atlasreticle0_updating.gcy && changed.$focus3gcy0) {
					atlasreticle0_changes.gcy = ctx.$focus3gcy0;
					atlasreticle0_updating.gcy = ctx.$focus3gcy0 !== void 0;
				}
				atlasreticle0._set(atlasreticle0_changes);
				atlasreticle0_updating = {};

				var atlasreticle1_changes = {};
				if (!atlasreticle1_updating.aspectRatio && changed.$focus3aspectRatio1) {
					atlasreticle1_changes.aspectRatio = ctx.$focus3aspectRatio1;
					atlasreticle1_updating.aspectRatio = ctx.$focus3aspectRatio1 !== void 0;
				}
				if (!atlasreticle1_updating.scale && changed.$focus3scale1) {
					atlasreticle1_changes.scale = ctx.$focus3scale1;
					atlasreticle1_updating.scale = ctx.$focus3scale1 !== void 0;
				}
				if (!atlasreticle1_updating.gcx && changed.$focus3gcx1) {
					atlasreticle1_changes.gcx = ctx.$focus3gcx1;
					atlasreticle1_updating.gcx = ctx.$focus3gcx1 !== void 0;
				}
				if (!atlasreticle1_updating.gcy && changed.$focus3gcy1) {
					atlasreticle1_changes.gcy = ctx.$focus3gcy1;
					atlasreticle1_updating.gcy = ctx.$focus3gcy1 !== void 0;
				}
				atlasreticle1._set(atlasreticle1_changes);
				atlasreticle1_updating = {};

				var atlasreticle2_changes = {};
				if (!atlasreticle2_updating.aspectRatio && changed.$focus3aspectRatio2) {
					atlasreticle2_changes.aspectRatio = ctx.$focus3aspectRatio2;
					atlasreticle2_updating.aspectRatio = ctx.$focus3aspectRatio2 !== void 0;
				}
				if (!atlasreticle2_updating.scale && changed.$focus3scale2) {
					atlasreticle2_changes.scale = ctx.$focus3scale2;
					atlasreticle2_updating.scale = ctx.$focus3scale2 !== void 0;
				}
				if (!atlasreticle2_updating.gcx && changed.$focus3gcx2) {
					atlasreticle2_changes.gcx = ctx.$focus3gcx2;
					atlasreticle2_updating.gcx = ctx.$focus3gcx2 !== void 0;
				}
				if (!atlasreticle2_updating.gcy && changed.$focus3gcy2) {
					atlasreticle2_changes.gcy = ctx.$focus3gcy2;
					atlasreticle2_updating.gcy = ctx.$focus3gcy2 !== void 0;
				}
				atlasreticle2._set(atlasreticle2_changes);
				atlasreticle2_updating = {};

				var atlasreticle3_changes = {};
				if (!atlasreticle3_updating.aspectRatio && changed.$focus3aspectRatio3) {
					atlasreticle3_changes.aspectRatio = ctx.$focus3aspectRatio3;
					atlasreticle3_updating.aspectRatio = ctx.$focus3aspectRatio3 !== void 0;
				}
				if (!atlasreticle3_updating.scale && changed.$focus3scale3) {
					atlasreticle3_changes.scale = ctx.$focus3scale3;
					atlasreticle3_updating.scale = ctx.$focus3scale3 !== void 0;
				}
				if (!atlasreticle3_updating.gcx && changed.$focus3gcx3) {
					atlasreticle3_changes.gcx = ctx.$focus3gcx3;
					atlasreticle3_updating.gcx = ctx.$focus3gcx3 !== void 0;
				}
				if (!atlasreticle3_updating.gcy && changed.$focus3gcy3) {
					atlasreticle3_changes.gcy = ctx.$focus3gcy3;
					atlasreticle3_updating.gcy = ctx.$focus3gcy3 !== void 0;
				}
				atlasreticle3._set(atlasreticle3_changes);
				atlasreticle3_updating = {};

				var atlas1_changes = {};
				if (changed.layerName) atlas1_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas1_updating.gridSize && changed.gridSize) {
					atlas1_changes.gridSize = ctx.gridSize
	        ;
					atlas1_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				atlas1._set(atlas1_changes);
				atlas1_updating = {};

				var atlasreticle4_changes = {};
				if (!atlasreticle4_updating.aspectRatio && changed.$focus3aspectRatio0) {
					atlasreticle4_changes.aspectRatio = ctx.$focus3aspectRatio0;
					atlasreticle4_updating.aspectRatio = ctx.$focus3aspectRatio0 !== void 0;
				}
				if (!atlasreticle4_updating.scale && changed.$focus3scale0) {
					atlasreticle4_changes.scale = ctx.$focus3scale0;
					atlasreticle4_updating.scale = ctx.$focus3scale0 !== void 0;
				}
				if (!atlasreticle4_updating.gcx && changed.$focus3gcx0) {
					atlasreticle4_changes.gcx = ctx.$focus3gcx0;
					atlasreticle4_updating.gcx = ctx.$focus3gcx0 !== void 0;
				}
				if (!atlasreticle4_updating.gcy && changed.$focus3gcy0) {
					atlasreticle4_changes.gcy = ctx.$focus3gcy0;
					atlasreticle4_updating.gcy = ctx.$focus3gcy0 !== void 0;
				}
				atlasreticle4._set(atlasreticle4_changes);
				atlasreticle4_updating = {};

				var atlasreticle5_changes = {};
				if (!atlasreticle5_updating.aspectRatio && changed.$focus3aspectRatio1) {
					atlasreticle5_changes.aspectRatio = ctx.$focus3aspectRatio1;
					atlasreticle5_updating.aspectRatio = ctx.$focus3aspectRatio1 !== void 0;
				}
				if (!atlasreticle5_updating.scale && changed.$focus3scale1) {
					atlasreticle5_changes.scale = ctx.$focus3scale1;
					atlasreticle5_updating.scale = ctx.$focus3scale1 !== void 0;
				}
				if (!atlasreticle5_updating.gcx && changed.$focus3gcx1) {
					atlasreticle5_changes.gcx = ctx.$focus3gcx1;
					atlasreticle5_updating.gcx = ctx.$focus3gcx1 !== void 0;
				}
				if (!atlasreticle5_updating.gcy && changed.$focus3gcy1) {
					atlasreticle5_changes.gcy = ctx.$focus3gcy1;
					atlasreticle5_updating.gcy = ctx.$focus3gcy1 !== void 0;
				}
				atlasreticle5._set(atlasreticle5_changes);
				atlasreticle5_updating = {};

				var atlasreticle6_changes = {};
				if (!atlasreticle6_updating.aspectRatio && changed.$focus3aspectRatio2) {
					atlasreticle6_changes.aspectRatio = ctx.$focus3aspectRatio2;
					atlasreticle6_updating.aspectRatio = ctx.$focus3aspectRatio2 !== void 0;
				}
				if (!atlasreticle6_updating.scale && changed.$focus3scale2) {
					atlasreticle6_changes.scale = ctx.$focus3scale2;
					atlasreticle6_updating.scale = ctx.$focus3scale2 !== void 0;
				}
				if (!atlasreticle6_updating.gcx && changed.$focus3gcx2) {
					atlasreticle6_changes.gcx = ctx.$focus3gcx2;
					atlasreticle6_updating.gcx = ctx.$focus3gcx2 !== void 0;
				}
				if (!atlasreticle6_updating.gcy && changed.$focus3gcy2) {
					atlasreticle6_changes.gcy = ctx.$focus3gcy2;
					atlasreticle6_updating.gcy = ctx.$focus3gcy2 !== void 0;
				}
				atlasreticle6._set(atlasreticle6_changes);
				atlasreticle6_updating = {};

				var atlasreticle7_changes = {};
				if (!atlasreticle7_updating.aspectRatio && changed.$focus3aspectRatio3) {
					atlasreticle7_changes.aspectRatio = ctx.$focus3aspectRatio3;
					atlasreticle7_updating.aspectRatio = ctx.$focus3aspectRatio3 !== void 0;
				}
				if (!atlasreticle7_updating.scale && changed.$focus3scale3) {
					atlasreticle7_changes.scale = ctx.$focus3scale3;
					atlasreticle7_updating.scale = ctx.$focus3scale3 !== void 0;
				}
				if (!atlasreticle7_updating.gcx && changed.$focus3gcx3) {
					atlasreticle7_changes.gcx = ctx.$focus3gcx3;
					atlasreticle7_updating.gcx = ctx.$focus3gcx3 !== void 0;
				}
				if (!atlasreticle7_updating.gcy && changed.$focus3gcy3) {
					atlasreticle7_changes.gcy = ctx.$focus3gcy3;
					atlasreticle7_updating.gcy = ctx.$focus3gcy3 !== void 0;
				}
				atlasreticle7._set(atlasreticle7_changes);
				atlasreticle7_updating = {};
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div4);
				}

				atlas0.destroy();
				atlasreticle0.destroy();
				atlasreticle1.destroy();
				atlasreticle2.destroy();
				atlasreticle3.destroy();
				atlas1.destroy();
				atlasreticle4.destroy();
				atlasreticle5.destroy();
				atlasreticle6.destroy();
				atlasreticle7.destroy();
			}
		};
	}

	function Focus3(options) {
		this._debugName = '<Focus3>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Focus3> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["focus3aspectRatio0","focus3scale0","focus3gcx0","focus3gcy0","focus3aspectRatio1","focus3scale1","focus3gcx1","focus3gcy1","focus3aspectRatio2","focus3scale2","focus3gcx2","focus3gcy2","focus3aspectRatio3","focus3scale3","focus3gcx3","focus3gcy3"]), data$v()), options.data);
		this.store._add(this, ["focus3aspectRatio0","focus3scale0","focus3gcx0","focus3gcy0","focus3aspectRatio1","focus3scale1","focus3gcx1","focus3gcy1","focus3aspectRatio2","focus3scale2","focus3gcx2","focus3gcy2","focus3aspectRatio3","focus3scale3","focus3gcx3","focus3gcy3"]);
		if (!('layerName' in this._state)) console.warn("<Focus3> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<Focus3> was created without expected data property 'gridSize'");
		if (!('$focus3aspectRatio0' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3aspectRatio0'");
		if (!('$focus3scale0' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3scale0'");
		if (!('$focus3gcx0' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3gcx0'");
		if (!('$focus3gcy0' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3gcy0'");
		if (!('$focus3aspectRatio1' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3aspectRatio1'");
		if (!('$focus3scale1' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3scale1'");
		if (!('$focus3gcx1' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3gcx1'");
		if (!('$focus3gcy1' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3gcy1'");
		if (!('$focus3aspectRatio2' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3aspectRatio2'");
		if (!('$focus3scale2' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3scale2'");
		if (!('$focus3gcx2' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3gcx2'");
		if (!('$focus3gcy2' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3gcy2'");
		if (!('$focus3aspectRatio3' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3aspectRatio3'");
		if (!('$focus3scale3' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3scale3'");
		if (!('$focus3gcx3' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3gcx3'");
		if (!('$focus3gcy3' in this._state)) console.warn("<Focus3> was created without expected data property '$focus3gcy3'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$C(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Focus3.prototype, protoDev);

	Focus3.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Focus3Table.html generated by Svelte v2.15.3 */

	function data$w() {
	  return {
	    layerName: "mixed4d",
	    gridSize: 1,
	    loupeSize: 220
	  }
	}
	const file$C = "src/diagrams/Focus3Table.html";

	function create_main_fragment$D(component, ctx) {
		var div9, div0, h40, text0, text1, h41, text2, text3, div2, atlas0_updating = {}, text4, atlas1_updating = {}, text5, div1, text6, text7, text8, text9, div4, atlas2_updating = {}, text10, atlas3_updating = {}, text11, div3, text13, div6, atlas4_updating = {}, text14, atlas5_updating = {}, text15, div5, text17, div8, atlas6_updating = {}, text18, atlas7_updating = {}, text19, div7;

		var atlas0_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false,
		 	classHeatmap: 235
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas0_initial_data.gridSize = ctx.gridSize
	        ;
			atlas0_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas0_initial_data.showLabels = ctx.showLabels
	        ;
			atlas0_updating.showLabels = true;
		}
		if (ctx.$focus3Highlights[0].homeX !== void 0) {
			atlas0_initial_data.homeX = ctx.$focus3Highlights[0].homeX;
			atlas0_updating.homeX = true;
		}
		if (ctx.$focus3Highlights[0].homeY !== void 0) {
			atlas0_initial_data.homeY = ctx.$focus3Highlights[0].homeY;
			atlas0_updating.homeY = true;
		}
		if (ctx.$focus3Highlights[0].homeScale !== void 0) {
			atlas0_initial_data.homeScale = ctx.$focus3Highlights[0].homeScale;
			atlas0_updating.homeScale = true;
		}
		if (ctx.$focus3aspectRatio0 !== void 0) {
			atlas0_initial_data.aspectRatio = ctx.$focus3aspectRatio0;
			atlas0_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale0 !== void 0) {
			atlas0_initial_data.scale = ctx.$focus3scale0;
			atlas0_updating.scale = true;
		}
		if (ctx.$focus3gcx0 !== void 0) {
			atlas0_initial_data.gcx = ctx.$focus3gcx0;
			atlas0_updating.gcx = true;
		}
		if (ctx.$focus3gcy0 !== void 0) {
			atlas0_initial_data.gcy = ctx.$focus3gcy0;
			atlas0_updating.gcy = true;
		}
		var atlas0 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas0_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas0_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas0_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas0_updating.homeX && changed.homeX) {
					ctx.$focus3Highlights[0].homeX = childState.homeX;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas0_updating.homeY && changed.homeY) {
					ctx.$focus3Highlights[0].homeY = childState.homeY;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas0_updating.homeScale && changed.homeScale) {
					ctx.$focus3Highlights[0].homeScale = childState.homeScale;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas0_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio0 = childState.aspectRatio;
				}

				if (!atlas0_updating.scale && changed.scale) {
					newStoreState.focus3scale0 = childState.scale;
				}

				if (!atlas0_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx0 = childState.gcx;
				}

				if (!atlas0_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy0 = childState.gcy;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas0_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas0._bind({ gridSize: 1, showLabels: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas0.get());
		});

		var loupe0_initial_data = {
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 1
		 };
		var loupe0 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe0_initial_data
		});

		var atlas1_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false,
		 	classHeatmap: 287
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas1_initial_data.gridSize = ctx.gridSize
	        ;
			atlas1_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas1_initial_data.showLabels = ctx.showLabels
	        ;
			atlas1_updating.showLabels = true;
		}
		if (ctx.$focus3Highlights[0].homeX !== void 0) {
			atlas1_initial_data.homeX = ctx.$focus3Highlights[0].homeX;
			atlas1_updating.homeX = true;
		}
		if (ctx.$focus3Highlights[0].homeY !== void 0) {
			atlas1_initial_data.homeY = ctx.$focus3Highlights[0].homeY;
			atlas1_updating.homeY = true;
		}
		if (ctx.$focus3Highlights[0].homeScale !== void 0) {
			atlas1_initial_data.homeScale = ctx.$focus3Highlights[0].homeScale;
			atlas1_updating.homeScale = true;
		}
		if (ctx.$focus3aspectRatio0 !== void 0) {
			atlas1_initial_data.aspectRatio = ctx.$focus3aspectRatio0;
			atlas1_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale0 !== void 0) {
			atlas1_initial_data.scale = ctx.$focus3scale0;
			atlas1_updating.scale = true;
		}
		if (ctx.$focus3gcx0 !== void 0) {
			atlas1_initial_data.gcx = ctx.$focus3gcx0;
			atlas1_updating.gcx = true;
		}
		if (ctx.$focus3gcy0 !== void 0) {
			atlas1_initial_data.gcy = ctx.$focus3gcy0;
			atlas1_updating.gcy = true;
		}
		var atlas1 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas1_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas1_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas1_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas1_updating.homeX && changed.homeX) {
					ctx.$focus3Highlights[0].homeX = childState.homeX;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas1_updating.homeY && changed.homeY) {
					ctx.$focus3Highlights[0].homeY = childState.homeY;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas1_updating.homeScale && changed.homeScale) {
					ctx.$focus3Highlights[0].homeScale = childState.homeScale;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas1_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio0 = childState.aspectRatio;
				}

				if (!atlas1_updating.scale && changed.scale) {
					newStoreState.focus3scale0 = childState.scale;
				}

				if (!atlas1_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx0 = childState.gcx;
				}

				if (!atlas1_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy0 = childState.gcy;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas1._bind({ gridSize: 1, showLabels: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas1.get());
		});

		var loupe1_initial_data = {
		 	color: "#ffaa00",
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 1
		 };
		var loupe1 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe1_initial_data
		});

		var atlas2_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	classHeatmap: 235
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas2_initial_data.gridSize = ctx.gridSize
	        ;
			atlas2_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas2_initial_data.showLabels = ctx.showLabels
	        ;
			atlas2_updating.showLabels = true;
		}
		if (ctx.$focus3Highlights[1].homeX !== void 0) {
			atlas2_initial_data.homeX = ctx.$focus3Highlights[1].homeX;
			atlas2_updating.homeX = true;
		}
		if (ctx.$focus3Highlights[1].homeY !== void 0) {
			atlas2_initial_data.homeY = ctx.$focus3Highlights[1].homeY;
			atlas2_updating.homeY = true;
		}
		if (ctx.$focus3Highlights[1].homeScale !== void 0) {
			atlas2_initial_data.homeScale = ctx.$focus3Highlights[1].homeScale;
			atlas2_updating.homeScale = true;
		}
		if (ctx.$focus3aspectRatio1 !== void 0) {
			atlas2_initial_data.aspectRatio = ctx.$focus3aspectRatio1;
			atlas2_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale1 !== void 0) {
			atlas2_initial_data.scale = ctx.$focus3scale1;
			atlas2_updating.scale = true;
		}
		if (ctx.$focus3gcx1 !== void 0) {
			atlas2_initial_data.gcx = ctx.$focus3gcx1;
			atlas2_updating.gcx = true;
		}
		if (ctx.$focus3gcy1 !== void 0) {
			atlas2_initial_data.gcy = ctx.$focus3gcy1;
			atlas2_updating.gcy = true;
		}
		var atlas2 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas2_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas2_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas2_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas2_updating.homeX && changed.homeX) {
					ctx.$focus3Highlights[1].homeX = childState.homeX;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas2_updating.homeY && changed.homeY) {
					ctx.$focus3Highlights[1].homeY = childState.homeY;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas2_updating.homeScale && changed.homeScale) {
					ctx.$focus3Highlights[1].homeScale = childState.homeScale;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas2_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio1 = childState.aspectRatio;
				}

				if (!atlas2_updating.scale && changed.scale) {
					newStoreState.focus3scale1 = childState.scale;
				}

				if (!atlas2_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx1 = childState.gcx;
				}

				if (!atlas2_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy1 = childState.gcy;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas2_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas2._bind({ gridSize: 1, showLabels: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas2.get());
		});

		var loupe2_initial_data = {
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 2
		 };
		var loupe2 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe2_initial_data
		});

		var atlas3_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false,
		 	classHeatmap: 287
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas3_initial_data.gridSize = ctx.gridSize
	        ;
			atlas3_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas3_initial_data.showLabels = ctx.showLabels
	        ;
			atlas3_updating.showLabels = true;
		}
		if (ctx.$focus3Highlights[1].homeX !== void 0) {
			atlas3_initial_data.homeX = ctx.$focus3Highlights[1].homeX;
			atlas3_updating.homeX = true;
		}
		if (ctx.$focus3Highlights[1].homeY !== void 0) {
			atlas3_initial_data.homeY = ctx.$focus3Highlights[1].homeY;
			atlas3_updating.homeY = true;
		}
		if (ctx.$focus3Highlights[1].homeScale !== void 0) {
			atlas3_initial_data.homeScale = ctx.$focus3Highlights[1].homeScale;
			atlas3_updating.homeScale = true;
		}
		if (ctx.$focus3aspectRatio1 !== void 0) {
			atlas3_initial_data.aspectRatio = ctx.$focus3aspectRatio1;
			atlas3_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale1 !== void 0) {
			atlas3_initial_data.scale = ctx.$focus3scale1;
			atlas3_updating.scale = true;
		}
		if (ctx.$focus3gcx1 !== void 0) {
			atlas3_initial_data.gcx = ctx.$focus3gcx1;
			atlas3_updating.gcx = true;
		}
		if (ctx.$focus3gcy1 !== void 0) {
			atlas3_initial_data.gcy = ctx.$focus3gcy1;
			atlas3_updating.gcy = true;
		}
		var atlas3 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas3_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas3_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas3_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas3_updating.homeX && changed.homeX) {
					ctx.$focus3Highlights[1].homeX = childState.homeX;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas3_updating.homeY && changed.homeY) {
					ctx.$focus3Highlights[1].homeY = childState.homeY;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas3_updating.homeScale && changed.homeScale) {
					ctx.$focus3Highlights[1].homeScale = childState.homeScale;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas3_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio1 = childState.aspectRatio;
				}

				if (!atlas3_updating.scale && changed.scale) {
					newStoreState.focus3scale1 = childState.scale;
				}

				if (!atlas3_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx1 = childState.gcx;
				}

				if (!atlas3_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy1 = childState.gcy;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas3_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas3._bind({ gridSize: 1, showLabels: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas3.get());
		});

		var loupe3_initial_data = {
		 	color: "#ffaa00",
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 2
		 };
		var loupe3 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe3_initial_data
		});

		var atlas4_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false,
		 	classHeatmap: 235
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas4_initial_data.gridSize = ctx.gridSize
	        ;
			atlas4_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas4_initial_data.showLabels = ctx.showLabels
	        ;
			atlas4_updating.showLabels = true;
		}
		if (ctx.$focus3Highlights[2].homeX !== void 0) {
			atlas4_initial_data.homeX = ctx.$focus3Highlights[2].homeX;
			atlas4_updating.homeX = true;
		}
		if (ctx.$focus3Highlights[2].homeY !== void 0) {
			atlas4_initial_data.homeY = ctx.$focus3Highlights[2].homeY;
			atlas4_updating.homeY = true;
		}
		if (ctx.$focus3Highlights[2].homeScale !== void 0) {
			atlas4_initial_data.homeScale = ctx.$focus3Highlights[2].homeScale;
			atlas4_updating.homeScale = true;
		}
		if (ctx.$focus3aspectRatio2 !== void 0) {
			atlas4_initial_data.aspectRatio = ctx.$focus3aspectRatio2;
			atlas4_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale2 !== void 0) {
			atlas4_initial_data.scale = ctx.$focus3scale2;
			atlas4_updating.scale = true;
		}
		if (ctx.$focus3gcx2 !== void 0) {
			atlas4_initial_data.gcx = ctx.$focus3gcx2;
			atlas4_updating.gcx = true;
		}
		if (ctx.$focus3gcy2 !== void 0) {
			atlas4_initial_data.gcy = ctx.$focus3gcy2;
			atlas4_updating.gcy = true;
		}
		var atlas4 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas4_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas4_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas4_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas4_updating.homeX && changed.homeX) {
					ctx.$focus3Highlights[2].homeX = childState.homeX;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas4_updating.homeY && changed.homeY) {
					ctx.$focus3Highlights[2].homeY = childState.homeY;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas4_updating.homeScale && changed.homeScale) {
					ctx.$focus3Highlights[2].homeScale = childState.homeScale;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas4_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio2 = childState.aspectRatio;
				}

				if (!atlas4_updating.scale && changed.scale) {
					newStoreState.focus3scale2 = childState.scale;
				}

				if (!atlas4_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx2 = childState.gcx;
				}

				if (!atlas4_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy2 = childState.gcy;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas4_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas4._bind({ gridSize: 1, showLabels: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas4.get());
		});

		var loupe4_initial_data = {
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 3
		 };
		var loupe4 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe4_initial_data
		});

		var atlas5_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false,
		 	classHeatmap: 287
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas5_initial_data.gridSize = ctx.gridSize
	        ;
			atlas5_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas5_initial_data.showLabels = ctx.showLabels
	        ;
			atlas5_updating.showLabels = true;
		}
		if (ctx.$focus3Highlights[2].homeX !== void 0) {
			atlas5_initial_data.homeX = ctx.$focus3Highlights[2].homeX;
			atlas5_updating.homeX = true;
		}
		if (ctx.$focus3Highlights[2].homeY !== void 0) {
			atlas5_initial_data.homeY = ctx.$focus3Highlights[2].homeY;
			atlas5_updating.homeY = true;
		}
		if (ctx.$focus3Highlights[2].homeScale !== void 0) {
			atlas5_initial_data.homeScale = ctx.$focus3Highlights[2].homeScale;
			atlas5_updating.homeScale = true;
		}
		if (ctx.$focus3aspectRatio2 !== void 0) {
			atlas5_initial_data.aspectRatio = ctx.$focus3aspectRatio2;
			atlas5_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale2 !== void 0) {
			atlas5_initial_data.scale = ctx.$focus3scale2;
			atlas5_updating.scale = true;
		}
		if (ctx.$focus3gcx2 !== void 0) {
			atlas5_initial_data.gcx = ctx.$focus3gcx2;
			atlas5_updating.gcx = true;
		}
		if (ctx.$focus3gcy2 !== void 0) {
			atlas5_initial_data.gcy = ctx.$focus3gcy2;
			atlas5_updating.gcy = true;
		}
		var atlas5 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas5_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas5_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas5_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas5_updating.homeX && changed.homeX) {
					ctx.$focus3Highlights[2].homeX = childState.homeX;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas5_updating.homeY && changed.homeY) {
					ctx.$focus3Highlights[2].homeY = childState.homeY;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas5_updating.homeScale && changed.homeScale) {
					ctx.$focus3Highlights[2].homeScale = childState.homeScale;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas5_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio2 = childState.aspectRatio;
				}

				if (!atlas5_updating.scale && changed.scale) {
					newStoreState.focus3scale2 = childState.scale;
				}

				if (!atlas5_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx2 = childState.gcx;
				}

				if (!atlas5_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy2 = childState.gcy;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas5_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas5._bind({ gridSize: 1, showLabels: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas5.get());
		});

		var loupe5_initial_data = {
		 	color: "#ffaa00",
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 3
		 };
		var loupe5 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe5_initial_data
		});

		var atlas6_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false,
		 	classHeatmap: 235
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas6_initial_data.gridSize = ctx.gridSize
	        ;
			atlas6_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas6_initial_data.showLabels = ctx.showLabels
	        ;
			atlas6_updating.showLabels = true;
		}
		if (ctx.$focus3Highlights[3].homeX !== void 0) {
			atlas6_initial_data.homeX = ctx.$focus3Highlights[3].homeX;
			atlas6_updating.homeX = true;
		}
		if (ctx.$focus3Highlights[3].homeY !== void 0) {
			atlas6_initial_data.homeY = ctx.$focus3Highlights[3].homeY;
			atlas6_updating.homeY = true;
		}
		if (ctx.$focus3Highlights[3].homeScale !== void 0) {
			atlas6_initial_data.homeScale = ctx.$focus3Highlights[3].homeScale;
			atlas6_updating.homeScale = true;
		}
		if (ctx.$focus3aspectRatio3 !== void 0) {
			atlas6_initial_data.aspectRatio = ctx.$focus3aspectRatio3;
			atlas6_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale3 !== void 0) {
			atlas6_initial_data.scale = ctx.$focus3scale3;
			atlas6_updating.scale = true;
		}
		if (ctx.$focus3gcx3 !== void 0) {
			atlas6_initial_data.gcx = ctx.$focus3gcx3;
			atlas6_updating.gcx = true;
		}
		if (ctx.$focus3gcy3 !== void 0) {
			atlas6_initial_data.gcy = ctx.$focus3gcy3;
			atlas6_updating.gcy = true;
		}
		var atlas6 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas6_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas6_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas6_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas6_updating.homeX && changed.homeX) {
					ctx.$focus3Highlights[3].homeX = childState.homeX;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas6_updating.homeY && changed.homeY) {
					ctx.$focus3Highlights[3].homeY = childState.homeY;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas6_updating.homeScale && changed.homeScale) {
					ctx.$focus3Highlights[3].homeScale = childState.homeScale;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas6_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio3 = childState.aspectRatio;
				}

				if (!atlas6_updating.scale && changed.scale) {
					newStoreState.focus3scale3 = childState.scale;
				}

				if (!atlas6_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx3 = childState.gcx;
				}

				if (!atlas6_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy3 = childState.gcy;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas6_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas6._bind({ gridSize: 1, showLabels: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas6.get());
		});

		var loupe6_initial_data = {
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 4
		 };
		var loupe6 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe6_initial_data
		});

		var atlas7_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2",
		 	enableHover: false,
		 	enableDragToPan: false,
		 	enableClickToZoom: false,
		 	classHeatmap: 287
		 };
		if (ctx.gridSize
	         !== void 0) {
			atlas7_initial_data.gridSize = ctx.gridSize
	        ;
			atlas7_updating.gridSize = true;
		}
		if (ctx.showLabels
	         !== void 0) {
			atlas7_initial_data.showLabels = ctx.showLabels
	        ;
			atlas7_updating.showLabels = true;
		}
		if (ctx.$focus3Highlights[3].homeX !== void 0) {
			atlas7_initial_data.homeX = ctx.$focus3Highlights[3].homeX;
			atlas7_updating.homeX = true;
		}
		if (ctx.$focus3Highlights[3].homeY !== void 0) {
			atlas7_initial_data.homeY = ctx.$focus3Highlights[3].homeY;
			atlas7_updating.homeY = true;
		}
		if (ctx.$focus3Highlights[3].homeScale !== void 0) {
			atlas7_initial_data.homeScale = ctx.$focus3Highlights[3].homeScale;
			atlas7_updating.homeScale = true;
		}
		if (ctx.$focus3aspectRatio3 !== void 0) {
			atlas7_initial_data.aspectRatio = ctx.$focus3aspectRatio3;
			atlas7_updating.aspectRatio = true;
		}
		if (ctx.$focus3scale3 !== void 0) {
			atlas7_initial_data.scale = ctx.$focus3scale3;
			atlas7_updating.scale = true;
		}
		if (ctx.$focus3gcx3 !== void 0) {
			atlas7_initial_data.gcx = ctx.$focus3gcx3;
			atlas7_updating.gcx = true;
		}
		if (ctx.$focus3gcy3 !== void 0) {
			atlas7_initial_data.gcy = ctx.$focus3gcy3;
			atlas7_updating.gcy = true;
		}
		var atlas7 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas7_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas7_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas7_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas7_updating.homeX && changed.homeX) {
					ctx.$focus3Highlights[3].homeX = childState.homeX;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas7_updating.homeY && changed.homeY) {
					ctx.$focus3Highlights[3].homeY = childState.homeY;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas7_updating.homeScale && changed.homeScale) {
					ctx.$focus3Highlights[3].homeScale = childState.homeScale;
					newStoreState.focus3Highlights = ctx.$focus3Highlights;
				}

				if (!atlas7_updating.aspectRatio && changed.aspectRatio) {
					newStoreState.focus3aspectRatio3 = childState.aspectRatio;
				}

				if (!atlas7_updating.scale && changed.scale) {
					newStoreState.focus3scale3 = childState.scale;
				}

				if (!atlas7_updating.gcx && changed.gcx) {
					newStoreState.focus3gcx3 = childState.gcx;
				}

				if (!atlas7_updating.gcy && changed.gcy) {
					newStoreState.focus3gcy3 = childState.gcy;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas7_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas7._bind({ gridSize: 1, showLabels: 1, homeX: 1, homeY: 1, homeScale: 1, aspectRatio: 1, scale: 1, gcx: 1, gcy: 1 }, atlas7.get());
		});

		var loupe7_initial_data = {
		 	color: "#ffaa00",
		 	width: ctx.loupeSize,
		 	height: ctx.loupeSize,
		 	label: 4
		 };
		var loupe7 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe7_initial_data
		});

		return {
			c: function create() {
				div9 = createElement("div");
				div0 = createElement("div");
				h40 = createElement("h4");
				text0 = createText("Fireboat");
				text1 = createText("\n    ");
				h41 = createElement("h4");
				text2 = createText("Streetcar");
				text3 = createText("\n  \n  ");
				div2 = createElement("div");
				atlas0._fragment.c();
				loupe0._fragment.c();
				text4 = createText("\n    ");
				atlas1._fragment.c();
				loupe1._fragment.c();
				text5 = createText("\n    ");
				div1 = createElement("div");
				text6 = createText("At ");
				text7 = createText(ctx.layerName);
				text8 = createText(", Both \"streetcar\" and \"fireboat\" contain activations for what look like windows.");
				text9 = createText("\n  \n  ");
				div4 = createElement("div");
				atlas2._fragment.c();
				loupe2._fragment.c();
				text10 = createText("\n    ");
				atlas3._fragment.c();
				loupe3._fragment.c();
				text11 = createText("\n    ");
				div3 = createElement("div");
				div3.textContent = "Both classes also contain activations for crane-like apparatuses, though they are less prominent than the window activations.";
				text13 = createText("\n  \n  ");
				div6 = createElement("div");
				atlas4._fragment.c();
				loupe4._fragment.c();
				text14 = createText("\n    ");
				atlas5._fragment.c();
				loupe5._fragment.c();
				text15 = createText("\n    ");
				div5 = createElement("div");
				div5.textContent = "\"Fireboat\" activations have much stronger attributions from water than \"streetcar\", where there is virtually no positive evidence.";
				text17 = createText("\n  \n  ");
				div8 = createElement("div");
				atlas6._fragment.c();
				loupe6._fragment.c();
				text18 = createText("\n    ");
				atlas7._fragment.c();
				loupe7._fragment.c();
				text19 = createText("\n    ");
				div7 = createElement("div");
				div7.textContent = "The activations for \"streetcar\" have much stronger attributions from buildings than does \"fireboat\".";
				setStyle(h40, "width", "" + ctx.loupeSize + "px");
				h40.className = "svelte-1telcb5";
				addLoc(h40, file$C, 2, 4, 46);
				setStyle(h41, "width", "" + ctx.loupeSize + "px");
				h41.className = "svelte-1telcb5";
				addLoc(h41, file$C, 3, 4, 96);
				div0.className = "row svelte-1telcb5";
				addLoc(div0, file$C, 1, 2, 24);
				div1.className = "figcaption";
				addLoc(div1, file$C, 49, 4, 1565);
				div2.className = "row svelte-1telcb5";
				addLoc(div2, file$C, 6, 2, 169);
				div3.className = "figcaption";
				addLoc(div3, file$C, 95, 4, 3059);
				div4.className = "row svelte-1telcb5";
				addLoc(div4, file$C, 54, 2, 1729);
				div5.className = "figcaption";
				addLoc(div5, file$C, 143, 4, 4649);
				div6.className = "row svelte-1telcb5";
				addLoc(div6, file$C, 100, 2, 3253);
				div7.className = "figcaption";
				addLoc(div7, file$C, 191, 4, 6244);
				div8.className = "row svelte-1telcb5";
				addLoc(div8, file$C, 148, 2, 4848);
				div9.className = "details svelte-1telcb5";
				addLoc(div9, file$C, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div9, anchor);
				append(div9, div0);
				append(div0, h40);
				append(h40, text0);
				append(div0, text1);
				append(div0, h41);
				append(h41, text2);
				append(div9, text3);
				append(div9, div2);
				atlas0._mount(loupe0._slotted.default, null);
				loupe0._mount(div2, null);
				append(div2, text4);
				atlas1._mount(loupe1._slotted.default, null);
				loupe1._mount(div2, null);
				append(div2, text5);
				append(div2, div1);
				append(div1, text6);
				append(div1, text7);
				append(div1, text8);
				append(div9, text9);
				append(div9, div4);
				atlas2._mount(loupe2._slotted.default, null);
				loupe2._mount(div4, null);
				append(div4, text10);
				atlas3._mount(loupe3._slotted.default, null);
				loupe3._mount(div4, null);
				append(div4, text11);
				append(div4, div3);
				append(div9, text13);
				append(div9, div6);
				atlas4._mount(loupe4._slotted.default, null);
				loupe4._mount(div6, null);
				append(div6, text14);
				atlas5._mount(loupe5._slotted.default, null);
				loupe5._mount(div6, null);
				append(div6, text15);
				append(div6, div5);
				append(div9, text17);
				append(div9, div8);
				atlas6._mount(loupe6._slotted.default, null);
				loupe6._mount(div8, null);
				append(div8, text18);
				atlas7._mount(loupe7._slotted.default, null);
				loupe7._mount(div8, null);
				append(div8, text19);
				append(div8, div7);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if (changed.loupeSize) {
					setStyle(h40, "width", "" + ctx.loupeSize + "px");
					setStyle(h41, "width", "" + ctx.loupeSize + "px");
				}

				var atlas0_changes = {};
				if (changed.layerName) atlas0_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas0_updating.gridSize && changed.gridSize) {
					atlas0_changes.gridSize = ctx.gridSize
	        ;
					atlas0_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas0_updating.showLabels && changed.showLabels) {
					atlas0_changes.showLabels = ctx.showLabels
	        ;
					atlas0_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas0_updating.homeX && changed.$focus3Highlights) {
					atlas0_changes.homeX = ctx.$focus3Highlights[0].homeX;
					atlas0_updating.homeX = ctx.$focus3Highlights[0].homeX !== void 0;
				}
				if (!atlas0_updating.homeY && changed.$focus3Highlights) {
					atlas0_changes.homeY = ctx.$focus3Highlights[0].homeY;
					atlas0_updating.homeY = ctx.$focus3Highlights[0].homeY !== void 0;
				}
				if (!atlas0_updating.homeScale && changed.$focus3Highlights) {
					atlas0_changes.homeScale = ctx.$focus3Highlights[0].homeScale;
					atlas0_updating.homeScale = ctx.$focus3Highlights[0].homeScale !== void 0;
				}
				if (!atlas0_updating.aspectRatio && changed.$focus3aspectRatio0) {
					atlas0_changes.aspectRatio = ctx.$focus3aspectRatio0;
					atlas0_updating.aspectRatio = ctx.$focus3aspectRatio0 !== void 0;
				}
				if (!atlas0_updating.scale && changed.$focus3scale0) {
					atlas0_changes.scale = ctx.$focus3scale0;
					atlas0_updating.scale = ctx.$focus3scale0 !== void 0;
				}
				if (!atlas0_updating.gcx && changed.$focus3gcx0) {
					atlas0_changes.gcx = ctx.$focus3gcx0;
					atlas0_updating.gcx = ctx.$focus3gcx0 !== void 0;
				}
				if (!atlas0_updating.gcy && changed.$focus3gcy0) {
					atlas0_changes.gcy = ctx.$focus3gcy0;
					atlas0_updating.gcy = ctx.$focus3gcy0 !== void 0;
				}
				atlas0._set(atlas0_changes);
				atlas0_updating = {};

				var loupe0_changes = {};
				if (changed.loupeSize) loupe0_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe0_changes.height = ctx.loupeSize;
				loupe0._set(loupe0_changes);

				var atlas1_changes = {};
				if (changed.layerName) atlas1_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas1_updating.gridSize && changed.gridSize) {
					atlas1_changes.gridSize = ctx.gridSize
	        ;
					atlas1_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas1_updating.showLabels && changed.showLabels) {
					atlas1_changes.showLabels = ctx.showLabels
	        ;
					atlas1_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas1_updating.homeX && changed.$focus3Highlights) {
					atlas1_changes.homeX = ctx.$focus3Highlights[0].homeX;
					atlas1_updating.homeX = ctx.$focus3Highlights[0].homeX !== void 0;
				}
				if (!atlas1_updating.homeY && changed.$focus3Highlights) {
					atlas1_changes.homeY = ctx.$focus3Highlights[0].homeY;
					atlas1_updating.homeY = ctx.$focus3Highlights[0].homeY !== void 0;
				}
				if (!atlas1_updating.homeScale && changed.$focus3Highlights) {
					atlas1_changes.homeScale = ctx.$focus3Highlights[0].homeScale;
					atlas1_updating.homeScale = ctx.$focus3Highlights[0].homeScale !== void 0;
				}
				if (!atlas1_updating.aspectRatio && changed.$focus3aspectRatio0) {
					atlas1_changes.aspectRatio = ctx.$focus3aspectRatio0;
					atlas1_updating.aspectRatio = ctx.$focus3aspectRatio0 !== void 0;
				}
				if (!atlas1_updating.scale && changed.$focus3scale0) {
					atlas1_changes.scale = ctx.$focus3scale0;
					atlas1_updating.scale = ctx.$focus3scale0 !== void 0;
				}
				if (!atlas1_updating.gcx && changed.$focus3gcx0) {
					atlas1_changes.gcx = ctx.$focus3gcx0;
					atlas1_updating.gcx = ctx.$focus3gcx0 !== void 0;
				}
				if (!atlas1_updating.gcy && changed.$focus3gcy0) {
					atlas1_changes.gcy = ctx.$focus3gcy0;
					atlas1_updating.gcy = ctx.$focus3gcy0 !== void 0;
				}
				atlas1._set(atlas1_changes);
				atlas1_updating = {};

				var loupe1_changes = {};
				if (changed.loupeSize) loupe1_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe1_changes.height = ctx.loupeSize;
				loupe1._set(loupe1_changes);

				if (changed.layerName) {
					setData(text7, ctx.layerName);
				}

				var atlas2_changes = {};
				if (changed.layerName) atlas2_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas2_updating.gridSize && changed.gridSize) {
					atlas2_changes.gridSize = ctx.gridSize
	        ;
					atlas2_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas2_updating.showLabels && changed.showLabels) {
					atlas2_changes.showLabels = ctx.showLabels
	        ;
					atlas2_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas2_updating.homeX && changed.$focus3Highlights) {
					atlas2_changes.homeX = ctx.$focus3Highlights[1].homeX;
					atlas2_updating.homeX = ctx.$focus3Highlights[1].homeX !== void 0;
				}
				if (!atlas2_updating.homeY && changed.$focus3Highlights) {
					atlas2_changes.homeY = ctx.$focus3Highlights[1].homeY;
					atlas2_updating.homeY = ctx.$focus3Highlights[1].homeY !== void 0;
				}
				if (!atlas2_updating.homeScale && changed.$focus3Highlights) {
					atlas2_changes.homeScale = ctx.$focus3Highlights[1].homeScale;
					atlas2_updating.homeScale = ctx.$focus3Highlights[1].homeScale !== void 0;
				}
				if (!atlas2_updating.aspectRatio && changed.$focus3aspectRatio1) {
					atlas2_changes.aspectRatio = ctx.$focus3aspectRatio1;
					atlas2_updating.aspectRatio = ctx.$focus3aspectRatio1 !== void 0;
				}
				if (!atlas2_updating.scale && changed.$focus3scale1) {
					atlas2_changes.scale = ctx.$focus3scale1;
					atlas2_updating.scale = ctx.$focus3scale1 !== void 0;
				}
				if (!atlas2_updating.gcx && changed.$focus3gcx1) {
					atlas2_changes.gcx = ctx.$focus3gcx1;
					atlas2_updating.gcx = ctx.$focus3gcx1 !== void 0;
				}
				if (!atlas2_updating.gcy && changed.$focus3gcy1) {
					atlas2_changes.gcy = ctx.$focus3gcy1;
					atlas2_updating.gcy = ctx.$focus3gcy1 !== void 0;
				}
				atlas2._set(atlas2_changes);
				atlas2_updating = {};

				var loupe2_changes = {};
				if (changed.loupeSize) loupe2_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe2_changes.height = ctx.loupeSize;
				loupe2._set(loupe2_changes);

				var atlas3_changes = {};
				if (changed.layerName) atlas3_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas3_updating.gridSize && changed.gridSize) {
					atlas3_changes.gridSize = ctx.gridSize
	        ;
					atlas3_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas3_updating.showLabels && changed.showLabels) {
					atlas3_changes.showLabels = ctx.showLabels
	        ;
					atlas3_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas3_updating.homeX && changed.$focus3Highlights) {
					atlas3_changes.homeX = ctx.$focus3Highlights[1].homeX;
					atlas3_updating.homeX = ctx.$focus3Highlights[1].homeX !== void 0;
				}
				if (!atlas3_updating.homeY && changed.$focus3Highlights) {
					atlas3_changes.homeY = ctx.$focus3Highlights[1].homeY;
					atlas3_updating.homeY = ctx.$focus3Highlights[1].homeY !== void 0;
				}
				if (!atlas3_updating.homeScale && changed.$focus3Highlights) {
					atlas3_changes.homeScale = ctx.$focus3Highlights[1].homeScale;
					atlas3_updating.homeScale = ctx.$focus3Highlights[1].homeScale !== void 0;
				}
				if (!atlas3_updating.aspectRatio && changed.$focus3aspectRatio1) {
					atlas3_changes.aspectRatio = ctx.$focus3aspectRatio1;
					atlas3_updating.aspectRatio = ctx.$focus3aspectRatio1 !== void 0;
				}
				if (!atlas3_updating.scale && changed.$focus3scale1) {
					atlas3_changes.scale = ctx.$focus3scale1;
					atlas3_updating.scale = ctx.$focus3scale1 !== void 0;
				}
				if (!atlas3_updating.gcx && changed.$focus3gcx1) {
					atlas3_changes.gcx = ctx.$focus3gcx1;
					atlas3_updating.gcx = ctx.$focus3gcx1 !== void 0;
				}
				if (!atlas3_updating.gcy && changed.$focus3gcy1) {
					atlas3_changes.gcy = ctx.$focus3gcy1;
					atlas3_updating.gcy = ctx.$focus3gcy1 !== void 0;
				}
				atlas3._set(atlas3_changes);
				atlas3_updating = {};

				var loupe3_changes = {};
				if (changed.loupeSize) loupe3_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe3_changes.height = ctx.loupeSize;
				loupe3._set(loupe3_changes);

				var atlas4_changes = {};
				if (changed.layerName) atlas4_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas4_updating.gridSize && changed.gridSize) {
					atlas4_changes.gridSize = ctx.gridSize
	        ;
					atlas4_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas4_updating.showLabels && changed.showLabels) {
					atlas4_changes.showLabels = ctx.showLabels
	        ;
					atlas4_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas4_updating.homeX && changed.$focus3Highlights) {
					atlas4_changes.homeX = ctx.$focus3Highlights[2].homeX;
					atlas4_updating.homeX = ctx.$focus3Highlights[2].homeX !== void 0;
				}
				if (!atlas4_updating.homeY && changed.$focus3Highlights) {
					atlas4_changes.homeY = ctx.$focus3Highlights[2].homeY;
					atlas4_updating.homeY = ctx.$focus3Highlights[2].homeY !== void 0;
				}
				if (!atlas4_updating.homeScale && changed.$focus3Highlights) {
					atlas4_changes.homeScale = ctx.$focus3Highlights[2].homeScale;
					atlas4_updating.homeScale = ctx.$focus3Highlights[2].homeScale !== void 0;
				}
				if (!atlas4_updating.aspectRatio && changed.$focus3aspectRatio2) {
					atlas4_changes.aspectRatio = ctx.$focus3aspectRatio2;
					atlas4_updating.aspectRatio = ctx.$focus3aspectRatio2 !== void 0;
				}
				if (!atlas4_updating.scale && changed.$focus3scale2) {
					atlas4_changes.scale = ctx.$focus3scale2;
					atlas4_updating.scale = ctx.$focus3scale2 !== void 0;
				}
				if (!atlas4_updating.gcx && changed.$focus3gcx2) {
					atlas4_changes.gcx = ctx.$focus3gcx2;
					atlas4_updating.gcx = ctx.$focus3gcx2 !== void 0;
				}
				if (!atlas4_updating.gcy && changed.$focus3gcy2) {
					atlas4_changes.gcy = ctx.$focus3gcy2;
					atlas4_updating.gcy = ctx.$focus3gcy2 !== void 0;
				}
				atlas4._set(atlas4_changes);
				atlas4_updating = {};

				var loupe4_changes = {};
				if (changed.loupeSize) loupe4_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe4_changes.height = ctx.loupeSize;
				loupe4._set(loupe4_changes);

				var atlas5_changes = {};
				if (changed.layerName) atlas5_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas5_updating.gridSize && changed.gridSize) {
					atlas5_changes.gridSize = ctx.gridSize
	        ;
					atlas5_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas5_updating.showLabels && changed.showLabels) {
					atlas5_changes.showLabels = ctx.showLabels
	        ;
					atlas5_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas5_updating.homeX && changed.$focus3Highlights) {
					atlas5_changes.homeX = ctx.$focus3Highlights[2].homeX;
					atlas5_updating.homeX = ctx.$focus3Highlights[2].homeX !== void 0;
				}
				if (!atlas5_updating.homeY && changed.$focus3Highlights) {
					atlas5_changes.homeY = ctx.$focus3Highlights[2].homeY;
					atlas5_updating.homeY = ctx.$focus3Highlights[2].homeY !== void 0;
				}
				if (!atlas5_updating.homeScale && changed.$focus3Highlights) {
					atlas5_changes.homeScale = ctx.$focus3Highlights[2].homeScale;
					atlas5_updating.homeScale = ctx.$focus3Highlights[2].homeScale !== void 0;
				}
				if (!atlas5_updating.aspectRatio && changed.$focus3aspectRatio2) {
					atlas5_changes.aspectRatio = ctx.$focus3aspectRatio2;
					atlas5_updating.aspectRatio = ctx.$focus3aspectRatio2 !== void 0;
				}
				if (!atlas5_updating.scale && changed.$focus3scale2) {
					atlas5_changes.scale = ctx.$focus3scale2;
					atlas5_updating.scale = ctx.$focus3scale2 !== void 0;
				}
				if (!atlas5_updating.gcx && changed.$focus3gcx2) {
					atlas5_changes.gcx = ctx.$focus3gcx2;
					atlas5_updating.gcx = ctx.$focus3gcx2 !== void 0;
				}
				if (!atlas5_updating.gcy && changed.$focus3gcy2) {
					atlas5_changes.gcy = ctx.$focus3gcy2;
					atlas5_updating.gcy = ctx.$focus3gcy2 !== void 0;
				}
				atlas5._set(atlas5_changes);
				atlas5_updating = {};

				var loupe5_changes = {};
				if (changed.loupeSize) loupe5_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe5_changes.height = ctx.loupeSize;
				loupe5._set(loupe5_changes);

				var atlas6_changes = {};
				if (changed.layerName) atlas6_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas6_updating.gridSize && changed.gridSize) {
					atlas6_changes.gridSize = ctx.gridSize
	        ;
					atlas6_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas6_updating.showLabels && changed.showLabels) {
					atlas6_changes.showLabels = ctx.showLabels
	        ;
					atlas6_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas6_updating.homeX && changed.$focus3Highlights) {
					atlas6_changes.homeX = ctx.$focus3Highlights[3].homeX;
					atlas6_updating.homeX = ctx.$focus3Highlights[3].homeX !== void 0;
				}
				if (!atlas6_updating.homeY && changed.$focus3Highlights) {
					atlas6_changes.homeY = ctx.$focus3Highlights[3].homeY;
					atlas6_updating.homeY = ctx.$focus3Highlights[3].homeY !== void 0;
				}
				if (!atlas6_updating.homeScale && changed.$focus3Highlights) {
					atlas6_changes.homeScale = ctx.$focus3Highlights[3].homeScale;
					atlas6_updating.homeScale = ctx.$focus3Highlights[3].homeScale !== void 0;
				}
				if (!atlas6_updating.aspectRatio && changed.$focus3aspectRatio3) {
					atlas6_changes.aspectRatio = ctx.$focus3aspectRatio3;
					atlas6_updating.aspectRatio = ctx.$focus3aspectRatio3 !== void 0;
				}
				if (!atlas6_updating.scale && changed.$focus3scale3) {
					atlas6_changes.scale = ctx.$focus3scale3;
					atlas6_updating.scale = ctx.$focus3scale3 !== void 0;
				}
				if (!atlas6_updating.gcx && changed.$focus3gcx3) {
					atlas6_changes.gcx = ctx.$focus3gcx3;
					atlas6_updating.gcx = ctx.$focus3gcx3 !== void 0;
				}
				if (!atlas6_updating.gcy && changed.$focus3gcy3) {
					atlas6_changes.gcy = ctx.$focus3gcy3;
					atlas6_updating.gcy = ctx.$focus3gcy3 !== void 0;
				}
				atlas6._set(atlas6_changes);
				atlas6_updating = {};

				var loupe6_changes = {};
				if (changed.loupeSize) loupe6_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe6_changes.height = ctx.loupeSize;
				loupe6._set(loupe6_changes);

				var atlas7_changes = {};
				if (changed.layerName) atlas7_changes.id = "inceptionv1_" + ctx.layerName;
				if (!atlas7_updating.gridSize && changed.gridSize) {
					atlas7_changes.gridSize = ctx.gridSize
	        ;
					atlas7_updating.gridSize = ctx.gridSize
	         !== void 0;
				}
				if (!atlas7_updating.showLabels && changed.showLabels) {
					atlas7_changes.showLabels = ctx.showLabels
	        ;
					atlas7_updating.showLabels = ctx.showLabels
	         !== void 0;
				}
				if (!atlas7_updating.homeX && changed.$focus3Highlights) {
					atlas7_changes.homeX = ctx.$focus3Highlights[3].homeX;
					atlas7_updating.homeX = ctx.$focus3Highlights[3].homeX !== void 0;
				}
				if (!atlas7_updating.homeY && changed.$focus3Highlights) {
					atlas7_changes.homeY = ctx.$focus3Highlights[3].homeY;
					atlas7_updating.homeY = ctx.$focus3Highlights[3].homeY !== void 0;
				}
				if (!atlas7_updating.homeScale && changed.$focus3Highlights) {
					atlas7_changes.homeScale = ctx.$focus3Highlights[3].homeScale;
					atlas7_updating.homeScale = ctx.$focus3Highlights[3].homeScale !== void 0;
				}
				if (!atlas7_updating.aspectRatio && changed.$focus3aspectRatio3) {
					atlas7_changes.aspectRatio = ctx.$focus3aspectRatio3;
					atlas7_updating.aspectRatio = ctx.$focus3aspectRatio3 !== void 0;
				}
				if (!atlas7_updating.scale && changed.$focus3scale3) {
					atlas7_changes.scale = ctx.$focus3scale3;
					atlas7_updating.scale = ctx.$focus3scale3 !== void 0;
				}
				if (!atlas7_updating.gcx && changed.$focus3gcx3) {
					atlas7_changes.gcx = ctx.$focus3gcx3;
					atlas7_updating.gcx = ctx.$focus3gcx3 !== void 0;
				}
				if (!atlas7_updating.gcy && changed.$focus3gcy3) {
					atlas7_changes.gcy = ctx.$focus3gcy3;
					atlas7_updating.gcy = ctx.$focus3gcy3 !== void 0;
				}
				atlas7._set(atlas7_changes);
				atlas7_updating = {};

				var loupe7_changes = {};
				if (changed.loupeSize) loupe7_changes.width = ctx.loupeSize;
				if (changed.loupeSize) loupe7_changes.height = ctx.loupeSize;
				loupe7._set(loupe7_changes);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div9);
				}

				atlas0.destroy();
				loupe0.destroy();
				atlas1.destroy();
				loupe1.destroy();
				atlas2.destroy();
				loupe2.destroy();
				atlas3.destroy();
				loupe3.destroy();
				atlas4.destroy();
				loupe4.destroy();
				atlas5.destroy();
				loupe5.destroy();
				atlas6.destroy();
				loupe6.destroy();
				atlas7.destroy();
				loupe7.destroy();
			}
		};
	}

	function Focus3Table(options) {
		this._debugName = '<Focus3Table>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Focus3Table> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["focus3Highlights","focus3aspectRatio0","focus3scale0","focus3gcx0","focus3gcy0","focus3aspectRatio1","focus3scale1","focus3gcx1","focus3gcy1","focus3aspectRatio2","focus3scale2","focus3gcx2","focus3gcy2","focus3aspectRatio3","focus3scale3","focus3gcx3","focus3gcy3"]), data$w()), options.data);
		this.store._add(this, ["focus3Highlights","focus3aspectRatio0","focus3scale0","focus3gcx0","focus3gcy0","focus3aspectRatio1","focus3scale1","focus3gcx1","focus3gcy1","focus3aspectRatio2","focus3scale2","focus3gcx2","focus3gcy2","focus3aspectRatio3","focus3scale3","focus3gcx3","focus3gcy3"]);
		if (!('loupeSize' in this._state)) console.warn("<Focus3Table> was created without expected data property 'loupeSize'");
		if (!('layerName' in this._state)) console.warn("<Focus3Table> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<Focus3Table> was created without expected data property 'gridSize'");
		if (!('showLabels' in this._state)) console.warn("<Focus3Table> was created without expected data property 'showLabels'");
		if (!('$focus3Highlights' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3Highlights'");
		if (!('$focus3aspectRatio0' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3aspectRatio0'");
		if (!('$focus3scale0' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3scale0'");
		if (!('$focus3gcx0' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3gcx0'");
		if (!('$focus3gcy0' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3gcy0'");
		if (!('$focus3aspectRatio1' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3aspectRatio1'");
		if (!('$focus3scale1' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3scale1'");
		if (!('$focus3gcx1' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3gcx1'");
		if (!('$focus3gcy1' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3gcy1'");
		if (!('$focus3aspectRatio2' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3aspectRatio2'");
		if (!('$focus3scale2' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3scale2'");
		if (!('$focus3gcx2' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3gcx2'");
		if (!('$focus3gcy2' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3gcy2'");
		if (!('$focus3aspectRatio3' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3aspectRatio3'");
		if (!('$focus3scale3' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3scale3'");
		if (!('$focus3gcx3' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3gcx3'");
		if (!('$focus3gcy3' in this._state)) console.warn("<Focus3Table> was created without expected data property '$focus3gcy3'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$D(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Focus3Table.prototype, protoDev);

	Focus3Table.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/FocusPlayground.html generated by Svelte v2.15.3 */

	function labels({$inceptionLabels}) {
	  return classesToKeep.map(k => {
	    return {label: $inceptionLabels[k], i: k};
	  })
	}

	function data$x() {
	  return {
	    layerName: "mixed4d",
	    gridSize: 1,
	    classHeatmap: 235,
	    showHoverImage: 1,
	  }
	}
	const file$D = "src/diagrams/FocusPlayground.html";

	function get_each_context$9(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.l = list[i];
		return child_ctx;
	}

	function create_main_fragment$E(component, ctx) {
		var div5, div0, text0, div1, atlasstack_updating = {}, text1, div4, div2, button0, text3, button1, text5, div3, atlas_updating = {};

		var each_value = ctx.labels;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$a(component, get_each_context$9(ctx, each_value, i));
		}

		var atlasstack_initial_data = {};
		if (ctx.layerName !== void 0) {
			atlasstack_initial_data.selectedLayerName = ctx.layerName;
			atlasstack_updating.selectedLayerName = true;
		}
		var atlasstack = new AtlasStack({
			root: component.root,
			store: component.store,
			data: atlasstack_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasstack_updating.selectedLayerName && changed.selectedLayerName) {
					newState.layerName = childState.selectedLayerName;
				}
				component._set(newState);
				atlasstack_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasstack._bind({ selectedLayerName: 1 }, atlasstack.get());
		});

		var atlas_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	alphaAttributionFactor: "10",
		 	scaleCountFactor: "10",
		 	iconCrop: "0.2"
		 };
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
		if (ctx.classHeatmap
	         !== void 0) {
			atlas_initial_data.classHeatmap = ctx.classHeatmap
	        ;
			atlas_updating.classHeatmap = true;
		}
		if (ctx.showHoverImage
	         !== void 0) {
			atlas_initial_data.showHoverImage = ctx.showHoverImage
	        ;
			atlas_updating.showHoverImage = true;
		}
		var atlas = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas_updating.classHeatmap && changed.classHeatmap) {
					newState.classHeatmap = childState.classHeatmap;
				}

				if (!atlas_updating.showHoverImage && changed.showHoverImage) {
					newState.showHoverImage = childState.showHoverImage;
				}
				component._set(newState);
				atlas_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas._bind({ gridSize: 1, showLabels: 1, classHeatmap: 1, showHoverImage: 1 }, atlas.get());
		});

		return {
			c: function create() {
				div5 = createElement("div");
				div0 = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				text0 = createText("\n\n  ");
				div1 = createElement("div");
				atlasstack._fragment.c();
				text1 = createText("\n  \n  ");
				div4 = createElement("div");
				div2 = createElement("div");
				button0 = createElement("button");
				button0.textContent = "Zoom In";
				text3 = createText("\n      ");
				button1 = createElement("button");
				button1.textContent = "Zoom Out";
				text5 = createText("\n    ");
				div3 = createElement("div");
				atlas._fragment.c();
				div0.className = "chooser svelte-1rdkii";
				addLoc(div0, file$D, 2, 2, 27);
				div1.className = "layer-chooser svelte-1rdkii";
				addLoc(div1, file$D, 8, 2, 239);
				addLoc(button0, file$D, 14, 6, 391);
				addLoc(button1, file$D, 15, 6, 422);
				div2.className = "resolution";
				addLoc(div2, file$D, 13, 4, 360);
				div3.className = "atlas svelte-1rdkii";
				addLoc(div3, file$D, 17, 4, 463);
				div4.className = "display svelte-1rdkii";
				addLoc(div4, file$D, 12, 2, 334);
				div5.className = "container svelte-1rdkii";
				addLoc(div5, file$D, 1, 0, 1);
			},

			m: function mount(target, anchor) {
				insert(target, div5, anchor);
				append(div5, div0);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div0, null);
				}

				append(div5, text0);
				append(div5, div1);
				atlasstack._mount(div1, null);
				append(div5, text1);
				append(div5, div4);
				append(div4, div2);
				append(div2, button0);
				append(div2, text3);
				append(div2, button1);
				append(div4, text5);
				append(div4, div3);
				atlas._mount(div3, null);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if (changed.classHeatmap || changed.labels) {
					each_value = ctx.labels;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$9(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$a(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				var atlasstack_changes = {};
				if (!atlasstack_updating.selectedLayerName && changed.layerName) {
					atlasstack_changes.selectedLayerName = ctx.layerName;
					atlasstack_updating.selectedLayerName = ctx.layerName !== void 0;
				}
				atlasstack._set(atlasstack_changes);
				atlasstack_updating = {};

				var atlas_changes = {};
				if (changed.layerName) atlas_changes.id = "inceptionv1_" + ctx.layerName;
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
				if (!atlas_updating.classHeatmap && changed.classHeatmap) {
					atlas_changes.classHeatmap = ctx.classHeatmap
	        ;
					atlas_updating.classHeatmap = ctx.classHeatmap
	         !== void 0;
				}
				if (!atlas_updating.showHoverImage && changed.showHoverImage) {
					atlas_changes.showHoverImage = ctx.showHoverImage
	        ;
					atlas_updating.showHoverImage = ctx.showHoverImage
	         !== void 0;
				}
				atlas._set(atlas_changes);
				atlas_updating = {};
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div5);
				}

				destroyEach(each_blocks, detach);

				atlasstack.destroy();
				atlas.destroy();
			}
		};
	}

	// (4:4) {#each labels as l}
	function create_each_block$a(component, ctx) {
		var label, input, input_value_value, text0_value = ctx.l.label, text0, text1, text2_value = ctx.l.i, text2, text3, label_class_value;

		function input_change_handler() {
			component.set({ classHeatmap: input.__value });
		}

		return {
			c: function create() {
				label = createElement("label");
				input = createElement("input");
				text0 = createText(text0_value);
				text1 = createText(" (");
				text2 = createText(text2_value);
				text3 = createText(")");
				component._bindingGroups[0].push(input);
				addListener(input, "change", input_change_handler);
				setAttribute(input, "type", "radio");
				input.__value = input_value_value = ctx.l.i;
				input.value = input.__value;
				input.className = "svelte-1rdkii";
				addLoc(input, file$D, 4, 62, 135);
				label.className = label_class_value = "" + (ctx.classHeatmap === ctx.l.i ? 'selected' : '') + " svelte-1rdkii";
				addLoc(label, file$D, 4, 6, 79);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, input);

				input.checked = input.__value === ctx.classHeatmap;

				append(label, text0);
				append(label, text1);
				append(label, text2);
				append(label, text3);
			},

			p: function update(changed, ctx) {
				if (changed.classHeatmap) input.checked = input.__value === ctx.classHeatmap;
				if ((changed.labels) && input_value_value !== (input_value_value = ctx.l.i)) {
					input.__value = input_value_value;
				}

				input.value = input.__value;
				if ((changed.labels) && text0_value !== (text0_value = ctx.l.label)) {
					setData(text0, text0_value);
				}

				if ((changed.labels) && text2_value !== (text2_value = ctx.l.i)) {
					setData(text2, text2_value);
				}

				if ((changed.classHeatmap || changed.labels) && label_class_value !== (label_class_value = "" + (ctx.classHeatmap === ctx.l.i ? 'selected' : '') + " svelte-1rdkii")) {
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

	function FocusPlayground(options) {
		this._debugName = '<FocusPlayground>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<FocusPlayground> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["inceptionLabels"]), data$x()), options.data);
		this.store._add(this, ["inceptionLabels"]);

		this._recompute({ $inceptionLabels: 1 }, this._state);
		if (!('$inceptionLabels' in this._state)) console.warn("<FocusPlayground> was created without expected data property '$inceptionLabels'");

		if (!('classHeatmap' in this._state)) console.warn("<FocusPlayground> was created without expected data property 'classHeatmap'");
		if (!('layerName' in this._state)) console.warn("<FocusPlayground> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<FocusPlayground> was created without expected data property 'gridSize'");
		if (!('showLabels' in this._state)) console.warn("<FocusPlayground> was created without expected data property 'showLabels'");
		if (!('showHoverImage' in this._state)) console.warn("<FocusPlayground> was created without expected data property 'showHoverImage'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$E(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(FocusPlayground.prototype, protoDev);

	FocusPlayground.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('labels' in newState && !this._updatingReadonlyProperty) throw new Error("<FocusPlayground>: Cannot set read-only property 'labels'");
	};

	FocusPlayground.prototype._recompute = function _recompute(changed, state) {
		if (changed.$inceptionLabels) {
			if (this._differs(state.labels, (state.labels = labels(state)))) changed.labels = true;
		}
	};

	/* src/diagrams/ClassComparisonSingle.html generated by Svelte v2.15.3 */

	function rightIndex$1({config, $classComparisons, currentClassComparisonIndex}) {
		return config ? config.class_filter.indexOf($classComparisons[currentClassComparisonIndex].left) : null;
	}

	function leftIndex$1({config, $classComparisons, currentClassComparisonIndex}) {
		return config ? config.class_filter.indexOf($classComparisons[currentClassComparisonIndex].right) : null;
	}

	function data$y() {
	  return {
	    currentClassComparisonIndex: 6,
	    layout: 0
	  };
	}
	const file$E = "src/diagrams/ClassComparisonSingle.html";

	function create_main_fragment$F(component, ctx) {
		var div6, div2, div0, atlas0_updating = {}, text0, div1, b0, text2, div5, div3, atlas1_updating = {}, text3, div4, b1;

		var atlas0_initial_data = {
		 	id: "class_filter_inceptionv1",
		 	classFilter: ctx.leftIndex,
		 	debug: true
		 };
		if (ctx.layout  !== void 0) {
			atlas0_initial_data.layout = ctx.layout ;
			atlas0_updating.layout = true;
		}
		if (ctx.config  !== void 0) {
			atlas0_initial_data.config = ctx.config ;
			atlas0_updating.config = true;
		}
		var atlas0 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas0_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas0_updating.layout && changed.layout) {
					newState.layout = childState.layout;
				}

				if (!atlas0_updating.config && changed.config) {
					newState.config = childState.config;
				}
				component._set(newState);
				atlas0_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas0._bind({ layout: 1, config: 1 }, atlas0.get());
		});

		var atlas1_initial_data = {
		 	id: "class_filter_inceptionv1",
		 	classFilter: ctx.rightIndex,
		 	debug: true
		 };
		if (ctx.layout  !== void 0) {
			atlas1_initial_data.layout = ctx.layout ;
			atlas1_updating.layout = true;
		}
		if (ctx.config  !== void 0) {
			atlas1_initial_data.config = ctx.config ;
			atlas1_updating.config = true;
		}
		var atlas1 = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas1_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlas1_updating.layout && changed.layout) {
					newState.layout = childState.layout;
				}

				if (!atlas1_updating.config && changed.config) {
					newState.config = childState.config;
				}
				component._set(newState);
				atlas1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas1._bind({ layout: 1, config: 1 }, atlas1.get());
		});

		return {
			c: function create() {
				div6 = createElement("div");
				div2 = createElement("div");
				div0 = createElement("div");
				atlas0._fragment.c();
				text0 = createText("\n    ");
				div1 = createElement("div");
				b0 = createElement("b");
				b0.textContent = "red fox";
				text2 = createText("\n  ");
				div5 = createElement("div");
				div3 = createElement("div");
				atlas1._fragment.c();
				text3 = createText("\n    ");
				div4 = createElement("div");
				b1 = createElement("b");
				b1.textContent = "grey fox";
				div0.className = "atlas svelte-eedxs5";
				addLoc(div0, file$E, 10, 4, 356);
				b0.className = "svelte-eedxs5";
				addLoc(b0, file$E, 13, 28, 522);
				div1.className = "figcaption svelte-eedxs5";
				addLoc(div1, file$E, 13, 4, 498);
				addLoc(div2, file$E, 9, 2, 346);
				div3.className = "atlas svelte-eedxs5";
				addLoc(div3, file$E, 16, 4, 565);
				b1.className = "svelte-eedxs5";
				addLoc(b1, file$E, 19, 28, 732);
				div4.className = "figcaption svelte-eedxs5";
				addLoc(div4, file$E, 19, 4, 708);
				addLoc(div5, file$E, 15, 2, 555);
				setStyle(div6, "display", "grid");
				setStyle(div6, "grid-auto-flow", "column");
				setStyle(div6, "grid-column-gap", "1px");
				setStyle(div6, "grid-auto-columns", "1fr");
				addLoc(div6, file$E, 8, 0, 245);
			},

			m: function mount(target, anchor) {
				insert(target, div6, anchor);
				append(div6, div2);
				append(div2, div0);
				atlas0._mount(div0, null);
				append(div2, text0);
				append(div2, div1);
				append(div1, b0);
				append(div6, text2);
				append(div6, div5);
				append(div5, div3);
				atlas1._mount(div3, null);
				append(div5, text3);
				append(div5, div4);
				append(div4, b1);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var atlas0_changes = {};
				if (changed.leftIndex) atlas0_changes.classFilter = ctx.leftIndex;
				if (!atlas0_updating.layout && changed.layout) {
					atlas0_changes.layout = ctx.layout ;
					atlas0_updating.layout = ctx.layout  !== void 0;
				}
				if (!atlas0_updating.config && changed.config) {
					atlas0_changes.config = ctx.config ;
					atlas0_updating.config = ctx.config  !== void 0;
				}
				atlas0._set(atlas0_changes);
				atlas0_updating = {};

				var atlas1_changes = {};
				if (changed.rightIndex) atlas1_changes.classFilter = ctx.rightIndex;
				if (!atlas1_updating.layout && changed.layout) {
					atlas1_changes.layout = ctx.layout ;
					atlas1_updating.layout = ctx.layout  !== void 0;
				}
				if (!atlas1_updating.config && changed.config) {
					atlas1_changes.config = ctx.config ;
					atlas1_updating.config = ctx.config  !== void 0;
				}
				atlas1._set(atlas1_changes);
				atlas1_updating = {};
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div6);
				}

				atlas0.destroy();
				atlas1.destroy();
			}
		};
	}

	function ClassComparisonSingle(options) {
		this._debugName = '<ClassComparisonSingle>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<ClassComparisonSingle> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["classComparisons"]), data$y()), options.data);
		this.store._add(this, ["classComparisons"]);

		this._recompute({ config: 1, $classComparisons: 1, currentClassComparisonIndex: 1 }, this._state);
		if (!('config' in this._state)) console.warn("<ClassComparisonSingle> was created without expected data property 'config'");
		if (!('$classComparisons' in this._state)) console.warn("<ClassComparisonSingle> was created without expected data property '$classComparisons'");
		if (!('currentClassComparisonIndex' in this._state)) console.warn("<ClassComparisonSingle> was created without expected data property 'currentClassComparisonIndex'");
		if (!('layout' in this._state)) console.warn("<ClassComparisonSingle> was created without expected data property 'layout'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$F(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ClassComparisonSingle.prototype, protoDev);

	ClassComparisonSingle.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('rightIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassComparisonSingle>: Cannot set read-only property 'rightIndex'");
		if ('leftIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassComparisonSingle>: Cannot set read-only property 'leftIndex'");
	};

	ClassComparisonSingle.prototype._recompute = function _recompute(changed, state) {
		if (changed.config || changed.$classComparisons || changed.currentClassComparisonIndex) {
			if (this._differs(state.rightIndex, (state.rightIndex = rightIndex$1(state)))) changed.rightIndex = true;
			if (this._differs(state.leftIndex, (state.leftIndex = leftIndex$1(state)))) changed.leftIndex = true;
		}
	};

	class MyStore extends Store { }

	const store = new MyStore({
		inceptionLabels: Labels.inception,
		currentClass: 62,
		classChoices: [9, 622, 780, 665, 652, 322, 288, 233, 225, 188, 169, 80, 76, 62, 61, 7, 355, 990, 897, 746, 791],
		// For class gradients and class comparisons
		currentClassComparisonIndex: 0,
		classComparisons: [
			{ id: "507_982", leftLabel: "snorkel", rightLabel: "scuba diver", left: 507, right: 982,
				annotation: [
					{pos: {x: 2, y:7}, desc: "shark-like"},
				]
			},
			{ id: "736_744", leftLabel: "head cabbage", rightLabel: "artichoke", left: 736, right: 744, annotation: []},
			{ id: "671_672", leftLabel: "frying pan", rightLabel: "wok", left: 671, right: 672, 
				annotation: [
					{pos: {x: 1, y:7}, desc: "noodles"}
				]
			},
			{ id: "777_831", leftLabel: "beer bottle", rightLabel: "wine bottle", left: 777, right: 831, annotation: []},
			// { id: "359_361", leftLabel: "cliff", rightLabel: "alp", left: 359, right: 361, annotation: []},
			// { id: "114_361", leftLabel: "Greater Swiss Mountain dog", rightLabel: "alp", left: 114, right: 361, annotation: []},
			{ id: "543_544", leftLabel: "computer keyboard", rightLabel: "typewriter keyboard", left: 543, right: 544, annotation: []},
			{ id: "28_205", leftLabel: "red wolf", rightLabel: "timber wolf", left: 28, right: 205, annotation: []},
			{ id: "67_62", leftLabel: "grey fox", rightLabel: "red fox", left: 67, right: 62, annotation: [] },
			// { id: "28_62", leftLabel: "red wolf", rightLabel: "red fox", left: 28, right: 62, annotation: [] },
			{ id: "1_62", leftLabel: "kit fox", rightLabel: "red fox", left: 1, right: 62, annotation: [] },
			// { id: "902_827", left: 902, right: 827, annotation: []},
			// { id: "807_792", left: 807, right: 792, annotation: []},
			// { id: "233_942", left: 233, right: 942, annotation: []},
			{ id: "6_442", leftLabel: Labels.inception[6], rightLabel: Labels.inception[442], left: 6, right: 442, annotation: [
				{ pos: { x: 2, y: 7 }, desc: "baseball?" }
			]},
			// { id: "807_442", leftLabel: "", rightLabel: "", left: 807, right: 442, annotation: []},
		],
		focus3Highlights: [
			{
				homeX: 0.873,
				homeY: 0.415,
				homeScale: 10
			},
			{
				homeX: 0.660,
				homeY: 0.405,
				homeScale: 10
			},
			{
				homeX: 0.208,
				homeY: 0.160,
				homeScale: 10
			},
			{
				homeX: 0.807,
				homeY: 0.333,
				homeScale: 10
			},
		]
	});

	window.store = store;


	new LazyComponent({
		target: document.querySelector("#cover"),
		store: store,
		data: {
			height: 556,
			component: Cover,
		}
	});


	const notebookLinks = document.querySelectorAll("[data-notebook-url]");
	for (const link of notebookLinks) {
		const url = link.getAttribute("data-notebook-url");
		new NotebookLink({
			target: link,
			data: {
				url: url
			}
		});
	}

	new Overview({ target: document.querySelector("#overview") });

	new ModelOverview({ target: document.querySelector("#model-overview") });

	new GridDetail({ target: document.querySelector("#grid-detail") });

	new LazyComponent({
		target: document.querySelector("#activation-grid"),
		data: {
			aspectRatio: 3.5,
			component: ActivationGrid
		}
	});

	new LazyComponent({
		target: document.querySelector("#process"),
		data: {
			aspectRatio: 2.1,
			component: Process
		}
	});

	new LazyComponent({
		store: store,
		target: document.querySelector("#one-layer"),
		data: {
			aspectRatio: 1,
			component: OneLayer
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-1"),
		store: store,
		data: {
			aspectRatio: 3,
			component: LayerAnnotation,
			componentData: {
				homeX: 0.306,
				homeY: 0.035
			},
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-2"),
		store: store,
		data: {
			aspectRatio: 3,
			component: LayerAnnotation,
			componentData: {
				homeX: 0.309,
				homeY: 0.173,
			},
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-3"),
		store: store,
		data: {
			aspectRatio: 3,
			component: LayerAnnotation,
			componentData: {
				homeX: 0.335,
				homeY: 0.353,
				gridSize: 3,
				homeScale: 32
			},
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-4"),
		store: store,
		data: {
			component: LayerAnnotation,
			aspectRatio: 3,
			componentData: {
				homeX: 0.330,
				homeY: 0.666,
			},
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-5"),
		store: store,
		data: {
			aspectRatio: 3,
			component: LayerAnnotation,
			componentData: {
				homeX: 0.281,
				homeY: 0.761,
			},
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-6"),
		store: store,
		data: {
			aspectRatio: 3,
			component: LayerAnnotation,
			componentData: {
				homeX: 0.944,
				homeY: 0.510
			},
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-7"),
		store: store,
		data: {
			aspectRatio: 3,
			component: LayerAnnotation,
			componentData: {
				homeX: 0.837,
				homeY: 0.239
			},
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-8"),
		store: store,
		data: {
			aspectRatio: 3,
			component: LayerAnnotation,
			componentData: {
				homeX: 0.594,
				homeY: 0.223
			},
		}
	});


	// bokeh
	new LazyComponent({
		target: document.querySelector("#show-a-path-0"),
		store: store,
		data: {
			aspectRatio: 5.6,
			component: ShowAPath,
			componentData: {
				layerName: "mixed4c",
				pointList: [
					[0.161, 0.38610000610351564],
					[0.161, 0.39373501368931363],
					[0.161, 0.4013700212751116],
					[0.161, 0.40900500161307196],
					[0.161, 0.41664000919886995],
					[0.161, 0.42427498953683035],
					[0.161, 0.43190999712262834],
					[0.161, 0.43954500470842633],
					[0.161, 0.4471800122942243],
					[0.161, 0.4548149926321847],
					[0.161, 0.46244997297014506],
					[0.161, 0.47008498055594305],
					[0.161, 0.47771998814174105],
					[0.161, 0.48535499572753904],
					[0.161, 0.49299000331333703],
					[0.161, 0.500625010899135],
					[0.161, 0.5082600184849331],
					[0.161, 0.5158949715750558],
					[0.161, 0.5235299791608538],
					[0.161, 0.5311649867466518]
				],
			}
		}
	});

	// crowd -> single person
	new LazyComponent({
		target: document.querySelector("#show-a-path-1"),
		store: store,
		data: {
			aspectRatio: 5.6,
			component: ShowAPath,
			componentData: {
				layerName: "mixed4c",
				pointList: [
					[0.877770015171596, 0.35276998792375835],
					[0.8758255004882812, 0.3431870596749442],
					[0.8738809858049665, 0.3336041041782924],
					[0.871936525617327, 0.3240211486816406],
					[0.8699920109340122, 0.31443819318498883],
					[0.8680474962506975, 0.30485523768833706],
					[0.8661029815673829, 0.2952722821916853],
					[0.8641585213797432, 0.2856893266950335],
					[0.8622140066964286, 0.2761063711983817],
					[0.8602694920131139, 0.26652344294956754],
					[0.8583249773297991, 0.25694048745291576],
					[0.8563805171421596, 0.24735755920410157],
					[0.8544360024588449, 0.23777460370744977],
					[0.8524914877755302, 0.228191648210798],
					[0.8505469730922154, 0.2186086927141462],
					[0.8486025129045759, 0.20902573721749443],
					[0.8466579982212612, 0.19944279534476145],
					[0.8447134835379464, 0.18985985347202847],
					[0.8427689688546317, 0.1802768979753767],
					[0.8408245086669922, 0.17069394247872488],
				],
			}
		}
	});

	// water -> ground
	new LazyComponent({
		target: document.querySelector("#show-a-path-2"),
		store: store,
		data: {
			aspectRatio: 5.6,
			component: ShowAPath,
			componentData: {
				layerName: "mixed4c",
				pointList: [
					[0.275, 0.775],
					[0.2794630323137556, 0.7651796068464006],
					[0.2839260646275112, 0.7553592136928013],
					[0.28838912418910434, 0.7455388205392021],
					[0.29285215650285995, 0.7357184273856027],
					[0.2973151888166155, 0.7258980342320034],
					[0.3017782483782087, 0.716077641078404],
					[0.3040830067225865, 0.7056094578334263],
					[0.30576556069510324, 0.6949544634137835],
					[0.30744808741978236, 0.6842995234898158],
					[0.3091306413922991, 0.6736445835658482],
					[0.31081319536481583, 0.6629896436418806],
					[0.31111000605991906, 0.6522259303501674],
					[0.31111000605991906, 0.641438947405134],
					[0.31111000605991906, 0.6306520189557757],
					[0.31111000605991906, 0.6198650360107422],
					[0.31111000605991906, 0.6090780530657087],
					[0.3058485576084682, 0.5997803279331753],
					[0.3001950400216239, 0.5905935559953962],
					[0.2945415224347796, 0.5814067840576171]
				],
			}
		}
	});


	// fruit
	new LazyComponent({
		target: document.querySelector("#show-a-path-3"),
		store: store,
		data: {
			aspectRatio: 5.6,
			component: ShowAPath,
			componentData: {
				layerName: "mixed4c",
				pointList: [
					[0.610, 0.130],
					[0.609, 0.132],
					[0.607, 0.139],
					[0.606, 0.141],
					[0.605, 0.145],
					[0.603, 0.151],
					[0.600, 0.158],
					[0.597, 0.164],
					[0.596, 0.169],
					[0.594, 0.175],
					[0.593, 0.177],
					[0.592, 0.183],
					[0.589, 0.188],
					[0.587, 0.191],
					[0.585, 0.195],
					[0.582, 0.200],
					[0.581, 0.204],
					[0.579, 0.208],
					[0.578, 0.213],
					[0.577, 0.219]
				],
			}
		}
	});

	// Looking at Multiple Layers


	new LazyComponent({
		target: document.querySelector("#abacus-0"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed3b",
				homeX: 0.8086,
				homeY: 0.4295,
				gridSize: 3,
				homeScale: 16 * 1.5 * 2,
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#abacus-1"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed4c",
				homeX: 0.8593,
				homeY: 0.5814
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#abacus-2"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed5b",
				homeX: 0.8118,
				homeY: 0.2039,
				gridSize: 4,
				homeScale: 16 * 6,
			}
		}
	});


	new LazyComponent({
		target: document.querySelector("#plant-0"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed3b",
				homeX: 0.3222, 
				homeY: 0.6352,
				gridSize: 3,
				homeScale: 16 * 1.5 * 2,
			}
		}
	});


	new LazyComponent({
		target: document.querySelector("#plant-1"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed4c",
				homeX: 0.146,
				homeY: 0.392,
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#plant-2"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed5b",
				homeX: 0.1668,
				homeY: 0.2833,
				gridSize: 4,
				homeScale: 16 * 3 * 2,
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#water-0"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed4c",
				homeX: 0.365,
				homeY: 0.673,
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#water-1"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed4c",
				homeX: 0.318,
				homeY: 0.764,
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#water-2"),
		store: store,
		data: {
			aspectRatio: 0.75,
			component: VerticalLayerAnnotation,
			componentData: {
				layerName: "mixed5b",
				homeX: 0.740,
				homeY: 0.534,
				gridSize: 4,
				homeScale: 16 * 6,
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#all-layer-comparison"),
		store: store,
		data: {
			aspectRatio: 2,
			component: AllLayerComparison,
			componentData: {
			}
		}
	});

	// Focusing on a Single Classification

	new LazyComponent({
		target: document.querySelector("#focus-1"),
		store: store,
		data: {
			aspectRatio: 2,
			component: Focus1,
		}
	});

	new LazyComponent({
		target: document.querySelector("#focus-2"),
		store: store,
		data: {
			aspectRatio: 2,
			component: Focus2,
		}
	});

	new LazyComponent({
		target: document.querySelector("#focus-3"),
		store: store,
		data: {
			aspectRatio: 2,
			component: Focus3,
		}
	});

	new LazyComponent({
		target: document.querySelector("#focus-3-table"),
		store: store,
		data: {
			aspectRatio: 1,
			component: Focus3Table,
		}
	});

	new LazyComponent({
		target: document.querySelector("#focus-playground"),
		store: store,
		data: {
			aspectRatio: 2,
			component: FocusPlayground,
		}
	});

	// Further Isolating Classes

	new ClassSubset({
		target: document.querySelector("#class-subset"),
		store: store,
	});

	new ClassComparison({
		target: document.querySelector("#class-comparison-1"),
		store: store,
		data: {
			showControls: false,
			classComparisonIndex: 6
		}
	});

	new ClassComparison({
		target: document.querySelector("#class-comparison-2"),
		store: store,
		data: {
			showControls: false,
			classComparisonIndex: 0
		}
	});

	new ClassGradient({
		target: document.querySelector("#class-gradient-snorkel"),
		store: store,
		data: {
			currentClassComparisonIndex: 0
		}
	});

	new ClassGradient({
		target: document.querySelector("#class-gradient-frying-pan"),
		store: store,
		data: {
			currentClassComparisonIndex: 2
		}
	});

	new ClassGradient({
		target: document.querySelector("#class-gradient-shark"),
		store: store,
		data: {
			currentClassComparisonIndex: 8
		}
	});

	new Adversarial({
		target: document.querySelector("#snorkel-scuba-diver"),
		store: store,
		data: {
				aspectRatio: 480 / 360,
				left: "snorkel",
				right: "scuba diver",
				classifications: [
					{
						image: "assets/images/snorkel-06.png",
						caption: "Image from ImageNet labeled as “snorkel” with the classification confidences from Inceptionv1 for the top six classes.",
						rows: [
							["snorkel", 34.33],
							["scuba diver", 28.16],
							["coral reef", 12.43],
							["loggerhead", 11.11],
							["lionfish", 3.84],
							["sea snake", 2.19]
						]
					},
					{
						image: "assets/images/teethshark-07.png",
						caption: "By adding a picture of one of the concepts seen in the visualization above we can change the classification. With an added picture of a “shark” (also from ImageNet) the confidence of “scuba diver” classification rises and “snorkel” drops significantly.",
						rows: [
							["scuba diver", 50.30],
							["coral reef", 22.44],
							["tiger shark", 9.08],
							["snorkel", 3.92],
							["lionfish", 2.38],
							["loggerhead", 2.12]
						]
					},
					{
						image: "assets/images/teethshark-05.png",
						caption: "As the picture of the shark gets bigger, the classification for “great white shark” increases, but the relative changes in confidence of “snorkel” and “scuba diver” remain.",
						rows: [
							["great white shark", 81.73],
							["tiger shark", 15.30],
							["scuba diver", 1.62],
							["loggerhead", 0.30],
							["coho", 0.29],
							["snorkel", 0.15]
						]
					}
				]
			}
	});


	new Adversarial({
		target: document.querySelector("#frying-pan-wok"),
		store: store,
		data: {
				left: "frying pan",
				right: "wok",
				aspectRatio: 806 / 608,
				classifications: [
					{
						image: "assets/images/fry-06.png",
						caption: "Image from ImageNet labeled as “frying pan” with the classification confidences from Inceptionv1 for the top six classes.",
						rows: [
							["frying pan", 34.62],
							["stove", 16.33],
							["strainer", 11.04],
							["wok", 9.72],
							["caldron", 8.79],
							["Dutch oven", 6.02],
						]
					},
					{
						image: "assets/images/fry-noodles-14.png",
						caption: "By adding a picture of some noodles, also from ImageNet, we can see the top classification change from “frying pan” to “wok.”",
						rows: [
							["wok", 48.30],
							["frying pan", 18.64],
							["strainer", 14.03],
							["ladle", 4.40],
							["stove", 2.77],
							["caldron", 2.60],
						]
					},
					{
						image: "assets/images/fry-10.png",
						caption: "As we make the picture of noodles larger, its influence overpowers the other classifications, but “wok” remains ranked above “frying pan”.",
						rows: [
							["carbonara", 87.79],
							["strainer", 8.16],
							["wok", 1.67],
							["ladle", 0.45],
							["frying pan", 0.37],
							["French horn", 0.27],
						]
					}
				]
			}
	});

	new Adversarial({
		target: document.querySelector("#shark-grey-whale"),
		store: store,
		data: {
				left: "great white shark",
				right: "grey whale",
				aspectRatio: 996 / 656,
				classifications: [
					{
						image: "assets/images/whale-03.jpg",
						caption: "",
						rows: [
							["grey whale", 78.39],
							["killer whale", 20.97],
							["great white shark", 0.34],
							["gar", 0.13],
							["sea lion", 0.09],
							["tiger shark", 0.02],
						]
					},
					{
						image: "assets/images/whale-06.jpg",
						caption: "",
						rows: [
							["great white shark", 34.35],
							["rugby ball", 23.55],
							["grey whale", 12.91],
							["baseball", 10.89],
							["killer whale", 7.70],
							["ping - pong ball", 3.42],
						]
					},
					{
						image: "assets/images/whale-05.jpg",
						caption: "",
						rows: [
							["baseball", 31.13],
							["ping-pong ball", 22.93],
							["great white shark", 14.01],
							["grey whale", 8.11],
							["rugby ball", 7.34],
							["killer whale", 6.06],
						]
					},
				]
			}
	});


	// Technical Notes and Limitations


	new Samples({
		target: document.querySelector("#samples")
	});

	new ClassGrids({
		target: document.querySelector("#class-grids")
	});

}());
//# sourceMappingURL=main.js.map
