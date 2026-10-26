import { store, dateKey, weekDays, escapeHtml, icon } from "../storage.js";
import { t, locale } from "../i18n.js";
import { computeScore, CATEGORIES, band } from "../score.js";
import { activityById, activityName } from "./exercise.js";
import { savedNoteHtml } from "../layout.js";

// What each step says
const STEP_TEXT = {
  bp: { title: { en: "Keep your blood pressure under control", es: "Mantén tu presión arterial controlada" }, action: { en: "Check it at home or at a pharmacy, and take any medicine as prescribed. Most adults should aim for under 130/80.", es: "Mídela en casa o en una farmacia y toma tus medicamentos como te indicaron. La mayoría de los adultos debería estar por debajo de 130/80." } },
  diabetes: { title: { en: "Keep your blood sugar in range", es: "Mantén tu azúcar en rango" }, action: { en: "Stick to your diabetes plan and ask your doctor about an A1C test every 3 to 6 months.", es: "Sigue tu plan para la diabetes y pregunta por una prueba de A1C cada 3 a 6 meses." } },
  sodium: { title: { en: "Cut back on sodium", es: "Reduce el sodio" }, action: { en: "Your logged days averaged {mg} mg. The limit for your age is {limit} mg. On labels, look for 140 mg or less per serving.", es: "Tus días registrados promediaron {mg} mg. El límite para tu edad es {limit} mg. En las etiquetas, busca 140 mg o menos por porción." } },
  flagged: { title: { en: "Swap out the foods we flagged", es: "Cambia los alimentos que marcamos" }, action: { en: "Your log had sodas, processed meat or other foods we marked. Replace a few each week. The food list below has ideas.", es: "Tu registro tenía refrescos, carne procesada u otros alimentos marcados. Cambia algunos cada semana. La lista de abajo tiene ideas." } },
  fastfood: { title: { en: "Eat fast food less often", es: "Come menos comida rápida" }, action: { en: "Cook at home a few more nights a week. One restaurant meal can have half a day's sodium.", es: "Cocina en casa algunas noches más por semana. Una comida de restaurante puede tener la mitad del sodio del día." } },
  salt: { title: { en: "Use less added salt", es: "Usa menos sal" }, action: { en: "Taste before you salt, and season with herbs, garlic, lemon or pepper instead.", es: "Prueba antes de poner sal y sazona con hierbas, ajo, limón o pimienta." } },
  logfood: { title: { en: "Log your meals for a few days", es: "Registra tus comidas unos días" }, action: { en: "We estimated your diet from your answers. Adding real meals on the Diet page will make this part accurate.", es: "Estimamos tu dieta con tus respuestas. Agregar comidas reales en la página de Dieta hará esta parte más precisa." } },
  exercise: { title: { en: "Move more this week", es: "Muévete más esta semana" }, action: { en: "You're about {n} minutes short of your weekly goal of {goal}. The schedule below shows one way to get there.", es: "Te faltan unos {n} minutos para tu meta semanal de {goal}. El horario de abajo muestra una forma de lograrlo." } },
  strength: { title: { en: "Add strength training twice a week", es: "Agrega fuerza dos veces por semana" }, action: { en: "You logged cardio but no strength work. Muscle helps control blood sugar. Push-ups, squats or weights all count.", es: "Registraste cardio pero no fuerza. El músculo ayuda a controlar el azúcar. Flexiones, sentadillas o pesas cuentan." } },
  cautionMeds: { title: { en: "Talk to your doctor about {names}", es: "Habla con tu médico sobre {names}" }, action: { en: "These can affect the kidneys with regular use. Don't stop them on your own, but ask whether there's a safer option for you.", es: "Pueden afectar los riñones con el uso regular. No los dejes por tu cuenta, pero pregunta si hay una opción más segura." } },
  painkillers: { title: { en: "Take painkillers like ibuprofen less often", es: "Toma analgésicos como el ibuprofeno con menos frecuencia" }, action: { en: "Using them often reduces blood flow to the kidneys. Ask your doctor about other ways to manage pain.", es: "Usarlos seguido reduce el flujo de sangre a los riñones. Pregunta a tu médico por otras formas de controlar el dolor." } },
  monitorMeds: { title: { en: "Ask about kidney checks for {names}", es: "Pregunta por controles renales para {names}" }, action: { en: "These usually come with regular blood tests. Make sure yours are up to date.", es: "Suelen requerir análisis de sangre regulares. Asegúrate de tenerlos al día." } },
  smoking: { title: { en: "Quit smoking or vaping", es: "Deja de fumar o vapear" }, action: { en: "Free help is available: call 1-800-QUIT-NOW or visit kickitca.org.", es: "Hay ayuda gratis: llama al 1-800-QUIT-NOW o visita kickitca.org." } },
  alcohol: { title: { en: "Drink less alcohol", es: "Bebe menos alcohol" }, action: { en: "Try to have at least 3 alcohol-free days each week.", es: "Intenta tener al menos 3 días sin alcohol por semana." } },
  water: { title: { en: "Drink more water", es: "Bebe más agua" }, action: { en: "Keep a water bottle with you. Pale yellow urine usually means you're drinking enough. If a doctor has limited your fluids, follow their advice.", es: "Lleva una botella de agua. La orina amarillo claro suele indicar que bebes suficiente. Si un médico limitó tus líquidos, sigue su consejo." } },
  sleep: { title: { en: "Get more sleep", es: "Duerme más" }, action: { en: "Aim for 7 to 9 hours. Going to bed at the same time each night helps.", es: "Busca dormir de 7 a 9 horas. Acostarte a la misma hora ayuda." } },
  sitting: { title: { en: "Sit less", es: "Pasa menos tiempo sentado" }, action: { en: "Stand up and move for a couple of minutes every half hour.", es: "Levántate y muévete un par de minutos cada media hora." } },
  checkup: { title: { en: "Book a check-up", es: "Pide una revisión médica" }, action: { en: "It's been a while. A yearly visit catches high blood pressure, diabetes and kidney problems early.", es: "Ha pasado tiempo. Una visita anual detecta a tiempo la presión alta, la diabetes y los problemas renales." } },
  air: { title: { en: "Keep an eye on air quality", es: "Vigila la calidad del aire" }, action: { en: "Check airnow.gov before exercising outside near {place}, and stay in on smoky days.", es: "Revisa airnow.gov antes de hacer ejercicio afuera cerca de {place} y quédate adentro en días con humo." } },
  heat: { title: { en: "Drink extra water on hot days", es: "Bebe más agua en días de calor" }, action: { en: "{n} hot days are in the forecast. Drink water through the day and skip hard workouts at midday.", es: "Se pronostican {n} días de calor. Bebe agua durante el día y evita entrenar fuerte al mediodía." } }
};

