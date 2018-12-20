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

	function destroyEach(iterations, detach) {
		for (var i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detach);
		}
	}

	function createElement(name) {
		return document.createElement(name);
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
	  classChoices: [9, 622, 780, 665, 652, 322, 288, 233, 225, 188, 169, 80, 76, 62, 61, 7, 355, 990, 897, 746, 791],
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
	      id: "6_442", leftLabel: Labels.inception[6], rightLabel: Labels.inception[442], left: 6, right: 442, annotation: [
	        { pos: { x: 2, y: 7 }, desc: "baseball?" }
	      ]
	    },
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


	    backgroundColor: 'white',
	    strokeColor: 'rgb(220, 220, 220)',
	    imageSmoothing: false,

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

	    const {imageSmoothing, minActivations, viewHeight, viewWidth, context, backgroundColor, config, layers, currentZoomIndex, strokeColor, maxAttributionValue, classHeatmapMultiplier} = this.get();

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
	                        context.font="10px Helvetica";
	                        if (textShadow) {
	                          context.lineWidth = 2;
	                          context.strokeStyle = "rgba(0, 0, 0, 0.8)";
	                          context.strokeText(labels[icon.top_class_indices[0]], dx + 4, dy + iconWidth - 4, iconWidth - 8);
	                        }
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
	const file$3 = "src/Atlas.html";

	function add_css$1() {
		var style = createElement("style");
		style.id = 'svelte-ptap6b-style';
		style.textContent = ".svelte-ref-root.svelte-ptap6b{position:relative;width:100%;height:100%;contain:layout}.svelte-ref-stage.svelte-ptap6b{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden}.svelte-ref-stage.panning.svelte-ptap6b{cursor:move}.svelte-ref-canvas.svelte-ptap6b{position:absolute;top:0;left:0;border-radius:8px}.hover.svelte-ptap6b{color:white;position:absolute;font-size:12px;line-height:14px;background:rgba(0, 0, 0, 0.8);padding:6px;pointer-events:none;border-radius:0 8px 8px 8px;border:solid 1px rgba(255, 255, 255, 0.4);box-sizing:border-box;box-shadow:0 1px 8px rgba(0, 0, 0, 0.4);width:200px;z-index:10000}.hover.svelte-ptap6b table.svelte-ptap6b{width:100%;margin-bottom:0}.hover.svelte-ptap6b td.svelte-ptap6b{font-size:12px;border-bottom:solid 1px rgba(255, 255, 255, 0.2);padding:6px 0;margin:6px 0;color:rgba(255, 255, 255, 0.8);overflow:ellipsis}.hover.svelte-ptap6b td.first.svelte-ptap6b{color:rgba(255, 255, 255, 1.0);font-weight:bold}.icon.svelte-ptap6b{display:block;position:absolute;top:0;left:0;border-radius:4px;border:solid 3px black;pointer-events:none;box-sizing:border-box}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXRsYXMuaHRtbCIsInNvdXJjZXMiOlsiQXRsYXMuaHRtbCJdLCJzb3VyY2VzQ29udGVudCI6WyI8UmFkYXIgYmluZDpyZWFkeSAvPlxuXG57I2lmIHJlYWR5fVxuICA8QXRsYXNEYXRhTG9hZGVyIFxuICAgIHtpZH0gXG4gICAge2xheWVyfSBcbiAgICB7bGF5b3V0fVxuICAgIHtjbGFzc0ZpbHRlcn1cbiAgICB7ZmlsdGVyfVxuICAgIGJpbmQ6Y29uZmlnXG4gICAgYmluZDpsYXllcnMgXG4gICAgYmluZDpsYWJlbHMgXG4gIC8+XG57L2lmfVxuXG4gIDxkaXZcbiAgICByZWY6cm9vdFxuICAgIGJpbmQ6Y2xpZW50V2lkdGg9dmlld1dpZHRoXG4gICAgYmluZDpjbGllbnRIZWlnaHQ9dmlld0hlaWdodFxuICA+XG4gICAgPGRpdlxuICAgICAgcmVmOnN0YWdlXG4gICAgICBjbGFzcz1cInsobW91c2VNb3ZlTW9kZSA9PSAncGFuJyAmIGVuYWJsZURyYWdUb1BhbikgPyAncGFubmluZycgOiAnJ31cIlxuICAgICAgb246bW91c2Vkb3duPVwibW91c2VEb3duKGV2ZW50KVwiIG9uOm1vdXNlbW92ZT1cIm1vdXNlTW92ZShldmVudClcIiBcbiAgICAgIG9uOm1vdXNlZW50ZXI9XCJtb3VzZUVudGVyKGV2ZW50KVwiIG9uOm1vdXNlb3V0PVwibW91c2VPdXQoZXZlbnQpXCJcbiAgICA+XG4gICAgICA8Wm9vbVxuICAgICAgICByZWY6em9vbVxuICAgICAgICBiaW5kOnNjYWxlXG4gICAgICAgIGJpbmQ6dW5pdFxuICAgICAgICBiaW5kOmdjeFxuICAgICAgICBiaW5kOmdjeVxuICAgICAgICB3aWR0aD17dmlld1dpZHRofVxuICAgICAgICBoZWlnaHQ9e3ZpZXdIZWlnaHR9XG4gICAgICAvPlxuICAgICAgPGNhbnZhc1xuICAgICAgICByZWY6Y2FudmFzXG4gICAgICAgIHdpZHRoPXt2aWV3V2lkdGggKiBzY3JlZW5SZXNvbHV0aW9ufVxuICAgICAgICBoZWlnaHQ9e3ZpZXdIZWlnaHQgKiBzY3JlZW5SZXNvbHV0aW9ufVxuICAgICAgICBzdHlsZT1cIndpZHRoOiB7dmlld1dpZHRofXB4OyBoZWlnaHQ6IHt2aWV3SGVpZ2h0fXB4O1wiXG4gICAgICA+PC9jYW52YXM+XG4gICAgICB7I2lmIHNob3dIb3Zlckljb259XG4gICAgICAgIDxkaXYgY2xhc3M9XCJpY29uXCIgc3R5bGU9XCJ3aWR0aDp7aWNvblNpemVJblBpeGVscyArIDIgKyAncHgnfTsgaGVpZ2h0OntpY29uU2l6ZUluUGl4ZWxzICsgMiArICdweCd9OyBsZWZ0Ont0b3BMZWZ0Q29ybmVySG92ZXIueCArICdweCd9OyB0b3A6e3RvcExlZnRDb3JuZXJIb3Zlci55ICsgJ3B4J31cIj48L2Rpdj5cbiAgICAgIHsvaWZ9XG4gICAgPC9kaXY+XG5cbiAgICB7I2lmIGxhYmVscyAmJiBzaG93SG92ZXJJY29uICYmIGN1cnJlbnRJY29uSW5mbyAmJiBjdXJyZW50SWNvbkluZm8udG9wX2NsYXNzX2luZGljZXN9XG4gICAgICA8ZGl2IGNsYXNzPVwiaG92ZXJcIiBzdHlsZT1cInRvcDogeyh0b3BMZWZ0Q29ybmVySG92ZXIueSArIGljb25TaXplSW5QaXhlbHMgKyAxMCkgKyAncHgnfTsgbGVmdDogeyh0b3BMZWZ0Q29ybmVySG92ZXIueCArIGljb25TaXplSW5QaXhlbHMgKyAxMCkgKyAncHgnfVwiPlxuICAgICAgICA8dGFibGU+XG4gICAgICAgIHsjaWYgY2xhc3NIZWF0bWFwID4gLTF9XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAgPCEtLSA8dGQ+eyhsYWJlbHNbY2xhc3NIZWF0bWFwXSl9PC90ZD4gLS0+XG4gICAgICAgICAgICA8IS0tIDx0ZCBzdHlsZT1cInRleHQtYWxpZ246IHJpZ2h0O1wiPnsoY3VycmVudEljb25JbmZvLnRvcF9jbGFzc192YWx1ZXNbY3VycmVudEljb25JbmZvLnRvcF9jbGFzc19pbmRpY2VzLmluZGV4T2YoY2xhc3NIZWF0bWFwKV0udG9QcmVjaXNpb24oMikpfTwvdGQ+IC0tPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAgPHRkPnRvcCBjbGFzczoge2xhYmVsc1tjdXJyZW50SWNvbkluZm8udG9wX2NsYXNzX2luZGljZXNbMF1dfTwvdGQ+XG4gICAgICAgICAgICA8dGQgc3R5bGU9XCJ0ZXh0LWFsaWduOiByaWdodDtcIj57KGN1cnJlbnRJY29uSW5mby50b3BfY2xhc3NfdmFsdWVzWzBdLnRvUHJlY2lzaW9uKDIpKX08L3RkPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgIHs6ZWxzZX1cbiAgICAgICAgICB7I2VhY2ggY3VycmVudEljb25JbmZvLnRvcF9jbGFzc19pbmRpY2VzLnNsaWNlKDAsNSkgYXMgdG9wLCBpfVxuICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJ3aWR0aDogMTBweDsgdGV4dC1hbGlnbjogcmlnaHQ7IHBhZGRpbmctcmlnaHQ6IDRweDtcIj57aSArIDF9LjwvdGQ+XG4gICAgICAgICAgICAgIDx0ZCBjbGFzcz1cIntpID09IDAgPyAnZmlyc3QnOiAnJ31cIj57bGFiZWxzW3RvcF19PC90ZD5cbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwidGV4dC1hbGlnbjogcmlnaHQ7XCI+e2N1cnJlbnRJY29uSW5mby50b3BfY2xhc3NfdmFsdWVzW2ldLnRvUHJlY2lzaW9uKDIpfTwvdGQ+XG4gICAgICAgICAgICA8L3RyPlxuICAgICAgICAgIHsvZWFjaH1cbiAgICAgICAgey9pZn1cbiAgICAgICAgPC90YWJsZT5cbiAgICAgICAgeyNpZiBzaG93SG92ZXJJbWFnZX1cbiAgICAgICAgICA8Y2FudmFzIHJlZjpob3ZlckltYWdlPjwvY2FudmFzPlxuICAgICAgICB7L2lmfVxuICAgICAgICA8ZGl2IHN0eWxlPVwiZm9udC1zaXplOiAxMHB4OyBtYXJnaW4tdG9wOiA0cHg7IGNvbG9yOiAjOTk5OyB0ZXh0LWFsaWduOiByaWdodDtcIj5BdmVyYWdlIG9mIHtjdXJyZW50SWNvbkluZm8ubnVtX2FjdGl2YXRpb25zfSBhY3RpdmF0aW9uczwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgey9pZn1cblxuICA8L2Rpdj5cblxuPHNjcmlwdD5cbmltcG9ydCB7IGRlZmF1bHQgYXMgbG9hZCB9IGZyb20gJy4vbG9hZC5qcyc7XG5pbXBvcnQgeyBtYXggfSBmcm9tICdkMy1hcnJheSc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgY29tcG9uZW50czogeyBcbiAgICBBdGxhc0RhdGFMb2FkZXI6ICcuL0F0bGFzRGF0YUxvYWRlci5odG1sJywgXG4gICAgWm9vbTogJy4vWm9vbS5odG1sJyxcbiAgICBSYWRhcjogJy4vbGlicmFyeS9SYWRhci5odG1sJ1xuICB9LFxuICBkYXRhKCkge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogXCJpbmNlcHRpb252MV9taXhlZDRjXCIsXG4gICAgICBcbiAgICAgIGNvbmZpZzogbnVsbCxcbiAgICAgIGxheWVyczogbnVsbCxcbiAgICAgIGxhYmVsczogbnVsbCxcblxuICAgICAgbGF5ZXI6IDAsXG4gICAgICBsYXlvdXQ6IDAsXG4gICAgICBjbGFzc0ZpbHRlcjogMCxcbiAgICAgIGZpbHRlcjogMCxcblxuICAgICAgbWluQWN0aXZhdGlvbnM6IDEsXG5cbiAgICAgIHNob3dMYWJlbHM6IGZhbHNlLFxuICAgICAgdGV4dFNoYWRvdzogZmFsc2UsXG4gICAgICBzaG93SG92ZXJJbWFnZTogZmFsc2UsXG5cbiAgICAgIGNvbnRleHQ6IG51bGwsXG5cbiAgICAgIGFscGhhQXR0cmlidXRpb25GYWN0b3I6IDAuMDIsXG4gICAgICBzY2FsZUNvdW50RmFjdG9yOiAxLFxuICAgICAgY2xhc3NIZWF0bWFwOiAtMSxcbiAgICAgIGNsYXNzSGVhdG1hcE11bHRpcGxpZXI6IDEsXG4gICAgICBjbGFzc0hlYXRtYXBQb3NpdGl2ZTogMSxcblxuICAgICAgZ3JpZFNpemU6IG51bGwsXG4gICAgICBzaG93R3JpZDogZmFsc2UsXG5cbiAgICAgIC8vIGZvciBpbml0aWFsIHN0YXRlLCBhbmQgZ29pbmcgYmFjayB0byBcImhvbWVcIlxuICAgICAgaG9tZVg6IC41LFxuICAgICAgaG9tZVk6IC41LFxuICAgICAgaG9tZVNjYWxlOiAxLFxuXG4gICAgICBpY29uQ3JvcDogMC4wMixcblxuICAgICAgLy8gem9vbSBmYWN0b3JcbiAgICAgIHpvb21GYWN0b3JzOiB7b3V0OiAwLjUsIGluOiAyfSxcblxuICAgICAgLy8gdHVybiBvZmYgZmVhdHVyZXNcbiAgICAgIGVuYWJsZUNsaWNrVG9ab29tOiB0cnVlLFxuICAgICAgZW5hYmxlSG92ZXI6IHRydWUsXG4gICAgICBlbmFibGVEcmFnVG9QYW46IHRydWUsXG5cblxuICAgICAgYmFja2dyb3VuZENvbG9yOiAnd2hpdGUnLFxuICAgICAgc3Ryb2tlQ29sb3I6ICdyZ2IoMjIwLCAyMjAsIDIyMCknLFxuICAgICAgaW1hZ2VTbW9vdGhpbmc6IGZhbHNlLFxuXG4gICAgICAvLyBmb3IgcG9zaXRpb25pbmcgdGhlIGhvdmVyIGljb25cbiAgICAgIGxhc3RSZWNvcmRlZENhbnZhc1Bvczoge3g6IC0xMDAsIHk6IC0xMDB9LFxuXG4gICAgICAvLyBmb3IgbWFuYWdpbmcgcGFubmluZyBvZmYgdGhlIHNjcmVlblxuICAgICAgbW91c2VEb3duU2NyZWVuUG9zOiB7eDogMCwgeTogMH0sXG5cbiAgICAgIC8vIGNhbiBiZSBcImhvdmVyXCIgb3IgXCJwYW5cIlxuICAgICAgbW91c2VNb3ZlTW9kZTogJ2hvdmVyJyxcbiAgICAgIG9uQ2FudmFzOiBmYWxzZSxcblxuICAgICAgc2NyZWVuUmVzb2x1dGlvbjogMSxcblxuICAgICAgbW91c2VEb3duVGltZXI6IDAsXG4gICAgICBtb3VzZU1vdmVGdW5jdGlvbjogZnVuY3Rpb24oKXt9LFxuICAgICAgbW91c2VVcEZ1bmN0aW9uOiBmdW5jdGlvbigpe30sXG5cbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgbWF4QXR0cmlidXRpb25WYWx1ZTogKHtsYXllcnMsIGxheWVyfSkgPT4ge1xuICAgICAgLy8gcmV0dXJuIDAuMjU7XG4gICAgICBpZiAobGF5ZXJzID09IG51bGwpIHJldHVybiAwO1xuICAgICAgY29uc3QgbCA9IGxheWVyc1tsYXllcl07XG4gICAgICBsZXQgbWF4ID0gMDtcbiAgICAgIGwuZm9yRWFjaCh4ID0+IHtcbiAgICAgICAgeC5mb3JFYWNoKHkgPT4ge1xuICAgICAgICAgIGlmICh5ICYmIHkubnVtX2FjdGl2YXRpb25zID4gNTAwKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0geS5mdWxsX2NsYXNzX3ZhbHVlc1swXTtcbiAgICAgICAgICAgIGlmICh2ID4gbWF4KSBtYXggPSB2O1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICByZXR1cm4gbWF4O1xuICAgICAgLy8gcmV0dXJuIGxheWVycyA/IG1heChsLCBkID0+IGQgPyBtYXgoZCwgZGQgPT4gZGQgPyAoZGQubiA+IDUwID8gKGRkLnRvcF9jbGFzc192YWx1ZXNbZGQudG9wX2NsYXNzX2luZGljZXMuaW5kZXhPZihjbGFzc0hlYXRtYXApXSkgOiAwKSA6IDApOiAwKSA6IDA7XG4gICAgICB9LFxuICAgIGFzcGVjdFJhdGlvOiAoe3ZpZXdXaWR0aCwgdmlld0hlaWdodH0pID0+IHZpZXdXaWR0aCAvIHZpZXdIZWlnaHQsXG4gICAgLy8gdmlld0hlaWdodDogKHt2aWV3V2lkdGh9KSA9PiB2aWV3V2lkdGggLyAxLjUsXG4gICAgLy8gTWF0aC5taW4gb2Ygdmlld0hlaWdodC92aWV3V2lkdGggdG8gbWFrZSBzdXJlIGl0IGZpdHMgaW5zaWRlIHdoZW4gc2NhbGUgPSAxXG4gICAgbWluVmlld0RpbUluUHg6ICh7dmlld1dpZHRoLCB2aWV3SGVpZ2h0fSkgPT4gTWF0aC5taW4odmlld1dpZHRoLCB2aWV3SGVpZ2h0KSwgXG4gICAgLy8gZGVmaW5lcyB0b3AgbGVmdCBjb3JuZXIgb2YgZ2xvYmFsIGluIHBpeGVscywgcmVsYXRpdmUgdG8gdGhlIHVwcGVyIGxlZnQgY29ybmVyIG9mIHRoZSBjYW52YXMgYXMgMCwwXG4gICAgdG9wTGVmdDogKHtnY3gsIGdjeSwgc2NhbGUsIHZpZXdXaWR0aCwgdmlld0hlaWdodCwgbWluVmlld0RpbUluUHh9KSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB4OiB2aWV3V2lkdGggLyAyIC0gZ2N4ICogbWluVmlld0RpbUluUHggKiBzY2FsZSxcbiAgICAgICAgeTogdmlld0hlaWdodCAvIDIgLSBnY3kgKiBtaW5WaWV3RGltSW5QeCAqIHNjYWxlfSBcbiAgICB9LFxuICAgIGN1cnJlbnRab29tSW5kZXg6ICh7c2NhbGUsIGdyaWRTaXplfSkgPT4ge1xuICAgICAgbGV0IHMgPSAwO1xuICAgICAgaWYgKGdyaWRTaXplICE9IG51bGwpIHtcbiAgICAgICAgcyA9IGdyaWRTaXplO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHNjYWxlID4gMSkgcyA9IDA7XG4gICAgICAgIGlmIChzY2FsZSA+IDIpIHMgPSAxO1xuICAgICAgICBpZiAoc2NhbGUgPiA0KSBzID0gMjtcbiAgICAgICAgaWYgKHNjYWxlID4gOCkgcyA9IDM7XG4gICAgICAgIGlmIChzY2FsZSA+IDE2KSBzID0gNDtcbiAgICAgIH1cbiAgICAgIHJldHVybiArcztcbiAgICB9LFxuICAgIG51bUljb25zV2lkZTogKHtjdXJyZW50Wm9vbUluZGV4LCBsYXllcnN9KSA9PiB7XG4gICAgICBpZihsYXllcnMgJiYgY3VycmVudFpvb21JbmRleCl7XG4gICAgICAgIHJldHVybiBsYXllcnNbY3VycmVudFpvb21JbmRleF0ubGVuZ3RoXG4gICAgICB9XG4gICAgfSxcbiAgICBpY29uU2l6ZUluUGl4ZWxzOiAoe2NvbmZpZywgbWluVmlld0RpbUluUHgsIGN1cnJlbnRab29tSW5kZXgsIHNjYWxlfSkgPT4ge1xuICAgICAgaWYoY29uZmlnKXtcbiAgICAgICAgcmV0dXJuIG1pblZpZXdEaW1JblB4IC8gKGNvbmZpZy5ncmlkX3NpemVbY3VycmVudFpvb21JbmRleF0pICogc2NhbGU7XG4gICAgICB9XG4gICAgfSxcbiAgICBzaG93SG92ZXJJY29uOiAoe21vdXNlTW92ZU1vZGUsIG9uQ2FudmFzLCBjdXJyZW50SWNvbkluZm8sIGVuYWJsZUhvdmVyfSkgPT4ge1xuICAgICAgcmV0dXJuIGVuYWJsZUhvdmVyICYmIG9uQ2FudmFzICYmIChtb3VzZU1vdmVNb2RlID09ICdob3ZlcicpICYmIGN1cnJlbnRJY29uSW5mb1xuICAgIH0sXG4gICAgbGF5ZXJTY2FsZTogKHttaW5WaWV3RGltSW5QeCwgY29uZmlnLCBjdXJyZW50Wm9vbUluZGV4LCBzY2FsZX0pID0+IHtcbiAgICAgIGlmKGNvbmZpZyl7XG4gICAgICAgIHJldHVybiAobWluVmlld0RpbUluUHggLyAoY29uZmlnLmljb25fc2l6ZSAqIGNvbmZpZy5ncmlkX3NpemVbY3VycmVudFpvb21JbmRleF0pKSAqIHNjYWxlXG4gICAgICB9XG4gICAgfSwgXG4gICAgZ3JpZFNlbGVjdGVkOiAoe2xhc3RSZWNvcmRlZENhbnZhc1BvcywgdG9wTGVmdCwgbGF5ZXJTY2FsZSwgY29uZmlnfSkgPT4ge1xuICAgICAgaWYoY29uZmlnKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKChsYXN0UmVjb3JkZWRDYW52YXNQb3MueCAtIHRvcExlZnQueCkgLyAobGF5ZXJTY2FsZSAqIGNvbmZpZy5pY29uX3NpemUpKSxcbiAgICAgICAgICB5OiBNYXRoLmZsb29yKChsYXN0UmVjb3JkZWRDYW52YXNQb3MueSAtIHRvcExlZnQueSkgLyAobGF5ZXJTY2FsZSAqIGNvbmZpZy5pY29uX3NpemUpKVxuICAgICAgICB9ICAgICAgICBcbiAgICAgIH1cbiAgICB9LCBcbiAgICB0b3BMZWZ0Q29ybmVySG92ZXI6ICh7Y29uZmlnLCBsYXllclNjYWxlLCB0b3BMZWZ0LCBncmlkU2VsZWN0ZWR9KSA9PiB7XG4gICAgICBpZihjb25maWcpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHg6IGdyaWRTZWxlY3RlZC54ICogY29uZmlnLmljb25fc2l6ZSAqIGxheWVyU2NhbGUgKyB0b3BMZWZ0LnggLSAxLFxuICAgICAgICAgIHk6IGdyaWRTZWxlY3RlZC55ICogY29uZmlnLmljb25fc2l6ZSAqIGxheWVyU2NhbGUgKyB0b3BMZWZ0LnkgLSAxXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGN1cnJlbnRJY29uSW5mbzogKHtsYXllcnMsIGN1cnJlbnRab29tSW5kZXgsIGdyaWRTZWxlY3RlZCwgY2xhc3NIZWF0bWFwfSkgPT4ge1xuICAgICAgaWYobGF5ZXJzICYmIGxheWVyc1tjdXJyZW50Wm9vbUluZGV4XSAmJiBcbiAgICAgICAgIGxheWVyc1tjdXJyZW50Wm9vbUluZGV4XVtncmlkU2VsZWN0ZWQueV0gJiYgXG4gICAgICAgICBsYXllcnNbY3VycmVudFpvb21JbmRleF1bZ3JpZFNlbGVjdGVkLnldW2dyaWRTZWxlY3RlZC54XVxuICAgICAgICAgKXtcbiAgICAgICAgICBjb25zdCBpY29uSW5mbyA9IGxheWVyc1tjdXJyZW50Wm9vbUluZGV4XVtncmlkU2VsZWN0ZWQueV1bZ3JpZFNlbGVjdGVkLnhdO1xuICAgICAgICAgIGlmKGljb25JbmZvLm51bV9hY3RpdmF0aW9ucyA+IDApe1xuICAgICAgICAgICAgcmV0dXJuIGljb25JbmZvXG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgb251cGRhdGUoeyBjaGFuZ2VkLCBjdXJyZW50LCBwcmV2aW91cyB9KSB7XG4gICAgdGhpcy5zZXQoe2NvbnRleHQ6IHRoaXMucmVmcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKX0pO1xuICAgIGlmIChjaGFuZ2VkLm1heEF0dHJpYnV0aW9uVmFsdWUgfHwgY2hhbmdlZC5taW5BY3RpdmF0aW9ucyB8fCBjaGFuZ2VkLmNsYXNzSGVhdG1hcCB8fCBjaGFuZ2VkLmNsYXNzSGVhdG1hcE11bHRpcGxpZXIgfHwgY2hhbmdlZC5jbGFzc0hlYXRtYXBQb3NpdGl2ZSB8fCBjaGFuZ2VkLmxhYmVscyB8fCBjaGFuZ2VkLnNob3dMYWJlbHMgfHwgY2hhbmdlZC52aWV3V2lkdGggfHwgY2hhbmdlZC52aWV3SGVpZ2h0IHx8IGNoYW5nZWQuc2NhbGUgfHwgY2hhbmdlZC5pY29uQ3JvcCB8fCBjaGFuZ2VkLmN1cnJlbnRab29tSW5kZXggfHwgY2hhbmdlZC5sYXllcnMgfHwgY2hhbmdlZC5hbHBoYUF0dHJpYnV0aW9uRmFjdG9yIHx8IGNoYW5nZWQuc2NhbGVDb3VudEZhY3RvciB8fCBjaGFuZ2VkLmdjeCB8fCBjaGFuZ2VkLmdjeSkge1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG4gICAgaWYgKGNoYW5nZWQuY3VycmVudEljb25JbmZvKSB7XG4gICAgICB0aGlzLnVwZGF0ZUljb25Ib3ZlckltYWdlKCk7XG4gICAgfVxuXG4gIH0sXG4gIG9uY3JlYXRlKCkge1xuICAgIHRoaXMuaG9tZSgpO1xuICB9LFxuICBtZXRob2RzOiB7XG4gICAgZnVsbHNjcmVlbigpIHtcbiAgICAgIHRoaXMucmVmcy5yb290LndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfSxcbiAgICBtb3VzZUVudGVyKCkge1xuICAgICAgdGhpcy5zZXQoe29uQ2FudmFzOiB0cnVlfSlcbiAgICB9LFxuICAgIG1vdXNlRG93bihldmVudCkge1xuICAgICAgLy8gc2hvdWxkIHRoaXMgYmUgc2V0IG9uY2UsIHNvbWV3aGVyZSBlbHNlPyBvbmNyZWF0ZT8gXG4gICAgICB0aGlzLnNldCh7bW91c2VNb3ZlRnVuY3Rpb246IHRoaXMubW91c2VNb3ZlLmJpbmQodGhpcyksIG1vdXNlVXBGdW5jdGlvbjogdGhpcy5tb3VzZVVwLmJpbmQodGhpcyl9KTtcblxuICAgICAgY29uc3Qge21vdXNlTW92ZUZ1bmN0aW9uLCBtb3VzZVVwRnVuY3Rpb259ID0gdGhpcy5nZXQoKTtcblxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgLy8gc2V0IGV2ZW50IGxpc3RlbmVycyBvbiB3aW5kb3dcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIG1vdXNlTW92ZUZ1bmN0aW9uKTtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLG1vdXNlVXBGdW5jdGlvbik7XG4gICAgICAvLyBkbyBJIG5lZWQgdG8gdW5zZXQgbG9jYWwgbGlzdGVuZXI/IFxuXG4gICAgICB0aGlzLnNldCh7bW91c2VNb3ZlTW9kZTogJ3Bhbid9KVxuICAgICAgdGhpcy5zZXQoe21vdXNlRG93blRpbWVyOiBEYXRlLm5vdygpfSlcblxuICAgICAgLy8gY2FudmFzIHBvc2l0aW9uXG4gICAgICB0aGlzLnNldCh7bGFzdFJlY29yZGVkQ2FudmFzUG9zOiB7eDogZXZlbnQub2Zmc2V0WCwgeTogZXZlbnQub2Zmc2V0WX19KVxuXG4gICAgICAvLyBzY3JlZW5Qb3NpdGlvbiBhdCBtb3VzZWRvd25cbiAgICAgIHRoaXMuc2V0KHttb3VzZURvd25TY3JlZW5Qb3M6IHt4OiBldmVudC5zY3JlZW5YLCB5OiBldmVudC5zY3JlZW5ZfX0pXG5cbiAgICB9LFxuICAgIG1vdXNlTW92ZShldmVudCkge1xuICAgICAgY29uc3QgeyBtb3VzZU1vdmVNb2RlIH0gPSB0aGlzLmdldCgpO1xuXG4gICAgICB0aGlzLnNldCh7bGFzdFJlY29yZGVkQ2FudmFzUG9zOiB7eDogZXZlbnQub2Zmc2V0WCwgeTogZXZlbnQub2Zmc2V0WX19KTtcblxuICAgICAgaWYgKG1vdXNlTW92ZU1vZGUgPT0gJ3BhbicpIHtcbiAgICAgICAgY29uc3Qge21vdXNlRG93blNjcmVlblBvcywgZ2N4LCBnY3ksIGVuYWJsZURyYWdUb1Bhbn0gPSB0aGlzLmdldCgpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBnY3gsIGdjeSwgbW91c2VEb3duU2NyZWVuUG9zXG4gICAgICAgIHRoaXMuc2V0KHtcbiAgICAgICAgICBtb3VzZURvd25TY3JlZW5Qb3M6IHt4OiBldmVudC5zY3JlZW5YLCB5OiBldmVudC5zY3JlZW5ZfVxuICAgICAgICB9KVxuXG4gICAgICAgIGlmKGVuYWJsZURyYWdUb1Bhbil7XG4gICAgICAgICAgdGhpcy5yZWZzLnpvb20ucGFuVG8oXG4gICAgICAgICAgICB0aGlzLnRvUGVyY2VudChtb3VzZURvd25TY3JlZW5Qb3MueCAtIGV2ZW50LnNjcmVlblgpICsgZ2N4LFxuICAgICAgICAgICAgdGhpcy50b1BlcmNlbnQobW91c2VEb3duU2NyZWVuUG9zLnkgLSBldmVudC5zY3JlZW5ZKSArIGdjeSxcbiAgICAgICAgICAgIDBcbiAgICAgICAgICApXG4gICAgICAgIH0gXG4gICAgICB9XG5cbiAgICB9LFxuICAgIG1vdXNlT3V0KGV2ZW50KSB7XG4gICAgICB0aGlzLnNldCh7XG4gICAgICAgIG9uQ2FudmFzOiBmYWxzZVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBtb3VzZVVwKGV2ZW50KSB7XG4gICAgICBjb25zdCB7bW91c2VEb3duVGltZXIsIG1vdXNlTW92ZU1vZGUsIHNjYWxlLCB6b29tRmFjdG9ycywgbW91c2VNb3ZlRnVuY3Rpb24sIG1vdXNlVXBGdW5jdGlvbiwgbGFzdFJlY29yZGVkQ2FudmFzUG9zLCB0b3BMZWZ0LCBnY3gsIGdjeSwgZW5hYmxlQ2xpY2tUb1pvb219ID0gdGhpcy5nZXQoKTtcblxuICAgICAgLy8gcmVzZXQgbW9kZSB0byBob3ZlclxuICAgICAgdGhpcy5zZXQoe21vdXNlTW92ZU1vZGU6ICdob3Zlcid9KVxuXG4gICAgICAvLyByZW1vdmUgYm9keSBldmVudCBsaXN0ZW5lcnNcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIG1vdXNlTW92ZUZ1bmN0aW9uKTtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBtb3VzZVVwRnVuY3Rpb24pO1xuXG4gICAgICAvLyBjYWxjdWxhdGUgb2Zmc2V0cyB0byBkZXRlcm1pbmUgdG8gem9vbSBvciBub3RcbiAgICAgIGNvbnN0IGNsaWNrRGlmZiA9IChEYXRlLm5vdygpIC0gbW91c2VEb3duVGltZXIpO1xuICAgICAgY29uc3QgY2xpY2tEaXN0YW5jZSA9IE1hdGguc3FydChcbiAgICAgICAgTWF0aC5wb3coZXZlbnQub2Zmc2V0WCAtIGxhc3RSZWNvcmRlZENhbnZhc1Bvcy54LCAyKSArIFxuICAgICAgICBNYXRoLnBvdyhldmVudC5vZmZzZXRZIC0gbGFzdFJlY29yZGVkQ2FudmFzUG9zLnksIDIpXG4gICAgICAgICk7XG5cblxuICAgICAgLy8gMjAwbXMgYW5kIDUgcGl4ZWxzIGRpc3RhbmNlIGlzIGZhaXJseSBhcmJpdHJhcnlcbiAgICAgIGlmKGNsaWNrRGlmZiA8IDIwMCAmJiBjbGlja0Rpc3RhbmNlIDwgNSkge1xuICAgICAgICAvLyBaT09NIVxuICAgICAgICBpZihlbmFibGVDbGlja1RvWm9vbSl7XG4gICAgICAgICAgLy8gdXNlIHNoaWZ0IGtleSB0byBkZXRlcm1pbmUgdG8gem9vbSBpbiBvciB6b29tIG91dFxuICAgICAgICAgIGxldCB6b29tQnkgPSB6b29tRmFjdG9ycy5pbjtcbiAgICAgICAgICBpZihldmVudC5zaGlmdEtleSl7XG4gICAgICAgICAgICB6b29tQnkgPSB6b29tRmFjdG9ycy5vdXQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IG5ld0NlbnRlciA9IHt4OiAwLjUsIHk6IDAuNX1cblxuICAgICAgICAgIC8vIGdvIGhvbWUgaWYgc2NhbGUgPCAxXG4gICAgICAgICAgbGV0IG5ld1NjYWxlID0gem9vbUJ5ICogc2NhbGU7XG4gICAgICAgICAgaWYobmV3U2NhbGUgPiAxKXtcbiAgICAgICAgICAgIC8vIHVzZSBjdXJyZW50IG1vdXNlIHBvc2l0aW9uIHRvIGZpbmQgbmV3IGNlbnRlciBwb3NpdGlvblxuICAgICAgICAgICAgY29uc3QgZml4ZWRQb2ludCA9IHtcbiAgICAgICAgICAgICAgeDogdGhpcy50b1BlcmNlbnQoZXZlbnQub2Zmc2V0WCAtIHRvcExlZnQueCksXG4gICAgICAgICAgICAgIHk6IHRoaXMudG9QZXJjZW50KGV2ZW50Lm9mZnNldFkgLSB0b3BMZWZ0LnkpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdDZW50ZXIgPSB7XG4gICAgICAgICAgICAgIHg6IGZpeGVkUG9pbnQueCAtICgoZml4ZWRQb2ludC54IC0gZ2N4KS96b29tQnkpLFxuICAgICAgICAgICAgICB5OiBmaXhlZFBvaW50LnkgLSAoKGZpeGVkUG9pbnQueSAtIGdjeSkvem9vbUJ5KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdTY2FsZSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKG5ld0NlbnRlci54LCBuZXdDZW50ZXIueSwgbmV3U2NhbGUsIDUwMClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgaG9tZSgpIHtcbiAgICAgIGNvbnN0IHtob21lWCwgaG9tZVksIGhvbWVTY2FsZX0gPSB0aGlzLmdldCgpO1xuICAgICAgdGhpcy50cmFuc2l0aW9uVG8oaG9tZVgsaG9tZVksaG9tZVNjYWxlLDgwMClcbiAgICB9LFxuICAgIHRyYW5zaXRpb25Ubyh4LCB5LCBzY2FsZSwgZHVyYXRpb24pIHtcbiAgICAgIHRoaXMucmVmcy56b29tLnRyYW5zaXRpb25Ubyh4LHksc2NhbGUsZHVyYXRpb24pO1xuICAgIH0sXG4gICAgem9vbWl0KG11bHRpcGxpZXIpIHtcbiAgICAgIGNvbnN0IHsgc2NhbGUgfSA9IHRoaXMuZ2V0KCk7XG4gICAgICB0aGlzLnJlZnMuem9vbS5zY2FsZVRvKHNjYWxlICogbXVsdGlwbGllciwgNTAwKVxuICAgIH0sXG4gICAgaWNvblRvQ2FudmFzUG9zaXRpb24oaWNvbiwgbGF5ZXJJbmRleCkge1xuICAgICAgY29uc3Qge2NvbmZpZywgc2NhbGVDb3VudEZhY3RvciwgdG9wTGVmdCwgbGF5ZXJTY2FsZSwgY3VycmVudFpvb21JbmRleH0gPSB0aGlzLmdldCgpO1xuXG4gICAgICBjb25zdCBwcm9wb3J0aW9uYWxTY2FsZUNvdW50RmFjdG9yID0gc2NhbGVDb3VudEZhY3RvciAvIChjdXJyZW50Wm9vbUluZGV4ICsgMSlcbiAgICAgIGNvbnN0IHNjYWxlTW9kaWZpZXIgPSAoTWF0aC5zcXJ0KE1hdGgubWluKHByb3BvcnRpb25hbFNjYWxlQ291bnRGYWN0b3IsIGljb24ubnVtX2FjdGl2YXRpb25zKSAvIHByb3BvcnRpb25hbFNjYWxlQ291bnRGYWN0b3IpKSBcbiAgICAgIGNvbnN0IGljb25XaWR0aCA9IGNvbmZpZy5pY29uX3NpemUgKiBsYXllclNjYWxlICogc2NhbGVNb2RpZmllcjtcblxuICAgICAgY29uc3Qgc3ggPSBpY29uLmxvY2FsWCAqIGNvbmZpZy5pY29uX3NpemU7XG4gICAgICBjb25zdCBzeSA9IGljb24ubG9jYWxZICogY29uZmlnLmljb25fc2l6ZTtcblxuICAgICAgY29uc3QgdGlsZVBvc194ID0gaWNvbi5ncmlkX3kgKiBjb25maWcuaWNvbl9zaXplO1xuICAgICAgY29uc3QgdGlsZVBvc195ID0gaWNvbi5ncmlkX3ggKiBjb25maWcuaWNvbl9zaXplO1xuXG4gICAgICAvLyBwaXhlbCBjb29yZGluYXRlIGluIHRoZSBnbG9iYWwgY29vcmRpbmF0ZSBzcGFjZVxuICAgICAgY29uc3QgZ2xvYmFsUGl4ZWxQb3NfeCA9IHRpbGVQb3NfeCAqIGxheWVyU2NhbGU7XG4gICAgICBjb25zdCBnbG9iYWxQaXhlbFBvc195ID0gdGlsZVBvc195ICogbGF5ZXJTY2FsZTtcblxuICAgICAgY29uc3QgY2FudmFzUG9zX3ggPSBnbG9iYWxQaXhlbFBvc194ICsgdG9wTGVmdC54O1xuICAgICAgY29uc3QgY2FudmFzUG9zX3kgPSBnbG9iYWxQaXhlbFBvc195ICsgdG9wTGVmdC55OyAgICAgIFxuXG4gICAgICAvLyBjYWxjIHNjYWxlIGFkanVzdCBmYWN0b3IgdG8gY2VudGVyIHRoZSBpbWFnZSBmb3IgdGhlIGljb24gaW4gaXQncyBib3hcbiAgICAgIGNvbnN0IHNjYWxlQWRqdXN0RmFjdG9yID0gICgxIC0gc2NhbGVNb2RpZmllcikgKiBjb25maWcuaWNvbl9zaXplICogbGF5ZXJTY2FsZSAgLyAyO1xuXG4gICAgICBjb25zdCBkeCA9IGNhbnZhc1Bvc194ICsgc2NhbGVBZGp1c3RGYWN0b3I7XG4gICAgICBjb25zdCBkeSA9IGNhbnZhc1Bvc195ICsgc2NhbGVBZGp1c3RGYWN0b3I7XG5cbiAgICAgIHJldHVybiB7c3gsIHN5LCBkeCwgZHksIGljb25XaWR0aH1cbiAgICB9LFxuICAgIHRvUGVyY2VudChwKSB7XG4gICAgICBjb25zdCB7c2NhbGUsIG1pblZpZXdEaW1JblB4fSA9IHRoaXMuZ2V0KCk7XG4gICAgICByZXR1cm4gcCAvIChzY2FsZSAqIG1pblZpZXdEaW1JblB4KTtcbiAgICB9LFxuICAgIHRvUGl4ZWxzKHApIHtcbiAgICAgIGNvbnN0IHtzY2FsZSwgbWluVmlld0RpbUluUHh9ID0gdGhpcy5nZXQoKTtcbiAgICAgIHJldHVybiBwICogc2NhbGUgKiBtaW5WaWV3RGltSW5QeDtcbiAgICB9LFxuICAgIGNsZWFyKCkge1xuICAgICAgY29uc3Qge3ZpZXdIZWlnaHQsIHZpZXdXaWR0aCwgY29udGV4dCwgYmFja2dyb3VuZENvbG9yfSA9IHRoaXMuZ2V0KCk7XG4gICAgICBjb250ZXh0Lmdsb2JhbEFscGhhID0gMTtcbiAgICAgIGNvbnRleHQuZmlsbFN0eWxlPSBiYWNrZ3JvdW5kQ29sb3I7XG4gICAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB2aWV3V2lkdGgsIHZpZXdIZWlnaHQpO1xuICAgICAgY29udGV4dC5maWxsUmVjdCgwLCAwLCB2aWV3V2lkdGgsIHZpZXdIZWlnaHQpO1xuICAgIH0sXG4gICAgdXBkYXRlSWNvbkhvdmVySW1hZ2UoKSB7XG4gICAgICBjb25zdCB7Y3VycmVudEljb25JbmZvLCBjdXJyZW50Wm9vbUluZGV4LCBpY29uQ3JvcCwgY29uZmlnLCBzaG93SG92ZXJJbWFnZX0gPSB0aGlzLmdldCgpO1xuICAgICAgaWYoY3VycmVudEljb25JbmZvICYmIHNob3dIb3ZlckltYWdlKXtcbiAgICAgICAgbG9hZChjdXJyZW50SWNvbkluZm8udXJsKS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICBjb25zdCBob3ZlckltYWdlQ29udGV4dCA9IHRoaXMucmVmcy5ob3ZlckltYWdlLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgY29uc3Qge3N4LCBzeSwgZHgsIGR5LCBpY29uV2lkdGh9ID0gdGhpcy5pY29uVG9DYW52YXNQb3NpdGlvbihjdXJyZW50SWNvbkluZm8sIGN1cnJlbnRab29tSW5kZXgpXG4gICAgICAgICAgY29uc3QgaWNvbk9mZnNldCA9IChpY29uQ3JvcCAqIGNvbmZpZy5pY29uX3NpemUpIC8gMjtcbiAgICAgICAgICBjb25zdCBlZGdlTGVuZ3RoID0gTWF0aC5taW4odGhpcy5yZWZzLmhvdmVySW1hZ2UuaGVpZ2h0LCB0aGlzLnJlZnMuaG92ZXJJbWFnZS53aWR0aClcbiAgICAgICAgICBob3ZlckltYWdlQ29udGV4dC5kcmF3SW1hZ2UocmVzcG9uc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vc291cmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN5ICsgaWNvbk9mZnNldCwgc3ggKyBpY29uT2Zmc2V0LCBjb25maWcuaWNvbl9zaXplIC0gaWNvbk9mZnNldCAqIDIsIGNvbmZpZy5pY29uX3NpemUgLSBpY29uT2Zmc2V0ICogMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy9kZXN0aW5hdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAwLCAwLCBlZGdlTGVuZ3RoLCBlZGdlTGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyKCkge1xuXG4gICAgICBjb25zdCB7aW1hZ2VTbW9vdGhpbmcsIG1pbkFjdGl2YXRpb25zLCB2aWV3SGVpZ2h0LCB2aWV3V2lkdGgsIGNvbnRleHQsIGJhY2tncm91bmRDb2xvciwgY29uZmlnLCBsYXllcnMsIGN1cnJlbnRab29tSW5kZXgsIHN0cm9rZUNvbG9yLCBtYXhBdHRyaWJ1dGlvblZhbHVlLCBjbGFzc0hlYXRtYXBNdWx0aXBsaWVyfSA9IHRoaXMuZ2V0KCk7XG5cbiAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgIC8vIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdRdWFsaXR5ID0gXCJsb3dcIjtcbiAgICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gaW1hZ2VTbW9vdGhpbmc7XG5cbiAgICAgIGlmIChjb25maWcgJiYgbGF5ZXJzKSB7XG4gICAgICAgIGxheWVycy5mb3JFYWNoKChpY29ucywgbGF5ZXJJbmRleCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZpc2libGVMYXllcnMgPSBbY3VycmVudFpvb21JbmRleF1cblxuICAgICAgICAgIGlmICh2aXNpYmxlTGF5ZXJzLmluZGV4T2YobGF5ZXJJbmRleCkgPiAtMSkge1xuXG4gICAgICAgICAgICBpY29ucy5mb3JFYWNoKChjb2x1bW5zLCB4KSA9PiB7XG4gICAgICAgICAgICAgIGNvbHVtbnMuZm9yRWFjaCgoaWNvbiwgeSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpY29uLm51bV9hY3RpdmF0aW9ucyA+PSBtaW5BY3RpdmF0aW9ucykge1xuXG4gICAgICAgICAgICAgICAgICBjb25zdCB7ZHgsIGR5LCBpY29uV2lkdGh9ID0gdGhpcy5pY29uVG9DYW52YXNQb3NpdGlvbihpY29uLCBsYXllckluZGV4KTtcblxuICAgICAgICAgICAgICAgICAgLy8gSWYgaWNvbiBpcyBpbiB0aGUgdmlld3BvcnRcbiAgICAgICAgICAgICAgICAgIGlmIChkeCA+IC1pY29uV2lkdGggJiYgZHggPCB2aWV3V2lkdGggJiYgZHkgPiAtaWNvbldpZHRoICYmIGR5IDwgdmlld0hlaWdodCkge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2FudCB0byBkcmF3IGEgYm94IGJlZm9yZSB0aGUgaWNvbiBoYXMgbG9hZGVkIHNvIHRoZXJlIGlzbid0IGp1c3Qgd2hpdGVuZXNzLlxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7c3gsIHN5LCBkeCwgZHksIGljb25XaWR0aH0gPSB0aGlzLmljb25Ub0NhbnZhc1Bvc2l0aW9uKGljb24sIGxheWVySW5kZXgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSAwLjc1O1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gc3Ryb2tlQ29sb3I7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gXCJ3aGl0ZVwiO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnJlY3QoZHgsIGR5LCBpY29uV2lkdGgsIGljb25XaWR0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZmlsbCgpO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxvYWQoaWNvbi51cmwpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIHRoYXQgd2UncmUgc3RpbGwgb24gdGhlIHJpZ2h0IGxheWVyL3pvb21cbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7Y3VycmVudFpvb21JbmRleCwgaWNvbkNyb3AsIHNob3dMYWJlbHMsIHRleHRTaGFkb3d9ID0gdGhpcy5nZXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICBpZihjdXJyZW50Wm9vbUluZGV4ID09IGxheWVySW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHthbHBoYUF0dHJpYnV0aW9uRmFjdG9yLCBsYWJlbHMsIGNvbmZpZywgY2xhc3NIZWF0bWFwLCBjbGFzc0hlYXRtYXBNdWx0aXBsaWVyLCBjbGFzc0hlYXRtYXBQb3NpdGl2ZX0gPSB0aGlzLmdldCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xhc3NIZWF0bWFwID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGkgPSBpY29uLmZ1bGxfY2xhc3NfaW5kaWNlcy5pbmRleE9mKGNsYXNzSGVhdG1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhID0gaWNvbi5mdWxsX2NsYXNzX3ZhbHVlc1tpXSAvIG1heEF0dHJpYnV0aW9uVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYSA9IGEgKiBjbGFzc0hlYXRtYXBQb3NpdGl2ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhID0gTWF0aC5tYXgoMCwgYSkgKiBjbGFzc0hlYXRtYXBNdWx0aXBsaWVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEgPSAwLjA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCBhID0gTWF0aC5taW4oMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgTWF0aC5tYXgoMC4yLCBNYXRoLnBvdyhpY29uLnRvcF9jbGFzc192YWx1ZXNbMF0sIDIpICogXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgIDEwMDAgKiBhbHBoYUF0dHJpYnV0aW9uRmFjdG9yKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCBjdXJyZW50IHZhbHVlcyBpbiBjYXNlIHRoZXkgY2hhbmdlZCB3aGlsZSBsb2FkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7c3gsIHN5LCBkeCwgZHksIGljb25XaWR0aH0gPSB0aGlzLmljb25Ub0NhbnZhc1Bvc2l0aW9uKGljb24sIGxheWVySW5kZXgpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRyYXcgdGhlIGljb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSBhO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWNvbk9mZnNldCA9IChpY29uQ3JvcCAqIGNvbmZpZy5pY29uX3NpemUpIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KGR4ICsgMSwgZHkgKyAxLCBpY29uV2lkdGggLSAyLCBpY29uV2lkdGggLSAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZHJhd0ltYWdlKHJlc3BvbnNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvL3NvdXJjZVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzeSArIGljb25PZmZzZXQsIHN4ICsgaWNvbk9mZnNldCwgY29uZmlnLmljb25fc2l6ZSAtIGljb25PZmZzZXQgKiAyLCBjb25maWcuaWNvbl9zaXplIC0gaWNvbk9mZnNldCAqIDIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vZGVzdGluYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgZHgsIGR5LCBpY29uV2lkdGgsIGljb25XaWR0aFxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2hvd0xhYmVscyAmJiBsYWJlbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5nbG9iYWxBbHBoYSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZm9udD1cIjEwcHggSGVsdmV0aWNhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0U2hhZG93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5saW5lV2lkdGggPSAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBcInJnYmEoMCwgMCwgMCwgMC44KVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlVGV4dChsYWJlbHNbaWNvbi50b3BfY2xhc3NfaW5kaWNlc1swXV0sIGR4ICsgNCwgZHkgKyBpY29uV2lkdGggLSA0LCBpY29uV2lkdGggLSA4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDI1NSwgMjU1LCAxKVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZmlsbFRleHQobGFiZWxzW2ljb24udG9wX2NsYXNzX2luZGljZXNbMF1dLCBkeCArIDQsIGR5ICsgaWNvbldpZHRoIC0gNCwgaWNvbldpZHRoIC0gOCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgfVxuICB9XG5cbjwvc2NyaXB0PlxuXG5cbjxzdHlsZT5cbiAgcmVmOnJvb3Qge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgY29udGFpbjogbGF5b3V0O1xuICB9XG4gIHJlZjpzdGFnZSB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGhlaWdodDogMTAwJTtcbiAgICBvdmVyZmxvdzogaGlkZGVuO1xuICB9XG4gIHJlZjpzdGFnZS5wYW5uaW5nIHtcbiAgICBjdXJzb3I6IG1vdmU7XG4gIH1cbiAgcmVmOmNhbnZhcyB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgfVxuICAuaG92ZXIge1xuICAgIGNvbG9yOiB3aGl0ZTtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgZm9udC1zaXplOiAxMnB4O1xuICAgIGxpbmUtaGVpZ2h0OiAxNHB4O1xuICAgIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC44KTtcbiAgICBwYWRkaW5nOiA2cHg7XG4gICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgYm9yZGVyLXJhZGl1czogMCA4cHggOHB4IDhweDtcbiAgICBib3JkZXI6IHNvbGlkIDFweCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNCk7XG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICBib3gtc2hhZG93OiAwIDFweCA4cHggcmdiYSgwLCAwLCAwLCAwLjQpO1xuICAgIHdpZHRoOiAyMDBweDtcbiAgICB6LWluZGV4OiAxMDAwMDtcbiAgfVxuICAuaG92ZXIgdGFibGUge1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIG1hcmdpbi1ib3R0b206IDA7XG4gIH1cbiAgLmhvdmVyIHRkIHtcbiAgICBmb250LXNpemU6IDEycHg7XG4gICAgYm9yZGVyLWJvdHRvbTogc29saWQgMXB4IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4yKTtcbiAgICBwYWRkaW5nOiA2cHggMDtcbiAgICBtYXJnaW46IDZweCAwO1xuICAgIGNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOCk7XG4gICAgb3ZlcmZsb3c6IGVsbGlwc2lzO1xuICB9XG4gIC5ob3ZlciB0ZC5maXJzdCB7XG4gICAgY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMS4wKTtcbiAgICBmb250LXdlaWdodDogYm9sZDtcbiAgfVxuXG4gIC5pY29uIHtcbiAgICBkaXNwbGF5OiBibG9jaztcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgdG9wOiAwO1xuICAgIGxlZnQ6IDA7XG4gICAgYm9yZGVyLXJhZGl1czogNHB4O1xuICAgIGJvcmRlcjogc29saWQgM3B4IGJsYWNrO1xuICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gIH1cbjwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQW9oQkUsOEJBQVMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixPQUFPLENBQUUsTUFBTSxBQUNqQixDQUFDLEFBQ0QsK0JBQVUsQ0FBQyxBQUNULFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEdBQUcsQ0FBRSxDQUFDLENBQ04sSUFBSSxDQUFFLENBQUMsQ0FDUCxLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxJQUFJLENBQ1osUUFBUSxDQUFFLE1BQU0sQUFDbEIsQ0FBQyxBQUNELGlCQUFTLFFBQVEsY0FBQyxDQUFDLEFBQ2pCLE1BQU0sQ0FBRSxJQUFJLEFBQ2QsQ0FBQyxBQUNELGdDQUFXLENBQUMsQUFDVixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsQ0FBQyxDQUNOLElBQUksQ0FBRSxDQUFDLENBQ1AsYUFBYSxDQUFFLEdBQUcsQUFDcEIsQ0FBQyxBQUNELE1BQU0sY0FBQyxDQUFDLEFBQ04sS0FBSyxDQUFFLEtBQUssQ0FDWixRQUFRLENBQUUsUUFBUSxDQUNsQixTQUFTLENBQUUsSUFBSSxDQUNmLFdBQVcsQ0FBRSxJQUFJLENBQ2pCLFVBQVUsQ0FBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUM5QixPQUFPLENBQUUsR0FBRyxDQUNaLGNBQWMsQ0FBRSxJQUFJLENBQ3BCLGFBQWEsQ0FBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQzVCLE1BQU0sQ0FBRSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzFDLFVBQVUsQ0FBRSxVQUFVLENBQ3RCLFVBQVUsQ0FBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUN4QyxLQUFLLENBQUUsS0FBSyxDQUNaLE9BQU8sQ0FBRSxLQUFLLEFBQ2hCLENBQUMsQUFDRCxvQkFBTSxDQUFDLEtBQUssY0FBQyxDQUFDLEFBQ1osS0FBSyxDQUFFLElBQUksQ0FDWCxhQUFhLENBQUUsQ0FBQyxBQUNsQixDQUFDLEFBQ0Qsb0JBQU0sQ0FBQyxFQUFFLGNBQUMsQ0FBQyxBQUNULFNBQVMsQ0FBRSxJQUFJLENBQ2YsYUFBYSxDQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDakQsT0FBTyxDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQ2QsTUFBTSxDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQ2IsS0FBSyxDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQy9CLFFBQVEsQ0FBRSxRQUFRLEFBQ3BCLENBQUMsQUFDRCxvQkFBTSxDQUFDLEVBQUUsTUFBTSxjQUFDLENBQUMsQUFDZixLQUFLLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDL0IsV0FBVyxDQUFFLElBQUksQUFDbkIsQ0FBQyxBQUVELEtBQUssY0FBQyxDQUFDLEFBQ0wsT0FBTyxDQUFFLEtBQUssQ0FDZCxRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsQ0FBQyxDQUNOLElBQUksQ0FBRSxDQUFDLENBQ1AsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsTUFBTSxDQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUN2QixjQUFjLENBQUUsSUFBSSxDQUNwQixVQUFVLENBQUUsVUFBVSxBQUN4QixDQUFDIn0= */";
		append(document.head, style);
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.top = list[i];
		child_ctx.i = i;
		return child_ctx;
	}

	function create_main_fragment$3(component, ctx) {
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

		var if_block2 = (ctx.labels && ctx.showHoverIcon && ctx.currentIconInfo && ctx.currentIconInfo.top_class_indices) && create_if_block(component, ctx);

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
				addLoc(table, file$3, 48, 8, 1378);
				setStyle(div0, "font-size", "10px");
				setStyle(div0, "margin-top", "4px");
				setStyle(div0, "color", "#999");
				setStyle(div0, "text-align", "right");
				addLoc(div0, file$3, 71, 8, 2413);
				div1.className = "hover svelte-ptap6b";
				setStyle(div1, "top", ((ctx.topLeftCornerHover.y + ctx.iconSizeInPixels + 10) + 'px'));
				setStyle(div1, "left", ((ctx.topLeftCornerHover.x + ctx.iconSizeInPixels + 10) + 'px'));
				addLoc(div1, file$3, 47, 6, 1218);
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
				addLoc(tr0, file$3, 50, 10, 1428);
				td0.className = "svelte-ptap6b";
				addLoc(td0, file$3, 55, 12, 1697);
				setStyle(td1, "text-align", "right");
				td1.className = "svelte-ptap6b";
				addLoc(td1, file$3, 56, 12, 1776);
				addLoc(tr1, file$3, 54, 10, 1680);
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
				addLoc(td0, file$3, 61, 14, 2003);
				td1.className = "" + (ctx.i == 0 ? 'first': '') + " svelte-ptap6b";
				addLoc(td1, file$3, 62, 14, 2095);
				setStyle(td2, "text-align", "right");
				td2.className = "svelte-ptap6b";
				addLoc(td2, file$3, 63, 14, 2163);
				addLoc(tr, file$3, 60, 12, 1984);
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
				addLoc(canvas, file$3, 69, 10, 2358);
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



		if (!('showHoverImage' in this._state)) console.warn("<Atlas> was created without expected data property 'showHoverImage'");
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

	function download(filename, url) {
	  let a = document.createElement("a");
	  document.body.appendChild(a);
	  a.setAttribute("download", filename + ".jpg");
	  a.setAttribute("href", url);
	  a.style["display"] = "none";
	  a.click();
	}

	let e = document.createElement("div");
	e.style.width = "2000px";
	e.style.height = "2000px";
	e.style.position = "relative";
	document.querySelector("#app").appendChild(e);


	// function download() {
	//   var download = document.getElementById("download");
	//   var image = document.getElementById("canvas").toDataURL("image/png")
	//     .replace("image/png", "image/octet-stream");
	//   download.setAttribute("href", image);

	// }
	// <a id="download" download="image.png"><button type="button" onClick="download()">Download</button></a>



	let atlas = new Atlas({
	  target: e,
	  store,
	  data: {
	    id: "inceptionv1_mixed4c",
	    iconCrop: 0.3,
	    scaleCountFactor: 500,
	    showLabels: true,
	    gridSize: 2,
	    textShadow: true,
	    enableDragToPan: false,
	    enableClickToZoom: false,
	    enableHover: false
	  }
	});


	let b = document.createElement("button");
	let name = "test";
	b.textContent = `download '${name}'`;
	b.addEventListener("click", () => {
	  const canvas = atlas.refs.canvas;
	  let image = canvas.toDataURL("image/jpg");
	  download(name, image);
	});
	document.querySelector("#app").appendChild(b);

}());
//# sourceMappingURL=renders.js.map
