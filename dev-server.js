import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchFood, loadCache } from "./lib/food.js";
import { loadMedNames, suggestMeds, matchWords } from "./lib/meds.js";

// Local server, same as Vercel
const app = express();
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.static(path.join(rootDir, "public"), { extensions: ["html"], maxAge: 0 }));

app.get("/api/food", async (req, res) => {
  const query = String(req.query.q || "").slice(0, 80);
  if (!query.trim()) return res.status(400).json({ error: "missing_query" });
  try {
    res.json(await searchFood(query));
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "lookup_failed" });
  }
});

app.get("/api/meds", (req, res) => {
  res.json({ names: suggestMeds(String(req.query.q || "").slice(0, 60)) });
});

app.get("/api/meds-match", (req, res) => {
  const words = String(req.query.words || "").split(",").filter(Boolean);
  res.json({ matches: matchWords(words) });
});

await loadCache();
await loadMedNames();

app.listen(port, () => {
  console.log(`RENO Save Life running at http://localhost:${port}`);
  if (!process.env.USDA_API_KEY) console.log("Using USDA DEMO_KEY. Set USDA_API_KEY for higher limits.");
});