let result;

function dial(total, cls) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const color = cls === "good" ? "var(--green)" : cls === "warn" ? "var(--amber)" : "var(--accent)";
  return `<div class="score-dial">
    <svg viewBox="0 0 168 168" class="chart-svg" aria-hidden="true">
      <circle cx="84" cy="84" r="${r}" fill="none" stroke="var(--bg-alt)" stroke-width="14"/>
      <circle cx="84" cy="84" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - total / 100)}" transform="rotate(-90 84 84)"/>
    </svg>
    <div class="dial-label"><div><strong>${total}</strong><small>${t({ en: "out of 100", es: "de 100" })}</small></div></div>
  </div>`;
}

// Save score, find last one
function trackHistory(total) {
  const history = store.get("scoreHistory", []).filter((entry) => entry.date !== dateKey());
  const previous = history[history.length - 1];
  history.push({ date: dateKey(), total });
  store.set("scoreHistory", history.slice(-30));
  store.set("lastScore", { date: dateKey(), total });
  return previous;
}

function heroHtml(previous) {
  const b = band(result.total);
  const summary = {
    low: { en: "Your answers point to a low chance of kidney problems right now. Keep the habits that are working.", es: "Tus respuestas indican una baja probabilidad de problemas renales por ahora. Sigue con los hábitos que te funcionan." },
    moderate: { en: "A few things are raising your risk. Most of them are habits you can change.", es: "Algunas cosas aumentan tu riesgo. La mayoría son hábitos que puedes cambiar." },
    high: { en: "Several things are adding up. It's worth making changes and getting your kidneys checked.", es: "Varias cosas se están sumando. Vale la pena hacer cambios y revisar tus riñones." },
    veryhigh: { en: "Your score is high. Please talk to a doctor soon and ask for kidney tests.", es: "Tu puntuación es alta. Habla con un médico pronto y pide pruebas renales." }
  }[b.id];
  let change = "";
  if (previous) {
    const diff = result.total - previous.total;
    const when = new Date(`${previous.date}T12:00:00`).toLocaleDateString(locale(), { month: "short", day: "numeric" });
    change = diff === 0
      ? t({ en: "Same as on {when}.", es: "Igual que el {when}." }, { when })
      : diff < 0
        ? t({ en: "Down {n} points since {when}.", es: "{n} puntos menos que el {when}." }, { n: -diff, when })
        : t({ en: "Up {n} points since {when}.", es: "{n} puntos más que el {when}." }, { n: diff, when });
  }
  return `<section class="card score-hero">
    ${dial(result.total, b.cls)}
    <div>
      <span class="tag ${b.cls}">${t(b.label)}</span>
      <h1 style="font-size:clamp(1.6rem,3.2vw,2.2rem);margin-top:10px">${t({ en: "Your kidney risk score is {n}", es: "Tu puntuación de riesgo renal es {n}" }, { n: result.total })}</h1>
      <p style="margin-top:8px">${t(summary)} ${t({ en: "Lower is better.", es: "Más bajo es mejor." })}</p>
      ${change ? `<p class="score-change">${change}</p>` : ""}
    </div>
  </section>`;
}

