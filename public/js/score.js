import { loadHealth, SYMPTOMS } from "./pages/health.js";
import { getDietSummary, loadFlags } from "./pages/diet.js";
import { getExerciseSummary, loadActivities } from "./pages/exercise.js";
import { getMedicationSummary } from "./pages/medication.js";
import { getEnvironmentSummary, EPA_PM25, US_REFERENCE } from "./pages/environment.js";

// Max points per area
export const CATEGORIES = [
  { id: "history", max: 30, label: { en: "Health history", es: "Historial de salud" } },
  { id: "symptoms", max: 15, label: { en: "Symptoms", es: "Síntomas" } },
  { id: "diet", max: 15, label: { en: "Diet", es: "Dieta" } },
  { id: "habits", max: 15, label: { en: "Daily habits", es: "Hábitos diarios" } },
  { id: "exercise", max: 10, label: { en: "Exercise", es: "Ejercicio" } },
  { id: "medicines", max: 10, label: { en: "Medicines", es: "Medicamentos" } },
  { id: "environment", max: 5, label: { en: "Your area", es: "Tu zona" } }
];

const AGE_POINTS = { "50-59": 2, "60-69": 3, "70+": 4 };
const SCORED_ITEMS = ["anemia", "bp", "diabetes", "cvd", "chf", "pvd", "protein"];

// SCORED raw points, 0 to 12
export function scoredPoints(answers) {
  let points = AGE_POINTS[answers.age] || 0;
  if (answers.sex === "female") points += 1;
  for (const id of SCORED_ITEMS) if (answers[id] === "yes") points += 1;
  return points;
}

function scale(raw) {
  return Math.round((raw / 12) * 25);
}

