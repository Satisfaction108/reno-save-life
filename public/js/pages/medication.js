import { store, sessionStore, escapeHtml, icon, emit } from "../storage.js";
import { t } from "../i18n.js";

const RXNAV = "https://rxnav.nlm.nih.gov/REST";
const OPENFDA = "https://api.fda.gov/drug/label.json";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

// Label words that aren't drugs
const OCR_STOPWORDS = new Set([
  "take", "tablet", "tablets", "capsule", "capsules", "daily", "once", "twice", "mouth", "with", "food", "water",
  "refill", "refills", "pharmacy", "patient", "doctor", "prescriber", "quantity", "date", "filled", "expires",
  "discard", "after", "before", "every", "hours", "needed", "pain", "only", "directed", "store", "room",
  "temperature", "keep", "reach", "children", "caution", "federal", "prohibits", "transfer", "this", "drug",
  "other", "than", "whom", "prescribed", "generic", "brand", "substitute", "street", "avenue", "road", "city",
  "phone", "call", "morning", "evening", "night", "bedtime", "days", "week", "oral", "sodium", "potassium",
  "calcium", "magnesium", "vitamin", "iron", "zinc", "oxygen", "alcohol", "sugar", "salt"
]);

const LEVELS = {
  caution: { cls: "bad", label: { en: "Kidney caution", es: "Precaución renal" }, icon: "alert" },
  monitor: { cls: "warn", label: { en: "Check with your doctor", es: "Consulta con tu médico" }, icon: "info" },
  protect: { cls: "protect", label: { en: "Often protects kidneys", es: "Suele proteger los riñones" }, icon: "shield" },
  label: { cls: "info", label: { en: "Label mentions kidneys", es: "La etiqueta menciona los riñones" }, icon: "info" },
  none: { cls: "good", label: { en: "No known kidney issue", es: "Sin problema renal conocido" }, icon: "check" },
  unknown: { cls: "", label: { en: "Not found", es: "No encontrado" }, icon: "info" }
};

let groups = [];
let supplements = [];
let meds = [];
let noMeds = false;
let suggestTimer;
let activeSuggestion = -1;
let els = {};

// Pick storage by user choice
function medStore() {
  return store.get("medsRemember", false) ? store : sessionStore;
}

export function loadMeds() {
  return store.get("meds") || sessionStore.get("meds") || { none: false, items: [] };
}

