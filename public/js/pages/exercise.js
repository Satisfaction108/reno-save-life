import { store, dateKey, weekDays, lastDays, escapeHtml, icon, emit } from "../storage.js";
import { t, getLang, locale } from "../i18n.js";
import { loadProfile, targets, isYouth } from "../profile.js";

const VIGOROUS_MET = 6;
const CONTACT = ["basketball", "soccer", "martial", "boxing"];

// What each type does
const GROUP_INFO = {
  everyday: {
    label: { en: "Everyday movement", es: "Movimiento diario" },
    kidney: { en: "Breaks up sitting time. Moving after meals helps keep blood sugar from spiking, which protects the small blood vessels in your kidneys.", es: "Interrumpe el tiempo sentado. Moverte después de comer evita picos de azúcar, lo que protege los vasos pequeños de los riñones." },
    improve: { en: "Make it brisk. Go fast enough that talking takes a little effort, and it starts counting as real exercise.", es: "Hazlo a paso rápido. Ve lo bastante rápido como para que hablar cueste un poco y empieza a contar como ejercicio." }
  },
  cardio: {
    label: { en: "Cardio", es: "Cardio" },
    kidney: { en: "Lowers blood pressure, the second biggest cause of kidney failure, and improves blood flow to the kidneys.", es: "Baja la presión arterial, la segunda causa de insuficiencia renal, y mejora el flujo de sangre a los riñones." },
    improve: { en: "Add about 5 minutes a week, or mix in short faster stretches of 1 minute.", es: "Agrega unos 5 minutos por semana, o mezcla tramos rápidos de 1 minuto." }
  },
  strength: {
    label: { en: "Strength", es: "Fuerza" },
    kidney: { en: "Muscle soaks up blood sugar, which lowers diabetes risk, the top cause of kidney failure. Keeping muscle also matters later in life.", es: "El músculo absorbe el azúcar de la sangre, lo que baja el riesgo de diabetes, la principal causa de insuficiencia renal." },
    improve: { en: "Add a set, a few reps or a little weight every 1 to 2 weeks. Aim for 2 days a week.", es: "Agrega una serie, algunas repeticiones o un poco de peso cada 1 a 2 semanas. Busca 2 días por semana." }
  },
  flex: {
    label: { en: "Flexibility and balance", es: "Flexibilidad y equilibrio" },
    kidney: { en: "Lowers stress hormones that push blood pressure up, and keeps you flexible enough to stay active.", es: "Baja las hormonas del estrés que suben la presión y te mantiene flexible para seguir activo." },
    improve: { en: "Do it on the same days as cardio, or hold each stretch for about 30 seconds.", es: "Hazlo los mismos días que el cardio, o sostén cada estiramiento unos 30 segundos." }
  },
  sport: {
    label: { en: "Sport", es: "Deporte" },
    kidney: { en: "Mixes hard bursts with recovery, which trains your heart and lowers blood pressure.", es: "Combina esfuerzos fuertes con descanso, lo que entrena el corazón y baja la presión." },
    improve: { en: "Warm up for 5 minutes first, and try adding one more session a week.", es: "Calienta 5 minutos antes e intenta agregar una sesión más por semana." }
  }
};

let activities = [];
let els = {};

export async function loadActivities() {
  if (activities.length) return activities;
  try {
    activities = await (await fetch("data/exercises.json")).json();
  } catch {
    activities = [];
  }
  return activities;
}

export function activityById(id) {
  return activities.find((a) => a.id === id);
}

export function activityName(activity) {
  if (!activity) return "";
  return getLang() === "es" ? activity.es : activity.name;
}

function loadLog() {
  return store.get("exercise", []);
}

function intensity(met) {
  if (met >= VIGOROUS_MET) return { id: "vigorous", cls: "bad", label: { en: "Vigorous", es: "Vigoroso" } };
  if (met >= 3) return { id: "moderate", cls: "warn", label: { en: "Moderate", es: "Moderado" } };
  return { id: "light", cls: "good", label: { en: "Light", es: "Ligero" } };
}

// Vigorous minutes count double
function credited(entry) {
  const a = activityById(entry.id);
  return a && a.met >= VIGOROUS_MET ? entry.minutes * 2 : entry.minutes;
}

function cupsFor(activity, minutes) {
  return Math.max(1, Math.round((minutes / (activity.met >= VIGOROUS_MET ? 15 : 20)) * 2) / 2);
}

