import { store, icon, clearAll } from "../storage.js";
import { t } from "../i18n.js";
import { STEPS } from "../layout.js";

// CDC PLACES 2023, self-reported
const COUNTIES = [
  ["Napa", 3.2],
  ["Marin", 3.2],
  ["Sonoma", 3.2],
  ["Solano", 3.1],
  ["Contra Costa", 2.9],
  ["Alameda", 2.7],
  ["San Mateo", 2.7],
  ["San Francisco", 2.6],
  ["Santa Clara", 2.5]
];
const US_ESTIMATED = 14;

function renderGap() {
  const figure = document.getElementById("gap-figure");
  const rows = COUNTIES.map(
    ([name, value]) => `<div class="gap-row"><span class="label">${name}</span><div class="track"><div class="bar" style="width:${(value / US_ESTIMATED) * 100}%"></div></div><span class="val">${value}%</span></div>`
  ).join("");
  figure.innerHTML = `${rows}
    <div class="gap-row us" style="margin-top:12px"><span class="label">${t({ en: "US, actual", es: "EE. UU., real" })}</span><div class="track"><div class="bar" style="width:100%"></div></div><span class="val">~${US_ESTIMATED}%</span></div>
    <div class="gap-legend">
      <span><i></i>${t({ en: "Told by a doctor they have it", es: "Con diagnóstico médico" })}</span>
      <span><i class="us"></i>${t({ en: "Estimated to actually have it", es: "Que realmente la tienen (estimado)" })}</span>
    </div>`;
}

// Resume button for returning visitors
function renderActions() {
  const mount = document.getElementById("home-actions");
  const progress = store.get("progress", {});
  const hasScore = Boolean(store.get("lastScore"));
  const nextStep = STEPS.find((step) => !progress[step.id] && step.id !== "results");
  const started = Object.keys(progress).length > 0;
  if (!started && !hasScore) return;
  const resumeHref = nextStep ? nextStep.href : "diet.html";
  mount.innerHTML = `
    ${hasScore ? `<a class="btn btn-primary btn-large" href="results.html"><span>${t({ en: "See my score and plan", es: "Ver mi puntuación y plan" })}</span>${icon("arrow")}</a>` : ""}
    <a class="btn ${hasScore ? "btn-ghost" : "btn-primary"} btn-large" href="${hasScore ? "diet.html" : resumeHref}"><span>${hasScore ? t({ en: "Log today's meals", es: "Registrar las comidas de hoy" }) : t({ en: "Continue my check-up", es: "Continuar mi chequeo" })}</span>${hasScore ? "" : icon("arrow")}</a>`;
}

export function init() {
  renderGap();
  renderActions();
  document.getElementById("erase-data").addEventListener("click", () => {
    const sure = window.confirm(t({ en: "Erase all meals, workouts, medicines and answers saved on this device?", es: "¿Borrar todas las comidas, ejercicios, medicamentos y respuestas guardadas en este dispositivo?" }));
    if (!sure) return;
    clearAll();
    window.location.reload();
  });
  document.addEventListener("langchange", () => {
    renderGap();
    renderActions();
  });
}
