import store from "./Store.js";
import Atlas from "./Atlas.html";


function download(filename, url) {
  let a = document.createElement("a");
  document.body.appendChild(a);
  a.setAttribute("download", filename + ".jpg");
  a.setAttribute("href", url);
  a.style["display"] = "none";
  a.click();
}

let app = document.querySelector("#app")

// Test
{
  let e = document.createElement("div");
  e.style.width = "2000px";
  e.style.height = "2000px";
  e.style.position = "relative";
  app.appendChild(e);

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
  let name = "test"
  b.textContent = `download '${name}'`
  b.addEventListener("click", () => {
    const canvas = atlas.refs.canvas;
    let image = canvas.toDataURL("image/jpg");
    download(name, image);
  });
  app.appendChild(b);
}
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
      homeX: 0.807,
      homeY: 0.333,
      homeScale: 10,
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
      homeX: 0.221,
      homeY: 0.138,
      homeScale: 10,
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
      homeX: 0.709,
      homeY: 0.421,
      homeScale: 10,
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
      homeX: 0.873,
      homeY: 0.415,
      homeScale: 10,
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
      homeX: 0.807,
      homeY: 0.333,
      homeScale: 10,
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