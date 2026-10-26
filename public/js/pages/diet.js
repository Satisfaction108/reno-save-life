import { store, dateKey, lastDays, escapeHtml, icon, formatNumber, emit } from "../storage.js";
import { t, locale } from "../i18n.js";
import { loadProfile, saveProfile, targets, profileLabel, AGE_BANDS, SEX_OPTIONS } from "../profile.js";

const AMOUNTS = [0.5, 1, 1.5, 2, 3];

const NUTRIENTS = {
  sodium: { en: "Sodium", es: "Sodio" },
  phosphorus: { en: "Phosphorus", es: "Fósforo" },
  potassium: { en: "Potassium", es: "Potasio" },
  protein: { en: "Protein", es: "Proteína" }
};

export const MEALS = [
  { id: "breakfast", icon: "sunrise", label: { en: "Breakfast", es: "Desayuno" } },
  { id: "lunch", icon: "sun", label: { en: "Lunch", es: "Almuerzo" } },
  { id: "snack", icon: "coffee", label: { en: "Mid-day snack", es: "Merienda" } },
  { id: "dinner", icon: "moon", label: { en: "Dinner", es: "Cena" } }
];

const RATINGS = {
  good: { label: { en: "Kidney-friendly", es: "Bueno para los riñones" }, cls: "good", icon: "check" },
  moderate: { label: { en: "Fine in moderation", es: "Con moderación" }, cls: "warn", icon: "info" },
  limit: { label: { en: "Try to limit", es: "Mejor limitarlo" }, cls: "bad", icon: "alert" }
};

let flags = [];
let selectedMeal = defaultMeal();
let els = {};

