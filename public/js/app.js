import { store } from "./storage.js";
import { initI18n } from "./i18n.js";
import { renderLayout, markReady } from "./layout.js";

// Page name to module
const PAGES = {
  home: () => import("./pages/home.js"),
  diet: () => import("./pages/diet.js"),
  exercise: () => import("./pages/exercise.js"),
  medication: () => import("./pages/medication.js"),
  environment: () => import("./pages/environment.js"),
  health: () => import("./pages/health.js"),
  results: () => import("./pages/results.js"),
  numbers: () => import("./pages/numbers.js")
};

async function start() {
  if (store.get("theme") === "dark") document.documentElement.dataset.theme = "dark";
  const page = document.body.dataset.page;
  await initI18n();
  renderLayout(page);
  const load = PAGES[page];
  if (load) {
    const module = await load();
    await module.init();
  }
  markReady();
}

start();