function alertsHtml() {
  const alerts = [];
  if (result.urgent.length) {
    alerts.push(t({ en: "You noticed symptoms like swelling, foamy or bloody urine, or peeing much less. These can have many causes, but please see a doctor soon rather than waiting.", es: "Notaste síntomas como hinchazón, orina con espuma o sangre, u orinar mucho menos. Pueden tener muchas causas, pero ve al médico pronto en lugar de esperar." }));
  }
  if (result.scoredHigh) {
    alerts.push(t({ en: "Your health history scored {n} on SCORED, where 4 or more means about a 1 in 5 chance of reduced kidney function. Ask your doctor for an eGFR blood test and a urine ACR test.", es: "Tu historial obtuvo {n} en SCORED, donde 4 o más significa cerca de 1 probabilidad entre 5 de función renal reducida. Pide a tu médico una prueba de sangre eGFR y una de orina ACR." }, { n: result.scored }));
  }
  return alerts.map((text) => `<div class="alert-box">${icon("alert")}<p>${text}</p></div>`).join("");
}

function breakdownHtml() {
  const rows = CATEGORIES.map((cat) => {
    const points = result.parts[cat.id];
    const ratio = points / cat.max;
    const cls = ratio >= 0.6 ? "high" : ratio >= 0.3 ? "mid" : "";
    let note = "";
    if (cat.id === "diet" && result.notes.dietEstimated) note = t({ en: "Estimated from your answers, since no meals are logged.", es: "Estimado con tus respuestas, porque no hay comidas registradas." });
    if (cat.id === "environment" && result.notes.noEnv) note = t({ en: "No ZIP code entered.", es: "No ingresaste código postal." });
    return `<div class="bd-row">
      <div class="bd-head"><span>${t(cat.label)}</span><span>${points} / ${cat.max}</span></div>
      <div class="bd-track"><div class="bd-fill ${cls}" style="width:${Math.max(ratio * 100, points ? 4 : 0)}%"></div></div>
      ${note ? `<span class="bd-note">${note}</span>` : ""}
    </div>`;
  }).join("");
  return `<section class="card">
    <div class="card-head"><h3>${t({ en: "Where your points come from", es: "De dónde vienen tus puntos" })}</h3></div>
    <div class="breakdown">${rows}</div>
    ${result.fixed ? `<p class="fixed-note">${t({ en: "{n} points come from things you can't change, like age and family history. That's a reason to get tested regularly, not a reason to worry.", es: "{n} puntos vienen de cosas que no puedes cambiar, como la edad y los antecedentes familiares. Es una razón para hacerte pruebas, no para preocuparte." }, { n: result.fixed })}</p>` : ""}
  </section>`;
}

function stepsHtml() {
  const steps = result.steps.slice(0, 8);
  return `<section class="card">
    <div class="card-head"><h3>${t({ en: "How to lower your score", es: "Cómo bajar tu puntuación" })}</h3>${result.reducible ? `<span class="tag good">${t({ en: "Up to −{n}", es: "Hasta −{n}" }, { n: result.reducible })}</span>` : ""}</div>
    ${steps.length
      ? `<ol class="steps-list">${steps.map((step) => {
          const text = STEP_TEXT[step.id];
          const vars = step.vars || {};
          return `<li class="step-item"><div><h3>${escapeHtml(t(text.title, vars))}</h3><p>${escapeHtml(t(text.action, vars))}</p></div>
            <span class="step-pts">${step.points ? `−${step.points}` : step.id === "logfood" ? t({ en: "more accurate", es: "más preciso" }) : t({ en: "tip", es: "consejo" })}</span></li>`;
        }).join("")}</ol>`
      : `<p>${t({ en: "Nothing you can change is adding points right now. Keep it up.", es: "Ahora mismo nada que puedas cambiar suma puntos. Sigue así." })}</p>`}
  </section>`;
}

