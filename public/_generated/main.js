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

	function setXlinkAttribute(node, attribute, value) {
		node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
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

	class MyStore extends Store { }

	const store = new MyStore({
	  inceptionLabels: inceptionLabels.inception,
	  currentClass: 62,
	  currentClassAtlasIndex: 507,
	  currentClassAtlasCompareIndex: 507,
	  classChoices: [9, 622, 665, 652, 288, 233, 188, 169, 80, 76, 62, 61, 7, 355, 990, 746, 791],
	  classAtlasIndices: [
	    
	    62,
	    9,
	    169,
	    7,
	    80,
	    76,
	    235,
	    982,
	    507,
	    41,
	    2,
	    // 176,
	    442,
	    450,
	    454,
	    // 529,
	    930,
	    378,
	    582,
	    780,
	    901,
	    946,
	    791,
	    738,
	    736,
	    744,
	    // 936,
	    // 367,
	    // 488,
	    489,
	    387,
	    388,
	    399,
	    721,
	    // 671,
	    672,
	    6,
	    665,
	    652,
	    288,
	    // 233,
	    355,
	    348,
	    804,
	    // 990,
	    // 323,
	    600,
	    605,
	    631,
	    643,
	    // 677,
	    // 947,
	    // 737,
	  ],
	  // For class gradients and class comparisons
	  currentClassComparisonIndex: 0,
	  classComparisons: [
	    {
	      id: "507_982", leftLabel: "snorkel", rightLabel: "scuba diver", left: 507, right: 982,
	      annotation: [
	        { pos: { x: 2, y: 7 }, desc: "shark-like" },
	      ]
	    },
	    { id: "736_744", leftLabel: "head cabbage", rightLabel: "artichoke", left: 736, right: 744, annotation: [] },
	    {
	      id: "671_672", leftLabel: "frying pan", rightLabel: "wok", left: 671, right: 672,
	      annotation: [
	        { pos: { x: 1, y: 7 }, desc: "noodles" }
	      ]
	    },
	    { id: "777_831", leftLabel: "beer bottle", rightLabel: "wine bottle", left: 777, right: 831, annotation: [] },
	    // { id: "359_361", leftLabel: "cliff", rightLabel: "alp", left: 359, right: 361, annotation: []},
	    // { id: "114_361", leftLabel: "Greater Swiss Mountain dog", rightLabel: "alp", left: 114, right: 361, annotation: []},
	    { id: "543_544", leftLabel: "computer keyboard", rightLabel: "typewriter keyboard", left: 543, right: 544, annotation: [] },
	    { id: "28_205", leftLabel: "red wolf", rightLabel: "timber wolf", left: 28, right: 205, annotation: [] },
	    { id: "67_62", leftLabel: "grey fox", rightLabel: "red fox", left: 67, right: 62, annotation: [] },
	    // { id: "28_62", leftLabel: "red wolf", rightLabel: "red fox", left: 28, right: 62, annotation: [] },
	    { id: "1_62", leftLabel: "kit fox", rightLabel: "red fox", left: 1, right: 62, annotation: [] },
	    // { id: "902_827", left: 902, right: 827, annotation: []},
	    // { id: "807_792", left: 807, right: 792, annotation: []},
	    // { id: "233_942", left: 233, right: 942, annotation: []},
	    {
	      id: "6_442", leftLabel: inceptionLabels.inception[6], rightLabel: inceptionLabels.inception[442], left: 6, right: 442, annotation: [
	        { pos: { x: 2, y: 7 }, desc: "baseball?" }
	      ]
	    },
	    // { id: "807_442", leftLabel: "", rightLabel: "", left: 807, right: 442, annotation: []},
	  ],
	  focus1Highlight: {
	    scale:6,
	    x:0.844,
	    y:0.510
	  },
	  focusHighlights: [
	    {
	      scale: 10,
	      x: 0.873,
	      y: 0.415,
	    },
	    {
	      scale: 10,
	      x: 0.709,
	      y: 0.421,
	    },
	    {
	      scale: 10,
	      x: 0.221,
	      y: 0.138,
	    },
	    {
	      scale: 10,
	      x: 0.807,
	      y: 0.333,
	    },
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
	  ],
	  pois: {
	    mammals: {
	      layerName: "mixed4a",
	      gridSize: 2,
	      gcx: 0.3705,
	      gcy: 0.9475,
	      scale: 8
	    },
	    dogs: {
	      layerName: "mixed5b",
	      gridSize: 3,
	      gcx: 0.678,
	      gcy: 0.931,
	      scale: 8

	    },
	    curves: {
	      layerName: "mixed4b",
	      gridSize: 3,
	      gcx: 0.5947,
	      gcy: 0.3351,
	      scale: 14
	    },
	    cups: {
	      layerName: "mixed5b",
	      gridSize: 3,
	      gcx: 0.35073,
	      gcy: 0.1380,
	      scale: 10
	    },
	    patterns: {
	      layerName: "mixed4b",
	      gridSize: 3,
	      gcx: 0.91579,
	      gcy: 0.32406,
	      scale: 8
	    },
	    text: {
	      layerName: "mixed5a",
	      gridSize: 3,
	      gcx: 0.5281,
	      gcy: 0.0234,
	      scale: 19
	    },
	    fabric: {
	      layerName: "mixed4b",
	      gridSize: 3,
	      gcx: 0.4890,
	      gcy: 0.2043,
	      scale: 12
	    },
	    clothing: {
	      layerName: "mixed5a",
	      gridSize: 3,
	      gcx: 0.74955,
	      gcy: 0.5058,
	      scale: 13
	    }
	  }
	});

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

	/* src/library/Placeholder.html generated by Svelte v2.15.3 */

	function width({clientWidth}) {
		return clientWidth;
	}

	function height({width, aspectRatio}) {
		return width / aspectRatio;
	}

	function data$2() {
	  return {
	    display: "block",
	    aspectRatio: 1,
	    clientWidth: 0,
	    
	  }
	}
	const file$3 = "src/library/Placeholder.html";

	function create_main_fragment$3(component, ctx) {
		var div1, div0, slot_content_default = component._slotted.default, div1_resize_listener;

		function div1_resize_handler() {
			component.set({ clientWidth: div1.clientWidth });
		}

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				div0.className = "container svelte-xqvv98";
				addLoc(div0, file$3, 1, 2, 103);
				component.root._beforecreate.push(div1_resize_handler);
				div1.className = "root svelte-xqvv98";
				setStyle(div1, "display", ctx.display);
				setStyle(div1, "padding-bottom", "" + 100 / ctx.aspectRatio + "%");
				addLoc(div1, file$3, 0, 0, 0);
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
		this._state = assign(data$2(), options.data);

		this._recompute({ clientWidth: 1, width: 1, aspectRatio: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<Placeholder> was created without expected data property 'clientWidth'");

		if (!('aspectRatio' in this._state)) console.warn("<Placeholder> was created without expected data property 'aspectRatio'");
		if (!('display' in this._state)) console.warn("<Placeholder> was created without expected data property 'display'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$3(this, this._state);

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

	function data$3() {
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
	const file$4 = "src/library/LazyImage.html";

	function create_main_fragment$4(component, ctx) {
		var div, if_block_anchor, radar_updating = {}, div_class_value;

		function select_block_type(ctx) {
			if (ctx.ready) return create_if_block$1;
			return create_else_block$1;
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
				addLoc(div, file$4, 0, 0, 0);
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
	function create_else_block$1(component, ctx) {

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
	function create_if_block$1(component, ctx) {
		var img;

		return {
			c: function create() {
				img = createElement("img");
				img.src = ctx.src;
				img.alt = ctx.alt;
				img.className = "svelte-lat22x svelte-ref-image";
				addLoc(img, file$4, 4, 8, 151);
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
		this._state = assign(data$3(), options.data);
		if (!('background' in this._state)) console.warn("<LazyImage> was created without expected data property 'background'");
		if (!('border' in this._state)) console.warn("<LazyImage> was created without expected data property 'border'");
		if (!('ready' in this._state)) console.warn("<LazyImage> was created without expected data property 'ready'");
		if (!('aspectRatio' in this._state)) console.warn("<LazyImage> was created without expected data property 'aspectRatio'");
		if (!('src' in this._state)) console.warn("<LazyImage> was created without expected data property 'src'");
		if (!('alt' in this._state)) console.warn("<LazyImage> was created without expected data property 'alt'");
		this._intro = true;

		this._fragment = create_main_fragment$4(this, this._state);

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

	/* src/library/NotebookLink.html generated by Svelte v2.15.3 */

	function data$4() {
	  return {
	    url: "",
	    text: "Try in a notebook",
	    emphasis: 1, // 0,1,2
	  }
	}
	const file$5 = "src/library/NotebookLink.html";

	function create_main_fragment$5(component, ctx) {
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
				addLoc(path, file$5, 2, 4, 81);
				setAttribute(svg, "viewBox", "0 0 18 18");
				setAttribute(svg, "class", "svelte-1i7b4jt");
				addLoc(svg, file$5, 1, 2, 51);
				span.className = "svelte-1i7b4jt";
				addLoc(span, file$5, 8, 2, 660);
				a.href = ctx.url;
				a.className = a_class_value = "root emphasis-" + ctx.emphasis + " svelte-1i7b4jt";
				addLoc(a, file$5, 0, 0, 0);
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
		this._state = assign(data$4(), options.data);
		if (!('url' in this._state)) console.warn("<NotebookLink> was created without expected data property 'url'");
		if (!('emphasis' in this._state)) console.warn("<NotebookLink> was created without expected data property 'emphasis'");
		if (!('text' in this._state)) console.warn("<NotebookLink> was created without expected data property 'text'");
		this._intro = true;

		this._fragment = create_main_fragment$5(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(NotebookLink.prototype, protoDev);

	NotebookLink.prototype._checkReadOnly = function _checkReadOnly(newState) {
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

	const file$6 = "src/library/Button.html";

	function create_main_fragment$6(component, ctx) {
		var button, slot_content_default = component._slotted.default;

		function click_handler(event) {
			component.fire('click');
		}

		return {
			c: function create() {
				button = createElement("button");
				addListener(button, "click", click_handler);
				button.className = "svelte-1d81900";
				addLoc(button, file$6, 0, 0, 0);
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

		this._fragment = create_main_fragment$6(this, this._state);

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

	const file$7 = "src/library/icons/svg/baseline-add-24px.svg";

	function create_main_fragment$7(component, ctx) {
		var svg, path0, path1;

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path0 = createSvgElement("path");
				path1 = createSvgElement("path");
				setAttribute(path0, "d", "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z");
				addLoc(path0, file$7, 0, 83, 83);
				setAttribute(path1, "d", "M0 0h24v24H0z");
				setAttribute(path1, "fill", "none");
				addLoc(path1, file$7, 0, 130, 130);
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "width", "24");
				setAttribute(svg, "height", "24");
				setAttribute(svg, "viewBox", "0 0 24 24");
				addLoc(svg, file$7, 0, 0, 0);
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

		this._fragment = create_main_fragment$7(this, this._state);

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

	const file$8 = "src/library/icons/svg/baseline-remove-24px.svg";

	function create_main_fragment$8(component, ctx) {
		var svg, path0, path1;

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path0 = createSvgElement("path");
				path1 = createSvgElement("path");
				setAttribute(path0, "d", "M19 13H5v-2h14v2z");
				addLoc(path0, file$8, 0, 83, 83);
				setAttribute(path1, "d", "M0 0h24v24H0z");
				setAttribute(path1, "fill", "none");
				addLoc(path1, file$8, 0, 112, 112);
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "width", "24");
				setAttribute(svg, "height", "24");
				setAttribute(svg, "viewBox", "0 0 24 24");
				addLoc(svg, file$8, 0, 0, 0);
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

		this._fragment = create_main_fragment$8(this, this._state);

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

	const file$9 = "src/library/icons/svg/baseline-home-24px.svg";

	function create_main_fragment$9(component, ctx) {
		var svg, path0, path1;

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path0 = createSvgElement("path");
				path1 = createSvgElement("path");
				setAttribute(path0, "d", "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z");
				addLoc(path0, file$9, 0, 83, 83);
				setAttribute(path1, "d", "M0 0h24v24H0z");
				setAttribute(path1, "fill", "none");
				addLoc(path1, file$9, 0, 130, 130);
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "width", "24");
				setAttribute(svg, "height", "24");
				setAttribute(svg, "viewBox", "0 0 24 24");
				addLoc(svg, file$9, 0, 0, 0);
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

		this._fragment = create_main_fragment$9(this, this._state);

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

	function data$5() {
	  return {
	    color: "black"
	  }
	}
	const file$a = "src/library/icons/Navigation.html";

	function create_main_fragment$a(component, ctx) {
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
				addLoc(div, file$a, 0, 0, 0);
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
		this._state = assign(data$5(), options.data);

		this._recompute({ name: 1 }, this._state);
		if (!('name' in this._state)) console.warn("<Navigation> was created without expected data property 'name'");
		if (!('color' in this._state)) console.warn("<Navigation> was created without expected data property 'color'");
		this._intro = true;

		this._fragment = create_main_fragment$a(this, this._state);

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
	    // img.crossOrigin = "anonymous";
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

	// To add
	// 547, //abacus
	// 671, //frying pan
	// 672, //wok
	// 6, //grey whale

	/* src/AtlasDataLoader.html generated by Svelte v2.15.3 */



	function data$6() {
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
	function create_main_fragment$b(component, ctx) {

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
		this._state = assign(data$6(), options.data);
		this._intro = true;
		this._handlers.update = [onupdate];

		this._fragment = create_main_fragment$b(this, this._state);

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

	function data$7() {
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
	const file$c = "src/Zoom.html";

	function create_main_fragment$c(component, ctx) {
		var div;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "svelte-16epbqg svelte-ref-capture";
				addLoc(div, file$c, 0, 0, 0);
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
		this._state = assign(data$7(), options.data);

		this._recompute({ width: 1, unit: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<Zoom> was created without expected data property 'width'");
		if (!('unit' in this._state)) console.warn("<Zoom> was created without expected data property 'unit'");
		this._intro = true;

		this._fragment = create_main_fragment$c(this, this._state);

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

	function data$8() {
	  return {
	    ready: true,
	    id: "inceptionv1_mixed4c",
	    
	    config: null,
	    layers: null,
	    labels: null,

	    layer: 0,
	    layout: 0,
	    classFilter: 0,
	    filter: 0,

	    minActivations: 1,

	    showLabels: false,
	    textShadow: false,
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


	    backgroundColor: "white",
	    strokeColor: "rgb(220, 220, 220)",
	    strokeThickness: 1,
	    imageSmoothing: false,
	    fontSize: 10,
	    textColor: "white",
	    textShadowColor: "rgba(0, 0, 0, 0.8)",

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

	    const {imageSmoothing, minActivations, viewHeight, viewWidth, context, backgroundColor, config, layers, currentZoomIndex, strokeColor, strokeThickness, fontSize,textShadowColor, textColor, maxAttributionValue, classHeatmapMultiplier} = this.get();

	    this.clear();
	    // context.imageSmoothingQuality = "low";
	    context.imageSmoothingEnabled = imageSmoothing;

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
	                  context.lineWidth = strokeThickness;
	                  context.fillStyle = "white";
	                  context.beginPath();
	                  context.rect(dx, dy, iconWidth, iconWidth);
	                  context.stroke();
	                  context.fill();
	                  context.closePath();

	                  load(icon.url).then(response => {
	                    // check that we're still on the right layer/zoom
	                    const {currentZoomIndex, iconCrop, showLabels, textShadow} = this.get();
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
	                        context.font=fontSize + "px Helvetica";
	                        if (textShadow) {
	                          context.lineWidth = 2;
	                          context.strokeStyle = textShadowColor;
	                          context.strokeText(labels[icon.top_class_indices[0]], dx + 4, dy + iconWidth - 4, iconWidth - 8);
	                        }
	                        context.fillStyle = textColor;
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

	function oncreate$3() {
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
	const file$d = "src/Atlas.html";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.top = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$d(component, ctx) {
		var radar_updating = {}, text0, text1, div1, div0, zoom_updating = {}, text2, canvas, canvas_width_value, canvas_height_value, text3, div0_class_value, text4, div1_resize_listener;

		var radar_initial_data = {};
		if (ctx.ready  !== void 0) {
			radar_initial_data.ready = ctx.ready ;
			radar_updating.ready = true;
		}
		var radar = new Radar({
			root: component.root,
			store: component.store,
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

		var if_block2 = (ctx.labels && ctx.showHoverIcon && ctx.currentIconInfo && ctx.currentIconInfo.top_class_indices) && create_if_block$2(component, ctx);

		function div1_resize_handler() {
			component.set({ viewWidth: div1.clientWidth, viewHeight: div1.clientHeight });
		}

		return {
			c: function create() {
				radar._fragment.c();
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
				addLoc(canvas, file$d, 35, 6, 688);
				addListener(div0, "mousedown", mousedown_handler);
				addListener(div0, "mousemove", mousemove_handler);
				addListener(div0, "mouseenter", mouseenter_handler);
				addListener(div0, "mouseout", mouseout_handler);
				div0.className = div0_class_value = "" + ((ctx.mouseMoveMode == 'pan' & ctx.enableDragToPan) ? 'panning' : '') + " svelte-ptap6b" + " svelte-ref-stage";
				addLoc(div0, file$d, 20, 4, 275);
				component.root._beforecreate.push(div1_resize_handler);
				div1.className = "svelte-ptap6b svelte-ref-root";
				addLoc(div1, file$d, 15, 2, 185);
			},

			m: function mount(target, anchor) {
				radar._mount(target, anchor);
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
				var radar_changes = {};
				if (!radar_updating.ready && changed.ready) {
					radar_changes.ready = ctx.ready ;
					radar_updating.ready = ctx.ready  !== void 0;
				}
				radar._set(radar_changes);
				radar_updating = {};

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
						if_block2 = create_if_block$2(component, ctx);
						if_block2.c();
						if_block2.m(div1, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}
			},

			d: function destroy$$1(detach) {
				radar.destroy(detach);
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
				addLoc(div, file$d, 42, 8, 920);
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
	function create_if_block$2(component, ctx) {
		var div1, table, text0, text1, div0, text2, text3_value = ctx.currentIconInfo.num_activations, text3, text4;

		function select_block_type(ctx) {
			if (ctx.classHeatmap > -1) return create_if_block_2;
			return create_else_block$2;
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
				addLoc(table, file$d, 48, 8, 1378);
				setStyle(div0, "font-size", "10px");
				setStyle(div0, "margin-top", "4px");
				setStyle(div0, "color", "#999");
				setStyle(div0, "text-align", "right");
				addLoc(div0, file$d, 71, 8, 2413);
				div1.className = "hover svelte-ptap6b";
				setStyle(div1, "top", ((ctx.topLeftCornerHover.y + ctx.iconSizeInPixels + 10) + 'px'));
				setStyle(div1, "left", ((ctx.topLeftCornerHover.x + ctx.iconSizeInPixels + 10) + 'px'));
				addLoc(div1, file$d, 47, 6, 1218);
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
	function create_else_block$2(component, ctx) {
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
				addLoc(tr0, file$d, 50, 10, 1428);
				td0.className = "svelte-ptap6b";
				addLoc(td0, file$d, 55, 12, 1697);
				setStyle(td1, "text-align", "right");
				td1.className = "svelte-ptap6b";
				addLoc(td1, file$d, 56, 12, 1776);
				addLoc(tr1, file$d, 54, 10, 1680);
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
				addLoc(td0, file$d, 61, 14, 2003);
				td1.className = "" + (ctx.i == 0 ? 'first': '') + " svelte-ptap6b";
				addLoc(td1, file$d, 62, 14, 2095);
				setStyle(td2, "text-align", "right");
				td2.className = "svelte-ptap6b";
				addLoc(td2, file$d, 63, 14, 2163);
				addLoc(tr, file$d, 60, 12, 1984);
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
				addLoc(canvas, file$d, 69, 10, 2358);
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
		this._state = assign(data$8(), options.data);

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

		this._fragment = create_main_fragment$d(this, this._state);

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

	function data$9() {
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

	const file$e = "src/AtlasReticle.html";

	function create_main_fragment$e(component, ctx) {
		var div, div_resize_listener;

		var if_block = (ctx.scale) && create_if_block$3(component, ctx);

		function div_resize_handler() {
			component.set({ width: div.clientWidth, height: div.clientHeight });
		}

		return {
			c: function create() {
				div = createElement("div");
				if (if_block) if_block.c();
				component.root._beforecreate.push(div_resize_handler);
				div.className = "root svelte-1ejkfbm";
				addLoc(div, file$e, 0, 0, 0);
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
						if_block = create_if_block$3(component, ctx);
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
	function create_if_block$3(component, ctx) {
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
				setAttribute(path, "class", path_class_value = "" + (ctx.background ? '' : 'transparent') + " svelte-1ejkfbm");
				setAttribute(path, "d", path_d_value = "M0,0 L" + ctx.width + ",0 L" + ctx.width + "," + ctx.height + " L0," + ctx.height + " z M" + ctx.left + "," + ctx.top + " L" + ctx.left + "," + ctx.bottom + " L" + ctx.right + "," + ctx.bottom + "  L" + ctx.right + "," + ctx.top + " z");
				addLoc(path, file$e, 3, 4, 114);
				setAttribute(svg, "width", ctx.width);
				setAttribute(svg, "height", ctx.height);
				setAttribute(svg, "class", "svelte-1ejkfbm");
				addLoc(svg, file$e, 2, 2, 87);
				addListener(div, "mousemove", mousemove_handler_1);
				addListener(div, "mousedown", mousedown_handler);
				addListener(div, "mouseup", mouseup_handler_1);
				div.className = div_class_value = "reticle " + (ctx.round ? 'round' : '') + " svelte-1ejkfbm";
				setStyle(div, "box-sizing", "content-box");
				setStyle(div, "border-color", ctx.color);
				setStyle(div, "top", "" + (ctx.top-2.5) + "px");
				setStyle(div, "left", "" + (ctx.left-2.5) + "px");
				setStyle(div, "width", "" + (ctx.right-ctx.left-1) + "px");
				setStyle(div, "height", "" + (ctx.bottom-ctx.top-1) + "px");
				setStyle(div, "cursor", "" + (ctx.enableDragging ? 'move' : 'default') + "\n      ");
				addLoc(div, file$e, 10, 2, 383);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path);
				insert(target, text, anchor);
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
			},

			p: function update(changed, ctx) {
				if ((changed.background) && path_class_value !== (path_class_value = "" + (ctx.background ? '' : 'transparent') + " svelte-1ejkfbm")) {
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

				if ((changed.round) && div_class_value !== (div_class_value = "reticle " + (ctx.round ? 'round' : '') + " svelte-1ejkfbm")) {
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
				p.className = "annotation svelte-1ejkfbm";
				addLoc(p, file$e, 27, 10, 951);
				div0.className = "annotationTab svelte-1ejkfbm";
				setStyle(div0, "background", ctx.color);
				addLoc(div0, file$e, 26, 8, 885);
				div1.className = "annotationTabParent svelte-1ejkfbm";
				setStyle(div1, "top", "" + (ctx.w * ctx.width-2)/2 + "px");
				addLoc(div1, file$e, 25, 6, 810);
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
		this._state = assign(data$9(), options.data);

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

		this._fragment = create_main_fragment$e(this, this._state);

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

	/* src/components/AppMiniMap.html generated by Svelte v2.15.3 */

	function data$a() {
	  return {
	    scaleCountFactor: 200
	  }
	}
	const file$f = "src/components/AppMiniMap.html";

	function create_main_fragment$f(component, ctx) {
		var div, text, atlasreticle_updating = {};

		var atlas_initial_data = {
		 	id: ctx.id,
		 	classHeatmap: ctx.classHeatmap,
		 	gridSize: 1,
		 	iconCrop: 0.6,
		 	scaleCountFactor: ctx.scaleCountFactor,
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
				text = createText("\n    \n    ");
				atlasreticle._fragment.c();
				placeholder._fragment.c();
				div.className = "svelte-kiaj48 svelte-ref-root";
				addLoc(div, file$f, 0, 0, 0);
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
		this._state = assign(data$a(), options.data);
		if (!('id' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'id'");
		if (!('classHeatmap' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'classHeatmap'");
		if (!('scaleCountFactor' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'scaleCountFactor'");
		if (!('aspectRatio' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'aspectRatio'");
		if (!('scale' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'scale'");
		if (!('gcx' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'gcy'");
		this._intro = true;

		this._fragment = create_main_fragment$f(this, this._state);

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

	function data$b() {
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

	function oncreate$4() {
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
	function create_main_fragment$g(component, state) {
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
		this._state = assign$1(data$b(), options.data);
		this._recompute({ width: 1, height: 1 }, this._state);

		var _oncreate = oncreate$4.bind(this);

		if (!options.root) {
			this._oncreate = [];
		}

		this._fragment = create_main_fragment$g(this, this._state);

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

	function data$c() {
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

	function oncreate$5() {
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
	const file$g = "src/AtlasThumbnail.html";

	function create_main_fragment$h(component, ctx) {
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
				addLoc(canvas, file$g, 2, 2, 54);
				component.root._beforecreate.push(div_resize_handler);
				setStyle(div, "height", "" + ctx.height + "px");
				addLoc(div, file$g, 1, 0, 1);
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
		this._state = assign(data$c(), options.data);

		this._recompute({ clientWidth: 1, model: 1, layerName: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'clientWidth'");
		if (!('model' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'model'");
		if (!('layerName' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'layerName'");

		if (!('gridSize' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'gridSize'");
		this._intro = true;
		this._handlers.update = [onupdate$2];

		this._fragment = create_main_fragment$h(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$5.call(this);
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

	function data$d() { return {
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
	const file$h = "src/components/AppLayerChooser.html";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.layer = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$i(component, ctx) {
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
				addLoc(div, file$h, 0, 0, 0);
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
				addLoc(input, file$h, 3, 4, 114);
				setStyle(div, "width", "50px");
				setStyle(div, "position", "relative");
				addLoc(div, file$h, 4, 4, 172);
				span.className = "svelte-hzvbih";
				addLoc(span, file$h, 7, 4, 291);
				label.className = label_class_value = "layer " + (ctx.layerName == ctx.layer ? 'selected' : '') + " svelte-hzvbih";
				addLoc(label, file$h, 2, 2, 49);
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
		this._state = assign(data$d(), options.data);
		if (!('layers' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'layers'");
		if (!('layerName' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'layerName'");
		if (!('classHeatmap' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'classHeatmap'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._fragment = create_main_fragment$i(this, this._state);

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

	/* src/components/AppClassFilter.html generated by Svelte v2.15.3 */



	function labels({inceptionLabels: inceptionLabels$$1}) {
	  let out = classesToKeep.map(k => {
	    let l = inceptionLabels$$1.inception[k];
	    return {label: l, i: k};
	  });
	  return [{label: "show all", i: -1}].concat(out);
	}

	function data$e() {
	  return {
	    classesToKeep,
	    inceptionLabels,
	    classHeatmap: 235
	  }
	}
	const file$i = "src/components/AppClassFilter.html";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.l = list[i];
		return child_ctx;
	}

	function create_main_fragment$j(component, ctx) {
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
				addLoc(div, file$i, 0, 0, 0);
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
				addLoc(input, file$i, 3, 6, 111);
				span.title = span_title_value = ctx.l.i;
				addLoc(span, file$i, 4, 6, 172);
				label.className = label_class_value = "" + (ctx.classHeatmap === ctx.l.i ? 'selected' : '') + " svelte-h2ed57";
				addLoc(label, file$i, 2, 4, 48);
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
		this._state = assign(data$e(), options.data);

		this._recompute({ inceptionLabels: 1 }, this._state);
		if (!('inceptionLabels' in this._state)) console.warn("<AppClassFilter> was created without expected data property 'inceptionLabels'");

		if (!('classHeatmap' in this._state)) console.warn("<AppClassFilter> was created without expected data property 'classHeatmap'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._fragment = create_main_fragment$j(this, this._state);

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

	const file$j = "src/library/App/Panel.html";

	function create_main_fragment$k(component, ctx) {
		var div2, div0, slot_content_head = component._slotted.head, text, div1, slot_content_body = component._slotted.body;

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				text = createText("\n  ");
				div1 = createElement("div");
				div0.className = "head svelte-l56anp";
				addLoc(div0, file$j, 1, 2, 21);
				div1.className = "body svelte-l56anp";
				addLoc(div1, file$j, 4, 2, 81);
				div2.className = "root svelte-l56anp";
				addLoc(div2, file$j, 0, 0, 0);
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

		this._fragment = create_main_fragment$k(this, this._state);

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

	function data$f() {
	  return {
	    layerName: "mixed4c",
	    gridSize: 1,
	    classHeatmap: -1,
	    iconScaleFactor: 0.8,
	    iconCrop: 0.35,
	    showClassFilter: true,
	    showLayerChooser: true,
	    showOptions: true,
	    homeX: .5,
	    homeY: .5,
	    homeScale: 1,
	  }
	}
	var format_1 = format(".3f");

	const file$k = "src/components/App.html";

	function create_main_fragment$l(component, ctx) {
		var div22, div1, h20, text1, div0, appclassfilter_updating = {}, text2, div3, h21, text4, div2, applayerchooser_updating = {}, text5, div8, div7, atlas_updating = {}, text6, div6, div4, appminimap_updating = {}, text7, div5, text8, text9, text10, div21, h22, text12, div20, div12, div9, text13, raw0_value = format_1(ctx.gcx), raw0_before, text14, div10, text15, raw1_value = format_1(ctx.gcy), raw1_before, text16, div11, text17, raw2_value = format_1(ctx.scale), raw2_before, text18, div13, h30, text20, label0, input0, text21, text22, div14, h31, text24, label1, input1, text25, text26, label2, input2, text27, text28, label3, input3, text29, text30, label4, input4, text31, text32, label5, input5, text33, text34, div17, h32, text36, div15, text37, raw3_before, text38, input6, text39, br, text40, div16, text41, raw4_before, text42, input7, text43, div19, h33, text45, div18, text46, raw5_before, text47, input8, text48, label6, input9, text49, text50, label7, input10, text51;

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
		 	backgroundColor: "#dfdfdf",
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
		 	layerName: ctx.layerName,
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
				div22 = createElement("div");
				div1 = createElement("div");
				h20 = createElement("h2");
				h20.textContent = "Class Filter";
				text1 = createText("\n        ");
				div0 = createElement("div");
				appclassfilter._fragment.c();
				panel0._fragment.c();
				text2 = createText("\n    ");
				div3 = createElement("div");
				h21 = createElement("h2");
				h21.textContent = "Layer";
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
				div21 = createElement("div");
				h22 = createElement("h2");
				h22.textContent = "Options";
				text12 = createText("\n      ");
				div20 = createElement("div");
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
				h30 = createElement("h3");
				h30.textContent = "Attribution";
				text20 = createText("\n          ");
				label0 = createElement("label");
				input0 = createElement("input");
				text21 = createText(" show labels");
				text22 = createText("\n        ");
				div14 = createElement("div");
				h31 = createElement("h3");
				h31.textContent = "Grid size";
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
				div17 = createElement("div");
				h32 = createElement("h3");
				h32.textContent = "Icons";
				text36 = createText("\n          ");
				div15 = createElement("div");
				text37 = createText("density: ");
				raw3_before = createElement('noscript');
				text38 = createText("\n          ");
				input6 = createElement("input");
				text39 = createText("\n          ");
				br = createElement("br");
				text40 = createText("\n          ");
				div16 = createElement("div");
				text41 = createText("crop: ");
				raw4_before = createElement('noscript');
				text42 = createText("\n          ");
				input7 = createElement("input");
				text43 = createText("\n        ");
				div19 = createElement("div");
				h33 = createElement("h3");
				h33.textContent = "Class filter";
				text45 = createText("\n          ");
				div18 = createElement("div");
				text46 = createText("Intensity: ");
				raw5_before = createElement('noscript');
				text47 = createText("\n          ");
				input8 = createElement("input");
				text48 = createText("\n          ");
				label6 = createElement("label");
				input9 = createElement("input");
				text49 = createText(" positive influence");
				text50 = createText("\n          ");
				label7 = createElement("label");
				input10 = createElement("input");
				text51 = createText(" negative influence");
				panel2._fragment.c();
				setAttribute(h20, "slot", "head");
				addLoc(h20, file$k, 3, 8, 126);
				setAttribute(div0, "slot", "body");
				addLoc(div0, file$k, 4, 8, 168);
				div1.className = "filter svelte-1rc1tnm";
				setStyle(div1, "display", (ctx.showClassFilter ? 'block' : 'none'));
				addLoc(div1, file$k, 1, 4, 28);
				setAttribute(h21, "slot", "head");
				addLoc(h21, file$k, 13, 8, 398);
				setAttribute(div2, "slot", "body");
				addLoc(div2, file$k, 14, 8, 433);
				div3.className = "stack svelte-1rc1tnm";
				setStyle(div3, "display", (ctx.showLayerChooser ? 'block' : 'none'));
				addLoc(div3, file$k, 11, 4, 300);
				div4.className = "map svelte-1rc1tnm";
				setStyle(div4, "display", (ctx.scale > 1.0 ? 'block' : 'none'));
				addLoc(div4, file$k, 46, 10, 1198);
				div5.className = "buttons svelte-1rc1tnm";
				addLoc(div5, file$k, 59, 10, 1603);
				div6.className = "svelte-1rc1tnm svelte-ref-controls";
				addLoc(div6, file$k, 45, 8, 1169);
				div7.className = "atlas svelte-1rc1tnm";
				addLoc(div7, file$k, 23, 4, 611);
				div8.className = "main svelte-1rc1tnm";
				addLoc(div8, file$k, 22, 2, 588);
				setAttribute(h22, "slot", "head");
				addLoc(h22, file$k, 70, 6, 2165);
				addLoc(div9, file$k, 74, 10, 2264);
				addLoc(div10, file$k, 75, 10, 2308);
				addLoc(div11, file$k, 76, 10, 2352);
				addLoc(div12, file$k, 73, 8, 2248);
				addLoc(h30, file$k, 79, 8, 2429);
				addListener(input0, "change", input0_change_handler);
				setAttribute(input0, "type", "checkbox");
				addLoc(input0, file$k, 80, 17, 2467);
				label0.className = "svelte-1rc1tnm";
				addLoc(label0, file$k, 80, 10, 2460);
				addLoc(div13, file$k, 78, 8, 2415);
				addLoc(h31, file$k, 83, 10, 2590);
				component._bindingGroups[0].push(input1);
				addListener(input1, "change", input1_change_handler);
				setAttribute(input1, "type", "radio");
				input1.__value = 0;
				input1.value = input1.__value;
				addLoc(input1, file$k, 84, 17, 2626);
				label1.className = "svelte-1rc1tnm";
				addLoc(label1, file$k, 84, 10, 2619);
				component._bindingGroups[0].push(input2);
				addListener(input2, "change", input2_change_handler);
				setAttribute(input2, "type", "radio");
				input2.__value = 1;
				input2.value = input2.__value;
				addLoc(input2, file$k, 85, 17, 2706);
				label2.className = "svelte-1rc1tnm";
				addLoc(label2, file$k, 85, 10, 2699);
				component._bindingGroups[0].push(input3);
				addListener(input3, "change", input3_change_handler);
				setAttribute(input3, "type", "radio");
				input3.__value = 2;
				input3.value = input3.__value;
				addLoc(input3, file$k, 86, 17, 2786);
				label3.className = "svelte-1rc1tnm";
				addLoc(label3, file$k, 86, 10, 2779);
				component._bindingGroups[0].push(input4);
				addListener(input4, "change", input4_change_handler);
				setAttribute(input4, "type", "radio");
				input4.__value = 3;
				input4.value = input4.__value;
				addLoc(input4, file$k, 87, 17, 2866);
				label4.className = "svelte-1rc1tnm";
				addLoc(label4, file$k, 87, 10, 2859);
				component._bindingGroups[0].push(input5);
				addListener(input5, "change", input5_change_handler);
				setAttribute(input5, "type", "radio");
				input5.__value = 4;
				input5.value = input5.__value;
				addLoc(input5, file$k, 88, 17, 2948);
				label5.className = "svelte-1rc1tnm";
				addLoc(label5, file$k, 88, 10, 2941);
				div14.className = "grid-size";
				addLoc(div14, file$k, 82, 8, 2556);
				addLoc(h32, file$k, 91, 10, 3052);
				addLoc(div15, file$k, 92, 10, 3077);
				addListener(input6, "change", input6_change_input_handler);
				addListener(input6, "input", input6_change_input_handler);
				setAttribute(input6, "type", "range");
				input6.min = 0.2;
				input6.max = 10;
				input6.step = 0.1;
				addLoc(input6, file$k, 93, 10, 3131);
				addLoc(br, file$k, 94, 10, 3219);
				addLoc(div16, file$k, 95, 10, 3234);
				addListener(input7, "change", input7_change_input_handler);
				addListener(input7, "input", input7_change_input_handler);
				setAttribute(input7, "type", "range");
				input7.min = 0;
				input7.max = 0.5;
				input7.step = 0.01;
				addLoc(input7, file$k, 96, 10, 3278);
				addLoc(div17, file$k, 90, 8, 3036);
				addLoc(h33, file$k, 99, 10, 3444);
				addLoc(div18, file$k, 100, 10, 3476);
				addListener(input8, "change", input8_change_input_handler);
				addListener(input8, "input", input8_change_input_handler);
				setAttribute(input8, "type", "range");
				input8.min = "0.5";
				input8.max = "2";
				input8.step = "0.1";
				addLoc(input8, file$k, 101, 10, 3539);
				component._bindingGroups[1].push(input9);
				addListener(input9, "change", input9_change_handler);
				setAttribute(input9, "type", "radio");
				input9.__value = 1;
				input9.value = input9.__value;
				addLoc(input9, file$k, 102, 17, 3634);
				label6.className = "svelte-1rc1tnm";
				addLoc(label6, file$k, 102, 10, 3627);
				component._bindingGroups[1].push(input10);
				addListener(input10, "change", input10_change_handler);
				setAttribute(input10, "type", "radio");
				input10.__value = -1;
				input10.value = input10.__value;
				addLoc(input10, file$k, 103, 17, 3739);
				label7.className = "svelte-1rc1tnm";
				addLoc(label7, file$k, 103, 10, 3732);
				setStyle(div19, "display", (ctx.classHeatmap > -1 ? 'block' : 'none'));
				addLoc(div19, file$k, 98, 8, 3372);
				setAttribute(div20, "slot", "body");
				div20.className = "options-body svelte-1rc1tnm";
				addLoc(div20, file$k, 71, 6, 2200);
				div21.className = "options svelte-1rc1tnm";
				setStyle(div21, "display", (ctx.showOptions ? 'block' : 'none'));
				addLoc(div21, file$k, 68, 2, 2074);
				div22.className = "container svelte-1rc1tnm";
				addLoc(div22, file$k, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div22, anchor);
				append(div22, div1);
				append(panel0._slotted.head, h20);
				append(panel0._slotted.default, text1);
				append(panel0._slotted.body, div0);
				appclassfilter._mount(div0, null);
				panel0._mount(div1, null);
				append(div22, text2);
				append(div22, div3);
				append(panel1._slotted.head, h21);
				append(panel1._slotted.default, text4);
				append(panel1._slotted.body, div2);
				applayerchooser._mount(div2, null);
				panel1._mount(div3, null);
				append(div22, text5);
				append(div22, div8);
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
				append(div22, text10);
				append(div22, div21);
				append(panel2._slotted.head, h22);
				append(panel2._slotted.default, text12);
				append(panel2._slotted.body, div20);
				append(div20, div12);
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
				append(div20, text18);
				append(div20, div13);
				append(div13, h30);
				append(div13, text20);
				append(div13, label0);
				append(label0, input0);

				input0.checked = ctx.showLabels;

				append(label0, text21);
				append(div20, text22);
				append(div20, div14);
				append(div14, h31);
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
				append(div20, text34);
				append(div20, div17);
				append(div17, h32);
				append(div17, text36);
				append(div17, div15);
				append(div15, text37);
				append(div15, raw3_before);
				raw3_before.insertAdjacentHTML("afterend", ctx.iconScaleFactor);
				append(div17, text38);
				append(div17, input6);

				input6.value = ctx.iconScaleFactor;

				append(div17, text39);
				append(div17, br);
				append(div17, text40);
				append(div17, div16);
				append(div16, text41);
				append(div16, raw4_before);
				raw4_before.insertAdjacentHTML("afterend", ctx.iconCrop);
				append(div17, text42);
				append(div17, input7);

				input7.value = ctx.iconCrop;

				append(div20, text43);
				append(div20, div19);
				append(div19, h33);
				append(div19, text45);
				append(div19, div18);
				append(div18, text46);
				append(div18, raw5_before);
				raw5_before.insertAdjacentHTML("afterend", ctx.classHeatmapMultiplier);
				append(div19, text47);
				append(div19, input8);

				input8.value = ctx.classHeatmapMultiplier;

				append(div19, text48);
				append(div19, label6);
				append(label6, input9);

				input9.checked = input9.__value === ctx.classHeatmapPositive;

				append(label6, text49);
				append(div19, text50);
				append(div19, label7);
				append(label7, input10);

				input10.checked = input10.__value === ctx.classHeatmapPositive;

				append(label7, text51);
				panel2._mount(div21, null);
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
				if (changed.layerName) appminimap_changes.layerName = ctx.layerName;
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
					setStyle(div19, "display", (ctx.classHeatmap > -1 ? 'block' : 'none'));
				}

				if (changed.showOptions) {
					setStyle(div21, "display", (ctx.showOptions ? 'block' : 'none'));
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div22);
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
		this._state = assign(data$f(), options.data);

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
		if (!('showOptions' in this._state)) console.warn("<App> was created without expected data property 'showOptions'");
		this._bindingGroups = [[], []];
		this._intro = true;

		this._fragment = create_main_fragment$l(this, this._state);

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

	/* src/diagrams/Overview.html generated by Svelte v2.15.3 */

	const file$l = "src/diagrams/Overview.html";

	function create_main_fragment$m(component, ctx) {
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
				addLoc(h40, file$l, 2, 4, 27);
				div0.className = "figcaption svelte-7yn287";
				addLoc(div0, file$l, 7, 4, 148);
				addLoc(div1, file$l, 1, 2, 17);
				h41.className = "svelte-7yn287";
				addLoc(h41, file$l, 10, 4, 312);
				div2.className = "figcaption svelte-7yn287";
				addLoc(div2, file$l, 15, 4, 438);
				addLoc(div3, file$l, 9, 2, 302);
				h42.className = "svelte-7yn287";
				addLoc(h42, file$l, 18, 4, 638);
				div4.className = "figcaption svelte-7yn287";
				addLoc(div4, file$l, 23, 4, 760);
				addLoc(div5, file$l, 17, 2, 628);
				h43.className = "svelte-7yn287";
				addLoc(h43, file$l, 26, 4, 913);
				div6.className = "figcaption svelte-7yn287";
				addLoc(div6, file$l, 31, 4, 1031);
				addLoc(div7, file$l, 25, 2, 903);
				div8.className = "svelte-7yn287 svelte-ref-root";
				addLoc(div8, file$l, 0, 0, 0);
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

		this._fragment = create_main_fragment$m(this, this._state);

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

	const file$m = "src/diagrams/ModelOverview.html";

	function create_main_fragment$n(component, ctx) {
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
				addLoc(div, file$m, 0, 0, 0);
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

		this._fragment = create_main_fragment$n(this, this._state);

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

	const file$n = "src/diagrams/GridDetail.html";

	function create_main_fragment$o(component, ctx) {
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
				addLoc(div0, file$n, 7, 4, 116);
				addLoc(div1, file$n, 2, 2, 22);
				div2.className = "figcaption svelte-scrtb8";
				addLoc(div2, file$n, 14, 4, 287);
				addLoc(div3, file$n, 9, 2, 184);
				div4.className = "root svelte-scrtb8";
				addLoc(div4, file$n, 1, 0, 1);
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

		this._fragment = create_main_fragment$o(this, this._state);

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

	function root({filterType}) {
		return `https://storage.googleapis.com/activation-atlas/build/class_filter_inceptionv1_${filterType}/render/`;
	}

	function ticks$1({gridSize}) {
		return range(1, gridSize);
	}

	function src({root, classFilter, gridSize, filterType}) {
		return `${root}render--x=0--y=0--tries=3--alpha=False--tile_size=8--whiten=true--steps=1056--icon_size=80--grid_size=${gridSize}--layout=20_0.02_cosine--class_filter=${classFilter}_${filterType}--filter=None--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg`;
	}

	function data$g() {
	  return {
	    filterType: "winner",
	    classFilter: 62,
	    gridSize: 8
	  }
	}//https://storage.googleapis.com/activation-atlas/build/class_filter_inceptionv1_winner/render/render--x=0--y=0--tries=3--alpha=False--tile_size=8--whiten=true--steps=1056--icon_size=80--grid_size=8--layout=20_0.02_cosine--class_filter=112_winner--filter=None--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg
	// https://storage.googleapis.com/activation-atlas/build/class_filter_inceptionv1_combined/render/render--x=0--y=0--tries=3--alpha=False--tile_size=8--whiten=true--steps=2048--icon_size=80--grid_size=8--layout=20_0.01_cosine--class_filter=112_combined--filter=None--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg
	// https://storage.googleapis.com/activation-atlas/build/class_filter_inceptionv1_winner/render/render--x=0--y=0--tries=3--alpha=False--tile_size=8--whiten=true--steps=2048--icon_size=80--grid_size=8--layout=20_0.01_cosine--class_filter=1_winner--filter=None--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg
	// https://storage.googleapis.com/activation-atlas/build/class_filter_inceptionv1_top/render/render--x=0--y=0--tries=3--alpha=False--tile_size=8--whiten=true--steps=2048--icon_size=80--grid_size=8--layout=20_0.01_cosine--class_filter=112_top--filter=None--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg

	const file$o = "src/diagrams/ClassAtlas.html";

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

	function create_main_fragment$p(component, ctx) {
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
			each1_blocks[i] = create_each_block$3(component, get_each1_context(ctx, each1_value, i));
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
				addLoc(svg, file$o, 7, 2, 81);
				div.className = "svelte-hfoyhc svelte-ref-root";
				addLoc(div, file$o, 0, 0, 0);
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
							each1_blocks[i] = create_each_block$3(component, child_ctx);
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
				addLoc(line, file$o, 9, 4, 134);
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
	function create_each_block$3(component, ctx) {
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
				addLoc(line, file$o, 13, 4, 297);
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
		this._state = assign(data$g(), options.data);

		this._recompute({ filterType: 1, gridSize: 1, root: 1, classFilter: 1 }, this._state);
		if (!('filterType' in this._state)) console.warn("<ClassAtlas> was created without expected data property 'filterType'");
		if (!('gridSize' in this._state)) console.warn("<ClassAtlas> was created without expected data property 'gridSize'");

		if (!('classFilter' in this._state)) console.warn("<ClassAtlas> was created without expected data property 'classFilter'");
		this._intro = true;

		this._fragment = create_main_fragment$p(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ClassAtlas.prototype, protoDev);

	ClassAtlas.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('root' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassAtlas>: Cannot set read-only property 'root'");
		if ('ticks' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassAtlas>: Cannot set read-only property 'ticks'");
		if ('src' in newState && !this._updatingReadonlyProperty) throw new Error("<ClassAtlas>: Cannot set read-only property 'src'");
	};

	ClassAtlas.prototype._recompute = function _recompute(changed, state) {
		if (changed.filterType) {
			if (this._differs(state.root, (state.root = root(state)))) changed.root = true;
		}

		if (changed.gridSize) {
			if (this._differs(state.ticks, (state.ticks = ticks$1(state)))) changed.ticks = true;
		}

		if (changed.root || changed.classFilter || changed.gridSize || changed.filterType) {
			if (this._differs(state.src, (state.src = src(state)))) changed.src = true;
		}
	};

	/* src/diagrams/ClassSubset.html generated by Svelte v2.15.3 */

	function data$h() {
	  return {
	    layout: 0,
	  }
	}
	const file$p = "src/diagrams/ClassSubset.html";

	function get_each_context$3(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.c = list[i];
		return child_ctx;
	}

	function create_main_fragment$q(component, ctx) {
		var h4, text0, text1_value = ctx.$inceptionLabels[ctx.$currentClassAtlasIndex], text1, text2, text3, div3, div0, text4, div2, div1, text5, div4;

		var classatlas_initial_data = { classFilter: ctx.$currentClassAtlasIndex };
		var classatlas = new ClassAtlas({
			root: component.root,
			store: component.store,
			data: classatlas_initial_data
		});

		var each_value = ctx.$classAtlasIndices;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$4(component, get_each_context$3(ctx, each_value, i));
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
				text2 = createText("” from mixed5b");
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
				addLoc(h4, file$p, 0, 0, 0);
				setStyle(div0, "position", "relative");
				addLoc(div0, file$p, 2, 2, 112);
				div1.className = "chooser svelte-15rolwy";
				addLoc(div1, file$p, 6, 4, 249);
				div2.className = "chooser-container svelte-15rolwy";
				addLoc(div2, file$p, 5, 2, 213);
				div3.className = "svelte-15rolwy svelte-ref-root";
				addLoc(div3, file$p, 1, 0, 95);
				setStyle(div4, "margin-top", "16px");
				addLoc(div4, file$p, 16, 0, 553);
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
				if ((changed.$inceptionLabels || changed.$currentClassAtlasIndex) && text1_value !== (text1_value = ctx.$inceptionLabels[ctx.$currentClassAtlasIndex])) {
					setData(text1, text1_value);
				}

				var classatlas_changes = {};
				if (changed.$currentClassAtlasIndex) classatlas_changes.classFilter = ctx.$currentClassAtlasIndex;
				classatlas._set(classatlas_changes);

				if (changed.$currentClassAtlasIndex || changed.$classAtlasIndices || changed.$inceptionLabels) {
					each_value = ctx.$classAtlasIndices;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$3(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$4(component, child_ctx);
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

	// (8:6) {#each $classAtlasIndices as c}
	function create_each_block$4(component, ctx) {
		var label, input, input_value_value, text0, text1_value = ctx.$inceptionLabels[ctx.c], text1, text2, text3_value = ctx.c, text3, text4, label_class_value;

		function input_change_handler() {
			component.store.set({ currentClassAtlasIndex: input.__value });
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
				addLoc(input, file$p, 9, 10, 393);
				label.className = label_class_value = "" + (ctx.$currentClassAtlasIndex === ctx.c ? 'selected' : '') + " svelte-15rolwy";
				addLoc(label, file$p, 8, 8, 317);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, input);

				input.checked = input.__value === ctx.$currentClassAtlasIndex;

				append(label, text0);
				append(label, text1);
				append(label, text2);
				append(label, text3);
				append(label, text4);
			},

			p: function update(changed, ctx) {
				if (changed.$currentClassAtlasIndex) input.checked = input.__value === ctx.$currentClassAtlasIndex;
				if ((changed.$classAtlasIndices) && input_value_value !== (input_value_value = ctx.c)) {
					input.__value = input_value_value;
				}

				input.value = input.__value;
				if ((changed.$inceptionLabels || changed.$classAtlasIndices) && text1_value !== (text1_value = ctx.$inceptionLabels[ctx.c])) {
					setData(text1, text1_value);
				}

				if ((changed.$classAtlasIndices) && text3_value !== (text3_value = ctx.c)) {
					setData(text3, text3_value);
				}

				if ((changed.$currentClassAtlasIndex || changed.$classAtlasIndices) && label_class_value !== (label_class_value = "" + (ctx.$currentClassAtlasIndex === ctx.c ? 'selected' : '') + " svelte-15rolwy")) {
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
		this._state = assign(assign(this.store._init(["inceptionLabels","currentClassAtlasIndex","classAtlasIndices"]), data$h()), options.data);
		this.store._add(this, ["inceptionLabels","currentClassAtlasIndex","classAtlasIndices"]);
		if (!('$inceptionLabels' in this._state)) console.warn("<ClassSubset> was created without expected data property '$inceptionLabels'");
		if (!('$currentClassAtlasIndex' in this._state)) console.warn("<ClassSubset> was created without expected data property '$currentClassAtlasIndex'");
		if (!('$classAtlasIndices' in this._state)) console.warn("<ClassSubset> was created without expected data property '$classAtlasIndices'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$q(this, this._state);

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

	/* src/diagrams/ClassFilterComparison.html generated by Svelte v2.15.3 */

	function data$i() {
	  return {
	  };
	}
	const file$q = "src/diagrams/ClassFilterComparison.html";

	function get_each_context$4(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.c = list[i];
		return child_ctx;
	}

	function create_main_fragment$r(component, ctx) {
		var div8, div2, h40, text0, text1_value = ctx.$inceptionLabels[ctx.$currentClassAtlasCompareIndex], text1, text2, text3, div0, text4, div1, text6, div5, h41, text7, text8_value = ctx.$inceptionLabels[ctx.$currentClassAtlasCompareIndex], text8, text9, text10, div3, text11, div4, text13, div7, div6;

		var classatlas0_initial_data = {
		 	classFilter: ctx.$currentClassAtlasCompareIndex,
		 	filterType: "winner"
		 };
		var classatlas0 = new ClassAtlas({
			root: component.root,
			store: component.store,
			data: classatlas0_initial_data
		});

		var classatlas1_initial_data = {
		 	classFilter: ctx.$currentClassAtlasCompareIndex,
		 	filterType: "top"
		 };
		var classatlas1 = new ClassAtlas({
			root: component.root,
			store: component.store,
			data: classatlas1_initial_data
		});

		var each_value = ctx.$classAtlasIndices;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$5(component, get_each_context$4(ctx, each_value, i));
		}

		return {
			c: function create() {
				div8 = createElement("div");
				div2 = createElement("div");
				h40 = createElement("h4");
				text0 = createText("“");
				text1 = createText(text1_value);
				text2 = createText("” filtered by top rank");
				text3 = createText("\n    ");
				div0 = createElement("div");
				classatlas0._fragment.c();
				text4 = createText("\n    ");
				div1 = createElement("div");
				div1.textContent = "We pluck only those activations whose top attribution is toward the class in question. The results are often much more focused and isolated, exclusive to the class. Some are low magnitude, like backgrounds, and we miss correlations or concepts that are shared among many classes.";
				text6 = createText("\n  ");
				div5 = createElement("div");
				h41 = createElement("h4");
				text7 = createText("“");
				text8 = createText(text8_value);
				text9 = createText("” filtered by overall magnitude");
				text10 = createText("\n    ");
				div3 = createElement("div");
				classatlas1._fragment.c();
				text11 = createText("\n    ");
				div4 = createElement("div");
				div4.textContent = "Here we sort all the activations by the magnitude toward the class in question (independent of other classes) and take the top 2,000 activations. We see more correlated activations that could, on their own, contribute to another classification. Some of them are spurious, however.";
				text13 = createText("\n  ");
				div7 = createElement("div");
				div6 = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				h40.className = "svelte-1kmawds";
				addLoc(h40, file$q, 5, 4, 106);
				div0.className = "atlas";
				addLoc(div0, file$q, 6, 4, 193);
				div1.className = "figcaption svelte-1kmawds";
				addLoc(div1, file$q, 9, 4, 314);
				addLoc(div2, file$q, 4, 2, 96);
				h41.className = "svelte-1kmawds";
				addLoc(h41, file$q, 12, 4, 646);
				div3.className = "atlas";
				addLoc(div3, file$q, 13, 4, 742);
				div4.className = "figcaption svelte-1kmawds";
				addLoc(div4, file$q, 16, 4, 860);
				addLoc(div5, file$q, 11, 2, 636);
				div6.className = "chooser svelte-1kmawds";
				addLoc(div6, file$q, 19, 4, 1219);
				div7.className = "chooser-container svelte-1kmawds";
				addLoc(div7, file$q, 18, 2, 1183);
				setStyle(div8, "display", "grid");
				setStyle(div8, "grid-column-gap", "20px");
				setStyle(div8, "grid-template-columns", "1fr 1fr 200px");
				addLoc(div8, file$q, 2, 0, 2);
			},

			m: function mount(target, anchor) {
				insert(target, div8, anchor);
				append(div8, div2);
				append(div2, h40);
				append(h40, text0);
				append(h40, text1);
				append(h40, text2);
				append(div2, text3);
				append(div2, div0);
				classatlas0._mount(div0, null);
				append(div2, text4);
				append(div2, div1);
				append(div8, text6);
				append(div8, div5);
				append(div5, h41);
				append(h41, text7);
				append(h41, text8);
				append(h41, text9);
				append(div5, text10);
				append(div5, div3);
				classatlas1._mount(div3, null);
				append(div5, text11);
				append(div5, div4);
				append(div8, text13);
				append(div8, div7);
				append(div7, div6);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div6, null);
				}
			},

			p: function update(changed, ctx) {
				if ((changed.$inceptionLabels || changed.$currentClassAtlasCompareIndex) && text1_value !== (text1_value = ctx.$inceptionLabels[ctx.$currentClassAtlasCompareIndex])) {
					setData(text1, text1_value);
				}

				var classatlas0_changes = {};
				if (changed.$currentClassAtlasCompareIndex) classatlas0_changes.classFilter = ctx.$currentClassAtlasCompareIndex;
				classatlas0._set(classatlas0_changes);

				if ((changed.$inceptionLabels || changed.$currentClassAtlasCompareIndex) && text8_value !== (text8_value = ctx.$inceptionLabels[ctx.$currentClassAtlasCompareIndex])) {
					setData(text8, text8_value);
				}

				var classatlas1_changes = {};
				if (changed.$currentClassAtlasCompareIndex) classatlas1_changes.classFilter = ctx.$currentClassAtlasCompareIndex;
				classatlas1._set(classatlas1_changes);

				if (changed.$currentClassAtlasCompareIndex || changed.$classAtlasIndices || changed.$inceptionLabels) {
					each_value = ctx.$classAtlasIndices;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$4(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$5(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div6, null);
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
					detachNode(div8);
				}

				classatlas0.destroy();
				classatlas1.destroy();

				destroyEach(each_blocks, detach);
			}
		};
	}

	// (21:6) {#each $classAtlasIndices as c}
	function create_each_block$5(component, ctx) {
		var label, input, input_value_value, text0, text1_value = ctx.$inceptionLabels[ctx.c], text1, text2, text3_value = ctx.c, text3, text4, label_class_value;

		function input_change_handler() {
			component.store.set({ currentClassAtlasCompareIndex: input.__value });
		}

		return {
			c: function create() {
				label = createElement("label");
				input = createElement("input");
				text0 = createText("\n          ");
				text1 = createText(text1_value);
				text2 = createText(" (");
				text3 = createText(text3_value);
				text4 = createText(")\n        ");
				component._bindingGroups[0].push(input);
				addListener(input, "change", input_change_handler);
				setAttribute(input, "type", "radio");
				input.__value = input_value_value = ctx.c;
				input.value = input.__value;
				input.className = "svelte-1kmawds";
				addLoc(input, file$q, 22, 10, 1370);
				label.className = label_class_value = "" + (ctx.$currentClassAtlasCompareIndex === ctx.c ? 'selected' : '') + " svelte-1kmawds";
				addLoc(label, file$q, 21, 8, 1287);
			},

			m: function mount(target, anchor) {
				insert(target, label, anchor);
				append(label, input);

				input.checked = input.__value === ctx.$currentClassAtlasCompareIndex;

				append(label, text0);
				append(label, text1);
				append(label, text2);
				append(label, text3);
				append(label, text4);
			},

			p: function update(changed, ctx) {
				if (changed.$currentClassAtlasCompareIndex) input.checked = input.__value === ctx.$currentClassAtlasCompareIndex;
				if ((changed.$classAtlasIndices) && input_value_value !== (input_value_value = ctx.c)) {
					input.__value = input_value_value;
				}

				input.value = input.__value;
				if ((changed.$inceptionLabels || changed.$classAtlasIndices) && text1_value !== (text1_value = ctx.$inceptionLabels[ctx.c])) {
					setData(text1, text1_value);
				}

				if ((changed.$classAtlasIndices) && text3_value !== (text3_value = ctx.c)) {
					setData(text3, text3_value);
				}

				if ((changed.$currentClassAtlasCompareIndex || changed.$classAtlasIndices) && label_class_value !== (label_class_value = "" + (ctx.$currentClassAtlasCompareIndex === ctx.c ? 'selected' : '') + " svelte-1kmawds")) {
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

	function ClassFilterComparison(options) {
		this._debugName = '<ClassFilterComparison>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<ClassFilterComparison> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(assign(this.store._init(["inceptionLabels","currentClassAtlasCompareIndex","classAtlasIndices"]), data$i()), options.data);
		this.store._add(this, ["inceptionLabels","currentClassAtlasCompareIndex","classAtlasIndices"]);
		if (!('$inceptionLabels' in this._state)) console.warn("<ClassFilterComparison> was created without expected data property '$inceptionLabels'");
		if (!('$currentClassAtlasCompareIndex' in this._state)) console.warn("<ClassFilterComparison> was created without expected data property '$currentClassAtlasCompareIndex'");
		if (!('$classAtlasIndices' in this._state)) console.warn("<ClassFilterComparison> was created without expected data property '$classAtlasIndices'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$r(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(ClassFilterComparison.prototype, protoDev);

	ClassFilterComparison.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/ClassComparison.html generated by Svelte v2.15.3 */

	function leftIndex({$classComparisons, classComparisonIndex}) {
		return $classComparisons[classComparisonIndex].left;
	}

	function rightIndex({$classComparisons, classComparisonIndex}) {
		return $classComparisons[classComparisonIndex].right;
	}

	function data$j() {
	  return {
	    classComparisonIndex: 0,
	    showControls: true,
	    filterType: "top"
	  };
	}
	const file$r = "src/diagrams/ClassComparison.html";

	function click_handler(event) {
		const { component, ctx } = this._svelte;

		component.set({classComparisonIndex: ctx.i});
	}

	function get_each_context$5(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.comparison = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$s(component, ctx) {
		var text0, div4, div1, h40, text1, text2_value = ctx.$inceptionLabels[ctx.leftIndex], text2, text3, text4, div0, text5, div3, h41, text6, text7_value = ctx.$inceptionLabels[ctx.rightIndex], text7, text8, text9, div2;

		var if_block = (ctx.showControls) && create_if_block$4(component, ctx);

		var classatlas0_initial_data = {
		 	classFilter: ctx.leftIndex,
		 	filterType: ctx.filterType
		 };
		var classatlas0 = new ClassAtlas({
			root: component.root,
			store: component.store,
			data: classatlas0_initial_data
		});

		var classatlas1_initial_data = {
		 	classFilter: ctx.rightIndex,
		 	filterType: ctx.filterType
		 };
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
				addLoc(h40, file$r, 8, 4, 307);
				div0.className = "atlas";
				addLoc(div0, file$r, 9, 4, 352);
				addLoc(div1, file$r, 7, 2, 297);
				h41.className = "svelte-a1781g";
				addLoc(h41, file$r, 14, 4, 462);
				div2.className = "atlas";
				addLoc(div2, file$r, 15, 4, 508);
				addLoc(div3, file$r, 13, 2, 452);
				setStyle(div4, "display", "grid");
				setStyle(div4, "grid-auto-flow", "column");
				setStyle(div4, "grid-column-gap", "20px");
				setStyle(div4, "grid-auto-columns", "1fr");
				addLoc(div4, file$r, 6, 0, 195);
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
				if (changed.filterType) classatlas0_changes.filterType = ctx.filterType;
				classatlas0._set(classatlas0_changes);

				if ((changed.$inceptionLabels || changed.rightIndex) && text7_value !== (text7_value = ctx.$inceptionLabels[ctx.rightIndex])) {
					setData(text7, text7_value);
				}

				var classatlas1_changes = {};
				if (changed.rightIndex) classatlas1_changes.classFilter = ctx.rightIndex;
				if (changed.filterType) classatlas1_changes.filterType = ctx.filterType;
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
			each_blocks[i] = create_each_block$6(component, get_each_context$5(ctx, each_value, i));
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
						const child_ctx = get_each_context$5(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$6(component, child_ctx);
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
	function create_each_block$6(component, ctx) {
		var button, text0_value = ctx.comparison.leftLabel, text0, text1, text2_value = ctx.comparison.rightLabel, text2;

		return {
			c: function create() {
				button = createElement("button");
				text0 = createText(text0_value);
				text1 = createText(" vs. ");
				text2 = createText(text2_value);
				button._svelte = { component, ctx };

				addListener(button, "click", click_handler);
				addLoc(button, file$r, 2, 4, 68);
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
		this._state = assign(assign(this.store._init(["classComparisons","inceptionLabels"]), data$j()), options.data);
		this.store._add(this, ["classComparisons","inceptionLabels"]);

		this._recompute({ $classComparisons: 1, classComparisonIndex: 1 }, this._state);
		if (!('$classComparisons' in this._state)) console.warn("<ClassComparison> was created without expected data property '$classComparisons'");
		if (!('classComparisonIndex' in this._state)) console.warn("<ClassComparison> was created without expected data property 'classComparisonIndex'");
		if (!('showControls' in this._state)) console.warn("<ClassComparison> was created without expected data property 'showControls'");
		if (!('$inceptionLabels' in this._state)) console.warn("<ClassComparison> was created without expected data property '$inceptionLabels'");

		if (!('filterType' in this._state)) console.warn("<ClassComparison> was created without expected data property 'filterType'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$s(this, this._state);

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

	function height$2({width}) {
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

	function data$k() {
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
	const file$s = "src/diagrams/ClassGradient.html";

	function get_each_context$6(ctx, list, i) {
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

	function create_main_fragment$t(component, ctx) {
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
				addLoc(path, file$s, 11, 10, 462);
				setAttribute(marker, "id", 'arrow');
				setAttribute(marker, "markerWidth", "7");
				setAttribute(marker, "markerHeight", "7");
				setAttribute(marker, "refX", "10");
				setAttribute(marker, "refY", "5");
				setAttribute(marker, "orient", "auto");
				setAttribute(marker, "markerUnits", "strokeWidth");
				setAttribute(marker, "viewBox", "0 0 10 10");
				addLoc(marker, file$s, 10, 7, 316);
				addLoc(defs, file$s, 9, 3, 302);
				setAttribute(image, "id", "comparisonImg");
				setAttribute(image, "width", ctx.width);
				setAttribute(image, "height", ctx.height);
				setXlinkAttribute(image, "xlink:href", image_xlink_href_value = "https://storage.googleapis.com/activation-atlas/build/gradients/gradients/gradients--comparison=" + ctx.comparison.id + "--tries=4--alpha=False--tile_size=10--whiten=true--steps=1024--icon_size=90--grid_size=10--layer=mixed5b--model=InceptionV1--sample_images=1000000--sample_type=random.jpg");
				setAttribute(image, "alt", image_alt_value = ctx.comparison.label);
				addLoc(image, file$s, 19, 6, 625);
				setAttribute(tspan0, "x", "-10");
				setAttribute(tspan0, "dy", "1.3em");
				addLoc(tspan0, file$s, 31, 10, 1167);
				setAttribute(tspan1, "x", "-10");
				setAttribute(tspan1, "dy", "1.3em");
				setAttribute(tspan1, "font-weight", "bold");
				addLoc(tspan1, file$s, 32, 10, 1231);
				setAttribute(text2, "y", "-50");
				setAttribute(text2, "text-anchor", "end");
				setAttribute(text2, "class", "svelte-1jr0ob8");
				addLoc(text2, file$s, 30, 8, 1124);
				setAttribute(tspan2, "x", "10");
				setAttribute(tspan2, "dy", "1.3em");
				addLoc(tspan2, file$s, 35, 10, 1356);
				setAttribute(tspan3, "x", "10");
				setAttribute(tspan3, "dy", "1.3em");
				setAttribute(tspan3, "font-weight", "bold");
				addLoc(tspan3, file$s, 36, 10, 1419);
				setAttribute(text5, "y", "-50");
				setAttribute(text5, "class", "svelte-1jr0ob8");
				addLoc(text5, file$s, 34, 8, 1331);
				setAttribute(line0, "x2", "-50");
				setAttribute(line0, "transform", "translate(-120,0)");
				setAttribute(line0, "stroke", ctx.color);
				setAttribute(line0, "marker-end", "url(#" + 'arrow' + ")");
				addLoc(line0, file$s, 40, 10, 1564);
				setAttribute(line1, "x2", "50");
				setAttribute(line1, "transform", "translate(120,0)");
				setAttribute(line1, "stroke", ctx.color);
				setAttribute(line1, "marker-end", "url(#" + 'arrow' + ")");
				addLoc(line1, file$s, 41, 10, 1671);
				setAttribute(g0, "transform", "translate(0, -28)");
				addLoc(g0, file$s, 39, 8, 1520);
				setAttribute(g1, "transform", g1_transform_value = "translate(" + ctx.width / 2 + ", 0)");
				addLoc(g1, file$s, 29, 6, 1074);
				setAttribute(line2, "y2", "-50");
				setAttribute(line2, "transform", "translate(0,-38)");
				setAttribute(line2, "stroke", ctx.color);
				setAttribute(line2, "marker-end", "url(#" + 'arrow' + ")");
				addLoc(line2, file$s, 49, 10, 1936);
				setAttribute(line3, "y2", "50");
				setAttribute(line3, "transform", "translate(0,30)");
				setAttribute(line3, "stroke", ctx.color);
				setAttribute(line3, "marker-end", "url(#" + 'arrow' + ")");
				addLoc(line3, file$s, 50, 10, 2042);
				setAttribute(g2, "transform", "translate(10, 0)");
				addLoc(g2, file$s, 48, 8, 1893);
				setAttribute(tspan4, "x", "0");
				setAttribute(tspan4, "y", "-1.8em");
				addLoc(tspan4, file$s, 53, 10, 2202);
				setAttribute(tspan5, "x", "0");
				setAttribute(tspan5, "y", "-0.6em");
				addLoc(tspan5, file$s, 54, 10, 2255);
				setAttribute(tspan6, "x", "0");
				setAttribute(tspan6, "y", "0.6em");
				addLoc(tspan6, file$s, 55, 10, 2311);
				setAttribute(tspan7, "x", "0");
				setAttribute(tspan7, "y", "1.8em");
				addLoc(tspan7, file$s, 56, 10, 2369);
				setAttribute(text10, "alignment-baseline", "middle");
				setAttribute(text10, "class", "svelte-1jr0ob8");
				addLoc(text10, file$s, 52, 8, 2157);
				setAttribute(g3, "transform", g3_transform_value = "translate(" + (- ctx.margin.left + 8) + "," + ctx.height/2 + ")");
				addLoc(g3, file$s, 47, 6, 1827);
				setAttribute(line4, "y1", line4_y__value = -ctx.margin.top + 4);
				setAttribute(line4, "y2", line4_y__value_1 = ctx.height + 8);
				setAttribute(line4, "stroke", "white");
				setAttribute(line4, "stroke-width", "5");
				setAttribute(line4, "stroke-opacity", "0.6");
				addLoc(line4, file$s, 63, 8, 2513);
				setAttribute(line5, "y1", line5_y__value = -ctx.margin.top + 4);
				setAttribute(line5, "y2", line5_y__value_1 = ctx.height + 8);
				setAttribute(line5, "stroke", "black");
				addLoc(line5, file$s, 64, 8, 2627);
				setAttribute(g4, "transform", g4_transform_value = "translate(" + ctx.width / 2 + ", 0)");
				addLoc(g4, file$s, 62, 6, 2463);
				setAttribute(g5, "transform", g5_transform_value = "translate(" + ctx.margin.left + "," + ctx.margin.top + ")");
				addLoc(g5, file$s, 15, 4, 542);
				setAttribute(svg, "class", "overlay svelte-1jr0ob8");
				setAttribute(svg, "viewBox", svg_viewBox_value = "0 0 " + ctx.outerWidth + " " + ctx.outerHeight);
				addLoc(svg, file$s, 5, 2, 210);
				div.className = "overlay-wrap svelte-1jr0ob8";
				addLoc(div, file$s, 4, 0, 180);
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
				addLoc(line, file$s, 68, 8, 2747);
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
				addLoc(line, file$s, 72, 8, 2930);
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
			each_blocks[i] = create_each_block$7(component, get_each_context$6(ctx, each_value, i));
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
						const child_ctx = get_each_context$6(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$7(component, child_ctx);
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
	function create_each_block$7(component, ctx) {
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
				addLoc(line, file$s, 80, 12, 3283);
				setAttribute(text1, "x", text1_x_value = ctx.width + 20);
				setAttribute(text1, "alignment-baseline", "middle");
				setAttribute(text1, "class", "svelte-1jr0ob8");
				addLoc(text1, file$s, 81, 12, 3428);
				setAttribute(g0, "transform", g0_transform_value = "translate(0, " + (ctx.annotation.pos.x + 0.5) * ctx.cellWidth + ")");
				addLoc(g0, file$s, 79, 10, 3202);
				setAttribute(circle0, "r", circle0_r_value = ctx.cellWidth / 2 * ctx.Math.sqrt(2));
				setAttribute(circle0, "fill", "none");
				setAttribute(circle0, "stroke", "white");
				setAttribute(circle0, "stroke-opacity", "0.5");
				setAttribute(circle0, "stroke-width", "5");
				addLoc(circle0, file$s, 84, 12, 3645);
				setAttribute(circle1, "r", circle1_r_value = ctx.cellWidth / 2 * ctx.Math.sqrt(2));
				setAttribute(circle1, "fill", "none");
				setAttribute(circle1, "stroke", "black");
				setAttribute(circle1, "stroke-opacity", "1");
				addLoc(circle1, file$s, 85, 12, 3765);
				setAttribute(g1, "transform", g1_transform_value = "translate(" + (ctx.annotation.pos.y + 0.5) * ctx.cellWidth + ", " + (ctx.annotation.pos.x + 0.5) * ctx.cellWidth + ")");
				addLoc(g1, file$s, 83, 10, 3527);
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
		this._state = assign(assign(assign({ Math : Math }, this.store._init(["classComparisons"])), data$k()), options.data);
		this.store._add(this, ["classComparisons"]);

		this._recompute({ width: 1, margin: 1, height: 1, currentClassComparisonIndex: 1, $classComparisons: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<ClassGradient> was created without expected data property 'width'");
		if (!('margin' in this._state)) console.warn("<ClassGradient> was created without expected data property 'margin'");

		if (!('currentClassComparisonIndex' in this._state)) console.warn("<ClassGradient> was created without expected data property 'currentClassComparisonIndex'");
		if (!('$classComparisons' in this._state)) console.warn("<ClassGradient> was created without expected data property '$classComparisons'");


		if (!('color' in this._state)) console.warn("<ClassGradient> was created without expected data property 'color'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$t(this, this._state);

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
			if (this._differs(state.height, (state.height = height$2(state)))) changed.height = true;
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

	/* src/diagrams/Adversarial.html generated by Svelte v2.15.3 */

	function data$l() {
	  return {
	    image: "",
	    left: "", 
	    right: "",
	    classifications: [],
	    aspectRatio: 1
	  }
	}
	var f = format(".1f");

	const file$t = "src/diagrams/Adversarial.html";

	function get_each_context_1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.row = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function get_each_context$7(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.c = list[i];
		return child_ctx;
	}

	function create_main_fragment$u(component, ctx) {
		var div;

		var each_value = ctx.classifications;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$8(component, get_each_context$7(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "adversarial svelte-1ghs2gk";
				setStyle(div, "grid-template-columns", "repeat(" + ctx.classifications.length + ", 1fr)");
				addLoc(div, file$t, 0, 0, 0);
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
						const child_ctx = get_each_context$7(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$8(component, child_ctx);
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
				addLoc(td0, file$t, 11, 10, 385);
				td1.className = "svelte-1ghs2gk";
				addLoc(td1, file$t, 12, 10, 414);
				td2.className = "svelte-1ghs2gk";
				addLoc(td2, file$t, 13, 10, 442);
				tr.className = tr_class_value = "" + (ctx.row[0] === ctx.left ? 'left' : '') + " " + (ctx.row[0] === ctx.right ? 'right' : '') + " svelte-1ghs2gk";
				addLoc(tr, file$t, 10, 8, 296);
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
	function create_each_block$8(component, ctx) {
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
				addLoc(table, file$t, 8, 6, 247);
				div0.className = "figcaption";
				addLoc(div0, file$t, 17, 6, 515);
				addLoc(div1, file$t, 2, 4, 131);
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
		this._state = assign(data$l(), options.data);
		if (!('classifications' in this._state)) console.warn("<Adversarial> was created without expected data property 'classifications'");
		if (!('left' in this._state)) console.warn("<Adversarial> was created without expected data property 'left'");
		if (!('right' in this._state)) console.warn("<Adversarial> was created without expected data property 'right'");
		if (!('aspectRatio' in this._state)) console.warn("<Adversarial> was created without expected data property 'aspectRatio'");
		this._intro = true;

		this._fragment = create_main_fragment$u(this, this._state);

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

	const file$u = "src/diagrams/Samples.html";

	function create_main_fragment$v(component, ctx) {
		var div6, div1, text0, div0, text2, div3, text3, div2, text5, div5, text6, div4;

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
				div6 = createElement("div");
				div1 = createElement("div");
				lazyimage0._fragment.c();
				text0 = createText("\n    ");
				div0 = createElement("div");
				div0.textContent = "10,000 activations";
				text2 = createText("\n  ");
				div3 = createElement("div");
				lazyimage1._fragment.c();
				text3 = createText("\n    ");
				div2 = createElement("div");
				div2.textContent = "100,000 activations";
				text5 = createText("\n  ");
				div5 = createElement("div");
				lazyimage2._fragment.c();
				text6 = createText("\n    ");
				div4 = createElement("div");
				div4.textContent = "1,000,000 activations";
				setStyle(div0, "margin-top", "4px");
				addLoc(div0, file$u, 6, 4, 381);
				addLoc(div1, file$u, 1, 2, 17);
				setStyle(div2, "margin-top", "4px");
				addLoc(div2, file$u, 13, 4, 813);
				addLoc(div3, file$u, 8, 2, 447);
				setStyle(div4, "margin-top", "4px");
				addLoc(div4, file$u, 20, 4, 1249);
				addLoc(div5, file$u, 15, 2, 880);
				div6.className = "svelte-1ppku9e svelte-ref-root";
				addLoc(div6, file$u, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div6, anchor);
				append(div6, div1);
				lazyimage0._mount(div1, null);
				append(div1, text0);
				append(div1, div0);
				append(div6, text2);
				append(div6, div3);
				lazyimage1._mount(div3, null);
				append(div3, text3);
				append(div3, div2);
				append(div6, text5);
				append(div6, div5);
				lazyimage2._mount(div5, null);
				append(div5, text6);
				append(div5, div4);
				component.refs.root = div6;
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div6);
				}

				lazyimage0.destroy();
				lazyimage1.destroy();
				lazyimage2.destroy();
				if (component.refs.root === div6) component.refs.root = null;
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

		this._fragment = create_main_fragment$v(this, this._state);

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

	const file$v = "src/diagrams/ClassGrids.html";

	function create_main_fragment$w(component, ctx) {
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
				addLoc(div0, file$v, 2, 6, 114);
				addLoc(b0, file$v, 5, 30, 252);
				div1.className = "figcaption svelte-dmx176";
				addLoc(div1, file$v, 5, 6, 228);
				addLoc(div2, file$v, 1, 2, 102);
				div3.className = "atlas";
				addLoc(div3, file$v, 8, 6, 373);
				addLoc(b1, file$v, 11, 30, 507);
				div4.className = "figcaption svelte-dmx176";
				addLoc(div4, file$v, 11, 6, 483);
				addLoc(div5, file$v, 7, 2, 361);
				div6.className = "atlas";
				addLoc(div6, file$v, 14, 6, 666);
				addLoc(b2, file$v, 17, 30, 800);
				div7.className = "figcaption svelte-dmx176";
				addLoc(div7, file$v, 17, 6, 776);
				addLoc(div8, file$v, 13, 2, 654);
				setStyle(div9, "display", "grid");
				setStyle(div9, "grid-auto-flow", "column");
				setStyle(div9, "grid-column-gap", "20px");
				setStyle(div9, "grid-auto-columns", "1fr");
				addLoc(div9, file$v, 0, 0, 0);
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

		this._fragment = create_main_fragment$w(this, this._state);

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

	/* src/components/Figure.html generated by Svelte v2.15.3 */

	function data$m() {
	  return {
	    ready: false,
	    onscreen: false,
	  }
	}
	function oncreate$6() {
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
	const file$w = "src/components/Figure.html";

	function create_main_fragment$x(component, ctx) {
		var d_figure, slot_content_default = component._slotted.default;

		return {
			c: function create() {
				d_figure = createElement("d-figure");
				addLoc(d_figure, file$w, 0, 0, 0);
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
		this._state = assign(data$m(), options.data);
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$x(this, this._state);

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

	assign(Figure.prototype, protoDev);

	Figure.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/ActivationGrid.html generated by Svelte v2.15.3 */



	function width$1({inputWidth, columnWidth, columnMargin}) {
		return inputWidth * 2 + columnWidth * 3 + 4 * columnMargin;
	}

	function height$3({inputWidth}) {
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

	function data$n() {
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
	var format_1$1 = format(" .5f");

	const file$x = "src/diagrams/ActivationGrid.html";

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

	function get_each_context$8(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.x = list[i];
		return child_ctx;
	}

	function get_each0_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.y = list[i];
		return child_ctx;
	}

	function create_main_fragment$y(component, ctx) {
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
			each2_blocks[i] = create_each_block$9(component, get_each2_context(ctx, each2_value, i));
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
				addLoc(rect0, file$x, 5, 6, 280);
				setAttribute(clipPath0, "id", "activationGridClipRect");
				addLoc(clipPath0, file$x, 4, 4, 235);
				setAttribute(rect1, "x", rect1_x_value = ctx.windowX * ctx.inputCellWidth);
				setAttribute(rect1, "y", rect1_y_value = ctx.windowY * ctx.inputCellWidth);
				setAttribute(rect1, "width", rect1_width_value = ctx.inputCellWidth * ctx.windowSize);
				setAttribute(rect1, "height", rect1_height_value = ctx.inputCellWidth * ctx.windowSize);
				addLoc(rect1, file$x, 9, 6, 444);
				setAttribute(clipPath1, "id", "activationGridClipRectInput");
				addLoc(clipPath1, file$x, 8, 4, 394);
				setAttribute(text2, "class", "head svelte-qwhwb1");
				setAttribute(text2, "dy", "-13");
				addLoc(text2, file$x, 15, 8, 700);
				setXlinkAttribute(image0, "xlink:href", "assets/images/dogcat.jpg");
				setAttribute(image0, "width", ctx.inputWidth);
				setAttribute(image0, "height", ctx.inputWidth);
				addLoc(image0, file$x, 16, 8, 755);
				setAttribute(rect2, "stroke", "rgb(255, 170, 0)");
				setAttribute(rect2, "pointer-events", "none");
				setAttribute(rect2, "stroke-width", "2");
				setAttribute(rect2, "fill-opacity", "0");
				setAttribute(rect2, "x", rect2_x_value = ctx.windowX * ctx.inputCellWidth);
				setAttribute(rect2, "y", rect2_y_value = ctx.windowY * ctx.inputCellWidth);
				setAttribute(rect2, "width", rect2_width_value = ctx.inputCellWidth * ctx.windowSize);
				setAttribute(rect2, "height", rect2_height_value = ctx.inputCellWidth * ctx.windowSize);
				addLoc(rect2, file$x, 29, 8, 1552);
				setAttribute(g0, "transform", "translate(0, 0)");
				addLoc(g0, file$x, 14, 6, 660);
				setAttribute(path0, "class", "arrow svelte-qwhwb1");
				setAttribute(path0, "transform", path0_transform_value = "translate(0," + ctx.columnWidth / 2 + ")");
				setAttribute(path0, "d", path0_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5");
				addLoc(path0, file$x, 33, 8, 1869);
				setAttribute(text4, "class", "head svelte-qwhwb1");
				setAttribute(text4, "dy", "-13");
				addLoc(text4, file$x, 34, 8, 2014);
				setAttribute(image1, "image-rendering", "pixelated");
				setXlinkAttribute(image1, "xlink:href", "assets/images/dogcat.jpg");
				setAttribute(image1, "width", ctx.inputWidth);
				setAttribute(image1, "height", ctx.inputWidth);
				setAttribute(image1, "clip-path", "url(#activationGridClipRectInput)");
				addLoc(image1, file$x, 36, 10, 2215);
				setAttribute(g1, "transform", g1_transform_value = "scale(" + ctx.columnWidth / (ctx.inputCellWidth * ctx.windowSize) + ")translate(-" + ctx.windowX * ctx.inputCellWidth + ", -" + ctx.windowY * ctx.inputCellWidth + ")");
				addLoc(g1, file$x, 35, 8, 2069);
				setAttribute(rect3, "stroke", "rgb(255, 170, 0)");
				setAttribute(rect3, "stroke-width", "4");
				setAttribute(rect3, "fill-opacity", "0");
				setAttribute(rect3, "width", ctx.columnWidth);
				setAttribute(rect3, "height", ctx.columnWidth);
				addLoc(rect3, file$x, 42, 8, 2443);
				setAttribute(tspan0, "x", "0");
				setAttribute(tspan0, "dy", "1.4em");
				addLoc(tspan0, file$x, 44, 10, 2637);
				setAttribute(tspan1, "x", "0");
				setAttribute(tspan1, "dy", "1.4em");
				addLoc(tspan1, file$x, 45, 10, 2697);
				setAttribute(tspan2, "x", "0");
				setAttribute(tspan2, "dy", "1.4em");
				addLoc(tspan2, file$x, 46, 10, 2760);
				setAttribute(text8, "class", "figcaption svelte-qwhwb1");
				setAttribute(text8, "transform", text8_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")");
				addLoc(text8, file$x, 43, 8, 2556);
				setAttribute(g2, "transform", g2_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin) + ", 0)");
				addLoc(g2, file$x, 32, 6, 1803);
				setAttribute(path1, "class", "arrow svelte-qwhwb1");
				setAttribute(path1, "transform", path1_transform_value = "translate(0," + ctx.columnWidth / 2 + ")");
				setAttribute(path1, "d", path1_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5");
				addLoc(path1, file$x, 51, 8, 2957);
				setAttribute(text10, "class", "head svelte-qwhwb1");
				setAttribute(text10, "dy", "-13");
				addLoc(text10, file$x, 52, 8, 3102);
				setAttribute(tspan3, "x", "0");
				setAttribute(tspan3, "dy", "1.4em");
				addLoc(tspan3, file$x, 68, 10, 4048);
				setAttribute(tspan4, "x", "0");
				setAttribute(tspan4, "dy", "1.4em");
				addLoc(tspan4, file$x, 69, 10, 4108);
				setAttribute(tspan5, "x", "0");
				setAttribute(tspan5, "dy", "1.4em");
				addLoc(tspan5, file$x, 70, 10, 4175);
				setAttribute(tspan6, "x", "0");
				setAttribute(tspan6, "dy", "1.4em");
				addLoc(tspan6, file$x, 71, 10, 4235);
				setAttribute(text15, "class", "figcaption svelte-qwhwb1");
				setAttribute(text15, "transform", text15_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")");
				addLoc(text15, file$x, 67, 6, 3967);
				setAttribute(g3, "transform", g3_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + ctx.columnWidth + ctx.columnMargin) + ", 0)");
				addLoc(g3, file$x, 50, 6, 2862);
				setAttribute(path2, "class", "arrow svelte-qwhwb1");
				setAttribute(path2, "transform", path2_transform_value = "translate(0," + ctx.columnWidth / 2 + ")");
				setAttribute(path2, "d", path2_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5");
				addLoc(path2, file$x, 77, 8, 4451);
				setAttribute(text17, "class", "head svelte-qwhwb1");
				setAttribute(text17, "dy", "-13");
				addLoc(text17, file$x, 78, 8, 4596);
				setAttribute(image2, "image-rendering", "pixelated");
				setXlinkAttribute(image2, "xlink:href", "assets/images/dogcat-grid.jpg");
				setAttribute(image2, "width", ctx.inputWidth);
				setAttribute(image2, "height", ctx.inputWidth);
				setAttribute(image2, "clip-path", "url(#activationGridClipRect)");
				addLoc(image2, file$x, 80, 10, 4777);
				setAttribute(g4, "transform", g4_transform_value = "scale(" + ctx.columnWidth / ctx.cellWidth + ")translate(-" + ctx.windowX * ctx.cellWidth + ", -" + ctx.windowY * ctx.cellWidth + ")");
				addLoc(g4, file$x, 79, 8, 4661);
				setAttribute(rect4, "stroke", "#ff6600");
				setAttribute(rect4, "stroke-width", "4");
				setAttribute(rect4, "fill-opacity", "0");
				setAttribute(rect4, "width", ctx.columnWidth);
				setAttribute(rect4, "height", ctx.columnWidth);
				addLoc(rect4, file$x, 86, 8, 5006);
				setAttribute(tspan7, "x", "0");
				setAttribute(tspan7, "dy", "1.4em");
				addLoc(tspan7, file$x, 89, 10, 5192);
				setAttribute(tspan8, "x", "0");
				setAttribute(tspan8, "dy", "1.4em");
				addLoc(tspan8, file$x, 90, 10, 5252);
				setAttribute(tspan9, "x", "0");
				setAttribute(tspan9, "dy", "1.4em");
				addLoc(tspan9, file$x, 91, 10, 5314);
				setAttribute(text21, "class", "figcaption svelte-qwhwb1");
				setAttribute(text21, "transform", text21_transform_value = "translate(0, " + (ctx.columnWidth + 10) + ")");
				addLoc(text21, file$x, 88, 8, 5111);
				setAttribute(g5, "transform", g5_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + 2 * (ctx.columnWidth + ctx.columnMargin)) + ", 0)");
				addLoc(g5, file$x, 76, 6, 4350);
				setAttribute(path3, "class", "arrow svelte-qwhwb1");
				setAttribute(path3, "transform", path3_transform_value = "translate(0," + ctx.columnWidth / 2 + ")");
				setAttribute(path3, "d", path3_d_value = "M" + -2 * ctx.columnMargin / 3 + ",0 L" + -ctx.columnMargin / 3 + ",0 m-5,-5 l5,5 l-5,5");
				addLoc(path3, file$x, 96, 8, 5521);
				setAttribute(text23, "class", "head svelte-qwhwb1");
				setAttribute(text23, "dy", "-13");
				addLoc(text23, file$x, 97, 8, 5666);
				setXlinkAttribute(image3, "xlink:href", "assets/images/dogcat-grid.jpg");
				setAttribute(image3, "width", ctx.inputWidth);
				setAttribute(image3, "height", ctx.inputWidth);
				addLoc(image3, file$x, 98, 8, 5725);
				setAttribute(rect5, "stroke", "#ff6600");
				setAttribute(rect5, "pointer-events", "none");
				setAttribute(rect5, "stroke-width", "2");
				setAttribute(rect5, "fill-opacity", "0");
				setAttribute(rect5, "x", rect5_x_value = ctx.windowX * ctx.cellWidth);
				setAttribute(rect5, "y", rect5_y_value = ctx.windowY * ctx.cellWidth);
				setAttribute(rect5, "width", ctx.cellWidth);
				setAttribute(rect5, "height", ctx.cellWidth);
				addLoc(rect5, file$x, 110, 8, 6298);
				setAttribute(g6, "transform", g6_transform_value = "translate(" + (ctx.inputWidth + ctx.columnMargin + 3 * (ctx.columnWidth + ctx.columnMargin)) + ", 0)");
				addLoc(g6, file$x, 95, 6, 5420);
				setAttribute(g7, "transform", "translate(0, 30)");
				addLoc(g7, file$x, 12, 4, 604);
				setStyle(svg, "width", "100%");
				setAttribute(svg, "viewBox", svg_viewBox_value = "0 0 " + ctx.width + " " + ctx.height);
				addLoc(svg, file$x, 3, 2, 173);
				addListener(div, "mouseout", mouseout_handler);
				setStyle(div, "position", "relative");
				setStyle(div, "background", "white");
				setStyle(div, "text-align", "right");
				addLoc(div, file$x, 0, 0, 0);
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
							each2_blocks[i] = create_each_block$9(component, child_ctx);
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
				addLoc(rect, file$x, 19, 12, 939);
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
			each_blocks[i] = create_each_block_4(component, get_each_context$8(ctx, each_value, i));
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
						const child_ctx = get_each_context$8(ctx, each_value, i);

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
				addLoc(text_1, file$x, 56, 10, 3361);
				setAttribute(line, "y1", "7");
				setAttribute(line, "y2", "7");
				setAttribute(line, "stroke", "#eee");
				setAttribute(line, "x2", line_x__value = ctx.inputWidth * 2 / 3 - 20);
				addLoc(line, file$x, 57, 10, 3440);
				setAttribute(g, "transform", g_transform_value = "translate(0," + (20 + 20 * (ctx.activations[0][0].length - 1)) + ")");
				addLoc(g, file$x, 55, 8, 3279);
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
		var g, text3, text0, text1_value = ctx.i === ctx.activations[0][0].length - 1 ? 512 : ctx.i, text1, text2, text5, text4_value = format_1$1(ctx.activation), text4, text5_dx_value, line, g_transform_value;

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
				addLoc(text3, file$x, 61, 10, 3648);
				setAttribute(text5, "text-anchor", "end");
				setAttribute(text5, "font-size", "11");
				setAttribute(text5, "font-family", "monospace");
				setAttribute(text5, "dx", text5_dx_value = ctx.inputWidth * 2 / 3 - 20);
				addLoc(text5, file$x, 62, 10, 3755);
				setAttribute(line, "y1", "7");
				setAttribute(line, "y2", "7");
				setAttribute(line, "stroke", "#eee");
				setAttribute(line, "x2", ctx.columnWidth);
				addLoc(line, file$x, 63, 10, 3883);
				setAttribute(g, "transform", g_transform_value = "translate(0," + (ctx.i === ctx.activations[0][0].length - 1 ? 20 + 20 * (ctx.i + 1) : 20 + 20 * ctx.i) + ")");
				addLoc(g, file$x, 60, 8, 3537);
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

				if ((changed.activations || changed.windowX || changed.windowY) && text4_value !== (text4_value = format_1$1(ctx.activation))) {
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
				addLoc(rect, file$x, 101, 12, 5904);
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
	function create_each_block$9(component, ctx) {
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
		this._state = assign(assign({ Math : Math }, data$n()), options.data);

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

		this._fragment = create_main_fragment$y(this, this._state);

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
			if (this._differs(state.height, (state.height = height$3(state)))) changed.height = true;
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

	function data$o() {
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

	function oncreate$7() {
	  console.log("loading");
	  const {dataURL, webURL} = this.get();
	  load$1([dataURL, webURL]).then(responses => {
	    this.set({
	      layoutData: responses[0].slice(0, 10000),
	      webData: responses[1]
	    });
	  });
	}
	const file$y = "src/diagrams/Process.html";

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

	function get_each_context$9(ctx, list, i) {
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

	function create_main_fragment$z(component, ctx) {
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
			each3_blocks[i] = create_each_block$a(component, get_each3_context(ctx, each3_value, i));
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
				addLoc(g0, file$y, 4, 4, 120);
				setAttribute(image, "opacity", image_opacity_value = ctx.webData.length > 0 ? 1 : 0);
				setXlinkAttribute(image, "xlink:href", ctx.renderURL);
				setAttribute(image, "width", ctx.columnWidth);
				setAttribute(image, "height", ctx.columnWidth);
				addLoc(image, file$y, 61, 6, 2890);
				setAttribute(g1, "transform", g1_transform_value = "translate(" + (ctx.columnWidth + ctx.columnPadding) * 2 + ", 0)");
				addLoc(g1, file$y, 60, 4, 2818);
				setAttribute(rect0, "fill", "none");
				setAttribute(rect0, "stroke", "black");
				setAttribute(rect0, "stroke-width", "2");
				setAttribute(rect0, "x", rect0_x_value = (ctx.columnWidth + ctx.columnPadding) * 1 + ctx.iconHighlight.x * ctx.iconWidth);
				setAttribute(rect0, "y", rect0_y_value = ctx.iconHighlight.y * ctx.iconWidth);
				setAttribute(rect0, "width", ctx.iconWidth);
				setAttribute(rect0, "height", ctx.iconWidth);
				addLoc(rect0, file$y, 73, 4, 3501);
				setAttribute(path, "fill", "none");
				setAttribute(path, "stroke", "black");
				setAttribute(path, "d", path_d_value = "M" + ((ctx.columnWidth + ctx.columnPadding) * 1 + ctx.iconHighlight.x * ctx.iconWidth + ctx.iconWidth / 2) + "," + ctx.iconHighlight.y * ctx.iconWidth + "l0,-30 l" + (ctx.columnWidth + ctx.columnPadding) + ",0 l0,25 m-5,-5 l5,5 l5,-5");
				addLoc(path, file$y, 74, 4, 3692);
				setAttribute(rect1, "fill", "none");
				setAttribute(rect1, "stroke", "black");
				setAttribute(rect1, "stroke-width", "2");
				setAttribute(rect1, "x", rect1_x_value = (ctx.columnWidth + ctx.columnPadding) * 2 + ctx.iconHighlight.x * ctx.iconWidth);
				setAttribute(rect1, "y", rect1_y_value = ctx.iconHighlight.y * ctx.iconWidth);
				setAttribute(rect1, "width", ctx.iconWidth);
				setAttribute(rect1, "height", ctx.iconWidth);
				addLoc(rect1, file$y, 75, 4, 3912);
				setAttribute(g2, "transform", "translate(0, 40)");
				addLoc(g2, file$y, 1, 2, 60);
				setStyle(svg, "width", "100%");
				setAttribute(svg, "viewBox", svg_viewBox_value = "0 0 " + ctx.width + " " + ctx.height);
				addLoc(svg, file$y, 0, 0, 0);
				div0.className = "figcaption";
				addLoc(div0, file$y, 82, 2, 4232);
				div1.className = "figcaption";
				addLoc(div1, file$y, 83, 2, 4383);
				setStyle(div2, "margin-top", "8px");
				setStyle(div2, "text-align", "right");
				addLoc(div2, file$y, 85, 4, 4712);
				div3.className = "figcaption";
				addLoc(div3, file$y, 84, 2, 4558);
				setStyle(div4, "display", "grid");
				setStyle(div4, "grid-column-gap", "" + ctx.columnPadding / ctx.width * 100 + "%");
				setStyle(div4, "grid-template-columns", "1fr 1fr 1fr");
				addLoc(div4, file$y, 81, 0, 4116);
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
							each3_blocks[i] = create_each_block$a(component, child_ctx);
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
				addLoc(rect, file$y, 7, 10, 316);
				setAttribute(g, "transform", g_transform_value = "translate(" + ctx.point[1] * ctx.columnWidth + ", " + ctx.point[0] * ctx.columnWidth + ")");
				addLoc(g, file$y, 6, 8, 228);
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
				addLoc(rect, file$y, 25, 14, 1104);
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
				addLoc(line, file$y, 46, 10, 2354);
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
			each_blocks[i_1] = create_each_block_4$1(component, get_each_context$9(ctx, each_value, i_1));
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
				addLoc(image0, file$y, 19, 8, 732);
				setXlinkAttribute(image1, "xlink:href", image1_xlink_href_value = "assets/images/" + ctx.input.id + ".jpg");
				setAttribute(image1, "width", ctx.inputWidth);
				setAttribute(image1, "height", ctx.inputWidth);
				addLoc(image1, file$y, 22, 10, 920);
				setAttribute(g0, "transform", g0_transform_value = "translate(" + (ctx.inputWidth + ctx.inputPadding) + ", 0)");
				addLoc(g0, file$y, 21, 8, 852);
				setAttribute(rect, "fill", "none");
				setAttribute(rect, "stroke", "black");
				setAttribute(rect, "stroke-width", "2");
				setAttribute(rect, "x", rect_x_value = (ctx.inputWidth + ctx.inputPadding) * 1 + ctx.input.x * (ctx.cellWidth + ctx.cellPadding));
				setAttribute(rect, "y", rect_y_value = ctx.input.y * (ctx.cellWidth + ctx.cellPadding));
				setAttribute(rect, "width", ctx.cellWidth);
				setAttribute(rect, "height", ctx.cellWidth);
				addLoc(rect, file$y, 32, 8, 1373);
				setAttribute(path0, "fill", "none");
				setAttribute(path0, "stroke", "black");
				setAttribute(path0, "d", path0_d_value = "M" + ((ctx.inputWidth + ctx.inputPadding) * 1 + ctx.input.x * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth) + "," + (ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2) + " L" + ((ctx.inputWidth + ctx.inputPadding) * 2 - 10) + "," + (ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2) + " m-5,-5 l5,5 l-5,5");
				addLoc(path0, file$y, 33, 8, 1582);
				setAttribute(text5, "font-size", "9");
				setAttribute(text5, "dy", text5_dy_value = ctx.cellWidth / 1.5);
				setAttribute(text5, "transform", text5_transform_value = "translate(" + ctx.x * (ctx.cellWidth + ctx.cellPadding) + ", " + ctx.y * (ctx.cellWidth + ctx.cellPadding) + ")");
				addLoc(text5, file$y, 39, 10, 2030);
				setAttribute(g1, "transform", g1_transform_value = "translate(" + (ctx.inputWidth + ctx.inputPadding) * 2 + ", " + ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ")");
				addLoc(g1, file$y, 38, 8, 1920);
				setAttribute(g2, "transform", g2_transform_value = "translate(0, " + (ctx.inputWidth + 20) * ctx.i + ")");
				addLoc(g2, file$y, 17, 6, 647);
				setAttribute(path1, "fill", "none");
				setAttribute(path1, "stroke", "black");
				setAttribute(path1, "d", path1_d_value = pointerPath(ctx.columnWidth, ctx.input.y * (ctx.cellWidth + ctx.cellPadding) + ctx.cellWidth / 2 + (ctx.inputWidth + 20) * ctx.i, (ctx.columnWidth + ctx.columnPadding) + ctx.columnWidth * ctx.input.px, ctx.columnWidth * ctx.input.py));
				addLoc(path1, file$y, 50, 6, 2525);
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
						const child_ctx = get_each_context$9(ctx, each_value, i_1);

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
				addLoc(rect, file$y, 63, 10, 3040);
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
				addLoc(rect, file$y, 67, 10, 3292);
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
	function create_each_block$a(component, ctx) {
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
		this._state = assign(assign({ Math : Math }, data$o()), options.data);

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

		this._fragment = create_main_fragment$z(this, this._state);

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

	function data$p() {
	  return {
	    layerName: "mixed4c",
	    gridSize: 1,
	    iconCrop: 0.4,
	  }
	}
	const file$z = "src/diagrams/OneLayer.html";

	function create_main_fragment$A(component, ctx) {
		var div, atlas_updating = {};

		var atlas_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
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
				addLoc(div, file$z, 22, 0, 1143);
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
		this._state = assign(data$p(), options.data);
		if (!('layerName' in this._state)) console.warn("<OneLayer> was created without expected data property 'layerName'");
		if (!('gridSize' in this._state)) console.warn("<OneLayer> was created without expected data property 'gridSize'");
		if (!('showLabels' in this._state)) console.warn("<OneLayer> was created without expected data property 'showLabels'");
		this._intro = true;

		this._fragment = create_main_fragment$A(this, this._state);

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

	/* src/diagrams/LayerAnnotation.html generated by Svelte v2.15.3 */

	function data$q() {
	  return {
	    layerName: "mixed4c",
	    gridSize: 2,
	    homeScale: 14,
	    showLabels: true
	  }
	}
	const file$A = "src/diagrams/LayerAnnotation.html";

	function create_main_fragment$B(component, ctx) {
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
				addLoc(div0, file$A, 3, 2, 67);
				div1.className = "atlas svelte-tlu8r4";
				addLoc(div1, file$A, 17, 2, 323);
				setStyle(div2, "display", "grid");
				setStyle(div2, "grid-template-columns", "1fr 200px");
				addLoc(div2, file$A, 2, 0, 2);
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
		this._state = assign(data$q(), options.data);
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

		this._fragment = create_main_fragment$B(this, this._state);

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

	function data$r() {
	  return {
	    iconCrop: 0.02,
	    width: null,
	    icon: null,
	    config: null
	  }
	}
	var methods$5 = {
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
	const file$B = "src/ClippedIcon.html";

	function create_main_fragment$C(component, ctx) {
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
				addLoc(canvas, file$B, 1, 2, 121);
				setStyle(div, "position", "relative");
				setStyle(div, "overflow", "hidden");
				setStyle(div, "height", "" + ctx.width + "px");
				setStyle(div, "border-right", "solid 1px rgba(255, 255, 255, 0.2)");
				addLoc(div, file$B, 0, 0, 0);
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
		this._state = assign(data$r(), options.data);

		this._recompute({ width: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<ClippedIcon> was created without expected data property 'width'");
		this._intro = true;

		this._fragment = create_main_fragment$C(this, this._state);

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
	assign(ClippedIcon.prototype, methods$5);

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

	function data$s() {
	  return {
	    container: null,
	    arrow: null,
	    arrowHeight: 30,
	    imgList: [],
	  }
	}
	var methods$6 = {
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
	const file$C = "src/SetOfIcons.html";

	function get_each_context$a(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.icon = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$D(component, ctx) {
		var div1, canvas, text, div0, div1_resize_listener;

		var each_value = ctx.imgList;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$b(component, get_each_context$a(ctx, each_value, i));
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
				addLoc(canvas, file$C, 1, 2, 71);
				div0.className = "icons svelte-106o8is";
				addLoc(div0, file$C, 2, 2, 136);
				component.root._beforecreate.push(div1_resize_handler);
				addLoc(div1, file$C, 0, 0, 0);
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
						const child_ctx = get_each_context$a(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$b(component, child_ctx);
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
	function create_each_block$b(component, ctx) {

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
		this._state = assign(data$s(), options.data);

		this._recompute({ layers: 1 }, this._state);
		if (!('layers' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'layers'");
		if (!('width' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'width'");
		if (!('height' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'height'");
		if (!('arrowHeight' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'arrowHeight'");
		if (!('imgList' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'imgList'");
		if (!('config' in this._state)) console.warn("<SetOfIcons> was created without expected data property 'config'");
		this._intro = true;
		this._handlers.update = [onupdate$3];

		this._fragment = create_main_fragment$D(this, this._state);

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
	assign(SetOfIcons.prototype, methods$6);

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

	function data$t() {
	  return {
	    gridSize: 1,
	    height: 160,
	    color: '#ff6600',
	    uniqueId: Math.random(),
	    atlasMargin: 20,
	  }
	}
	const file$D = "src/diagrams/ShowAPath.html";

	function create_main_fragment$E(component, ctx) {
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
				addLoc(div0, file$D, 1, 2, 91);
				div1.className = "thumbnail svelte-19vqpwh";
				addLoc(div1, file$D, 10, 4, 313);
				setAttribute(circle, "cx", "5");
				setAttribute(circle, "cy", "5");
				setAttribute(circle, "r", "3");
				addLoc(circle, file$D, 36, 10, 954);
				setAttribute(marker0, "id", marker0_id_value = 'head' + ctx.uniqueId);
				setAttribute(marker0, "fill", ctx.color);
				setAttribute(marker0, "viewBox", "0 0 10 10");
				setAttribute(marker0, "refX", "5");
				setAttribute(marker0, "refY", "5");
				setAttribute(marker0, "markerWidth", "5");
				setAttribute(marker0, "markerHeight", "5");
				setAttribute(marker0, "orient", "auto-start-reverse");
				addLoc(marker0, file$D, 26, 8, 705);
				setAttribute(path0, "d", "M 0 0 L 10 5 L 0 10 z");
				addLoc(path0, file$D, 47, 10, 1233);
				setAttribute(marker1, "id", marker1_id_value = 'arrow' + ctx.uniqueId);
				setAttribute(marker1, "fill", ctx.color);
				setAttribute(marker1, "viewBox", "0 0 10 10");
				setAttribute(marker1, "refX", "5");
				setAttribute(marker1, "refY", "5");
				setAttribute(marker1, "markerWidth", "3");
				setAttribute(marker1, "markerHeight", "3");
				setAttribute(marker1, "orient", "auto-start-reverse");
				addLoc(marker1, file$D, 38, 8, 1010);
				addLoc(defs, file$D, 25, 6, 690);
				setAttribute(path1, "d", ctx.path_d);
				setAttribute(path1, "stroke", ctx.color);
				setAttribute(path1, "stroke-width", "3");
				setAttribute(path1, "fill", "transparent");
				setAttribute(path1, "marker-end", path1_marker_end_value = "url(#" + ('arrow' + ctx.uniqueId) + ")");
				setAttribute(path1, "marker-start", path1_marker_start_value = "url(#" + ('head' + ctx.uniqueId) + ")");
				addLoc(path1, file$D, 50, 6, 1306);
				setAttribute(svg, "class", "pathArrow svelte-19vqpwh");
				setStyle(svg, "width", ctx.edgeLength);
				setStyle(svg, "height", ctx.edgeLength);
				setStyle(svg, "left", (ctx.viewWidth - ctx.edgeLength) / 2);
				setStyle(svg, "top", (ctx.viewHeight - ctx.edgeLength) / 2);
				addLoc(svg, file$D, 18, 4, 490);
				div2.className = "atlas svelte-19vqpwh";
				setStyle(div2, "width", "" + (ctx.height-ctx.atlasMargin*2) + "px");
				setStyle(div2, "height", "" + (ctx.height-ctx.atlasMargin*2) + "px");
				setStyle(div2, "margin", "" + ctx.atlasMargin + "px");
				addLoc(div2, file$D, 9, 2, 193);
				div3.className = "showapath";
				setStyle(div3, "display", "grid");
				setStyle(div3, "grid-template-columns", "1fr " + ctx.height + "px");
				addLoc(div3, file$D, 0, 0, 0);
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
		this._state = assign(data$t(), options.data);

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

		this._fragment = create_main_fragment$E(this, this._state);

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

	function data$u() {
	  return {
	    layerName: "mixed4c",
	    gridSize: 3,
	    homeScale: 16 * 3,
	    showLabels: true
	  }
	}
	const file$E = "src/diagrams/VerticalLayerAnnotation.html";

	function create_main_fragment$F(component, ctx) {
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
				addLoc(div0, file$E, 3, 2, 19);
				div1.className = "atlas svelte-1dvwfeg";
				addLoc(div1, file$E, 19, 2, 336);
				addLoc(div2, file$E, 2, 0, 2);
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
					if (!if_block) {
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

		return {
			c: noop,

			m: noop,

			d: noop
		};
	}

	function VerticalLayerAnnotation(options) {
		this._debugName = '<VerticalLayerAnnotation>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$u(), options.data);
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

		this._fragment = create_main_fragment$F(this, this._state);

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

	/* src/components/Loupe.html generated by Svelte v2.15.3 */

	function data$v() {
	  return {
	    label: null,
	    width: null,
	    height: null,
	    color: "#ff6600"
	  }
	}
	const file$F = "src/components/Loupe.html";

	function create_main_fragment$G(component, ctx) {
		var div1, div0, slot_content_default = component._slotted.default, text;

		var if_block = (ctx.label) && create_if_block$9(component, ctx);

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				text = createText("\n  ");
				if (if_block) if_block.c();
				div0.className = "loupe svelte-k0t0vh";
				setStyle(div0, "border-color", ctx.color);
				addLoc(div0, file$F, 1, 2, 67);
				div1.className = "root svelte-k0t0vh";
				setStyle(div1, "width", "" + ctx.width + "px");
				setStyle(div1, "height", "" + ctx.height + "px");
				addLoc(div1, file$F, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);

				if (slot_content_default) {
					append(div0, slot_content_default);
				}

				append(div1, text);
				if (if_block) if_block.m(div1, null);
			},

			p: function update(changed, ctx) {
				if (changed.color) {
					setStyle(div0, "border-color", ctx.color);
				}

				if (ctx.label) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$9(component, ctx);
						if_block.c();
						if_block.m(div1, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (changed.width) {
					setStyle(div1, "width", "" + ctx.width + "px");
				}

				if (changed.height) {
					setStyle(div1, "height", "" + ctx.height + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				if (slot_content_default) {
					reinsertChildren(div0, slot_content_default);
				}

				if (if_block) if_block.d();
			}
		};
	}

	// (5:2) {#if label}
	function create_if_block$9(component, ctx) {
		var div, text;

		return {
			c: function create() {
				div = createElement("div");
				text = createText(ctx.label);
				div.className = "label svelte-k0t0vh";
				setStyle(div, "background-color", ctx.color);
				addLoc(div, file$F, 5, 4, 162);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, text);
			},

			p: function update(changed, ctx) {
				if (changed.label) {
					setData(text, ctx.label);
				}

				if (changed.color) {
					setStyle(div, "background-color", ctx.color);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
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
		this._state = assign(data$v(), options.data);
		if (!('width' in this._state)) console.warn("<Loupe> was created without expected data property 'width'");
		if (!('height' in this._state)) console.warn("<Loupe> was created without expected data property 'height'");
		if (!('color' in this._state)) console.warn("<Loupe> was created without expected data property 'color'");
		if (!('label' in this._state)) console.warn("<Loupe> was created without expected data property 'label'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$G(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Loupe.prototype, protoDev);

	Loupe.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Focus1Static.html generated by Svelte v2.15.3 */

	const file$G = "src/diagrams/Focus1Static.html";

	function create_main_fragment$H(component, ctx) {
		var div3, div0, text0, text1, div1, text2, div2;

		var lazyimage0_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-1-1.png"
		 };
		var lazyimage0 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage0_initial_data
		});

		var atlasreticle_initial_data = {
		 	aspectRatio: "1",
		 	scale: ctx.$focus1Highlight.scale,
		 	gcx: ctx.$focus1Highlight.x,
		 	gcy: ctx.$focus1Highlight.y,
		 	background: false,
		 	round: true,
		 	enableDragging: false
		 };
		var atlasreticle = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle_initial_data
		});

		var lazyimage1_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-1-2.png"
		 };
		var lazyimage1 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage1_initial_data
		});

		var loupe = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() }
		});

		return {
			c: function create() {
				div3 = createElement("div");
				div0 = createElement("div");
				lazyimage0._fragment.c();
				text0 = createText("\n    ");
				atlasreticle._fragment.c();
				text1 = createText("\n  ");
				div1 = createElement("div");
				lazyimage1._fragment.c();
				loupe._fragment.c();
				text2 = createText("\n  ");
				div2 = createElement("div");
				div2.textContent = "When we map opacity to the amount that each activation contributes to \"fireboat\", we see a main cluster of icons showing red boats and splashing, spraying water. While there are some stray areas elsewhere, it seems that this is region of the atlas that is dedicated specifically to classifying red boats with splashing water nearby.";
				div0.className = "main svelte-drlr3g";
				addLoc(div0, file$G, 2, 2, 22);
				div1.className = "detail svelte-drlr3g";
				addLoc(div1, file$G, 14, 2, 363);
				div2.className = "figcaption svelte-drlr3g";
				addLoc(div2, file$G, 19, 2, 516);
				div3.className = "root svelte-drlr3g";
				addLoc(div3, file$G, 1, 0, 1);
			},

			m: function mount(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div0);
				lazyimage0._mount(div0, null);
				append(div0, text0);
				atlasreticle._mount(div0, null);
				append(div3, text1);
				append(div3, div1);
				lazyimage1._mount(loupe._slotted.default, null);
				loupe._mount(div1, null);
				append(div3, text2);
				append(div3, div2);
			},

			p: function update(changed, ctx) {
				var atlasreticle_changes = {};
				if (changed.$focus1Highlight) atlasreticle_changes.scale = ctx.$focus1Highlight.scale;
				if (changed.$focus1Highlight) atlasreticle_changes.gcx = ctx.$focus1Highlight.x;
				if (changed.$focus1Highlight) atlasreticle_changes.gcy = ctx.$focus1Highlight.y;
				atlasreticle._set(atlasreticle_changes);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div3);
				}

				lazyimage0.destroy();
				atlasreticle.destroy();
				lazyimage1.destroy();
				loupe.destroy();
			}
		};
	}

	function Focus1Static(options) {
		this._debugName = '<Focus1Static>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Focus1Static> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(this.store._init(["focus1Highlight"]), options.data);
		this.store._add(this, ["focus1Highlight"]);
		if (!('$focus1Highlight' in this._state)) console.warn("<Focus1Static> was created without expected data property '$focus1Highlight'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$H(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Focus1Static.prototype, protoDev);

	Focus1Static.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Focus2Static.html generated by Svelte v2.15.3 */

	const file$H = "src/diagrams/Focus2Static.html";

	function create_main_fragment$I(component, ctx) {
		var div3, div0, text0, text1, text2, text3, div2, text4, text5, text6, div1;

		var lazyimage0_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-2-1.png"
		 };
		var lazyimage0 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage0_initial_data
		});

		var atlasreticle0_initial_data = {
		 	aspectRatio: "1",
		 	annotationValue: "3",
		 	scale: ctx.$focusHighlights[0].scale,
		 	gcx: ctx.$focusHighlights[0].x,
		 	gcy: ctx.$focusHighlights[0].y,
		 	background: false,
		 	round: true,
		 	enableDragging: false
		 };
		var atlasreticle0 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle0_initial_data
		});

		var atlasreticle1_initial_data = {
		 	aspectRatio: "1",
		 	annotationValue: "2",
		 	scale: ctx.$focusHighlights[1].scale,
		 	gcx: ctx.$focusHighlights[1].x,
		 	gcy: ctx.$focusHighlights[1].y,
		 	background: false,
		 	round: true,
		 	enableDragging: false
		 };
		var atlasreticle1 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle1_initial_data
		});

		var atlasreticle2_initial_data = {
		 	aspectRatio: "1",
		 	annotationValue: "1",
		 	scale: ctx.$focusHighlights[2].scale,
		 	gcx: ctx.$focusHighlights[2].x,
		 	gcy: ctx.$focusHighlights[2].y,
		 	background: false,
		 	round: true,
		 	enableDragging: false
		 };
		var atlasreticle2 = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle2_initial_data
		});

		var lazyimage1_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-2-4.png"
		 };
		var lazyimage1 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage1_initial_data
		});

		var loupe0_initial_data = { label: 1 };
		var loupe0 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe0_initial_data
		});

		var lazyimage2_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-2-3.png"
		 };
		var lazyimage2 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage2_initial_data
		});

		var loupe1_initial_data = { label: 2 };
		var loupe1 = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe1_initial_data
		});

		var lazyimage3_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-2-2.png"
		 };
		var lazyimage3 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage3_initial_data
		});

		var loupe2_initial_data = { label: 3 };
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
				lazyimage0._fragment.c();
				text0 = createText("\n    ");
				atlasreticle0._fragment.c();
				text1 = createText("\n    ");
				atlasreticle1._fragment.c();
				text2 = createText("\n    ");
				atlasreticle2._fragment.c();
				text3 = createText("\n  ");
				div2 = createElement("div");
				lazyimage1._fragment.c();
				loupe0._fragment.c();
				text4 = createText("\n    ");
				lazyimage2._fragment.c();
				loupe1._fragment.c();
				text5 = createText("\n    ");
				lazyimage3._fragment.c();
				loupe2._fragment.c();
				text6 = createText("\n    ");
				div1 = createElement("div");
				div1.textContent = "In mixed4d we see we see the attribution toward \"fireboat\" is high in several clusters located in different positions around the atlas. One is very focused on windows, another on geysers and splashing water, and yet another on crane-like objects.";
				div0.className = "main svelte-1smkqjl";
				addLoc(div0, file$H, 2, 2, 22);
				div1.className = "figcaption svelte-1smkqjl";
				addLoc(div1, file$H, 45, 4, 1320);
				div2.className = "detail svelte-1smkqjl";
				addLoc(div2, file$H, 35, 2, 902);
				div3.className = "root svelte-1smkqjl";
				addLoc(div3, file$H, 1, 0, 1);
			},

			m: function mount(target, anchor) {
				insert(target, div3, anchor);
				append(div3, div0);
				lazyimage0._mount(div0, null);
				append(div0, text0);
				atlasreticle0._mount(div0, null);
				append(div0, text1);
				atlasreticle1._mount(div0, null);
				append(div0, text2);
				atlasreticle2._mount(div0, null);
				append(div3, text3);
				append(div3, div2);
				lazyimage1._mount(loupe0._slotted.default, null);
				loupe0._mount(div2, null);
				append(div2, text4);
				lazyimage2._mount(loupe1._slotted.default, null);
				loupe1._mount(div2, null);
				append(div2, text5);
				lazyimage3._mount(loupe2._slotted.default, null);
				loupe2._mount(div2, null);
				append(div2, text6);
				append(div2, div1);
			},

			p: function update(changed, ctx) {
				var atlasreticle0_changes = {};
				if (changed.$focusHighlights) atlasreticle0_changes.scale = ctx.$focusHighlights[0].scale;
				if (changed.$focusHighlights) atlasreticle0_changes.gcx = ctx.$focusHighlights[0].x;
				if (changed.$focusHighlights) atlasreticle0_changes.gcy = ctx.$focusHighlights[0].y;
				atlasreticle0._set(atlasreticle0_changes);

				var atlasreticle1_changes = {};
				if (changed.$focusHighlights) atlasreticle1_changes.scale = ctx.$focusHighlights[1].scale;
				if (changed.$focusHighlights) atlasreticle1_changes.gcx = ctx.$focusHighlights[1].x;
				if (changed.$focusHighlights) atlasreticle1_changes.gcy = ctx.$focusHighlights[1].y;
				atlasreticle1._set(atlasreticle1_changes);

				var atlasreticle2_changes = {};
				if (changed.$focusHighlights) atlasreticle2_changes.scale = ctx.$focusHighlights[2].scale;
				if (changed.$focusHighlights) atlasreticle2_changes.gcx = ctx.$focusHighlights[2].x;
				if (changed.$focusHighlights) atlasreticle2_changes.gcy = ctx.$focusHighlights[2].y;
				atlasreticle2._set(atlasreticle2_changes);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div3);
				}

				lazyimage0.destroy();
				atlasreticle0.destroy();
				atlasreticle1.destroy();
				atlasreticle2.destroy();
				lazyimage1.destroy();
				loupe0.destroy();
				lazyimage2.destroy();
				loupe1.destroy();
				lazyimage3.destroy();
				loupe2.destroy();
			}
		};
	}

	function Focus2Static(options) {
		this._debugName = '<Focus2Static>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Focus2Static> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(this.store._init(["focusHighlights"]), options.data);
		this.store._add(this, ["focusHighlights"]);
		if (!('$focusHighlights' in this._state)) console.warn("<Focus2Static> was created without expected data property '$focusHighlights'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$I(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Focus2Static.prototype, protoDev);

	Focus2Static.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Focus3Static.html generated by Svelte v2.15.3 */

	const file$I = "src/diagrams/Focus3Static.html";

	function get_each1_context$4(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.h = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function get_each0_context$4(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.h = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$J(component, ctx) {
		var div2, h40, text1, div0, text2, text3, h41, text5, div1, text6;

		var lazyimage0_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-2-1.png"
		 };
		var lazyimage0 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage0_initial_data
		});

		var each0_value = ctx.$focusHighlights;

		var each0_blocks = [];

		for (var i = 0; i < each0_value.length; i += 1) {
			each0_blocks[i] = create_each_block_1$5(component, get_each0_context$4(ctx, each0_value, i));
		}

		var lazyimage1_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-3-1.png"
		 };
		var lazyimage1 = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage1_initial_data
		});

		var each1_value = ctx.$focusHighlights;

		var each1_blocks = [];

		for (var i = 0; i < each1_value.length; i += 1) {
			each1_blocks[i] = create_each_block$c(component, get_each1_context$4(ctx, each1_value, i));
		}

		return {
			c: function create() {
				div2 = createElement("div");
				h40 = createElement("h4");
				h40.textContent = "Activations for Fireboat";
				text1 = createText("\n  ");
				div0 = createElement("div");
				lazyimage0._fragment.c();
				text2 = createText("\n    ");

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].c();
				}

				text3 = createText("\n  ");
				h41 = createElement("h4");
				h41.textContent = "Activations for Streetcar";
				text5 = createText("\n  ");
				div1 = createElement("div");
				lazyimage1._fragment.c();
				text6 = createText("\n    ");

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].c();
				}
				h40.className = "svelte-1uisskv";
				addLoc(h40, file$I, 2, 2, 22);
				div0.className = "main svelte-1uisskv";
				addLoc(div0, file$I, 3, 2, 58);
				h41.className = "svelte-1uisskv";
				addLoc(h41, file$I, 18, 2, 453);
				div1.className = "main svelte-1uisskv";
				addLoc(div1, file$I, 19, 2, 490);
				div2.className = "root svelte-1uisskv";
				addLoc(div2, file$I, 1, 0, 1);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, h40);
				append(div2, text1);
				append(div2, div0);
				lazyimage0._mount(div0, null);
				append(div0, text2);

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].m(div0, null);
				}

				append(div2, text3);
				append(div2, h41);
				append(div2, text5);
				append(div2, div1);
				lazyimage1._mount(div1, null);
				append(div1, text6);

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].m(div1, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.$focusHighlights) {
					each0_value = ctx.$focusHighlights;

					for (var i = 0; i < each0_value.length; i += 1) {
						const child_ctx = get_each0_context$4(ctx, each0_value, i);

						if (each0_blocks[i]) {
							each0_blocks[i].p(changed, child_ctx);
						} else {
							each0_blocks[i] = create_each_block_1$5(component, child_ctx);
							each0_blocks[i].c();
							each0_blocks[i].m(div0, null);
						}
					}

					for (; i < each0_blocks.length; i += 1) {
						each0_blocks[i].d(1);
					}
					each0_blocks.length = each0_value.length;
				}

				if (changed.$focusHighlights) {
					each1_value = ctx.$focusHighlights;

					for (var i = 0; i < each1_value.length; i += 1) {
						const child_ctx = get_each1_context$4(ctx, each1_value, i);

						if (each1_blocks[i]) {
							each1_blocks[i].p(changed, child_ctx);
						} else {
							each1_blocks[i] = create_each_block$c(component, child_ctx);
							each1_blocks[i].c();
							each1_blocks[i].m(div1, null);
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
					detachNode(div2);
				}

				lazyimage0.destroy();

				destroyEach(each0_blocks, detach);

				lazyimage1.destroy();

				destroyEach(each1_blocks, detach);
			}
		};
	}

	// (6:4) {#each $focusHighlights as h, i}
	function create_each_block_1$5(component, ctx) {

		var atlasreticle_initial_data = {
		 	aspectRatio: "1",
		 	annotationValue: ctx.i + 1,
		 	scale: ctx.h.scale,
		 	gcx: ctx.h.x,
		 	gcy: ctx.h.y,
		 	background: false,
		 	round: true,
		 	enableDragging: false
		 };
		var atlasreticle = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle_initial_data
		});

		return {
			c: function create() {
				atlasreticle._fragment.c();
			},

			m: function mount(target, anchor) {
				atlasreticle._mount(target, anchor);
			},

			p: function update(changed, ctx) {
				var atlasreticle_changes = {};
				if (changed.$focusHighlights) atlasreticle_changes.scale = ctx.h.scale;
				if (changed.$focusHighlights) atlasreticle_changes.gcx = ctx.h.x;
				if (changed.$focusHighlights) atlasreticle_changes.gcy = ctx.h.y;
				atlasreticle._set(atlasreticle_changes);
			},

			d: function destroy$$1(detach) {
				atlasreticle.destroy(detach);
			}
		};
	}

	// (22:4) {#each $focusHighlights as h, i}
	function create_each_block$c(component, ctx) {

		var atlasreticle_initial_data = {
		 	color: "#ffaa00",
		 	aspectRatio: "1",
		 	annotationValue: ctx.i + 1,
		 	scale: ctx.h.scale,
		 	gcx: ctx.h.x,
		 	gcy: ctx.h.y,
		 	background: false,
		 	round: true,
		 	enableDragging: false
		 };
		var atlasreticle = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle_initial_data
		});

		return {
			c: function create() {
				atlasreticle._fragment.c();
			},

			m: function mount(target, anchor) {
				atlasreticle._mount(target, anchor);
			},

			p: function update(changed, ctx) {
				var atlasreticle_changes = {};
				if (changed.$focusHighlights) atlasreticle_changes.scale = ctx.h.scale;
				if (changed.$focusHighlights) atlasreticle_changes.gcx = ctx.h.x;
				if (changed.$focusHighlights) atlasreticle_changes.gcy = ctx.h.y;
				atlasreticle._set(atlasreticle_changes);
			},

			d: function destroy$$1(detach) {
				atlasreticle.destroy(detach);
			}
		};
	}

	function Focus3Static(options) {
		this._debugName = '<Focus3Static>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Focus3Static> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(this.store._init(["focusHighlights"]), options.data);
		this.store._add(this, ["focusHighlights"]);
		if (!('$focusHighlights' in this._state)) console.warn("<Focus3Static> was created without expected data property '$focusHighlights'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$J(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Focus3Static.prototype, protoDev);

	Focus3Static.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/diagrams/Focus3TableStatic.html generated by Svelte v2.15.3 */

	const file$J = "src/diagrams/Focus3TableStatic.html";

	function get_each1_context$5(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.h = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function get_each0_context$5(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.h = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$K(component, ctx) {
		var div5, h40, text0, text1, text2, h41, text3, text4, text5, div0, text6, div1, text8, div2, text10, div3, text12, div4;

		var each0_value = ctx.$focusHighlights;

		var each0_blocks = [];

		for (var i = 0; i < each0_value.length; i += 1) {
			each0_blocks[i] = create_each_block_1$6(component, get_each0_context$5(ctx, each0_value, i));
		}

		var each1_value = ctx.$focusHighlights;

		var each1_blocks = [];

		for (var i = 0; i < each1_value.length; i += 1) {
			each1_blocks[i] = create_each_block$d(component, get_each1_context$5(ctx, each1_value, i));
		}

		return {
			c: function create() {
				div5 = createElement("div");
				h40 = createElement("h4");
				text0 = createText("Fireboat");
				text1 = createText("\n    ");

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].c();
				}

				text2 = createText("\n\n\n    ");
				h41 = createElement("h4");
				text3 = createText("Streetcar");
				text4 = createText("\n    ");

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].c();
				}

				text5 = createText("\n\n    ");
				div0 = createElement("div");
				text6 = createText("\n    ");
				div1 = createElement("div");
				div1.textContent = "At mixed4d, Both \"streetcar\" and \"fireboat\" contain activations for what look like windows.";
				text8 = createText("\n    ");
				div2 = createElement("div");
				div2.textContent = "Both classes contain activations for crane-like apparatuses, though they are less prominent than the window activations.";
				text10 = createText("\n    ");
				div3 = createElement("div");
				div3.textContent = "\"Fireboat\" activations have much stronger attributions from water than \"streetcar\", where there is virtually no positive evidence.";
				text12 = createText("\n    ");
				div4 = createElement("div");
				div4.textContent = "The activations for \"streetcar\" have much stronger attributions from buildings than does \"fireboat\".";
				setStyle(h40, "width", "" + ctx.loupeSize + "px");
				addLoc(h40, file$J, 3, 4, 25);
				setStyle(h41, "width", "" + ctx.loupeSize + "px");
				addLoc(h41, file$J, 14, 4, 291);
				addLoc(div0, file$J, 26, 4, 585);
				div1.className = "figcaption svelte-19pyj07";
				addLoc(div1, file$J, 27, 4, 601);
				div2.className = "figcaption svelte-19pyj07";
				addLoc(div2, file$J, 30, 4, 739);
				div3.className = "figcaption svelte-19pyj07";
				addLoc(div3, file$J, 33, 4, 906);
				div4.className = "figcaption svelte-19pyj07";
				addLoc(div4, file$J, 36, 4, 1083);
				div5.className = "root svelte-19pyj07";
				addLoc(div5, file$J, 1, 0, 1);
			},

			m: function mount(target, anchor) {
				insert(target, div5, anchor);
				append(div5, h40);
				append(h40, text0);
				append(div5, text1);

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].m(div5, null);
				}

				append(div5, text2);
				append(div5, h41);
				append(h41, text3);
				append(div5, text4);

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].m(div5, null);
				}

				append(div5, text5);
				append(div5, div0);
				append(div5, text6);
				append(div5, div1);
				append(div5, text8);
				append(div5, div2);
				append(div5, text10);
				append(div5, div3);
				append(div5, text12);
				append(div5, div4);
			},

			p: function update(changed, ctx) {
				if (changed.loupeSize) {
					setStyle(h40, "width", "" + ctx.loupeSize + "px");
				}

				if (changed.$focusHighlights) {
					each0_value = ctx.$focusHighlights;

					for (var i = each0_blocks.length; i < each0_value.length; i += 1) {
						const child_ctx = get_each0_context$5(ctx, each0_value, i);

						each0_blocks[i] = create_each_block_1$6(component, child_ctx);
						each0_blocks[i].c();
						each0_blocks[i].m(div5, text2);
					}

					for (i = each0_value.length; i < each0_blocks.length; i += 1) {
						each0_blocks[i].d(1);
					}
					each0_blocks.length = each0_value.length;
				}

				if (changed.loupeSize) {
					setStyle(h41, "width", "" + ctx.loupeSize + "px");
				}

				if (changed.$focusHighlights) {
					each1_value = ctx.$focusHighlights;

					for (var i = each1_blocks.length; i < each1_value.length; i += 1) {
						const child_ctx = get_each1_context$5(ctx, each1_value, i);

						each1_blocks[i] = create_each_block$d(component, child_ctx);
						each1_blocks[i].c();
						each1_blocks[i].m(div5, text5);
					}

					for (i = each1_value.length; i < each1_blocks.length; i += 1) {
						each1_blocks[i].d(1);
					}
					each1_blocks.length = each1_value.length;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div5);
				}

				destroyEach(each0_blocks, detach);

				destroyEach(each1_blocks, detach);
			}
		};
	}

	// (5:4) {#each $focusHighlights as h, i}
	function create_each_block_1$6(component, ctx) {

		var lazyimage_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-2-" + (ctx.i + 2) + ".png"
		 };
		var lazyimage = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage_initial_data
		});

		var loupe_initial_data = { label: ctx.i + 1 };
		var loupe = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe_initial_data
		});

		return {
			c: function create() {
				lazyimage._fragment.c();
				loupe._fragment.c();
			},

			m: function mount(target, anchor) {
				lazyimage._mount(loupe._slotted.default, null);
				loupe._mount(target, anchor);
			},

			d: function destroy$$1(detach) {
				lazyimage.destroy();
				loupe.destroy(detach);
			}
		};
	}

	// (16:4) {#each $focusHighlights as h, i}
	function create_each_block$d(component, ctx) {

		var lazyimage_initial_data = {
		 	border: false,
		 	background: false,
		 	src: "assets/images/renders/focus-3-" + (ctx.i + 2) + ".png"
		 };
		var lazyimage = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage_initial_data
		});

		var loupe_initial_data = { label: ctx.i + 1, color: "#ffaa00" };
		var loupe = new Loupe({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: loupe_initial_data
		});

		return {
			c: function create() {
				lazyimage._fragment.c();
				loupe._fragment.c();
			},

			m: function mount(target, anchor) {
				lazyimage._mount(loupe._slotted.default, null);
				loupe._mount(target, anchor);
			},

			d: function destroy$$1(detach) {
				lazyimage.destroy();
				loupe.destroy(detach);
			}
		};
	}

	function Focus3TableStatic(options) {
		this._debugName = '<Focus3TableStatic>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<Focus3TableStatic> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(this.store._init(["focusHighlights"]), options.data);
		this.store._add(this, ["focusHighlights"]);
		if (!('loupeSize' in this._state)) console.warn("<Focus3TableStatic> was created without expected data property 'loupeSize'");
		if (!('$focusHighlights' in this._state)) console.warn("<Focus3TableStatic> was created without expected data property '$focusHighlights'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$K(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Focus3TableStatic.prototype, protoDev);

	Focus3TableStatic.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	// import FocusPlayground from './diagrams/FocusPlayground.html';
	// import ClassComparisonSingle from './diagrams/ClassComparisonSingle.html';



	// new LazyComponent({
	// 	target: document.querySelector("#cover"),
	// 	store: store,
	// 	data: {
	// 		height: 556,
	// 		component: Cover,
	// 	}
	// });

	document.addEventListener("DOMContentLoaded", (e) => {

		// 
		// Initialize lazy images
		// 

		const lazyImages = document.querySelectorAll("[data-lazy-image]");
		for (const lazyImage of lazyImages) {
			const url = lazyImage.getAttribute("data-lazy-image");
			const aspectRatio = lazyImage.getAttribute("data-lazy-image-aspect-ratio");
			new LazyImage({
				target: lazyImage,
				data: {
					src: "assets/images/renders/" + url,
					aspectRatio: aspectRatio ? aspectRatio : 1,
					background: false,
					border: false,
				}
			});
		}

		// 
		// Initialize notebook links
		// 

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

		// 
		// Components
		// 

		const cover = document.querySelector("#cover");
		cover.addEventListener("ready", e => {
			new App({
				target: cover,
				store,
				data: {
					showClassFilter: false,
					layerName: "mixed4d",
					showLabels: false,
					showOptions: false,
					homeX: 0.55,
					homeY: 0.7,
					homeScale: 4,
					gridSize: 2
				}
			});
		});

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
					homeX: 0.8183,
					homeY: 0.2047,
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


		let layerComparison = new App({
			target: document.querySelector("#all-layer-comparison"),
			store: store,
			data: {
				showClassFilter: false
			}
		});

		// new LazyComponent({
		// 	target: document.querySelector("#all-layer-comparison"),
		// 	store: store,
		// 	data: {
		// 		aspectRatio: 2,
		// 		component: App,
		// 		componentData: {
		// 			showClassFilter: false,
		// 		}
		// 	}
		// });


		const poiLinks = document.querySelectorAll("[data-poi]");
		for (const link of poiLinks) {
			const id = link.getAttribute("data-poi");
			const { pois } = store.get();
			link.addEventListener("click", e => {
				e.preventDefault();
				layerComparison.set({layerName: pois[id].layerName});
				layerComparison.set(pois[id]);
			});
		}

		// Focusing on a Single Classification

		new Focus1Static({
			target: document.querySelector("#focus-1"),
			store: store,
		});

		new Focus2Static({
			target: document.querySelector("#focus-2"),
			store: store,
		});

		new Focus3Static({
			target: document.querySelector("#focus-3"),
			store: store,
		});

		new Focus3TableStatic({
			target: document.querySelector("#focus-3-table"),
			store: store,
		});

		new App({
			target: document.querySelector("#focus-playground"),
			store: store,
			data: {
				classHeatmap: 235,
				layerName: "mixed4d"
			}
		});


		// Further Isolating Classes

		new ClassSubset({
			target: document.querySelector("#class-subset"),
			store: store,
		});

		new ClassFilterComparison({
			target: document.querySelector("#class-filter-comparison"),
			store: store
		});

		// new ClassComparison({
		// 	target: document.querySelector("#class-comparison-1"),
		// 	store: store,
		// 	data: {
		// 		showControls: false,
		// 		classComparisonIndex: 1
		// 	}
		// });

		new ClassComparison({
			target: document.querySelector("#class-comparison-2"),
			store: store,
			data: {
				showControls: false,
				classComparisonIndex: 0,
				filterType: "top"
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


	});

}());
//# sourceMappingURL=main.js.map
