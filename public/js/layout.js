import { store, icon } from "./storage.js";
import { t, getLang, setLang } from "./i18n.js";

// Check-up steps in order
export const STEPS = [
  { id: "diet", href: "diet.html", label: { en: "Diet", es: "Dieta" } },
  { id: "exercise", href: "exercise.html", label: { en: "Exercise", es: "Ejercicio" } },
  { id: "medication", href: "medication.html", label: { en: "Medicines", es: "Medicamentos" } },
  { id: "environment", href: "environment.html", label: { en: "Your area", es: "Tu zona" } },
  { id: "health", href: "health.html", label: { en: "Health", es: "Salud" } },
  { id: "results", href: "results.html", label: { en: "Score and plan", es: "Puntuación y plan" } }
];

let nextGuard = null;
let pageReady = false;

export function setNextGuard(guard) {
  nextGuard = guard;
}

// Allow next once page loads
export function markReady() {
  pageReady = true;
  const button = document.getElementById("next-btn");
  if (button) button.disabled = false;
}

export function markDone(id) {
  const progress = store.get("progress", {});
  progress[id] = true;
  store.set("progress", progress);
}

function navLinks(page) {
  const links = [
    { href: "index.html", id: "home", label: { en: "Home", es: "Inicio" } },
    { href: "diet.html", id: "checkup", label: { en: "Check-up", es: "Chequeo" } },
    { href: "results.html", id: "results", label: { en: "My plan", es: "Mi plan" } },
    { href: "numbers.html", id: "numbers", label: { en: "Know your numbers", es: "Tus cifras" } },
    { href: "donate.html", id: "donate", label: { en: "Kidney donation", es: "Donación de riñón" } }
  ];
  const isStep = STEPS.some((step) => step.id === page && step.id !== "results");
  return links
    .map((link) => {
      const active = link.id === page || (link.id === "checkup" && isStep);
      return `<a href="${link.href}"${active ? ' class="active" aria-current="page"' : ""}>${t(link.label)}</a>`;
    })
    .join("");
}

function stepperHtml(page) {
  const index = STEPS.findIndex((step) => step.id === page);
  if (index === -1) return "";
  const progress = store.get("progress", {});
  return `<nav class="stepper" aria-label="${t({ en: "Check-up steps", es: "Pasos del chequeo" })}"><div class="container"><ol>
    ${STEPS.map((step, i) => {
      const state = i === index ? "current" : progress[step.id] ? "done" : "";
      const dot = state === "done" ? icon("check") : i + 1;
      return `<li class="${state}"><a href="${step.href}"${i === index ? ' aria-current="step"' : ""}><span class="dot">${dot}</span><span class="label">${t(step.label)}</span></a></li>`;
    }).join("")}
  </ol></div></nav>`;
}

// Build the top bar
function renderHeader(page) {
  const mount = document.getElementById("site-header");
  if (!mount) return;
  const dark = document.documentElement.dataset.theme === "dark";
  mount.innerHTML = `
    <a class="skip-link" href="#main">${t({ en: "Skip to content", es: "Ir al contenido" })}</a>
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="index.html" aria-label="RENO Save Life">
          <img src="img/logo-128.png" alt="" width="42" height="42">
          <span class="brand-text"><strong>RENO</strong><span>Save Life</span></span>
        </a>
        <nav class="primary-nav" id="primary-nav" aria-label="${t({ en: "Main", es: "Principal" })}">${navLinks(page)}</nav>
        <div class="header-actions">
          <button class="icon-btn lang-btn" id="lang-toggle" type="button" aria-label="${getLang() === "en" ? "Cambiar a español" : "Switch to English"}">${icon("globe")}<span>${getLang() === "en" ? "ES" : "EN"}</span></button>
          <button class="icon-btn" id="theme-toggle" type="button" aria-label="${dark ? t({ en: "Use light mode", es: "Usar modo claro" }) : t({ en: "Use dark mode", es: "Usar modo oscuro" })}">${icon(dark ? "sun" : "moon")}</button>
          <button class="icon-btn menu-btn" id="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="${t({ en: "Menu", es: "Menú" })}">${icon("menu")}</button>
        </div>
      </div>
      ${stepperHtml(page)}
    </header>`;

  mount.querySelector("#lang-toggle").addEventListener("click", () => setLang(getLang() === "en" ? "es" : "en"));
  mount.querySelector("#theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
    renderHeader(page);
  });
  const nav = mount.querySelector("#primary-nav");
  const toggle = mount.querySelector("#menu-toggle");
  toggle.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.innerHTML = icon(open ? "close" : "menu");
  });
  const current = mount.querySelector(".stepper li.current");
  if (current) current.scrollIntoView({ block: "nearest", inline: "center" });
}