// Weekly movement schedule
function weekPlanHtml() {
  const ex = result.exercise;
  const favs = ex.favorites.map((f) => activityById(f.id)).filter(Boolean);
  const main = favs.find((a) => a.group !== "strength" && a.group !== "flex") || activityById("brisk");
  const second = favs.find((a) => a.id !== main.id && a.group !== "strength" && a.group !== "flex") || activityById(main.id === "brisk" ? "cycle" : "brisk");
  const strength = favs.find((a) => a.group === "strength") || activityById("bodyweight");
  const flex = favs.find((a) => a.group === "flex") || activityById("stretch");
  const youth = ex.goal > 150;
  const mainMinutes = youth ? 60 : main.met >= 6 ? 25 : 30;
  const plan = youth
    ? [
        { act: main, min: 60 },
        { act: strength, min: 45 },
        { act: second, min: 60 },
        { act: flex, min: 30 },
        { act: main, min: 60 },
        { act: second, min: 60 },
        { act: activityById("walk"), min: 60 }
      ]
    : [
        { act: main, min: mainMinutes },
        { act: strength, min: 20 },
        { act: second, min: 30 },
        { act: flex, min: 15 },
        { act: main, min: mainMinutes },
        { act: second, min: 40 },
        { rest: true }
      ];
  const days = weekDays();
  const today = dateKey();
  let intro;
  if (!ex.entries) {
    intro = t({ en: "You didn't log any exercise this week, so this starts with brisk walking and simple strength moves. Swap in anything you enjoy.", es: "No registraste ejercicio esta semana, así que empieza con caminatas rápidas y ejercicios simples de fuerza. Cámbialos por lo que te guste." });
  } else if (ex.total >= ex.goal) {
    intro = t({ en: "You already reached your weekly goal. This keeps {main} in your week and adds strength work, which the CDC recommends twice a week.", es: "Ya llegaste a tu meta semanal. Esto mantiene {main} en tu semana y agrega fuerza, que los CDC recomiendan dos veces por semana." }, { main: activityName(main).toLowerCase() });
  } else {
    intro = t({ en: "Built around {main}, which you already do. You logged {n} minutes in the last 7 days. This plan gets you to your goal of {goal}.", es: "Basado en {main}, que ya haces. Registraste {n} minutos en los últimos 7 días. Este plan te lleva a tu meta de {goal}." }, { main: activityName(main).toLowerCase(), n: ex.total, goal: ex.goal });
  }
  return `<section class="card plan-section">
    <div class="card-head"><h3>${icon("calendar")} ${t({ en: "Your movement plan for this week", es: "Tu plan de movimiento para esta semana" })}</h3></div>
    <p class="fine" style="margin:-6px 0 16px">${intro}</p>
    <div class="week-plan">
      ${plan.map((day, i) => `<div class="wp-day${day.rest ? " rest" : ""}${dateKey(days[i]) === today ? " today" : ""}">
        <span class="wp-name">${days[i].toLocaleDateString(locale(), { weekday: "short" })}</span>
        ${day.rest ? `<strong>${t({ en: "Rest", es: "Descanso" })}</strong><span>${t({ en: "An easy walk is fine", es: "Una caminata suave está bien" })}</span>` : `<strong>${escapeHtml(activityName(day.act))}</strong><span>${day.min} min</span>`}
      </div>`).join("")}
    </div>
  </section>`;
}

