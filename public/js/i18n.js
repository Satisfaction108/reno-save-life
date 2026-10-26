import { store } from "./storage.js";

const originals = new Map();
const placeholderOriginals = new Map();
let spanish = {};
let lang = store.get("lang", "en") === "es" ? "es" : "en";

export function getLang() {
  return lang;
}

export function locale() {
  return lang === "es" ? "es" : "en-US";
}

// Pick text and fill blanks
export function t(pair, vars = {}) {
  const text = typeof pair === "string" ? pair : pair[lang] ?? pair.en;
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`));
}

// Swap static page text
function applyStatic() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (!originals.has(element)) originals.set(element, element.textContent);
    const key = element.dataset.i18n;
    element.textContent = lang === "es" && spanish[key] ? spanish[key] : originals.get(element);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    if (!placeholderOriginals.has(element)) placeholderOriginals.set(element, element.placeholder);
    const key = element.dataset.i18nPlaceholder;
    element.placeholder = lang === "es" && spanish[key] ? spanish[key] : placeholderOriginals.get(element);
  });
  document.documentElement.lang = lang;
}

export async function initI18n() {
  try {
    spanish = await (await fetch("data/i18n/es.json")).json();
  } catch {
    spanish = {};
  }
  applyStatic();
}

export function refreshStatic() {
  applyStatic();
}

export function setLang(next) {
  lang = next === "es" ? "es" : "en";
  store.set("lang", lang);
  applyStatic();
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}