function renderSelects() {
  const order = ["everyday", "cardio", "strength", "flex", "sport"];
  const current = els.activity.value || "brisk";
  els.activity.innerHTML = order.map((group) => `<optgroup label="${t(GROUP_INFO[group].label)}">${activities.filter((a) => a.group === group).map((a) => `<option value="${a.id}">${escapeHtml(activityName(a))}</option>`).join("")}</optgroup>`).join("");
  els.activity.value = current;
  els.day.innerHTML = lastDays(7).reverse().map((day, i) => `<option value="${dateKey(day)}">${i === 0 ? t({ en: "Today", es: "Hoy" }) : i === 1 ? t({ en: "Yesterday", es: "Ayer" }) : day.toLocaleDateString(locale(), { weekday: "long", month: "short", day: "numeric" })}</option>`).join("");
}

// Details for chosen activity
function renderActivityInfo() {
  const activity = activityById(els.activity.value);
  if (!activity) return;
  const level = intensity(activity.met);
  const group = GROUP_INFO[activity.group];
  const minutes = Math.max(5, Number(els.minutes.value) || 30);
  const past = loadLog().filter((e) => e.id === activity.id);
  const profile = loadProfile();
  let personal = t(group.improve);
  if (past.length) {
    const avg = Math.round(past.reduce((sum, e) => sum + e.minutes, 0) / past.length / 5) * 5;
    personal = t({ en: "You usually do about {m} minutes. Next time try {n}. ", es: "Sueles hacer unos {m} minutos. La próxima vez prueba {n}. " }, { m: avg, n: avg + 5 }) + personal;
  }
  if (level.id === "light" && activity.group !== "flex") personal += " " + t({ en: "This counts as light activity, so a faster pace will do more for your blood pressure.", es: "Cuenta como actividad ligera, así que un ritmo más rápido hará más por tu presión." });
  const extra = [];
  if (CONTACT.includes(activity.id)) extra.push(t({ en: "If you have only one kidney, ask a doctor about contact sports first.", es: "Si tienes un solo riñón, consulta a un médico antes de hacer deportes de contacto." }));
  if (profile.age === "70+" && activity.group !== "flex") extra.push(t({ en: "At 70+, adding balance work like tai chi lowers the risk of falls.", es: "A partir de los 70, sumar equilibrio como el tai chi reduce el riesgo de caídas." }));
  els.info.innerHTML = `
    <div class="ai-head"><h3>${escapeHtml(activityName(activity))}</h3>
      <div class="ai-tags"><span class="tag ${level.cls}">${t(level.label)}</span><span class="tag">${t(group.label)}</span>${activity.met >= VIGOROUS_MET ? `<span class="tag info">${t({ en: "Counts double", es: "Cuenta doble" })}</span>` : ""}</div></div>
    <div class="ai-block"><span class="hi">${icon("kidney")}</span><div><strong>${t({ en: "How it helps your kidneys", es: "Cómo ayuda a tus riñones" })}</strong><p>${escapeHtml(t(group.kidney))} ${escapeHtml(activity.benefit)}</p></div></div>
    <div class="ai-block"><span class="hi">${icon("target")}</span><div><strong>${t({ en: "How to get more out of it", es: "Cómo sacarle más provecho" })}</strong><p>${escapeHtml(personal)}</p></div></div>
    <div class="ai-block"><span class="hi">${icon("drop")}</span><div><strong>${t({ en: "Water", es: "Agua" })}</strong><p>${t({ en: "For {m} minutes, drink about {c} cups of water spread before, during and after.", es: "Para {m} minutos, bebe unas {c} tazas de agua repartidas antes, durante y después." }, { m: minutes, c: cupsFor(activity, minutes) })}</p></div></div>
    ${extra.map((text) => `<div class="ai-block"><span class="hi">${icon("info")}</span><div><p>${escapeHtml(text)}</p></div></div>`).join("")}`;
}

function weekStats(log) {
  const stats = { cardio: 0, strengthDays: new Set(), flex: 0, activeDays: new Set(), metMinutes: 0, minutes: 0 };
  for (const entry of log) {
    const a = activityById(entry.id);
    if (!a) continue;
    stats.activeDays.add(entry.date);
    stats.metMinutes += a.met * entry.minutes;
    stats.minutes += entry.minutes;
    if (a.group === "strength") stats.strengthDays.add(entry.date);
    else if (a.group === "flex") stats.flex += entry.minutes;
    else stats.cardio += entry.minutes;
  }
  return { ...stats, strengthDays: stats.strengthDays.size, activeDays: stats.activeDays.size, avgMet: stats.minutes ? stats.metMinutes / stats.minutes : 0 };
}