// Food groups with examples
function foodPlanHtml() {
  const flags = result.diet.flagCounts || {};
  const a = result.answers;
  const more = [
    { en: "Vegetables at most meals (ex. cauliflower or bell peppers)", es: "Verduras en casi todas las comidas (ej. coliflor o pimiento)" },
    { en: "Fruit for snacks (ex. apples or berries)", es: "Fruta como merienda (ej. manzana o fresas)" },
    { en: "Whole grains (ex. oats or brown rice)", es: "Granos integrales (ej. avena o arroz integral)" },
    { en: "Protein in normal portions (ex. eggs, fish or lentils)", es: "Proteína en porciones normales (ej. huevo, pescado o lentejas)" },
    { en: "Water as your main drink (ex. water with lemon)", es: "Agua como bebida principal (ej. agua con limón)" }
  ];
  if (flags.cola || flags.sugary || flags.energy) more.unshift(more.pop());
  const less = [];
  if (flags.cola) less.push({ en: "Dark sodas (ex. cola)", es: "Refrescos oscuros (ej. cola)" });
  if (flags.energy) less.push({ en: "Energy drinks", es: "Bebidas energéticas" });
  if (flags.sugary) less.push({ en: "Sweet drinks (ex. bubble tea or juice)", es: "Bebidas dulces (ej. té de burbujas o jugo)" });
  if (flags.processed) less.push({ en: "Processed meat (ex. bacon or deli meat)", es: "Carne procesada (ej. tocino o fiambre)" });
  if (flags.salty) less.push({ en: "Salty packaged food (ex. instant noodles or chips)", es: "Comida empaquetada salada (ej. fideos instantáneos o papitas)" });
  if (flags.cheese) less.push({ en: "Processed cheese (ex. cheese sauce)", es: "Queso procesado (ej. salsa de queso)" });
  if (flags.fastfood || a.fastfood === "daily" || a.fastfood === "weekly") less.push({ en: "Fast food (ex. fries or burgers)", es: "Comida rápida (ej. papas fritas o hamburguesas)" });
  if (a.salt === "often" || a.salt === "sometimes") less.push({ en: "Extra salt and salty sauces (ex. soy sauce)", es: "Sal extra y salsas saladas (ej. salsa de soya)" });
  if (result.diet.avgSodium > result.diet.sodiumLimit && !less.length) less.push({ en: "Restaurant meals and canned soups", es: "Comidas de restaurante y sopas enlatadas" });
  const fromLog = result.diet.highSodiumFoods.slice(0, 4);
  return `<div class="plan-cols plan-section">
    <section class="card">
      <div class="card-head"><h3>${t({ en: "Eat more of", es: "Come más" })}</h3></div>
      <ul class="food-plan more">${more.map((item) => `<li>${icon("plus")}<span>${t(item)}</span></li>`).join("")}</ul>
    </section>
    <section class="card">
      <div class="card-head"><h3>${t({ en: "Cut back on", es: "Come menos" })}</h3></div>
      ${less.length ? `<ul class="food-plan less">${less.map((item) => `<li>${icon("down")}<span>${t(item)}</span></li>`).join("")}</ul>` : `<p class="fine" style="margin-top:0">${t({ en: "Nothing stood out. Keep sodium under 2,300 mg a day.", es: "Nada destacó. Mantén el sodio por debajo de 2,300 mg al día." })}</p>`}
      ${fromLog.length ? `<p class="fine">${t({ en: "High in sodium from your log: {foods}.", es: "Altos en sodio en tu registro: {foods}." }, { foods: fromLog.map(escapeHtml).join(", ") })}</p>` : ""}
    </section>
  </div>`;
}

