import store from "./Store.js";

import LazyComponent from './library/LazyComponent.html';
import NotebookLink from './library/NotebookLink.html';

import App from './components/App.html';

// import Cover from './diagrams/Cover.html';
import Overview from './diagrams/Overview.html';
import ModelOverview from './diagrams/ModelOverview.html';
import GridDetail from './diagrams/GridDetail.html';
import ClassSubset from './diagrams/ClassSubset.html';
import ClassComparison from './diagrams/ClassComparison.html';
import ClassGradient from './diagrams/ClassGradient.html';
import Adversarial from './diagrams/Adversarial.html';
import Samples from './diagrams/Samples.html';
import ClassGrids from './diagrams/ClassGrids.html';

import ActivationGrid from './diagrams/ActivationGrid.html';
import Process from './diagrams/Process.html';
import OneLayer from './diagrams/OneLayer.html';
import LayerAnnotation from './diagrams/LayerAnnotation.html';
import ShowAPath from './diagrams/ShowAPath.html';
import VerticalLayerAnnotation from './diagrams/VerticalLayerAnnotation.html';
// import AllLayerComparison from './diagrams/AllLayerComparison.html';
import Focus1 from './diagrams/Focus1.html';
import Focus2 from './diagrams/Focus2.html';
import Focus3 from './diagrams/Focus3.html';
import Focus3Table from './diagrams/Focus3Table.html';
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
	})

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

	new ClassComparison({
		target: document.querySelector("#class-comparison-1"),
		store: store,
		data: {
			showControls: false,
			classComparisonIndex: 1
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


});