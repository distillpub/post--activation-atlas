import store from "./Store.js";

import Tooltip from "./library/Tooltip.html";
import AtlasTooltip from "./components/AtlasTooltip.html";

import LazyComponent from './library/LazyComponent.html';
import LazyImage from './library/LazyImage.html';
import NotebookLink from './library/NotebookLink.html';

import App from './components/App.html';

// import Cover from './diagrams/Cover.html';
import Overview from './diagrams/Overview.html';
import ModelOverview from './diagrams/ModelOverview.html';
import GridDetail from './diagrams/GridDetail.html';
import ClassSubset from './diagrams/ClassSubset.html';
import ClassAtlas from './diagrams/ClassAtlas.html';
import ClassFilterComparison from './diagrams/ClassFilterComparison.html';
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
import VerticalLayerStatic from './diagrams/VerticalLayerStatic.html';
import Focus1Static from './diagrams/Focus1Static.html';
import Focus2Static from './diagrams/Focus2Static.html';
import Focus3Static from './diagrams/Focus3Static.html';
import Focus3TableStatic from './diagrams/Focus3TableStatic.html';
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

	// 
	// Cover
	// 

	const coverWrapper = new LazyComponent({
		target: document.querySelector("#cover"),
		store: store,
		data: {
			component: App,
			componentData: {
				showClassFilter: false,
				layerName: "mixed4d",
				showOptions: false,
				// homeX: 0.550,
				// homeY: 0.283,
				homeX: 0.661,
				homeY: 0.278,
				homeScale: 5,
				gridSize: 2,
				scrollWheel: false,
			}
		}
	});

	// 
	// Initialize lazy images
	// 

	const lazyImages = document.querySelectorAll("[data-lazy-image]");
	for (const lazyImage of lazyImages) {
		const url = lazyImage.getAttribute("data-lazy-image");
		const alt = lazyImage.getAttribute("alt");
		const aspectRatio = lazyImage.getAttribute("data-lazy-image-aspect-ratio");
		new LazyImage({
			target: lazyImage,
			data: {
				src: "assets/images/" + url,
				alt: alt,
				aspectRatio: aspectRatio ? aspectRatio : 1,
				background: false,
				border: false,
			}
		})
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

	

	const coverPoiLinks = document.querySelectorAll("[data-cover-poi]");
	for (const link of coverPoiLinks) {
		const s = link.getAttribute("data-cover-poi");
		const parts = s.split(",").map(p => +p);

		link.addEventListener("click", e => {
			e.preventDefault();
			const component = coverWrapper.getComponent();
			component.set({ layerName: "mixed4d" });
			component.zoomTo(
				parts[0],
				parts[1],
				parts[2],
				4000
			);
		});
	}

	// const cover = document.querySelector("#cover");
	// cover.addEventListener("ready", e => {
	// 	new App({
	// 		target: cover,
	// 		store,
	// 		data: {
	// 			showClassFilter: false,
	// 			layerName: "mixed4d",
	// 			showLabels: false,
	// 			showOptions: false,
	// 			homeX: 0.55,
	// 			homeY: 0.7,
	// 			homeScale: 4,
	// 			gridSize: 2
	// 		}
	// 	});
	// });

	new Overview({ target: document.querySelector("#overview") });

	new ModelOverview({ target: document.querySelector("#model-overview") });

	new GridDetail({ target: document.querySelector("#grid-detail") });

	new LazyComponent({
		target: document.querySelector("#activation-grid"),
		data: {
			aspectRatio: 1150 / 290,
			component: ActivationGrid
		}
	})

	new LazyComponent({
		target: document.querySelector("#process"),
		data: {
			aspectRatio: 2.64,
			component: Process
		}
	});

	new LazyComponent({
		store: store,
		target: document.querySelector("#one-layer"),
		data: {
			height: "calc(100vw - 40px + 28px + 40px)",
			component: OneLayer
		}
	});

	new LazyComponent({
		target: document.querySelector("#layer-annotation-1"),
		store: store,
		data: {
			height: 300,
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
			height: 300,
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
			height: 300,
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
			height: 300,
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
			height: 300,
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
			height: 300,
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
			height: 300,
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
			height: 300,
			component: LayerAnnotation,
			componentData: {
				homeX: 0.594,
				homeY: 0.223
			},
		}
	});


	// bokeh
	new ShowAPath({
		target: document.querySelector("#show-a-path-0"),
		store: store,
		data: {
				layerName: "mixed4c",
				pointList: [
					[0.161, 0.38610],
					[0.161, 0.39373],
					[0.161, 0.4013],
					[0.161, 0.40900],
					[0.161, 0.41664],
					[0.161, 0.42427],
					[0.161, 0.43190],
					[0.161, 0.43954],
					[0.161, 0.4471],
					[0.161, 0.4548],
					[0.161, 0.46244],
					[0.161, 0.47008],
					[0.161, 0.47771],
					[0.161, 0.48535],
					[0.161, 0.49299],
					[0.161, 0.500],
					[0.161, 0.5082],
					[0.161, 0.5158],
					[0.161, 0.5235],
					[0.161, 0.5311]
				],
		}
	});

	// crowd -> single person
	new ShowAPath({
		target: document.querySelector("#show-a-path-1"),
		store: store,
		data: {
				layerName: "mixed4c",
				pointList: [
					[0.8777, 0.35276],
					[0.87582, 0.3431],
					[0.87388, 0.3336],
					[0.8719, 0.3240],
					[0.86999, 0.31443],
					[0.86804, 0.30485],
					[0.86610, 0.2952],
					[0.86415, 0.2856],
					[0.86221, 0.2761],
					[0.86026, 0.26652],
					[0.85832, 0.25694],
					[0.85638, 0.24735],
					[0.85443, 0.23777],
					[0.85249, 0.228],
					[0.85054, 0.2186],
					[0.84860, 0.20902],
					[0.84665, 0.19944],
					[0.84471, 0.18985],
					[0.84276, 0.1802],
					[0.84082, 0.17069],
				],
		}
	});

	// water -> ground
	new ShowAPath({
		target: document.querySelector("#show-a-path-2"),
		store: store,
		data: {
				layerName: "mixed4c",
				pointList: [
					[0.275, 0.775],
					[0.27946, 0.76517],
					[0.28392, 0.75535],
					[0.288389, 0.74553],
					[0.292852, 0.73571],
					[0.29731, 0.72589],
					[0.30177, 0.7160],
					[0.30408, 0.70560],
					[0.305765, 0.69495],
					[0.307448, 0.68429],
					[0.30913, 0.67364],
					[0.310813, 0.66298],
					[0.311110, 0.65222],
					[0.311110, 0.6414],
					[0.311110, 0.63065],
					[0.311110, 0.61986],
					[0.311110, 0.60907],
					[0.30584, 0.59978],
					[0.30019, 0.59059],
					[0.29454, 0.58140]
				],
		}
	});


	// fruit
	new ShowAPath({
		target: document.querySelector("#show-a-path-3"),
		store: store,
		data: {
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
	});

	// Looking at Multiple Layers

	const subjects = ["plant", "water"]
	const groups = [0, 1, 2]

	subjects.forEach(s => {
		groups.forEach (g => {
			let d = {
				index: g,
				subject: s
			}
			Object.assign(d, store.get().multipleLayers[s][g])
			new VerticalLayerStatic({
				target: document.querySelector(`#${s}-${g}`),
				store: store,
				data: d
			});
		})
	});

	// const allLayerComparisonElement = document.querySelector("#all-layer-comparison")
	// allLayerComparisonElement.addEventListener("ready", () => {
	// 	new App({
	// 		target: allLayerComparisonElement,
	// 		store: store,
	// 		data: {
	// 			showClassFilter: false
	// 		}
	// 	});
	// });


	const layerComparisonWrapper = new LazyComponent({
		target: document.querySelector("#all-layer-comparison"),
		store: store,
		data: {
			component: App,
			componentData: {
				showClassFilter: false,
				layerName: "mixed4e",
				gridSize: -1
			}
		}
	});


	const poiLinks = document.querySelectorAll("[data-poi]");
	for (const link of poiLinks) {
		const id = link.getAttribute("data-poi");
		const { pois } = store.get();
		link.addEventListener("click", e => {
			e.preventDefault();
			const component = layerComparisonWrapper.getComponent();
			component.set({layerName: pois[id].layerName});
			component.zoomTo(
				pois[id].gcx,
				pois[id].gcy,
				pois[id].scale,
				0
			);
			// layerComparison.set(pois[id]);
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

	// const focusPlaygroundElement = document.querySelector("#focus-playground");
	// focusPlaygroundElement.addEventListener("ready", () => {
	// 	new App({
	// 		target: focusPlaygroundElement,
	// 		store: store,
	// 		data: {
	// 			classHeatmap: 235,
	// 			layerName: "mixed4d"
	// 		}
	// 	});
	// });

	new LazyComponent({
		target: document.querySelector("#focus-playground"),
		store: store,
		data: {
			component: App,
			componentData: {
				classHeatmap: 235,
				layerName: "mixed4d"
			}
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


	new LazyComponent({
		target: document.querySelector("#class-gradient-snorkel"),
		store: store,
		data: {
			aspectRatio: 1.152,
			component: ClassGradient,
			componentData: {
				currentClassComparisonIndex: 0
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#class-gradient-frying-pan"),
		store: store,
		data: {
			aspectRatio: 1.152,
			component: ClassGradient,
			componentData: {
				currentClassComparisonIndex: 2
			}
		}
	});

	new LazyComponent({
		target: document.querySelector("#class-gradient-shark"),
		store: store,
		data: {
			aspectRatio: 1.152,
			component: ClassGradient,
			componentData: {
				currentClassComparisonIndex: 8
			}
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
						image: "assets/images/snorkel-train.png",
						caption: "Image from ImageNet labeled as “snorkel” with the classification confidences from Inceptionv1 for the top six classes.",
						rows: [
							["snorkel", 55.60],
							["coral reef", 18.65],
							["scuba diver", 13.49],
							["loggerhead", 5.52],
							["lionfish", 1.71],
							["sea snake", 1.36]
						]
					},
					{
						image: "assets/images/snorkel-train-medium.png",
						caption: "By adding a picture of one of the concepts seen in the visualization above we can change the classification. With an added picture of a steam train the confidence of “scuba diver” classification rises and “snorkel” drops significantly.",
						rows: [
							["scuba diver", 91.55],
							["wreck", 2.39],
							["amphibian", 1.12],
							["snorkel", 0.70],
							["ski", 0.62],
							["sea snake", 0.59]
						]
					},
					{
						image: "assets/images/snorkel-train-large.png",
						caption: "As the picture of the train gets bigger, the classification for “steam locomotive” overwhelms, but “scuba diver” remains.",
						rows: [
							["steam locomotive", 87.70],
							["scuba diver", 5.61],
							["tractor", 3.90],
							["jeep", 0.49],
							["wreck", 0.38],
							["harvester", 0.33]
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
		target: document.querySelector("#adversarial-teaser"),
		store: store,
		data: {
			left: "great white shark",
			right: "grey whale",
			aspectRatio: 996 / 656,
			classifications: [
				{
					image: "assets/images/whale-baseball.png",
					caption: "",
					rows: [
						["grey whale", 90.57],
						["killer whale", 7.97],
						["great white shark", 0.67],
						["gar", 0.37],
						["sea lion", 0.13],
					]
				},
				{
					image: "assets/images/whale-baseball-medium.png",
					caption: "",
					rows: [
						["great white shark", 56.51],
						["grey whale", 16.94],
						["baseball", 8.31],
						["killer whale", 6.18],
						["rugby ball", 4.83],
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
						image: "assets/images/whale-baseball.png",
						caption: "",
						rows: [
							["grey whale", 90.57],
							["killer whale", 7.97],
							["great white shark", 0.67],
							["gar", 0.37],
							["sea lion", 0.13],
							["albatross", 0.07],
						]
					},
					{
						image: "assets/images/whale-baseball-medium.png",
						caption: "",
						rows: [
							["great white shark", 56.51],
							["grey whale", 16.94],
							["baseball", 8.31],
							["killer whale", 6.18],
							["rugby ball", 4.83],
							["ping-pong ball", 1.68],
						]
					},
					{
						image: "assets/images/whale-baseball-large.png",
						caption: "",
						rows: [
							["baseball", 99.95],
							["ping-pong ball", 0.02],
							["rugby ball", 0.02],
							["great white shark", 0.01],
							["tennis ball", 0.00],
							["golf ball", 0.00],
						]
					},
				]
			}
	});

	// new ClassAtlas({
	// 	target: document.querySelector("#shark-ball"),
	// 	store,
	// 	data: {
	// 		classFilter: 442,
	// 		filterType: "top",
	// 		showAttribution: true,
	// 	}
	// })

	// Technical Notes and Limitations


	new Samples({
		target: document.querySelector("#samples")
	});

	new ClassGrids({
		target: document.querySelector("#class-grids")
	});


});