import { store, escapeHtml } from "../storage.js";
import { t } from "../i18n.js";
import { setNextGuard } from "../layout.js";
import { AGE_BANDS, SEX_OPTIONS, loadProfile, saveProfile } from "../profile.js";

const YES_NO = [
  { value: "yes", label: { en: "Yes", es: "Sí" } },
  { value: "no", label: { en: "No", es: "No" } },
  { value: "unsure", label: { en: "Not sure", es: "No sé" } }
];

// About you and conditions
export const BACKGROUND = [
  {
    id: "age",
    required: true,
    text: { en: "Age range", es: "Rango de edad" },
    options: AGE_BANDS
  },
  {
    id: "sex",
    required: true,
    text: { en: "Sex", es: "Sexo" },
    help: { en: "Used for the SCORED questionnaire and your daily nutrient targets.", es: "Se usa para el cuestionario SCORED y tus metas diarias de nutrientes." },
    options: SEX_OPTIONS
  },
  { id: "family", text: { en: "Does anyone in your family have kidney disease or kidney failure?", es: "¿Alguien en tu familia tiene enfermedad o insuficiencia renal?" }, options: YES_NO }
];

export const CONDITIONS = [
  { id: "bp", text: { en: "Have you been told you have high blood pressure?", es: "¿Te han dicho que tienes presión alta?" }, options: YES_NO },
  { id: "diabetes", text: { en: "Do you have diabetes?", es: "¿Tienes diabetes?" }, options: YES_NO },
  { id: "anemia", text: { en: "Have you ever had anemia (low red blood cells)?", es: "¿Has tenido anemia (pocos glóbulos rojos)?" }, options: YES_NO },
  { id: "cvd", text: { en: "Have you had a heart attack or stroke?", es: "¿Has tenido un ataque al corazón o derrame cerebral?" }, options: YES_NO },
  { id: "chf", text: { en: "Have you been told you have heart failure?", es: "¿Te han dicho que tienes insuficiencia cardíaca?" }, options: YES_NO },
  { id: "pvd", text: { en: "Do you have poor circulation in your legs?", es: "¿Tienes mala circulación en las piernas?" }, options: YES_NO },
  { id: "protein", text: { en: "Has a test ever found protein in your urine?", es: "¿Alguna prueba encontró proteína en tu orina?" }, options: YES_NO }
];

// Symptoms in last month
export const SYMPTOMS = [
  { id: "swelling", weight: 4, text: { en: "Swelling in feet, ankles or around the eyes", es: "Hinchazón en pies, tobillos o alrededor de los ojos" } },
  { id: "foamy", weight: 4, text: { en: "Foamy or bubbly urine", es: "Orina con espuma" } },
  { id: "blood", weight: 4, text: { en: "Blood in urine, or very dark urine", es: "Sangre en la orina, u orina muy oscura" } },
  { id: "night", weight: 3, text: { en: "Getting up to pee more at night", es: "Levantarte más a orinar por la noche" } },
  { id: "less", weight: 3, text: { en: "Peeing much less than usual", es: "Orinar mucho menos de lo normal" } },
  { id: "tired", weight: 2, text: { en: "Tired or weak most days", es: "Cansancio o debilidad casi todos los días" } },
  { id: "itchy", weight: 2, text: { en: "Itchy skin that won't go away", es: "Picazón en la piel que no se quita" } },
  { id: "appetite", weight: 2, text: { en: "Poor appetite or feeling sick to your stomach", es: "Poco apetito o náuseas" } },
  { id: "cramps", weight: 2, text: { en: "Muscle cramps, especially at night", es: "Calambres musculares, sobre todo de noche" } }
];

export const HABITS = [
  { id: "smoking", text: { en: "Do you smoke or vape?", es: "¿Fumas o vapeas?" }, options: [
    { value: "never", label: { en: "Never", es: "Nunca" } }, { value: "former", label: { en: "I quit", es: "Lo dejé" } }, { value: "current", label: { en: "Yes", es: "Sí" } }] },
  { id: "alcohol", text: { en: "Alcoholic drinks in a typical week", es: "Bebidas alcohólicas en una semana normal" }, options: [
    { value: "0", label: { en: "None", es: "Ninguna" } }, { value: "1-7", label: { en: "1–7", es: "1–7" } }, { value: "8-14", label: { en: "8–14", es: "8–14" } }, { value: "15+", label: { en: "15+", es: "15+" } }] },
  { id: "water", text: { en: "Glasses of water a day", es: "Vasos de agua al día" }, options: [
    { value: "low", label: { en: "Fewer than 4", es: "Menos de 4" } }, { value: "mid", label: { en: "4–7", es: "4–7" } }, { value: "high", label: { en: "8 or more", es: "8 o más" } }] },
  { id: "sleep", text: { en: "Hours of sleep on most nights", es: "Horas de sueño casi todas las noches" }, options: [
    { value: "low", label: { en: "Under 6", es: "Menos de 6" } }, { value: "mid", label: { en: "6–7", es: "6–7" } }, { value: "good", label: { en: "7–9", es: "7–9" } }, { value: "high", label: { en: "More than 9", es: "Más de 9" } }] },
  { id: "sitting", text: { en: "Hours spent sitting each day", es: "Horas sentado/a al día" }, options: [
    { value: "low", label: { en: "Under 6", es: "Menos de 6" } }, { value: "mid", label: { en: "6–9", es: "6–9" } }, { value: "high", label: { en: "10 or more", es: "10 o más" } }] },
  { id: "salt", text: { en: "Do you add salt or salty sauces to your food?", es: "¿Agregas sal o salsas saladas a la comida?" }, options: [
    { value: "rarely", label: { en: "Rarely", es: "Casi nunca" } }, { value: "sometimes", label: { en: "Sometimes", es: "A veces" } }, { value: "often", label: { en: "Often", es: "Seguido" } }] },
  { id: "fastfood", text: { en: "How often do you eat fast food or packaged meals?", es: "¿Cada cuánto comes comida rápida o empaquetada?" }, options: [
    { value: "rarely", label: { en: "Rarely", es: "Casi nunca" } }, { value: "weekly", label: { en: "A few times a week", es: "Algunas veces por semana" } }, { value: "daily", label: { en: "Every day", es: "Todos los días" } }] },
  { id: "painkillers", text: { en: "How often do you take painkillers like Advil, Motrin or Aleve?", es: "¿Cada cuánto tomas analgésicos como Advil, Motrin o Aleve?" }, options: [
    { value: "rarely", label: { en: "Rarely", es: "Casi nunca" } }, { value: "weekly", label: { en: "Every week", es: "Cada semana" } }, { value: "daily", label: { en: "Most days", es: "Casi a diario" } }] },
  { id: "checkup", text: { en: "When was your last check-up with a doctor?", es: "¿Cuándo fue tu última revisión médica?" }, options: [
    { value: "year", label: { en: "In the last year", es: "En el último año" } }, { value: "two", label: { en: "1–2 years ago", es: "Hace 1–2 años" } }, { value: "longer", label: { en: "Longer ago or never", es: "Hace más o nunca" } }] }
];