function checksHtml() {
  const a = result.answers;
  const due = result.scoredHigh || a.bp === "yes" || a.diabetes === "yes" || a.family === "yes" || ["60-69", "70+"].includes(a.age) || result.urgent.length;
  const tests = [
    { icon: "flask", title: { en: "eGFR blood test and urine ACR test", es: "Prueba de sangre eGFR y de orina ACR" }, when: due ? { en: "Ask for these at your next visit. Your answers suggest you should have them.", es: "Pídelas en tu próxima visita. Tus respuestas indican que deberías hacértelas." } : { en: "Not urgent for you now. Ask about them if you develop high blood pressure or diabetes.", es: "No es urgente ahora. Pregunta por ellas si desarrollas presión alta o diabetes." } },
    { icon: "heart", title: { en: "Blood pressure", es: "Presión arterial" }, when: { en: "At every check-up, or at a free pharmacy machine.", es: "En cada revisión, o en una máquina gratis de farmacia." } },
    { icon: "sugar", title: { en: "Blood sugar (A1C)", es: "Azúcar en sangre (A1C)" }, when: a.diabetes === "yes" ? { en: "Every 3 to 6 months.", es: "Cada 3 a 6 meses." } : { en: "Ask if you're due, especially if diabetes runs in your family.", es: "Pregunta si te toca, sobre todo si hay diabetes en tu familia." } }
  ];
  const strengths = [];
  if (a.smoking === "never" || a.smoking === "former") strengths.push({ en: "You don't smoke.", es: "No fumas." });
  if (result.exercise.total >= result.exercise.goal) strengths.push({ en: "You reached your weekly activity goal.", es: "Llegaste a tu meta semanal de actividad." });
  if (result.diet.daysLogged && result.diet.avgSodium <= result.diet.sodiumLimit) strengths.push({ en: "Your logged sodium is under the daily limit.", es: "Tu sodio registrado está bajo el límite diario." });
  if (a.water === "high" || a.water === "mid") strengths.push({ en: "You drink a good amount of water.", es: "Bebes una buena cantidad de agua." });
  if (a.sleep === "good") strengths.push({ en: "You sleep 7 to 9 hours.", es: "Duermes de 7 a 9 horas." });
  if (result.meds.protect.length) strengths.push({ en: "You take {names}, which is often prescribed to protect the kidneys.", es: "Tomas {names}, que suele recetarse para proteger los riñones.", vars: { names: result.meds.protect.join(", ") } });
  return `<div class="plan-cols plan-section">
    <section class="card">
      <div class="card-head"><h3>${t({ en: "Checks to ask your doctor about", es: "Pruebas para pedirle a tu médico" })}</h3></div>
      <ul class="habit-list">${tests.map((test) => `<li><span class="hi">${icon(test.icon)}</span><div><strong>${t(test.title)}</strong>${t(test.when)}</div></li>`).join("")}</ul>
      <p class="fine"><a href="numbers.html">${t({ en: "What these numbers mean", es: "Qué significan estas cifras" })}</a></p>
    </section>
    <section class="card">
      <div class="card-head"><h3>${t({ en: "What you're already doing well", es: "Lo que ya haces bien" })}</h3></div>
      ${strengths.length ? `<ul class="food-plan more">${strengths.map((s) => `<li>${icon("check")}<span>${escapeHtml(t(s, s.vars || {}))}</span></li>`).join("")}</ul>` : `<p class="fine" style="margin-top:0">${t({ en: "Start with the first step above. Small changes add up.", es: "Empieza con el primer paso de arriba. Los cambios pequeños suman." })}</p>`}
    </section>
  </div>`;
}

function incompleteHtml() {
  return `<section class="card empty-state" style="padding:48px 20px">
    ${icon("clipboard")}
    <h2>${t({ en: "Your score isn't ready yet", es: "Tu puntuación aún no está lista" })}</h2>
    <p>${t({ en: "Answer the questions on the Health page first. Your meals, exercise and medicines are already saved.", es: "Primero responde las preguntas de la página de Salud. Tus comidas, ejercicio y medicamentos ya están guardados." })}</p>
    <a class="btn btn-primary" href="health.html">${t({ en: "Go to Health questions", es: "Ir a las preguntas de Salud" })}${icon("arrow")}</a>
  </section>`;
}

let previous = null;

function render() {
  const mount = document.getElementById("results");
  if (!result.complete) {
    mount.innerHTML = incompleteHtml();
    return;
  }
  mount.innerHTML = `
    ${heroHtml(previous)}
    ${alertsHtml()}
    <div class="results-grid">${breakdownHtml()}${stepsHtml()}</div>
    <h2 style="margin-top:44px">${t({ en: "Your plan", es: "Tu plan" })}</h2>
    ${weekPlanHtml()}
    ${foodPlanHtml()}
    ${checksHtml()}
    <div class="plan-section">${savedNoteHtml(true)}</div>
    <div class="results-actions">
      <button class="btn btn-primary" type="button" id="print-plan">${icon("print")}<span>${t({ en: "Print or save as PDF", es: "Imprimir o guardar como PDF" })}</span></button>
      <a class="btn btn-ghost" href="diet.html">${t({ en: "Log today's meals", es: "Registrar las comidas de hoy" })}</a>
      <a class="btn btn-ghost" href="health.html">${t({ en: "Change my answers", es: "Cambiar mis respuestas" })}</a>
    </div>
    <p class="fine">${t({ en: "Come back next week after logging your meals and workouts to see how your score changes. This is general information, not a diagnosis.", es: "Vuelve la próxima semana después de registrar tus comidas y ejercicio para ver cómo cambia tu puntuación. Es información general, no un diagnóstico." })}</p>`;
  mount.querySelector("#print-plan").addEventListener("click", () => window.print());
}

export async function init() {
  result = await computeScore();
  if (result.complete) {
    previous = trackHistory(result.total);
    const progress = store.get("progress", {});
    progress.results = true;
    store.set("progress", progress);
  }
  render();
  document.addEventListener("langchange", render);
}