// Kidney effects and suggestions
function renderInsight(total, goal, stats) {
  const profile = loadProfile();
  const ratio = total / goal;
  const effects = ratio >= 1
    ? t({ en: "You're at the level of activity linked to lower blood pressure and better blood sugar control. Both protect the filters in your kidneys.", es: "Estás en el nivel de actividad relacionado con presión más baja y mejor control del azúcar. Ambos protegen los filtros de tus riñones." })
    : ratio >= 0.5
      ? t({ en: "You're over halfway. In people with high blood pressure, reaching the weekly goal can lower the top number by about 5 to 8 points.", es: "Vas más de la mitad. En personas con presión alta, llegar a la meta semanal puede bajar el número de arriba unos 5 a 8 puntos." })
      : t({ en: "Even a little helps. Each extra session lowers blood pressure for hours afterward, and the effect builds up over weeks.", es: "Hasta un poco ayuda. Cada sesión baja la presión por horas, y el efecto se acumula con las semanas." });
  const tips = [];
  if (!stats.minutes) tips.push({ en: "Start with a 10-minute walk after a meal. It helps lower blood sugar right away.", es: "Empieza con una caminata de 10 minutos después de comer. Ayuda a bajar el azúcar de inmediato." });
  if (stats.minutes && stats.strengthDays < 2) tips.push(stats.strengthDays === 1
    ? { en: "Add strength work on 1 more day this week, like push-ups and squats.", es: "Agrega fuerza 1 día más esta semana, como flexiones y sentadillas." }
    : { en: "Add strength work on 2 days this week, like push-ups and squats.", es: "Agrega fuerza 2 días esta semana, como flexiones y sentadillas." });
  if (stats.minutes && stats.activeDays < 3) tips.push({ en: "Spread your activity over 3 or more days. Several shorter sessions beat one long one for blood pressure.", es: "Reparte tu actividad en 3 días o más. Varias sesiones cortas son mejores que una larga para la presión." });
  if (stats.minutes && stats.avgMet < 3.5) tips.push({ en: "Most of your activity is light. Swap one session for brisk walking or cycling.", es: "Casi toda tu actividad es ligera. Cambia una sesión por caminata rápida o bicicleta." });
  if (["60-69", "70+"].includes(profile.age) && !stats.flex) tips.push({ en: "Add some balance or stretching, like tai chi or yoga, once or twice a week.", es: "Agrega equilibrio o estiramientos, como tai chi o yoga, una o dos veces por semana." });
  if (isYouth(profile)) tips.push({ en: "At your age the goal is 60 minutes every day, including vigorous activity at least 3 days a week.", es: "A tu edad la meta es 60 minutos cada día, con actividad vigorosa al menos 3 días por semana." });
  if (ratio >= 1 && stats.strengthDays >= 2) tips.push({ en: "You're meeting both the activity and strength goals. Keep it steady rather than adding a lot more.", es: "Cumples las metas de actividad y fuerza. Mantén el ritmo en vez de agregar mucho más." });
  els.insight.innerHTML = `
    <div class="card-head"><h3>${t({ en: "What your week does for your kidneys", es: "Lo que tu semana hace por tus riñones" })}</h3></div>
    <p class="fine" style="margin:-6px 0 16px">${effects}</p>
    <h4>${t({ en: "Ways to improve", es: "Cómo mejorar" })}</h4>
    <ul class="insight-list">${tips.map((tip) => `<li class="todo">${icon("arrow")}<span>${escapeHtml(t(tip, tip.vars || {}))}</span></li>`).join("")}</ul>`;
}

