import { Store } from 'svelte/store.js';
import Labels from './Labels.js';

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

      },
      {
        layerName: "mixed4c",
        homeX: 0.146,
        homeY: 0.392,

      },
      {
        layerName: "mixed5b",
        homeX: 0.1668,
        homeY: 0.2833,
        gridSize: 4,
        homeScale: 16 * 3 * 2,

      }
    ],
    water: [
      {
        layerName: "mixed4c",
        homeX: 0.365,
        homeY: 0.673,
      },
      {
        layerName: "mixed4c",
        homeX: 0.318,
        homeY: 0.764,
      },
      {
        layerName: "mixed5b",
        homeX: 0.740,
        homeY: 0.534,
        gridSize: 4,
        homeScale: 16 * 6,
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

export default store;