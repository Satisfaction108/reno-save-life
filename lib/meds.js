import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

// Medicine names from RxNorm
const medNamesFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "med-names.json");
let medNames = [];
let singleNames = [];

function prettyName(name) {
  return name
    .split(" / ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" / ");
}

let loading = null;

// Load list once per instance
export function loadMedNames() {
  if (!loading) loading = readMedNames();
  return loading;
}

async function readMedNames() {
  let terms;
  try {
    terms = JSON.parse(await readFile(medNamesFile, "utf8"));
  } catch {
    try {
      const response = await fetch("https://rxnav.nlm.nih.gov/REST/displaynames.json");
      terms = (await response.json()).displayTermsList.term;
    } catch {
      terms = [];
    }
  }
  const seen = new Set();
  medNames = [];
  for (const term of terms) {
    const lower = term.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    medNames.push({ lower, display: prettyName(term), single: !lower.includes(" / ") });
  }
  singleNames = medNames.filter((name) => name.single && !name.lower.includes(" "));
}

// Widely used medicines rank first
const COMMON_MEDS = `ibuprofen advil motrin naproxen aleve acetaminophen tylenol aspirin excedrin lisinopril losartan amlodipine metoprolol
atorvastatin lipitor simvastatin rosuvastatin crestor pravastatin metformin glipizide insulin lantus ozempic semaglutide jardiance empagliflozin
farxiga dapagliflozin trulicity mounjaro tirzepatide levothyroxine synthroid omeprazole prilosec pantoprazole esomeprazole nexium famotidine pepcid
hydrochlorothiazide furosemide lasix spironolactone carvedilol valsartan olmesartan irbesartan benazepril enalapril ramipril warfarin eliquis
apixaban xarelto rivaroxaban clopidogrel plavix gabapentin sertraline zoloft escitalopram lexapro fluoxetine prozac citalopram bupropion
wellbutrin trazodone duloxetine venlafaxine alprazolam xanax lorazepam clonazepam zolpidem montelukast singulair albuterol fluticasone flonase
cetirizine zyrtec loratadine claritin fexofenadine allegra diphenhydramine benadryl prednisone amoxicillin augmentin azithromycin ciprofloxacin
doxycycline cephalexin nitrofurantoin bactrim valacyclovir acyclovir tramadol oxycodone hydrocodone meloxicam celecoxib celebrex diclofenac
cyclobenzaprine methotrexate lithium allopurinol tamsulosin finasteride sildenafil cholecalciferol melatonin creatine adderall methylphenidate
ritalin concerta vyvanse lisdexamfetamine ondansetron zofran loperamide imodium docusate miralax estradiol testosterone finerenone tenofovir entresto`
  .split(/\s+/);
const commonRank = new Map(COMMON_MEDS.map((name, index) => [name, index]));

// Prefix search, common first
export function suggestMeds(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rank = (name) => (commonRank.has(name.lower) ? commonRank.get(name.lower) : 10000);
  return medNames
    .filter((name) => name.lower.startsWith(q))
    .sort((a, b) => rank(a) - rank(b) || Number(b.lower === q) - Number(a.lower === q) || Number(b.single) - Number(a.single) || a.lower.length - b.lower.length)
    .slice(0, 8)
    .map((name) => name.display);
}

function editDistance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > limit) return limit + 1;
    prev = row;
  }
  return prev[b.length];
}

// Match OCR words, allow typos
export function matchWords(words) {
  const found = new Map();
  for (const raw of words.slice(0, 60)) {
    const word = raw.toLowerCase().replace(/[^a-z]/g, "");
    if (word.length < 5) continue;
    const limit = word.length >= 8 ? 2 : 1;
    let best = null;
    for (const name of singleNames) {
      if (name.lower.length < 5) continue;
      const distance = name.lower === word ? 0 : editDistance(word, name.lower, limit);
      if (distance <= limit && (!best || distance < best.distance)) best = { name, distance };
      if (distance === 0) break;
    }
    if (best) found.set(best.name.lower, { name: best.name.display, from: raw, exact: best.distance === 0 });
  }
  return [...found.values()];
}
