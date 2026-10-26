import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const usdaSearchUrl = "https://api.nal.usda.gov/fdc/v1/foods/search";

// USDA nutrient ID numbers
const NUTRIENT_IDS = {
  protein: 1003,
  energy: 1008,
  sugar: 2000,
  phosphorus: 1091,
  potassium: 1092,
  sodium: 1093
};

// Common names to USDA terms
const QUERY_ALIASES = {
  coke: "soft drink cola",
  pepsi: "soft drink cola",
  cola: "soft drink cola",
  soda: "soft drink cola",
  sprite: "soft drink lemon-lime",
  "diet coke": "soft drink cola diet",
  fries: "french fries",
  chips: "potato chips",
  burger: "hamburger",
  pasta: "pasta cooked",
  spaghetti: "spaghetti cooked",
  rice: "rice white cooked",
  bread: "bread white",
  milk: "milk whole",
  coffee: "coffee brewed",
  tea: "tea brewed",
  egg: "egg whole cooked",
  eggs: "egg whole cooked",
  chicken: "chicken breast roasted",
  beef: "beef ground cooked",
  pizza: "pizza cheese regular crust",
  bacon: "bacon cooked",
  ramen: "ramen noodle soup",
  boba: "bubble tea",
  tofu: "tofu",
  banana: "banana raw",
  apple: "apple raw",
  orange: "orange raw",
  potato: "potato baked",
  cheese: "cheese cheddar",
  yogurt: "yogurt plain",
  salad: "lettuce salad",
  water: "water tap"
};

const cache = new Map();
// Disk cache only when running locally
const cacheFile = process.env.VERCEL ? null : path.join(process.cwd(), "food-cache.json");

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
}

// Score how well food matches
function rankFood(food, tokens) {
  const description = food.description.toLowerCase();
  const words = tokenize(description);
  let score = 0;
  for (const token of tokens) {
    if (words.includes(token)) score += 10;
    else if (description.includes(token)) score += 4;
    else score -= 12;
  }
  if (words[0] === tokens[0]) score += 6;
  if (/\band\b/.test(description) && !tokens.includes("and")) score -= 8;
  if (/baby food|infant|formula/.test(description)) score -= 20;
  const negated = description.match(/\b(?:no|without)\s+([a-z]+)/);
  if (negated && tokens.includes(negated[1])) score -= 20;
  if (/topping from|as ingredient|from fast food|from restaurant/.test(description)) score -= 10;
  if (/glutinous|stuffed|dehydrated|powder|canned|frozen|dry mix/.test(description) && !tokens.some((token) => description.includes(token) && /glutinous|stuffed|dehydrated|powder|canned|frozen|dry/.test(token))) score -= 6;
  if (/\b(ns as to|nfs|no added fat|regular)\b/.test(description)) score += 2;
  if (food.dataType === "Survey (FNDDS)") score += 3;
  if (food.dataType === "Foundation") score += 2;
  score -= words.length * 0.6;
  return score;
}

function scoreMeasure(measure, foodWords) {
  const text = (measure.disseminationText || "").toLowerCase();
  let score = 0;
  const unit = text.match(/^1 ([a-z]+)/)?.[1];
  if (unit && foodWords.some((word) => word === unit || word === `${unit}s` || `${word}s` === unit)) score += 6;
  if (/quantity not specified/.test(text)) score -= 100;
  if (/\b(medium|regular)\b/.test(text)) score += 5;
  if (/^1 (cup|slice|can|bottle|serving|package|piece|sandwich|item|container|bowl|burger|taco|patty|egg|breast|link)\b/.test(text)) score += 3;
  if (/12 fl oz/.test(text)) score += 2;
  if (/mashed|chopped|diced|sliced|pieces|crumbled|pureed|cubes|grated|shredded/.test(text)) score -= 4;
  if (/\b(small|large|extra|jumbo|thin|thick|mini)\b/.test(text)) score -= 2;
  if (measure.gramWeight > 600) score -= 3;
  return score;
}

// Pick a natural serving size
function pickServing(food) {
  const measures = (food.foodMeasures || []).filter((m) => m.gramWeight > 0);
  if (!measures.length) return { label: "100 g", grams: 100 };
  const foodWords = tokenize(food.description);
  const measure = measures
    .map((m, index) => ({ m, score: scoreMeasure(m, foodWords) - index * 0.01 }))
    .sort((a, b) => b.score - a.score)[0].m;
  if (/quantity not specified/i.test(measure.disseminationText || "")) return { label: `${Math.round(measure.gramWeight)} g`, grams: measure.gramWeight };
  return { label: measure.disseminationText || `${measure.gramWeight} g`, grams: measure.gramWeight };
}

function summarizeFood(food) {
  const per100 = {};
  for (const [key, id] of Object.entries(NUTRIENT_IDS)) {
    const nutrient = (food.foodNutrients || []).find((n) => n.nutrientId === id);
    per100[key] = nutrient ? Number(nutrient.value) || 0 : 0;
  }
  const serving = pickServing(food);
  const factor = serving.grams / 100;
  const perServing = Object.fromEntries(
    Object.entries(per100).map(([key, value]) => [key, Math.round(value * factor * 10) / 10])
  );
  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    serving,
    per100,
    perServing
  };
}

// Saved lookups survive restarts
export async function loadCache() {
  if (!cacheFile) return;
  try {
    const saved = JSON.parse(await readFile(cacheFile, "utf8"));
    for (const [key, value] of Object.entries(saved)) cache.set(key, value);
  } catch {
    return;
  }
}

let saveTimer;
function scheduleCacheSave() {
  if (!cacheFile) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    writeFile(cacheFile, JSON.stringify(Object.fromEntries(cache))).catch(() => {});
  }, 1000);
}

// Retry flaky USDA errors
async function usdaSearch(searchTerm) {
  const params = new URLSearchParams({
    api_key: process.env.USDA_API_KEY || "DEMO_KEY",
    query: searchTerm,
    pageSize: "25",
    dataType: "Survey (FNDDS),Foundation,SR Legacy"
  });
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch(`${usdaSearchUrl}?${params}`);
    if (response.ok || response.status === 429 || (response.status !== 400 && response.status < 500)) break;
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  if (response.status === 429) {
    const error = new Error("rate_limited");
    error.status = 429;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`usda_${response.status}`);
    error.status = 502;
    throw error;
  }
  return response.json();
}

export async function searchFood(query) {
  const normalized = query.trim().toLowerCase();
  const searchTerm = QUERY_ALIASES[normalized] || normalized;
  if (cache.has(searchTerm)) return { ...cache.get(searchTerm), query };

  let data;
  try {
    data = await usdaSearch(searchTerm);
  } catch (error) {
    if (error.status === 429 || searchTerm === normalized) throw error;
    data = await usdaSearch(normalized);
  }
  const tokens = tokenize(searchTerm);
  const ranked = (data.foods || [])
    .map((food) => ({ food, score: rankFood(food, tokens) }))
    .sort((a, b) => b.score - a.score);

  const result = ranked.length ? { query, match: summarizeFood(ranked[0].food) } : { query, match: null };
  cache.set(searchTerm, result);
  scheduleCacheSave();
  return result;
}
