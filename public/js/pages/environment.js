import { store, escapeHtml, icon, formatNumber, emit } from "../storage.js";
import { t } from "../i18n.js";

const PLACES_ZCTA = "https://data.cdc.gov/resource/c7b2-4ecy.json";

// US averages, CDC PLACES 2023
export const US_REFERENCE = { kidney: 2.9, bphigh: 30.8, diabetes: 10.6, obesity: 31.3, csmoking: 13.9, lpa: 22.8 };
export const EPA_PM25 = 9;
const WHO_PM25 = 5;
const HOT_DAY_F = 90;

const AQI_BANDS = [
  { max: 50, label: { en: "Good", es: "Buena" }, cls: "good" },
  { max: 100, label: { en: "Moderate", es: "Moderada" }, cls: "warn" },
  { max: 150, label: { en: "Unhealthy for sensitive groups", es: "Dañina para grupos sensibles" }, cls: "bad" },
  { max: 200, label: { en: "Unhealthy", es: "Dañina" }, cls: "bad" },
  { max: Infinity, label: { en: "Very unhealthy", es: "Muy dañina" }, cls: "bad" }
];

const FACTORS = {
  bphigh: { en: "High blood pressure", es: "Presión alta" },
  diabetes: { en: "Diabetes", es: "Diabetes" },
  obesity: { en: "Obesity", es: "Obesidad" },
  csmoking: { en: "Smoking", es: "Fumar" },
  lpa: { en: "No exercise in free time", es: "Sin ejercicio en tiempo libre" }
};

