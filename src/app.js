import store from "./Store.js";
import AppStandalone from "./components/AppStandalone.html"
import Tooltip from "./library/Tooltip.html";
import AtlasTooltip from "./components/AtlasTooltip.html";

store.set({
  scroll: true
})

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
    
  }
});