export async function computeScore() {
  await Promise.all([loadFlags(), loadActivities()]);
  const { answers, symptoms } = loadHealth();
  const diet = getDietSummary();
  const exercise = getExerciseSummary();
  const meds = getMedicationSummary();
  const env = getEnvironmentSummary();
  const parts = {};
  const steps = [];
  const notes = {};

  // Health history
  const raw = scoredPoints(answers);
  const fixedRaw = (AGE_POINTS[answers.age] || 0) + (answers.sex === "female" ? 1 : 0);
  const family = answers.family === "yes" ? 5 : answers.family === "unsure" ? 2 : 0;
  parts.history = Math.min(30, scale(raw) + family);
  const fixed = scale(fixedRaw) + family;
  if (answers.bp === "yes") steps.push({ id: "bp", category: "history", points: scale(1) });
  if (answers.diabetes === "yes") steps.push({ id: "diabetes", category: "history", points: scale(1) });

  // Symptoms
  parts.symptoms = Math.min(15, symptoms.reduce((sum, id) => sum + (SYMPTOMS.find((s) => s.id === id)?.weight || 0), 0));

  // Diet, logged or estimated
  let dietPoints = 0;
  if (diet.daysLogged) {
    const ratio = diet.avgSodium / diet.sodiumLimit;
    const sodium = ratio > 1.5 ? 8 : ratio > 1 ? 5 : ratio > 0.65 ? 2 : 0;
    const flagged = diet.flaggedTotal >= 6 ? 5 : diet.flaggedTotal >= 3 ? 3 : diet.flaggedTotal >= 1 ? 1 : 0;
    const fast = answers.fastfood === "daily" ? 2 : 0;
    dietPoints = sodium + flagged + fast;
    if (sodium) steps.push({ id: "sodium", category: "diet", points: sodium, vars: { mg: Math.round(diet.avgSodium).toLocaleString("en-US"), limit: diet.sodiumLimit.toLocaleString("en-US") } });
    if (flagged) steps.push({ id: "flagged", category: "diet", points: flagged });
    if (fast) steps.push({ id: "fastfood", category: "diet", points: fast });
  } else {
    notes.dietEstimated = true;
    const salt = answers.salt === "often" ? 5 : answers.salt === "sometimes" ? 2 : 0;
    const fast = answers.fastfood === "daily" ? 7 : answers.fastfood === "weekly" ? 3 : 0;
    dietPoints = salt + fast;
    if (salt) steps.push({ id: "salt", category: "diet", points: salt });
    if (fast) steps.push({ id: "fastfood", category: "diet", points: fast });
    steps.push({ id: "logfood", category: "diet", points: 0 });
  }
  parts.diet = Math.min(15, dietPoints);

  // Exercise, last 7 days
  const moved = exercise.total / exercise.goal;
  parts.exercise = moved >= 1 ? 0 : moved >= 0.5 ? 4 : moved >= 0.2 ? 7 : 10;
  if (parts.exercise) steps.push({ id: "exercise", category: "exercise", points: parts.exercise, vars: { n: Math.max(0, exercise.goal - exercise.total), goal: exercise.goal } });
  if (!exercise.strengthDays && exercise.entries) steps.push({ id: "strength", category: "exercise", points: 0 });

  // Medicines and painkillers
  const caution = Math.min(8, meds.caution.length * 4);
  const monitor = Math.min(2, meds.monitor.length);
  const pain = answers.painkillers === "daily" ? 5 : answers.painkillers === "weekly" ? 3 : 0;
  parts.medicines = Math.min(10, caution + monitor + pain);
  if (caution) steps.push({ id: "cautionMeds", category: "medicines", points: caution, vars: { names: meds.caution.join(", ") } });
  if (pain) steps.push({ id: "painkillers", category: "medicines", points: pain });
  if (monitor) steps.push({ id: "monitorMeds", category: "medicines", points: monitor, vars: { names: meds.monitor.join(", ") } });

  // Daily habits
  const habitPoints = {
    smoking: answers.smoking === "current" ? 6 : answers.smoking === "former" ? 1 : 0,
    alcohol: answers.alcohol === "15+" ? 4 : answers.alcohol === "8-14" ? 2 : 0,
    water: answers.water === "low" ? 2 : 0,
    sleep: answers.sleep === "low" ? 1 : 0,
    sitting: answers.sitting === "high" ? 1 : 0,
    checkup: answers.checkup === "longer" ? 1 : 0
  };
  parts.habits = Math.min(15, Object.values(habitPoints).reduce((a, b) => a + b, 0));
  for (const [id, points] of Object.entries(habitPoints)) {
    if (points && !(id === "smoking" && answers.smoking === "former")) steps.push({ id, category: "habits", points });
  }

  // Your area
  let envPoints = 0;
  if (env) {
    const pm = env.air?.pm25Avg ?? 0;
    envPoints += pm > 15 ? 2 : pm > EPA_PM25 ? 1 : 0;
    if (env.air?.aqi > 100) envPoints += 1;
    if (env.heat?.hotDays > 0) envPoints += 1;
    if (env.places?.kidney > US_REFERENCE.kidney + 0.2) envPoints += 1;
    if (pm > EPA_PM25 || env.air?.aqi > 100) steps.push({ id: "air", category: "environment", points: 1, vars: { place: env.place } });
    if (env.heat?.hotDays > 0) steps.push({ id: "heat", category: "environment", points: 1, vars: { n: env.heat.hotDays } });
  } else {
    notes.noEnv = true;
  }
  parts.environment = Math.min(5, envPoints);

  const total = Math.min(100, Object.values(parts).reduce((a, b) => a + b, 0));
  steps.sort((a, b) => b.points - a.points);
  const reducible = steps.reduce((sum, step) => sum + step.points, 0);
  const urgent = symptoms.filter((id) => ["swelling", "foamy", "blood", "less"].includes(id));

  return {
    total,
    parts,
    fixed: Math.min(parts.history, fixed),
    steps,
    reducible,
    scored: raw,
    scoredHigh: raw >= 4,
    urgent,
    answers,
    symptoms,
    diet,
    exercise,
    meds,
    env,
    notes,
    complete: Boolean(answers.age && answers.sex)
  };
}

export function band(total) {
  if (total < 20) return { id: "low", cls: "good", label: { en: "Low risk", es: "Riesgo bajo" } };
  if (total < 40) return { id: "moderate", cls: "warn", label: { en: "Moderate risk", es: "Riesgo moderado" } };
  if (total < 60) return { id: "high", cls: "bad", label: { en: "High risk", es: "Riesgo alto" } };
  return { id: "veryhigh", cls: "bad", label: { en: "Very high risk", es: "Riesgo muy alto" } };
}
