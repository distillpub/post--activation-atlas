import store from "./Store.js";
import Atlas from "./Atlas.html";
import AtlasThumbnail from "./AtlasThumbnail.html";


function download(filename, url) {
  let a = document.createElement("a");
  document.body.appendChild(a);
  a.setAttribute("download", filename + ".jpg");
  a.setAttribute("href", url);
  a.style["display"] = "none";
  a.click();
}

let app = document.querySelector("#app")

// 
// Atlas Thumbnails
// 

let layers = ["mixed3b", "mixed4a", "mixed4b", "mixed4c", "mixed4d", "mixed4e", "mixed5a", "mixed5b"]
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
  let name = `thumbnail-${layer}`
  b.textContent = `download '${layer}'`
  b.addEventListener("click", () => {
    const canvas = atlas.refs.canvas;
    let image = canvas.toDataURL("image/jpg");
    download(name, image);
  });
  app.appendChild(b);
})

// 
// mulitple-layers
// 

let subjects = ["abacus", "plant", "water"]
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
    }
    let id = d.layerName ? "inceptionv1_" + d.layerName : "inceptionv1_mixed4c"

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
    })
  })
})


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
      showLabels: false,
      textShadow: true,
      enableDragToPan: false,
      enableClickToZoom: false,
      enableHover: false
    }
  });

  let b = document.createElement("button");
  b.textContent = "render"
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
  b.textContent = "render"
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
      showLabels: false,
      textShadow: true,
      enableDragToPan: false,
      enableClickToZoom: false,
      enableHover: false
    }
  });

  let b = document.createElement("button");
  b.textContent = "render"
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
  b.textContent = "render"
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
  b.textContent = "render"
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
  b.textContent = "render"
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
  b.textContent = "render"
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
      showLabels: false,
      textShadow: true,
      enableDragToPan: false,
      enableClickToZoom: false,
      enableHover: false
    }
  });

  let b = document.createElement("button");
  b.textContent = "render"
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
  b.textContent = "render"
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
  b.textContent = "render"
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
  b.textContent = "render"
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
  b.textContent = "render"
  app.appendChild(b);
  b.addEventListener("click", () => {
    atlas.render();
  });
}