let els = {};
let data = null;

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function fetchAir(lat, lon) {
  const params = new URLSearchParams({ latitude: lat, longitude: lon, current: "us_aqi,pm2_5", hourly: "pm2_5", past_days: "7", forecast_days: "1", timezone: "auto" });
  const json = await getJson(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
  const hourly = (json.hourly?.pm2_5 || []).filter((v) => typeof v === "number");
  return { aqi: json.current?.us_aqi ?? null, pm25Avg: hourly.length ? hourly.reduce((a, b) => a + b, 0) / hourly.length : null };
}

async function fetchHeat(lat, lon) {
  const params = new URLSearchParams({ latitude: lat, longitude: lon, daily: "temperature_2m_max", temperature_unit: "fahrenheit", forecast_days: "7", timezone: "auto" });
  const json = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  const highs = json.daily?.temperature_2m_max || [];
  return { maxHigh: highs.length ? Math.max(...highs) : null, hotDays: highs.filter((v) => v >= HOT_DAY_F).length };
}

async function fetchPlaces(zip) {
  const rows = await getJson(`${PLACES_ZCTA}?zcta5=${zip}`);
  const row = rows[0];
  if (!row) return null;
  const pick = (key) => (row[`${key}_crudeprev`] !== undefined ? Number(row[`${key}_crudeprev`]) : null);
  return { population: Number(row.totalpopulation) || null, kidney: pick("kidney"), bphigh: pick("bphigh"), diabetes: pick("diabetes"), obesity: pick("obesity"), csmoking: pick("csmoking"), lpa: pick("lpa") };
}

function unavailable(iconName, title) {
  return `<article class="env-card"><div class="env-label">${icon(iconName)}${t(title)}</div><p>${t({ en: "No data for this location right now.", es: "No hay datos para esta ubicación ahora." })}</p></article>`;
}

function airCard(air) {
  if (!air || air.aqi === null) return unavailable("wind", { en: "Air quality", es: "Calidad del aire" });
  const band = AQI_BANDS.find((b) => air.aqi <= b.max);
  const avg = air.pm25Avg;
  const advice = air.aqi > 100
    ? t({ en: "Exercise indoors today if you can.", es: "Haz ejercicio bajo techo hoy si puedes." })
    : avg !== null && avg > EPA_PM25
      ? t({ en: "This week has been above the EPA's yearly limit. On smoky days, exercise indoors.", es: "Esta semana superó el límite anual de la EPA. En días con humo, haz ejercicio bajo techo." })
      : t({ en: "Fine for outdoor activity right now.", es: "Bien para actividades al aire libre ahora." });
  return `<article class="env-card">
    <div class="env-label">${icon("wind")}${t({ en: "Air quality now", es: "Calidad del aire ahora" })}</div>
    <div class="env-value">${air.aqi}<small>AQI</small></div>
    <span class="tag ${band.cls}">${t(band.label)}</span>
    ${avg === null ? "" : `<p>${t({ en: "Fine particle average over the past week: {v} µg/m³. The EPA's yearly limit is {epa} and the WHO suggests {who}.", es: "Promedio de partículas finas en la última semana: {v} µg/m³. El límite anual de la EPA es {epa} y la OMS sugiere {who}." }, { v: formatNumber(avg, 1), epa: EPA_PM25, who: WHO_PM25 })}</p>`}
    <p>${advice}</p>
  </article>`;
}

function heatCard(heat) {
  if (!heat || heat.maxHigh === null) return unavailable("thermo", { en: "Heat", es: "Calor" });
  const hot = heat.hotDays > 0;
  return `<article class="env-card">
    <div class="env-label">${icon("thermo")}${t({ en: "Next 7 days", es: "Próximos 7 días" })}</div>
    <div class="env-value">${Math.round(heat.maxHigh)}°<small>F</small></div>
    <span class="tag ${hot ? "bad" : "good"}">${hot ? t({ en: "{n} days over 90°F", es: "{n} días de más de 90°F" }, { n: heat.hotDays }) : t({ en: "No extreme heat", es: "Sin calor extremo" })}</span>
    <p>${hot ? t({ en: "Drink water regularly on hot days, even before you feel thirsty.", es: "Bebe agua seguido en días calurosos, incluso antes de tener sed." }) : t({ en: "Mild weather this week.", es: "Clima templado esta semana." })}</p>
  </article>`;
}

function kidneyCard(places) {
  if (!places || places.kidney === null) return unavailable("kidney", { en: "Local kidney data", es: "Datos renales locales" });
  const diff = places.kidney - US_REFERENCE.kidney;
  return `<article class="env-card">
    <div class="env-label">${icon("kidney")}${t({ en: "Diagnosed here", es: "Diagnosticados aquí" })}</div>
    <div class="env-value">${formatNumber(places.kidney, 1)}%<small>${t({ en: "of adults", es: "de adultos" })}</small></div>
    <span class="tag ${diff > 0.2 ? "bad" : diff < -0.2 ? "good" : "info"}">${t({ en: "US average {v}%", es: "Promedio de EE. UU. {v}%" }, { v: US_REFERENCE.kidney })}</span>
    <p>${t({ en: "This only counts people who've been told they have kidney disease. Since most cases aren't diagnosed, the real share is likely several times higher.", es: "Esto solo cuenta a quienes saben que tienen enfermedad renal. Como la mayoría de los casos no están diagnosticados, la cifra real probablemente es varias veces mayor." })}</p>
  </article>`;
}

function factorsCard(places) {
  if (!places) return unavailable("heart", { en: "Local health", es: "Salud local" });
  const rows = Object.keys(FACTORS)
    .filter((key) => places[key] !== null && !Number.isNaN(places[key]))
    .map((key) => {
      const value = places[key];
      const ref = US_REFERENCE[key];
      const dir = value > ref + 0.5 ? "up" : value < ref - 0.5 ? "down" : "";
      return `<div class="compare-row"><span>${t(FACTORS[key])}</span><strong class="${dir}">${formatNumber(value, 1)}%</strong><span class="muted">US ${ref}%</span></div>`;
    })
    .join("");
  return `<article class="env-card">
    <div class="env-label">${icon("heart")}${t({ en: "Adults in your ZIP code", es: "Adultos en tu código postal" })}</div>
    <div class="compare">${rows}</div>
    <p class="fine" style="margin-top:4px">CDC PLACES 2023</p>
  </article>`;
}

function render() {
  if (!data) return;
  els.results.innerHTML = `
    <div class="env-place">${icon("pin")}${escapeHtml(data.place)}, ${escapeHtml(data.state)} ${escapeHtml(data.zip)}</div>
    ${airCard(data.air)}${heatCard(data.heat)}${kidneyCard(data.places)}${factorsCard(data.places)}`;
}

async function lookup(zip) {
  els.results.innerHTML = `<div class="env-place"><div class="loader"><span class="spinner"></span>${t({ en: "Looking up {zip}...", es: "Buscando {zip}..." }, { zip })}</div></div>`;
  let location;
  try {
    const json = await getJson(`https://api.zippopotam.us/us/${zip}`);
    const place = json.places[0];
    location = { place: place["place name"], state: place["state abbreviation"], lat: Number(place.latitude), lon: Number(place.longitude) };
  } catch {
    els.results.innerHTML = `<div class="env-place">${icon("alert")}${t({ en: "That ZIP code wasn't found. Please check it and try again.", es: "No encontramos ese código postal. Revísalo e inténtalo de nuevo." })}</div>`;
    return;
  }
  const [air, heat, places] = await Promise.allSettled([fetchAir(location.lat, location.lon), fetchHeat(location.lat, location.lon), fetchPlaces(zip)]);
  data = {
    zip,
    place: location.place,
    state: location.state,
    air: air.status === "fulfilled" ? air.value : null,
    heat: heat.status === "fulfilled" ? heat.value : null,
    places: places.status === "fulfilled" ? places.value : null,
    at: Date.now()
  };
  store.set("env", data);
  render();
  emit("environment");
}

export function getEnvironmentSummary() {
  return store.get("env");
}

export function init() {
  els = { form: document.getElementById("env-form"), input: document.getElementById("env-zip"), results: document.getElementById("env-results") };
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const zip = els.input.value.trim();
    if (!/^\d{5}$/.test(zip)) return els.input.focus();
    lookup(zip);
  });
  data = store.get("env");
  if (data?.zip) {
    els.input.value = data.zip;
    render();
  }
  document.addEventListener("langchange", render);
}
