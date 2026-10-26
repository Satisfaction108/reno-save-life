import { searchFood } from "../lib/food.js";

// GET /api/food?q=bread
export default async function handler(req, res) {
  const query = String(req.query.q || "").slice(0, 80);
  if (!query.trim()) return res.status(400).json({ error: "missing_query" });
  try {
    const result = await searchFood(query);
    // Let Vercel cache repeat lookups
    res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || "lookup_failed" });
  }
}
