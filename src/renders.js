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
let name = "test"
b.textContent = `download '${name}'`
b.addEventListener("click", () => {
  const canvas = atlas.refs.canvas;
  let image = canvas.toDataURL("image/jpg");
  download(name, image);
});
document.querySelector("#app").appendChild(b);





