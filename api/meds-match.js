import { loadMedNames, matchWords } from "../lib/meds.js";

// GET /api/meds-match?words=a,b
export default async function handler(req, res) {
  await loadMedNames();
  const words = String(req.query.words || "").split(",").filter(Boolean);
  return res.status(200).json({ matches: matchWords(words) });
}