function persist() {
  const data = { none: noMeds, items: meds.filter((med) => !med.pending) };
  store.remove("meds");
  sessionStore.remove("meds");
  medStore().set("meds", data);
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function resolveRxcui(name) {
  const exact = await getJson(`${RXNAV}/rxcui.json?name=${encodeURIComponent(name)}&search=2`);
  const id = exact.idGroup?.rxnormId?.[0];
  if (id) return id;
  const approx = await getJson(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=1`);
  const candidate = approx.approximateGroup?.candidate?.[0];
  return candidate && Number(candidate.score) > 5 ? candidate.rxcui : null;
}

// Brand name to ingredients
async function ingredientsFor(rxcui) {
  const { properties } = await getJson(`${RXNAV}/rxcui/${rxcui}/properties.json`);
  if (properties?.tty === "IN") return [properties.name.toLowerCase()];
  const related = await getJson(`${RXNAV}/rxcui/${rxcui}/related.json?tty=IN`);
  const names = (related.relatedGroup?.conceptGroup || []).flatMap((g) => g.conceptProperties || []).map((c) => c.name.toLowerCase());
  return names.length ? [...new Set(names)] : properties?.name ? [properties.name.toLowerCase()] : [];
}

function findGroups(ingredients, rawName) {
  const matches = groups.filter((group) => ingredients.some((ing) => group.ingredients.some((known) => ing === known || ing.startsWith(`${known} `) || known.startsWith(`${ing} `))));
  const haystack = `${rawName} ${ingredients.join(" ")}`.toLowerCase();
  return matches.concat(supplements.filter((s) => s.keywords.some((k) => haystack.includes(k))));
}

// Find a kidney sentence
function kidneySentence(label) {
  const fields = ["boxed_warning", "warnings_and_cautions", "warnings", "do_not_use", "ask_doctor", "precautions"];
  for (const field of fields) {
    const text = (label[field] || []).join(" ");
    if (!text) continue;
    const parts = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+|\s*•\s*|\s*\(\s*\d+(?:\.\d+)*\s*\)\s*/);
    const found = parts.find((p) => p && /\b(kidney|renal)\b/i.test(p) && p.length > 30 && p.length < 320);
    if (!found) continue;
    const cleaned = found.replace(/^[\d.\s]+/, "").replace(/^(\d+\s+)?[A-Z][A-Z\s&]{6,}\s+/, "").trim();
    if (/^[a-z]/.test(cleaned)) return (field === "do_not_use" ? "Do not use " : "Ask a doctor before use if ") + cleaned;
    return cleaned;
  }
  return null;
}

async function fdaLabelNote(ingredients) {
  for (const ingredient of ingredients.slice(0, 2)) {
    try {
      const data = await getJson(`${OPENFDA}?search=openfda.generic_name:${encodeURIComponent(`"${ingredient}"`)}&limit=25`);
      const isRx = (label) => (label.openfda?.product_type || []).some((type) => /prescription/i.test(type));
      const exact = (data.results || [])
        .filter((label) => (label.openfda?.generic_name || []).some((name) => name.toLowerCase() === ingredient))
        .sort((a, b) => Number(isRx(b)) - Number(isRx(a)));
      for (const label of exact) {
        const sentence = kidneySentence(label);
        if (sentence) return sentence;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function analyzeMedication(name) {
  const entry = { name, ingredients: [], groups: [], fda: null, level: "none" };
  try {
    const rxcui = await resolveRxcui(name);
    if (rxcui) entry.ingredients = await ingredientsFor(rxcui);
  } catch {
    entry.ingredients = [];
  }
  entry.groups = findGroups(entry.ingredients, name);
  entry.fda = entry.ingredients.length ? await fdaLabelNote(entry.ingredients) : null;
  const top = ["caution", "monitor", "protect"].find((level) => entry.groups.some((g) => g.level === level));
  if (top) entry.level = top;
  else if (entry.fda) entry.level = "label";
  if (!entry.ingredients.length && !entry.groups.length) entry.level = "unknown";
  return entry;
}

function cardHtml(med, index) {
  if (med.pending) {
    return `<li class="med-card"><div class="loader"><span class="spinner"></span>${t({ en: "Looking up {name}...", es: "Buscando {name}..." }, { name: escapeHtml(med.name) })}</div></li>`;
  }
  const level = LEVELS[med.level];
  const group = med.groups.find((g) => g.level === med.level) || med.groups[0];
  const ingredient = med.ingredients.length && med.ingredients.join(", ") !== med.name.toLowerCase()
    ? `<div class="med-ingredient">${t({ en: "Contains", es: "Contiene" })} ${escapeHtml(med.ingredients.join(", "))}</div>` : "";
  let body;
  if (group) {
    body = `<p class="med-body"><strong>${escapeHtml(group.name)}.</strong> ${escapeHtml(group.summary)}</p><p class="med-body">${escapeHtml(group.ask)}</p>`;
  } else if (med.level === "unknown") {
    body = `<p class="med-body">${t({ en: "We couldn't find this name in the NIH drug database. Check the spelling, or try the generic name printed on the label.", es: "No encontramos este nombre en la base de medicamentos de los NIH. Revisa la ortografía o prueba el nombre genérico de la etiqueta." })}</p>`;
  } else if (med.level === "label") {
    body = `<p class="med-body">${t({ en: "This isn't on our list of common kidney concerns, but its FDA label mentions the kidneys. Your pharmacist can tell you whether it matters for you.", es: "No está en nuestra lista de preocupaciones renales comunes, pero su etiqueta de la FDA menciona los riñones. Tu farmacéutico puede decirte si te afecta." })}</p>`;
  } else {
    body = `<p class="med-body">${t({ en: "This isn't on our list of common kidney concerns, and its FDA label doesn't warn about the kidneys.", es: "No está en nuestra lista de preocupaciones renales comunes y su etiqueta de la FDA no advierte sobre los riñones." })}</p>`;
  }
  const fda = med.fda ? `<div class="med-label"><strong>${t({ en: "FDA label says", es: "La etiqueta de la FDA dice" })}</strong>"${escapeHtml(med.fda)}"</div>` : "";
  return `<li class="med-card ${med.level === "label" ? "monitor" : med.level}">
    <div class="med-head">
      <div><div class="med-name">${escapeHtml(med.name)}</div>${ingredient}</div>
      <div class="med-tags"><span class="tag ${level.cls}">${icon(level.icon)}${t(level.label)}</span>
      <button type="button" class="icon-only" data-remove="${index}" aria-label="${t({ en: "Remove", es: "Quitar" })} ${escapeHtml(med.name)}">${icon("trash")}</button></div>
    </div>
    ${body}${fda}
  </li>`;
}

function render() {
  els.entry.setAttribute("aria-disabled", String(noMeds));
  els.entry.querySelectorAll("input, button").forEach((control) => {
    control.disabled = noMeds;
  });
  if (noMeds) {
    els.list.innerHTML = "";
    els.empty.hidden = false;
    els.empty.innerHTML = `<div class="med-none-card">${icon("check")}<p>${t({ en: "Got it. If you start a new medicine, including painkillers or supplements from the store, come back and add it here.", es: "Entendido. Si empiezas un medicamento nuevo, incluidos analgésicos o suplementos de la tienda, vuelve y agrégalo aquí." })}</p></div>`;
    return;
  }
  els.empty.innerHTML = `${icon("pill")}<p>${t({ en: "Medicines you add will show up here.", es: "Los medicamentos que agregues aparecerán aquí." })}</p>`;
  els.empty.hidden = meds.length > 0;
  els.list.innerHTML = meds.map(cardHtml).join("");
  els.list.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      meds.splice(Number(button.dataset.remove), 1);
      persist();
      render();
      emit("medication");
    });
  });
}

async function addMedication(rawName) {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!name || meds.some((med) => med.name.toLowerCase() === name.toLowerCase())) return;
  const placeholder = { name, pending: true };
  meds.push(placeholder);
  render();
  const result = await analyzeMedication(name);
  const index = meds.indexOf(placeholder);
  if (index === -1) return;
  meds[index] = result;
  persist();
  render();
  emit("medication");
}

function hideSuggestions() {
  els.suggest.hidden = true;
  els.input.setAttribute("aria-expanded", "false");
  activeSuggestion = -1;
}

// Suggestions on every letter
async function showSuggestions(term) {
  const last = term.split(",").pop().trim();
  if (!last) return hideSuggestions();
  try {
    const data = await getJson(`/api/meds?q=${encodeURIComponent(last)}`);
    const names = data.names || [];
    if (!names.length || els.input.value.split(",").pop().trim() !== last) return hideSuggestions();
    els.suggest.innerHTML = names.map((name, i) => `<li role="option" id="sug-${i}" aria-selected="false">${escapeHtml(name)}</li>`).join("");
    els.suggest.hidden = false;
    els.input.setAttribute("aria-expanded", "true");
    activeSuggestion = -1;
    els.suggest.querySelectorAll("li").forEach((item) => {
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        submitNames(item.textContent, true);
      });
    });
  } catch {
    hideSuggestions();
  }
}

// Add one or many names
function submitNames(chosen, fromSuggestion = false) {
  const parts = els.input.value.split(",").map((p) => p.trim()).filter(Boolean);
  if (fromSuggestion) parts.splice(parts.length ? parts.length - 1 : 0, 1, chosen);
  els.input.value = "";
  hideSuggestions();
  for (const name of [...new Set(parts.map((p) => p.toLowerCase()))].map((lower) => parts.find((p) => p.toLowerCase() === lower))) addMedication(name);
}

function moveSuggestion(delta) {
  const items = [...els.suggest.querySelectorAll("li")];
  if (!items.length || els.suggest.hidden) return false;
  activeSuggestion = (activeSuggestion + delta + items.length) % items.length;
  items.forEach((item, i) => item.setAttribute("aria-selected", String(i === activeSuggestion)));
  els.input.setAttribute("aria-activedescendant", items[activeSuggestion].id);
  return true;
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TESSERACT_URL;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("tesseract_load"));
    document.head.appendChild(script);
  });
}

function showPreview(src) {
  const preview = document.getElementById("ocr-preview");
  preview.src = src;
  preview.alt = t({ en: "Prescription being read", es: "Receta que se está leyendo" });
  preview.hidden = false;
}

function setOcr(html) {
  els.ocr.hidden = !html;
  els.ocr.innerHTML = html;
}

// Fuzzy match OCR words server-side
async function findDrugWords(text) {
  const words = [...new Set(text.split(/[^A-Za-z-]+/).map((w) => w.replace(/^-+|-+$/g, "")).filter((w) => w.length >= 5 && !OCR_STOPWORDS.has(w.toLowerCase())))].slice(0, 60);
  if (!words.length) return [];
  const data = await getJson(`/api/meds-match?words=${encodeURIComponent(words.join(","))}`);
  return data.matches || [];
}

// Bigger, gray, high contrast
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(3, Math.max(1, 1800 / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.filter = "grayscale(1) contrast(1.6)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Read label on device
async function handlePhoto(file) {
  if (!file) return;
  setOcr(`<div class="loader"><span class="spinner"></span>${t({ en: "Loading the text reader. It runs on your device...", es: "Cargando el lector de texto. Funciona en tu dispositivo..." })}</div>`);
  try {
    const Tesseract = await loadTesseract();
    const image = await prepareImage(file).catch(() => file);
    const result = await Tesseract.recognize(image, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") setOcr(`<div class="loader"><span class="spinner"></span>${t({ en: "Reading the label... {pct}%", es: "Leyendo la etiqueta... {pct}%" }, { pct: Math.round(m.progress * 100) })}</div>`);
      }
    });
    setOcr(`<div class="loader"><span class="spinner"></span>${t({ en: "Checking words against the drug database...", es: "Comparando palabras con la base de medicamentos..." })}</div>`);
    const candidates = await findDrugWords(result.data.text || "");
    if (!candidates.length) {
      setOcr(t({ en: "We couldn't find a medicine name in that photo. Try a sharper photo in good light, or type the name above.", es: "No encontramos un nombre de medicamento en la foto. Prueba una foto más nítida con buena luz, o escribe el nombre arriba." }));
      return;
    }
    setOcr(`<p>${t({ en: "These might be medicine names. Tap the ones that are right:", es: "Estos podrían ser nombres de medicamentos. Toca los correctos:" })}</p>
      <div class="ocr-candidates">${candidates.map((c) => `<button type="button" class="chip" data-name="${escapeHtml(c.name)}" title="${escapeHtml(t({ en: "Read as \"{w}\"", es: "Leído como \"{w}\"" }, { w: c.from }))}">${icon("plus")}${escapeHtml(c.name)}${c.exact ? "" : ` <small>(${escapeHtml(c.from)})</small>`}</button>`).join("")}</div>`);
    els.ocr.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        addMedication(chip.dataset.name);
        chip.remove();
      });
    });
  } catch {
    setOcr(t({ en: "The text reader didn't load. Check your connection or type the name above.", es: "El lector de texto no cargó. Revisa tu conexión o escribe el nombre arriba." }));
  } finally {
    els.photo.value = "";
  }
}

// Summary for scoring
export function getMedicationSummary() {
  const data = loadMeds();
  const items = data.items || [];
  return {
    none: Boolean(data.none),
    answered: Boolean(data.none) || items.length > 0,
    count: items.length,
    caution: items.filter((m) => m.level === "caution").map((m) => m.name),
    monitor: items.filter((m) => m.level === "monitor" || m.level === "label").map((m) => m.name),
    protect: items.filter((m) => m.level === "protect").map((m) => m.name)
  };
}

export async function init() {
  els = {
    none: document.getElementById("med-none"),
    entry: document.getElementById("med-entry"),
    form: document.getElementById("med-form"),
    input: document.getElementById("med-name"),
    suggest: document.getElementById("med-suggest"),
    photo: document.getElementById("med-photo"),
    ocr: document.getElementById("ocr-status"),
    remember: document.getElementById("med-remember"),
    list: document.getElementById("med-list"),
    empty: document.getElementById("med-empty")
  };
  try {
    const data = await (await fetch("data/nephro-meds.json")).json();
    groups = data.groups;
    supplements = data.supplements;
  } catch {
    groups = [];
    supplements = [];
  }

  const saved = loadMeds();
  meds = saved.items || [];
  noMeds = Boolean(saved.none);
  els.none.checked = noMeds;
  els.remember.checked = store.get("medsRemember", false);

  els.none.addEventListener("change", () => {
    noMeds = els.none.checked;
    persist();
    render();
    emit("medication");
  });
  els.remember.addEventListener("change", () => {
    store.set("medsRemember", els.remember.checked);
    persist();
  });
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const items = [...els.suggest.querySelectorAll("li")];
    if (activeSuggestion >= 0 && items[activeSuggestion]) submitNames(items[activeSuggestion].textContent, true);
    else submitNames(null);
  });
  els.input.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    const term = els.input.value;
    suggestTimer = setTimeout(() => showSuggestions(term), 120);
  });
  els.input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && moveSuggestion(1)) event.preventDefault();
    if (event.key === "ArrowUp" && moveSuggestion(-1)) event.preventDefault();
    if (event.key === "Escape") hideSuggestions();
  });
  els.input.addEventListener("blur", () => setTimeout(hideSuggestions, 120));
  els.photo.addEventListener("change", () => {
    const file = els.photo.files[0];
    if (file) showPreview(URL.createObjectURL(file));
    handlePhoto(file);
  });
  // Demo with sample image
  document.getElementById("med-sample").addEventListener("click", async () => {
    const blob = await (await fetch("img/sample-prescription.png")).blob();
    showPreview("img/sample-prescription.png");
    handlePhoto(new File([blob], "sample-prescription.png", { type: "image/png" }));
  });
  render();
  document.addEventListener("langchange", render);
}