function render() {
  const goal = targets().exerciseGoal;
  const days = weekDays();
  const keys = days.map((d) => dateKey(d));
  const log = loadLog().filter((e) => keys.includes(e.date));
  const perDay = keys.map((key) => log.filter((e) => e.date === key).reduce((sum, e) => sum + credited(e), 0));
  const total = perDay.reduce((a, b) => a + b, 0);
  const max = Math.max(60, ...perDay);
  const today = dateKey();
  const stats = weekStats(log);

  els.total.textContent = `${total} / ${goal} min`;
  els.total.className = `tag ${total >= goal ? "good" : ""}`;
  els.bars.innerHTML = days.map((day, i) => `<div class="col${keys[i] === today ? " today" : ""}${perDay[i] ? "" : " empty"}" title="${perDay[i]} min"><div class="col-bar" style="height:${perDay[i] ? Math.max(4, (perDay[i] / max) * 100) : 2}%"></div><span class="col-day">${day.toLocaleDateString(locale(), { weekday: "short" })}</span></div>`).join("");
  els.progress.firstElementChild.style.width = `${Math.min(100, (total / goal) * 100)}%`;
  els.progress.setAttribute("aria-valuemax", String(goal));
  els.progress.setAttribute("aria-valuenow", String(Math.min(total, goal)));
  els.stats.innerHTML = `
    <div>${t({ en: "Cardio", es: "Cardio" })}<strong>${stats.cardio} min</strong></div>
    <div class="${stats.strengthDays >= 2 ? "ok" : ""}">${t({ en: "Strength days", es: "Días de fuerza" })}<strong>${stats.strengthDays} / 2</strong></div>
    <div>${t({ en: "Stretch and balance", es: "Estiramiento" })}<strong>${stats.flex} min</strong></div>
    <div>${t({ en: "Active days", es: "Días activos" })}<strong>${stats.activeDays} / 7</strong></div>`;

  const recent = loadLog().slice().sort((a, b) => b.ts - a.ts).slice(0, 20);
  els.log.innerHTML = recent.length
    ? recent.map((entry) => {
        const a = activityById(entry.id);
        const date = new Date(`${entry.date}T12:00:00`).toLocaleDateString(locale(), { weekday: "short", month: "short", day: "numeric" });
        const level = a ? intensity(a.met) : null;
        return `<li><div><strong>${escapeHtml(activityName(a) || entry.id)}</strong><div class="meta">${entry.minutes} min &middot; ${date}${level ? ` &middot; ${t(level.label)}` : ""}</div></div>
          <button type="button" class="icon-only" data-ts="${entry.ts}" aria-label="${t({ en: "Remove", es: "Quitar" })}">${icon("trash")}</button></li>`;
      }).join("")
    : `<li class="fine" style="background:none;padding:0">${t({ en: "Nothing logged yet.", es: "Aún no hay nada registrado." })}</li>`;
  els.log.querySelectorAll("[data-ts]").forEach((button) => button.addEventListener("click", () => {
    store.set("exercise", loadLog().filter((e) => String(e.ts) !== button.dataset.ts));
    render();
    emit("exercise");
  }));
  renderInsight(total, goal, stats);
  renderActivityInfo();
}

// Last 7 days summary
export function getExerciseSummary() {
  const keys = lastDays(7).map((d) => dateKey(d));
  const log = loadLog().filter((e) => keys.includes(e.date));
  const total = log.reduce((sum, e) => sum + credited(e), 0);
  const byActivity = {};
  for (const e of log) byActivity[e.id] = (byActivity[e.id] || 0) + e.minutes;
  const favorites = Object.entries(byActivity).sort((a, b) => b[1] - a[1]).map(([id, minutes]) => ({ id, minutes }));
  const stats = weekStats(log);
  return { total, goal: targets().exerciseGoal, entries: log.length, favorites, activeDays: stats.activeDays, strengthDays: stats.strengthDays, everLogged: loadLog().length > 0 };
}

export async function init() {
  els = {
    form: document.getElementById("exercise-form"),
    activity: document.getElementById("ex-activity"),
    minutes: document.getElementById("ex-minutes"),
    day: document.getElementById("ex-day"),
    info: document.getElementById("activity-info"),
    log: document.getElementById("exercise-log"),
    bars: document.getElementById("week-bars"),
    total: document.getElementById("week-total"),
    progress: document.getElementById("week-progress"),
    stats: document.getElementById("week-stats"),
    insight: document.getElementById("week-insight")
  };
  await loadActivities();
  renderSelects();
  els.activity.addEventListener("change", renderActivityInfo);
  els.minutes.addEventListener("input", renderActivityInfo);
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const minutes = Math.round(Number(els.minutes.value));
    if (!minutes || minutes < 1 || minutes > 600) return;
    const log = loadLog();
    log.push({ id: els.activity.value, minutes, date: els.day.value || dateKey(), ts: Date.now() });
    store.set("exercise", log.slice(-500));
    render();
    emit("exercise");
  });
  render();
  document.addEventListener("langchange", () => {
    renderSelects();
    render();
  });
}