function defaultMeal() {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

function dayKey(day = new Date()) {
  return `diet.${dateKey(day)}`;
}

export function loadDay(day = new Date()) {
  return store.get(dayKey(day), []);
}

function saveDay(items) {
  store.set(dayKey(), items);
}

function wordMatch(text, phrase) {
  const safe = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${safe}`, "i").test(text);
}

export function flagsFor(query) {
  return flags.filter((flag) => flag.match.some((phrase) => wordMatch(query.toLowerCase(), phrase)));
}

// Nutrients times amount eaten
export function eaten(item) {
  const amount = item.servings || 1;
  return Object.fromEntries(Object.entries(item.match.perServing).map(([key, value]) => [key, value * amount]));
}

function servingLabel(label) {
  return label.length > 24 ? label.replace(/\s*\(.*?\)/g, "") : label;
}

function amountText(amount) {
  return { 0.5: "½", 1.5: "1½" }[amount] || String(amount);
}

// Rate food against your targets
function analyze(item, goal) {
  const values = eaten(item);
  const levels = {};
  const notes = [];
  let points = 0;
  const sodiumPct = Math.round((values.sodium / goal.sodium) * 100);
  const proteinPct = Math.round((values.protein / goal.protein) * 100);

  levels.sodium = sodiumPct >= 20 ? "high" : sodiumPct >= 6 ? "mid" : "low";
  levels.phosphorus = values.phosphorus >= 250 ? "high" : values.phosphorus >= 100 ? "mid" : "low";
  levels.potassium = values.potassium >= 400 ? "high" : values.potassium >= 200 ? "mid" : "low";
  levels.protein = proteinPct >= 50 ? "high" : proteinPct >= 25 ? "mid" : "low";

  points += levels.sodium === "high" ? (sodiumPct >= 40 ? 3 : 2) : levels.sodium === "mid" ? 1 : 0;
  // Natural phosphorus in protein foods
  const phosphorusWeight = values.protein >= 20 ? 0.5 : 1;
  points += (levels.phosphorus === "high" ? 1 : levels.phosphorus === "mid" ? 0.5 : 0) * phosphorusWeight;
  points += levels.potassium === "high" ? 0.5 : 0;
  points += proteinPct >= 80 ? 1 : levels.protein === "high" ? 0.5 : 0;

  if (levels.sodium === "high") {
    notes.push({ type: "flag", text: t({ en: "{mg} mg of sodium. That's {pct}% of the {limit} mg daily limit for your age.", es: "{mg} mg de sodio. Es el {pct}% del límite diario de {limit} mg para tu edad." }, { mg: formatNumber(values.sodium), pct: sodiumPct, limit: formatNumber(goal.sodium) }) });
  } else if (levels.sodium === "mid") {
    notes.push({ type: "info", text: t({ en: "{mg} mg of sodium, about {pct}% of your daily limit.", es: "{mg} mg de sodio, cerca del {pct}% de tu límite diario." }, { mg: formatNumber(values.sodium), pct: sodiumPct }) });
  }
  if (levels.protein !== "low") {
    notes.push({ type: proteinPct >= 80 ? "flag" : "info", text: t({ en: "{g} g of protein, which is {pct}% of the {need} g you need in a day.", es: "{g} g de proteína, el {pct}% de los {need} g que necesitas al día." }, { g: formatNumber(values.protein, 1), pct: proteinPct, need: goal.protein }) });
  }
  if (levels.phosphorus === "high") {
    notes.push({ type: "info", text: t({ en: "{mg} mg of phosphorus. Fine for healthy kidneys, but worth watching if your kidney function is low.", es: "{mg} mg de fósforo. Está bien con riñones sanos, pero conviene vigilarlo si tu función renal es baja." }, { mg: formatNumber(values.phosphorus) }) });
  }
  if (levels.potassium === "high") {
    notes.push({ type: "info", text: t({ en: "{mg} mg of potassium. Healthy for most people, but can be too much with advanced CKD.", es: "{mg} mg de potasio. Sano para la mayoría, pero puede ser demasiado con ERC avanzada." }, { mg: formatNumber(values.potassium) }) });
  }
  // Whole fruit sugar is fine
  const wholeFruit = /\b(apples?|bananas?|oranges?|grapes?|berr(y|ies)|mangos?|pears?|peach(es)?|melons?|pineapple|cherr(y|ies)|plums?|kiwi|papaya|fruit)\b/i.test(`${item.query} ${item.match.description}`) && !/juice|syrup|dried|smoothie|candied|pie|cake/i.test(item.match.description);
  if (values.sugar >= 20 && !wholeFruit) {
    points += 1;
    notes.push({ type: "flag", text: t({ en: "{g} g of sugar.", es: "{g} g de azúcar." }, { g: formatNumber(values.sugar) }) });
  }
  const seen = new Set();
  for (const flag of flagsFor(item.query)) {
    if (seen.has(flag.type)) continue;
    seen.add(flag.type);
    points += flag.points;
    notes.unshift({ type: flag.type, text: t(flag.note) });
  }
  if (!notes.length) notes.push({ type: "good", text: goodNote(values, goal) });
  const rating = points >= 4 ? "limit" : points >= 1 ? "moderate" : "good";
  return { levels, notes: notes.slice(0, 3), rating, values };
}

function goodNote(values, goal) {
  if (values.sodium < 20 && values.phosphorus < 40) return t({ en: "Almost no sodium and very little phosphorus.", es: "Casi nada de sodio y muy poco fósforo." });
  if (values.sodium < 20) return t({ en: "Practically no sodium ({mg} mg).", es: "Prácticamente sin sodio ({mg} mg)." }, { mg: formatNumber(values.sodium) });
  return t({ en: "{mg} mg of sodium, only {pct}% of your daily limit.", es: "{mg} mg de sodio, solo el {pct}% de tu límite diario." }, { mg: formatNumber(values.sodium), pct: Math.max(1, Math.round((values.sodium / goal.sodium) * 100)) });
}

function parseFoods(text) {
  return [...new Set(text.split(/,|\n|;|\band\b|\by\b/i).map((s) => s.trim().replace(/\s+/g, " ")).filter((s) => s.length > 1).map((s) => s.slice(0, 60)))].slice(0, 12);
}

function foodHtml(item, index, goal) {
  const remove = `<button type="button" class="icon-only" data-remove="${index}" aria-label="${t({ en: "Remove", es: "Quitar" })} ${escapeHtml(item.query)}">${icon("trash")}</button>`;
  if (!item.match) {
    return `<li class="food-item"><div class="food-top"><div><div class="food-name">${escapeHtml(item.query)}</div>
      <p class="food-error">${t({ en: "Couldn't find this in the USDA database. Try a more specific name, like \"white rice\".", es: "No lo encontramos en la base del USDA. Prueba un nombre más específico, como \"arroz blanco\"." })}</p></div>${remove}</div></li>`;
  }
  const analysis = analyze(item, goal);
  const rating = RATINGS[analysis.rating];
  const amount = item.servings || 1;
  const serving = servingLabel(item.match.serving.label);
  return `<li class="food-item${item.fresh ? " fresh" : ""}">
    <div class="food-top">
      <div>
        <div class="food-name">${escapeHtml(item.query)}</div>
        <div class="food-match">${escapeHtml(item.match.description)}</div>
      </div>
      <div class="food-actions"><span class="tag ${rating.cls}">${icon(rating.icon)}${t(rating.label)}</span>${remove}</div>
    </div>
    <div class="amount-row">
      <span class="amount-label">${t({ en: "How much did you have?", es: "¿Cuánto comiste?" })}</span>
      <div class="amount-pick" role="group" aria-label="${t({ en: "Servings", es: "Porciones" })}">
        ${AMOUNTS.map((value) => `<button type="button" data-amount="${value}" data-index="${index}" aria-pressed="${value === amount}">${amountText(value)}</button>`).join("")}
      </div>
      <span class="amount-unit">× ${escapeHtml(serving)}</span>
    </div>
    <div class="food-nutrients">
      ${Object.keys(NUTRIENTS).map((key) => {
        const unit = key === "protein" ? "g" : "mg";
        const level = analysis.levels[key];
        const strong = key === "sodium";
        const cls = level === "high" ? (strong ? "high" : "mid") : level === "mid" && strong ? "mid" : "";
        return `<div class="fn ${cls}"><span>${t(NUTRIENTS[key])}</span><strong>${formatNumber(analysis.values[key], unit === "g" ? 1 : 0)} ${unit}</strong></div>`;
      }).join("")}
    </div>
    <ul class="food-notes">${analysis.notes.map((note) => `<li class="${note.type}">${icon(note.type === "good" ? "check" : note.type === "flag" ? "alert" : "info")}<span>${escapeHtml(note.text)}</span></li>`).join("")}</ul>
  </li>`;
}

export function totalsOf(items) {
  return items.reduce((sum, item) => {
    if (!item.match) return sum;
    const values = eaten(item);
    for (const key of Object.keys(sum)) sum[key] += values[key] || 0;
    return sum;
  }, { sodium: 0, phosphorus: 0, potassium: 0, protein: 0, sugar: 0 });
}

// Ask age and sex once
function renderProfile() {
  const profile = loadProfile();
  if (profile.age && profile.sex && !els.profile.dataset.editing) {
    els.profile.innerHTML = `<div class="profile-line">${icon("target")}<span>${t({ en: "Daily targets set for {who}.", es: "Metas diarias para {who}." }, { who: escapeHtml(profileLabel(profile)) })}</span><button type="button" class="link-btn" id="profile-edit">${t({ en: "Change", es: "Cambiar" })}</button></div>`;
    els.profile.querySelector("#profile-edit").addEventListener("click", () => {
      els.profile.dataset.editing = "1";
      renderProfile();
    });
    return;
  }
  els.profile.innerHTML = `
    <h3>${t({ en: "First, a little about you", es: "Primero, algo sobre ti" })}</h3>
    <p class="fine" style="margin:4px 0 14px">${t({ en: "How much sodium, protein and other nutrients you need depends on your age and sex. We use this to judge your meals.", es: "Cuánto sodio, proteína y otros nutrientes necesitas depende de tu edad y sexo. Lo usamos para evaluar tus comidas." })}</p>
    <span class="field-label">${t({ en: "Age range", es: "Rango de edad" })}</span>
    <div class="seg" style="margin-bottom:14px">${AGE_BANDS.map((b) => `<label><input type="radio" name="p-age" value="${b.value}" ${profile.age === b.value ? "checked" : ""}><span>${t(b.label)}</span></label>`).join("")}</div>
    <span class="field-label">${t({ en: "Sex", es: "Sexo" })}</span>
    <div class="seg">${SEX_OPTIONS.map((o) => `<label><input type="radio" name="p-sex" value="${o.value}" ${profile.sex === o.value ? "checked" : ""}><span>${t(o.label)}</span></label>`).join("")}</div>
    <p class="fine">${t({ en: "\"Prefer not to say\" uses the average of the female and male targets.", es: "\"Prefiero no decir\" usa el promedio de las metas femeninas y masculinas." })}</p>`;
  els.profile.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const changes = input.name === "p-age" ? { age: input.value } : { sex: input.value };
      const next = saveProfile(changes);
      if (next.age && next.sex) {
        delete els.profile.dataset.editing;
        renderProfile();
      }
      renderAll(false);
      emit("profile");
    });
  });
}

function renderResults() {
  const items = loadDay();
  const goal = targets();
  if (!items.length) {
    els.results.innerHTML = `<div class="empty-state">${icon("plate")}<p>${t({ en: "Nothing logged yet today. Pick a meal on the left and type what you had.", es: "Todavía no hay nada hoy. Elige una comida a la izquierda y escribe lo que comiste." })}</p></div>`;
    return;
  }
  const groups = MEALS.map((meal) => ({ meal, entries: items.map((item, index) => ({ item, index })).filter(({ item }) => (item.meal || "lunch") === meal.id) })).filter((g) => g.entries.length);
  els.results.innerHTML = `
    <div class="card-head"><h3>${t({ en: "Today", es: "Hoy" })} &middot; ${new Date().toLocaleDateString(locale(), { weekday: "long", month: "short", day: "numeric" })}</h3><span class="tag">${items.length} ${t({ en: "foods", es: "alimentos" })}</span></div>
    ${groups.map(({ meal, entries }) => `<section class="meal-group">
      <div class="meal-head"><h3>${icon(meal.icon)}${t(meal.label)}</h3><span>${formatNumber(totalsOf(entries.map((e) => e.item)).sodium)} mg ${t({ en: "sodium", es: "sodio" })}</span></div>
      <ul class="food-list">${entries.map(({ item, index }) => foodHtml(item, index, goal)).join("")}</ul>
    </section>`).join("")}`;
  els.results.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = loadDay();
      next.splice(Number(button.dataset.remove), 1);
      saveDay(next);
      renderAll();
      emit("diet");
    });
  });
  els.results.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = loadDay();
      const item = next[Number(button.dataset.index)];
      if (!item) return;
      item.servings = Number(button.dataset.amount);
      delete item.fresh;
      saveDay(next);
      renderAll();
      emit("diet");
    });
  });
}

function renderTotals() {
  const items = loadDay();
  const totals = totalsOf(items);
  const goal = targets();
  const over = totals.sodium > goal.sodium;
  const rows = [
    { key: "sodium", cls: "bar-na", unit: "mg", ref: goal.sodium, refLabel: t({ en: "of your limit", es: "de tu límite" }) },
    { key: "protein", cls: "bar-pr", unit: "g", ref: goal.protein, refLabel: t({ en: "of what you need", es: "de lo que necesitas" }) },
    { key: "potassium", cls: "bar-k", unit: "mg", ref: goal.potassium, refLabel: t({ en: "of what you need", es: "de lo que necesitas" }) },
    { key: "phosphorus", cls: "bar-ph", unit: "mg", ref: goal.phosphorus, refLabel: t({ en: "of what you need", es: "de lo que necesitas" }) }
  ];
  const perMeal = MEALS.map((meal) => ({ meal, sodium: totalsOf(items.filter((i) => (i.meal || "lunch") === meal.id)).sodium }));
  const who = profileLabel();
  els.totals.innerHTML = `
    <div class="card-head"><h3>${t({ en: "Today's totals", es: "Totales de hoy" })}</h3>
      ${items.length ? `<span class="tag ${over ? "bad" : "good"}">${icon(over ? "alert" : "check")}${over ? t({ en: "Over sodium limit", es: "Sobre el límite de sodio" }) : t({ en: "Sodium on track", es: "Sodio bien" })}</span>` : ""}
    </div>
    <div class="totals-grid">
      ${rows.map((row) => {
        const pct = Math.round((totals[row.key] / row.ref) * 100);
        const over100 = row.key === "protein" && pct > 200;
        return `<div class="total-row">
          <div class="row-head"><span><strong>${t(NUTRIENTS[row.key])}</strong> &middot; ${formatNumber(totals[row.key], row.unit === "g" ? 1 : 0)} / ${formatNumber(row.ref)} ${row.unit}</span><span>${pct}% ${row.refLabel}</span></div>
          <div class="meter"><div class="${row.cls}${over100 ? " over" : ""}" style="width:${Math.min(pct, 100)}%"></div></div>
        </div>`;
      }).join("")}
    </div>
    <div class="meal-split">${perMeal.map(({ meal, sodium }) => `<div>${t(meal.label)}<strong>${formatNumber(sodium)} mg</strong></div>`).join("")}</div>
    <p class="fine">${who ? t({ en: "Targets for {who}. Sodium is a limit to stay under. The others are amounts your body needs.", es: "Metas para {who}. El sodio es un límite que no debes pasar. Los demás son cantidades que tu cuerpo necesita." }, { who: escapeHtml(who) }) : t({ en: "Using adult targets until you choose your age range above.", es: "Usamos metas de adulto hasta que elijas tu rango de edad arriba." })}</p>`;
}

function renderChart() {
  const days = lastDays(7);
  const today = dateKey();
  const limit = targets().sodium;
  const values = days.map((day) => {
    const items = loadDay(day);
    return { day, key: dateKey(day), sodium: totalsOf(items).sodium, empty: !items.length };
  });
  const max = Math.max(limit * 1.3, ...values.map((v) => v.sodium)) * 1.15;
  els.chart.innerHTML = `
    <div class="plot">
      ${values.map((v) => `<div class="col${v.key === today ? " today" : ""}${v.empty ? " empty" : ""}"><span class="col-val">${v.empty ? "" : formatNumber(v.sodium)}</span><div class="col-bar" style="height:${v.empty ? 2 : Math.max(2, (v.sodium / max) * 100)}%"></div></div>`).join("")}
      <div class="limit-line" style="bottom:${(limit / max) * 100}%"><span>${formatNumber(limit)} mg</span></div>
    </div>
    <div class="axis">${values.map((v) => `<span class="${v.key === today ? "today" : ""}">${v.day.toLocaleDateString(locale(), { weekday: "short" })}</span>`).join("")}</div>`;
}

function renderComeback() {
  const items = loadDay();
  const logged = lastDays(7).filter((day) => loadDay(day).length).length;
  els.comeback.hidden = !items.length;
  if (!items.length) return;
  els.comeback.innerHTML = `${icon("calendar")}<div>
    <strong>${t({ en: "Today is saved. Come back tomorrow.", es: "Hoy quedó guardado. Vuelve mañana." })}</strong>
    <p>${t({ en: "You've logged {n} of the last 7 days. Add tomorrow's meals the same way. Each day you add makes your score more accurate.", es: "Registraste {n} de los últimos 7 días. Agrega las comidas de mañana igual. Cada día que sumas hace tu puntuación más precisa." }, { n: logged })}</p>
  </div>`;
}

function renderMealPick() {
  els.mealPick.innerHTML = MEALS.map((meal) => `<label><input type="radio" name="meal" value="${meal.id}" ${meal.id === selectedMeal ? "checked" : ""}><span>${icon(meal.icon)}${t(meal.label)}</span></label>`).join("");
  els.mealPick.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
    selectedMeal = input.value;
  }));
}

function renderAll(withProfile = true) {
  if (withProfile) renderProfile();
  renderResults();
  renderTotals();
  renderChart();
  renderComeback();
}

async function lookup(query) {
  const response = await fetch(`/api/food?q=${encodeURIComponent(query)}`);
  if (response.status === 429) throw new Error("rate");
  if (!response.ok) throw new Error("failed");
  return response.json();
}

async function handleSubmit(event) {
  event.preventDefault();
  const foods = parseFoods(els.input.value);
  if (!foods.length) return;
  const button = els.form.querySelector("button[type=submit]");
  button.disabled = true;
  els.results.innerHTML = `<div class="loader"><span class="spinner"></span>${t({ en: "Looking up {n} foods...", es: "Buscando {n} alimentos..." }, { n: foods.length })}</div>`;
  const results = await Promise.allSettled(foods.map(lookup));
  const items = loadDay().map((item) => ({ ...item, fresh: false }));
  const failed = [];
  let rateLimited = false;
  results.forEach((result, index) => {
    if (result.status === "fulfilled") items.push({ query: foods[index], match: result.value.match, meal: selectedMeal, servings: 1, fresh: true, at: Date.now() });
    else {
      failed.push(foods[index]);
      if (result.reason?.message === "rate") rateLimited = true;
    }
  });
  saveDay(items);
  button.disabled = false;
  els.input.value = failed.join(", ");
  renderAll(false);
  emit("diet");
  const firstFresh = els.results.querySelector(".food-item.fresh");
  if (firstFresh) firstFresh.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (failed.length) {
    const warning = document.createElement("p");
    warning.className = "food-error";
    warning.style.marginTop = "12px";
    warning.textContent = rateLimited
      ? t({ en: "The food database is busy right now. Wait a bit and press Add again.", es: "La base de datos de alimentos está ocupada. Espera un poco y vuelve a pulsar Agregar." })
      : t({ en: "Couldn't look up {n} of these right now. Press Add to try again.", es: "No se pudieron buscar {n} ahora. Pulsa Agregar para intentarlo de nuevo." }, { n: failed.length });
    els.results.appendChild(warning);
  }
}

export async function loadFlags() {
  if (flags.length) return flags;
  try {
    flags = await (await fetch("data/food-flags.json")).json();
  } catch {
    flags = [];
  }
  return flags;
}

// Week summary for scoring
export function getDietSummary() {
  const logged = lastDays(7).map((day) => loadDay(day)).filter((items) => items.length);
  const allItems = logged.flat().filter((item) => item.match);
  const sodiumDays = logged.map((items) => totalsOf(items).sodium);
  const flagCounts = {};
  for (const item of allItems) {
    for (const flag of flagsFor(item.query)) {
      if (flag.type === "flag") flagCounts[flag.id] = (flagCounts[flag.id] || 0) + 1;
    }
  }
  const limit = targets().sodium;
  return {
    daysLogged: logged.length,
    avgSodium: sodiumDays.length ? sodiumDays.reduce((a, b) => a + b, 0) / sodiumDays.length : 0,
    sodiumLimit: limit,
    flagCounts,
    flaggedTotal: Object.values(flagCounts).reduce((a, b) => a + b, 0),
    highSodiumFoods: [...new Set(allItems.filter((item) => eaten(item).sodium >= limit * 0.2).map((item) => item.query))],
    today: totalsOf(loadDay())
  };
}

export async function init() {
  els = {
    form: document.getElementById("diet-form"),
    input: document.getElementById("diet-text"),
    mealPick: document.getElementById("meal-pick"),
    profile: document.getElementById("diet-profile"),
    results: document.getElementById("diet-results"),
    totals: document.getElementById("diet-totals"),
    chart: document.getElementById("diet-chart"),
    comeback: document.getElementById("diet-comeback")
  };
  await loadFlags();
  renderMealPick();
  els.form.addEventListener("submit", handleSubmit);
  document.getElementById("diet-example").addEventListener("click", () => {
    els.input.value = "bread, pasta, coke";
    els.input.focus();
  });
  document.getElementById("diet-clear").addEventListener("click", () => {
    store.remove(dayKey());
    renderAll(false);
    emit("diet");
  });
  renderAll();
  document.addEventListener("langchange", () => {
    renderMealPick();
    renderAll();
  });
}