let form;
let missing = [];

// Health answers plus shared profile
export function loadHealth() {
  const saved = store.get("health", { answers: {}, symptoms: [] });
  const profile = loadProfile();
  return { ...saved, answers: { ...saved.answers, age: profile.age || saved.answers.age, sex: profile.sex || saved.answers.sex } };
}

function save() {
  const answers = {};
  for (const q of [...BACKGROUND, ...CONDITIONS, ...HABITS]) {
    const checked = form.querySelector(`input[name="${q.id}"]:checked`);
    if (checked) answers[q.id] = checked.value;
  }
  const symptoms = [...form.querySelectorAll('input[name="symptom"]:checked')].map((input) => input.value);
  store.set("health", { answers, symptoms });
  if (answers.age || answers.sex) saveProfile({ ...(answers.age && { age: answers.age }), ...(answers.sex && { sex: answers.sex }) });
  // Clear answered warnings
  missing = missing.filter((id) => !answers[id]);
  form.querySelectorAll(".q-row.missing").forEach((row) => {
    if (answers[row.id.slice(2)]) row.classList.remove("missing");
  });
}

function rowHtml(q, answers) {
  return `<div class="q-row${missing.includes(q.id) ? " missing" : ""}" id="q-${q.id}">
    <div><div class="q-text">${escapeHtml(t(q.text))}</div>${q.help ? `<div class="q-help">${escapeHtml(t(q.help))}</div>` : ""}</div>
    <div class="seg" role="radiogroup" aria-label="${escapeHtml(t(q.text))}">
      ${q.options.map((o) => `<label><input type="radio" name="${q.id}" value="${o.value}" ${answers[q.id] === o.value ? "checked" : ""}><span>${escapeHtml(t(o.label))}</span></label>`).join("")}
    </div>
  </div>`;
}

function sectionHtml(title, lede, questions, answers) {
  return `<section class="card q-section">
    <div class="card-head"><h3>${t(title)}</h3></div>
    ${lede ? `<p>${t(lede)}</p>` : ""}
    <div class="q-list">${questions.map((q) => rowHtml(q, answers)).join("")}</div>
  </section>`;
}

function render() {
  const { answers, symptoms } = loadHealth();
  form.innerHTML = `
    ${sectionHtml({ en: "About you", es: "Sobre ti" }, null, BACKGROUND, answers)}
    ${sectionHtml({ en: "Health conditions", es: "Condiciones de salud" }, { en: "These come from SCORED, a screening questionnaire built from US health survey data.", es: "Vienen de SCORED, un cuestionario de detección creado con datos de encuestas de salud de EE. UU." }, CONDITIONS, answers)}
    <section class="card q-section">
      <div class="card-head"><h3>${t({ en: "Symptoms in the last month", es: "Síntomas en el último mes" })}</h3></div>
      <p>${t({ en: "Kidney disease often has no symptoms early on, so not having any of these doesn't rule it out. Tick any you've noticed.", es: "La enfermedad renal muchas veces no da síntomas al principio, así que no tener ninguno no la descarta. Marca los que hayas notado." })}</p>
      <div class="symptom-grid">
        ${SYMPTOMS.map((s) => `<label class="check-card"><input type="checkbox" name="symptom" value="${s.id}" ${symptoms.includes(s.id) ? "checked" : ""}><span>${escapeHtml(t(s.text))}</span></label>`).join("")}
      </div>
    </section>
    ${sectionHtml({ en: "Daily habits", es: "Hábitos diarios" }, null, HABITS, answers)}`;
}

export function init() {
  form = document.getElementById("health-form");
  render();
  form.addEventListener("change", save);
  setNextGuard(() => {
    save();
    const { answers } = loadHealth();
    missing = BACKGROUND.filter((q) => q.required && !answers[q.id]).map((q) => q.id);
    if (!missing.length) return null;
    render();
    document.getElementById(`q-${missing[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return t({ en: "Please answer your age and sex so we can work out your score.", es: "Responde tu edad y sexo para poder calcular tu puntuación." });
  });
  document.addEventListener("langchange", render);
}

