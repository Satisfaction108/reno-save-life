import { loadMedNames, suggestMeds } from "../lib/meds.js";

// GET /api/meds?q=ibu
export default async function handler(req, res) {
  await loadMedNames();
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  return res.status(200).json({ names: suggestMeds(String(req.query.q || "").slice(0, 60)) });
}
