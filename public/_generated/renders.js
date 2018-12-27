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

	function reinsertChildren(parent, target) {
		while (parent.firstChild) target.appendChild(parent.firstChild);
	}

	function createElement(name) {
		return document.createElement(name);
	}

	function createText(data) {
		return document.createTextNode(data);
	}

	function addListener(node, event, handler, options) {
		node.addEventListener(event, handler, options);
	}

	function removeListener(node, event, handler, options) {
		node.removeEventListener(event, handler, options);
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
	  inceptionLabels: Labels.inception,
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
	        homeY: 0.21,
	        gridSize: 4,
	        homeScale: 16 * 6,
	      }
	    ],
	    plant: [
	      {
	        layerName: "mixed3b",
	        homeX: 0.3222,
	        homeY: 0.6352,
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
	        homeX: 0.168,
	        homeY: 0.285,
	        gridSize: 4,
	        homeScale: 16 * 3 * 2,
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
	        homeY: 0.534,
	        gridSize: 4,
	        homeScale: 16 * 6,
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
	        { pos: { x: 2, y: 7 }, desc: "shark?" },
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



	function data() {
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
	function create_main_fragment(component, ctx) {

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
		this._state = assign(data(), options.data);
		this._intro = true;
		this._handlers.update = [onupdate];

		this._fragment = create_main_fragment(this, this._state);

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

	function data$1() {
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
	const file$1 = "src/Zoom.html";

	function add_css() {
		var style = createElement("style");
		style.id = 'svelte-16epbqg-style';
		style.textContent = ".svelte-ref-capture.svelte-16epbqg{position:relative;width:100%;height:100%;background:rgba(0, 0, 0, 0);box-sizing:border-box}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiWm9vbS5odG1sIiwic291cmNlcyI6WyJab29tLmh0bWwiXSwic291cmNlc0NvbnRlbnQiOlsiPGRpdiByZWY6Y2FwdHVyZT5cbjwhLS0gPHAgc3R5bGU9XCJwb3NpdGlvbjogYWJzb2x1dGU7IGxlZnQ6IDA7IHJpZ2h0OiAwO1wiPng6IHt4fSB5OiB7eX0gc2NhbGU6IHtzY2FsZX08L3A+IC0tPlxuXG48L2Rpdj5cblxuXG48c2NyaXB0PlxuLy8gaW1wb3J0IHt6b29tIGFzIGQzem9vbX0gZnJvbSAnZDMtem9vbSc7XG4vLyBpbXBvcnQge2V2ZW50IGFzIGQzZXZlbnQsIHNlbGVjdCBhcyBkM3NlbGVjdH0gZnJvbSAnZDMtc2VsZWN0aW9uJztcbmltcG9ydCB7IHR3ZWVuIH0gZnJvbSAnc3ZlbHRlLWV4dHJhcyc7XG5pbXBvcnQgKiBhcyBlYXNlcyBmcm9tICdlYXNlcy1qc25leHQnO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGRhdGEoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdpZHRoOiAxMDAsXG4gICAgICBoZWlnaHQ6IDEwMCxcbiAgICAgIGdjeDogMC41LFxuICAgICAgZ2N5OiAwLjUsXG4gICAgICBzY3g6IDAuNSxcbiAgICAgIHNjeTogMC41LFxuICAgICAgdW5pdDogMTAwLFxuXG4gICAgICAvL3R3ZWVuVGFyZ2V0OiB7XG4gICAgICAvLyAgc2NhbGU6IG51bGwsIGdjeDogbnVsbCwgZ2N5OiBudWxsXG4gICAgICAvL31cbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgLy90cmFuc2xhdGVYOiAoe2djeCwgc2N4LCBzY2FsZSwgd2lkdGh9KSA9PiAgc2N4ICogd2lkdGggLSBnY3ggKiBzY2FsZSAqIHdpZHRoLFxuICAgIC8vdHJhbnNsYXRlWTogKHtnY3ksIHNjeSwgc2NhbGUsIGhlaWdodH0pID0+IHNjeSAqIGhlaWdodCAtIGdjeSAqIHNjYWxlICogaGVpZ2h0LFxuICAgIC8vdHJhbnNmb3JtU3RyaW5nOiAoe3RyYW5zbGF0ZVgsIHRyYW5zbGF0ZVksIHNjYWxlfSkgPT4gYHRyYW5zbGF0ZSgke3RyYW5zbGF0ZVh9LCR7dHJhbnNsYXRlWX0pc2NhbGUoJHtzY2FsZX0pYCxcbiAgICBzY2FsZTogKHt3aWR0aCwgdW5pdH0pID0+IHtcbiAgICAgIHJldHVybiB3aWR0aCAvIHVuaXRcbiAgICB9XG4gIH0sXG4gIG9uY3JlYXRlKCkge1xuICB9LFxuICBtZXRob2RzOiB7XG4gICAgdHdlZW4sXG4gICAgc2V0U2NhbGUoc2NhbGUpIHtcbiAgICAgIGNvbnN0IHt3aWR0aH0gPSB0aGlzLmdldCgpO1xuICAgICAgdGhpcy5zZXQoeyd1bml0Jzogd2lkdGggLyBzY2FsZX0pXG4gICAgfSxcbiAgICBwYW5UbyhuZXdnY3gsIG5ld2djeSwgZHVyYXRpb24pIHtcbiAgICAgIGlmIChkdXJhdGlvbiA9PT0gdW5kZWZpbmVkKSBkdXJhdGlvbiA9IDEwMDA7XG4gICAgICBpZihkdXJhdGlvbiA9PSAwKSB7XG4gICAgICAgIHRoaXMuc2V0KHtnY3g6IG5ld2djeCwgZ2N5OiBuZXdnY3l9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy50d2VlbignZ2N4JywgbmV3Z2N4LCB7ZHVyYXRpb24sIGVhc2luZzogZWFzZXMuY3ViaWNJbk91dH0pXG4gICAgICAgIHRoaXMudHdlZW4oJ2djeScsIG5ld2djeSwge2R1cmF0aW9uLCBlYXNpbmc6IGVhc2VzLmN1YmljSW5PdXR9KVxuICAgICAgfVxuICAgIH0sXG4gICAgc2NhbGVUbyhuZXdTY2FsZSwgZHVyYXRpb24pIHtcbiAgICAgIGlmIChkdXJhdGlvbiA9PT0gdW5kZWZpbmVkKSBkdXJhdGlvbiA9IDEwMDA7XG4gICAgICBjb25zdCB7d2lkdGh9ID0gdGhpcy5nZXQoKTtcbiAgICAgIHRoaXMudHdlZW4oJ3VuaXQnLCB3aWR0aCAvIG5ld1NjYWxlLCB7ZHVyYXRpb24sIGVhc2luZzogZWFzZXMuY3ViaWNJbk91dH0pXG4gICAgfSxcbiAgICB0cmFuc2l0aW9uVG8obmV3Z2N4LCBuZXdnY3ksIG5ld1NjYWxlLCBkdXJhdGlvbikge1xuICAgICAgaWYgKGR1cmF0aW9uID09PSB1bmRlZmluZWQpIGR1cmF0aW9uID0gMTAwMDtcbiAgICAgIGNvbnN0IHt3aWR0aH0gPSB0aGlzLmdldCgpO1xuICAgICAgY29uc3QgbmV3VW5pdCA9IHdpZHRoIC8gbmV3U2NhbGU7XG4gICAgICB0aGlzLnR3ZWVuKCd1bml0JywgbmV3VW5pdCwge2R1cmF0aW9uLCBlYXNpbmc6IGVhc2VzLmN1YmljSW5PdXR9KVxuICAgICAgdGhpcy50d2VlbignZ2N4JywgbmV3Z2N4LCB7ZHVyYXRpb24sIGVhc2luZzogZWFzZXMuY3ViaWNJbk91dH0pXG4gICAgICB0aGlzLnR3ZWVuKCdnY3knLCBuZXdnY3ksIHtkdXJhdGlvbiwgZWFzaW5nOiBlYXNlcy5jdWJpY0luT3V0fSlcbiAgICB9LFxuICB9XG59XG48L3NjcmlwdD5cblxuPHN0eWxlPlxucmVmOmNhcHR1cmUge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIHdpZHRoOiAxMDAlO1xuICBoZWlnaHQ6IDEwMCU7XG4gIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMCk7XG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG59XG48L3N0eWxlPiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF1RUEsa0NBQVksQ0FBQyxBQUNYLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixVQUFVLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDNUIsVUFBVSxDQUFFLFVBQVUsQUFDeEIsQ0FBQyJ9 */";
		append(document.head, style);
	}

	function create_main_fragment$1(component, ctx) {
		var div;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "svelte-16epbqg svelte-ref-capture";
				addLoc(div, file$1, 0, 0, 0);
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
		this._state = assign(data$1(), options.data);

		this._recompute({ width: 1, unit: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<Zoom> was created without expected data property 'width'");
		if (!('unit' in this._state)) console.warn("<Zoom> was created without expected data property 'unit'");
		this._intro = true;

		if (!document.getElementById("svelte-16epbqg-style")) add_css();

		this._fragment = create_main_fragment$1(this, this._state);

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

	/* src/library/Radar.html generated by Svelte v2.15.3 */

	function data$2() {
	  return {
	    display: "block", // "inline", "inline-block", "block"
	    ready: false,
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
	const file$2 = "src/library/Radar.html";

	function create_main_fragment$2(component, ctx) {
		var d_figure, slot_content_default = component._slotted.default;

		return {
			c: function create() {
				d_figure = createElement("d-figure");
				setStyle(d_figure, "display", ctx.display);
				addLoc(d_figure, file$2, 6, 0, 173);
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
		this._state = assign(data$2(), options.data);
		if (!('display' in this._state)) console.warn("<Radar> was created without expected data property 'display'");
		this._intro = true;

		this._slotted = options.slots || {};

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

	assign(Radar.prototype, protoDev);

	Radar.prototype._checkReadOnly = function _checkReadOnly(newState) {
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

	function data$3() {
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

	function oncreate$2() {
	  this.home();
	}
	function onupdate$1({changed, current, previous}) {
	  this.set({context: this.refs.canvas.getContext('2d')});
	  if (changed.maxAttributionValue || changed.minActivations || changed.classHeatmap || changed.classHeatmapMultiplier || changed.classHeatmapPositive || changed.labels || changed.showLabels || changed.viewWidth || changed.viewHeight || changed.scale || changed.iconCrop || changed.currentZoomIndex || changed.layers || changed.alphaAttributionFactor || changed.scaleCountFactor || changed.gcx || changed.gcy) {
	    this.render();
	  }
	  if (changed.currentIconInfo) {
	    const {tooltip} = this.store.get();
	    const {showHoverIcon} = this.get();
	    if (showHoverIcon) {
	      tooltip.show(current.currentIconInfo);
	    }
	  }
	  if (changed.showHoverIcon) {
	    if (current.showHoverIcon == false) {
	      const { tooltip } = this.store.get();
	      tooltip.hide();
	    }
	  }

	}
	const file$3 = "src/Atlas.html";

	function add_css$1() {
		var style = createElement("style");
		style.id = 'svelte-ptap6b-style';
		style.textContent = ".svelte-ref-root.svelte-ptap6b{position:relative;width:100%;height:100%;contain:layout}.svelte-ref-stage.svelte-ptap6b{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden}.svelte-ref-stage.panning.svelte-ptap6b{cursor:move}.svelte-ref-canvas.svelte-ptap6b{position:absolute;top:0;left:0;border-radius:8px}.icon.svelte-ptap6b{display:block;position:absolute;top:0;left:0;border-radius:4px;border:solid 3px black;pointer-events:none;box-sizing:border-box}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXRsYXMuaHRtbCIsInNvdXJjZXMiOlsiQXRsYXMuaHRtbCJdLCJzb3VyY2VzQ29udGVudCI6WyI8UmFkYXIgYmluZDpyZWFkeSAvPlxuXG57I2lmIHJlYWR5fVxuICA8QXRsYXNEYXRhTG9hZGVyIFxuICAgIHtpZH0gXG4gICAge2xheWVyfSBcbiAgICB7bGF5b3V0fVxuICAgIHtjbGFzc0ZpbHRlcn1cbiAgICB7ZmlsdGVyfVxuICAgIGJpbmQ6Y29uZmlnXG4gICAgYmluZDpsYXllcnMgXG4gICAgYmluZDpsYWJlbHMgXG4gIC8+XG57L2lmfVxuXG4gIDxkaXZcbiAgICByZWY6cm9vdFxuICAgIGJpbmQ6Y2xpZW50V2lkdGg9dmlld1dpZHRoXG4gICAgYmluZDpjbGllbnRIZWlnaHQ9dmlld0hlaWdodFxuICA+XG4gICAgPGRpdlxuICAgICAgcmVmOnN0YWdlXG4gICAgICBjbGFzcz1cInsobW91c2VNb3ZlTW9kZSA9PSAncGFuJyAmIGVuYWJsZURyYWdUb1BhbikgPyAncGFubmluZycgOiAnJ31cIlxuICAgICAgb246bW91c2Vkb3duPVwibW91c2VEb3duKGV2ZW50KVwiIG9uOm1vdXNlbW92ZT1cIm1vdXNlTW92ZShldmVudClcIiBcbiAgICAgIG9uOm1vdXNlZW50ZXI9XCJtb3VzZUVudGVyKGV2ZW50KVwiIG9uOm1vdXNlb3V0PVwibW91c2VPdXQoZXZlbnQpXCJcbiAgICA+XG4gICAgICA8Wm9vbVxuICAgICAgICByZWY6em9vbVxuICAgICAgICBiaW5kOnNjYWxlXG4gICAgICAgIGJpbmQ6dW5pdFxuICAgICAgICBiaW5kOmdjeFxuICAgICAgICBiaW5kOmdjeVxuICAgICAgICB3aWR0aD17dmlld1dpZHRofVxuICAgICAgICBoZWlnaHQ9e3ZpZXdIZWlnaHR9XG4gICAgICAvPlxuICAgICAgPGNhbnZhc1xuICAgICAgICByZWY6Y2FudmFzXG4gICAgICAgIHdpZHRoPXt2aWV3V2lkdGggKiBzY3JlZW5SZXNvbHV0aW9ufVxuICAgICAgICBoZWlnaHQ9e3ZpZXdIZWlnaHQgKiBzY3JlZW5SZXNvbHV0aW9ufVxuICAgICAgICBzdHlsZT1cIndpZHRoOiB7dmlld1dpZHRofXB4OyBoZWlnaHQ6IHt2aWV3SGVpZ2h0fXB4O1wiXG4gICAgICA+PC9jYW52YXM+XG4gICAgICB7I2lmIHNob3dIb3Zlckljb259XG4gICAgICAgIDxkaXYgY2xhc3M9XCJpY29uXCIgc3R5bGU9XCJ3aWR0aDp7aWNvblNpemVJblBpeGVscyArIDIgKyAncHgnfTsgaGVpZ2h0OntpY29uU2l6ZUluUGl4ZWxzICsgMiArICdweCd9OyBsZWZ0Ont0b3BMZWZ0Q29ybmVySG92ZXIueCArICdweCd9OyB0b3A6e3RvcExlZnRDb3JuZXJIb3Zlci55ICsgJ3B4J31cIj48L2Rpdj5cbiAgICAgIHsvaWZ9XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuXG48c2NyaXB0PlxuaW1wb3J0IHsgZGVmYXVsdCBhcyBsb2FkIH0gZnJvbSAnLi9sb2FkLmpzJztcbmltcG9ydCB7IG1heCB9IGZyb20gJ2QzLWFycmF5JztcblxuZXhwb3J0IGRlZmF1bHQge1xuICBjb21wb25lbnRzOiB7IFxuICAgIEF0bGFzRGF0YUxvYWRlcjogJy4vQXRsYXNEYXRhTG9hZGVyLmh0bWwnLCBcbiAgICBab29tOiAnLi9ab29tLmh0bWwnLFxuICAgIFJhZGFyOiAnLi9saWJyYXJ5L1JhZGFyLmh0bWwnXG4gIH0sXG4gIGRhdGEoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlYWR5OiB0cnVlLFxuICAgICAgaWQ6IFwiaW5jZXB0aW9udjFfbWl4ZWQ0Y1wiLFxuICAgICAgXG4gICAgICBjb25maWc6IG51bGwsXG4gICAgICBsYXllcnM6IG51bGwsXG4gICAgICBsYWJlbHM6IG51bGwsXG5cbiAgICAgIGxheWVyOiAwLFxuICAgICAgbGF5b3V0OiAwLFxuICAgICAgY2xhc3NGaWx0ZXI6IDAsXG4gICAgICBmaWx0ZXI6IDAsXG5cbiAgICAgIG1pbkFjdGl2YXRpb25zOiAxLFxuXG4gICAgICBzaG93TGFiZWxzOiBmYWxzZSxcbiAgICAgIHRleHRTaGFkb3c6IGZhbHNlLFxuICAgICAgc2hvd0hvdmVySW1hZ2U6IGZhbHNlLFxuXG4gICAgICBjb250ZXh0OiBudWxsLFxuXG4gICAgICBhbHBoYUF0dHJpYnV0aW9uRmFjdG9yOiAwLjAyLFxuICAgICAgc2NhbGVDb3VudEZhY3RvcjogMSxcbiAgICAgIGNsYXNzSGVhdG1hcDogLTEsXG4gICAgICBjbGFzc0hlYXRtYXBNdWx0aXBsaWVyOiAxLFxuICAgICAgY2xhc3NIZWF0bWFwUG9zaXRpdmU6IDEsXG5cbiAgICAgIGdyaWRTaXplOiBudWxsLFxuICAgICAgc2hvd0dyaWQ6IGZhbHNlLFxuXG4gICAgICAvLyBmb3IgaW5pdGlhbCBzdGF0ZSwgYW5kIGdvaW5nIGJhY2sgdG8gXCJob21lXCJcbiAgICAgIGhvbWVYOiAuNSxcbiAgICAgIGhvbWVZOiAuNSxcbiAgICAgIGhvbWVTY2FsZTogMSxcblxuICAgICAgaWNvbkNyb3A6IDAuMDIsXG5cbiAgICAgIC8vIHpvb20gZmFjdG9yXG4gICAgICB6b29tRmFjdG9yczoge291dDogMC41LCBpbjogMn0sXG5cbiAgICAgIC8vIHR1cm4gb2ZmIGZlYXR1cmVzXG4gICAgICBlbmFibGVDbGlja1RvWm9vbTogdHJ1ZSxcbiAgICAgIGVuYWJsZUhvdmVyOiB0cnVlLFxuICAgICAgZW5hYmxlRHJhZ1RvUGFuOiB0cnVlLFxuXG5cbiAgICAgIGJhY2tncm91bmRDb2xvcjogXCJ3aGl0ZVwiLFxuICAgICAgc3Ryb2tlQ29sb3I6IFwicmdiKDIyMCwgMjIwLCAyMjApXCIsXG4gICAgICBzdHJva2VUaGlja25lc3M6IDEsXG4gICAgICBpbWFnZVNtb290aGluZzogZmFsc2UsXG4gICAgICBmb250U2l6ZTogMTAsXG4gICAgICB0ZXh0Q29sb3I6IFwid2hpdGVcIixcbiAgICAgIHRleHRTaGFkb3dDb2xvcjogXCJyZ2JhKDAsIDAsIDAsIDAuOClcIixcblxuICAgICAgLy8gZm9yIHBvc2l0aW9uaW5nIHRoZSBob3ZlciBpY29uXG4gICAgICBsYXN0UmVjb3JkZWRDYW52YXNQb3M6IHt4OiAtMTAwLCB5OiAtMTAwfSxcblxuICAgICAgLy8gZm9yIG1hbmFnaW5nIHBhbm5pbmcgb2ZmIHRoZSBzY3JlZW5cbiAgICAgIG1vdXNlRG93blNjcmVlblBvczoge3g6IDAsIHk6IDB9LFxuXG4gICAgICAvLyBjYW4gYmUgXCJob3ZlclwiIG9yIFwicGFuXCJcbiAgICAgIG1vdXNlTW92ZU1vZGU6ICdob3ZlcicsXG4gICAgICBvbkNhbnZhczogZmFsc2UsXG5cbiAgICAgIHNjcmVlblJlc29sdXRpb246IDEsXG5cbiAgICAgIG1vdXNlRG93blRpbWVyOiAwLFxuICAgICAgbW91c2VNb3ZlRnVuY3Rpb246IGZ1bmN0aW9uKCl7fSxcbiAgICAgIG1vdXNlVXBGdW5jdGlvbjogZnVuY3Rpb24oKXt9LFxuXG4gICAgfVxuICB9LFxuICBjb21wdXRlZDoge1xuICAgIG1heEF0dHJpYnV0aW9uVmFsdWU6ICh7bGF5ZXJzLCBsYXllcn0pID0+IHtcbiAgICAgIC8vIHJldHVybiAwLjI1O1xuICAgICAgaWYgKGxheWVycyA9PSBudWxsKSByZXR1cm4gMDtcbiAgICAgIGNvbnN0IGwgPSBsYXllcnNbbGF5ZXJdO1xuICAgICAgbGV0IG1heCA9IDA7XG4gICAgICBsLmZvckVhY2goeCA9PiB7XG4gICAgICAgIHguZm9yRWFjaCh5ID0+IHtcbiAgICAgICAgICBpZiAoeSAmJiB5Lm51bV9hY3RpdmF0aW9ucyA+IDUwMCkge1xuICAgICAgICAgICAgY29uc3QgdiA9IHkuZnVsbF9jbGFzc192YWx1ZXNbMF07XG4gICAgICAgICAgICBpZiAodiA+IG1heCkgbWF4ID0gdjtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgcmV0dXJuIG1heDtcbiAgICAgIC8vIHJldHVybiBsYXllcnMgPyBtYXgobCwgZCA9PiBkID8gbWF4KGQsIGRkID0+IGRkID8gKGRkLm4gPiA1MCA/IChkZC50b3BfY2xhc3NfdmFsdWVzW2RkLnRvcF9jbGFzc19pbmRpY2VzLmluZGV4T2YoY2xhc3NIZWF0bWFwKV0pIDogMCkgOiAwKTogMCkgOiAwO1xuICAgICAgfSxcbiAgICBhc3BlY3RSYXRpbzogKHt2aWV3V2lkdGgsIHZpZXdIZWlnaHR9KSA9PiB2aWV3V2lkdGggLyB2aWV3SGVpZ2h0LFxuICAgIC8vIHZpZXdIZWlnaHQ6ICh7dmlld1dpZHRofSkgPT4gdmlld1dpZHRoIC8gMS41LFxuICAgIC8vIE1hdGgubWluIG9mIHZpZXdIZWlnaHQvdmlld1dpZHRoIHRvIG1ha2Ugc3VyZSBpdCBmaXRzIGluc2lkZSB3aGVuIHNjYWxlID0gMVxuICAgIG1pblZpZXdEaW1JblB4OiAoe3ZpZXdXaWR0aCwgdmlld0hlaWdodH0pID0+IE1hdGgubWluKHZpZXdXaWR0aCwgdmlld0hlaWdodCksIFxuICAgIC8vIGRlZmluZXMgdG9wIGxlZnQgY29ybmVyIG9mIGdsb2JhbCBpbiBwaXhlbHMsIHJlbGF0aXZlIHRvIHRoZSB1cHBlciBsZWZ0IGNvcm5lciBvZiB0aGUgY2FudmFzIGFzIDAsMFxuICAgIHRvcExlZnQ6ICh7Z2N4LCBnY3ksIHNjYWxlLCB2aWV3V2lkdGgsIHZpZXdIZWlnaHQsIG1pblZpZXdEaW1JblB4fSkgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgeDogdmlld1dpZHRoIC8gMiAtIGdjeCAqIG1pblZpZXdEaW1JblB4ICogc2NhbGUsXG4gICAgICAgIHk6IHZpZXdIZWlnaHQgLyAyIC0gZ2N5ICogbWluVmlld0RpbUluUHggKiBzY2FsZX0gXG4gICAgfSxcbiAgICBjdXJyZW50Wm9vbUluZGV4OiAoe3NjYWxlLCBncmlkU2l6ZX0pID0+IHtcbiAgICAgIGxldCBzID0gMDtcbiAgICAgIGlmIChncmlkU2l6ZSAhPSBudWxsKSB7XG4gICAgICAgIHMgPSBncmlkU2l6ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzY2FsZSA+IDEpIHMgPSAwO1xuICAgICAgICBpZiAoc2NhbGUgPiAyKSBzID0gMTtcbiAgICAgICAgaWYgKHNjYWxlID4gNCkgcyA9IDI7XG4gICAgICAgIGlmIChzY2FsZSA+IDgpIHMgPSAzO1xuICAgICAgICBpZiAoc2NhbGUgPiAxNikgcyA9IDQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gK3M7XG4gICAgfSxcbiAgICBudW1JY29uc1dpZGU6ICh7Y3VycmVudFpvb21JbmRleCwgbGF5ZXJzfSkgPT4ge1xuICAgICAgaWYobGF5ZXJzICYmIGN1cnJlbnRab29tSW5kZXgpe1xuICAgICAgICByZXR1cm4gbGF5ZXJzW2N1cnJlbnRab29tSW5kZXhdLmxlbmd0aFxuICAgICAgfVxuICAgIH0sXG4gICAgaWNvblNpemVJblBpeGVsczogKHtjb25maWcsIG1pblZpZXdEaW1JblB4LCBjdXJyZW50Wm9vbUluZGV4LCBzY2FsZX0pID0+IHtcbiAgICAgIGlmKGNvbmZpZyl7XG4gICAgICAgIHJldHVybiBtaW5WaWV3RGltSW5QeCAvIChjb25maWcuZ3JpZF9zaXplW2N1cnJlbnRab29tSW5kZXhdKSAqIHNjYWxlO1xuICAgICAgfVxuICAgIH0sXG4gICAgc2hvd0hvdmVySWNvbjogKHttb3VzZU1vdmVNb2RlLCBvbkNhbnZhcywgY3VycmVudEljb25JbmZvLCBlbmFibGVIb3Zlcn0pID0+IHtcbiAgICAgIHJldHVybiBlbmFibGVIb3ZlciAmJiBvbkNhbnZhcyAmJiAobW91c2VNb3ZlTW9kZSA9PSAnaG92ZXInKSAmJiBjdXJyZW50SWNvbkluZm9cbiAgICB9LFxuICAgIGxheWVyU2NhbGU6ICh7bWluVmlld0RpbUluUHgsIGNvbmZpZywgY3VycmVudFpvb21JbmRleCwgc2NhbGV9KSA9PiB7XG4gICAgICBpZihjb25maWcpe1xuICAgICAgICByZXR1cm4gKG1pblZpZXdEaW1JblB4IC8gKGNvbmZpZy5pY29uX3NpemUgKiBjb25maWcuZ3JpZF9zaXplW2N1cnJlbnRab29tSW5kZXhdKSkgKiBzY2FsZVxuICAgICAgfVxuICAgIH0sIFxuICAgIGdyaWRTZWxlY3RlZDogKHtsYXN0UmVjb3JkZWRDYW52YXNQb3MsIHRvcExlZnQsIGxheWVyU2NhbGUsIGNvbmZpZ30pID0+IHtcbiAgICAgIGlmKGNvbmZpZyl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgeDogTWF0aC5mbG9vcigobGFzdFJlY29yZGVkQ2FudmFzUG9zLnggLSB0b3BMZWZ0LngpIC8gKGxheWVyU2NhbGUgKiBjb25maWcuaWNvbl9zaXplKSksXG4gICAgICAgICAgeTogTWF0aC5mbG9vcigobGFzdFJlY29yZGVkQ2FudmFzUG9zLnkgLSB0b3BMZWZ0LnkpIC8gKGxheWVyU2NhbGUgKiBjb25maWcuaWNvbl9zaXplKSlcbiAgICAgICAgfSAgICAgICAgXG4gICAgICB9XG4gICAgfSwgXG4gICAgdG9wTGVmdENvcm5lckhvdmVyOiAoe2NvbmZpZywgbGF5ZXJTY2FsZSwgdG9wTGVmdCwgZ3JpZFNlbGVjdGVkfSkgPT4ge1xuICAgICAgaWYoY29uZmlnKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB4OiBncmlkU2VsZWN0ZWQueCAqIGNvbmZpZy5pY29uX3NpemUgKiBsYXllclNjYWxlICsgdG9wTGVmdC54IC0gMSxcbiAgICAgICAgICB5OiBncmlkU2VsZWN0ZWQueSAqIGNvbmZpZy5pY29uX3NpemUgKiBsYXllclNjYWxlICsgdG9wTGVmdC55IC0gMVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBjdXJyZW50SWNvbkluZm86ICh7bGF5ZXJzLCBjdXJyZW50Wm9vbUluZGV4LCBncmlkU2VsZWN0ZWQsIGNsYXNzSGVhdG1hcH0pID0+IHtcbiAgICAgIGlmKGxheWVycyAmJiBsYXllcnNbY3VycmVudFpvb21JbmRleF0gJiYgXG4gICAgICAgICBsYXllcnNbY3VycmVudFpvb21JbmRleF1bZ3JpZFNlbGVjdGVkLnldICYmIFxuICAgICAgICAgbGF5ZXJzW2N1cnJlbnRab29tSW5kZXhdW2dyaWRTZWxlY3RlZC55XVtncmlkU2VsZWN0ZWQueF1cbiAgICAgICAgICl7XG4gICAgICAgICAgY29uc3QgaWNvbkluZm8gPSBsYXllcnNbY3VycmVudFpvb21JbmRleF1bZ3JpZFNlbGVjdGVkLnldW2dyaWRTZWxlY3RlZC54XTtcbiAgICAgICAgICBpZihpY29uSW5mby5udW1fYWN0aXZhdGlvbnMgPiAwKXtcbiAgICAgICAgICAgIHJldHVybiBpY29uSW5mb1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIG9udXBkYXRlKHtjaGFuZ2VkLCBjdXJyZW50LCBwcmV2aW91c30pIHtcbiAgICB0aGlzLnNldCh7Y29udGV4dDogdGhpcy5yZWZzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpfSk7XG4gICAgaWYgKGNoYW5nZWQubWF4QXR0cmlidXRpb25WYWx1ZSB8fCBjaGFuZ2VkLm1pbkFjdGl2YXRpb25zIHx8IGNoYW5nZWQuY2xhc3NIZWF0bWFwIHx8IGNoYW5nZWQuY2xhc3NIZWF0bWFwTXVsdGlwbGllciB8fCBjaGFuZ2VkLmNsYXNzSGVhdG1hcFBvc2l0aXZlIHx8IGNoYW5nZWQubGFiZWxzIHx8IGNoYW5nZWQuc2hvd0xhYmVscyB8fCBjaGFuZ2VkLnZpZXdXaWR0aCB8fCBjaGFuZ2VkLnZpZXdIZWlnaHQgfHwgY2hhbmdlZC5zY2FsZSB8fCBjaGFuZ2VkLmljb25Dcm9wIHx8IGNoYW5nZWQuY3VycmVudFpvb21JbmRleCB8fCBjaGFuZ2VkLmxheWVycyB8fCBjaGFuZ2VkLmFscGhhQXR0cmlidXRpb25GYWN0b3IgfHwgY2hhbmdlZC5zY2FsZUNvdW50RmFjdG9yIHx8IGNoYW5nZWQuZ2N4IHx8IGNoYW5nZWQuZ2N5KSB7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cbiAgICBpZiAoY2hhbmdlZC5jdXJyZW50SWNvbkluZm8pIHtcbiAgICAgIGNvbnN0IHt0b29sdGlwfSA9IHRoaXMuc3RvcmUuZ2V0KCk7XG4gICAgICBjb25zdCB7c2hvd0hvdmVySWNvbn0gPSB0aGlzLmdldCgpO1xuICAgICAgaWYgKHNob3dIb3Zlckljb24pIHtcbiAgICAgICAgdG9vbHRpcC5zaG93KGN1cnJlbnQuY3VycmVudEljb25JbmZvKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoYW5nZWQuc2hvd0hvdmVySWNvbikge1xuICAgICAgaWYgKGN1cnJlbnQuc2hvd0hvdmVySWNvbiA9PSBmYWxzZSkge1xuICAgICAgICBjb25zdCB7IHRvb2x0aXAgfSA9IHRoaXMuc3RvcmUuZ2V0KCk7XG4gICAgICAgIHRvb2x0aXAuaGlkZSgpO1xuICAgICAgfVxuICAgIH1cblxuICB9LFxuICBvbmNyZWF0ZSgpIHtcbiAgICB0aGlzLmhvbWUoKTtcbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIGZ1bGxzY3JlZW4oKSB7XG4gICAgICB0aGlzLnJlZnMucm9vdC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH0sXG4gICAgbW91c2VFbnRlcigpIHtcbiAgICAgIHRoaXMuc2V0KHtvbkNhbnZhczogdHJ1ZX0pXG4gICAgfSxcbiAgICBtb3VzZURvd24oZXZlbnQpIHtcbiAgICAgIC8vIHNob3VsZCB0aGlzIGJlIHNldCBvbmNlLCBzb21ld2hlcmUgZWxzZT8gb25jcmVhdGU/IFxuICAgICAgdGhpcy5zZXQoe21vdXNlTW92ZUZ1bmN0aW9uOiB0aGlzLm1vdXNlTW92ZS5iaW5kKHRoaXMpLCBtb3VzZVVwRnVuY3Rpb246IHRoaXMubW91c2VVcC5iaW5kKHRoaXMpfSk7XG5cbiAgICAgIGNvbnN0IHttb3VzZU1vdmVGdW5jdGlvbiwgbW91c2VVcEZ1bmN0aW9ufSA9IHRoaXMuZ2V0KCk7XG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIC8vIHNldCBldmVudCBsaXN0ZW5lcnMgb24gd2luZG93XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBtb3VzZU1vdmVGdW5jdGlvbik7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIixtb3VzZVVwRnVuY3Rpb24pO1xuICAgICAgLy8gZG8gSSBuZWVkIHRvIHVuc2V0IGxvY2FsIGxpc3RlbmVyPyBcblxuICAgICAgdGhpcy5zZXQoe21vdXNlTW92ZU1vZGU6ICdwYW4nfSlcbiAgICAgIHRoaXMuc2V0KHttb3VzZURvd25UaW1lcjogRGF0ZS5ub3coKX0pXG5cbiAgICAgIC8vIGNhbnZhcyBwb3NpdGlvblxuICAgICAgdGhpcy5zZXQoe2xhc3RSZWNvcmRlZENhbnZhc1Bvczoge3g6IGV2ZW50Lm9mZnNldFgsIHk6IGV2ZW50Lm9mZnNldFl9fSlcblxuICAgICAgLy8gc2NyZWVuUG9zaXRpb24gYXQgbW91c2Vkb3duXG4gICAgICB0aGlzLnNldCh7bW91c2VEb3duU2NyZWVuUG9zOiB7eDogZXZlbnQuc2NyZWVuWCwgeTogZXZlbnQuc2NyZWVuWX19KVxuXG4gICAgfSxcbiAgICBtb3VzZU1vdmUoZXZlbnQpIHtcbiAgICAgIGNvbnN0IHsgbW91c2VNb3ZlTW9kZSB9ID0gdGhpcy5nZXQoKTtcblxuICAgICAgdGhpcy5zZXQoe2xhc3RSZWNvcmRlZENhbnZhc1Bvczoge3g6IGV2ZW50Lm9mZnNldFgsIHk6IGV2ZW50Lm9mZnNldFl9fSk7XG5cbiAgICAgIGlmIChtb3VzZU1vdmVNb2RlID09ICdwYW4nKSB7XG4gICAgICAgIGNvbnN0IHttb3VzZURvd25TY3JlZW5Qb3MsIGdjeCwgZ2N5LCBlbmFibGVEcmFnVG9QYW59ID0gdGhpcy5nZXQoKTtcblxuICAgICAgICAvLyB1cGRhdGUgZ2N4LCBnY3ksIG1vdXNlRG93blNjcmVlblBvc1xuICAgICAgICB0aGlzLnNldCh7XG4gICAgICAgICAgbW91c2VEb3duU2NyZWVuUG9zOiB7eDogZXZlbnQuc2NyZWVuWCwgeTogZXZlbnQuc2NyZWVuWX1cbiAgICAgICAgfSlcblxuICAgICAgICBpZihlbmFibGVEcmFnVG9QYW4pe1xuICAgICAgICAgIHRoaXMucmVmcy56b29tLnBhblRvKFxuICAgICAgICAgICAgdGhpcy50b1BlcmNlbnQobW91c2VEb3duU2NyZWVuUG9zLnggLSBldmVudC5zY3JlZW5YKSArIGdjeCxcbiAgICAgICAgICAgIHRoaXMudG9QZXJjZW50KG1vdXNlRG93blNjcmVlblBvcy55IC0gZXZlbnQuc2NyZWVuWSkgKyBnY3ksXG4gICAgICAgICAgICAwXG4gICAgICAgICAgKVxuICAgICAgICB9IFxuICAgICAgfVxuXG4gICAgfSxcbiAgICBtb3VzZU91dChldmVudCkge1xuICAgICAgdGhpcy5zZXQoe1xuICAgICAgICBvbkNhbnZhczogZmFsc2VcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgbW91c2VVcChldmVudCkge1xuICAgICAgY29uc3Qge21vdXNlRG93blRpbWVyLCBtb3VzZU1vdmVNb2RlLCBzY2FsZSwgem9vbUZhY3RvcnMsIG1vdXNlTW92ZUZ1bmN0aW9uLCBtb3VzZVVwRnVuY3Rpb24sIGxhc3RSZWNvcmRlZENhbnZhc1BvcywgdG9wTGVmdCwgZ2N4LCBnY3ksIGVuYWJsZUNsaWNrVG9ab29tfSA9IHRoaXMuZ2V0KCk7XG5cbiAgICAgIC8vIHJlc2V0IG1vZGUgdG8gaG92ZXJcbiAgICAgIHRoaXMuc2V0KHttb3VzZU1vdmVNb2RlOiAnaG92ZXInfSlcblxuICAgICAgLy8gcmVtb3ZlIGJvZHkgZXZlbnQgbGlzdGVuZXJzXG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBtb3VzZU1vdmVGdW5jdGlvbik7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgbW91c2VVcEZ1bmN0aW9uKTtcblxuICAgICAgLy8gY2FsY3VsYXRlIG9mZnNldHMgdG8gZGV0ZXJtaW5lIHRvIHpvb20gb3Igbm90XG4gICAgICBjb25zdCBjbGlja0RpZmYgPSAoRGF0ZS5ub3coKSAtIG1vdXNlRG93blRpbWVyKTtcbiAgICAgIGNvbnN0IGNsaWNrRGlzdGFuY2UgPSBNYXRoLnNxcnQoXG4gICAgICAgIE1hdGgucG93KGV2ZW50Lm9mZnNldFggLSBsYXN0UmVjb3JkZWRDYW52YXNQb3MueCwgMikgKyBcbiAgICAgICAgTWF0aC5wb3coZXZlbnQub2Zmc2V0WSAtIGxhc3RSZWNvcmRlZENhbnZhc1Bvcy55LCAyKVxuICAgICAgICApO1xuXG5cbiAgICAgIC8vIDIwMG1zIGFuZCA1IHBpeGVscyBkaXN0YW5jZSBpcyBmYWlybHkgYXJiaXRyYXJ5XG4gICAgICBpZihjbGlja0RpZmYgPCAyMDAgJiYgY2xpY2tEaXN0YW5jZSA8IDUpIHtcbiAgICAgICAgLy8gWk9PTSFcbiAgICAgICAgaWYoZW5hYmxlQ2xpY2tUb1pvb20pe1xuICAgICAgICAgIC8vIHVzZSBzaGlmdCBrZXkgdG8gZGV0ZXJtaW5lIHRvIHpvb20gaW4gb3Igem9vbSBvdXRcbiAgICAgICAgICBsZXQgem9vbUJ5ID0gem9vbUZhY3RvcnMuaW47XG4gICAgICAgICAgaWYoZXZlbnQuc2hpZnRLZXkpe1xuICAgICAgICAgICAgem9vbUJ5ID0gem9vbUZhY3RvcnMub3V0O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBuZXdDZW50ZXIgPSB7eDogMC41LCB5OiAwLjV9XG5cbiAgICAgICAgICAvLyBnbyBob21lIGlmIHNjYWxlIDwgMVxuICAgICAgICAgIGxldCBuZXdTY2FsZSA9IHpvb21CeSAqIHNjYWxlO1xuICAgICAgICAgIGlmKG5ld1NjYWxlID4gMSl7XG4gICAgICAgICAgICAvLyB1c2UgY3VycmVudCBtb3VzZSBwb3NpdGlvbiB0byBmaW5kIG5ldyBjZW50ZXIgcG9zaXRpb25cbiAgICAgICAgICAgIGNvbnN0IGZpeGVkUG9pbnQgPSB7XG4gICAgICAgICAgICAgIHg6IHRoaXMudG9QZXJjZW50KGV2ZW50Lm9mZnNldFggLSB0b3BMZWZ0LngpLFxuICAgICAgICAgICAgICB5OiB0aGlzLnRvUGVyY2VudChldmVudC5vZmZzZXRZIC0gdG9wTGVmdC55KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3Q2VudGVyID0ge1xuICAgICAgICAgICAgICB4OiBmaXhlZFBvaW50LnggLSAoKGZpeGVkUG9pbnQueCAtIGdjeCkvem9vbUJ5KSxcbiAgICAgICAgICAgICAgeTogZml4ZWRQb2ludC55IC0gKChmaXhlZFBvaW50LnkgLSBnY3kpL3pvb21CeSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3U2NhbGUgPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnRyYW5zaXRpb25UbyhuZXdDZW50ZXIueCwgbmV3Q2VudGVyLnksIG5ld1NjYWxlLCA1MDApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGhvbWUoKSB7XG4gICAgICBjb25zdCB7aG9tZVgsIGhvbWVZLCBob21lU2NhbGV9ID0gdGhpcy5nZXQoKTtcbiAgICAgIHRoaXMudHJhbnNpdGlvblRvKGhvbWVYLGhvbWVZLGhvbWVTY2FsZSw4MDApXG4gICAgfSxcbiAgICB0cmFuc2l0aW9uVG8oeCwgeSwgc2NhbGUsIGR1cmF0aW9uKSB7XG4gICAgICB0aGlzLnJlZnMuem9vbS50cmFuc2l0aW9uVG8oeCx5LHNjYWxlLGR1cmF0aW9uKTtcbiAgICB9LFxuICAgIHpvb21pdChtdWx0aXBsaWVyKSB7XG4gICAgICBjb25zdCB7IHNjYWxlIH0gPSB0aGlzLmdldCgpO1xuICAgICAgdGhpcy5yZWZzLnpvb20uc2NhbGVUbyhzY2FsZSAqIG11bHRpcGxpZXIsIDUwMClcbiAgICB9LFxuICAgIGljb25Ub0NhbnZhc1Bvc2l0aW9uKGljb24sIGxheWVySW5kZXgpIHtcbiAgICAgIGNvbnN0IHtjb25maWcsIHNjYWxlQ291bnRGYWN0b3IsIHRvcExlZnQsIGxheWVyU2NhbGUsIGN1cnJlbnRab29tSW5kZXh9ID0gdGhpcy5nZXQoKTtcblxuICAgICAgY29uc3QgcHJvcG9ydGlvbmFsU2NhbGVDb3VudEZhY3RvciA9IHNjYWxlQ291bnRGYWN0b3IgLyAoY3VycmVudFpvb21JbmRleCArIDEpXG4gICAgICBjb25zdCBzY2FsZU1vZGlmaWVyID0gKE1hdGguc3FydChNYXRoLm1pbihwcm9wb3J0aW9uYWxTY2FsZUNvdW50RmFjdG9yLCBpY29uLm51bV9hY3RpdmF0aW9ucykgLyBwcm9wb3J0aW9uYWxTY2FsZUNvdW50RmFjdG9yKSkgXG4gICAgICBjb25zdCBpY29uV2lkdGggPSBjb25maWcuaWNvbl9zaXplICogbGF5ZXJTY2FsZSAqIHNjYWxlTW9kaWZpZXI7XG5cbiAgICAgIGNvbnN0IHN4ID0gaWNvbi5sb2NhbFggKiBjb25maWcuaWNvbl9zaXplO1xuICAgICAgY29uc3Qgc3kgPSBpY29uLmxvY2FsWSAqIGNvbmZpZy5pY29uX3NpemU7XG5cbiAgICAgIGNvbnN0IHRpbGVQb3NfeCA9IGljb24uZ3JpZF95ICogY29uZmlnLmljb25fc2l6ZTtcbiAgICAgIGNvbnN0IHRpbGVQb3NfeSA9IGljb24uZ3JpZF94ICogY29uZmlnLmljb25fc2l6ZTtcblxuICAgICAgLy8gcGl4ZWwgY29vcmRpbmF0ZSBpbiB0aGUgZ2xvYmFsIGNvb3JkaW5hdGUgc3BhY2VcbiAgICAgIGNvbnN0IGdsb2JhbFBpeGVsUG9zX3ggPSB0aWxlUG9zX3ggKiBsYXllclNjYWxlO1xuICAgICAgY29uc3QgZ2xvYmFsUGl4ZWxQb3NfeSA9IHRpbGVQb3NfeSAqIGxheWVyU2NhbGU7XG5cbiAgICAgIGNvbnN0IGNhbnZhc1Bvc194ID0gZ2xvYmFsUGl4ZWxQb3NfeCArIHRvcExlZnQueDtcbiAgICAgIGNvbnN0IGNhbnZhc1Bvc195ID0gZ2xvYmFsUGl4ZWxQb3NfeSArIHRvcExlZnQueTsgICAgICBcblxuICAgICAgLy8gY2FsYyBzY2FsZSBhZGp1c3QgZmFjdG9yIHRvIGNlbnRlciB0aGUgaW1hZ2UgZm9yIHRoZSBpY29uIGluIGl0J3MgYm94XG4gICAgICBjb25zdCBzY2FsZUFkanVzdEZhY3RvciA9ICAoMSAtIHNjYWxlTW9kaWZpZXIpICogY29uZmlnLmljb25fc2l6ZSAqIGxheWVyU2NhbGUgIC8gMjtcblxuICAgICAgY29uc3QgZHggPSBjYW52YXNQb3NfeCArIHNjYWxlQWRqdXN0RmFjdG9yO1xuICAgICAgY29uc3QgZHkgPSBjYW52YXNQb3NfeSArIHNjYWxlQWRqdXN0RmFjdG9yO1xuXG4gICAgICByZXR1cm4ge3N4LCBzeSwgZHgsIGR5LCBpY29uV2lkdGh9XG4gICAgfSxcbiAgICB0b1BlcmNlbnQocCkge1xuICAgICAgY29uc3Qge3NjYWxlLCBtaW5WaWV3RGltSW5QeH0gPSB0aGlzLmdldCgpO1xuICAgICAgcmV0dXJuIHAgLyAoc2NhbGUgKiBtaW5WaWV3RGltSW5QeCk7XG4gICAgfSxcbiAgICB0b1BpeGVscyhwKSB7XG4gICAgICBjb25zdCB7c2NhbGUsIG1pblZpZXdEaW1JblB4fSA9IHRoaXMuZ2V0KCk7XG4gICAgICByZXR1cm4gcCAqIHNjYWxlICogbWluVmlld0RpbUluUHg7XG4gICAgfSxcbiAgICBjbGVhcigpIHtcbiAgICAgIGNvbnN0IHt2aWV3SGVpZ2h0LCB2aWV3V2lkdGgsIGNvbnRleHQsIGJhY2tncm91bmRDb2xvcn0gPSB0aGlzLmdldCgpO1xuICAgICAgY29udGV4dC5nbG9iYWxBbHBoYSA9IDE7XG4gICAgICBjb250ZXh0LmZpbGxTdHlsZT0gYmFja2dyb3VuZENvbG9yO1xuICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdmlld1dpZHRoLCB2aWV3SGVpZ2h0KTtcbiAgICAgIGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgdmlld1dpZHRoLCB2aWV3SGVpZ2h0KTtcbiAgICB9LFxuICAgIHVwZGF0ZUljb25Ib3ZlckltYWdlKCkge1xuICAgICAgY29uc3Qge2N1cnJlbnRJY29uSW5mbywgY3VycmVudFpvb21JbmRleCwgaWNvbkNyb3AsIGNvbmZpZywgc2hvd0hvdmVySW1hZ2V9ID0gdGhpcy5nZXQoKTtcbiAgICAgIGlmKGN1cnJlbnRJY29uSW5mbyAmJiBzaG93SG92ZXJJbWFnZSl7XG4gICAgICAgIGxvYWQoY3VycmVudEljb25JbmZvLnVybCkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgY29uc3QgaG92ZXJJbWFnZUNvbnRleHQgPSB0aGlzLnJlZnMuaG92ZXJJbWFnZS5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgIGNvbnN0IHtzeCwgc3ksIGR4LCBkeSwgaWNvbldpZHRofSA9IHRoaXMuaWNvblRvQ2FudmFzUG9zaXRpb24oY3VycmVudEljb25JbmZvLCBjdXJyZW50Wm9vbUluZGV4KVxuICAgICAgICAgIGNvbnN0IGljb25PZmZzZXQgPSAoaWNvbkNyb3AgKiBjb25maWcuaWNvbl9zaXplKSAvIDI7XG4gICAgICAgICAgY29uc3QgZWRnZUxlbmd0aCA9IE1hdGgubWluKHRoaXMucmVmcy5ob3ZlckltYWdlLmhlaWdodCwgdGhpcy5yZWZzLmhvdmVySW1hZ2Uud2lkdGgpXG4gICAgICAgICAgaG92ZXJJbWFnZUNvbnRleHQuZHJhd0ltYWdlKHJlc3BvbnNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvL3NvdXJjZVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzeSArIGljb25PZmZzZXQsIHN4ICsgaWNvbk9mZnNldCwgY29uZmlnLmljb25fc2l6ZSAtIGljb25PZmZzZXQgKiAyLCBjb25maWcuaWNvbl9zaXplIC0gaWNvbk9mZnNldCAqIDIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vZGVzdGluYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgMCwgMCwgZWRnZUxlbmd0aCwgZWRnZUxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9LFxuICAgIHJlbmRlcigpIHtcblxuICAgICAgY29uc3Qge2ltYWdlU21vb3RoaW5nLCBtaW5BY3RpdmF0aW9ucywgdmlld0hlaWdodCwgdmlld1dpZHRoLCBjb250ZXh0LCBiYWNrZ3JvdW5kQ29sb3IsIGNvbmZpZywgbGF5ZXJzLCBjdXJyZW50Wm9vbUluZGV4LCBzdHJva2VDb2xvciwgc3Ryb2tlVGhpY2tuZXNzLCBmb250U2l6ZSx0ZXh0U2hhZG93Q29sb3IsIHRleHRDb2xvciwgbWF4QXR0cmlidXRpb25WYWx1ZSwgY2xhc3NIZWF0bWFwTXVsdGlwbGllcn0gPSB0aGlzLmdldCgpO1xuXG4gICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAvLyBjb250ZXh0LmltYWdlU21vb3RoaW5nUXVhbGl0eSA9IFwibG93XCI7XG4gICAgICBjb250ZXh0LmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGltYWdlU21vb3RoaW5nO1xuXG4gICAgICBpZiAoY29uZmlnICYmIGxheWVycykge1xuICAgICAgICBsYXllcnMuZm9yRWFjaCgoaWNvbnMsIGxheWVySW5kZXgpID0+IHtcbiAgICAgICAgICBjb25zdCB2aXNpYmxlTGF5ZXJzID0gW2N1cnJlbnRab29tSW5kZXhdXG5cbiAgICAgICAgICBpZiAodmlzaWJsZUxheWVycy5pbmRleE9mKGxheWVySW5kZXgpID4gLTEpIHtcblxuICAgICAgICAgICAgaWNvbnMuZm9yRWFjaCgoY29sdW1ucywgeCkgPT4ge1xuICAgICAgICAgICAgICBjb2x1bW5zLmZvckVhY2goKGljb24sIHkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaWNvbi5udW1fYWN0aXZhdGlvbnMgPj0gbWluQWN0aXZhdGlvbnMpIHtcblxuICAgICAgICAgICAgICAgICAgY29uc3Qge2R4LCBkeSwgaWNvbldpZHRofSA9IHRoaXMuaWNvblRvQ2FudmFzUG9zaXRpb24oaWNvbiwgbGF5ZXJJbmRleCk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIElmIGljb24gaXMgaW4gdGhlIHZpZXdwb3J0XG4gICAgICAgICAgICAgICAgICBpZiAoZHggPiAtaWNvbldpZHRoICYmIGR4IDwgdmlld1dpZHRoICYmIGR5ID4gLWljb25XaWR0aCAmJiBkeSA8IHZpZXdIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIHdhbnQgdG8gZHJhdyBhIGJveCBiZWZvcmUgdGhlIGljb24gaGFzIGxvYWRlZCBzbyB0aGVyZSBpc24ndCBqdXN0IHdoaXRlbmVzcy5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qge3N4LCBzeSwgZHgsIGR5LCBpY29uV2lkdGh9ID0gdGhpcy5pY29uVG9DYW52YXNQb3NpdGlvbihpY29uLCBsYXllckluZGV4KVxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0Lmdsb2JhbEFscGhhID0gMC43NTtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9IHN0cm9rZUNvbG9yO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmxpbmVXaWR0aCA9IHN0cm9rZVRoaWNrbmVzcztcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBcIndoaXRlXCI7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucmVjdChkeCwgZHksIGljb25XaWR0aCwgaWNvbldpZHRoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zdHJva2UoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5maWxsKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgbG9hZChpY29uLnVybCkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgdGhhdCB3ZSdyZSBzdGlsbCBvbiB0aGUgcmlnaHQgbGF5ZXIvem9vbVxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtjdXJyZW50Wm9vbUluZGV4LCBpY29uQ3JvcCwgc2hvd0xhYmVscywgdGV4dFNoYWRvd30gPSB0aGlzLmdldCgpO1xuICAgICAgICAgICAgICAgICAgICAgIGlmKGN1cnJlbnRab29tSW5kZXggPT0gbGF5ZXJJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge2FscGhhQXR0cmlidXRpb25GYWN0b3IsIGxhYmVscywgY29uZmlnLCBjbGFzc0hlYXRtYXAsIGNsYXNzSGVhdG1hcE11bHRpcGxpZXIsIGNsYXNzSGVhdG1hcFBvc2l0aXZlfSA9IHRoaXMuZ2V0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGFzc0hlYXRtYXAgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaSA9IGljb24uZnVsbF9jbGFzc19pbmRpY2VzLmluZGV4T2YoY2xhc3NIZWF0bWFwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEgPSBpY29uLmZ1bGxfY2xhc3NfdmFsdWVzW2ldIC8gbWF4QXR0cmlidXRpb25WYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhID0gYSAqIGNsYXNzSGVhdG1hcFBvc2l0aXZlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEgPSBNYXRoLm1heCgwLCBhKSAqIGNsYXNzSGVhdG1hcE11bHRpcGxpZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYSA9IDAuMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IGEgPSBNYXRoLm1pbigxLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICBNYXRoLm1heCgwLjIsIE1hdGgucG93KGljb24udG9wX2NsYXNzX3ZhbHVlc1swXSwgMikgKiBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgMTAwMCAqIGFscGhhQXR0cmlidXRpb25GYWN0b3IpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IGN1cnJlbnQgdmFsdWVzIGluIGNhc2UgdGhleSBjaGFuZ2VkIHdoaWxlIGxvYWRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtzeCwgc3ksIGR4LCBkeSwgaWNvbldpZHRofSA9IHRoaXMuaWNvblRvQ2FudmFzUG9zaXRpb24oaWNvbiwgbGF5ZXJJbmRleClcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHJhdyB0aGUgaWNvblxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5nbG9iYWxBbHBoYSA9IGE7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpY29uT2Zmc2V0ID0gKGljb25Dcm9wICogY29uZmlnLmljb25fc2l6ZSkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5jbGVhclJlY3QoZHggKyAxLCBkeSArIDEsIGljb25XaWR0aCAtIDIsIGljb25XaWR0aCAtIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5kcmF3SW1hZ2UocmVzcG9uc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vc291cmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN5ICsgaWNvbk9mZnNldCwgc3ggKyBpY29uT2Zmc2V0LCBjb25maWcuaWNvbl9zaXplIC0gaWNvbk9mZnNldCAqIDIsIGNvbmZpZy5pY29uX3NpemUgLSBpY29uT2Zmc2V0ICogMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy9kZXN0aW5hdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICBkeCwgZHksIGljb25XaWR0aCwgaWNvbldpZHRoXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5nbG9iYWxBbHBoYSA9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzaG93TGFiZWxzICYmIGxhYmVscykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0Lmdsb2JhbEFscGhhID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5mb250PWZvbnRTaXplICsgXCJweCBIZWx2ZXRpY2FcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHRTaGFkb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmxpbmVXaWR0aCA9IDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9IHRleHRTaGFkb3dDb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZVRleHQobGFiZWxzW2ljb24udG9wX2NsYXNzX2luZGljZXNbMF1dLCBkeCArIDQsIGR5ICsgaWNvbldpZHRoIC0gNCwgaWNvbldpZHRoIC0gOCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSB0ZXh0Q29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZmlsbFRleHQobGFiZWxzW2ljb24udG9wX2NsYXNzX2luZGljZXNbMF1dLCBkeCArIDQsIGR5ICsgaWNvbldpZHRoIC0gNCwgaWNvbldpZHRoIC0gOCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgfVxuICB9XG5cbjwvc2NyaXB0PlxuXG5cbjxzdHlsZT5cbiAgcmVmOnJvb3Qge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgY29udGFpbjogbGF5b3V0O1xuICB9XG4gIHJlZjpzdGFnZSB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGhlaWdodDogMTAwJTtcbiAgICBvdmVyZmxvdzogaGlkZGVuO1xuICB9XG4gIHJlZjpzdGFnZS5wYW5uaW5nIHtcbiAgICBjdXJzb3I6IG1vdmU7XG4gIH1cbiAgcmVmOmNhbnZhcyB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgfVxuICAuaG92ZXIge1xuICAgIGNvbG9yOiB3aGl0ZTtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgZm9udC1zaXplOiAxMnB4O1xuICAgIGxpbmUtaGVpZ2h0OiAxNHB4O1xuICAgIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC44KTtcbiAgICBwYWRkaW5nOiA2cHg7XG4gICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgYm9yZGVyLXJhZGl1czogMCA4cHggOHB4IDhweDtcbiAgICBib3JkZXI6IHNvbGlkIDFweCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNCk7XG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICBib3gtc2hhZG93OiAwIDFweCA4cHggcmdiYSgwLCAwLCAwLCAwLjQpO1xuICAgIHdpZHRoOiAyMDBweDtcbiAgICB6LWluZGV4OiAxMDAwMDtcbiAgfVxuICAuaG92ZXIgdGFibGUge1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIG1hcmdpbi1ib3R0b206IDA7XG4gIH1cbiAgLmhvdmVyIHRkIHtcbiAgICBmb250LXNpemU6IDEycHg7XG4gICAgYm9yZGVyLWJvdHRvbTogc29saWQgMXB4IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4yKTtcbiAgICBwYWRkaW5nOiA2cHggMDtcbiAgICBtYXJnaW46IDZweCAwO1xuICAgIGNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOCk7XG4gICAgb3ZlcmZsb3c6IGVsbGlwc2lzO1xuICB9XG4gIC5ob3ZlciB0ZC5maXJzdCB7XG4gICAgY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMS4wKTtcbiAgICBmb250LXdlaWdodDogYm9sZDtcbiAgfVxuXG4gIC5pY29uIHtcbiAgICBkaXNwbGF5OiBibG9jaztcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgdG9wOiAwO1xuICAgIGxlZnQ6IDA7XG4gICAgYm9yZGVyLXJhZGl1czogNHB4O1xuICAgIGJvcmRlcjogc29saWQgM3B4IGJsYWNrO1xuICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gIH1cbjwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXNnQkUsOEJBQVMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixPQUFPLENBQUUsTUFBTSxBQUNqQixDQUFDLEFBQ0QsK0JBQVUsQ0FBQyxBQUNULFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEdBQUcsQ0FBRSxDQUFDLENBQ04sSUFBSSxDQUFFLENBQUMsQ0FDUCxLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxJQUFJLENBQ1osUUFBUSxDQUFFLE1BQU0sQUFDbEIsQ0FBQyxBQUNELGlCQUFTLFFBQVEsY0FBQyxDQUFDLEFBQ2pCLE1BQU0sQ0FBRSxJQUFJLEFBQ2QsQ0FBQyxBQUNELGdDQUFXLENBQUMsQUFDVixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsQ0FBQyxDQUNOLElBQUksQ0FBRSxDQUFDLENBQ1AsYUFBYSxDQUFFLEdBQUcsQUFDcEIsQ0FBQyxBQWlDRCxLQUFLLGNBQUMsQ0FBQyxBQUNMLE9BQU8sQ0FBRSxLQUFLLENBQ2QsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsR0FBRyxDQUFFLENBQUMsQ0FDTixJQUFJLENBQUUsQ0FBQyxDQUNQLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLE1BQU0sQ0FBRSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FDdkIsY0FBYyxDQUFFLElBQUksQ0FDcEIsVUFBVSxDQUFFLFVBQVUsQUFDeEIsQ0FBQyJ9 */";
		append(document.head, style);
	}

	function create_main_fragment$3(component, ctx) {
		var radar_updating = {}, text0, text1, div1, div0, zoom_updating = {}, text2, canvas, canvas_width_value, canvas_height_value, text3, div0_class_value, div1_resize_listener;

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

		var if_block0 = (ctx.ready) && create_if_block_1(component, ctx);

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

		var if_block1 = (ctx.showHoverIcon) && create_if_block(component, ctx);

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
				canvas.width = canvas_width_value = ctx.viewWidth * ctx.screenResolution;
				canvas.height = canvas_height_value = ctx.viewHeight * ctx.screenResolution;
				setStyle(canvas, "width", "" + ctx.viewWidth + "px");
				setStyle(canvas, "height", "" + ctx.viewHeight + "px");
				canvas.className = "svelte-ptap6b svelte-ref-canvas";
				addLoc(canvas, file$3, 35, 6, 688);
				addListener(div0, "mousedown", mousedown_handler);
				addListener(div0, "mousemove", mousemove_handler);
				addListener(div0, "mouseenter", mouseenter_handler);
				addListener(div0, "mouseout", mouseout_handler);
				div0.className = div0_class_value = "" + ((ctx.mouseMoveMode == 'pan' & ctx.enableDragToPan) ? 'panning' : '') + " svelte-ptap6b" + " svelte-ref-stage";
				addLoc(div0, file$3, 20, 4, 275);
				component.root._beforecreate.push(div1_resize_handler);
				div1.className = "svelte-ptap6b svelte-ref-root";
				addLoc(div1, file$3, 15, 2, 185);
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
						if_block0 = create_if_block_1(component, ctx);
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
						if_block1 = create_if_block(component, ctx);
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
				div1_resize_listener.cancel();
				if (component.refs.root === div1) component.refs.root = null;
			}
		};
	}

	// (3:0) {#if ready}
	function create_if_block_1(component, ctx) {
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
	function create_if_block(component, ctx) {
		var div;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "icon svelte-ptap6b";
				setStyle(div, "width", (ctx.iconSizeInPixels + 2 + 'px'));
				setStyle(div, "height", (ctx.iconSizeInPixels + 2 + 'px'));
				setStyle(div, "left", (ctx.topLeftCornerHover.x + 'px'));
				setStyle(div, "top", (ctx.topLeftCornerHover.y + 'px'));
				addLoc(div, file$3, 42, 8, 920);
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

	function Atlas(options) {
		this._debugName = '<Atlas>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$3(), options.data);

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
		this._intro = true;
		this._handlers.update = [onupdate$1];

		if (!document.getElementById("svelte-ptap6b-style")) add_css$1();

		this._fragment = create_main_fragment$3(this, this._state);

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

	function data$4() {
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
	var methods$2 = {
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
	function create_main_fragment$4(component, state) {
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
		this._state = assign$1(data$4(), options.data);
		this._recompute({ width: 1, height: 1 }, this._state);

		var _oncreate = oncreate$3.bind(this);

		if (!options.root) {
			this._oncreate = [];
		}

		this._fragment = create_main_fragment$4(this, this._state);

		this.root._oncreate.push(_oncreate);

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);

			callAll$1(this._oncreate);
		}
	}

	assign$1(Sprite.prototype, methods$2, proto$1);

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



	function height({clientWidth}) {
		return clientWidth;
	}

	function id({model, layerName}) {
		return model + "_" + layerName;
	}

	function data$5() {
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
	var methods$3 = {
	  render() {
	    const {grid, gridSize, icons, classHeatmap} = this.get();
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
	      let heatmapMultiplier = 1.0;
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
	      data[y * gridSize * 4 + x * 4 + 3] = 0.005 * 255 * (icon.n / Math.pow((grid + 1), 2)) * heatmapMultiplier;
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
	const file$4 = "src/AtlasThumbnail.html";

	function add_css$2() {
		var style = createElement("style");
		style.id = 'svelte-sjakuy-style';
		style.textContent = "canvas.svelte-sjakuy{image-rendering:pixelated}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXRsYXNUaHVtYm5haWwuaHRtbCIsInNvdXJjZXMiOlsiQXRsYXNUaHVtYm5haWwuaHRtbCJdLCJzb3VyY2VzQ29udGVudCI6WyJcbjxkaXYgYmluZDpjbGllbnRXaWR0aCBzdHlsZT1cImhlaWdodDoge2hlaWdodH1weDtcIj5cbiAgPGNhbnZhcyByZWY6Y2FudmFzIHdpZHRoPXtncmlkU2l6ZX0gaGVpZ2h0PXtncmlkU2l6ZX0gc3R5bGU9XCJ3aWR0aDoge2NsaWVudFdpZHRofXB4OyBoZWlnaHQ6IHtoZWlnaHR9cHg7XCI+PC9jYW52YXM+XG48L2Rpdj5cblxuPHNjcmlwdD5cbmltcG9ydCB7IGxvYWQgfSBmcm9tICdsdWNpZC1jb21wb25lbnRzJztcbmltcG9ydCBjbGFzc2VzVG9LZWVwIGZyb20gJy4vY2xhc3Nlc1RvS2VlcC5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZGF0YSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcm9vdDogXCJodHRwczovL3N0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vYWN0aXZhdGlvbi1hdGxhcy9idWlsZFwiLFxuICAgICAgbW9kZWw6IFwiaW5jZXB0aW9udjFcIixcbiAgICAgIGxheWVyTmFtZTogXCJtaXhlZDRkXCIsXG4gICAgICBncmlkOiAxLFxuICAgICAgbGF5b3V0OiAwLFxuICAgICAgZ3JpZFNpemU6IDEwLFxuICAgICAgY2xhc3NIZWF0bWFwOiAtMSxcbiAgICAgIGljb25zOiBbXVxuICAgIH07XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgaGVpZ2h0OiAoe2NsaWVudFdpZHRofSkgPT4gY2xpZW50V2lkdGgsXG4gICAgaWQ6ICh7bW9kZWwsIGxheWVyTmFtZX0pID0+IG1vZGVsICsgXCJfXCIgKyBsYXllck5hbWVcbiAgfSxcbiAgb25jcmVhdGUoKSB7XG4gICAgY29uc3Qge3Jvb3QsIGlkLCBncmlkfSA9IHRoaXMuZ2V0KCk7XG4gICAgbG9hZChgJHtyb290fS8ke2lkfS8ke2lkfS5qc29uYCkudGhlbihjb25maWcgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coXCJjb25maWc6IFwiLCBjb25maWcpXG4gICAgICBpZiAoY29uZmlnLmNsYXNzX2ZpbHRlciA9PSBudWxsKSB7IGNvbmZpZy5jbGFzc19maWx0ZXIgPSBcIk5vbmVcIiB9XG4gICAgICBpZiAoY29uZmlnLmZpbHRlciA9PSBudWxsKSB7IGNvbmZpZy5maWx0ZXIgPSBcIk5vbmVcIiB9XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29uZmlnLmxheW91dCkpIHtjb25maWcubGF5b3V0ID0gW2NvbmZpZy5sYXlvdXRdfVxuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbmZpZy5sYXllcikpIHtjb25maWcubGF5ZXIgPSBbY29uZmlnLmxheWVyXX1cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShjb25maWcuZmlsdGVyKSkge2NvbmZpZy5maWx0ZXIgPSBbY29uZmlnLmZpbHRlcl19XG4gICAgICB0aGlzLnNldCh7Z3JpZFNpemU6IGNvbmZpZy5ncmlkX3NpemVbZ3JpZF19KVxuICAgICAgY29uc3QgdXJsID0gYCR7cm9vdH0vJHtpZH0vd2ViL3dlYi0tZ3JpZF9zaXplPSR7Y29uZmlnLmdyaWRfc2l6ZVtncmlkXX0tLWxheW91dD0ke2NvbmZpZy5sYXlvdXRbMF19LS1jbGFzc19maWx0ZXI9JHtjb25maWcuY2xhc3NfZmlsdGVyfS0tZmlsdGVyPSR7Y29uZmlnLmZpbHRlclswXX0tLWxheWVyPSR7Y29uZmlnLmxheWVyWzBdfS0tbW9kZWw9JHtjb25maWcubW9kZWx9LS1zYW1wbGVfaW1hZ2VzPSR7Y29uZmlnLnNhbXBsZV9pbWFnZXN9LS1zYW1wbGVfdHlwZT0ke2NvbmZpZy5zYW1wbGVfdHlwZX0uanNvbmBcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiY29uZmlnXCIsIGNvbmZpZylcbiAgICAgIGxvYWQodXJsKS50aGVuKHdlYiA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwid2ViXCIsIHdlYilcbiAgICAgICAgdGhpcy5zZXQoe2ljb25zOiB3ZWJ9KTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgIH0pXG4gICAgfSlcbiAgfSxcbiAgb251cGRhdGUoe2NoYW5nZWR9KSB7XG4gICAgaWYgKGNoYW5nZWQuY2xhc3NIZWF0bWFwKSB7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHJlbmRlcigpIHtcbiAgICAgIGNvbnN0IHtncmlkLCBncmlkU2l6ZSwgaWNvbnMsIGNsYXNzSGVhdG1hcH0gPSB0aGlzLmdldCgpO1xuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMucmVmcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgIGxldCBpbWFnZURhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBncmlkU2l6ZSwgZ3JpZFNpemUpO1xuICAgICAgbGV0IGRhdGEgPSBpbWFnZURhdGEuZGF0YTtcbiAgICAgIC8vIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkgKz0gNCkge1xuICAgICAgICAvLyBkYXRhW2ldID0gMTAwO1xuICAgICAgICAvLyBkYXRhW2kgKyAxXSA9IDEwMDtcbiAgICAgICAgLy8gZGF0YVtpICsgMl0gPSAxMDA7XG4gICAgICAgIC8vIGRhdGFbaSArIDNdID0gMjU1O1xuICAgICAgLy8gfVxuICAgICAgZm9yIChjb25zdCBpY29uIG9mIGljb25zKSB7XG4gICAgICAgIGxldCBoZWF0bWFwTXVsdGlwbGllciA9IDEuMDtcbiAgICAgICAgaWYgKGNsYXNzSGVhdG1hcCA+IC0xKSB7XG4gICAgICAgICAgbGV0IGNpID0gY2xhc3Nlc1RvS2VlcC5pbmRleE9mKGNsYXNzSGVhdG1hcCk7XG4gICAgICAgICAgbGV0IHZhbHVlID0gTWF0aC5tYXgoMCwgaWNvbi5mW2NpXSk7XG4gICAgICAgICAgaGVhdG1hcE11bHRpcGxpZXIgPSBNYXRoLm1heCgwLjEsIHZhbHVlICogMjApO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGNpLCB2YWx1ZSlcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB5ID0gaWNvbi54OyAvL3gseSBzd2l0Y2hlZCBvbiBwdXJwb3NlIFxuICAgICAgICBjb25zdCB4ID0gaWNvbi55OyAvL3gseSBzd2l0Y2hlZCBvbiBwdXJwb3NlXG4gICAgICAgIC8vIGRhdGFbeSAqIGdyaWRTaXplICogNCArIHggKiA0ICsgMF0gPSAoaGVhdG1hcE11bHRpcGxpZXIpICogMjU1ICogMjA7XG4gICAgICAgIC8vIGRhdGFbeSAqIGdyaWRTaXplICogNCArIHggKiA0ICsgMV0gPSAoaGVhdG1hcE11bHRpcGxpZXIpICogMTMwICogMjA7XG4gICAgICAgIC8vIGRhdGFbeSAqIGdyaWRTaXplICogNCArIHggKiA0ICsgMl0gPSAoaGVhdG1hcE11bHRpcGxpZXIpICogMSAqIDIwO1xuICAgICAgICBkYXRhW3kgKiBncmlkU2l6ZSAqIDQgKyB4ICogNCArIDNdID0gMC4wMDUgKiAyNTUgKiAoaWNvbi5uIC8gTWF0aC5wb3coKGdyaWQgKyAxKSwgMikpICogaGVhdG1hcE11bHRpcGxpZXI7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG4gICAgfVxuICB9XG59XG5cblxuPC9zY3JpcHQ+XG48c3R5bGU+XG5jYW52YXMge1xuICBpbWFnZS1yZW5kZXJpbmc6IHBpeGVsYXRlZDtcbn1cbjwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXNGQSxNQUFNLGNBQUMsQ0FBQyxBQUNOLGVBQWUsQ0FBRSxTQUFTLEFBQzVCLENBQUMifQ== */";
		append(document.head, style);
	}

	function create_main_fragment$5(component, ctx) {
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
				addLoc(canvas, file$4, 2, 2, 54);
				component.root._beforecreate.push(div_resize_handler);
				setStyle(div, "height", "" + ctx.height + "px");
				addLoc(div, file$4, 1, 0, 1);
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
		this._state = assign(data$5(), options.data);

		this._recompute({ clientWidth: 1, model: 1, layerName: 1 }, this._state);
		if (!('clientWidth' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'clientWidth'");
		if (!('model' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'model'");
		if (!('layerName' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'layerName'");

		if (!('gridSize' in this._state)) console.warn("<AtlasThumbnail> was created without expected data property 'gridSize'");
		this._intro = true;
		this._handlers.update = [onupdate$2];

		if (!document.getElementById("svelte-sjakuy-style")) add_css$2();

		this._fragment = create_main_fragment$5(this, this._state);

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
	assign(AtlasThumbnail.prototype, methods$3);

	AtlasThumbnail.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('height' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasThumbnail>: Cannot set read-only property 'height'");
		if ('id' in newState && !this._updatingReadonlyProperty) throw new Error("<AtlasThumbnail>: Cannot set read-only property 'id'");
	};

	AtlasThumbnail.prototype._recompute = function _recompute(changed, state) {
		if (changed.clientWidth) {
			if (this._differs(state.height, (state.height = height(state)))) changed.height = true;
		}

		if (changed.model || changed.layerName) {
			if (this._differs(state.id, (state.id = id(state)))) changed.id = true;
		}
	};

	function download(filename, url) {
	  let a = document.createElement("a");
	  document.body.appendChild(a);
	  a.setAttribute("download", filename + ".jpg");
	  a.setAttribute("href", url);
	  a.style["display"] = "none";
	  a.click();
	}

	let app = document.querySelector("#app");

	// 
	// Atlas Thumbnails
	// 

	let layers = ["mixed3b", "mixed4a", "mixed4b", "mixed4c", "mixed4d", "mixed4e", "mixed5a", "mixed5b"];
	layers.forEach(layer => {

	  let h = document.createElement("h2");
	  h.textContent = "thumbnail-" + layer;
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "80px";
	  e.style.height = "80px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new AtlasThumbnail({
	    target: e,
	    store,
	    data: {
	      layerName: layer,
	      grid: 2,
	    }
	  });

	  let b = document.createElement("button");
	  let name = `thumbnail-${layer}`;
	  b.textContent = `download '${layer}'`;
	  b.addEventListener("click", () => {
	    const canvas = atlas.refs.canvas;
	    let image = canvas.toDataURL("image/jpg");
	    download(name, image);
	  });
	  app.appendChild(b);
	});

	// 
	// mulitple-layers
	// 

	let subjects = ["abacus", "plant", "water"];
	subjects.forEach(s => {
	  let g = store.get().multipleLayers[s];
	  g.forEach((d, i) => {

	    let h = document.createElement("h2");
	    h.textContent = `layers-${s}-${i}`;
	    app.appendChild(h);
	    let e = document.createElement("div");
	    e.style.width = "400px";
	    e.style.height = "300px";
	    e.style.position = "relative";
	    app.appendChild(e);
	    let zoom = 0.8;
	    let defaults = {
	      layerName: "mixed4c",
	      gridSize: 3,
	      homeScale: 16 * 3 * zoom,
	    };
	    let id = d.layerName ? "inceptionv1_" + d.layerName : "inceptionv1_mixed4c";

	    new Atlas({
	      target: e,
	      data: {
	        id,
	        ...defaults,
	        ...d,
	        homeScale: d.homeScale ? d.homeScale * zoom : defaults.homeScale,
	        fontSize: 14,
	        iconCrop: 0.3,
	        showLabels: true,
	        textShadow: true,
	        enableDragToPan: false,
	        enableClickToZoom: false,
	        enableHover: false,
	        imageSmoothing: true,
	      }
	    });
	  });
	});


	// 
	// focus-1-1
	// 
	{
	  let h = document.createElement("h2");
	  h.textContent = "focus-1-1";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "1500px";
	  e.style.height = "1500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeScale: 0.999,
	      id:"inceptionv1_mixed5b",
	      gridSize: 1,
	      alphaAttributionFactor:10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 235,
	      strokeColor: "rgb(150, 150, 150)",
	      strokeThickness: 2,
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}
	// 
	// focus-1-2
	// 
	{
	  let h = document.createElement("h2");
	  h.textContent = "focus-1-2";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeScale: store.get().focus1Highlight.scale,
	      homeX: store.get().focus1Highlight.x,
	      homeY: store.get().focus1Highlight.y,
	      id: "inceptionv1_mixed5b",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 235,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}

	// 
	// focus-2-1
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-2-1";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "1500px";
	  e.style.height = "1500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeScale: 0.999,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 235,
	      strokeColor: "rgb(150, 150, 150)",
	      strokeThickness: 2,
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}


	// 
	// focus-2-2
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-2-2";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeX: store.get().focusHighlights[0].x,
	      homeY: store.get().focusHighlights[0].y,
	      homeScale: store.get().focusHighlights[0].scale,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 235,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}


	// 
	// focus-2-3
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-2-3";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeX: store.get().focusHighlights[1].x,
	      homeY: store.get().focusHighlights[1].y,
	      homeScale: store.get().focusHighlights[1].scale,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 235,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}


	// 
	// focus-2-4
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-2-4";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeX: store.get().focusHighlights[2].x,
	      homeY: store.get().focusHighlights[2].y,
	      homeScale: store.get().focusHighlights[2].scale,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 235,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}


	// 
	// focus-2-5
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-2-5";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeX: store.get().focusHighlights[3].x,
	      homeY: store.get().focusHighlights[3].y,
	      homeScale: store.get().focusHighlights[3].scale,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 235,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}

	// 
	// focus-3-1
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-3-1";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "1500px";
	  e.style.height = "1500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeScale: 0.999,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 287,
	      strokeColor: "rgb(150, 150, 150)",
	      strokeThickness: 2,
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}


	// 
	// focus-3-2
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-3-2";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeX: store.get().focusHighlights[0].x,
	      homeY: store.get().focusHighlights[0].y,
	      homeScale: store.get().focusHighlights[0].scale,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 287,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}


	// 
	// focus-3-3
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-3-3";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeX: store.get().focusHighlights[1].x,
	      homeY: store.get().focusHighlights[1].y,
	      homeScale: store.get().focusHighlights[1].scale,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 287,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}


	// 
	// focus-3-4
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-3-4";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeX: store.get().focusHighlights[2].x,
	      homeY: store.get().focusHighlights[2].y,
	      homeScale: store.get().focusHighlights[2].scale,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 287,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}


	// 
	// focus-3-5
	// 
	{

	  let h = document.createElement("h2");
	  h.textContent = "focus-3-5";
	  app.appendChild(h);
	  let e = document.createElement("div");
	  e.style.width = "500px";
	  e.style.height = "500px";
	  e.style.position = "relative";
	  app.appendChild(e);

	  let atlas = new Atlas({
	    target: e,
	    store,
	    data: {
	      homeX: store.get().focusHighlights[3].x,
	      homeY: store.get().focusHighlights[3].y,
	      homeScale: store.get().focusHighlights[3].scale,
	      id: "inceptionv1_mixed4d",
	      gridSize: 1,
	      alphaAttributionFactor: 10,
	      scaleCountFactor: 500,
	      iconCrop: 0.3,
	      classHeatmap: 287,
	      strokeColor: "rgb(150, 150, 150)",
	      showLabels: false,
	      textShadow: true,
	      enableDragToPan: false,
	      enableClickToZoom: false,
	      enableHover: false
	    }
	  });

	  let b = document.createElement("button");
	  b.textContent = "render";
	  app.appendChild(b);
	  b.addEventListener("click", () => {
	    atlas.render();
	  });
	}

}());
//# sourceMappingURL=renders.js.map
