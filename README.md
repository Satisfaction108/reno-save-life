# RENO Save Life

**Renal Enterology Nephrology Optimization.** A web app that helps people in the San Francisco Bay Area, and anywhere in the US, understand chronic kidney disease (CKD) and build daily habits that protect their kidneys.

About 1 in 7 US adults has CKD, and about 9 in 10 of them don't know it. RENO turns that statistic into something personal: a risk check, daily tracking, and a plan.

## How it works

The app is a step-by-step check-up, with one page per step:

1. **Diet** (`diet.html`): log foods for breakfast, lunch, a mid-day snack and dinner. Each food is looked up in USDA FoodData Central and rated for sodium, phosphorus, potassium and protein. A daily tracker and a 7-day sodium chart sit on the left.
2. **Exercise** (`exercise.html`): log any of 39 activities by day. Progress is tracked toward 150 minutes a week, with vigorous activity counting double.
3. **Medicines** (`medication.html`): add medicines by name or by scanning a label, or say you take none. Uses NIH RxNorm and openFDA.
4. **Your area** (`environment.html`): enter a ZIP code to see live air quality, heat and CDC PLACES health data.
5. **Health** (`health.html`): SCORED health-history questions, recent symptoms and daily habits.
6. **Score and plan** (`results.html`): a kidney risk score out of 100 (lower is better), a breakdown by area, ranked steps to lower it, a weekly movement plan built from the activities you already do, foods to eat more of and cut back on, and which tests to ask a doctor for.

The site also has:

- a home page (`index.html`)
- a reference page (`numbers.html`) explaining eGFR, ACR, blood pressure, A1C and BMI
- a kidney donation page (`donate.html`) covering who donation helps, how living donation works, what transplant centers look for, common myths and links to national and Bay Area organizations

Age range and sex are asked once and shared across pages. They set daily nutrient targets (USDA/NASEM values for sodium, protein, potassium and phosphorus) and the weekly exercise goal: 150 minutes for adults, 60 minutes a day for ages 9–18.

The Medicines page has a **Try a sample one** button, which runs the label scanner on `public/img/sample-prescription.png`, so you can demo it without a real prescription.

### Score (0–100, lower is better)

| Area | Max points | Based on |
| --- | --- | --- |
| Health history | 30 | SCORED items (age, sex, anemia, blood pressure, diabetes, heart disease, circulation, protein in urine) plus family history |
| Symptoms | 15 | Swelling, foamy or bloody urine, changes in urination, tiredness and more |
| Diet | 15 | Average logged sodium and flagged foods, or estimated from habits if no meals are logged |
| Daily habits | 15 | Smoking, alcohol, water, sleep, sitting, check-ups |
| Exercise | 10 | Minutes in the last 7 days |
| Medicines | 10 | Medicines with kidney cautions and frequent painkiller use |
| Your area | 5 | Air pollution, heat and local kidney disease rates |

Entries are saved in the browser's `localStorage`, so they are still there when someone comes back on the same device.

## Privacy

- No accounts, no analytics, no tracking.
- Diet, exercise and plan answers are stored only in the browser (`localStorage`).
- The medicine list is kept only until the tab closes, unless the user ticks "Keep my list after I close the browser".
- Prescription photos are read with Tesseract.js **inside the browser**. The image is never uploaded.
- The only request that goes through our server is the food lookup, so the USDA API key stays secret.

## Tech stack

- Plain HTML, CSS and JavaScript (ES modules), with no framework or build step
- A small Node.js + Express server (`server.js`) that serves the site and proxies USDA FoodData Central
- Hosted on Render

## Run it locally

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. Get a free USDA API key at https://fdc.nal.usda.gov/api-key-signup (it arrives by email in about a minute).
3. In this folder, run:

```bash
npm install
```

```bash
cp .env.example .env
```

4. Open `.env` and paste your key after `USDA_API_KEY=`.
5. Start the server:

```bash
npm run dev
```

6. Open http://localhost:3000.

Without a key, the app uses USDA's shared `DEMO_KEY`, which allows only about 10 food lookups per hour.

## Deploy to Render (free)

1. Push this folder to a GitHub repository.
2. On https://render.com, choose **New → Web Service** and connect the repository.
3. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
4. Under **Environment**, add `USDA_API_KEY` (your key) and `NODE_ENV` = `production`.
5. Deploy. Your site will be at `https://<your-service-name>.onrender.com`. For example, name the service `renosavelife`.

Render's free web services go to sleep after about 15 minutes without visitors, and the first visit afterward takes 30–60 seconds. Open the site a minute before anyone judges or demos it.

## Project structure

```
server.js                 Express server, USDA food lookup, medicine name search
public/*.html             One page per step, plus home and numbers
public/css/styles.css     Design tokens, layout, light and dark themes
public/js/app.js          Loads the right script for each page
public/js/layout.js       Header, step bar, back and next buttons, footer
public/js/score.js        Works out the score out of 100
public/js/pages/          One script per page
public/js/storage.js      Browser storage helpers
public/js/i18n.js         English and Spanish
public/img/               Logo and icon sprite
public/data/              Medicine cautions, exercises, food flags, Spanish text
```

## Sources

- CDC. *Chronic Kidney Disease in the United States, 2023.*
- CDC PLACES: Local Data for Better Health, 2023 release (county and ZIP code data).
- GBD 2023 Chronic Kidney Disease Collaborators. *The Lancet*, 2025.
- United States Renal Data System (USRDS) Annual Data Report.
- Bang H, et al. "SCreening for Occult REnal Disease (SCORED): a simple prediction model for chronic kidney disease." *Archives of Internal Medicine*, 2007;167(4):374–381.
- Bowe B, et al. "Particulate matter air pollution and the risk of incident CKD." *Clinical Journal of the American Society of Nephrology*, 2018.
- National Kidney Foundation, KDIGO, American Heart Association, American Diabetes Association.

## Disclaimer

RENO provides general health education. It is not medical advice and does not diagnose disease.