// Back and next buttons
function renderStepNav(page) {
  const mount = document.getElementById("step-nav");
  if (!mount) return;
  const index = STEPS.findIndex((step) => step.id === page);
  if (index === -1) return;
  const prev = index === 0 ? { href: "index.html", label: { en: "Home", es: "Inicio" } } : STEPS[index - 1];
  const next = STEPS[index + 1];
  const nextLabel = next
    ? next.id === "results"
      ? t({ en: "See my score", es: "Ver mi puntuación" })
      : t({ en: "Next: {name}", es: "Siguiente: {name}" }, { name: t(next.label) })
    : "";
  mount.innerHTML = `
    <nav class="step-nav" aria-label="${t({ en: "Step navigation", es: "Navegación de pasos" })}">
      <a class="btn btn-ghost" href="${prev.href}">${icon("back")}<span>${t({ en: "Back", es: "Atrás" })}</span></a>
      <span class="count">${t({ en: "Step {n} of {total}", es: "Paso {n} de {total}" }, { n: index + 1, total: STEPS.length })}</span>
      ${next ? `<button class="btn btn-primary" id="next-btn" type="button"${pageReady ? "" : " disabled"}><span>${nextLabel}</span>${icon("arrow")}</button>` : "<span></span>"}
    </nav>
    <p class="step-error" id="step-error" role="alert" hidden></p>`;
  const button = mount.querySelector("#next-btn");
  if (!button) return;
  button.addEventListener("click", () => {
    const error = mount.querySelector("#step-error");
    if (nextGuard) {
      const problem = nextGuard();
      if (problem) {
        error.textContent = problem;
        error.hidden = false;
        return;
      }
    }
    markDone(page);
    window.location.href = next.href;
  });
}

function renderFooter() {
  const mount = document.getElementById("site-footer");
  if (!mount) return;
  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <a class="brand" href="index.html"><img src="img/logo-128.png" alt="" width="38" height="38"><span class="brand-text"><strong>RENO</strong><span>Save Life</span></span></a>
          <p class="footer-note">${t({ en: "Made in the San Francisco Bay Area for the Congressional App Challenge.", es: "Hecho en el Área de la Bahía de San Francisco para el Congressional App Challenge." })}</p>
        </div>
        <div>
          <h4>${t({ en: "Your data", es: "Tus datos" })}</h4>
          <p>${t({ en: "Everything you enter is saved in this browser only. There are no accounts and nothing is sent to us. Prescription photos are read on your device.", es: "Todo lo que escribes se guarda solo en este navegador. No hay cuentas y no se nos envía nada. Las fotos de recetas se leen en tu dispositivo." })}</p>
        </div>
        <div>
          <h4>${t({ en: "Not medical advice", es: "No es consejo médico" })}</h4>
          <p>${t({ en: "RENO is for learning about kidney health. It can't diagnose anything. Please talk to a doctor about your results.", es: "RENO sirve para aprender sobre la salud renal. No puede diagnosticar nada. Habla con un médico sobre tus resultados." })}</p>
        </div>
        <div>
          <h4>${t({ en: "Sources", es: "Fuentes" })}</h4>
          <ul class="sources">
            <li><a href="https://www.cdc.gov/kidney-disease/php/data-research/index.html" target="_blank" rel="noopener">CDC kidney disease data</a></li>
            <li><a href="https://www.cdc.gov/places/" target="_blank" rel="noopener">CDC PLACES</a></li>
            <li><a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener">USDA FoodData Central</a></li>
            <li><a href="https://lhncbc.nlm.nih.gov/RxNav/" target="_blank" rel="noopener">NIH RxNorm</a> &middot; <a href="https://open.fda.gov/" target="_blank" rel="noopener">openFDA</a></li>
            <li><a href="https://www.kidney.org/" target="_blank" rel="noopener">National Kidney Foundation</a></li>
          </ul>
        </div>
      </div>
      <div class="container footer-base"><span>&copy; 2026 RENO Save Life</span><span>${t({ en: "Not a substitute for professional care", es: "No sustituye la atención profesional" })}</span></div>
    </footer>`;
}

// Device storage explainer
export function savedNoteHtml(compact = false) {
  if (compact) {
    return `<div class="saved-note">${icon("device")}<p><strong>${t({ en: "Saved on this device.", es: "Guardado en este dispositivo." })}</strong> ${t({ en: "What you enter here stays in this browser, so it will still be here when you come back. No account needed.", es: "Lo que escribas aquí se queda en este navegador, así que seguirá aquí cuando vuelvas. No necesitas cuenta." })}</p></div>`;
  }
  return `<div class="saved-note">${icon("device")}<p><strong>${t({ en: "RENO remembers your entries on this device.", es: "RENO recuerda tus datos en este dispositivo." })}</strong> ${t({ en: "Your meals, workouts and answers are saved in this browser, even after you close it. Come back on the same phone or computer and everything will be where you left it. Using a private window or clearing your browser data will erase it.", es: "Tus comidas, ejercicios y respuestas se guardan en este navegador, incluso después de cerrarlo. Vuelve desde el mismo teléfono o computadora y todo estará donde lo dejaste. Una ventana privada o borrar los datos del navegador lo elimina." })}</p></div>`;
}

export function renderLayout(page) {
  renderHeader(page);
  renderStepNav(page);
  renderFooter();
  document.querySelectorAll("[data-saved-note]").forEach((mount) => {
    mount.innerHTML = savedNoteHtml(mount.dataset.savedNote === "compact");
  });
  document.addEventListener("langchange", () => {
    renderHeader(page);
    renderStepNav(page);
    renderFooter();
    document.querySelectorAll("[data-saved-note]").forEach((mount) => {
      mount.innerHTML = savedNoteHtml(mount.dataset.savedNote === "compact");
    });
  });
}
