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

	class MyStore extends Store { }

	const store = new MyStore({
	  scroll: false,
	  inceptionLabels: Labels.inception,
	  currentClass: 62,
	  currentClassAtlasIndex: 507,
	  currentClassAtlasCompareIndex: 507,
	  classChoices: [9, 622, 665, 652, 288, 233, 188, 169, 80, 76, 62, 61, 7, 355, 990, 746, 791],
	  classAtlasIndices: [
	    982,
	    507,
	    62,
	    9,
	    169,
	    7,
	    80,
	    76,
	    235,
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
	  multipleLayers: {
	    abacus: [
	      {
	        layerName: "mixed3b",
	        homeX: 0.8086,
	        homeY: 0.4295,
	        gridSize: 3,
	        homeScale: 16 * 1.5 * 2,
	      },
	      {
	        layerName: "mixed4c",
	        homeX: 0.8593,
	        homeY: 0.5814
	      },
	      {
	        layerName: "mixed5b",
	        homeX: 0.8183,
	        homeY: 1 - 0.21,
	        gridSize: 4,
	        homeScale: 16 * 6,
	      }
	    ],
	    plant: [
	      {
	        layerName: "mixed3b",
	        homeX: 0.590,
	        homeY: 0.640,
	        gridSize: 3,
	        homeScale: 16 * 1.5 * 2,
	        caption: "You'll immediately notice that the early layer is very nonspecific in comparison to the others. The icons that emerge are of patterns and splotches of color. It is suggestive of the final class, but not particularly evocative."

	      },
	      {
	        layerName: "mixed4c",
	        homeX: 0.15,
	        homeY: 0.40,
	        caption: 'By the middle layer, icons definitely resemble leaves, but they could be any type of plant. Attributions are focused on plants, but are a little all over the board.'

	      },
	      {
	        layerName: "mixed5b",
	        homeX: 0.178,
	        homeY: 1 - 0.28,
	        // gridSize: 4,
	        // homeScale: 16 * 3 * 2,
	        caption: 'Here we see foliage with textures that are specific to cabbage, and curved into rounded balls. There are full heads of cabbage rather than individual leaves.'

	      }
	    ],
	    water: [
	      {
	        layerName: "mixed4c",
	        homeX: 0.365,
	        homeY: 0.673,
	        caption: 'In mixed4c we see two different regions that have high attribution toward "sandbar": an area of <b>sandy textures</b>…',
	      },
	      {
	        layerName: "mixed4c",
	        homeX: 0.318,
	        homeY: 0.764,
	        caption: '…and a separate area of <b>watery textures</b>.'
	      },
	      {
	        layerName: "mixed5b",
	        homeX: 0.740,
	        homeY: 1 - 0.52,
	        // gridSize: 3,
	        // homeScale: 16 * 6,
	        caption: 'In a later layer we see activations that contain <b>both</b> of those concepts when detecting "sandbar".'
	      },
	    ]
	  },
	  // For class gradients and class comparisons
	  currentClassComparisonIndex: 0,
	  classComparisons: [
	    {
	      id: "507_982", leftLabel: "snorkel", rightLabel: "scuba diver", left: 507, right: 982,
	      annotation: [
	        { pos: { x: 7, y: 8 }, desc: "locomotive?" },
	      ]
	    },
	    { id: "736_744", leftLabel: "head cabbage", rightLabel: "artichoke", left: 736, right: 744, annotation: [] },
	    {
	      id: "671_672", leftLabel: "frying pan", rightLabel: "wok", left: 671, right: 672,
	      annotation: [
	        { pos: { x: 1, y: 7 }, desc: "noodles?" }
	      ]
	    },
	    { id: "777_831", leftLabel: "beer bottle", rightLabel: "wine bottle", left: 777, right: 831, annotation: [] },
	    { id: "543_544", leftLabel: "computer keyboard", rightLabel: "typewriter keyboard", left: 543, right: 544, annotation: [] },
	    { id: "28_205", leftLabel: "red wolf", rightLabel: "timber wolf", left: 28, right: 205, annotation: [] },
	    { id: "67_62", leftLabel: "grey fox", rightLabel: "red fox", left: 67, right: 62, annotation: [] },
	    { id: "1_62", leftLabel: "kit fox", rightLabel: "red fox", left: 1, right: 62, annotation: [] },
	    {
	      id: "6_442", leftLabel: Labels.inception[6], rightLabel: Labels.inception[442], left: 6, right: 442, annotation: [
	        { pos: { x: 2, y: 7 }, desc: "baseball?" }
	      ]
	    },
	  ],
	  focus1Highlight: {
	    scale:6,
	    x:0.844,
	    y:1 - 0.510
	  },
	  focusHighlights: [
	    {
	      scale: 10,
	      x: 0.873,
	      y: 1 - 0.415,
	    },
	    {
	      scale: 10,
	      x: 0.709,
	      y: 1 - 0.421,
	    },
	    {
	      scale: 10,
	      x: 0.221,
	      y: 1 - 0.138,
	    },
	    {
	      scale: 10,
	      x: 0.807,
	      y: 1 - 0.333,
	    },
	  ],
	  pois: {
	    mammals: {
	      layerName: "mixed4a",
	      gridSize: 2,
	      gcx: 1 - 0.3705,
	      gcy: 1 - 0.9475,
	      scale: 8
	    },
	    dogs: {
	      layerName: "mixed5a",
	      gridSize: 3,
	      gcx: 0.589,
	      gcy: 1 - 0.946,
	      scale: 10

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
	      gcy: 1 - 0.1380,
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
	      gcy: 1 - 0.0234,
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
	      gcx: 0.743,
	      gcy: 1 - 0.520,
	      scale: 12
	    }
	  }
	});

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

	function locationWithoutQuery() {
	    return location.protocol + '//' + location.hostname + (location.port ? ":" + location.port : "") + location.pathname;
	}

	/* src/library/Button.html generated by Svelte v2.15.3 */

	function data() {
	  return {
	    backgroundColor: "rgb(255, 130, 0)",
	    color: "white",
	  }
	}
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
				setStyle(button, "background-color", ctx.backgroundColor);
				setStyle(button, "color", ctx.color);
				button.className = "svelte-nm66xb";
				addLoc(button, file, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, button, anchor);

				if (slot_content_default) {
					append(button, slot_content_default);
				}
			},

			p: function update(changed, ctx) {
				if (changed.backgroundColor) {
					setStyle(button, "background-color", ctx.backgroundColor);
				}

				if (changed.color) {
					setStyle(button, "color", ctx.color);
				}
			},

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
		this._state = assign(data(), options.data);
		if (!('backgroundColor' in this._state)) console.warn("<Button> was created without expected data property 'backgroundColor'");
		if (!('color' in this._state)) console.warn("<Button> was created without expected data property 'color'");
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

	function data$1() {
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
		this._state = assign(data$1(), options.data);

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

	/* src/AtlasReticle.html generated by Svelte v2.15.3 */

	function left({clientWidth, extent}) {
		return Math.min(clientWidth, Math.max(1e-6, extent[0][0] * clientWidth));
	}

	function right({clientWidth, extent}) {
		return Math.min(clientWidth, extent[0][1] * clientWidth);
	}

	function top({clientHeight, extent}) {
		return Math.min(clientHeight, Math.max(1e-6, extent[1][0] * clientHeight));
	}

	function bottom({clientHeight, extent}) {
		return Math.min(clientHeight, extent[1][1] * clientHeight);
	}

	function data$2() {
	  return {
	    dragging: false,
	    extent: [[0, 0],[0, 0]],
	    background: true,
	    round: false,
	    color: "rgb(255, 130, 0)",
	    enableDragging: true,
	    upListener: null,
	    moveListener: null,
	    cursor: 'grab',
	    clientWidth: 98,
	    clientHeight: 98
	  }
	}
	var methods = {
	  measure() {
	    this.set({
	      clientWidth: this.refs.root.offsetWidth,
	      clientHeight: this.refs.root.offsetHeight,
	    });
	  },
	  up() {
	    const {upListener, moveListener} = this.get();
	    window.removeEventListener("pointermove", moveListener);
	    window.removeEventListener("pointerup", upListener);
	    this.set({cursor: "grab"});
	  },
	  down(event) {
	    event.preventDefault();
	    const {enableDragging, clientWidth, clientHeight} = this.get();
	    if (enableDragging) {
	      this.move(event);
	    }
	    const upListener = this.up.bind(this);
	    window.addEventListener("pointerup", upListener);
	    const moveListener = this.move.bind(this);
	    window.addEventListener("pointermove", moveListener);
	    this.set({upListener, moveListener, cursor: "grabbing"});
	  },
	  move(event) {
	    const {clientWidth, clientHeight} = this.get();
	    const gcx = event.offsetX / clientWidth; 
	    const gcy = event.offsetY / clientHeight;
	    this.set({
	      gcx,
	      gcy,
	      startPos: {x: event.screenX, y: event.screenY},
	    });
	    this.fire("drag", {gcx, gcy});
	  },
	};

	function oncreate() {
	  setTimeout(() => this.measure(), 10);
	}
	const file$5 = "src/AtlasReticle.html";

	function create_main_fragment$5(component, ctx) {
		var div;

		function onwindowresize(event) {
			component.measure();	}
		window.addEventListener("resize", onwindowresize);

		var if_block = (ctx.extent) && create_if_block(component, ctx);

		function pointerdown_handler(event) {
			component.down(event);
		}

		return {
			c: function create() {
				div = createElement("div");
				if (if_block) if_block.c();
				addListener(div, "pointerdown", pointerdown_handler);
				div.className = "root svelte-1pppif8";
				setStyle(div, "cursor", ctx.cursor);
				setStyle(div, "position", "absolute");
				addLoc(div, file$5, 3, 0, 42);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
				component.refs.root = div;
			},

			p: function update(changed, ctx) {
				if (ctx.extent) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block(component, ctx);
						if_block.c();
						if_block.m(div, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (changed.cursor) {
					setStyle(div, "cursor", ctx.cursor);
				}
			},

			d: function destroy$$1(detach) {
				window.removeEventListener("resize", onwindowresize);

				if (detach) {
					detachNode(div);
				}

				if (if_block) if_block.d();
				removeListener(div, "pointerdown", pointerdown_handler);
				if (component.refs.root === div) component.refs.root = null;
			}
		};
	}

	// (10:2) {#if extent}
	function create_if_block(component, ctx) {
		var svg, text, div, div_class_value;

		var if_block0 = (ctx.left && ctx.right && ctx.top && ctx.bottom) && create_if_block_2(component, ctx);

		var if_block1 = (ctx.annotationValue) && create_if_block_1(component, ctx);

		return {
			c: function create() {
				svg = createSvgElement("svg");
				if (if_block0) if_block0.c();
				text = createText("\n  ");
				div = createElement("div");
				if (if_block1) if_block1.c();
				setAttribute(svg, "width", ctx.clientWidth);
				setAttribute(svg, "height", ctx.clientHeight);
				setAttribute(svg, "class", "svelte-1pppif8");
				addLoc(svg, file$5, 10, 2, 173);
				div.className = div_class_value = "reticle " + (ctx.round ? 'round' : '') + " svelte-1pppif8";
				setStyle(div, "border-color", ctx.color);
				setStyle(div, "top", "" + (ctx.top - 1) + "px");
				setStyle(div, "left", "" + (ctx.left - 1) + "px");
				setStyle(div, "width", "" + (ctx.right - ctx.left + 2) + "px");
				setStyle(div, "height", "" + (ctx.bottom - ctx.top + 2) + "px");
				addLoc(div, file$5, 18, 2, 504);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				if (if_block0) if_block0.m(svg, null);
				insert(target, text, anchor);
				insert(target, div, anchor);
				if (if_block1) if_block1.m(div, null);
			},

			p: function update(changed, ctx) {
				if (ctx.left && ctx.right && ctx.top && ctx.bottom) {
					if (if_block0) {
						if_block0.p(changed, ctx);
					} else {
						if_block0 = create_if_block_2(component, ctx);
						if_block0.c();
						if_block0.m(svg, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (changed.clientWidth) {
					setAttribute(svg, "width", ctx.clientWidth);
				}

				if (changed.clientHeight) {
					setAttribute(svg, "height", ctx.clientHeight);
				}

				if (ctx.annotationValue) {
					if (if_block1) {
						if_block1.p(changed, ctx);
					} else {
						if_block1 = create_if_block_1(component, ctx);
						if_block1.c();
						if_block1.m(div, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if ((changed.round) && div_class_value !== (div_class_value = "reticle " + (ctx.round ? 'round' : '') + " svelte-1pppif8")) {
					div.className = div_class_value;
				}

				if (changed.color) {
					setStyle(div, "border-color", ctx.color);
				}

				if (changed.top) {
					setStyle(div, "top", "" + (ctx.top - 1) + "px");
				}

				if (changed.left) {
					setStyle(div, "left", "" + (ctx.left - 1) + "px");
				}

				if (changed.right || changed.left) {
					setStyle(div, "width", "" + (ctx.right - ctx.left + 2) + "px");
				}

				if (changed.bottom || changed.top) {
					setStyle(div, "height", "" + (ctx.bottom - ctx.top + 2) + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(svg);
				}

				if (if_block0) if_block0.d();
				if (detach) {
					detachNode(text);
					detachNode(div);
				}

				if (if_block1) if_block1.d();
			}
		};
	}

	// (12:4) {#if left && right && top && bottom}
	function create_if_block_2(component, ctx) {
		var path, path_class_value, path_d_value;

		return {
			c: function create() {
				path = createSvgElement("path");
				setAttribute(path, "class", path_class_value = "" + (ctx.background ? '' : 'transparent') + " svelte-1pppif8");
				setAttribute(path, "d", path_d_value = "M0,0 L" + ctx.clientWidth + ",0 L" + ctx.clientWidth + "," + ctx.clientHeight + " L0," + ctx.clientHeight + " z M" + ctx.left + "," + ctx.top + " L" + ctx.left + "," + ctx.bottom + " L" + ctx.right + "," + ctx.bottom + " L" + ctx.right + "," + ctx.top + " z");
				addLoc(path, file$5, 12, 6, 268);
			},

			m: function mount(target, anchor) {
				insert(target, path, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.background) && path_class_value !== (path_class_value = "" + (ctx.background ? '' : 'transparent') + " svelte-1pppif8")) {
					setAttribute(path, "class", path_class_value);
				}

				if ((changed.clientWidth || changed.clientHeight || changed.left || changed.top || changed.bottom || changed.right) && path_d_value !== (path_d_value = "M0,0 L" + ctx.clientWidth + ",0 L" + ctx.clientWidth + "," + ctx.clientHeight + " L0," + ctx.clientHeight + " z M" + ctx.left + "," + ctx.top + " L" + ctx.left + "," + ctx.bottom + " L" + ctx.right + "," + ctx.bottom + " L" + ctx.right + "," + ctx.top + " z")) {
					setAttribute(path, "d", path_d_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(path);
				}
			}
		};
	}

	// (29:4) {#if annotationValue}
	function create_if_block_1(component, ctx) {
		var div2, div1, div0, text;

		return {
			c: function create() {
				div2 = createElement("div");
				div1 = createElement("div");
				div0 = createElement("div");
				text = createText(ctx.annotationValue);
				div0.className = "annotation";
				addLoc(div0, file$5, 31, 10, 898);
				div1.className = "annotationTab svelte-1pppif8";
				setStyle(div1, "background", ctx.color);
				addLoc(div1, file$5, 30, 8, 832);
				div2.className = "annotationTabParent svelte-1pppif8";
				setStyle(div2, "top", "" + (ctx.w * ctx.width-2)/2 + "px");
				addLoc(div2, file$5, 29, 6, 757);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, div0);
				append(div0, text);
			},

			p: function update(changed, ctx) {
				if (changed.annotationValue) {
					setData(text, ctx.annotationValue);
				}

				if (changed.color) {
					setStyle(div1, "background", ctx.color);
				}

				if (changed.w || changed.width) {
					setStyle(div2, "top", "" + (ctx.w * ctx.width-2)/2 + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div2);
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
		this.refs = {};
		this._state = assign(data$2(), options.data);

		this._recompute({ clientWidth: 1, extent: 1, clientHeight: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'clientWidth'");
		if (!('extent' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'extent'");
		if (!('clientHeight' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'clientHeight'");
		if (!('cursor' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'cursor'");




		if (!('background' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'background'");
		if (!('round' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'round'");
		if (!('color' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'color'");
		if (!('annotationValue' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'annotationValue'");
		if (!('w' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'w'");
		if (!('width' in this._state)) console.warn("<AtlasReticle> was created without expected data property 'width'");
		this._intro = true;

		this._fragment = create_main_fragment$5(this, this._state);

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

	assign(AtlasReticle.prototype, protoDev);
	assign(AtlasReticle.prototype, methods);

	AtlasReticle.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('left' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'left'");
		if ('right' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'right'");
		if ('top' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'top'");
		if ('bottom' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasReticle>: Cannot set read-only property 'bottom'");
	};

	AtlasReticle.prototype._recompute = function _recompute(changed, state) {
		if (changed.clientWidth || changed.extent) {
			if (this._differs(state.left, (state.left = left(state)))) changed.left = true;
			if (this._differs(state.right, (state.right = right(state)))) changed.right = true;
		}

		if (changed.clientHeight || changed.extent) {
			if (this._differs(state.top, (state.top = top(state)))) changed.top = true;
			if (this._differs(state.bottom, (state.bottom = bottom(state)))) changed.bottom = true;
		}
	};

	/* src/library/Radar.html generated by Svelte v2.15.3 */

	function data$3() {
	  return {
	    display: "block", // "inline", "inline-block", "block"
	    ready: false,
	    height: "",
	    onscreen: false,
	    offscreen: true
	  }
	}
	function oncreate$1() {
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
	const file$6 = "src/library/Radar.html";

	function create_main_fragment$6(component, ctx) {
		var d_figure, slot_content_default = component._slotted.default;

		return {
			c: function create() {
				d_figure = createElement("d-figure");
				setStyle(d_figure, "display", ctx.display);
				setStyle(d_figure, "height", ctx.height);
				addLoc(d_figure, file$6, 6, 0, 173);
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

				if (changed.height) {
					setStyle(d_figure, "height", ctx.height);
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
		this._state = assign(data$3(), options.data);
		if (!('display' in this._state)) console.warn("<Radar> was created without expected data property 'display'");
		if (!('height' in this._state)) console.warn("<Radar> was created without expected data property 'height'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$6(this, this._state);

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

	assign(Radar.prototype, protoDev);

	Radar.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/Loading.html generated by Svelte v2.15.3 */

	const file$7 = "src/library/Loading.html";

	function create_main_fragment$7(component, ctx) {
		var div, span;

		return {
			c: function create() {
				div = createElement("div");
				span = createElement("span");
				span.textContent = "Loading …";
				span.className = "svelte-19e83wz";
				addLoc(span, file$7, 1, 2, 8);
				div.className = "svelte-19e83wz";
				addLoc(div, file$7, 0, 0, 0);
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

		this._fragment = create_main_fragment$7(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Loading.prototype, protoDev);

	Loading.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/Placeholder.html generated by Svelte v2.15.3 */

	function data$4() {
	  return {
	    display: "block",
	    aspectRatio: 1,
	    clientWidth: 0,
	    
	  }
	}
	const file$8 = "src/library/Placeholder.html";

	function create_main_fragment$8(component, ctx) {
		var div1, div0, slot_content_default = component._slotted.default;

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				div0.className = "container svelte-xqvv98";
				addLoc(div0, file$8, 1, 2, 86);
				div1.className = "root svelte-xqvv98";
				setStyle(div1, "display", ctx.display);
				setStyle(div1, "padding-bottom", "" + 100 / ctx.aspectRatio + "%");
				addLoc(div1, file$8, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);

				if (slot_content_default) {
					append(div0, slot_content_default);
				}
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
			}
		};
	}

	function Placeholder(options) {
		this._debugName = '<Placeholder>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign(data$4(), options.data);
		if (!('display' in this._state)) console.warn("<Placeholder> was created without expected data property 'display'");
		if (!('aspectRatio' in this._state)) console.warn("<Placeholder> was created without expected data property 'aspectRatio'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$8(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Placeholder.prototype, protoDev);

	Placeholder.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/LazyImage.html generated by Svelte v2.15.3 */

	function data$5() {
	  return {
	    ready: false,
	    src: "",
	    alt: "",
	    style: "",
	    display: "block", //"inline", "inline-block", "block"
	    aspectRatio: 1, // width/height
	    border: true,
	    background: false,
	  }
	}
	const file$9 = "src/library/LazyImage.html";

	function create_main_fragment$9(component, ctx) {
		var div, if_block_anchor, radar_updating = {}, div_class_value;

		function select_block_type(ctx) {
			if (ctx.ready) return create_if_block$1;
			return create_else_block;
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
				div.className = div_class_value = "" + (ctx.background ? 'background' : '') + " " + (ctx.border ? 'border' : '') + " svelte-1q1tvil" + " svelte-ref-root";
				addLoc(div, file$9, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if_block.m(placeholder._slotted.default, null);
				append(placeholder._slotted.default, if_block_anchor);
				placeholder._mount(radar._slotted.default, null);
				radar._mount(div, null);
				component.refs.root = div;
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

				if ((changed.background || changed.border) && div_class_value !== (div_class_value = "" + (ctx.background ? 'background' : '') + " " + (ctx.border ? 'border' : '') + " svelte-1q1tvil" + " svelte-ref-root")) {
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
				if (component.refs.root === div) component.refs.root = null;
			}
		};
	}

	// (6:6) {:else}
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

	// (4:6) {#if ready}
	function create_if_block$1(component, ctx) {
		var img;

		return {
			c: function create() {
				img = createElement("img");
				img.src = ctx.src;
				img.alt = ctx.alt;
				img.style.cssText = ctx.style;
				img.className = "svelte-1q1tvil svelte-ref-image";
				addLoc(img, file$9, 4, 8, 160);
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

				if (changed.style) {
					img.style.cssText = ctx.style;
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
		this._state = assign(data$5(), options.data);
		if (!('background' in this._state)) console.warn("<LazyImage> was created without expected data property 'background'");
		if (!('border' in this._state)) console.warn("<LazyImage> was created without expected data property 'border'");
		if (!('ready' in this._state)) console.warn("<LazyImage> was created without expected data property 'ready'");
		if (!('aspectRatio' in this._state)) console.warn("<LazyImage> was created without expected data property 'aspectRatio'");
		if (!('src' in this._state)) console.warn("<LazyImage> was created without expected data property 'src'");
		if (!('alt' in this._state)) console.warn("<LazyImage> was created without expected data property 'alt'");
		if (!('style' in this._state)) console.warn("<LazyImage> was created without expected data property 'style'");
		this._intro = true;

		this._fragment = create_main_fragment$9(this, this._state);

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

	/* src/components/AppMiniMap.html generated by Svelte v2.15.3 */

	function data$6() {
	  return {
	    scaleCountFactor: 200
	  }
	}
	const file$a = "src/components/AppMiniMap.html";

	function create_main_fragment$a(component, ctx) {
		var div1, div0, text, atlasreticle_updating = {};

		var lazyimage_initial_data = {
		 	aspectRatio: 1,
		 	src: "assets/images/renders/thumbnail-" + ctx.layerName + ".jpg",
		 	border: false,
		 	alt: "thumbnail for " + ctx.layerName
		 };
		var lazyimage = new LazyImage({
			root: component.root,
			store: component.store,
			data: lazyimage_initial_data
		});

		var atlasreticle_initial_data = { enableDragging: true };
		if (ctx.extent
	       !== void 0) {
			atlasreticle_initial_data.extent = ctx.extent
	      ;
			atlasreticle_updating.extent = true;
		}
		var atlasreticle = new AtlasReticle({
			root: component.root,
			store: component.store,
			data: atlasreticle_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!atlasreticle_updating.extent && changed.extent) {
					newState.extent = childState.extent;
				}
				component._set(newState);
				atlasreticle_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasreticle._bind({ extent: 1 }, atlasreticle.get());
		});

		atlasreticle.on("drag", function(event) {
			component.fire('drag', event);
		});

		var placeholder = new Placeholder({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() }
		});

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				lazyimage._fragment.c();
				text = createText("\n    ");
				atlasreticle._fragment.c();
				placeholder._fragment.c();
				setStyle(div0, "opacity", "0.4");
				addLoc(div0, file$a, 2, 4, 35);
				div1.className = "svelte-15ooxw3 svelte-ref-root";
				addLoc(div1, file$a, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(placeholder._slotted.default, div0);
				lazyimage._mount(div0, null);
				append(placeholder._slotted.default, text);
				atlasreticle._mount(placeholder._slotted.default, null);
				placeholder._mount(div1, null);
				component.refs.root = div1;
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				var lazyimage_changes = {};
				if (changed.layerName) lazyimage_changes.src = "assets/images/renders/thumbnail-" + ctx.layerName + ".jpg";
				if (changed.layerName) lazyimage_changes.alt = "thumbnail for " + ctx.layerName;
				lazyimage._set(lazyimage_changes);

				var atlasreticle_changes = {};
				if (!atlasreticle_updating.extent && changed.extent) {
					atlasreticle_changes.extent = ctx.extent
	      ;
					atlasreticle_updating.extent = ctx.extent
	       !== void 0;
				}
				atlasreticle._set(atlasreticle_changes);
				atlasreticle_updating = {};
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				lazyimage.destroy();
				atlasreticle.destroy();
				placeholder.destroy();
				if (component.refs.root === div1) component.refs.root = null;
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
		this._state = assign(data$6(), options.data);
		if (!('layerName' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'layerName'");
		if (!('extent' in this._state)) console.warn("<AppMiniMap> was created without expected data property 'extent'");
		this._intro = true;

		this._fragment = create_main_fragment$a(this, this._state);

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

	function observe(key, callback, options) {
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
		observe: observe,
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
	const cache = new Map();

	function realHeight(width, height) {
	  return height ? height : width;
	}

	function data$7() {
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
	var methods$1 = {
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

	function oncreate$2() {
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
	    if (cache.has(url)) {
	      const cached = cache.get(url);
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
	      cache.set(url, data);
	      img.src = url;
	    }
	  });
	}
	function create_main_fragment$b(component, state) {
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
		this._state = assign$1(data$7(), options.data);
		this._recompute({ width: 1, height: 1 }, this._state);

		var _oncreate = oncreate$2.bind(this);

		if (!options.root) {
			this._oncreate = [];
		}

		this._fragment = create_main_fragment$b(this, this._state);

		this.root._oncreate.push(_oncreate);

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);

			callAll$1(this._oncreate);
		}
	}

	assign$1(Sprite.prototype, methods$1, proto$1);

	Sprite.prototype._recompute = function _recompute(changed, state) {
		if (changed.width || changed.height) {
			if (this._differs(state.realHeight, (state.realHeight = realHeight(state.width, state.height)))) changed.realHeight = true;
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
	const cache$1 = new Map();
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
	  if (cache$1.has(id)) {
	    return cache$1.get(id);
	  } else {
	    let extension = parseFileExtensionFromURL(url, loaders);
	    let loader = loaders.get(extension);
	    let p = loader(url);
	    cache$1.set(id, p);
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
	//# sourceMappingURL=index.js.map

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

	var vm = "shan-gpu-06-vm";
	var id = "inceptionv1_mixed3a";
	var build_dir = "build";
	var cloud_dir = "gs://activation-atlas-public";
	var model = "inceptionv1";
	var layer = "mixed3a";
	var sample_type = "random";
	var sample_images = 1000000;
	var filter = 400000;
	var tries = 4;
	var tile_size = 10;
	var grid_size = [
		20,
		40,
		80,
		160
	];
	var whiten = "false";
	var steps = 1024;
	var icon_size = 80;
	var layout = "200_0.05_euclidean";
	var class_filter = null;
	var batch_size = 100;
	var x = null;
	var y = null;
	var alpha = false;
	var inceptionv1_mixed3a = {
		vm: vm,
		id: id,
		build_dir: build_dir,
		cloud_dir: cloud_dir,
		model: model,
		layer: layer,
		sample_type: sample_type,
		sample_images: sample_images,
		filter: filter,
		tries: tries,
		tile_size: tile_size,
		grid_size: grid_size,
		whiten: whiten,
		steps: steps,
		icon_size: icon_size,
		layout: layout,
		class_filter: class_filter,
		batch_size: batch_size,
		x: x,
		y: y,
		alpha: alpha
	};

	var vm$1 = "shan-gpu-06-vm";
	var id$1 = "inceptionv1_mixed3b";
	var build_dir$1 = "build";
	var cloud_dir$1 = "gs://activation-atlas-public";
	var model$1 = "inceptionv1";
	var layer$1 = "mixed3b";
	var sample_type$1 = "random";
	var sample_images$1 = 1000000;
	var filter$1 = 400000;
	var tries$1 = 4;
	var tile_size$1 = 10;
	var grid_size$1 = [
		20,
		40,
		80,
		160
	];
	var whiten$1 = "false";
	var steps$1 = 1024;
	var icon_size$1 = 80;
	var layout$1 = "200_0.05_euclidean";
	var class_filter$1 = null;
	var batch_size$1 = 100;
	var x$1 = null;
	var y$1 = null;
	var alpha$1 = false;
	var inceptionv1_mixed3b = {
		vm: vm$1,
		id: id$1,
		build_dir: build_dir$1,
		cloud_dir: cloud_dir$1,
		model: model$1,
		layer: layer$1,
		sample_type: sample_type$1,
		sample_images: sample_images$1,
		filter: filter$1,
		tries: tries$1,
		tile_size: tile_size$1,
		grid_size: grid_size$1,
		whiten: whiten$1,
		steps: steps$1,
		icon_size: icon_size$1,
		layout: layout$1,
		class_filter: class_filter$1,
		batch_size: batch_size$1,
		x: x$1,
		y: y$1,
		alpha: alpha$1
	};

	var vm$2 = "shan-gpu-08-vm";
	var id$2 = "inceptionv1_mixed4a";
	var build_dir$2 = "build";
	var cloud_dir$2 = "gs://shancarter/activation-atlas/build";
	var model$2 = "InceptionV1";
	var layer$2 = [
		"mixed4a"
	];
	var sample_type$2 = "random";
	var sample_images$2 = 1000000;
	var filter$2 = null;
	var tries$2 = 4;
	var tile_size$2 = 10;
	var grid_size$2 = [
		20,
		40,
		80,
		160
	];
	var whiten$2 = "true";
	var steps$2 = 1024;
	var icon_size$2 = 80;
	var layout$2 = "50_0.05_cosine";
	var class_filter$2 = null;
	var batch_size$2 = 100;
	var x$2 = null;
	var y$2 = null;
	var alpha$2 = false;
	var inceptionv1_mixed4a = {
		vm: vm$2,
		id: id$2,
		build_dir: build_dir$2,
		cloud_dir: cloud_dir$2,
		model: model$2,
		layer: layer$2,
		sample_type: sample_type$2,
		sample_images: sample_images$2,
		filter: filter$2,
		tries: tries$2,
		tile_size: tile_size$2,
		grid_size: grid_size$2,
		whiten: whiten$2,
		steps: steps$2,
		icon_size: icon_size$2,
		layout: layout$2,
		class_filter: class_filter$2,
		batch_size: batch_size$2,
		x: x$2,
		y: y$2,
		alpha: alpha$2
	};

	var vm$3 = "shan-gpu-08-vm";
	var id$3 = "inceptionv1_mixed4b";
	var build_dir$3 = "build";
	var cloud_dir$3 = "gs://shancarter/activation-atlas/build";
	var model$3 = "InceptionV1";
	var layer$3 = [
		"mixed4b"
	];
	var sample_type$3 = "random";
	var sample_images$3 = 1000000;
	var filter$3 = null;
	var tries$3 = 4;
	var tile_size$3 = 10;
	var grid_size$3 = [
		20,
		40,
		80,
		160
	];
	var whiten$3 = "true";
	var steps$3 = 1024;
	var icon_size$3 = 80;
	var layout$3 = "50_0.05_cosine";
	var class_filter$3 = null;
	var batch_size$3 = 100;
	var x$3 = null;
	var y$3 = null;
	var alpha$3 = false;
	var inceptionv1_mixed4b = {
		vm: vm$3,
		id: id$3,
		build_dir: build_dir$3,
		cloud_dir: cloud_dir$3,
		model: model$3,
		layer: layer$3,
		sample_type: sample_type$3,
		sample_images: sample_images$3,
		filter: filter$3,
		tries: tries$3,
		tile_size: tile_size$3,
		grid_size: grid_size$3,
		whiten: whiten$3,
		steps: steps$3,
		icon_size: icon_size$3,
		layout: layout$3,
		class_filter: class_filter$3,
		batch_size: batch_size$3,
		x: x$3,
		y: y$3,
		alpha: alpha$3
	};

	var vm$4 = "shan-gpu-08-vm";
	var id$4 = "inceptionv1_mixed4c";
	var build_dir$4 = "build";
	var cloud_dir$4 = "gs://shancarter/activation-atlas/build";
	var model$4 = "InceptionV1";
	var layer$4 = [
		"mixed4c"
	];
	var sample_type$4 = "random";
	var sample_images$4 = 1000000;
	var filter$4 = null;
	var tries$4 = 4;
	var tile_size$4 = 10;
	var grid_size$4 = [
		20,
		40,
		80,
		160
	];
	var whiten$4 = "true";
	var steps$4 = 1024;
	var icon_size$4 = 80;
	var layout$4 = "50_0.05_cosine";
	var class_filter$4 = null;
	var batch_size$4 = 100;
	var x$4 = null;
	var y$4 = null;
	var alpha$4 = false;
	var inceptionv1_mixed4c = {
		vm: vm$4,
		id: id$4,
		build_dir: build_dir$4,
		cloud_dir: cloud_dir$4,
		model: model$4,
		layer: layer$4,
		sample_type: sample_type$4,
		sample_images: sample_images$4,
		filter: filter$4,
		tries: tries$4,
		tile_size: tile_size$4,
		grid_size: grid_size$4,
		whiten: whiten$4,
		steps: steps$4,
		icon_size: icon_size$4,
		layout: layout$4,
		class_filter: class_filter$4,
		batch_size: batch_size$4,
		x: x$4,
		y: y$4,
		alpha: alpha$4
	};

	var vm$5 = "shan-gpu-07-vm";
	var id$5 = "inceptionv1_mixed4d";
	var build_dir$5 = "build";
	var cloud_dir$5 = "gs://shancarter/activation-atlas/build";
	var model$5 = "InceptionV1";
	var layer$5 = [
		"mixed4d"
	];
	var sample_type$5 = "random";
	var sample_images$5 = 1000000;
	var filter$5 = null;
	var tries$5 = 4;
	var tile_size$5 = 10;
	var grid_size$5 = [
		20,
		40,
		80,
		160
	];
	var whiten$5 = "true";
	var steps$5 = 1024;
	var icon_size$5 = 80;
	var layout$5 = "50_0.05_cosine";
	var class_filter$5 = null;
	var batch_size$5 = 100;
	var x$5 = null;
	var y$5 = null;
	var alpha$5 = false;
	var inceptionv1_mixed4d = {
		vm: vm$5,
		id: id$5,
		build_dir: build_dir$5,
		cloud_dir: cloud_dir$5,
		model: model$5,
		layer: layer$5,
		sample_type: sample_type$5,
		sample_images: sample_images$5,
		filter: filter$5,
		tries: tries$5,
		tile_size: tile_size$5,
		grid_size: grid_size$5,
		whiten: whiten$5,
		steps: steps$5,
		icon_size: icon_size$5,
		layout: layout$5,
		class_filter: class_filter$5,
		batch_size: batch_size$5,
		x: x$5,
		y: y$5,
		alpha: alpha$5
	};

	var vm$6 = "shan-gpu-07-vm";
	var id$6 = "inceptionv1_mixed4e";
	var build_dir$6 = "build";
	var cloud_dir$6 = "gs://shancarter/activation-atlas/build";
	var model$6 = "InceptionV1";
	var layer$6 = [
		"mixed4e"
	];
	var sample_type$6 = "random";
	var sample_images$6 = 1000000;
	var filter$6 = null;
	var tries$6 = 4;
	var tile_size$6 = 10;
	var grid_size$6 = [
		20,
		40,
		80,
		160
	];
	var whiten$6 = "true";
	var steps$6 = 1024;
	var icon_size$6 = 80;
	var layout$6 = "50_0.05_cosine";
	var class_filter$6 = null;
	var batch_size$6 = 100;
	var x$6 = null;
	var y$6 = null;
	var alpha$6 = false;
	var inceptionv1_mixed4e = {
		vm: vm$6,
		id: id$6,
		build_dir: build_dir$6,
		cloud_dir: cloud_dir$6,
		model: model$6,
		layer: layer$6,
		sample_type: sample_type$6,
		sample_images: sample_images$6,
		filter: filter$6,
		tries: tries$6,
		tile_size: tile_size$6,
		grid_size: grid_size$6,
		whiten: whiten$6,
		steps: steps$6,
		icon_size: icon_size$6,
		layout: layout$6,
		class_filter: class_filter$6,
		batch_size: batch_size$6,
		x: x$6,
		y: y$6,
		alpha: alpha$6
	};

	var vm$7 = "shan-gpu-08-vm";
	var id$7 = "inceptionv1_mixed5a";
	var build_dir$7 = "build";
	var cloud_dir$7 = "gs://shancarter/activation-atlas/build";
	var model$7 = "InceptionV1";
	var layer$7 = [
		"mixed5a"
	];
	var sample_type$7 = "random";
	var sample_images$7 = 1000000;
	var filter$7 = null;
	var tries$7 = 4;
	var tile_size$7 = 10;
	var grid_size$7 = [
		20,
		40,
		80,
		160,
		320
	];
	var whiten$7 = "true";
	var steps$7 = 1024;
	var icon_size$7 = 80;
	var layout$7 = "50_0.05_cosine";
	var class_filter$7 = null;
	var batch_size$7 = 100;
	var x$7 = null;
	var y$7 = null;
	var alpha$7 = false;
	var inceptionv1_mixed5a = {
		vm: vm$7,
		id: id$7,
		build_dir: build_dir$7,
		cloud_dir: cloud_dir$7,
		model: model$7,
		layer: layer$7,
		sample_type: sample_type$7,
		sample_images: sample_images$7,
		filter: filter$7,
		tries: tries$7,
		tile_size: tile_size$7,
		grid_size: grid_size$7,
		whiten: whiten$7,
		steps: steps$7,
		icon_size: icon_size$7,
		layout: layout$7,
		class_filter: class_filter$7,
		batch_size: batch_size$7,
		x: x$7,
		y: y$7,
		alpha: alpha$7
	};

	var vm$8 = "shan-gpu-07-vm";
	var id$8 = "inceptionv1_mixed5b";
	var build_dir$8 = "build";
	var cloud_dir$8 = "gs://shancarter/activation-atlas/build";
	var model$8 = "InceptionV1";
	var layer$8 = [
		"mixed5b"
	];
	var sample_type$8 = "random";
	var sample_images$8 = 1000000;
	var filter$8 = null;
	var tries$8 = 4;
	var tile_size$8 = 10;
	var grid_size$8 = [
		20,
		40,
		80,
		160,
		320
	];
	var whiten$8 = "true";
	var steps$8 = 1024;
	var icon_size$8 = 80;
	var layout$8 = "50_0.05_cosine";
	var class_filter$8 = null;
	var batch_size$8 = 100;
	var x$8 = null;
	var y$8 = null;
	var alpha$8 = false;
	var inceptionv1_mixed5b = {
		vm: vm$8,
		id: id$8,
		build_dir: build_dir$8,
		cloud_dir: cloud_dir$8,
		model: model$8,
		layer: layer$8,
		sample_type: sample_type$8,
		sample_images: sample_images$8,
		filter: filter$8,
		tries: tries$8,
		tile_size: tile_size$8,
		grid_size: grid_size$8,
		whiten: whiten$8,
		steps: steps$8,
		icon_size: icon_size$8,
		layout: layout$8,
		class_filter: class_filter$8,
		batch_size: batch_size$8,
		x: x$8,
		y: y$8,
		alpha: alpha$8
	};

	/* src/AtlasThumbnail.html generated by Svelte v2.15.3 */



	const configs = {
	  inceptionv1_mixed3a: inceptionv1_mixed3a,
	  inceptionv1_mixed3b: inceptionv1_mixed3b,
	  inceptionv1_mixed4a: inceptionv1_mixed4a,
	  inceptionv1_mixed4b: inceptionv1_mixed4b,
	  inceptionv1_mixed4c: inceptionv1_mixed4c,
	  inceptionv1_mixed4d: inceptionv1_mixed4d,
	  inceptionv1_mixed4e: inceptionv1_mixed4e,
	  inceptionv1_mixed5a: inceptionv1_mixed5a,
	  inceptionv1_mixed5b: inceptionv1_mixed5b,
	};

	function height({clientWidth}) {
		return clientWidth;
	}

	function id$9({model: model$$1, layerName}) {
		return model$$1 + "_" + layerName;
	}

	function data$8() {
	  return {
	    root: "_cache",
	    model: "inceptionv1",
	    layerName: "mixed4d",
	    grid: 1,
	    layout: 0,
	    gridSize: 10,
	    classHeatmap: -1,
	    icons: [],
	    clientWidth: 45
	  };
	}
	var methods$2 = {
	  render() {
	    const {grid, gridSize, icons, classHeatmap, layerName} = this.get();
	    const context = this.refs.canvas.getContext('2d');
	    let imageData = context.getImageData(0, 0, gridSize, gridSize);
	    let data = imageData.data;
	    let flipX = false;
	    let flipY = false;
	    switch (layerName) {
	      case "mixed4a":
	        flipX = true;
	        flipY = true;
	        break;
	      case "mixed4d":
	        flipX = true;
	        flipY = false;
	        break;
	      case "mixed5a":
	        flipX = true;
	        flipY = false;
	        break;
	      case "mixed5b":
	        flipX = true;
	        flipY = false;
	        break;
	    }
	    // for (var i = 0; i < data.length; i += 4) {
	      // data[i] = 100;
	      // data[i + 1] = 100;
	      // data[i + 2] = 100;
	      // data[i + 3] = 255;
	    // }
	    for (const icon of icons) {
	      let heatmapMultiplier = 1.0;
	      if (classHeatmap > -1) {
	        let ci = classesToKeep.indexOf(classHeatmap);
	        let value = Math.max(0, icon.f[ci]);
	        heatmapMultiplier = Math.max(0.1, value * 20);
	        // console.log(ci, value)
	      }
	      const y$$1 = flipX ? (gridSize - icon.x - 1) : icon.x; //x,y switched on purpose 
	      const x$$1 = flipY ? (gridSize - icon.y - 1) : icon.y; //x,y switched on purpose
	      // data[y * gridSize * 4 + x * 4 + 0] = (heatmapMultiplier) * 255 * 20;
	      // data[y * gridSize * 4 + x * 4 + 1] = (heatmapMultiplier) * 130 * 20;
	      // data[y * gridSize * 4 + x * 4 + 2] = (heatmapMultiplier) * 1 * 20;
	      data[y$$1 * gridSize * 4 + x$$1 * 4 + 3] = 40 + (gridSize > 20 ? 0.0008 : 0.00015) * gridSize * gridSize * (icon.n / Math.pow((grid + 1), 2)) * heatmapMultiplier;
	    }
	    
	    context.putImageData(imageData, 0, 0);
	  }
	};

	function oncreate$3() {
	  const {root, id: id$$1, grid} = this.get();
	  const config = configs[id$$1];
	  // console.log("config: ", config)
	  if (config.class_filter == null) { config.class_filter = "None"; }
	  if (config.filter == null) { config.filter = "None"; }
	  if (!Array.isArray(config.layout)) {config.layout = [config.layout];}
	  if (!Array.isArray(config.layer)) {config.layer = [config.layer];}
	  if (!Array.isArray(config.filter)) {config.filter = [config.filter];}
	  this.set({gridSize: config.grid_size[grid], layerName: config.layer[0]});
	  const url = `${root}/${id$$1}/web/web--grid_size=${config.grid_size[grid]}--layout=${config.layout[0]}--class_filter=${config.class_filter}--filter=${config.filter[0]}--layer=${config.layer[0]}--model=${config.model}--sample_images=${config.sample_images}--sample_type=${config.sample_type}.json`;
	  // console.log("config", config)
	  load(url).then(web => {
	    // console.log("web", web)
	    this.set({icons: web});
	    this.render();
	  });
	}
	function onupdate({changed}) {
	  if (changed.classHeatmap) {
	    this.render();
	  }
	}
	const file$b = "src/AtlasThumbnail.html";

	function create_main_fragment$c(component, ctx) {
		var div, canvas;

		return {
			c: function create() {
				div = createElement("div");
				canvas = createElement("canvas");
				canvas.width = ctx.gridSize;
				canvas.height = ctx.gridSize;
				setStyle(canvas, "width", "100%");
				canvas.className = "svelte-sjakuy";
				addLoc(canvas, file$b, 2, 2, 37);
				setStyle(div, "height", "" + ctx.height + "px");
				addLoc(div, file$b, 1, 0, 1);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, canvas);
				component.refs.canvas = canvas;
			},

			p: function update(changed, ctx) {
				if (changed.gridSize) {
					canvas.width = ctx.gridSize;
					canvas.height = ctx.gridSize;
				}

				if (changed.height) {
					setStyle(div, "height", "" + ctx.height + "px");
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

	function AtlasThumbnail(options) {
		this._debugName = '<AtlasThumbnail>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$8(), options.data);

		this._recompute({ clientWidth: 1, model: 1, layerName: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'clientWidth'");
		if (!('model' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'model'");
		if (!('layerName' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'layerName'");

		if (!('gridSize' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'gridSize'");
		this._intro = true;
		this._handlers.update = [onupdate];

		this._fragment = create_main_fragment$c(this, this._state);

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

	assign(AtlasThumbnail.prototype, protoDev);
	assign(AtlasThumbnail.prototype, methods$2);

	AtlasThumbnail.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('height' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasThumbnail>: Cannot set read-only property 'height'");
		if ('id' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasThumbnail>: Cannot set read-only property 'id'");
	};

	AtlasThumbnail.prototype._recompute = function _recompute(changed, state) {
		if (changed.clientWidth) {
			if (this._differs(state.height, (state.height = height(state)))) changed.height = true;
		}

		if (changed.model || changed.layerName) {
			if (this._differs(state.id, (state.id = id$9(state)))) changed.id = true;
		}
	};

	/* src/components/AppLayerChooser.html generated by Svelte v2.15.3 */

	function data$9() { return {
	  layerName: "mixed4c",
	  layers: [
	    "mixed3a",
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
	const file$c = "src/components/AppLayerChooser.html";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.layer = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$d(component, ctx) {
		var div;

		var each_value = ctx.layers;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(component, get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = createElement("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "stack";
				addLoc(div, file$c, 0, 0, 0);
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
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(component, child_ctx);
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
	function create_each_block(component, ctx) {
		var label, input, input_value_value, text0, div, text1, span, text2_value = ctx.layer, text2, text3, label_class_value;

		function input_change_handler() {
			component.set({ layerName: input.__value });
		}

		var atlasthumbnail_initial_data = {
		 	grid: 0,
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
				input.className = "svelte-1lxnb2u";
				addLoc(input, file$c, 3, 4, 114);
				div.className = "thumb svelte-1lxnb2u";
				setStyle(div, "position", "relative");
				addLoc(div, file$c, 4, 4, 172);
				span.className = "svelte-1lxnb2u";
				addLoc(span, file$c, 7, 4, 301);
				label.className = label_class_value = "layer " + (ctx.layerName == ctx.layer ? 'selected' : '') + " svelte-1lxnb2u";
				addLoc(label, file$c, 2, 2, 49);
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

				if ((changed.layerName || changed.layers) && label_class_value !== (label_class_value = "layer " + (ctx.layerName == ctx.layer ? 'selected' : '') + " svelte-1lxnb2u")) {
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
		this._state = assign(data$9(), options.data);
		if (!('layers' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'layers'");
		if (!('layerName' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'layerName'");
		if (!('classHeatmap' in this._state)) console.warn("<AppLayerChooser> was created without expected data property 'classHeatmap'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._fragment = create_main_fragment$d(this, this._state);

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



	function labels({inceptionLabels}) {
	  let out = classesToKeep.map(k => {
	    let l = inceptionLabels.inception[k];
	    return {label: l, i: k};
	  });
	  return [{label: "show all", i: -1}].concat(out);
	}

	function data$a() {
	  return {
	    classesToKeep,
	    inceptionLabels: Labels,
	    classHeatmap: 235
	  }
	}
	const file$d = "src/components/AppClassFilter.html";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.l = list[i];
		return child_ctx;
	}

	function create_main_fragment$e(component, ctx) {
		var div;

		var each_value = ctx.labels;

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
				div.className = "chooser svelte-xexspk";
				addLoc(div, file$d, 0, 0, 0);
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

	// (2:2) {#each labels as l}
	function create_each_block$1(component, ctx) {
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
				input.className = "svelte-xexspk";
				addLoc(input, file$d, 3, 6, 111);
				span.title = span_title_value = ctx.l.i;
				addLoc(span, file$d, 4, 6, 172);
				label.className = label_class_value = "" + (ctx.classHeatmap === ctx.l.i ? 'selected' : '') + " svelte-xexspk";
				addLoc(label, file$d, 2, 4, 48);
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

				if ((changed.classHeatmap || changed.labels) && label_class_value !== (label_class_value = "" + (ctx.classHeatmap === ctx.l.i ? 'selected' : '') + " svelte-xexspk")) {
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
		this._state = assign(data$a(), options.data);

		this._recompute({ inceptionLabels: 1 }, this._state);
		if (!('inceptionLabels' in this._state)) console.warn("<AppClassFilter> was created without expected data property 'inceptionLabels'");

		if (!('classHeatmap' in this._state)) console.warn("<AppClassFilter> was created without expected data property 'classHeatmap'");
		this._bindingGroups = [[]];
		this._intro = true;

		this._fragment = create_main_fragment$e(this, this._state);

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
	const cache$2 = new Map();
	const suppress$1 = new Map();
	const namespaces$1 = new Map();

	// Mapping file extensions to loaders
	const loaders$1 = new Map([
	  ['gif', image$1],
	  ['png', image$1],
	  ['jpeg', image$1],
	  ['jpg', image$1],
	  ['csv', csv$3],
	  ['tsv', tsv$3],
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
	    // img.crossOrigin = "anonymous";
	    img.src = url;
	  })
	}

	function json$1(url) {
	  return fetch(url).then(handleErrors$1).then(response => response.json())
	}

	function text$1(url) {
	  return fetch(url).then(handleErrors$1).then(response => response.text());
	}

	function csv$3(url) {
	  return text$1(url).then(text => Promise.resolve(csvParse$1(text)));
	}

	function tsv$3(url) {
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
	  if (cache$2.has(id)) {
	    return cache$2.get(id);
	  } else {
	    let extension = parseFileExtensionFromURL$1(url, loaders$1);
	    let loader = loaders$1.get(extension);
	    let p = loader(url);
	    cache$2.set(id, p);
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

	/* src/AtlasDataLoader.html generated by Svelte v2.15.3 */



	const configs$1 = {
	  inceptionv1_mixed3a: inceptionv1_mixed3a,
	  inceptionv1_mixed3b: inceptionv1_mixed3b,
	  inceptionv1_mixed4a: inceptionv1_mixed4a,
	  inceptionv1_mixed4b: inceptionv1_mixed4b,
	  inceptionv1_mixed4c: inceptionv1_mixed4c,
	  inceptionv1_mixed4d: inceptionv1_mixed4d,
	  inceptionv1_mixed4e: inceptionv1_mixed4e,
	  inceptionv1_mixed5a: inceptionv1_mixed5a,
	  inceptionv1_mixed5b: inceptionv1_mixed5b,
	};

	function data$b() {
	  return {
	    fingerprint: Math.random() + Date.now(),
	  // root: "assets",
	    root: "_cache",
	    id: "inceptionv1",
	    labels: Labels.inception,
	    layer: 0,
	    classFilter: 0,
	    filter: 0,
	    layout: 0,
	    config: null,
	    layers: null,
	    loading: false,
	  };
	}
	function onupdate$1({ changed, current, previous }) {
	  if (changed.layer || changed.classFilter || changed.id || changed.layout || changed.filter) {

	    const {root, id: id$$1, layer: layer$$1, classFilter, filter: filter$$1, fingerprint, layout: layout$$1} = this.get();
	    this.set({loading: true});
	    const config = configs$1[id$$1];
	    this.set({config});
	    let flipX = false;
	    let flipY = false;

	    switch (config.layer[layer$$1]) {
	      case "mixed4a":
	        flipX = true;
	        flipY = true;
	        break;
	      case "mixed4d":
	        flipX = true;
	        flipY = false;
	        break;
	      case "mixed5a":
	        flipX = true;
	        flipY = false;
	        break;
	      case "mixed5b":
	        flipX = true;
	        flipY = false;
	        break;
	    }

	    if (classFilter !== null) {

	      if (config.class_filter == null) { config.class_filter = "None"; }
	      if (config.filter == null) { config.filter = "None"; }
	      if (!Array.isArray(config.grid_size)) { config.grid_size = [config.grid_size]; }
	      if (!Array.isArray(config.class_filter)) { config.class_filter = [config.class_filter]; }
	      if (!Array.isArray(config.layer)) { config.layer = [config.layer]; }
	      if (!Array.isArray(config.layout)) { config.layout = [config.layout]; }
	      if (!Array.isArray(config.filter)) { config.filter = [config.filter]; }

	      let gridUrls = config.grid_size.map(g => `${root}/${id$$1}/web/web--grid_size=${g}--layout=${config.layout[layout$$1]}--class_filter=${config.class_filter[classFilter]}--filter=${config.filter[filter$$1]}--layer=${config.layer[layer$$1]}--model=${config.model}--sample_images=${config.sample_images}--sample_type=${config.sample_type}.json`);
	      load$1(gridUrls).then(responses => {
	        let layers = Array(responses.length);
	        responses.forEach((g, i) => {
	          let gridSize = config.grid_size[i];
	          let tileSize = config.tile_size;
	          let numRows = gridSize / tileSize;
	          let t = [...Array(numRows).keys()];
	          let ic = [...Array(gridSize).keys()];
	          let icons = ic.map(x$$1 => Array(gridSize));
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
	            // console.log("gridSize", gridSize, gridSize - gd.grid_x, gd.grid_x)
	            let x$$1 = flipX ? (gridSize - gd.grid_x - 1) : gd.grid_x;
	            let y$$1 = flipY ? (gridSize - gd.grid_y - 1) : gd.grid_y;
	            gd.gx = x$$1 / gridSize;
	            gd.gy = y$$1 / gridSize;
	            gd.gw = 1 / gridSize;
	            let tileX = Math.floor(gd.grid_x / tileSize);
	            let tileY = Math.floor(gd.grid_y / tileSize);
	            gd.localX = gd.grid_x % tileSize;
	            gd.localY = gd.grid_y % tileSize;
	            gd.url = `${root}/${id$$1}/render/render--x=${tileX}--y=${tileY}--tries=${config.tries}--alpha=${config.alpha ? "True" : "False"}--tile_size=${config.tile_size}--whiten=${config.whiten}--steps=${config.steps}--icon_size=${config.icon_size}--grid_size=${gridSize}--layout=${config.layout[layout$$1]}--class_filter=${config.class_filter[classFilter]}--filter=${config.filter[filter$$1]}--layer=${config.layer[layer$$1]}--model=${config.model}--sample_images=${config.sample_images}--sample_type=${config.sample_type}.jpg`;
	            icons[x$$1][y$$1] = gd;
	          }
	          layers[i] = icons;
	        });
	        this.set({layers, loading: false});
	      });
	    }
	  }     
	}
	function create_main_fragment$f(component, ctx) {

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
		this._state = assign(data$b(), options.data);
		this._intro = true;
		this._handlers.update = [onupdate$1];

		this._fragment = create_main_fragment$f(this, this._state);

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

	var noop$2 = {value: function() {}};

	function dispatch() {
	  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
	    if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
	    _[t] = [];
	  }
	  return new Dispatch(_);
	}

	function Dispatch(_) {
	  this._ = _;
	}

	function parseTypenames(typenames, types) {
	  return typenames.trim().split(/^|\s+/).map(function(t) {
	    var name = "", i = t.indexOf(".");
	    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
	    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
	    return {type: t, name: name};
	  });
	}

	Dispatch.prototype = dispatch.prototype = {
	  constructor: Dispatch,
	  on: function(typename, callback) {
	    var _ = this._,
	        T = parseTypenames(typename + "", _),
	        t,
	        i = -1,
	        n = T.length;

	    // If no callback was specified, return the callback of the given type and name.
	    if (arguments.length < 2) {
	      while (++i < n) if ((t = (typename = T[i]).type) && (t = get$2(_[t], typename.name))) return t;
	      return;
	    }

	    // If a type was specified, set the callback for the given type and name.
	    // Otherwise, if a null callback was specified, remove callbacks of the given name.
	    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
	    while (++i < n) {
	      if (t = (typename = T[i]).type) _[t] = set$2(_[t], typename.name, callback);
	      else if (callback == null) for (t in _) _[t] = set$2(_[t], typename.name, null);
	    }

	    return this;
	  },
	  copy: function() {
	    var copy = {}, _ = this._;
	    for (var t in _) copy[t] = _[t].slice();
	    return new Dispatch(copy);
	  },
	  call: function(type, that) {
	    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  },
	  apply: function(type, that, args) {
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  }
	};

	function get$2(type, name) {
	  for (var i = 0, n = type.length, c; i < n; ++i) {
	    if ((c = type[i]).name === name) {
	      return c.value;
	    }
	  }
	}

	function set$2(type, name, callback) {
	  for (var i = 0, n = type.length; i < n; ++i) {
	    if (type[i].name === name) {
	      type[i] = noop$2, type = type.slice(0, i).concat(type.slice(i + 1));
	      break;
	    }
	  }
	  if (callback != null) type.push({name: name, value: callback});
	  return type;
	}

	var xhtml = "http://www.w3.org/1999/xhtml";

	var namespaces$2 = {
	  svg: "http://www.w3.org/2000/svg",
	  xhtml: xhtml,
	  xlink: "http://www.w3.org/1999/xlink",
	  xml: "http://www.w3.org/XML/1998/namespace",
	  xmlns: "http://www.w3.org/2000/xmlns/"
	};

	function namespace(name) {
	  var prefix = name += "", i = prefix.indexOf(":");
	  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
	  return namespaces$2.hasOwnProperty(prefix) ? {space: namespaces$2[prefix], local: name} : name;
	}

	function creatorInherit(name) {
	  return function() {
	    var document = this.ownerDocument,
	        uri = this.namespaceURI;
	    return uri === xhtml && document.documentElement.namespaceURI === xhtml
	        ? document.createElement(name)
	        : document.createElementNS(uri, name);
	  };
	}

	function creatorFixed(fullname) {
	  return function() {
	    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
	  };
	}

	function creator(name) {
	  var fullname = namespace(name);
	  return (fullname.local
	      ? creatorFixed
	      : creatorInherit)(fullname);
	}

	function none() {}

	function selector(selector) {
	  return selector == null ? none : function() {
	    return this.querySelector(selector);
	  };
	}

	function selection_select(select) {
	  if (typeof select !== "function") select = selector(select);

	  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
	      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
	        if ("__data__" in node) subnode.__data__ = node.__data__;
	        subgroup[i] = subnode;
	      }
	    }
	  }

	  return new Selection(subgroups, this._parents);
	}

	function empty() {
	  return [];
	}

	function selectorAll(selector) {
	  return selector == null ? empty : function() {
	    return this.querySelectorAll(selector);
	  };
	}

	function selection_selectAll(select) {
	  if (typeof select !== "function") select = selectorAll(select);

	  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        subgroups.push(select.call(node, node.__data__, i, group));
	        parents.push(node);
	      }
	    }
	  }

	  return new Selection(subgroups, parents);
	}

	var matcher = function(selector) {
	  return function() {
	    return this.matches(selector);
	  };
	};

	if (typeof document !== "undefined") {
	  var element = document.documentElement;
	  if (!element.matches) {
	    var vendorMatches = element.webkitMatchesSelector
	        || element.msMatchesSelector
	        || element.mozMatchesSelector
	        || element.oMatchesSelector;
	    matcher = function(selector) {
	      return function() {
	        return vendorMatches.call(this, selector);
	      };
	    };
	  }
	}

	var matcher$1 = matcher;

	function selection_filter(match) {
	  if (typeof match !== "function") match = matcher$1(match);

	  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
	      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
	        subgroup.push(node);
	      }
	    }
	  }

	  return new Selection(subgroups, this._parents);
	}

	function sparse(update) {
	  return new Array(update.length);
	}

	function selection_enter() {
	  return new Selection(this._enter || this._groups.map(sparse), this._parents);
	}

	function EnterNode(parent, datum) {
	  this.ownerDocument = parent.ownerDocument;
	  this.namespaceURI = parent.namespaceURI;
	  this._next = null;
	  this._parent = parent;
	  this.__data__ = datum;
	}

	EnterNode.prototype = {
	  constructor: EnterNode,
	  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
	  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
	  querySelector: function(selector) { return this._parent.querySelector(selector); },
	  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
	};

	function constant$1(x) {
	  return function() {
	    return x;
	  };
	}

	var keyPrefix = "$"; // Protect against keys like “__proto__”.

	function bindIndex(parent, group, enter, update, exit, data) {
	  var i = 0,
	      node,
	      groupLength = group.length,
	      dataLength = data.length;

	  // Put any non-null nodes that fit into update.
	  // Put any null nodes into enter.
	  // Put any remaining data into enter.
	  for (; i < dataLength; ++i) {
	    if (node = group[i]) {
	      node.__data__ = data[i];
	      update[i] = node;
	    } else {
	      enter[i] = new EnterNode(parent, data[i]);
	    }
	  }

	  // Put any non-null nodes that don’t fit into exit.
	  for (; i < groupLength; ++i) {
	    if (node = group[i]) {
	      exit[i] = node;
	    }
	  }
	}

	function bindKey(parent, group, enter, update, exit, data, key) {
	  var i,
	      node,
	      nodeByKeyValue = {},
	      groupLength = group.length,
	      dataLength = data.length,
	      keyValues = new Array(groupLength),
	      keyValue;

	  // Compute the key for each node.
	  // If multiple nodes have the same key, the duplicates are added to exit.
	  for (i = 0; i < groupLength; ++i) {
	    if (node = group[i]) {
	      keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
	      if (keyValue in nodeByKeyValue) {
	        exit[i] = node;
	      } else {
	        nodeByKeyValue[keyValue] = node;
	      }
	    }
	  }

	  // Compute the key for each datum.
	  // If there a node associated with this key, join and add it to update.
	  // If there is not (or the key is a duplicate), add it to enter.
	  for (i = 0; i < dataLength; ++i) {
	    keyValue = keyPrefix + key.call(parent, data[i], i, data);
	    if (node = nodeByKeyValue[keyValue]) {
	      update[i] = node;
	      node.__data__ = data[i];
	      nodeByKeyValue[keyValue] = null;
	    } else {
	      enter[i] = new EnterNode(parent, data[i]);
	    }
	  }

	  // Add any remaining nodes that were not bound to data to exit.
	  for (i = 0; i < groupLength; ++i) {
	    if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
	      exit[i] = node;
	    }
	  }
	}

	function selection_data(value, key) {
	  if (!value) {
	    data = new Array(this.size()), j = -1;
	    this.each(function(d) { data[++j] = d; });
	    return data;
	  }

	  var bind = key ? bindKey : bindIndex,
	      parents = this._parents,
	      groups = this._groups;

	  if (typeof value !== "function") value = constant$1(value);

	  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
	    var parent = parents[j],
	        group = groups[j],
	        groupLength = group.length,
	        data = value.call(parent, parent && parent.__data__, j, parents),
	        dataLength = data.length,
	        enterGroup = enter[j] = new Array(dataLength),
	        updateGroup = update[j] = new Array(dataLength),
	        exitGroup = exit[j] = new Array(groupLength);

	    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

	    // Now connect the enter nodes to their following update node, such that
	    // appendChild can insert the materialized enter node before this node,
	    // rather than at the end of the parent node.
	    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
	      if (previous = enterGroup[i0]) {
	        if (i0 >= i1) i1 = i0 + 1;
	        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
	        previous._next = next || null;
	      }
	    }
	  }

	  update = new Selection(update, parents);
	  update._enter = enter;
	  update._exit = exit;
	  return update;
	}

	function selection_exit() {
	  return new Selection(this._exit || this._groups.map(sparse), this._parents);
	}

	function selection_merge(selection$$1) {

	  for (var groups0 = this._groups, groups1 = selection$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
	    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
	      if (node = group0[i] || group1[i]) {
	        merge[i] = node;
	      }
	    }
	  }

	  for (; j < m0; ++j) {
	    merges[j] = groups0[j];
	  }

	  return new Selection(merges, this._parents);
	}

	function selection_order() {

	  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
	    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
	      if (node = group[i]) {
	        if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
	        next = node;
	      }
	    }
	  }

	  return this;
	}

	function selection_sort(compare) {
	  if (!compare) compare = ascending$1;

	  function compareNode(a, b) {
	    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
	  }

	  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        sortgroup[i] = node;
	      }
	    }
	    sortgroup.sort(compareNode);
	  }

	  return new Selection(sortgroups, this._parents).order();
	}

	function ascending$1(a, b) {
	  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

	function selection_call() {
	  var callback = arguments[0];
	  arguments[0] = this;
	  callback.apply(null, arguments);
	  return this;
	}

	function selection_nodes() {
	  var nodes = new Array(this.size()), i = -1;
	  this.each(function() { nodes[++i] = this; });
	  return nodes;
	}

	function selection_node() {

	  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
	    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
	      var node = group[i];
	      if (node) return node;
	    }
	  }

	  return null;
	}

	function selection_size() {
	  var size = 0;
	  this.each(function() { ++size; });
	  return size;
	}

	function selection_empty() {
	  return !this.node();
	}

	function selection_each(callback) {

	  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
	    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
	      if (node = group[i]) callback.call(node, node.__data__, i, group);
	    }
	  }

	  return this;
	}

	function attrRemove(name) {
	  return function() {
	    this.removeAttribute(name);
	  };
	}

	function attrRemoveNS(fullname) {
	  return function() {
	    this.removeAttributeNS(fullname.space, fullname.local);
	  };
	}

	function attrConstant(name, value) {
	  return function() {
	    this.setAttribute(name, value);
	  };
	}

	function attrConstantNS(fullname, value) {
	  return function() {
	    this.setAttributeNS(fullname.space, fullname.local, value);
	  };
	}

	function attrFunction(name, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.removeAttribute(name);
	    else this.setAttribute(name, v);
	  };
	}

	function attrFunctionNS(fullname, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
	    else this.setAttributeNS(fullname.space, fullname.local, v);
	  };
	}

	function selection_attr(name, value) {
	  var fullname = namespace(name);

	  if (arguments.length < 2) {
	    var node = this.node();
	    return fullname.local
	        ? node.getAttributeNS(fullname.space, fullname.local)
	        : node.getAttribute(fullname);
	  }

	  return this.each((value == null
	      ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
	      ? (fullname.local ? attrFunctionNS : attrFunction)
	      : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
	}

	function defaultView(node) {
	  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
	      || (node.document && node) // node is a Window
	      || node.defaultView; // node is a Document
	}

	function styleRemove(name) {
	  return function() {
	    this.style.removeProperty(name);
	  };
	}

	function styleConstant(name, value, priority) {
	  return function() {
	    this.style.setProperty(name, value, priority);
	  };
	}

	function styleFunction(name, value, priority) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.style.removeProperty(name);
	    else this.style.setProperty(name, v, priority);
	  };
	}

	function selection_style(name, value, priority) {
	  return arguments.length > 1
	      ? this.each((value == null
	            ? styleRemove : typeof value === "function"
	            ? styleFunction
	            : styleConstant)(name, value, priority == null ? "" : priority))
	      : styleValue(this.node(), name);
	}

	function styleValue(node, name) {
	  return node.style.getPropertyValue(name)
	      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
	}

	function propertyRemove(name) {
	  return function() {
	    delete this[name];
	  };
	}

	function propertyConstant(name, value) {
	  return function() {
	    this[name] = value;
	  };
	}

	function propertyFunction(name, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) delete this[name];
	    else this[name] = v;
	  };
	}

	function selection_property(name, value) {
	  return arguments.length > 1
	      ? this.each((value == null
	          ? propertyRemove : typeof value === "function"
	          ? propertyFunction
	          : propertyConstant)(name, value))
	      : this.node()[name];
	}

	function classArray(string) {
	  return string.trim().split(/^|\s+/);
	}

	function classList(node) {
	  return node.classList || new ClassList(node);
	}

	function ClassList(node) {
	  this._node = node;
	  this._names = classArray(node.getAttribute("class") || "");
	}

	ClassList.prototype = {
	  add: function(name) {
	    var i = this._names.indexOf(name);
	    if (i < 0) {
	      this._names.push(name);
	      this._node.setAttribute("class", this._names.join(" "));
	    }
	  },
	  remove: function(name) {
	    var i = this._names.indexOf(name);
	    if (i >= 0) {
	      this._names.splice(i, 1);
	      this._node.setAttribute("class", this._names.join(" "));
	    }
	  },
	  contains: function(name) {
	    return this._names.indexOf(name) >= 0;
	  }
	};

	function classedAdd(node, names) {
	  var list = classList(node), i = -1, n = names.length;
	  while (++i < n) list.add(names[i]);
	}

	function classedRemove(node, names) {
	  var list = classList(node), i = -1, n = names.length;
	  while (++i < n) list.remove(names[i]);
	}

	function classedTrue(names) {
	  return function() {
	    classedAdd(this, names);
	  };
	}

	function classedFalse(names) {
	  return function() {
	    classedRemove(this, names);
	  };
	}

	function classedFunction(names, value) {
	  return function() {
	    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
	  };
	}

	function selection_classed(name, value) {
	  var names = classArray(name + "");

	  if (arguments.length < 2) {
	    var list = classList(this.node()), i = -1, n = names.length;
	    while (++i < n) if (!list.contains(names[i])) return false;
	    return true;
	  }

	  return this.each((typeof value === "function"
	      ? classedFunction : value
	      ? classedTrue
	      : classedFalse)(names, value));
	}

	function textRemove() {
	  this.textContent = "";
	}

	function textConstant(value) {
	  return function() {
	    this.textContent = value;
	  };
	}

	function textFunction(value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    this.textContent = v == null ? "" : v;
	  };
	}

	function selection_text(value) {
	  return arguments.length
	      ? this.each(value == null
	          ? textRemove : (typeof value === "function"
	          ? textFunction
	          : textConstant)(value))
	      : this.node().textContent;
	}

	function htmlRemove() {
	  this.innerHTML = "";
	}

	function htmlConstant(value) {
	  return function() {
	    this.innerHTML = value;
	  };
	}

	function htmlFunction(value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    this.innerHTML = v == null ? "" : v;
	  };
	}

	function selection_html(value) {
	  return arguments.length
	      ? this.each(value == null
	          ? htmlRemove : (typeof value === "function"
	          ? htmlFunction
	          : htmlConstant)(value))
	      : this.node().innerHTML;
	}

	function raise() {
	  if (this.nextSibling) this.parentNode.appendChild(this);
	}

	function selection_raise() {
	  return this.each(raise);
	}

	function lower() {
	  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
	}

	function selection_lower() {
	  return this.each(lower);
	}

	function selection_append(name) {
	  var create = typeof name === "function" ? name : creator(name);
	  return this.select(function() {
	    return this.appendChild(create.apply(this, arguments));
	  });
	}

	function constantNull() {
	  return null;
	}

	function selection_insert(name, before) {
	  var create = typeof name === "function" ? name : creator(name),
	      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
	  return this.select(function() {
	    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
	  });
	}

	function remove() {
	  var parent = this.parentNode;
	  if (parent) parent.removeChild(this);
	}

	function selection_remove() {
	  return this.each(remove);
	}

	function selection_cloneShallow() {
	  return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
	}

	function selection_cloneDeep() {
	  return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
	}

	function selection_clone(deep) {
	  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
	}

	function selection_datum(value) {
	  return arguments.length
	      ? this.property("__data__", value)
	      : this.node().__data__;
	}

	var filterEvents = {};

	var event = null;

	if (typeof document !== "undefined") {
	  var element$1 = document.documentElement;
	  if (!("onmouseenter" in element$1)) {
	    filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
	  }
	}

	function filterContextListener(listener, index, group) {
	  listener = contextListener(listener, index, group);
	  return function(event) {
	    var related = event.relatedTarget;
	    if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
	      listener.call(this, event);
	    }
	  };
	}

	function contextListener(listener, index, group) {
	  return function(event1) {
	    var event0 = event; // Events can be reentrant (e.g., focus).
	    event = event1;
	    try {
	      listener.call(this, this.__data__, index, group);
	    } finally {
	      event = event0;
	    }
	  };
	}

	function parseTypenames$1(typenames) {
	  return typenames.trim().split(/^|\s+/).map(function(t) {
	    var name = "", i = t.indexOf(".");
	    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
	    return {type: t, name: name};
	  });
	}

	function onRemove(typename) {
	  return function() {
	    var on = this.__on;
	    if (!on) return;
	    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
	      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
	        this.removeEventListener(o.type, o.listener, o.capture);
	      } else {
	        on[++i] = o;
	      }
	    }
	    if (++i) on.length = i;
	    else delete this.__on;
	  };
	}

	function onAdd(typename, value, capture) {
	  var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
	  return function(d, i, group) {
	    var on = this.__on, o, listener = wrap(value, i, group);
	    if (on) for (var j = 0, m = on.length; j < m; ++j) {
	      if ((o = on[j]).type === typename.type && o.name === typename.name) {
	        this.removeEventListener(o.type, o.listener, o.capture);
	        this.addEventListener(o.type, o.listener = listener, o.capture = capture);
	        o.value = value;
	        return;
	      }
	    }
	    this.addEventListener(typename.type, listener, capture);
	    o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
	    if (!on) this.__on = [o];
	    else on.push(o);
	  };
	}

	function selection_on(typename, value, capture) {
	  var typenames = parseTypenames$1(typename + ""), i, n = typenames.length, t;

	  if (arguments.length < 2) {
	    var on = this.node().__on;
	    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
	      for (i = 0, o = on[j]; i < n; ++i) {
	        if ((t = typenames[i]).type === o.type && t.name === o.name) {
	          return o.value;
	        }
	      }
	    }
	    return;
	  }

	  on = value ? onAdd : onRemove;
	  if (capture == null) capture = false;
	  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
	  return this;
	}

	function customEvent(event1, listener, that, args) {
	  var event0 = event;
	  event1.sourceEvent = event;
	  event = event1;
	  try {
	    return listener.apply(that, args);
	  } finally {
	    event = event0;
	  }
	}

	function dispatchEvent(node, type, params) {
	  var window = defaultView(node),
	      event = window.CustomEvent;

	  if (typeof event === "function") {
	    event = new event(type, params);
	  } else {
	    event = window.document.createEvent("Event");
	    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
	    else event.initEvent(type, false, false);
	  }

	  node.dispatchEvent(event);
	}

	function dispatchConstant(type, params) {
	  return function() {
	    return dispatchEvent(this, type, params);
	  };
	}

	function dispatchFunction(type, params) {
	  return function() {
	    return dispatchEvent(this, type, params.apply(this, arguments));
	  };
	}

	function selection_dispatch(type, params) {
	  return this.each((typeof params === "function"
	      ? dispatchFunction
	      : dispatchConstant)(type, params));
	}

	var root = [null];

	function Selection(groups, parents) {
	  this._groups = groups;
	  this._parents = parents;
	}

	function selection() {
	  return new Selection([[document.documentElement]], root);
	}

	Selection.prototype = selection.prototype = {
	  constructor: Selection,
	  select: selection_select,
	  selectAll: selection_selectAll,
	  filter: selection_filter,
	  data: selection_data,
	  enter: selection_enter,
	  exit: selection_exit,
	  merge: selection_merge,
	  order: selection_order,
	  sort: selection_sort,
	  call: selection_call,
	  nodes: selection_nodes,
	  node: selection_node,
	  size: selection_size,
	  empty: selection_empty,
	  each: selection_each,
	  attr: selection_attr,
	  style: selection_style,
	  property: selection_property,
	  classed: selection_classed,
	  text: selection_text,
	  html: selection_html,
	  raise: selection_raise,
	  lower: selection_lower,
	  append: selection_append,
	  insert: selection_insert,
	  remove: selection_remove,
	  clone: selection_clone,
	  datum: selection_datum,
	  on: selection_on,
	  dispatch: selection_dispatch
	};

	function select(selector) {
	  return typeof selector === "string"
	      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
	      : new Selection([[selector]], root);
	}

	function sourceEvent() {
	  var current = event, source;
	  while (source = current.sourceEvent) current = source;
	  return current;
	}

	function point(node, event) {
	  var svg = node.ownerSVGElement || node;

	  if (svg.createSVGPoint) {
	    var point = svg.createSVGPoint();
	    point.x = event.clientX, point.y = event.clientY;
	    point = point.matrixTransform(node.getScreenCTM().inverse());
	    return [point.x, point.y];
	  }

	  var rect = node.getBoundingClientRect();
	  return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
	}

	function mouse(node) {
	  var event = sourceEvent();
	  if (event.changedTouches) event = event.changedTouches[0];
	  return point(node, event);
	}

	function touch(node, touches, identifier) {
	  if (arguments.length < 3) identifier = touches, touches = sourceEvent().changedTouches;

	  for (var i = 0, n = touches ? touches.length : 0, touch; i < n; ++i) {
	    if ((touch = touches[i]).identifier === identifier) {
	      return point(node, touch);
	    }
	  }

	  return null;
	}

	function noevent() {
	  event.preventDefault();
	  event.stopImmediatePropagation();
	}

	function nodrag(view) {
	  var root = view.document.documentElement,
	      selection$$1 = select(view).on("dragstart.drag", noevent, true);
	  if ("onselectstart" in root) {
	    selection$$1.on("selectstart.drag", noevent, true);
	  } else {
	    root.__noselect = root.style.MozUserSelect;
	    root.style.MozUserSelect = "none";
	  }
	}

	function yesdrag(view, noclick) {
	  var root = view.document.documentElement,
	      selection$$1 = select(view).on("dragstart.drag", null);
	  if (noclick) {
	    selection$$1.on("click.drag", noevent, true);
	    setTimeout(function() { selection$$1.on("click.drag", null); }, 0);
	  }
	  if ("onselectstart" in root) {
	    selection$$1.on("selectstart.drag", null);
	  } else {
	    root.style.MozUserSelect = root.__noselect;
	    delete root.__noselect;
	  }
	}

	function define(constructor, factory, prototype) {
	  constructor.prototype = factory.prototype = prototype;
	  prototype.constructor = constructor;
	}

	function extend(parent, definition) {
	  var prototype = Object.create(parent.prototype);
	  for (var key in definition) prototype[key] = definition[key];
	  return prototype;
	}

	function Color() {}

	var darker = 0.7;
	var brighter = 1 / darker;

	var reI = "\\s*([+-]?\\d+)\\s*",
	    reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
	    reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
	    reHex3 = /^#([0-9a-f]{3})$/,
	    reHex6 = /^#([0-9a-f]{6})$/,
	    reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
	    reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
	    reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
	    reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
	    reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
	    reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

	var named = {
	  aliceblue: 0xf0f8ff,
	  antiquewhite: 0xfaebd7,
	  aqua: 0x00ffff,
	  aquamarine: 0x7fffd4,
	  azure: 0xf0ffff,
	  beige: 0xf5f5dc,
	  bisque: 0xffe4c4,
	  black: 0x000000,
	  blanchedalmond: 0xffebcd,
	  blue: 0x0000ff,
	  blueviolet: 0x8a2be2,
	  brown: 0xa52a2a,
	  burlywood: 0xdeb887,
	  cadetblue: 0x5f9ea0,
	  chartreuse: 0x7fff00,
	  chocolate: 0xd2691e,
	  coral: 0xff7f50,
	  cornflowerblue: 0x6495ed,
	  cornsilk: 0xfff8dc,
	  crimson: 0xdc143c,
	  cyan: 0x00ffff,
	  darkblue: 0x00008b,
	  darkcyan: 0x008b8b,
	  darkgoldenrod: 0xb8860b,
	  darkgray: 0xa9a9a9,
	  darkgreen: 0x006400,
	  darkgrey: 0xa9a9a9,
	  darkkhaki: 0xbdb76b,
	  darkmagenta: 0x8b008b,
	  darkolivegreen: 0x556b2f,
	  darkorange: 0xff8c00,
	  darkorchid: 0x9932cc,
	  darkred: 0x8b0000,
	  darksalmon: 0xe9967a,
	  darkseagreen: 0x8fbc8f,
	  darkslateblue: 0x483d8b,
	  darkslategray: 0x2f4f4f,
	  darkslategrey: 0x2f4f4f,
	  darkturquoise: 0x00ced1,
	  darkviolet: 0x9400d3,
	  deeppink: 0xff1493,
	  deepskyblue: 0x00bfff,
	  dimgray: 0x696969,
	  dimgrey: 0x696969,
	  dodgerblue: 0x1e90ff,
	  firebrick: 0xb22222,
	  floralwhite: 0xfffaf0,
	  forestgreen: 0x228b22,
	  fuchsia: 0xff00ff,
	  gainsboro: 0xdcdcdc,
	  ghostwhite: 0xf8f8ff,
	  gold: 0xffd700,
	  goldenrod: 0xdaa520,
	  gray: 0x808080,
	  green: 0x008000,
	  greenyellow: 0xadff2f,
	  grey: 0x808080,
	  honeydew: 0xf0fff0,
	  hotpink: 0xff69b4,
	  indianred: 0xcd5c5c,
	  indigo: 0x4b0082,
	  ivory: 0xfffff0,
	  khaki: 0xf0e68c,
	  lavender: 0xe6e6fa,
	  lavenderblush: 0xfff0f5,
	  lawngreen: 0x7cfc00,
	  lemonchiffon: 0xfffacd,
	  lightblue: 0xadd8e6,
	  lightcoral: 0xf08080,
	  lightcyan: 0xe0ffff,
	  lightgoldenrodyellow: 0xfafad2,
	  lightgray: 0xd3d3d3,
	  lightgreen: 0x90ee90,
	  lightgrey: 0xd3d3d3,
	  lightpink: 0xffb6c1,
	  lightsalmon: 0xffa07a,
	  lightseagreen: 0x20b2aa,
	  lightskyblue: 0x87cefa,
	  lightslategray: 0x778899,
	  lightslategrey: 0x778899,
	  lightsteelblue: 0xb0c4de,
	  lightyellow: 0xffffe0,
	  lime: 0x00ff00,
	  limegreen: 0x32cd32,
	  linen: 0xfaf0e6,
	  magenta: 0xff00ff,
	  maroon: 0x800000,
	  mediumaquamarine: 0x66cdaa,
	  mediumblue: 0x0000cd,
	  mediumorchid: 0xba55d3,
	  mediumpurple: 0x9370db,
	  mediumseagreen: 0x3cb371,
	  mediumslateblue: 0x7b68ee,
	  mediumspringgreen: 0x00fa9a,
	  mediumturquoise: 0x48d1cc,
	  mediumvioletred: 0xc71585,
	  midnightblue: 0x191970,
	  mintcream: 0xf5fffa,
	  mistyrose: 0xffe4e1,
	  moccasin: 0xffe4b5,
	  navajowhite: 0xffdead,
	  navy: 0x000080,
	  oldlace: 0xfdf5e6,
	  olive: 0x808000,
	  olivedrab: 0x6b8e23,
	  orange: 0xffa500,
	  orangered: 0xff4500,
	  orchid: 0xda70d6,
	  palegoldenrod: 0xeee8aa,
	  palegreen: 0x98fb98,
	  paleturquoise: 0xafeeee,
	  palevioletred: 0xdb7093,
	  papayawhip: 0xffefd5,
	  peachpuff: 0xffdab9,
	  peru: 0xcd853f,
	  pink: 0xffc0cb,
	  plum: 0xdda0dd,
	  powderblue: 0xb0e0e6,
	  purple: 0x800080,
	  rebeccapurple: 0x663399,
	  red: 0xff0000,
	  rosybrown: 0xbc8f8f,
	  royalblue: 0x4169e1,
	  saddlebrown: 0x8b4513,
	  salmon: 0xfa8072,
	  sandybrown: 0xf4a460,
	  seagreen: 0x2e8b57,
	  seashell: 0xfff5ee,
	  sienna: 0xa0522d,
	  silver: 0xc0c0c0,
	  skyblue: 0x87ceeb,
	  slateblue: 0x6a5acd,
	  slategray: 0x708090,
	  slategrey: 0x708090,
	  snow: 0xfffafa,
	  springgreen: 0x00ff7f,
	  steelblue: 0x4682b4,
	  tan: 0xd2b48c,
	  teal: 0x008080,
	  thistle: 0xd8bfd8,
	  tomato: 0xff6347,
	  turquoise: 0x40e0d0,
	  violet: 0xee82ee,
	  wheat: 0xf5deb3,
	  white: 0xffffff,
	  whitesmoke: 0xf5f5f5,
	  yellow: 0xffff00,
	  yellowgreen: 0x9acd32
	};

	define(Color, color, {
	  displayable: function() {
	    return this.rgb().displayable();
	  },
	  hex: function() {
	    return this.rgb().hex();
	  },
	  toString: function() {
	    return this.rgb() + "";
	  }
	});

	function color(format) {
	  var m;
	  format = (format + "").trim().toLowerCase();
	  return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1)) // #f00
	      : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
	      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
	      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
	      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
	      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
	      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
	      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
	      : named.hasOwnProperty(format) ? rgbn(named[format])
	      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
	      : null;
	}

	function rgbn(n) {
	  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
	}

	function rgba(r, g, b, a) {
	  if (a <= 0) r = g = b = NaN;
	  return new Rgb(r, g, b, a);
	}

	function rgbConvert(o) {
	  if (!(o instanceof Color)) o = color(o);
	  if (!o) return new Rgb;
	  o = o.rgb();
	  return new Rgb(o.r, o.g, o.b, o.opacity);
	}

	function rgb(r, g, b, opacity) {
	  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
	}

	function Rgb(r, g, b, opacity) {
	  this.r = +r;
	  this.g = +g;
	  this.b = +b;
	  this.opacity = +opacity;
	}

	define(Rgb, rgb, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
	  },
	  rgb: function() {
	    return this;
	  },
	  displayable: function() {
	    return (0 <= this.r && this.r <= 255)
	        && (0 <= this.g && this.g <= 255)
	        && (0 <= this.b && this.b <= 255)
	        && (0 <= this.opacity && this.opacity <= 1);
	  },
	  hex: function() {
	    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
	  },
	  toString: function() {
	    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
	    return (a === 1 ? "rgb(" : "rgba(")
	        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
	        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
	        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
	        + (a === 1 ? ")" : ", " + a + ")");
	  }
	}));

	function hex(value) {
	  value = Math.max(0, Math.min(255, Math.round(value) || 0));
	  return (value < 16 ? "0" : "") + value.toString(16);
	}

	function hsla(h, s, l, a) {
	  if (a <= 0) h = s = l = NaN;
	  else if (l <= 0 || l >= 1) h = s = NaN;
	  else if (s <= 0) h = NaN;
	  return new Hsl(h, s, l, a);
	}

	function hslConvert(o) {
	  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
	  if (!(o instanceof Color)) o = color(o);
	  if (!o) return new Hsl;
	  if (o instanceof Hsl) return o;
	  o = o.rgb();
	  var r = o.r / 255,
	      g = o.g / 255,
	      b = o.b / 255,
	      min = Math.min(r, g, b),
	      max = Math.max(r, g, b),
	      h = NaN,
	      s = max - min,
	      l = (max + min) / 2;
	  if (s) {
	    if (r === max) h = (g - b) / s + (g < b) * 6;
	    else if (g === max) h = (b - r) / s + 2;
	    else h = (r - g) / s + 4;
	    s /= l < 0.5 ? max + min : 2 - max - min;
	    h *= 60;
	  } else {
	    s = l > 0 && l < 1 ? 0 : h;
	  }
	  return new Hsl(h, s, l, o.opacity);
	}

	function hsl(h, s, l, opacity) {
	  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
	}

	function Hsl(h, s, l, opacity) {
	  this.h = +h;
	  this.s = +s;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Hsl, hsl, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Hsl(this.h, this.s, this.l * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Hsl(this.h, this.s, this.l * k, this.opacity);
	  },
	  rgb: function() {
	    var h = this.h % 360 + (this.h < 0) * 360,
	        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
	        l = this.l,
	        m2 = l + (l < 0.5 ? l : 1 - l) * s,
	        m1 = 2 * l - m2;
	    return new Rgb(
	      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
	      hsl2rgb(h, m1, m2),
	      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
	      this.opacity
	    );
	  },
	  displayable: function() {
	    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
	        && (0 <= this.l && this.l <= 1)
	        && (0 <= this.opacity && this.opacity <= 1);
	  }
	}));

	/* From FvD 13.37, CSS Color Module Level 3 */
	function hsl2rgb(h, m1, m2) {
	  return (h < 60 ? m1 + (m2 - m1) * h / 60
	      : h < 180 ? m2
	      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
	      : m1) * 255;
	}

	var deg2rad = Math.PI / 180;
	var rad2deg = 180 / Math.PI;

	// https://beta.observablehq.com/@mbostock/lab-and-rgb
	var K = 18,
	    Xn = 0.96422,
	    Yn = 1,
	    Zn = 0.82521,
	    t0 = 4 / 29,
	    t1 = 6 / 29,
	    t2 = 3 * t1 * t1,
	    t3 = t1 * t1 * t1;

	function labConvert(o) {
	  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
	  if (o instanceof Hcl) {
	    if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
	    var h = o.h * deg2rad;
	    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
	  }
	  if (!(o instanceof Rgb)) o = rgbConvert(o);
	  var r = rgb2lrgb(o.r),
	      g = rgb2lrgb(o.g),
	      b = rgb2lrgb(o.b),
	      y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
	  if (r === g && g === b) x = z = y; else {
	    x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
	    z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
	  }
	  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
	}

	function lab(l, a, b, opacity) {
	  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
	}

	function Lab(l, a, b, opacity) {
	  this.l = +l;
	  this.a = +a;
	  this.b = +b;
	  this.opacity = +opacity;
	}

	define(Lab, lab, extend(Color, {
	  brighter: function(k) {
	    return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
	  },
	  darker: function(k) {
	    return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
	  },
	  rgb: function() {
	    var y = (this.l + 16) / 116,
	        x = isNaN(this.a) ? y : y + this.a / 500,
	        z = isNaN(this.b) ? y : y - this.b / 200;
	    x = Xn * lab2xyz(x);
	    y = Yn * lab2xyz(y);
	    z = Zn * lab2xyz(z);
	    return new Rgb(
	      lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
	      lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
	      lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
	      this.opacity
	    );
	  }
	}));

	function xyz2lab(t) {
	  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
	}

	function lab2xyz(t) {
	  return t > t1 ? t * t * t : t2 * (t - t0);
	}

	function lrgb2rgb(x) {
	  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	}

	function rgb2lrgb(x) {
	  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	}

	function hclConvert(o) {
	  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
	  if (!(o instanceof Lab)) o = labConvert(o);
	  if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0, o.l, o.opacity);
	  var h = Math.atan2(o.b, o.a) * rad2deg;
	  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
	}

	function hcl(h, c, l, opacity) {
	  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
	}

	function Hcl(h, c, l, opacity) {
	  this.h = +h;
	  this.c = +c;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Hcl, hcl, extend(Color, {
	  brighter: function(k) {
	    return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
	  },
	  darker: function(k) {
	    return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
	  },
	  rgb: function() {
	    return labConvert(this).rgb();
	  }
	}));

	var A = -0.14861,
	    B = +1.78277,
	    C = -0.29227,
	    D = -0.90649,
	    E = +1.97294,
	    ED = E * D,
	    EB = E * B,
	    BC_DA = B * C - D * A;

	function cubehelixConvert(o) {
	  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
	  if (!(o instanceof Rgb)) o = rgbConvert(o);
	  var r = o.r / 255,
	      g = o.g / 255,
	      b = o.b / 255,
	      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
	      bl = b - l,
	      k = (E * (g - l) - C * bl) / D,
	      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
	      h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
	  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
	}

	function cubehelix(h, s, l, opacity) {
	  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
	}

	function Cubehelix(h, s, l, opacity) {
	  this.h = +h;
	  this.s = +s;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Cubehelix, cubehelix, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
	  },
	  rgb: function() {
	    var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
	        l = +this.l,
	        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
	        cosh = Math.cos(h),
	        sinh = Math.sin(h);
	    return new Rgb(
	      255 * (l + a * (A * cosh + B * sinh)),
	      255 * (l + a * (C * cosh + D * sinh)),
	      255 * (l + a * (E * cosh)),
	      this.opacity
	    );
	  }
	}));

	function constant$3(x) {
	  return function() {
	    return x;
	  };
	}

	function linear$1(a, d) {
	  return function(t) {
	    return a + t * d;
	  };
	}

	function exponential(a, b, y) {
	  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
	    return Math.pow(a + t * b, y);
	  };
	}

	function gamma(y) {
	  return (y = +y) === 1 ? nogamma : function(a, b) {
	    return b - a ? exponential(a, b, y) : constant$3(isNaN(a) ? b : a);
	  };
	}

	function nogamma(a, b) {
	  var d = b - a;
	  return d ? linear$1(a, d) : constant$3(isNaN(a) ? b : a);
	}

	var interpolateRgb = (function rgbGamma(y) {
	  var color$$1 = gamma(y);

	  function rgb$$1(start, end) {
	    var r = color$$1((start = rgb(start)).r, (end = rgb(end)).r),
	        g = color$$1(start.g, end.g),
	        b = color$$1(start.b, end.b),
	        opacity = nogamma(start.opacity, end.opacity);
	    return function(t) {
	      start.r = r(t);
	      start.g = g(t);
	      start.b = b(t);
	      start.opacity = opacity(t);
	      return start + "";
	    };
	  }

	  rgb$$1.gamma = rgbGamma;

	  return rgb$$1;
	})(1);

	function interpolateNumber(a, b) {
	  return a = +a, b -= a, function(t) {
	    return a + b * t;
	  };
	}

	var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
	    reB = new RegExp(reA.source, "g");

	function zero(b) {
	  return function() {
	    return b;
	  };
	}

	function one(b) {
	  return function(t) {
	    return b(t) + "";
	  };
	}

	function interpolateString(a, b) {
	  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
	      am, // current match in a
	      bm, // current match in b
	      bs, // string preceding current number in b, if any
	      i = -1, // index in s
	      s = [], // string constants and placeholders
	      q = []; // number interpolators

	  // Coerce inputs to strings.
	  a = a + "", b = b + "";

	  // Interpolate pairs of numbers in a & b.
	  while ((am = reA.exec(a))
	      && (bm = reB.exec(b))) {
	    if ((bs = bm.index) > bi) { // a string precedes the next number in b
	      bs = b.slice(bi, bs);
	      if (s[i]) s[i] += bs; // coalesce with previous string
	      else s[++i] = bs;
	    }
	    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
	      if (s[i]) s[i] += bm; // coalesce with previous string
	      else s[++i] = bm;
	    } else { // interpolate non-matching numbers
	      s[++i] = null;
	      q.push({i: i, x: interpolateNumber(am, bm)});
	    }
	    bi = reB.lastIndex;
	  }

	  // Add remains of b.
	  if (bi < b.length) {
	    bs = b.slice(bi);
	    if (s[i]) s[i] += bs; // coalesce with previous string
	    else s[++i] = bs;
	  }

	  // Special optimization for only a single match.
	  // Otherwise, interpolate each of the numbers and rejoin the string.
	  return s.length < 2 ? (q[0]
	      ? one(q[0].x)
	      : zero(b))
	      : (b = q.length, function(t) {
	          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
	          return s.join("");
	        });
	}

	var degrees = 180 / Math.PI;

	var identity$2 = {
	  translateX: 0,
	  translateY: 0,
	  rotate: 0,
	  skewX: 0,
	  scaleX: 1,
	  scaleY: 1
	};

	function decompose(a, b, c, d, e, f) {
	  var scaleX, scaleY, skewX;
	  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
	  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
	  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
	  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
	  return {
	    translateX: e,
	    translateY: f,
	    rotate: Math.atan2(b, a) * degrees,
	    skewX: Math.atan(skewX) * degrees,
	    scaleX: scaleX,
	    scaleY: scaleY
	  };
	}

	var cssNode,
	    cssRoot,
	    cssView,
	    svgNode;

	function parseCss(value) {
	  if (value === "none") return identity$2;
	  if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
	  cssNode.style.transform = value;
	  value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
	  cssRoot.removeChild(cssNode);
	  value = value.slice(7, -1).split(",");
	  return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
	}

	function parseSvg(value) {
	  if (value == null) return identity$2;
	  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
	  svgNode.setAttribute("transform", value);
	  if (!(value = svgNode.transform.baseVal.consolidate())) return identity$2;
	  value = value.matrix;
	  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
	}

	function interpolateTransform(parse, pxComma, pxParen, degParen) {

	  function pop(s) {
	    return s.length ? s.pop() + " " : "";
	  }

	  function translate(xa, ya, xb, yb, s, q) {
	    if (xa !== xb || ya !== yb) {
	      var i = s.push("translate(", null, pxComma, null, pxParen);
	      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
	    } else if (xb || yb) {
	      s.push("translate(" + xb + pxComma + yb + pxParen);
	    }
	  }

	  function rotate(a, b, s, q) {
	    if (a !== b) {
	      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
	      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
	    } else if (b) {
	      s.push(pop(s) + "rotate(" + b + degParen);
	    }
	  }

	  function skewX(a, b, s, q) {
	    if (a !== b) {
	      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
	    } else if (b) {
	      s.push(pop(s) + "skewX(" + b + degParen);
	    }
	  }

	  function scale(xa, ya, xb, yb, s, q) {
	    if (xa !== xb || ya !== yb) {
	      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
	      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
	    } else if (xb !== 1 || yb !== 1) {
	      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
	    }
	  }

	  return function(a, b) {
	    var s = [], // string constants and placeholders
	        q = []; // number interpolators
	    a = parse(a), b = parse(b);
	    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
	    rotate(a.rotate, b.rotate, s, q);
	    skewX(a.skewX, b.skewX, s, q);
	    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
	    a = b = null; // gc
	    return function(t) {
	      var i = -1, n = q.length, o;
	      while (++i < n) s[(o = q[i]).i] = o.x(t);
	      return s.join("");
	    };
	  };
	}

	var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
	var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

	var rho = Math.SQRT2,
	    rho2 = 2,
	    rho4 = 4,
	    epsilon2 = 1e-12;

	function cosh(x) {
	  return ((x = Math.exp(x)) + 1 / x) / 2;
	}

	function sinh(x) {
	  return ((x = Math.exp(x)) - 1 / x) / 2;
	}

	function tanh(x) {
	  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
	}

	// p0 = [ux0, uy0, w0]
	// p1 = [ux1, uy1, w1]
	function interpolateZoom(p0, p1) {
	  var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
	      ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
	      dx = ux1 - ux0,
	      dy = uy1 - uy0,
	      d2 = dx * dx + dy * dy,
	      i,
	      S;

	  // Special case for u0 ≅ u1.
	  if (d2 < epsilon2) {
	    S = Math.log(w1 / w0) / rho;
	    i = function(t) {
	      return [
	        ux0 + t * dx,
	        uy0 + t * dy,
	        w0 * Math.exp(rho * t * S)
	      ];
	    };
	  }

	  // General case.
	  else {
	    var d1 = Math.sqrt(d2),
	        b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
	        b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
	        r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
	        r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
	    S = (r1 - r0) / rho;
	    i = function(t) {
	      var s = t * S,
	          coshr0 = cosh(r0),
	          u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
	      return [
	        ux0 + u * dx,
	        uy0 + u * dy,
	        w0 * coshr0 / cosh(rho * s + r0)
	      ];
	    };
	  }

	  i.duration = S * 1000;

	  return i;
	}

	var frame = 0, // is an animation frame pending?
	    timeout = 0, // is a timeout pending?
	    interval = 0, // are any timers active?
	    pokeDelay = 1000, // how frequently we check for clock skew
	    taskHead,
	    taskTail,
	    clockLast = 0,
	    clockNow = 0,
	    clockSkew = 0,
	    clock = typeof performance === "object" && performance.now ? performance : Date,
	    setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

	function now() {
	  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
	}

	function clearNow() {
	  clockNow = 0;
	}

	function Timer() {
	  this._call =
	  this._time =
	  this._next = null;
	}

	Timer.prototype = timer.prototype = {
	  constructor: Timer,
	  restart: function(callback, delay, time) {
	    if (typeof callback !== "function") throw new TypeError("callback is not a function");
	    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
	    if (!this._next && taskTail !== this) {
	      if (taskTail) taskTail._next = this;
	      else taskHead = this;
	      taskTail = this;
	    }
	    this._call = callback;
	    this._time = time;
	    sleep();
	  },
	  stop: function() {
	    if (this._call) {
	      this._call = null;
	      this._time = Infinity;
	      sleep();
	    }
	  }
	};

	function timer(callback, delay, time) {
	  var t = new Timer;
	  t.restart(callback, delay, time);
	  return t;
	}

	function timerFlush() {
	  now(); // Get the current time, if not already set.
	  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
	  var t = taskHead, e;
	  while (t) {
	    if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
	    t = t._next;
	  }
	  --frame;
	}

	function wake() {
	  clockNow = (clockLast = clock.now()) + clockSkew;
	  frame = timeout = 0;
	  try {
	    timerFlush();
	  } finally {
	    frame = 0;
	    nap();
	    clockNow = 0;
	  }
	}

	function poke() {
	  var now = clock.now(), delay = now - clockLast;
	  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
	}

	function nap() {
	  var t0, t1 = taskHead, t2, time = Infinity;
	  while (t1) {
	    if (t1._call) {
	      if (time > t1._time) time = t1._time;
	      t0 = t1, t1 = t1._next;
	    } else {
	      t2 = t1._next, t1._next = null;
	      t1 = t0 ? t0._next = t2 : taskHead = t2;
	    }
	  }
	  taskTail = t0;
	  sleep(time);
	}

	function sleep(time) {
	  if (frame) return; // Soonest alarm already set, or will be.
	  if (timeout) timeout = clearTimeout(timeout);
	  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
	  if (delay > 24) {
	    if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
	    if (interval) interval = clearInterval(interval);
	  } else {
	    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
	    frame = 1, setFrame(wake);
	  }
	}

	function timeout$1(callback, delay, time) {
	  var t = new Timer;
	  delay = delay == null ? 0 : +delay;
	  t.restart(function(elapsed) {
	    t.stop();
	    callback(elapsed + delay);
	  }, delay, time);
	  return t;
	}

	var emptyOn = dispatch("start", "end", "interrupt");
	var emptyTween = [];

	var CREATED = 0;
	var SCHEDULED = 1;
	var STARTING = 2;
	var STARTED = 3;
	var RUNNING = 4;
	var ENDING = 5;
	var ENDED = 6;

	function schedule(node, name, id, index, group, timing) {
	  var schedules = node.__transition;
	  if (!schedules) node.__transition = {};
	  else if (id in schedules) return;
	  create$1(node, id, {
	    name: name,
	    index: index, // For context during callback.
	    group: group, // For context during callback.
	    on: emptyOn,
	    tween: emptyTween,
	    time: timing.time,
	    delay: timing.delay,
	    duration: timing.duration,
	    ease: timing.ease,
	    timer: null,
	    state: CREATED
	  });
	}

	function init$2(node, id) {
	  var schedule = get$3(node, id);
	  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
	  return schedule;
	}

	function set$3(node, id) {
	  var schedule = get$3(node, id);
	  if (schedule.state > STARTING) throw new Error("too late; already started");
	  return schedule;
	}

	function get$3(node, id) {
	  var schedule = node.__transition;
	  if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
	  return schedule;
	}

	function create$1(node, id, self) {
	  var schedules = node.__transition,
	      tween;

	  // Initialize the self timer when the transition is created.
	  // Note the actual delay is not known until the first callback!
	  schedules[id] = self;
	  self.timer = timer(schedule, 0, self.time);

	  function schedule(elapsed) {
	    self.state = SCHEDULED;
	    self.timer.restart(start, self.delay, self.time);

	    // If the elapsed delay is less than our first sleep, start immediately.
	    if (self.delay <= elapsed) start(elapsed - self.delay);
	  }

	  function start(elapsed) {
	    var i, j, n, o;

	    // If the state is not SCHEDULED, then we previously errored on start.
	    if (self.state !== SCHEDULED) return stop();

	    for (i in schedules) {
	      o = schedules[i];
	      if (o.name !== self.name) continue;

	      // While this element already has a starting transition during this frame,
	      // defer starting an interrupting transition until that transition has a
	      // chance to tick (and possibly end); see d3/d3-transition#54!
	      if (o.state === STARTED) return timeout$1(start);

	      // Interrupt the active transition, if any.
	      // Dispatch the interrupt event.
	      if (o.state === RUNNING) {
	        o.state = ENDED;
	        o.timer.stop();
	        o.on.call("interrupt", node, node.__data__, o.index, o.group);
	        delete schedules[i];
	      }

	      // Cancel any pre-empted transitions. No interrupt event is dispatched
	      // because the cancelled transitions never started. Note that this also
	      // removes this transition from the pending list!
	      else if (+i < id) {
	        o.state = ENDED;
	        o.timer.stop();
	        delete schedules[i];
	      }
	    }

	    // Defer the first tick to end of the current frame; see d3/d3#1576.
	    // Note the transition may be canceled after start and before the first tick!
	    // Note this must be scheduled before the start event; see d3/d3-transition#16!
	    // Assuming this is successful, subsequent callbacks go straight to tick.
	    timeout$1(function() {
	      if (self.state === STARTED) {
	        self.state = RUNNING;
	        self.timer.restart(tick, self.delay, self.time);
	        tick(elapsed);
	      }
	    });

	    // Dispatch the start event.
	    // Note this must be done before the tween are initialized.
	    self.state = STARTING;
	    self.on.call("start", node, node.__data__, self.index, self.group);
	    if (self.state !== STARTING) return; // interrupted
	    self.state = STARTED;

	    // Initialize the tween, deleting null tween.
	    tween = new Array(n = self.tween.length);
	    for (i = 0, j = -1; i < n; ++i) {
	      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
	        tween[++j] = o;
	      }
	    }
	    tween.length = j + 1;
	  }

	  function tick(elapsed) {
	    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
	        i = -1,
	        n = tween.length;

	    while (++i < n) {
	      tween[i].call(null, t);
	    }

	    // Dispatch the end event.
	    if (self.state === ENDING) {
	      self.on.call("end", node, node.__data__, self.index, self.group);
	      stop();
	    }
	  }

	  function stop() {
	    self.state = ENDED;
	    self.timer.stop();
	    delete schedules[id];
	    for (var i in schedules) return; // eslint-disable-line no-unused-vars
	    delete node.__transition;
	  }
	}

	function interrupt(node, name) {
	  var schedules = node.__transition,
	      schedule$$1,
	      active,
	      empty = true,
	      i;

	  if (!schedules) return;

	  name = name == null ? null : name + "";

	  for (i in schedules) {
	    if ((schedule$$1 = schedules[i]).name !== name) { empty = false; continue; }
	    active = schedule$$1.state > STARTING && schedule$$1.state < ENDING;
	    schedule$$1.state = ENDED;
	    schedule$$1.timer.stop();
	    if (active) schedule$$1.on.call("interrupt", node, node.__data__, schedule$$1.index, schedule$$1.group);
	    delete schedules[i];
	  }

	  if (empty) delete node.__transition;
	}

	function selection_interrupt(name) {
	  return this.each(function() {
	    interrupt(this, name);
	  });
	}

	function tweenRemove(id, name) {
	  var tween0, tween1;
	  return function() {
	    var schedule$$1 = set$3(this, id),
	        tween = schedule$$1.tween;

	    // If this node shared tween with the previous node,
	    // just assign the updated shared tween and we’re done!
	    // Otherwise, copy-on-write.
	    if (tween !== tween0) {
	      tween1 = tween0 = tween;
	      for (var i = 0, n = tween1.length; i < n; ++i) {
	        if (tween1[i].name === name) {
	          tween1 = tween1.slice();
	          tween1.splice(i, 1);
	          break;
	        }
	      }
	    }

	    schedule$$1.tween = tween1;
	  };
	}

	function tweenFunction(id, name, value) {
	  var tween0, tween1;
	  if (typeof value !== "function") throw new Error;
	  return function() {
	    var schedule$$1 = set$3(this, id),
	        tween = schedule$$1.tween;

	    // If this node shared tween with the previous node,
	    // just assign the updated shared tween and we’re done!
	    // Otherwise, copy-on-write.
	    if (tween !== tween0) {
	      tween1 = (tween0 = tween).slice();
	      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
	        if (tween1[i].name === name) {
	          tween1[i] = t;
	          break;
	        }
	      }
	      if (i === n) tween1.push(t);
	    }

	    schedule$$1.tween = tween1;
	  };
	}

	function transition_tween(name, value) {
	  var id = this._id;

	  name += "";

	  if (arguments.length < 2) {
	    var tween = get$3(this.node(), id).tween;
	    for (var i = 0, n = tween.length, t; i < n; ++i) {
	      if ((t = tween[i]).name === name) {
	        return t.value;
	      }
	    }
	    return null;
	  }

	  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
	}

	function tweenValue(transition, name, value) {
	  var id = transition._id;

	  transition.each(function() {
	    var schedule$$1 = set$3(this, id);
	    (schedule$$1.value || (schedule$$1.value = {}))[name] = value.apply(this, arguments);
	  });

	  return function(node) {
	    return get$3(node, id).value[name];
	  };
	}

	function interpolate(a, b) {
	  var c;
	  return (typeof b === "number" ? interpolateNumber
	      : b instanceof color ? interpolateRgb
	      : (c = color(b)) ? (b = c, interpolateRgb)
	      : interpolateString)(a, b);
	}

	function attrRemove$1(name) {
	  return function() {
	    this.removeAttribute(name);
	  };
	}

	function attrRemoveNS$1(fullname) {
	  return function() {
	    this.removeAttributeNS(fullname.space, fullname.local);
	  };
	}

	function attrConstant$1(name, interpolate$$1, value1) {
	  var value00,
	      interpolate0;
	  return function() {
	    var value0 = this.getAttribute(name);
	    return value0 === value1 ? null
	        : value0 === value00 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value1);
	  };
	}

	function attrConstantNS$1(fullname, interpolate$$1, value1) {
	  var value00,
	      interpolate0;
	  return function() {
	    var value0 = this.getAttributeNS(fullname.space, fullname.local);
	    return value0 === value1 ? null
	        : value0 === value00 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value1);
	  };
	}

	function attrFunction$1(name, interpolate$$1, value$$1) {
	  var value00,
	      value10,
	      interpolate0;
	  return function() {
	    var value0, value1 = value$$1(this);
	    if (value1 == null) return void this.removeAttribute(name);
	    value0 = this.getAttribute(name);
	    return value0 === value1 ? null
	        : value0 === value00 && value1 === value10 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
	  };
	}

	function attrFunctionNS$1(fullname, interpolate$$1, value$$1) {
	  var value00,
	      value10,
	      interpolate0;
	  return function() {
	    var value0, value1 = value$$1(this);
	    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
	    value0 = this.getAttributeNS(fullname.space, fullname.local);
	    return value0 === value1 ? null
	        : value0 === value00 && value1 === value10 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
	  };
	}

	function transition_attr(name, value$$1) {
	  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
	  return this.attrTween(name, typeof value$$1 === "function"
	      ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value$$1))
	      : value$$1 == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
	      : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value$$1 + ""));
	}

	function attrTweenNS(fullname, value) {
	  function tween() {
	    var node = this, i = value.apply(node, arguments);
	    return i && function(t) {
	      node.setAttributeNS(fullname.space, fullname.local, i(t));
	    };
	  }
	  tween._value = value;
	  return tween;
	}

	function attrTween(name, value) {
	  function tween() {
	    var node = this, i = value.apply(node, arguments);
	    return i && function(t) {
	      node.setAttribute(name, i(t));
	    };
	  }
	  tween._value = value;
	  return tween;
	}

	function transition_attrTween(name, value) {
	  var key = "attr." + name;
	  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
	  if (value == null) return this.tween(key, null);
	  if (typeof value !== "function") throw new Error;
	  var fullname = namespace(name);
	  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
	}

	function delayFunction(id, value) {
	  return function() {
	    init$2(this, id).delay = +value.apply(this, arguments);
	  };
	}

	function delayConstant(id, value) {
	  return value = +value, function() {
	    init$2(this, id).delay = value;
	  };
	}

	function transition_delay(value) {
	  var id = this._id;

	  return arguments.length
	      ? this.each((typeof value === "function"
	          ? delayFunction
	          : delayConstant)(id, value))
	      : get$3(this.node(), id).delay;
	}

	function durationFunction(id, value) {
	  return function() {
	    set$3(this, id).duration = +value.apply(this, arguments);
	  };
	}

	function durationConstant(id, value) {
	  return value = +value, function() {
	    set$3(this, id).duration = value;
	  };
	}

	function transition_duration(value) {
	  var id = this._id;

	  return arguments.length
	      ? this.each((typeof value === "function"
	          ? durationFunction
	          : durationConstant)(id, value))
	      : get$3(this.node(), id).duration;
	}

	function easeConstant(id, value) {
	  if (typeof value !== "function") throw new Error;
	  return function() {
	    set$3(this, id).ease = value;
	  };
	}

	function transition_ease(value) {
	  var id = this._id;

	  return arguments.length
	      ? this.each(easeConstant(id, value))
	      : get$3(this.node(), id).ease;
	}

	function transition_filter(match) {
	  if (typeof match !== "function") match = matcher$1(match);

	  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
	      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
	        subgroup.push(node);
	      }
	    }
	  }

	  return new Transition(subgroups, this._parents, this._name, this._id);
	}

	function transition_merge(transition$$1) {
	  if (transition$$1._id !== this._id) throw new Error;

	  for (var groups0 = this._groups, groups1 = transition$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
	    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
	      if (node = group0[i] || group1[i]) {
	        merge[i] = node;
	      }
	    }
	  }

	  for (; j < m0; ++j) {
	    merges[j] = groups0[j];
	  }

	  return new Transition(merges, this._parents, this._name, this._id);
	}

	function start(name) {
	  return (name + "").trim().split(/^|\s+/).every(function(t) {
	    var i = t.indexOf(".");
	    if (i >= 0) t = t.slice(0, i);
	    return !t || t === "start";
	  });
	}

	function onFunction(id, name, listener) {
	  var on0, on1, sit = start(name) ? init$2 : set$3;
	  return function() {
	    var schedule$$1 = sit(this, id),
	        on = schedule$$1.on;

	    // If this node shared a dispatch with the previous node,
	    // just assign the updated shared dispatch and we’re done!
	    // Otherwise, copy-on-write.
	    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

	    schedule$$1.on = on1;
	  };
	}

	function transition_on(name, listener) {
	  var id = this._id;

	  return arguments.length < 2
	      ? get$3(this.node(), id).on.on(name)
	      : this.each(onFunction(id, name, listener));
	}

	function removeFunction(id) {
	  return function() {
	    var parent = this.parentNode;
	    for (var i in this.__transition) if (+i !== id) return;
	    if (parent) parent.removeChild(this);
	  };
	}

	function transition_remove() {
	  return this.on("end.remove", removeFunction(this._id));
	}

	function transition_select(select$$1) {
	  var name = this._name,
	      id = this._id;

	  if (typeof select$$1 !== "function") select$$1 = selector(select$$1);

	  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
	      if ((node = group[i]) && (subnode = select$$1.call(node, node.__data__, i, group))) {
	        if ("__data__" in node) subnode.__data__ = node.__data__;
	        subgroup[i] = subnode;
	        schedule(subgroup[i], name, id, i, subgroup, get$3(node, id));
	      }
	    }
	  }

	  return new Transition(subgroups, this._parents, name, id);
	}

	function transition_selectAll(select$$1) {
	  var name = this._name,
	      id = this._id;

	  if (typeof select$$1 !== "function") select$$1 = selectorAll(select$$1);

	  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        for (var children = select$$1.call(node, node.__data__, i, group), child, inherit = get$3(node, id), k = 0, l = children.length; k < l; ++k) {
	          if (child = children[k]) {
	            schedule(child, name, id, k, children, inherit);
	          }
	        }
	        subgroups.push(children);
	        parents.push(node);
	      }
	    }
	  }

	  return new Transition(subgroups, parents, name, id);
	}

	var Selection$1 = selection.prototype.constructor;

	function transition_selection() {
	  return new Selection$1(this._groups, this._parents);
	}

	function styleRemove$1(name, interpolate$$1) {
	  var value00,
	      value10,
	      interpolate0;
	  return function() {
	    var value0 = styleValue(this, name),
	        value1 = (this.style.removeProperty(name), styleValue(this, name));
	    return value0 === value1 ? null
	        : value0 === value00 && value1 === value10 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
	  };
	}

	function styleRemoveEnd(name) {
	  return function() {
	    this.style.removeProperty(name);
	  };
	}

	function styleConstant$1(name, interpolate$$1, value1) {
	  var value00,
	      interpolate0;
	  return function() {
	    var value0 = styleValue(this, name);
	    return value0 === value1 ? null
	        : value0 === value00 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value1);
	  };
	}

	function styleFunction$1(name, interpolate$$1, value$$1) {
	  var value00,
	      value10,
	      interpolate0;
	  return function() {
	    var value0 = styleValue(this, name),
	        value1 = value$$1(this);
	    if (value1 == null) value1 = (this.style.removeProperty(name), styleValue(this, name));
	    return value0 === value1 ? null
	        : value0 === value00 && value1 === value10 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
	  };
	}

	function transition_style(name, value$$1, priority) {
	  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
	  return value$$1 == null ? this
	          .styleTween(name, styleRemove$1(name, i))
	          .on("end.style." + name, styleRemoveEnd(name))
	      : this.styleTween(name, typeof value$$1 === "function"
	          ? styleFunction$1(name, i, tweenValue(this, "style." + name, value$$1))
	          : styleConstant$1(name, i, value$$1 + ""), priority);
	}

	function styleTween(name, value, priority) {
	  function tween() {
	    var node = this, i = value.apply(node, arguments);
	    return i && function(t) {
	      node.style.setProperty(name, i(t), priority);
	    };
	  }
	  tween._value = value;
	  return tween;
	}

	function transition_styleTween(name, value, priority) {
	  var key = "style." + (name += "");
	  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
	  if (value == null) return this.tween(key, null);
	  if (typeof value !== "function") throw new Error;
	  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
	}

	function textConstant$1(value) {
	  return function() {
	    this.textContent = value;
	  };
	}

	function textFunction$1(value) {
	  return function() {
	    var value1 = value(this);
	    this.textContent = value1 == null ? "" : value1;
	  };
	}

	function transition_text(value) {
	  return this.tween("text", typeof value === "function"
	      ? textFunction$1(tweenValue(this, "text", value))
	      : textConstant$1(value == null ? "" : value + ""));
	}

	function transition_transition() {
	  var name = this._name,
	      id0 = this._id,
	      id1 = newId();

	  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        var inherit = get$3(node, id0);
	        schedule(node, name, id1, i, group, {
	          time: inherit.time + inherit.delay + inherit.duration,
	          delay: 0,
	          duration: inherit.duration,
	          ease: inherit.ease
	        });
	      }
	    }
	  }

	  return new Transition(groups, this._parents, name, id1);
	}

	var id$a = 0;

	function Transition(groups, parents, name, id) {
	  this._groups = groups;
	  this._parents = parents;
	  this._name = name;
	  this._id = id;
	}

	function transition(name) {
	  return selection().transition(name);
	}

	function newId() {
	  return ++id$a;
	}

	var selection_prototype = selection.prototype;

	Transition.prototype = transition.prototype = {
	  constructor: Transition,
	  select: transition_select,
	  selectAll: transition_selectAll,
	  filter: transition_filter,
	  merge: transition_merge,
	  selection: transition_selection,
	  transition: transition_transition,
	  call: selection_prototype.call,
	  nodes: selection_prototype.nodes,
	  node: selection_prototype.node,
	  size: selection_prototype.size,
	  empty: selection_prototype.empty,
	  each: selection_prototype.each,
	  on: transition_on,
	  attr: transition_attr,
	  attrTween: transition_attrTween,
	  style: transition_style,
	  styleTween: transition_styleTween,
	  text: transition_text,
	  remove: transition_remove,
	  tween: transition_tween,
	  delay: transition_delay,
	  duration: transition_duration,
	  ease: transition_ease
	};

	function cubicInOut(t) {
	  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
	}

	var pi = Math.PI;

	var tau = 2 * Math.PI;

	var defaultTiming = {
	  time: null, // Set on use.
	  delay: 0,
	  duration: 250,
	  ease: cubicInOut
	};

	function inherit(node, id) {
	  var timing;
	  while (!(timing = node.__transition) || !(timing = timing[id])) {
	    if (!(node = node.parentNode)) {
	      return defaultTiming.time = now(), defaultTiming;
	    }
	  }
	  return timing;
	}

	function selection_transition(name) {
	  var id,
	      timing;

	  if (name instanceof Transition) {
	    id = name._id, name = name._name;
	  } else {
	    id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
	  }

	  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        schedule(node, name, id, i, group, timing || inherit(node, id));
	      }
	    }
	  }

	  return new Transition(groups, this._parents, name, id);
	}

	selection.prototype.interrupt = selection_interrupt;
	selection.prototype.transition = selection_transition;

	function constant$4(x) {
	  return function() {
	    return x;
	  };
	}

	function ZoomEvent(target, type, transform) {
	  this.target = target;
	  this.type = type;
	  this.transform = transform;
	}

	function Transform(k, x, y) {
	  this.k = k;
	  this.x = x;
	  this.y = y;
	}

	Transform.prototype = {
	  constructor: Transform,
	  scale: function(k) {
	    return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
	  },
	  translate: function(x, y) {
	    return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
	  },
	  apply: function(point) {
	    return [point[0] * this.k + this.x, point[1] * this.k + this.y];
	  },
	  applyX: function(x) {
	    return x * this.k + this.x;
	  },
	  applyY: function(y) {
	    return y * this.k + this.y;
	  },
	  invert: function(location) {
	    return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
	  },
	  invertX: function(x) {
	    return (x - this.x) / this.k;
	  },
	  invertY: function(y) {
	    return (y - this.y) / this.k;
	  },
	  rescaleX: function(x) {
	    return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
	  },
	  rescaleY: function(y) {
	    return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
	  },
	  toString: function() {
	    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
	  }
	};

	var identity$3 = new Transform(1, 0, 0);

	transform.prototype = Transform.prototype;

	function transform(node) {
	  return node.__zoom || identity$3;
	}

	function nopropagation$1() {
	  event.stopImmediatePropagation();
	}

	function noevent$1() {
	  event.preventDefault();
	  event.stopImmediatePropagation();
	}

	// Ignore right-click, since that should open the context menu.
	function defaultFilter$1() {
	  return !event.button;
	}

	function defaultExtent() {
	  var e = this, w, h;
	  if (e instanceof SVGElement) {
	    e = e.ownerSVGElement || e;
	    w = e.width.baseVal.value;
	    h = e.height.baseVal.value;
	  } else {
	    w = e.clientWidth;
	    h = e.clientHeight;
	  }
	  return [[0, 0], [w, h]];
	}

	function defaultTransform() {
	  return this.__zoom || identity$3;
	}

	function defaultWheelDelta() {
	  return -event.deltaY * (event.deltaMode ? 120 : 1) / 500;
	}

	function defaultTouchable$1() {
	  return "ontouchstart" in this;
	}

	function defaultConstrain(transform$$1, extent, translateExtent) {
	  var dx0 = transform$$1.invertX(extent[0][0]) - translateExtent[0][0],
	      dx1 = transform$$1.invertX(extent[1][0]) - translateExtent[1][0],
	      dy0 = transform$$1.invertY(extent[0][1]) - translateExtent[0][1],
	      dy1 = transform$$1.invertY(extent[1][1]) - translateExtent[1][1];
	  return transform$$1.translate(
	    dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
	    dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
	  );
	}

	function d3Zoom() {
	  var filter = defaultFilter$1,
	      extent = defaultExtent,
	      constrain = defaultConstrain,
	      wheelDelta = defaultWheelDelta,
	      touchable = defaultTouchable$1,
	      scaleExtent = [0, Infinity],
	      translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]],
	      duration = 250,
	      interpolate = interpolateZoom,
	      gestures = [],
	      listeners = dispatch("start", "zoom", "end"),
	      touchstarting,
	      touchending,
	      touchDelay = 500,
	      wheelDelay = 150,
	      clickDistance2 = 0;

	  function zoom(selection$$1) {
	    selection$$1
	        .property("__zoom", defaultTransform)
	        .on("wheel.zoom", wheeled)
	        .on("mousedown.zoom", mousedowned)
	        .on("dblclick.zoom", dblclicked)
	      .filter(touchable)
	        .on("touchstart.zoom", touchstarted)
	        .on("touchmove.zoom", touchmoved)
	        .on("touchend.zoom touchcancel.zoom", touchended)
	        .style("touch-action", "none")
	        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
	  }

	  zoom.transform = function(collection, transform$$1) {
	    var selection$$1 = collection.selection ? collection.selection() : collection;
	    selection$$1.property("__zoom", defaultTransform);
	    if (collection !== selection$$1) {
	      schedule(collection, transform$$1);
	    } else {
	      selection$$1.interrupt().each(function() {
	        gesture(this, arguments)
	            .start()
	            .zoom(null, typeof transform$$1 === "function" ? transform$$1.apply(this, arguments) : transform$$1)
	            .end();
	      });
	    }
	  };

	  zoom.scaleBy = function(selection$$1, k) {
	    zoom.scaleTo(selection$$1, function() {
	      var k0 = this.__zoom.k,
	          k1 = typeof k === "function" ? k.apply(this, arguments) : k;
	      return k0 * k1;
	    });
	  };

	  zoom.scaleTo = function(selection$$1, k) {
	    zoom.transform(selection$$1, function() {
	      var e = extent.apply(this, arguments),
	          t0 = this.__zoom,
	          p0 = centroid(e),
	          p1 = t0.invert(p0),
	          k1 = typeof k === "function" ? k.apply(this, arguments) : k;
	      return constrain(translate(scale(t0, k1), p0, p1), e, translateExtent);
	    });
	  };

	  zoom.translateBy = function(selection$$1, x, y) {
	    zoom.transform(selection$$1, function() {
	      return constrain(this.__zoom.translate(
	        typeof x === "function" ? x.apply(this, arguments) : x,
	        typeof y === "function" ? y.apply(this, arguments) : y
	      ), extent.apply(this, arguments), translateExtent);
	    });
	  };

	  zoom.translateTo = function(selection$$1, x, y) {
	    zoom.transform(selection$$1, function() {
	      var e = extent.apply(this, arguments),
	          t = this.__zoom,
	          p = centroid(e);
	      return constrain(identity$3.translate(p[0], p[1]).scale(t.k).translate(
	        typeof x === "function" ? -x.apply(this, arguments) : -x,
	        typeof y === "function" ? -y.apply(this, arguments) : -y
	      ), e, translateExtent);
	    });
	  };

	  function scale(transform$$1, k) {
	    k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], k));
	    return k === transform$$1.k ? transform$$1 : new Transform(k, transform$$1.x, transform$$1.y);
	  }

	  function translate(transform$$1, p0, p1) {
	    var x = p0[0] - p1[0] * transform$$1.k, y = p0[1] - p1[1] * transform$$1.k;
	    return x === transform$$1.x && y === transform$$1.y ? transform$$1 : new Transform(transform$$1.k, x, y);
	  }

	  function centroid(extent) {
	    return [(+extent[0][0] + +extent[1][0]) / 2, (+extent[0][1] + +extent[1][1]) / 2];
	  }

	  function schedule(transition$$1, transform$$1, center) {
	    transition$$1
	        .on("start.zoom", function() { gesture(this, arguments).start(); })
	        .on("interrupt.zoom end.zoom", function() { gesture(this, arguments).end(); })
	        .tween("zoom", function() {
	          var that = this,
	              args = arguments,
	              g = gesture(that, args),
	              e = extent.apply(that, args),
	              p = center || centroid(e),
	              w = Math.max(e[1][0] - e[0][0], e[1][1] - e[0][1]),
	              a = that.__zoom,
	              b = typeof transform$$1 === "function" ? transform$$1.apply(that, args) : transform$$1,
	              i = interpolate(a.invert(p).concat(w / a.k), b.invert(p).concat(w / b.k));
	          return function(t) {
	            if (t === 1) t = b; // Avoid rounding error on end.
	            else { var l = i(t), k = w / l[2]; t = new Transform(k, p[0] - l[0] * k, p[1] - l[1] * k); }
	            g.zoom(null, t);
	          };
	        });
	  }

	  function gesture(that, args) {
	    for (var i = 0, n = gestures.length, g; i < n; ++i) {
	      if ((g = gestures[i]).that === that) {
	        return g;
	      }
	    }
	    return new Gesture(that, args);
	  }

	  function Gesture(that, args) {
	    this.that = that;
	    this.args = args;
	    this.index = -1;
	    this.active = 0;
	    this.extent = extent.apply(that, args);
	  }

	  Gesture.prototype = {
	    start: function() {
	      if (++this.active === 1) {
	        this.index = gestures.push(this) - 1;
	        this.emit("start");
	      }
	      return this;
	    },
	    zoom: function(key, transform$$1) {
	      if (this.mouse && key !== "mouse") this.mouse[1] = transform$$1.invert(this.mouse[0]);
	      if (this.touch0 && key !== "touch") this.touch0[1] = transform$$1.invert(this.touch0[0]);
	      if (this.touch1 && key !== "touch") this.touch1[1] = transform$$1.invert(this.touch1[0]);
	      this.that.__zoom = transform$$1;
	      this.emit("zoom");
	      return this;
	    },
	    end: function() {
	      if (--this.active === 0) {
	        gestures.splice(this.index, 1);
	        this.index = -1;
	        this.emit("end");
	      }
	      return this;
	    },
	    emit: function(type) {
	      customEvent(new ZoomEvent(zoom, type, this.that.__zoom), listeners.apply, listeners, [type, this.that, this.args]);
	    }
	  };

	  function wheeled() {
	    if (!filter.apply(this, arguments)) return;
	    var g = gesture(this, arguments),
	        t = this.__zoom,
	        k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], t.k * Math.pow(2, wheelDelta.apply(this, arguments)))),
	        p = mouse(this);

	    // If the mouse is in the same location as before, reuse it.
	    // If there were recent wheel events, reset the wheel idle timeout.
	    if (g.wheel) {
	      if (g.mouse[0][0] !== p[0] || g.mouse[0][1] !== p[1]) {
	        g.mouse[1] = t.invert(g.mouse[0] = p);
	      }
	      clearTimeout(g.wheel);
	    }

	    // If this wheel event won’t trigger a transform change, ignore it.
	    else if (t.k === k) return;

	    // Otherwise, capture the mouse point and location at the start.
	    else {
	      g.mouse = [p, t.invert(p)];
	      interrupt(this);
	      g.start();
	    }

	    noevent$1();
	    g.wheel = setTimeout(wheelidled, wheelDelay);
	    g.zoom("mouse", constrain(translate(scale(t, k), g.mouse[0], g.mouse[1]), g.extent, translateExtent));

	    function wheelidled() {
	      g.wheel = null;
	      g.end();
	    }
	  }

	  function mousedowned() {
	    if (touchending || !filter.apply(this, arguments)) return;
	    var g = gesture(this, arguments),
	        v = select(event.view).on("mousemove.zoom", mousemoved, true).on("mouseup.zoom", mouseupped, true),
	        p = mouse(this),
	        x0 = event.clientX,
	        y0 = event.clientY;

	    nodrag(event.view);
	    nopropagation$1();
	    g.mouse = [p, this.__zoom.invert(p)];
	    interrupt(this);
	    g.start();

	    function mousemoved() {
	      noevent$1();
	      if (!g.moved) {
	        var dx = event.clientX - x0, dy = event.clientY - y0;
	        g.moved = dx * dx + dy * dy > clickDistance2;
	      }
	      g.zoom("mouse", constrain(translate(g.that.__zoom, g.mouse[0] = mouse(g.that), g.mouse[1]), g.extent, translateExtent));
	    }

	    function mouseupped() {
	      v.on("mousemove.zoom mouseup.zoom", null);
	      yesdrag(event.view, g.moved);
	      noevent$1();
	      g.end();
	    }
	  }

	  function dblclicked() {
	    if (!filter.apply(this, arguments)) return;
	    var t0 = this.__zoom,
	        p0 = mouse(this),
	        p1 = t0.invert(p0),
	        k1 = t0.k * (event.shiftKey ? 0.5 : 2),
	        t1 = constrain(translate(scale(t0, k1), p0, p1), extent.apply(this, arguments), translateExtent);

	    noevent$1();
	    if (duration > 0) select(this).transition().duration(duration).call(schedule, t1, p0);
	    else select(this).call(zoom.transform, t1);
	  }

	  function touchstarted() {
	    if (!filter.apply(this, arguments)) return;
	    var g = gesture(this, arguments),
	        touches$$1 = event.changedTouches,
	        started,
	        n = touches$$1.length, i, t, p;

	    nopropagation$1();
	    for (i = 0; i < n; ++i) {
	      t = touches$$1[i], p = touch(this, touches$$1, t.identifier);
	      p = [p, this.__zoom.invert(p), t.identifier];
	      if (!g.touch0) g.touch0 = p, started = true;
	      else if (!g.touch1) g.touch1 = p;
	    }

	    // If this is a dbltap, reroute to the (optional) dblclick.zoom handler.
	    if (touchstarting) {
	      touchstarting = clearTimeout(touchstarting);
	      if (!g.touch1) {
	        g.end();
	        p = select(this).on("dblclick.zoom");
	        if (p) p.apply(this, arguments);
	        return;
	      }
	    }

	    if (started) {
	      touchstarting = setTimeout(function() { touchstarting = null; }, touchDelay);
	      interrupt(this);
	      g.start();
	    }
	  }

	  function touchmoved() {
	    var g = gesture(this, arguments),
	        touches$$1 = event.changedTouches,
	        n = touches$$1.length, i, t, p, l;

	    noevent$1();
	    if (touchstarting) touchstarting = clearTimeout(touchstarting);
	    for (i = 0; i < n; ++i) {
	      t = touches$$1[i], p = touch(this, touches$$1, t.identifier);
	      if (g.touch0 && g.touch0[2] === t.identifier) g.touch0[0] = p;
	      else if (g.touch1 && g.touch1[2] === t.identifier) g.touch1[0] = p;
	    }
	    t = g.that.__zoom;
	    if (g.touch1) {
	      var p0 = g.touch0[0], l0 = g.touch0[1],
	          p1 = g.touch1[0], l1 = g.touch1[1],
	          dp = (dp = p1[0] - p0[0]) * dp + (dp = p1[1] - p0[1]) * dp,
	          dl = (dl = l1[0] - l0[0]) * dl + (dl = l1[1] - l0[1]) * dl;
	      t = scale(t, Math.sqrt(dp / dl));
	      p = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
	      l = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
	    }
	    else if (g.touch0) p = g.touch0[0], l = g.touch0[1];
	    else return;
	    g.zoom("touch", constrain(translate(t, p, l), g.extent, translateExtent));
	  }

	  function touchended() {
	    var g = gesture(this, arguments),
	        touches$$1 = event.changedTouches,
	        n = touches$$1.length, i, t;

	    nopropagation$1();
	    if (touchending) clearTimeout(touchending);
	    touchending = setTimeout(function() { touchending = null; }, touchDelay);
	    for (i = 0; i < n; ++i) {
	      t = touches$$1[i];
	      if (g.touch0 && g.touch0[2] === t.identifier) delete g.touch0;
	      else if (g.touch1 && g.touch1[2] === t.identifier) delete g.touch1;
	    }
	    if (g.touch1 && !g.touch0) g.touch0 = g.touch1, delete g.touch1;
	    if (g.touch0) g.touch0[1] = this.__zoom.invert(g.touch0[0]);
	    else g.end();
	  }

	  zoom.wheelDelta = function(_) {
	    return arguments.length ? (wheelDelta = typeof _ === "function" ? _ : constant$4(+_), zoom) : wheelDelta;
	  };

	  zoom.filter = function(_) {
	    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$4(!!_), zoom) : filter;
	  };

	  zoom.touchable = function(_) {
	    return arguments.length ? (touchable = typeof _ === "function" ? _ : constant$4(!!_), zoom) : touchable;
	  };

	  zoom.extent = function(_) {
	    return arguments.length ? (extent = typeof _ === "function" ? _ : constant$4([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), zoom) : extent;
	  };

	  zoom.scaleExtent = function(_) {
	    return arguments.length ? (scaleExtent[0] = +_[0], scaleExtent[1] = +_[1], zoom) : [scaleExtent[0], scaleExtent[1]];
	  };

	  zoom.translateExtent = function(_) {
	    return arguments.length ? (translateExtent[0][0] = +_[0][0], translateExtent[1][0] = +_[1][0], translateExtent[0][1] = +_[0][1], translateExtent[1][1] = +_[1][1], zoom) : [[translateExtent[0][0], translateExtent[0][1]], [translateExtent[1][0], translateExtent[1][1]]];
	  };

	  zoom.constrain = function(_) {
	    return arguments.length ? (constrain = _, zoom) : constrain;
	  };

	  zoom.duration = function(_) {
	    return arguments.length ? (duration = +_, zoom) : duration;
	  };

	  zoom.interpolate = function(_) {
	    return arguments.length ? (interpolate = _, zoom) : interpolate;
	  };

	  zoom.on = function() {
	    var value$$1 = listeners.on.apply(listeners, arguments);
	    return value$$1 === listeners ? zoom : value$$1;
	  };

	  zoom.clickDistance = function(_) {
	    return arguments.length ? (clickDistance2 = (_ = +_) * _, zoom) : Math.sqrt(clickDistance2);
	  };

	  return zoom;
	}

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
	function interpolate$1(a, b) {
	    if (a === b || a !== a)
	        return snap(a);
	    var type = typeof a;
	    if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
	        throw new Error('Cannot interpolate values of different type');
	    }
	    if (Array.isArray(a)) {
	        var arr_1 = b.map(function (bi, i) {
	            return interpolate$1(a[i], bi);
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
	            interpolators_1[key] = interpolate$1(a[key], b[key]);
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
	function linear$3(x) {
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
	        value: (options.interpolate || interpolate$1)(this.get()[key], to),
	        to: to,
	        start: start,
	        end: end,
	        duration: duration,
	        ease: options.easing || linear$3,
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

	/* src/library/D3Zoom.html generated by Svelte v2.15.3 */



	function minSize({clientWidth, clientHeight}) {
		return Math.min(clientWidth, clientHeight);
	}

	function mouseOver({msx, msy}) {
		return msx != undefined && msy != undefined;
	}

	function mouseGlobalPosition({transform: transform$$1, msx, msy, clientHeight, clientWidth, minSize}) {
	  if (transform$$1 && msx != undefined && msy != undefined) {
	    return [
	      transform$$1.invertX(msx),// - (clientWidth - minSize) / 2,
	      transform$$1.invertY(msy),// - (clientHeight - minSize) / 2,
	    ];
	  } else {
	    return null;
	  }
	}

	function extent$1({scale, translateX, translateY, minSize, clientWidth, clientHeight}) {
	  const x0 = - translateX / scale;
	  const y0 = - translateY / scale;
	  const x1 = x0 + clientWidth / scale;
	  const y1 = y0 + clientHeight / scale;
	  return [
	    [x0 / minSize, x1 / minSize],
	    [y0 / minSize, y1 / minSize],
	  ]
	}

	function gcx({extent}) {
		return (extent[0][0] + extent[0][1]) / 2;
	}

	function gcy({extent}) {
		return (extent[1][0] + extent[1][1]) / 2;
	}

	function data$c() {
	  return {
	    z: d3Zoom(), //d3 zoom object
	    el: null,
	    selection: null, //the d3 selection of the root
	    transform: null, // the d3 transform
	    scaleExtent: [1, 48], //
	    homeScale: 1,
	    homeX: 0.5,
	    homeY: 0.5,
	    scale: null,
	    translateX: null,
	    translateY: null,
	    k: 1,
	    x: 0,
	    y: 0,
	    msx: null,
	    msy: null,
	    disableBehaviors: false,
	    scrollWheel: false,
	  };
	}
	var methods$3 = {
	  tween,
	  zoomEventFilter: function() {
	    const {scrollWheel, touchPan, disableBehaviors} = this.get();
	    // console.log(d3Event)
	    if (disableBehaviors) {
	      return false;
	    }
	    // if (!touchPan && d3Event.touches) {
	    //   if (d3Event.touches.length === 1) {
	    //     return false;
	    //   }
	    // }
	    // If we want to suppress scroll wheel events...
	    if (!scrollWheel) {
	      // ... return false for scroll wheel events + button = 1 events
	      return !(event.type === "wheel" && event.ctrlKey === false) && !event.button;
	    } else {
	      //... just return false for button = 1 events
	      return !event.button;
	    }
	  },
	  mouseMove: function(event$$1) {
	    const msx = event$$1.offsetX;
	    const msy = event$$1.offsetY;
	    this.set({
	      msx, msy
	    });
	    const {mouseGlobalPosition} = this.get();
	  },
	  update: function() {
	    
	    const {clientWidth, clientHeight, minSize, el, z} = this.get();
	    const transform$$1 = transform(el);
	    // console.log("update", transform.k)
	    const scale = transform$$1.k;
	    this.set({
	      scale,
	      transform: transform$$1,
	      translateX: transform$$1.x, // + scale * (clientWidth - minSize) / 2,
	      translateY: transform$$1.y, // + scale * (clientHeight - minSize) / 2,
	    });
	  },
	  onzoom: function(that) {
	    // console.log("onzoom")
	    that.update();
	    that.fire("zoom");
	  },
	  zoomTo: function(x, y, scale = 1, duration = 1000) {
	    const {selection: selection$$1, z, minSize, clientWidth, clientHeight} = this.get();

	    selection$$1.transition()
	      .duration(duration)
	      .call(z.transform, 
	        identity$3
	          .translate(clientWidth / 2, clientHeight / 2)
	          .scale(scale)
	          .translate(- x * minSize, - y * minSize));
	  },
	  translateTo: function(x, y) {
	    const {z, selection: selection$$1, minSize} = this.get();
	    z.translateTo(selection$$1, x * minSize, y * minSize);
	  },
	  home: function(duration=0) {

	    const {homeX, homeY, homeScale} = this.get();
	    this.zoomTo(homeX, homeY, homeScale, duration);

	    // selection.transition()
	    //   .duration(duration)
	    //   .call(z.transform, 
	    //     d3ZoomIdentity
	    //       .translate(clientWidth / 2, clientHeight / 2)
	    //       .translate(- 0.5 * minSize, - 0.5 * minSize));
	  },
	  scaleTo: function(scale, duration=0) {
	    // console.log("scaleTo", duration)
	    const {z, selection: selection$$1} = this.get();
	    selection$$1.transition()
	      .duration(duration)
	      .call(z.scaleTo, scale);
	  }
	};

	function oncreate$4() {
	  const {z, scaleExtent, minSize, clientWidth, clientHeight, homeScale, homeX, homeY, disableBehaviors} = this.get();
	  const that = this; // needed because d3 gives "this" as the node, not component.
	  z.wheelDelta(() => {
	    let d = -event.deltaY * (event.deltaMode ? 120 : 1) / 500;
	    if (event.ctrlKey) {
	      d = d * 10;
	    }
	    return d;
	  });
	  z.scaleExtent(scaleExtent);
	  const selection$$1 = select(this.refs.root);
	  this.set({
	    selection: selection$$1,
	    el: this.refs.root,
	  });
	  if (!disableBehaviors) {
	    z(selection$$1);
	  }
	  z.filter(this.zoomEventFilter.bind(this));
	  z.on("zoom", () => { this.onzoom(that); });
	  z.translateTo(selection$$1, homeX * minSize, homeY * minSize);
	  z.scaleTo(selection$$1, homeScale);
	}
	function onstate({changed, current, previous}) {
	  if (previous != undefined) {
	    if ((changed.clientWidth || changed.clientHeight) && current.el) {
	      this.update();
	    }
	  }
	  // console.log("update", changed, current.scale)
	  const {z, selection: selection$$1, el, x, y} = this.get();
	}
	const file$f = "src/library/D3Zoom.html";

	function create_main_fragment$g(component, ctx) {
		var div, slot_content_default = component._slotted.default;

		function mousemove_handler(event$$1) {
			component.mouseMove(event$$1);
		}

		function mousedown_handler(event$$1) {
			component.set({msx: null, msy: null});
		}

		function mouseout_handler(event$$1) {
			component.set({msx: null, msy: null});
		}

		return {
			c: function create$$1() {
				div = createElement("div");
				addListener(div, "mousemove", mousemove_handler);
				addListener(div, "mousedown", mousedown_handler);
				addListener(div, "mouseout", mouseout_handler);
				div.className = "d3zoom svelte-kaete3 svelte-ref-root";
				addLoc(div, file$f, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				if (slot_content_default) {
					append(div, slot_content_default);
				}

				component.refs.root = div;
			},

			p: noop,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (slot_content_default) {
					reinsertChildren(div, slot_content_default);
				}

				removeListener(div, "mousemove", mousemove_handler);
				removeListener(div, "mousedown", mousedown_handler);
				removeListener(div, "mouseout", mouseout_handler);
				if (component.refs.root === div) component.refs.root = null;
			}
		};
	}

	function D3Zoom(options) {
		this._debugName = '<D3Zoom>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$c(), options.data);

		this._recompute({ clientWidth: 1, clientHeight: 1, msx: 1, msy: 1, transform: 1, minSize: 1, scale: 1, translateX: 1, translateY: 1, extent: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<D3Zoom> was created without expected data property 'clientWidth'");
		if (!('clientHeight' in this._state)) console.warn("<D3Zoom> was created without expected data property 'clientHeight'");
		if (!('msx' in this._state)) console.warn("<D3Zoom> was created without expected data property 'msx'");
		if (!('msy' in this._state)) console.warn("<D3Zoom> was created without expected data property 'msy'");
		if (!('transform' in this._state)) console.warn("<D3Zoom> was created without expected data property 'transform'");

		if (!('scale' in this._state)) console.warn("<D3Zoom> was created without expected data property 'scale'");
		if (!('translateX' in this._state)) console.warn("<D3Zoom> was created without expected data property 'translateX'");
		if (!('translateY' in this._state)) console.warn("<D3Zoom> was created without expected data property 'translateY'");
		this._intro = true;

		this._handlers.state = [onstate];

		this._slotted = options.slots || {};

		onstate.call(this, { changed: assignTrue({}, this._state), current: this._state });

		this._fragment = create_main_fragment$g(this, this._state);

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

	assign(D3Zoom.prototype, protoDev);
	assign(D3Zoom.prototype, methods$3);

	D3Zoom.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('minSize' in newState && !this._updatingReadonlyProperty) throw new Error("<D3Zoom>: Cannot set read-only property 'minSize'");
		if ('mouseOver' in newState && !this._updatingReadonlyProperty) throw new Error("<D3Zoom>: Cannot set read-only property 'mouseOver'");
		if ('mouseGlobalPosition' in newState && !this._updatingReadonlyProperty) throw new Error("<D3Zoom>: Cannot set read-only property 'mouseGlobalPosition'");
		if ('extent' in newState && !this._updatingReadonlyProperty) throw new Error("<D3Zoom>: Cannot set read-only property 'extent'");
		if ('gcx' in newState && !this._updatingReadonlyProperty) throw new Error("<D3Zoom>: Cannot set read-only property 'gcx'");
		if ('gcy' in newState && !this._updatingReadonlyProperty) throw new Error("<D3Zoom>: Cannot set read-only property 'gcy'");
	};

	D3Zoom.prototype._recompute = function _recompute(changed, state) {
		if (changed.clientWidth || changed.clientHeight) {
			if (this._differs(state.minSize, (state.minSize = minSize(state)))) changed.minSize = true;
		}

		if (changed.msx || changed.msy) {
			if (this._differs(state.mouseOver, (state.mouseOver = mouseOver(state)))) changed.mouseOver = true;
		}

		if (changed.transform || changed.msx || changed.msy || changed.clientHeight || changed.clientWidth || changed.minSize) {
			if (this._differs(state.mouseGlobalPosition, (state.mouseGlobalPosition = mouseGlobalPosition(state)))) changed.mouseGlobalPosition = true;
		}

		if (changed.scale || changed.translateX || changed.translateY || changed.minSize || changed.clientWidth || changed.clientHeight) {
			if (this._differs(state.extent, (state.extent = extent$1(state)))) changed.extent = true;
		}

		if (changed.extent) {
			if (this._differs(state.gcx, (state.gcx = gcx(state)))) changed.gcx = true;
			if (this._differs(state.gcy, (state.gcy = gcy(state)))) changed.gcy = true;
		}
	};

	/* src/Atlas.html generated by Svelte v2.15.3 */



	function maxAttributionValue({layers, layer}) {
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
	}

	function w({viewWidth, screenResolution}) {
		return viewWidth * screenResolution;
	}

	function h({viewHeight, screenResolution}) {
		return viewHeight * screenResolution;
	}

	function currentZoomIndex({scale, gridSize, config, classHeatmap, w, h, autoGridSizeMultiplier}) {
	  let s = 0;
	  if (gridSize > -1) {
	    s = +gridSize;
	  } else {
	    const size = Math.max(w, h);
	    const optimalNumIcons = ((size * scale) / 80) / autoGridSizeMultiplier;
	    const snapToGrid = Math.floor(Math.sqrt(optimalNumIcons / 20));
	    s = snapToGrid;
	  }
	  // Make sure we don't overrun our data
	  if (config) {
	    s = Math.min(config.grid_size.length - 1 , s);
	  }
	  // Class heatmap only has data up to level 2
	  if (classHeatmap > -1) {
	    s = Math.min(2, s);
	  }
	  return s;

	}

	function currentLayerData({currentZoomIndex, layers}) {
	  return layers ? layers[currentZoomIndex] : [[]]
	}

	function labelsBuffer({labelsBufferContext, labels, fontSize, textColor, textShadowColor}) {
	  // console.log(labelsBufferContext, labels);

	  if (labelsBufferContext && labels) {
	    labelsBufferContext.globalAlpha = 1.0;
	    labelsBufferContext.font=fontSize + "px Helvetica";
	    labels.forEach((label, i) => {
	      // if (textShadow) {
	      labelsBufferContext.lineWidth = 3;
	      labelsBufferContext.lineJoin = "round";
	      labelsBufferContext.strokeStyle = textShadowColor;
	      labelsBufferContext.strokeText(label, (i % 10) * 150 + 10, Math.floor(i / 10 + 1) * 20, 80, 15);
	      // }
	      labelsBufferContext.fillStyle = textColor;
	      labelsBufferContext.fillStyle = textColor;
	      labelsBufferContext.fillText(label, (i % 10) * 150 + 10, Math.floor(i / 10 + 1) * 20, 80, 15);
	                    
	    });
	  }
	}

	function showHover({hoverIconData, mouseGlobalPosition}) {
		return mouseGlobalPosition && hoverIconData && hoverIconData.gcx;
	}

	function hoverIconData({currentLayerData, config, mouseGlobalPosition, w, h, translateX, translateY}) {
	  // const msx = mouseGlobalPosition[0]
	  // const msy = mouseGlobalPosition[1]
	  if (currentLayerData) {
	    const numGridRows = currentLayerData.length;
	    if (mouseGlobalPosition) {
	      const gx = Math.floor(mouseGlobalPosition[0] / Math.min(w, h) * numGridRows);
	      const gy = Math.floor(mouseGlobalPosition[1] / Math.min(w, h) * numGridRows);
	      if (currentLayerData[gy] && currentLayerData[gy][gx]) {
	        return currentLayerData[gy][gx];
	      } else {
	        return {};
	      }
	    } else {
	      return {};
	    }
	  } else {
	    return {};
	  }
	}

	function hoverIconX({hoverIconData, scale, w, h, translateX}) {
		return hoverIconData.gy * scale * Math.min(w, h) + translateX;
	}

	function hoverIconY({hoverIconData, scale, w, h, translateY}) {
		return hoverIconData.gx * scale * Math.min(w, h) + translateY;
	}

	function hoverIconW({hoverIconData, scale, w, h}) {
		return hoverIconData.gw * scale * Math.min(w, h);
	}

	function showHoverIcon({mouseGlobalPosition, hoverIconData, enableHover}) {
	  return enableHover && mouseGlobalPosition && hoverIconData && hoverIconData.gw
	}

	function data$d() {
	  return {
	    ready: true,
	    id: "inceptionv1_mixed4c",

	    // viewWidth: 500,
	    // viewHeight: 500,
	    
	    config: null,
	    layers: null,

	    layer: 0,
	    layout: 0,
	    classFilter: 0,
	    filter: 0,

	    context: null,

	    alphaAttributionFactor: 0.02,
	    density: 1.0,
	    classHeatmap: -1,
	    classHeatmapMultiplier: 1,
	    classHeatmapPositive: 1,
	    iconCrop: 0.02,
	    autoGridSizeMultiplier: 0.5,

	    gridSize: null,

	    // for initial state, and going back to "home"
	    homeX: .5,
	    homeY: .5,
	    homeScale: 1,

	    // turn off features
	    enableClickToZoom: true,
	    enableHover: true,
	    enableDragToPan: true,

	    // Styling
	    backgroundColor: "white",
	    strokeColor: "rgb(220, 220, 220)",
	    strokeThickness: 1,
	    imageSmoothing: false,
	    fontSize: 10,
	    textColor: "white",
	    textShadowColor: "rgba(0, 0, 0, 0.6)",
	    showLabels: true,

	    screenResolution: 1,
	  }
	}
	var methods$4 = {
	  measure() {
	    this.set({
	      viewWidth: this.refs.root.offsetWidth,
	      viewHeight: this.refs.root.offsetHeight,
	    });
	  },
	  fullscreen() {
	    this.refs.root.webkitRequestFullscreen();
	  },
	  home(duration=0) {
	    // const {homeX, homeY, homeScale} = this.get();
	    // this.transitionTo(homeX, homeY, homeScale, duration);
	    this.refs.d3Zoom.home(duration);
	  },
	  translateTo(x, y) {
	    this.refs.d3Zoom.translateTo(x, y);
	  },
	  zoomTo(x, y, scale, duration = 1000) {
	    this.refs.d3Zoom.zoomTo(x, y, scale, duration);
	  },
	  transitionTo(x, y, scale, duration=0) {
	    this.refs.d3Zoom.transformTo(x, y, scale, duration);
	  },
	  scaleBy(multiplier) {
	    const { scale } = this.get();
	    this.refs.d3Zoom.scaleTo(scale * multiplier, 300);
	  },
	  iconToGlobalPosition(icon, layerIndex) {
	    const {density, scale, translateX, translateY, config, w, h} = this.get();
	    const gridSize = config.grid_size[layerIndex];
	    const gridWidth = config.icon_size * gridSize;

	    const iconWidth = icon.gw * scale * Math.min(w, h);

	    // x, y swapped intentionally
	    const iconX = icon.gy * scale * Math.min(w, h) + translateX;
	    const iconY = icon.gx * scale * Math.min(w, h) + translateY;

	    const sourceX = icon.localX * config.icon_size;
	    const sourceY = icon.localY * config.icon_size;

	    const totalSamples = (typeof config.filter[0] == "number" ? config.filter[0] : config.sample_images);
	    const avgSamples = totalSamples / (gridSize * gridSize);

	    // Resize based on density
	    const relativeDensity = Math.min(1, Math.sqrt(density * icon.num_activations / avgSamples));
	    const adjustedIconWidth = iconWidth * relativeDensity;
	    const adjustedIconX = iconX + (iconWidth - adjustedIconWidth) / 2;
	    const adjustedIconY = iconY + (iconWidth - adjustedIconWidth) / 2;

	    return {sourceX, sourceY, iconX: adjustedIconX, iconY: adjustedIconY, iconWidth: adjustedIconWidth}
	  },
	  clear() {
	    const {viewHeight, viewWidth, context, backgroundColor, labelsContext} = this.get();
	    context.globalAlpha = 1;
	    context.fillStyle= backgroundColor;
	    context.clearRect(0, 0, viewWidth, viewHeight);
	    context.fillRect(0, 0, viewWidth, viewHeight);
	    labelsContext.globalAlpha = 1;
	    labelsContext.clearRect(0, 0, viewWidth, viewHeight);
	  },
	  render() {

	    const {id, labelsContext, loading, classHeatmap, showLabels, labels, labelsBufferCanvas, imageSmoothing, scale, w, h, translateX, translateY, context, backgroundColor, config, layers, visibleLayers, currentZoomIndex, strokeColor, strokeThickness, fontSize,textShadowColor, textColor, maxAttributionValue, classHeatmapMultiplier} = this.get();

	    this.clear();
	    // context.imageSmoothingQuality = "low";
	    context.imageSmoothingEnabled = imageSmoothing;

	    labelsContext.strokeStyle = strokeColor;
	    labelsContext.lineWidth = strokeThickness;
	    context.fillStyle = "white";

	    if (config && layers && !loading) {
	      let visibleLayers = [
	        {i: currentZoomIndex, opacity: 1.0}
	      ];
	      this.set({visibleLayers});

	      visibleLayers.forEach(visibleLayer => {
	        const layerIndex = visibleLayer.i;
	        const layerOpacity = visibleLayer.opacity;
	        const icons = layers[layerIndex];

	          
	          // Calculating min and max indices for icon render loop
	          const minSize = Math.min(w, h);
	          const minX = Math.max(0, Math.floor(-(translateX / scale / minSize) * icons.length));
	          const maxX = minX + Math.ceil(( w / scale / minSize) * icons.length);
	          const minY = Math.max(0, Math.floor(-(translateY / scale / minSize) * icons.length));
	          const maxY = minY + Math.ceil(( h / scale / minSize) * icons.length);

	          for (let y = minY; y <= maxY; y++) {
	            for (let x = minX; x <= maxX; x++) {
	              
	              if (icons[y] && icons[y][x]) {
	                const icon = icons[y][x];

	                const {sourceX, sourceY, iconX, iconY, iconWidth} = this.iconToGlobalPosition(icon, layerIndex);
	                
	                const requestedID = id;
	                // If icon is in the viewport 
	                // probably don't need this anymore
	                // if (iconX > -iconWidth && iconX < w && iconY > -iconWidth && iconY < h) {
	                {
	                  
	                  // We want to draw a box so there isn't just whiteness.
	                  if (classHeatmap > -1 || true) {
	                    labelsContext.globalAlpha = 0.3;
	                    labelsContext.strokeRect(iconX, iconY, iconWidth, iconWidth);
	                    labelsContext.globalAlpha = 1.0;
	                  }
	                  const textSkipX = Math.ceil(40 / iconWidth);
	                  const textSkipY = Math.ceil(60 / iconWidth);
	                  if (showLabels && labels && classHeatmap === -1 && icon.y % textSkipY == 0 && icon.x % textSkipX == 0 ) {
	                    labelsContext.globalAlpha = 1;
	                    const labelIndex = icon.top_class_indices[0];
	                    labelsContext.drawImage(
	                      labelsBufferCanvas,
	                      //source
	                      (labelIndex % 10) * 150, Math.floor(labelIndex / 10) * 20 + 4, Math.min(iconWidth * textSkipY - 5, 100), 20,
	                      //destination
	                      iconX, iconY + iconWidth - 20 - 2, Math.min(iconWidth * textSkipY - 5, 100), 20
	                    );
	                  }

	                  load$1(icon.url).then(response => {
	                    
	                    // check that we're still on the right layer/zoom/id
	                    const {id, visibleLayers, iconCrop, showLabels, textShadow} = this.get();
	                    // console.log(requestedID, id)

	                    if(visibleLayers.reduce((acc, layer) => layer.i === layerIndex ? acc + 1 : acc, 0) && requestedID === id) {
	                      const {labelsContext, labelsBufferCanvas, alphaAttributionFactor, labels, config, classHeatmap, classHeatmapMultiplier, classHeatmapPositive} = this.get();

	                      const {sourceX, sourceY, iconX, iconY, iconWidth} = this.iconToGlobalPosition(icon, layerIndex);

	                      // If we have a class heatmap active, calculate the transparency for the current icon
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
	                      const computedIconCrop = Math.min(8 / iconWidth, 0.6);
	                      // draw the icon
	                      context.globalAlpha = 1;
	                      const iconOffset = (computedIconCrop * config.icon_size) / 2;
	                      // context.clearRect(iconX + 1, iconY + 1, iconWidth - 2, iconWidth - 2);
	                      if (classHeatmap > -1) {
	                        // labelsContext.beginPath();
	                        context.fillRect(iconX, iconY, iconWidth, iconWidth);
	                        // context.fill();
	                        // context.closePath();
	                      }
	                      context.globalAlpha = a;
	                      context.drawImage(response,
	                        //source
	                        sourceY + iconOffset, sourceX + iconOffset, config.icon_size - iconOffset * 2, config.icon_size - iconOffset * 2,
	                        //destination
	                        iconX, iconY, iconWidth, iconWidth
	                      );
	                      
	                      // context.globalAlpha = 1;
	                      // context.closePath();
	                      
	                    }
	                  });
	                }
	              }
	            }
	          }
	        });
	      }
	    }
	  };

	function oncreate$5() {
	  // Turn off tooltips while zooming
	  const {tooltip} = this.store.get();
	  this.refs.d3Zoom.on("zoom", () => {
	    tooltip.hide();
	  });
	  // Offscreen buffer for drawing text labels;
	  const labelsBufferCanvas = document.createElement("canvas");
	  labelsBufferCanvas.width = 150 * 10;
	  labelsBufferCanvas.height = (Math.ceil(1002 / 10) + 1) * 20;
	  const labelsBufferContext = labelsBufferCanvas.getContext("2d");
	  this.set({labelsBufferCanvas, labelsBufferContext});
	  setTimeout(() => {
	    this.measure();
	    this.home();
	  }, 10);
	}
	function onupdate$2({changed, current, previous}) {
	  // console.log("atlas", changed, current.scale)
	  if (!current.context || changed.viewWidth || changed.viewHeight) {
	    const labelsContext = this.refs.labelsCanvas.getContext('2d');
	    labelsContext.imageSmoothingEnabled = false;
	    this.set({
	      context: this.refs.canvas.getContext('2d'),
	      labelsContext
	    });
	  }
	  if (changed.loading || changed.autoGridSizeMultiplier || changed.labels || changed.density || changed.maxAttributionValue || changed.classHeatmap || changed.classHeatmapMultiplier || changed.classHeatmapPositive || changed.showLabels || changed.viewWidth || changed.viewHeight || changed.scale || changed.translateX || changed.translateY || changed.iconCrop || changed.gridSize || changed.layers) {
	    this.render();
	  }
	  if (changed.hoverIconData) {
	    const {tooltip} = this.store.get();
	    const {showHoverIcon} = this.get();
	    if (showHoverIcon) {
	      tooltip.show(current.hoverIconData);
	    } else {
	      tooltip.hide();
	    }
	  }
	  if (changed.showHoverIcon) {
	    if (current.showHoverIcon == false) {
	      const { tooltip } = this.store.get();
	      tooltip.hide();
	    }
	  }

	}
	const file$g = "src/Atlas.html";

	function create_main_fragment$h(component, ctx) {
		var radar_updating = {}, text0, text1, div, canvas0, canvas0_width_value, canvas0_height_value, text2, canvas1, canvas1_width_value, canvas1_height_value, text3, if_block1_anchor, d3zoom_updating = {};

		function onwindowresize(event) {
			component.measure();	}
		window.addEventListener("resize", onwindowresize);

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

		var if_block0 = (ctx.ready) && create_if_block_1$1(component, ctx);

		var if_block1 = (ctx.showHoverIcon) && create_if_block$2(component, ctx);

		var d3zoom_initial_data = {
		 	clientWidth: ctx.viewWidth,
		 	clientHeight: ctx.viewHeight,
		 	homeX: ctx.homeX,
		 	homeY: ctx.homeY,
		 	homeScale: ctx.homeScale
		 };
		if (ctx.scale
	     !== void 0) {
			d3zoom_initial_data.scale = ctx.scale
	    ;
			d3zoom_updating.scale = true;
		}
		if (ctx.translateX
	     !== void 0) {
			d3zoom_initial_data.translateX = ctx.translateX
	    ;
			d3zoom_updating.translateX = true;
		}
		if (ctx.translateY
	     !== void 0) {
			d3zoom_initial_data.translateY = ctx.translateY
	    ;
			d3zoom_updating.translateY = true;
		}
		if (ctx.mouseOver
	     !== void 0) {
			d3zoom_initial_data.mouseOver = ctx.mouseOver
	    ;
			d3zoom_updating.mouseOver = true;
		}
		if (ctx.mouseGlobalPosition
	     !== void 0) {
			d3zoom_initial_data.mouseGlobalPosition = ctx.mouseGlobalPosition
	    ;
			d3zoom_updating.mouseGlobalPosition = true;
		}
		if (ctx.extent
	     !== void 0) {
			d3zoom_initial_data.extent = ctx.extent
	    ;
			d3zoom_updating.extent = true;
		}
		if (ctx.scrollWheel
	     !== void 0) {
			d3zoom_initial_data.scrollWheel = ctx.scrollWheel
	    ;
			d3zoom_updating.scrollWheel = true;
		}
		if (ctx.disableBehaviors
	     !== void 0) {
			d3zoom_initial_data.disableBehaviors = ctx.disableBehaviors
	    ;
			d3zoom_updating.disableBehaviors = true;
		}
		if (ctx.gcx
	     !== void 0) {
			d3zoom_initial_data.gcx = ctx.gcx
	    ;
			d3zoom_updating.gcx = true;
		}
		if (ctx.gcy
	     !== void 0) {
			d3zoom_initial_data.gcy = ctx.gcy
	    ;
			d3zoom_updating.gcy = true;
		}
		var d3zoom = new D3Zoom({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: d3zoom_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!d3zoom_updating.scale && changed.scale) {
					newState.scale = childState.scale;
				}

				if (!d3zoom_updating.translateX && changed.translateX) {
					newState.translateX = childState.translateX;
				}

				if (!d3zoom_updating.translateY && changed.translateY) {
					newState.translateY = childState.translateY;
				}

				if (!d3zoom_updating.mouseOver && changed.mouseOver) {
					newState.mouseOver = childState.mouseOver;
				}

				if (!d3zoom_updating.mouseGlobalPosition && changed.mouseGlobalPosition) {
					newState.mouseGlobalPosition = childState.mouseGlobalPosition;
				}

				if (!d3zoom_updating.extent && changed.extent) {
					newState.extent = childState.extent;
				}

				if (!d3zoom_updating.scrollWheel && changed.scrollWheel) {
					newState.scrollWheel = childState.scrollWheel;
				}

				if (!d3zoom_updating.disableBehaviors && changed.disableBehaviors) {
					newState.disableBehaviors = childState.disableBehaviors;
				}

				if (!d3zoom_updating.gcx && changed.gcx) {
					newState.gcx = childState.gcx;
				}

				if (!d3zoom_updating.gcy && changed.gcy) {
					newState.gcy = childState.gcy;
				}
				component._set(newState);
				d3zoom_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			d3zoom._bind({ scale: 1, translateX: 1, translateY: 1, mouseOver: 1, mouseGlobalPosition: 1, extent: 1, scrollWheel: 1, disableBehaviors: 1, gcx: 1, gcy: 1 }, d3zoom.get());
		});

		component.refs.d3Zoom = d3zoom;

		return {
			c: function create() {
				radar._fragment.c();
				text0 = createText("\n\n\n");
				if (if_block0) if_block0.c();
				text1 = createText("\n\n");
				div = createElement("div");
				canvas0 = createElement("canvas");
				text2 = createText("\n    ");
				canvas1 = createElement("canvas");
				text3 = createText("\n    ");
				if (if_block1) if_block1.c();
				if_block1_anchor = createComment();
				d3zoom._fragment.c();
				canvas0.width = canvas0_width_value = ctx.viewWidth * ctx.screenResolution;
				canvas0.height = canvas0_height_value = ctx.viewHeight * ctx.screenResolution;
				canvas0.className = "svelte-w9b5xg svelte-ref-canvas";
				addLoc(canvas0, file$g, 37, 4, 576);
				canvas1.width = canvas1_width_value = ctx.viewWidth * ctx.screenResolution;
				canvas1.height = canvas1_height_value = ctx.viewHeight * ctx.screenResolution;
				canvas1.className = "svelte-w9b5xg svelte-ref-labelsCanvas";
				addLoc(canvas1, file$g, 41, 4, 702);
				div.className = "svelte-w9b5xg svelte-ref-root";
				addLoc(div, file$g, 18, 0, 241);
			},

			m: function mount(target, anchor) {
				radar._mount(target, anchor);
				insert(target, text0, anchor);
				if (if_block0) if_block0.m(target, anchor);
				insert(target, text1, anchor);
				insert(target, div, anchor);
				append(d3zoom._slotted.default, canvas0);
				component.refs.canvas = canvas0;
				append(d3zoom._slotted.default, text2);
				append(d3zoom._slotted.default, canvas1);
				component.refs.labelsCanvas = canvas1;
				append(d3zoom._slotted.default, text3);
				if (if_block1) if_block1.m(d3zoom._slotted.default, null);
				append(d3zoom._slotted.default, if_block1_anchor);
				d3zoom._mount(div, null);
				component.refs.root = div;
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
						if_block0 = create_if_block_1$1(component, ctx);
						if_block0.c();
						if_block0.m(text1.parentNode, text1);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if ((changed.viewWidth || changed.screenResolution) && canvas0_width_value !== (canvas0_width_value = ctx.viewWidth * ctx.screenResolution)) {
					canvas0.width = canvas0_width_value;
				}

				if ((changed.viewHeight || changed.screenResolution) && canvas0_height_value !== (canvas0_height_value = ctx.viewHeight * ctx.screenResolution)) {
					canvas0.height = canvas0_height_value;
				}

				if ((changed.viewWidth || changed.screenResolution) && canvas1_width_value !== (canvas1_width_value = ctx.viewWidth * ctx.screenResolution)) {
					canvas1.width = canvas1_width_value;
				}

				if ((changed.viewHeight || changed.screenResolution) && canvas1_height_value !== (canvas1_height_value = ctx.viewHeight * ctx.screenResolution)) {
					canvas1.height = canvas1_height_value;
				}

				if (ctx.showHoverIcon) {
					if (if_block1) {
						if_block1.p(changed, ctx);
					} else {
						if_block1 = create_if_block$2(component, ctx);
						if_block1.c();
						if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				var d3zoom_changes = {};
				if (changed.viewWidth) d3zoom_changes.clientWidth = ctx.viewWidth;
				if (changed.viewHeight) d3zoom_changes.clientHeight = ctx.viewHeight;
				if (changed.homeX) d3zoom_changes.homeX = ctx.homeX;
				if (changed.homeY) d3zoom_changes.homeY = ctx.homeY;
				if (changed.homeScale) d3zoom_changes.homeScale = ctx.homeScale;
				if (!d3zoom_updating.scale && changed.scale) {
					d3zoom_changes.scale = ctx.scale
	    ;
					d3zoom_updating.scale = ctx.scale
	     !== void 0;
				}
				if (!d3zoom_updating.translateX && changed.translateX) {
					d3zoom_changes.translateX = ctx.translateX
	    ;
					d3zoom_updating.translateX = ctx.translateX
	     !== void 0;
				}
				if (!d3zoom_updating.translateY && changed.translateY) {
					d3zoom_changes.translateY = ctx.translateY
	    ;
					d3zoom_updating.translateY = ctx.translateY
	     !== void 0;
				}
				if (!d3zoom_updating.mouseOver && changed.mouseOver) {
					d3zoom_changes.mouseOver = ctx.mouseOver
	    ;
					d3zoom_updating.mouseOver = ctx.mouseOver
	     !== void 0;
				}
				if (!d3zoom_updating.mouseGlobalPosition && changed.mouseGlobalPosition) {
					d3zoom_changes.mouseGlobalPosition = ctx.mouseGlobalPosition
	    ;
					d3zoom_updating.mouseGlobalPosition = ctx.mouseGlobalPosition
	     !== void 0;
				}
				if (!d3zoom_updating.extent && changed.extent) {
					d3zoom_changes.extent = ctx.extent
	    ;
					d3zoom_updating.extent = ctx.extent
	     !== void 0;
				}
				if (!d3zoom_updating.scrollWheel && changed.scrollWheel) {
					d3zoom_changes.scrollWheel = ctx.scrollWheel
	    ;
					d3zoom_updating.scrollWheel = ctx.scrollWheel
	     !== void 0;
				}
				if (!d3zoom_updating.disableBehaviors && changed.disableBehaviors) {
					d3zoom_changes.disableBehaviors = ctx.disableBehaviors
	    ;
					d3zoom_updating.disableBehaviors = ctx.disableBehaviors
	     !== void 0;
				}
				if (!d3zoom_updating.gcx && changed.gcx) {
					d3zoom_changes.gcx = ctx.gcx
	    ;
					d3zoom_updating.gcx = ctx.gcx
	     !== void 0;
				}
				if (!d3zoom_updating.gcy && changed.gcy) {
					d3zoom_changes.gcy = ctx.gcy
	    ;
					d3zoom_updating.gcy = ctx.gcy
	     !== void 0;
				}
				d3zoom._set(d3zoom_changes);
				d3zoom_updating = {};
			},

			d: function destroy$$1(detach) {
				window.removeEventListener("resize", onwindowresize);

				radar.destroy(detach);
				if (detach) {
					detachNode(text0);
				}

				if (if_block0) if_block0.d(detach);
				if (detach) {
					detachNode(text1);
					detachNode(div);
				}

				if (component.refs.canvas === canvas0) component.refs.canvas = null;
				if (component.refs.labelsCanvas === canvas1) component.refs.labelsCanvas = null;
				if (if_block1) if_block1.d();
				d3zoom.destroy();
				if (component.refs.d3Zoom === d3zoom) component.refs.d3Zoom = null;
				if (component.refs.root === div) component.refs.root = null;
			}
		};
	}

	// (5:0) {#if ready}
	function create_if_block_1$1(component, ctx) {
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
		if (ctx.loading
	   !== void 0) {
			atlasdataloader_initial_data.loading = ctx.loading
	  ;
			atlasdataloader_updating.loading = true;
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

				if (!atlasdataloader_updating.loading && changed.loading) {
					newState.loading = childState.loading;
				}
				component._set(newState);
				atlasdataloader_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlasdataloader._bind({ config: 1, layers: 1, labels: 1, loading: 1 }, atlasdataloader.get());
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
				if (!atlasdataloader_updating.loading && changed.loading) {
					atlasdataloader_changes.loading = ctx.loading
	  ;
					atlasdataloader_updating.loading = ctx.loading
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

	// (46:4) {#if showHoverIcon}
	function create_if_block$2(component, ctx) {
		var div;

		return {
			c: function create() {
				div = createElement("div");
				setStyle(div, "left", "" + ctx.hoverIconX + "px");
				setStyle(div, "top", "" + ctx.hoverIconY + "px");
				setStyle(div, "width", "" + ctx.hoverIconW + "px");
				setStyle(div, "height", "" + ctx.hoverIconW + "px");
				div.className = "svelte-w9b5xg svelte-ref-hover";
				addLoc(div, file$g, 46, 4, 858);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				component.refs.hover = div;
			},

			p: function update(changed, ctx) {
				if (changed.hoverIconX) {
					setStyle(div, "left", "" + ctx.hoverIconX + "px");
				}

				if (changed.hoverIconY) {
					setStyle(div, "top", "" + ctx.hoverIconY + "px");
				}

				if (changed.hoverIconW) {
					setStyle(div, "width", "" + ctx.hoverIconW + "px");
					setStyle(div, "height", "" + ctx.hoverIconW + "px");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				if (component.refs.hover === div) component.refs.hover = null;
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
		this._state = assign(data$d(), options.data);

		this._recompute({ layers: 1, layer: 1, viewWidth: 1, screenResolution: 1, viewHeight: 1, scale: 1, gridSize: 1, config: 1, classHeatmap: 1, w: 1, h: 1, autoGridSizeMultiplier: 1, currentZoomIndex: 1, labelsBufferContext: 1, labels: 1, fontSize: 1, textColor: 1, textShadowColor: 1, currentLayerData: 1, mouseGlobalPosition: 1, translateX: 1, translateY: 1, hoverIconData: 1, enableHover: 1 }, this._state);
		if (!('layers' in this._state)) console.warn("<Atlas> was created without expected data property 'layers'");
		if (!('layer' in this._state)) console.warn("<Atlas> was created without expected data property 'layer'");
		if (!('viewWidth' in this._state)) console.warn("<Atlas> was created without expected data property 'viewWidth'");
		if (!('screenResolution' in this._state)) console.warn("<Atlas> was created without expected data property 'screenResolution'");
		if (!('viewHeight' in this._state)) console.warn("<Atlas> was created without expected data property 'viewHeight'");
		if (!('scale' in this._state)) console.warn("<Atlas> was created without expected data property 'scale'");
		if (!('gridSize' in this._state)) console.warn("<Atlas> was created without expected data property 'gridSize'");
		if (!('config' in this._state)) console.warn("<Atlas> was created without expected data property 'config'");
		if (!('classHeatmap' in this._state)) console.warn("<Atlas> was created without expected data property 'classHeatmap'");


		if (!('autoGridSizeMultiplier' in this._state)) console.warn("<Atlas> was created without expected data property 'autoGridSizeMultiplier'");

		if (!('labelsBufferContext' in this._state)) console.warn("<Atlas> was created without expected data property 'labelsBufferContext'");
		if (!('labels' in this._state)) console.warn("<Atlas> was created without expected data property 'labels'");
		if (!('fontSize' in this._state)) console.warn("<Atlas> was created without expected data property 'fontSize'");
		if (!('textColor' in this._state)) console.warn("<Atlas> was created without expected data property 'textColor'");
		if (!('textShadowColor' in this._state)) console.warn("<Atlas> was created without expected data property 'textShadowColor'");

		if (!('mouseGlobalPosition' in this._state)) console.warn("<Atlas> was created without expected data property 'mouseGlobalPosition'");

		if (!('translateX' in this._state)) console.warn("<Atlas> was created without expected data property 'translateX'");
		if (!('translateY' in this._state)) console.warn("<Atlas> was created without expected data property 'translateY'");
		if (!('enableHover' in this._state)) console.warn("<Atlas> was created without expected data property 'enableHover'");
		if (!('ready' in this._state)) console.warn("<Atlas> was created without expected data property 'ready'");
		if (!('id' in this._state)) console.warn("<Atlas> was created without expected data property 'id'");
		if (!('layout' in this._state)) console.warn("<Atlas> was created without expected data property 'layout'");
		if (!('classFilter' in this._state)) console.warn("<Atlas> was created without expected data property 'classFilter'");
		if (!('filter' in this._state)) console.warn("<Atlas> was created without expected data property 'filter'");
		if (!('loading' in this._state)) console.warn("<Atlas> was created without expected data property 'loading'");
		if (!('mouseOver' in this._state)) console.warn("<Atlas> was created without expected data property 'mouseOver'");
		if (!('extent' in this._state)) console.warn("<Atlas> was created without expected data property 'extent'");
		if (!('scrollWheel' in this._state)) console.warn("<Atlas> was created without expected data property 'scrollWheel'");
		if (!('disableBehaviors' in this._state)) console.warn("<Atlas> was created without expected data property 'disableBehaviors'");
		if (!('gcx' in this._state)) console.warn("<Atlas> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<Atlas> was created without expected data property 'gcy'");
		if (!('homeX' in this._state)) console.warn("<Atlas> was created without expected data property 'homeX'");
		if (!('homeY' in this._state)) console.warn("<Atlas> was created without expected data property 'homeY'");
		if (!('homeScale' in this._state)) console.warn("<Atlas> was created without expected data property 'homeScale'");
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

	assign(Atlas.prototype, protoDev);
	assign(Atlas.prototype, methods$4);

	Atlas.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('maxAttributionValue' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'maxAttributionValue'");
		if ('w' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'w'");
		if ('h' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'h'");
		if ('currentZoomIndex' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'currentZoomIndex'");
		if ('currentLayerData' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'currentLayerData'");
		if ('labelsBuffer' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'labelsBuffer'");
		if ('hoverIconData' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'hoverIconData'");
		if ('showHover' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'showHover'");
		if ('hoverIconX' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'hoverIconX'");
		if ('hoverIconY' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'hoverIconY'");
		if ('hoverIconW' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'hoverIconW'");
		if ('showHoverIcon' in newState && !this._updatingReadonlyProperty) throw new Error("<Atlas>: Cannot set read-only property 'showHoverIcon'");
	};

	Atlas.prototype._recompute = function _recompute(changed, state) {
		if (changed.layers || changed.layer) {
			if (this._differs(state.maxAttributionValue, (state.maxAttributionValue = maxAttributionValue(state)))) changed.maxAttributionValue = true;
		}

		if (changed.viewWidth || changed.screenResolution) {
			if (this._differs(state.w, (state.w = w(state)))) changed.w = true;
		}

		if (changed.viewHeight || changed.screenResolution) {
			if (this._differs(state.h, (state.h = h(state)))) changed.h = true;
		}

		if (changed.scale || changed.gridSize || changed.config || changed.classHeatmap || changed.w || changed.h || changed.autoGridSizeMultiplier) {
			if (this._differs(state.currentZoomIndex, (state.currentZoomIndex = currentZoomIndex(state)))) changed.currentZoomIndex = true;
		}

		if (changed.currentZoomIndex || changed.layers) {
			if (this._differs(state.currentLayerData, (state.currentLayerData = currentLayerData(state)))) changed.currentLayerData = true;
		}

		if (changed.labelsBufferContext || changed.labels || changed.fontSize || changed.textColor || changed.textShadowColor) {
			if (this._differs(state.labelsBuffer, (state.labelsBuffer = labelsBuffer(state)))) changed.labelsBuffer = true;
		}

		if (changed.currentLayerData || changed.config || changed.mouseGlobalPosition || changed.w || changed.h || changed.translateX || changed.translateY) {
			if (this._differs(state.hoverIconData, (state.hoverIconData = hoverIconData(state)))) changed.hoverIconData = true;
		}

		if (changed.hoverIconData || changed.mouseGlobalPosition) {
			if (this._differs(state.showHover, (state.showHover = showHover(state)))) changed.showHover = true;
		}

		if (changed.hoverIconData || changed.scale || changed.w || changed.h || changed.translateX) {
			if (this._differs(state.hoverIconX, (state.hoverIconX = hoverIconX(state)))) changed.hoverIconX = true;
		}

		if (changed.hoverIconData || changed.scale || changed.w || changed.h || changed.translateY) {
			if (this._differs(state.hoverIconY, (state.hoverIconY = hoverIconY(state)))) changed.hoverIconY = true;
		}

		if (changed.hoverIconData || changed.scale || changed.w || changed.h) {
			if (this._differs(state.hoverIconW, (state.hoverIconW = hoverIconW(state)))) changed.hoverIconW = true;
		}

		if (changed.mouseGlobalPosition || changed.hoverIconData || changed.enableHover) {
			if (this._differs(state.showHoverIcon, (state.showHoverIcon = showHoverIcon(state)))) changed.showHoverIcon = true;
		}
	};

	/* src/library/App/Panel.html generated by Svelte v2.15.3 */

	const file$h = "src/library/App/Panel.html";

	function create_main_fragment$i(component, ctx) {
		var div2, div0, slot_content_head = component._slotted.head, text, div1, slot_content_body = component._slotted.body;

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				text = createText("\n  ");
				div1 = createElement("div");
				div0.className = "head svelte-l56anp";
				addLoc(div0, file$h, 1, 2, 21);
				div1.className = "body svelte-l56anp";
				addLoc(div1, file$h, 4, 2, 81);
				div2.className = "root svelte-l56anp";
				addLoc(div2, file$h, 0, 0, 0);
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

		this._fragment = create_main_fragment$i(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(Panel.prototype, protoDev);

	Panel.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/ResponsiveResizer.html generated by Svelte v2.15.3 */

	function scale({clientWidth, minWidth}) {
		return clientWidth / Math.max(clientWidth, minWidth);
	}

	function finalWidth({clientWidth, width, minWidth}) {
	  return Math.max(clientWidth, minWidth) + "px";
	}

	function finalHeight({clientHeight, scale}) {
	  return clientHeight / scale + "px";
	}

	function data$e() {
	  return {
	    style: "",
	    aspectRatio: 1,
	    minWidth: 800,
	    clientWidth: 1000,
	    clientHeight: 1000,
	  }
	}
	const file$i = "src/library/ResponsiveResizer.html";

	function create_main_fragment$j(component, ctx) {
		var div1, div0, slot_content_default = component._slotted.default;

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				setStyle(div0, "transform", "scale(" + ctx.scale + ")");
				setStyle(div0, "width", ctx.finalWidth);
				setStyle(div0, "height", "" + ctx.finalHeight + ctx.style + "\n    ");
				div0.className = "svelte-fkjf8u svelte-ref-frame";
				addLoc(div0, file$i, 12, 2, 321);
				div1.className = "svelte-fkjf8u svelte-ref-root";
				addLoc(div1, file$i, 11, 0, 304);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);

				if (slot_content_default) {
					append(div0, slot_content_default);
				}

				component.refs.frame = div0;
				component.refs.root = div1;
			},

			p: function update(changed, ctx) {
				if (changed.scale) {
					setStyle(div0, "transform", "scale(" + ctx.scale + ")");
				}

				if (changed.finalWidth) {
					setStyle(div0, "width", ctx.finalWidth);
				}

				if (changed.finalHeight || changed.style) {
					setStyle(div0, "height", "" + ctx.finalHeight + ctx.style + "\n    ");
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				if (slot_content_default) {
					reinsertChildren(div0, slot_content_default);
				}

				if (component.refs.frame === div0) component.refs.frame = null;
				if (component.refs.root === div1) component.refs.root = null;
			}
		};
	}

	function ResponsiveResizer(options) {
		this._debugName = '<ResponsiveResizer>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$e(), options.data);

		this._recompute({ clientWidth: 1, minWidth: 1, width: 1, clientHeight: 1, scale: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<ResponsiveResizer> was created without expected data property 'clientWidth'");
		if (!('minWidth' in this._state)) console.warn("<ResponsiveResizer> was created without expected data property 'minWidth'");
		if (!('width' in this._state)) console.warn("<ResponsiveResizer> was created without expected data property 'width'");
		if (!('clientHeight' in this._state)) console.warn("<ResponsiveResizer> was created without expected data property 'clientHeight'");



		if (!('style' in this._state)) console.warn("<ResponsiveResizer> was created without expected data property 'style'");
		this._intro = true;

		this._slotted = options.slots || {};

		this._fragment = create_main_fragment$j(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(ResponsiveResizer.prototype, protoDev);

	ResponsiveResizer.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('scale' in newState && !this._updatingReadonlyProperty) throw new Error("<ResponsiveResizer>: Cannot set read-only property 'scale'");
		if ('finalWidth' in newState && !this._updatingReadonlyProperty) throw new Error("<ResponsiveResizer>: Cannot set read-only property 'finalWidth'");
		if ('finalHeight' in newState && !this._updatingReadonlyProperty) throw new Error("<ResponsiveResizer>: Cannot set read-only property 'finalHeight'");
	};

	ResponsiveResizer.prototype._recompute = function _recompute(changed, state) {
		if (changed.clientWidth || changed.minWidth) {
			if (this._differs(state.scale, (state.scale = scale(state)))) changed.scale = true;
		}

		if (changed.clientWidth || changed.width || changed.minWidth) {
			if (this._differs(state.finalWidth, (state.finalWidth = finalWidth(state)))) changed.finalWidth = true;
		}

		if (changed.clientHeight || changed.scale) {
			if (this._differs(state.finalHeight, (state.finalHeight = finalHeight(state)))) changed.finalHeight = true;
		}
	};

	/* src/components/App.html generated by Svelte v2.15.3 */



	const formatFloat = format(".3f");

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
	    shareLink: false,
	    backLink: false
	  }
	}
	var format_1 = formatFloat;

	var methods$5 = {
	  home(duration) {
	    this.refs.atlas.home(duration);
	  },
	  zoomTo(x, y, scale, duration = 1000) {
	    this.refs.atlas.zoomTo(x, y, scale, duration);
	  },
	  toggle() {
	    const {showOptions} = this.get();
	    this.set({
	      showOptions: !showOptions
	    });
	  },
	  copyShareLink() {
	    const {layerName} = this.get();
	    const {gcx, gcy, scale} = this.refs.atlas.get();
	    const query = `layer=${encodeURIComponent(layerName)}&poi=${[gcx, gcy, scale].map(formatFloat).join(",")}`;
	    const url = locationWithoutQuery() + "?" + query;
	    window.navigator.clipboard.writeText(url).then(function() {
	      console.log("Copied to clipboard");
	    }, function() {
	      console.error("Unable to copy to clipboard");
	    });
	  }
	};

	function oncreate$6() {
	  const {loadTarget} = this.get();
	  const query = new URLSearchParams(window.location.search);
	  if (query.has("layer")) {
	    const layerName = decodeURIComponent(query.get("layer"));
	    this.set({layerName});
	  }
	  if (loadTarget) {
	    setTimeout(() => {
	    this.zoomTo(loadTarget.x, loadTarget.y, loadTarget.scale, 0);
	    }, 10);
	  }
	  if (query.has("poi")) {
	    const poiString = query.get("poi");
	    const parts = poiString.split(",").map(parseFloat);
	    setTimeout(() => {
	      this.zoomTo(...parts, 4000);
	    }, 1000);
	  }
	}
	const file$j = "src/components/App.html";

	function create_main_fragment$k(component, ctx) {
		var div27, aside, text0, div4, div1, h20, text2, div0, appclassfilter_updating = {}, text3, div3, h21, text5, div2, applayerchooser_updating = {}, text6, div26, div25, atlas_updating = {}, text7, div24, div8, div6, div5, appminimap_updating = {}, text8, div7, text9, text10, text11, div22, div9, label0, input0, text12, text13, label1, input1, text14, text15, label2, input2, text16, text17, text18, div21, div20, div12, h30, text20, label3, input3, text21, text22, label4, input4, text23, text24, label5, input5, text25, text26, label6, input6, text27, text28, label7, input7, text29, text30, label8, input8, text31, text32, div11, div10, text33, raw0_before, text34, input9, text35, div13, h31, text36, raw1_before, text37, input10, text38, div15, h32, text40, label9, input11, text41, text42, label10, input12, text43, text44, div14, text45, raw2_before, text46, input13, text47, div19, h33, text49, div16, text50, text51_value = format_1(ctx.gcx), text51, text52, div17, text53, text54_value = format_1(ctx.gcy), text54, text55, div18, text56, text57_value = format_1(ctx.scale), text57, text58, div23, button3, raw3_value = ctx.showOptions ? 'fewer options' : 'more options', div24_class_value;

		var if_block0 = (ctx.backLink) && create_if_block_1$2(component, ctx);

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
		 	classHeatmap: ctx.classHeatmap,
		 	homeX: ctx.homeX,
		 	homeY: ctx.homeY,
		 	homeScale: ctx.homeScale
		 };
		if (ctx.density
	           !== void 0) {
			atlas_initial_data.density = ctx.density
	          ;
			atlas_updating.density = true;
		}
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
		if (ctx.autoGridSizeMultiplier
	           !== void 0) {
			atlas_initial_data.autoGridSizeMultiplier = ctx.autoGridSizeMultiplier
	          ;
			atlas_updating.autoGridSizeMultiplier = true;
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
		if (ctx.enableHover
	           !== void 0) {
			atlas_initial_data.enableHover = ctx.enableHover
	          ;
			atlas_updating.enableHover = true;
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
		if (ctx.extent
	           !== void 0) {
			atlas_initial_data.extent = ctx.extent
	          ;
			atlas_updating.extent = true;
		}
		if (ctx.$scroll !== void 0) {
			atlas_initial_data.scrollWheel = ctx.$scroll;
			atlas_updating.scrollWheel = true;
		}
		var atlas = new Atlas({
			root: component.root,
			store: component.store,
			data: atlas_initial_data,
			_bind(changed, childState) {
				var newState = {}, newStoreState = {};
				if (!atlas_updating.density && changed.density) {
					newState.density = childState.density;
				}

				if (!atlas_updating.iconCrop && changed.iconCrop) {
					newState.iconCrop = childState.iconCrop;
				}

				if (!atlas_updating.classHeatmapMultiplier && changed.classHeatmapMultiplier) {
					newState.classHeatmapMultiplier = childState.classHeatmapMultiplier;
				}

				if (!atlas_updating.classHeatmapPositive && changed.classHeatmapPositive) {
					newState.classHeatmapPositive = childState.classHeatmapPositive;
				}

				if (!atlas_updating.autoGridSizeMultiplier && changed.autoGridSizeMultiplier) {
					newState.autoGridSizeMultiplier = childState.autoGridSizeMultiplier;
				}

				if (!atlas_updating.gridSize && changed.gridSize) {
					newState.gridSize = childState.gridSize;
				}

				if (!atlas_updating.showLabels && changed.showLabels) {
					newState.showLabels = childState.showLabels;
				}

				if (!atlas_updating.enableHover && changed.enableHover) {
					newState.enableHover = childState.enableHover;
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

				if (!atlas_updating.extent && changed.extent) {
					newState.extent = childState.extent;
				}

				if (!atlas_updating.scrollWheel && changed.scrollWheel) {
					newStoreState.scroll = childState.scrollWheel;
				}
				component.store.set(newStoreState);
				component._set(newState);
				atlas_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			atlas._bind({ density: 1, iconCrop: 1, classHeatmapMultiplier: 1, classHeatmapPositive: 1, autoGridSizeMultiplier: 1, gridSize: 1, showLabels: 1, enableHover: 1, scale: 1, gcx: 1, gcy: 1, extent: 1, scrollWheel: 1 }, atlas.get());
		});

		component.refs.atlas = atlas;

		var appminimap_initial_data = {
		 	id: "inceptionv1_" + ctx.layerName,
		 	layerName: ctx.layerName,
		 	enableDragging: true,
		 	classHeatmap: ctx.classHeatmap,
		 	scaleCountFactor: ctx.scaleCountFactor
		 };
		if (ctx.extent
	                   !== void 0) {
			appminimap_initial_data.extent = ctx.extent
	                  ;
			appminimap_updating.extent = true;
		}
		var appminimap = new AppMiniMap({
			root: component.root,
			store: component.store,
			data: appminimap_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!appminimap_updating.extent && changed.extent) {
					newState.extent = childState.extent;
				}
				component._set(newState);
				appminimap_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			appminimap._bind({ extent: 1 }, appminimap.get());
		});

		appminimap.on("drag", function(event) {
			component.refs.atlas.translateTo(event.gcx, event.gcy);
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
			component.refs.atlas.home(3000);
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
			component.refs.atlas.scaleBy(2);
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
			component.refs.atlas.scaleBy(0.5);
		});

		function input0_change_handler() {
			component.set({ showLabels: input0.checked });
		}

		function input1_change_handler() {
			component.set({ enableHover: input1.checked });
		}

		function input2_change_handler() {
			component.store.set({ scroll: input2.checked });
		}

		var if_block1 = (ctx.shareLink) && create_if_block$3(component, ctx);

		function input3_change_handler() {
			component.set({ gridSize: input3.__value });
		}

		function input4_change_handler() {
			component.set({ gridSize: input4.__value });
		}

		function input5_change_handler() {
			component.set({ gridSize: input5.__value });
		}

		function input6_change_handler() {
			component.set({ gridSize: input6.__value });
		}

		function input7_change_handler() {
			component.set({ gridSize: input7.__value });
		}

		function input8_change_handler() {
			component.set({ gridSize: input8.__value });
		}

		function input9_change_input_handler() {
			component.set({ autoGridSizeMultiplier: toNumber(input9.value) });
		}

		function input10_change_input_handler() {
			component.set({ density: toNumber(input10.value) });
		}

		function input11_change_handler() {
			component.set({ classHeatmapPositive: input11.__value });
		}

		function input12_change_handler() {
			component.set({ classHeatmapPositive: input12.__value });
		}

		function input13_change_input_handler() {
			component.set({ classHeatmapMultiplier: toNumber(input13.value) });
		}

		function click_handler(event) {
			component.toggle();
		}

		var responsiveresizer_initial_data = {
		 	clientWidth: ctx.clientWidth,
		 	clientHeight: ctx.clientHeight,
		 	minWidth: 768
		 };
		var responsiveresizer = new ResponsiveResizer({
			root: component.root,
			store: component.store,
			slots: { default: createFragment() },
			data: responsiveresizer_initial_data
		});

		return {
			c: function create() {
				div27 = createElement("div");
				aside = createElement("aside");
				if (if_block0) if_block0.c();
				text0 = createText("\n    ");
				div4 = createElement("div");
				div1 = createElement("div");
				h20 = createElement("h2");
				h20.textContent = "Class Filter";
				text2 = createText("\n          ");
				div0 = createElement("div");
				appclassfilter._fragment.c();
				panel0._fragment.c();
				text3 = createText("\n      ");
				div3 = createElement("div");
				h21 = createElement("h2");
				h21.textContent = "Layer";
				text5 = createText("\n          ");
				div2 = createElement("div");
				applayerchooser._fragment.c();
				panel1._fragment.c();
				text6 = createText("\n  ");
				div26 = createElement("div");
				div25 = createElement("div");
				atlas._fragment.c();
				text7 = createText("\n        ");
				div24 = createElement("div");
				div8 = createElement("div");
				div6 = createElement("div");
				div5 = createElement("div");
				appminimap._fragment.c();
				text8 = createText("\n            ");
				div7 = createElement("div");
				navigation0._fragment.c();
				button0._fragment.c();
				text9 = createText("\n              ");
				navigation1._fragment.c();
				button1._fragment.c();
				text10 = createText("\n              ");
				navigation2._fragment.c();
				button2._fragment.c();
				text11 = createText("\n          ");
				div22 = createElement("div");
				div9 = createElement("div");
				label0 = createElement("label");
				input0 = createElement("input");
				text12 = createText(" attribution labels");
				text13 = createText("\n              ");
				label1 = createElement("label");
				input1 = createElement("input");
				text14 = createText(" show tooltip");
				text15 = createText("\n              ");
				label2 = createElement("label");
				input2 = createElement("input");
				text16 = createText(" scroll to zoom");
				text17 = createText("\n              ");
				if (if_block1) if_block1.c();
				text18 = createText("\n            ");
				div21 = createElement("div");
				div20 = createElement("div");
				div12 = createElement("div");
				h30 = createElement("h3");
				h30.textContent = "Grid size";
				text20 = createText("\n                  ");
				label3 = createElement("label");
				input3 = createElement("input");
				text21 = createText(" 20x20");
				text22 = createText("\n                  ");
				label4 = createElement("label");
				input4 = createElement("input");
				text23 = createText(" 40x40");
				text24 = createText("\n                  ");
				label5 = createElement("label");
				input5 = createElement("input");
				text25 = createText(" 80x80");
				text26 = createText("\n                  ");
				label6 = createElement("label");
				input6 = createElement("input");
				text27 = createText(" 160x160");
				text28 = createText("\n                  ");
				label7 = createElement("label");
				input7 = createElement("input");
				text29 = createText(" 320x320");
				text30 = createText("\n                  ");
				label8 = createElement("label");
				input8 = createElement("input");
				text31 = createText(" auto");
				text32 = createText("\n                  ");
				div11 = createElement("div");
				div10 = createElement("div");
				text33 = createText("auto threshold: ");
				raw0_before = createElement('noscript');
				text34 = createText("\n                    ");
				input9 = createElement("input");
				text35 = createText("\n                ");
				div13 = createElement("div");
				h31 = createElement("h3");
				text36 = createText("Icon density: ");
				raw1_before = createElement('noscript');
				text37 = createText("\n                  ");
				input10 = createElement("input");
				text38 = createText("\n                ");
				div15 = createElement("div");
				h32 = createElement("h3");
				h32.textContent = "Class filter";
				text40 = createText("\n                  ");
				label9 = createElement("label");
				input11 = createElement("input");
				text41 = createText(" positive influence");
				text42 = createText("\n                  ");
				label10 = createElement("label");
				input12 = createElement("input");
				text43 = createText(" negative influence");
				text44 = createText("\n                  ");
				div14 = createElement("div");
				text45 = createText("Intensity: ");
				raw2_before = createElement('noscript');
				text46 = createText("\n                  ");
				input13 = createElement("input");
				text47 = createText("\n                ");
				div19 = createElement("div");
				h33 = createElement("h3");
				h33.textContent = "Location";
				text49 = createText("\n                  ");
				div16 = createElement("div");
				text50 = createText("x: ");
				text51 = createText(text51_value);
				text52 = createText("\n                  ");
				div17 = createElement("div");
				text53 = createText("y: ");
				text54 = createText(text54_value);
				text55 = createText("\n                  ");
				div18 = createElement("div");
				text56 = createText("scale: ");
				text57 = createText(text57_value);
				text58 = createText("\n          ");
				div23 = createElement("div");
				button3 = createElement("button");
				responsiveresizer._fragment.c();
				setAttribute(h20, "slot", "head");
				addLoc(h20, file$j, 9, 10, 346);
				setAttribute(div0, "slot", "body");
				addLoc(div0, file$j, 10, 10, 390);
				div1.className = "filter svelte-l7caws";
				setStyle(div1, "display", (ctx.showClassFilter ? 'block' : 'none'));
				addLoc(div1, file$j, 7, 6, 245);
				setAttribute(h21, "slot", "head");
				addLoc(h21, file$j, 19, 10, 638);
				setAttribute(div2, "slot", "body");
				addLoc(div2, file$j, 20, 10, 675);
				div3.className = "stack svelte-l7caws";
				setStyle(div3, "display", (ctx.showLayerChooser ? 'block' : 'none'));
				addLoc(div3, file$j, 17, 6, 536);
				div4.className = "panels svelte-l7caws";
				addLoc(div4, file$j, 6, 4, 218);
				aside.className = "sidebar svelte-l7caws";
				addLoc(aside, file$j, 2, 2, 92);
				div5.className = "map-container svelte-l7caws";
				setStyle(div5, "width", "100px");
				setStyle(div5, "height", "100px");
				setStyle(div5, "position", "absolute");
				addLoc(div5, file$j, 59, 14, 1680);
				div6.className = "map svelte-l7caws";
				addLoc(div6, file$j, 58, 12, 1648);
				div7.className = "buttons svelte-l7caws";
				addLoc(div7, file$j, 71, 12, 2155);
				div8.className = "nav svelte-l7caws";
				addLoc(div8, file$j, 57, 10, 1618);
				addListener(input0, "change", input0_change_handler);
				setAttribute(input0, "type", "checkbox");
				addLoc(input0, file$j, 79, 91, 2687);
				setStyle(label0, "white-space", "nowrap");
				setStyle(label0, "text-overflow", "ellipsis");
				setStyle(label0, "overflow", "hidden");
				label0.className = "svelte-l7caws";
				addLoc(label0, file$j, 79, 14, 2610);
				addListener(input1, "change", input1_change_handler);
				setAttribute(input1, "type", "checkbox");
				addLoc(input1, file$j, 80, 21, 2781);
				label1.className = "svelte-l7caws";
				addLoc(label1, file$j, 80, 14, 2774);
				addListener(input2, "change", input2_change_handler);
				setAttribute(input2, "type", "checkbox");
				addLoc(input2, file$j, 81, 21, 2872);
				label2.className = "svelte-l7caws";
				addLoc(label2, file$j, 81, 14, 2865);
				div9.className = "essential";
				addLoc(div9, file$j, 78, 12, 2572);
				h30.className = "svelte-l7caws";
				addLoc(h30, file$j, 90, 18, 3298);
				component._bindingGroups[0].push(input3);
				addListener(input3, "change", input3_change_handler);
				setAttribute(input3, "type", "radio");
				input3.__value = 0;
				input3.value = input3.__value;
				addLoc(input3, file$j, 91, 25, 3342);
				label3.className = "svelte-l7caws";
				addLoc(label3, file$j, 91, 18, 3335);
				component._bindingGroups[0].push(input4);
				addListener(input4, "change", input4_change_handler);
				setAttribute(input4, "type", "radio");
				input4.__value = 1;
				input4.value = input4.__value;
				addLoc(input4, file$j, 92, 25, 3430);
				label4.className = "svelte-l7caws";
				addLoc(label4, file$j, 92, 18, 3423);
				component._bindingGroups[0].push(input5);
				addListener(input5, "change", input5_change_handler);
				setAttribute(input5, "type", "radio");
				input5.__value = 2;
				input5.value = input5.__value;
				addLoc(input5, file$j, 93, 25, 3518);
				label5.className = "svelte-l7caws";
				addLoc(label5, file$j, 93, 18, 3511);
				component._bindingGroups[0].push(input6);
				addListener(input6, "change", input6_change_handler);
				setAttribute(input6, "type", "radio");
				input6.__value = 3;
				input6.value = input6.__value;
				addLoc(input6, file$j, 94, 25, 3606);
				label6.className = "svelte-l7caws";
				addLoc(label6, file$j, 94, 18, 3599);
				component._bindingGroups[0].push(input7);
				addListener(input7, "change", input7_change_handler);
				setAttribute(input7, "type", "radio");
				input7.__value = 4;
				input7.value = input7.__value;
				addLoc(input7, file$j, 95, 25, 3696);
				label7.className = "svelte-l7caws";
				addLoc(label7, file$j, 95, 18, 3689);
				component._bindingGroups[0].push(input8);
				addListener(input8, "change", input8_change_handler);
				setAttribute(input8, "type", "radio");
				input8.__value = -1;
				input8.value = input8.__value;
				addLoc(input8, file$j, 96, 25, 3786);
				label8.className = "svelte-l7caws";
				addLoc(label8, file$j, 96, 18, 3779);
				addLoc(div10, file$j, 98, 20, 3945);
				addListener(input9, "change", input9_change_input_handler);
				addListener(input9, "input", input9_change_input_handler);
				setAttribute(input9, "type", "range");
				input9.min = 0.5;
				input9.max = 1.4;
				input9.step = 0.01;
				addLoc(input9, file$j, 99, 20, 4023);
				setStyle(div11, "display", (ctx.gridSize == -1 ? 'none': 'none'));
				addLoc(div11, file$j, 97, 18, 3867);
				div12.className = "section svelte-l7caws";
				addLoc(div12, file$j, 89, 16, 3258);
				h31.className = "svelte-l7caws";
				addLoc(h31, file$j, 103, 18, 4217);
				addListener(input10, "change", input10_change_input_handler);
				addListener(input10, "input", input10_change_input_handler);
				setAttribute(input10, "type", "range");
				input10.min = 0.2;
				input10.max = 8;
				input10.step = 0.01;
				addLoc(input10, file$j, 104, 18, 4274);
				div13.className = "section svelte-l7caws";
				addLoc(div13, file$j, 102, 16, 4176);
				h32.className = "svelte-l7caws";
				addLoc(h32, file$j, 110, 18, 4653);
				component._bindingGroups[1].push(input11);
				addListener(input11, "change", input11_change_handler);
				setAttribute(input11, "type", "radio");
				input11.__value = 1;
				input11.value = input11.__value;
				addLoc(input11, file$j, 111, 25, 4700);
				label9.className = "svelte-l7caws";
				addLoc(label9, file$j, 111, 18, 4693);
				component._bindingGroups[1].push(input12);
				addListener(input12, "change", input12_change_handler);
				setAttribute(input12, "type", "radio");
				input12.__value = -1;
				input12.value = input12.__value;
				addLoc(input12, file$j, 112, 25, 4813);
				label10.className = "svelte-l7caws";
				addLoc(label10, file$j, 112, 18, 4806);
				addLoc(div14, file$j, 113, 18, 4920);
				addListener(input13, "change", input13_change_input_handler);
				addListener(input13, "input", input13_change_input_handler);
				setAttribute(input13, "type", "range");
				input13.min = "0.5";
				input13.max = "2";
				input13.step = "0.1";
				addLoc(input13, file$j, 114, 18, 4991);
				div15.className = "section svelte-l7caws";
				setStyle(div15, "display", (ctx.classHeatmap > -1 ? 'block' : 'none'));
				addLoc(div15, file$j, 109, 16, 4556);
				h33.className = "svelte-l7caws";
				addLoc(h33, file$j, 117, 18, 5148);
				addLoc(div16, file$j, 118, 18, 5184);
				addLoc(div17, file$j, 119, 18, 5230);
				addLoc(div18, file$j, 120, 18, 5276);
				div19.className = "section svelte-l7caws";
				addLoc(div19, file$j, 116, 16, 5108);
				div20.className = "grid-size";
				addLoc(div20, file$j, 87, 14, 3201);
				div21.className = "expand svelte-l7caws";
				addLoc(div21, file$j, 86, 12, 3155);
				div22.className = "options svelte-l7caws";
				addLoc(div22, file$j, 77, 10, 2538);
				addListener(button3, "click", click_handler);
				button3.className = "svelte-l7caws";
				addLoc(button3, file$j, 126, 12, 5440);
				div23.className = "expand-toggle svelte-l7caws";
				addLoc(div23, file$j, 125, 10, 5400);
				div24.className = div24_class_value = "controls " + (ctx.showOptions ? 'open' : 'closed') + " svelte-l7caws" + " svelte-ref-controls";
				addLoc(div24, file$j, 56, 8, 1538);
				div25.className = "atlas svelte-l7caws";
				addLoc(div25, file$j, 31, 4, 889);
				div26.className = "main svelte-l7caws";
				addLoc(div26, file$j, 30, 2, 866);
				div27.className = "container svelte-l7caws";
				addLoc(div27, file$j, 1, 2, 66);
			},

			m: function mount(target, anchor) {
				append(responsiveresizer._slotted.default, div27);
				append(div27, aside);
				if (if_block0) if_block0.m(aside, null);
				append(aside, text0);
				append(aside, div4);
				append(div4, div1);
				append(panel0._slotted.head, h20);
				append(panel0._slotted.default, text2);
				append(panel0._slotted.body, div0);
				appclassfilter._mount(div0, null);
				panel0._mount(div1, null);
				append(div4, text3);
				append(div4, div3);
				append(panel1._slotted.head, h21);
				append(panel1._slotted.default, text5);
				append(panel1._slotted.body, div2);
				applayerchooser._mount(div2, null);
				panel1._mount(div3, null);
				append(div27, text6);
				append(div27, div26);
				append(div26, div25);
				atlas._mount(div25, null);
				append(div25, text7);
				append(div25, div24);
				append(div24, div8);
				append(div8, div6);
				append(div6, div5);
				appminimap._mount(div5, null);
				append(div8, text8);
				append(div8, div7);
				navigation0._mount(button0._slotted.default, null);
				button0._mount(div7, null);
				append(div7, text9);
				navigation1._mount(button1._slotted.default, null);
				button1._mount(div7, null);
				append(div7, text10);
				navigation2._mount(button2._slotted.default, null);
				button2._mount(div7, null);
				append(div24, text11);
				append(div24, div22);
				append(div22, div9);
				append(div9, label0);
				append(label0, input0);

				input0.checked = ctx.showLabels;

				append(label0, text12);
				append(div9, text13);
				append(div9, label1);
				append(label1, input1);

				input1.checked = ctx.enableHover;

				append(label1, text14);
				append(div9, text15);
				append(div9, label2);
				append(label2, input2);

				input2.checked = ctx.$scroll;

				append(label2, text16);
				append(div9, text17);
				if (if_block1) if_block1.m(div9, null);
				append(div22, text18);
				append(div22, div21);
				append(div21, div20);
				append(div20, div12);
				append(div12, h30);
				append(div12, text20);
				append(div12, label3);
				append(label3, input3);

				input3.checked = input3.__value === ctx.gridSize;

				append(label3, text21);
				append(div12, text22);
				append(div12, label4);
				append(label4, input4);

				input4.checked = input4.__value === ctx.gridSize;

				append(label4, text23);
				append(div12, text24);
				append(div12, label5);
				append(label5, input5);

				input5.checked = input5.__value === ctx.gridSize;

				append(label5, text25);
				append(div12, text26);
				append(div12, label6);
				append(label6, input6);

				input6.checked = input6.__value === ctx.gridSize;

				append(label6, text27);
				append(div12, text28);
				append(div12, label7);
				append(label7, input7);

				input7.checked = input7.__value === ctx.gridSize;

				append(label7, text29);
				append(div12, text30);
				append(div12, label8);
				append(label8, input8);

				input8.checked = input8.__value === ctx.gridSize;

				append(label8, text31);
				append(div12, text32);
				append(div12, div11);
				append(div11, div10);
				append(div10, text33);
				append(div10, raw0_before);
				raw0_before.insertAdjacentHTML("afterend", ctx.autoGridSizeMultiplier);
				append(div11, text34);
				append(div11, input9);

				input9.value = ctx.autoGridSizeMultiplier;

				append(div20, text35);
				append(div20, div13);
				append(div13, h31);
				append(h31, text36);
				append(h31, raw1_before);
				raw1_before.insertAdjacentHTML("afterend", ctx.density);
				append(div13, text37);
				append(div13, input10);

				input10.value = ctx.density;

				append(div20, text38);
				append(div20, div15);
				append(div15, h32);
				append(div15, text40);
				append(div15, label9);
				append(label9, input11);

				input11.checked = input11.__value === ctx.classHeatmapPositive;

				append(label9, text41);
				append(div15, text42);
				append(div15, label10);
				append(label10, input12);

				input12.checked = input12.__value === ctx.classHeatmapPositive;

				append(label10, text43);
				append(div15, text44);
				append(div15, div14);
				append(div14, text45);
				append(div14, raw2_before);
				raw2_before.insertAdjacentHTML("afterend", ctx.classHeatmapMultiplier);
				append(div15, text46);
				append(div15, input13);

				input13.value = ctx.classHeatmapMultiplier;

				append(div20, text47);
				append(div20, div19);
				append(div19, h33);
				append(div19, text49);
				append(div19, div16);
				append(div16, text50);
				append(div16, text51);
				append(div19, text52);
				append(div19, div17);
				append(div17, text53);
				append(div17, text54);
				append(div19, text55);
				append(div19, div18);
				append(div18, text56);
				append(div18, text57);
				component.refs.expand = div21;
				append(div24, text58);
				append(div24, div23);
				append(div23, button3);
				button3.innerHTML = raw3_value;
				component.refs.controls = div24;
				responsiveresizer._mount(target, anchor);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if (ctx.backLink) {
					if (if_block0) {
						if_block0.p(changed, ctx);
					} else {
						if_block0 = create_if_block_1$2(component, ctx);
						if_block0.c();
						if_block0.m(aside, text0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

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
				if (changed.classHeatmap) atlas_changes.classHeatmap = ctx.classHeatmap;
				if (changed.homeX) atlas_changes.homeX = ctx.homeX;
				if (changed.homeY) atlas_changes.homeY = ctx.homeY;
				if (changed.homeScale) atlas_changes.homeScale = ctx.homeScale;
				if (!atlas_updating.density && changed.density) {
					atlas_changes.density = ctx.density
	          ;
					atlas_updating.density = ctx.density
	           !== void 0;
				}
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
				if (!atlas_updating.autoGridSizeMultiplier && changed.autoGridSizeMultiplier) {
					atlas_changes.autoGridSizeMultiplier = ctx.autoGridSizeMultiplier
	          ;
					atlas_updating.autoGridSizeMultiplier = ctx.autoGridSizeMultiplier
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
				if (!atlas_updating.enableHover && changed.enableHover) {
					atlas_changes.enableHover = ctx.enableHover
	          ;
					atlas_updating.enableHover = ctx.enableHover
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
				if (!atlas_updating.extent && changed.extent) {
					atlas_changes.extent = ctx.extent
	          ;
					atlas_updating.extent = ctx.extent
	           !== void 0;
				}
				if (!atlas_updating.scrollWheel && changed.$scroll) {
					atlas_changes.scrollWheel = ctx.$scroll;
					atlas_updating.scrollWheel = ctx.$scroll !== void 0;
				}
				atlas._set(atlas_changes);
				atlas_updating = {};

				var appminimap_changes = {};
				if (changed.layerName) appminimap_changes.id = "inceptionv1_" + ctx.layerName;
				if (changed.layerName) appminimap_changes.layerName = ctx.layerName;
				if (changed.classHeatmap) appminimap_changes.classHeatmap = ctx.classHeatmap;
				if (changed.scaleCountFactor) appminimap_changes.scaleCountFactor = ctx.scaleCountFactor;
				if (!appminimap_updating.extent && changed.extent) {
					appminimap_changes.extent = ctx.extent
	                  ;
					appminimap_updating.extent = ctx.extent
	                   !== void 0;
				}
				appminimap._set(appminimap_changes);
				appminimap_updating = {};

				if (changed.showLabels) input0.checked = ctx.showLabels;
				if (changed.enableHover) input1.checked = ctx.enableHover;
				if (changed.$scroll) input2.checked = ctx.$scroll;

				if (ctx.shareLink) {
					if (!if_block1) {
						if_block1 = create_if_block$3(component, ctx);
						if_block1.c();
						if_block1.m(div9, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (changed.gridSize) input3.checked = input3.__value === ctx.gridSize;
				if (changed.gridSize) input4.checked = input4.__value === ctx.gridSize;
				if (changed.gridSize) input5.checked = input5.__value === ctx.gridSize;
				if (changed.gridSize) input6.checked = input6.__value === ctx.gridSize;
				if (changed.gridSize) input7.checked = input7.__value === ctx.gridSize;
				if (changed.gridSize) input8.checked = input8.__value === ctx.gridSize;
				if (changed.autoGridSizeMultiplier) {
					detachAfter(raw0_before);
					raw0_before.insertAdjacentHTML("afterend", ctx.autoGridSizeMultiplier);
				}

				if (changed.autoGridSizeMultiplier) input9.value = ctx.autoGridSizeMultiplier;
				if (changed.gridSize) {
					setStyle(div11, "display", (ctx.gridSize == -1 ? 'none': 'none'));
				}

				if (changed.density) {
					detachAfter(raw1_before);
					raw1_before.insertAdjacentHTML("afterend", ctx.density);
				}

				if (changed.density) input10.value = ctx.density;
				if (changed.classHeatmapPositive) input11.checked = input11.__value === ctx.classHeatmapPositive;
				if (changed.classHeatmapPositive) input12.checked = input12.__value === ctx.classHeatmapPositive;
				if (changed.classHeatmapMultiplier) {
					detachAfter(raw2_before);
					raw2_before.insertAdjacentHTML("afterend", ctx.classHeatmapMultiplier);
				}

				if (changed.classHeatmapMultiplier) input13.value = ctx.classHeatmapMultiplier;
				if (changed.classHeatmap) {
					setStyle(div15, "display", (ctx.classHeatmap > -1 ? 'block' : 'none'));
				}

				if ((changed.gcx) && text51_value !== (text51_value = format_1(ctx.gcx))) {
					setData(text51, text51_value);
				}

				if ((changed.gcy) && text54_value !== (text54_value = format_1(ctx.gcy))) {
					setData(text54, text54_value);
				}

				if ((changed.scale) && text57_value !== (text57_value = format_1(ctx.scale))) {
					setData(text57, text57_value);
				}

				if ((changed.showOptions) && raw3_value !== (raw3_value = ctx.showOptions ? 'fewer options' : 'more options')) {
					button3.innerHTML = raw3_value;
				}

				if ((changed.showOptions) && div24_class_value !== (div24_class_value = "controls " + (ctx.showOptions ? 'open' : 'closed') + " svelte-l7caws" + " svelte-ref-controls")) {
					div24.className = div24_class_value;
				}

				var responsiveresizer_changes = {};
				if (changed.clientWidth) responsiveresizer_changes.clientWidth = ctx.clientWidth;
				if (changed.clientHeight) responsiveresizer_changes.clientHeight = ctx.clientHeight;
				responsiveresizer._set(responsiveresizer_changes);
			},

			d: function destroy$$1(detach) {
				if (if_block0) if_block0.d();
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
				removeListener(input0, "change", input0_change_handler);
				removeListener(input1, "change", input1_change_handler);
				removeListener(input2, "change", input2_change_handler);
				if (if_block1) if_block1.d();
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input3), 1);
				removeListener(input3, "change", input3_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input4), 1);
				removeListener(input4, "change", input4_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input5), 1);
				removeListener(input5, "change", input5_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input6), 1);
				removeListener(input6, "change", input6_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input7), 1);
				removeListener(input7, "change", input7_change_handler);
				component._bindingGroups[0].splice(component._bindingGroups[0].indexOf(input8), 1);
				removeListener(input8, "change", input8_change_handler);
				removeListener(input9, "change", input9_change_input_handler);
				removeListener(input9, "input", input9_change_input_handler);
				removeListener(input10, "change", input10_change_input_handler);
				removeListener(input10, "input", input10_change_input_handler);
				component._bindingGroups[1].splice(component._bindingGroups[1].indexOf(input11), 1);
				removeListener(input11, "change", input11_change_handler);
				component._bindingGroups[1].splice(component._bindingGroups[1].indexOf(input12), 1);
				removeListener(input12, "change", input12_change_handler);
				removeListener(input13, "change", input13_change_input_handler);
				removeListener(input13, "input", input13_change_input_handler);
				if (component.refs.expand === div21) component.refs.expand = null;
				removeListener(button3, "click", click_handler);
				if (component.refs.controls === div24) component.refs.controls = null;
				responsiveresizer.destroy(detach);
			}
		};
	}

	// (4:4) {#if backLink}
	function create_if_block_1$2(component, ctx) {
		var a, text;

		return {
			c: function create() {
				a = createElement("a");
				text = createText("← back to main article");
				a.className = "backlink svelte-l7caws";
				a.href = ctx.backLink;
				addLoc(a, file$j, 4, 6, 141);
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
				append(a, text);
			},

			p: function update(changed, ctx) {
				if (changed.backLink) {
					a.href = ctx.backLink;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(a);
				}
			}
		};
	}

	// (83:14) {#if shareLink}
	function create_if_block$3(component, ctx) {
		var button;

		function click_handler(event) {
			component.copyShareLink();
		}

		return {
			c: function create() {
				button = createElement("button");
				button.textContent = "Copy link to this view";
				addListener(button, "click", click_handler);
				setStyle(button, "font-size", "10px");
				setStyle(button, "margin-top", "4px");
				setAttribute(button, "href", "#");
				addLoc(button, file$j, 83, 16, 2986);
			},

			m: function mount(target, anchor) {
				insert(target, button, anchor);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(button);
				}

				removeListener(button, "click", click_handler);
			}
		};
	}

	function App(options) {
		this._debugName = '<App>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<App> references store properties, but no store was provided");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(assign(this.store._init(["scroll"]), data$f()), options.data);
		this.store._add(this, ["scroll"]);

		this._recompute({ gridSize: 1, iconScaleFactor: 1, realGridSize: 1 }, this._state);
		if (!('gridSize' in this._state)) console.warn("<App> was created without expected data property 'gridSize'");
		if (!('iconScaleFactor' in this._state)) console.warn("<App> was created without expected data property 'iconScaleFactor'");

		if (!('clientWidth' in this._state)) console.warn("<App> was created without expected data property 'clientWidth'");
		if (!('clientHeight' in this._state)) console.warn("<App> was created without expected data property 'clientHeight'");
		if (!('backLink' in this._state)) console.warn("<App> was created without expected data property 'backLink'");
		if (!('showClassFilter' in this._state)) console.warn("<App> was created without expected data property 'showClassFilter'");
		if (!('classHeatmap' in this._state)) console.warn("<App> was created without expected data property 'classHeatmap'");
		if (!('showLayerChooser' in this._state)) console.warn("<App> was created without expected data property 'showLayerChooser'");
		if (!('layerName' in this._state)) console.warn("<App> was created without expected data property 'layerName'");
		if (!('density' in this._state)) console.warn("<App> was created without expected data property 'density'");
		if (!('iconCrop' in this._state)) console.warn("<App> was created without expected data property 'iconCrop'");
		if (!('classHeatmapMultiplier' in this._state)) console.warn("<App> was created without expected data property 'classHeatmapMultiplier'");
		if (!('classHeatmapPositive' in this._state)) console.warn("<App> was created without expected data property 'classHeatmapPositive'");
		if (!('autoGridSizeMultiplier' in this._state)) console.warn("<App> was created without expected data property 'autoGridSizeMultiplier'");
		if (!('showLabels' in this._state)) console.warn("<App> was created without expected data property 'showLabels'");
		if (!('enableHover' in this._state)) console.warn("<App> was created without expected data property 'enableHover'");
		if (!('scale' in this._state)) console.warn("<App> was created without expected data property 'scale'");
		if (!('gcx' in this._state)) console.warn("<App> was created without expected data property 'gcx'");
		if (!('gcy' in this._state)) console.warn("<App> was created without expected data property 'gcy'");
		if (!('extent' in this._state)) console.warn("<App> was created without expected data property 'extent'");
		if (!('$scroll' in this._state)) console.warn("<App> was created without expected data property '$scroll'");
		if (!('homeX' in this._state)) console.warn("<App> was created without expected data property 'homeX'");
		if (!('homeY' in this._state)) console.warn("<App> was created without expected data property 'homeY'");
		if (!('homeScale' in this._state)) console.warn("<App> was created without expected data property 'homeScale'");
		if (!('showOptions' in this._state)) console.warn("<App> was created without expected data property 'showOptions'");

		if (!('shareLink' in this._state)) console.warn("<App> was created without expected data property 'shareLink'");
		this._bindingGroups = [[], []];
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$k(this, this._state);

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

	assign(App.prototype, protoDev);
	assign(App.prototype, methods$5);

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

	/* src/components/AppStandalone.html generated by Svelte v2.15.3 */

	function data$g() {
	  return {
	    backLink: undefined
	  }
	}
	function oncreate$7() {
	  setTimeout(() => {
	    this.refs.app.home(0);
	  }, 100);
	}
	const file$k = "src/components/AppStandalone.html";

	function create_main_fragment$l(component, ctx) {
		var div, div_resize_listener;

		var app_initial_data = {
		 	clientWidth: ctx.clientWidth,
		 	clientHeight: ctx.clientHeight,
		 	gridSize: -1,
		 	showLabels: true,
		 	shareLink: true,
		 	backLink: ctx.backLink
		 };
		var app = new App({
			root: component.root,
			store: component.store,
			data: app_initial_data
		});

		component.refs.app = app;

		function div_resize_handler() {
			component.set({ clientWidth: div.offsetWidth, clientHeight: div.offsetHeight });
		}

		return {
			c: function create() {
				div = createElement("div");
				app._fragment.c();
				component.root._beforecreate.push(div_resize_handler);
				setStyle(div, "width", "100%");
				setStyle(div, "height", "100%");
				addLoc(div, file$k, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				app._mount(div, null);
				div_resize_listener = addResizeListener(div, div_resize_handler);
			},

			p: function update(changed, ctx) {
				var app_changes = {};
				if (changed.clientWidth) app_changes.clientWidth = ctx.clientWidth;
				if (changed.clientHeight) app_changes.clientHeight = ctx.clientHeight;
				if (changed.backLink) app_changes.backLink = ctx.backLink;
				app._set(app_changes);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				app.destroy();
				if (component.refs.app === app) component.refs.app = null;
				div_resize_listener.cancel();
			}
		};
	}

	function AppStandalone(options) {
		this._debugName = '<AppStandalone>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$g(), options.data);
		if (!('clientWidth' in this._state)) console.warn("<AppStandalone> was created without expected data property 'clientWidth'");
		if (!('clientHeight' in this._state)) console.warn("<AppStandalone> was created without expected data property 'clientHeight'");
		if (!('backLink' in this._state)) console.warn("<AppStandalone> was created without expected data property 'backLink'");
		this._intro = true;

		this._fragment = create_main_fragment$l(this, this._state);

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

	assign(AppStandalone.prototype, protoDev);

	AppStandalone.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/library/Tooltip.html generated by Svelte v2.15.3 */

	function style({x, width, y, height, visible}) {
	  if (visible === false) {
	    return "display: none;";
	  } else {
	    const scrollLeft = document.documentElement.scrollLeft;
	    const scrollTop = Math.max(window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop);
	    const rightEdge = document.documentElement.clientWidth - width;
	    const bottomEdge = document.documentElement.clientHeight - height;
	    let left = Math.min(x, rightEdge);
	    let top = Math.min(y, bottomEdge);
	    if (x >= rightEdge && y >= bottomEdge) {
	      left = x - width;
	    }
	    return `width: ${width}px; top: ${top + scrollTop}px; left: ${left + scrollLeft}px;`;
	  }
	}

	function data$h() {
	  return {
	    visible: false,
	    width: 150,
	    height: 200,
	    component: null,
	  }
	}
	var methods$6 = {
	  mousemove: function(event) {
	    const {visible} = this.get();
	    if (visible) {
	      this.set({
	        x: event.clientX,
	        y: event.clientY
	      });
	    }
	  },
	  show: function(d) {
	    this.set({visible: true});
	    this.refs.component.set(d);
	  },
	  hide: function() {
	    this.set({
	      visible: false
	    });
	    
	  }
	};

	const file$l = "src/library/Tooltip.html";

	function create_main_fragment$m(component, ctx) {
		var text, div;

		function onwindowmousemove(event) {
			component.mousemove(event);	}
		document.addEventListener("mousemove", onwindowmousemove);

		function onwindowscroll(event) {
			component.hide();	}
		document.addEventListener("scroll", onwindowscroll);

		var if_block = (ctx.component) && create_if_block$4(component, ctx);

		return {
			c: function create() {
				text = createText("\n\n");
				div = createElement("div");
				if (if_block) if_block.c();
				div.style.cssText = ctx.style;
				div.className = "svelte-14z2oof svelte-ref-root";
				addLoc(div, file$l, 33, 0, 743);
			},

			m: function mount(target, anchor) {
				insert(target, text, anchor);
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
				component.refs.root = div;
			},

			p: function update(changed, ctx) {
				if (ctx.component) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$4(component, ctx);
						if_block.c();
						if_block.m(div, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (changed.style) {
					div.style.cssText = ctx.style;
				}
			},

			d: function destroy$$1(detach) {
				document.removeEventListener("mousemove", onwindowmousemove);

				document.removeEventListener("scroll", onwindowscroll);

				if (detach) {
					detachNode(text);
					detachNode(div);
				}

				if (if_block) if_block.d();
				if (component.refs.root === div) component.refs.root = null;
			}
		};
	}

	// (35:2) {#if component}
	function create_if_block$4(component, ctx) {
		var switch_instance_anchor;

		var switch_value = ctx.component;

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
				if (switch_instance) switch_instance._fragment.c();
				switch_instance_anchor = createComment();
			},

			m: function mount(target, anchor) {
				if (switch_instance) {
					switch_instance._mount(target, anchor);
					component.refs.component = switch_instance;
				}

				insert(target, switch_instance_anchor, anchor);
			},

			p: function update(changed, ctx) {
				if (switch_value !== (switch_value = ctx.component)) {
					if (switch_instance) {
						switch_instance.destroy();
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						switch_instance._fragment.c();
						switch_instance._mount(switch_instance_anchor.parentNode, switch_instance_anchor);

						component.refs.component = switch_instance;
					} else {
						switch_instance = null;
						if (component.refs.component === switch_instance) {
							component.refs.component = null;
						}
					}
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

	function Tooltip(options) {
		this._debugName = '<Tooltip>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$h(), options.data);

		this._recompute({ x: 1, width: 1, y: 1, height: 1, visible: 1 }, this._state);
		if (!('x' in this._state)) console.warn("<Tooltip> was created without expected data property 'x'");
		if (!('width' in this._state)) console.warn("<Tooltip> was created without expected data property 'width'");
		if (!('y' in this._state)) console.warn("<Tooltip> was created without expected data property 'y'");
		if (!('height' in this._state)) console.warn("<Tooltip> was created without expected data property 'height'");
		if (!('visible' in this._state)) console.warn("<Tooltip> was created without expected data property 'visible'");

		if (!('component' in this._state)) console.warn("<Tooltip> was created without expected data property 'component'");
		this._intro = true;

		this._fragment = create_main_fragment$m(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}
	}

	assign(Tooltip.prototype, protoDev);
	assign(Tooltip.prototype, methods$6);

	Tooltip.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('style' in newState && !this._updatingReadonlyProperty) throw new Error("<Tooltip>: Cannot set read-only property 'style'");
	};

	Tooltip.prototype._recompute = function _recompute(changed, state) {
		if (changed.x || changed.width || changed.y || changed.height || changed.visible) {
			if (this._differs(state.style, (state.style = style(state)))) changed.style = true;
		}
	};

	/* src/components/AtlasTooltip.html generated by Svelte v2.15.3 */

	var format_1$1 = format(".2f");

	var formatLarge = format(",");

	const file$m = "src/components/AtlasTooltip.html";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.top = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$n(component, ctx) {
		var div1, table, text0, div0, text1, text2_value = formatLarge(ctx.num_activations), text2, text3;

		var if_block = (ctx.top_class_indices) && create_if_block$5(component, ctx);

		return {
			c: function create() {
				div1 = createElement("div");
				table = createElement("table");
				if (if_block) if_block.c();
				text0 = createText("\n  ");
				div0 = createElement("div");
				text1 = createText("Average of ");
				text2 = createText(text2_value);
				text3 = createText(" activations");
				table.className = "svelte-1qbcldy";
				addLoc(table, file$m, 1, 2, 22);
				setStyle(div0, "font-size", "10px");
				setStyle(div0, "margin-top", "4px");
				setStyle(div0, "color", "#999");
				setStyle(div0, "text-align", "right");
				addLoc(div0, file$m, 12, 2, 395);
				div1.className = "hover svelte-1qbcldy";
				addLoc(div1, file$m, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, table);
				if (if_block) if_block.m(table, null);
				append(div1, text0);
				append(div1, div0);
				append(div0, text1);
				append(div0, text2);
				append(div0, text3);
			},

			p: function update(changed, ctx) {
				if (ctx.top_class_indices) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$5(component, ctx);
						if_block.c();
						if_block.m(table, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.num_activations) && text2_value !== (text2_value = formatLarge(ctx.num_activations))) {
					setData(text2, text2_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				if (if_block) if_block.d();
			}
		};
	}

	// (3:2) {#if top_class_indices}
	function create_if_block$5(component, ctx) {
		var each_anchor;

		var each_value = ctx.top_class_indices.slice(0,5);

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(component, get_each_context$2(ctx, each_value, i));
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
				if (changed.top_class_values || changed.$inceptionLabels || changed.top_class_indices) {
					each_value = ctx.top_class_indices.slice(0,5);

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$2(component, child_ctx);
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

	// (4:4) {#each top_class_indices.slice(0,5) as top, i}
	function create_each_block$2(component, ctx) {
		var tr, td0, text0_value = ctx.i + 1, text0, text1, text2, td1, text3_value = ctx.$inceptionLabels[ctx.top], text3, text4, td2, text5_value = format_1$1(ctx.top_class_values[ctx.i]), text5;

		return {
			c: function create() {
				tr = createElement("tr");
				td0 = createElement("td");
				text0 = createText(text0_value);
				text1 = createText(".");
				text2 = createText("\n        ");
				td1 = createElement("td");
				text3 = createText(text3_value);
				text4 = createText("\n        ");
				td2 = createElement("td");
				text5 = createText(text5_value);
				setStyle(td0, "width", "10px");
				setStyle(td0, "text-align", "right");
				setStyle(td0, "padding-right", "4px");
				td0.className = "svelte-1qbcldy";
				addLoc(td0, file$m, 5, 8, 126);
				td1.className = "" + (ctx.i == 0 ? 'first': '') + " svelte-1qbcldy";
				addLoc(td1, file$m, 6, 8, 212);
				setStyle(td2, "text-align", "right");
				td2.className = "svelte-1qbcldy";
				addLoc(td2, file$m, 7, 8, 284);
				addLoc(tr, file$m, 4, 6, 113);
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
				if ((changed.$inceptionLabels || changed.top_class_indices) && text3_value !== (text3_value = ctx.$inceptionLabels[ctx.top])) {
					setData(text3, text3_value);
				}

				if ((changed.top_class_values) && text5_value !== (text5_value = format_1$1(ctx.top_class_values[ctx.i]))) {
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

	function AtlasTooltip(options) {
		this._debugName = '<AtlasTooltip>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}
		if (!options.store) {
			throw new Error("<AtlasTooltip> references store properties, but no store was provided");
		}

		init(this, options);
		this._state = assign(this.store._init(["inceptionLabels"]), options.data);
		this.store._add(this, ["inceptionLabels"]);
		if (!('top_class_indices' in this._state)) console.warn("<AtlasTooltip> was created without expected data property 'top_class_indices'");
		if (!('$inceptionLabels' in this._state)) console.warn("<AtlasTooltip> was created without expected data property '$inceptionLabels'");
		if (!('top_class_values' in this._state)) console.warn("<AtlasTooltip> was created without expected data property 'top_class_values'");
		if (!('num_activations' in this._state)) console.warn("<AtlasTooltip> was created without expected data property 'num_activations'");
		this._intro = true;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$n(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}
	}

	assign(AtlasTooltip.prototype, protoDev);

	AtlasTooltip.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	store.set({
	  scroll: true
	});

	// A global tooltip
	store.set({
	  tooltip: new Tooltip({
	    target: document.body,
	    store,
	    data: {
	      width: 250,
	      component: AtlasTooltip
	    }
	  })
	});

	new AppStandalone({
	  target: document.querySelector("#app"),
	  store,
	  data: {
	    backLink: "index.html"
	  }
	});

}());
//# sourceMappingURL=app.js.map
