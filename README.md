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

## Phone app

RENO installs as an app on Android and iPhone straight from the website. It uses a web app manifest, a service worker that keeps pages working offline, and app icons. On a phone, visitors are offered **Install app** or **Keep using the website**. See [PUBLISHING.md](PUBLISHING.md) for Google Play and App Store steps.

## Privacy

- No accounts, no analytics, no tracking.
- Diet, exercise and plan answers are stored only in the browser (`localStorage`).
- The medicine list is kept only until the tab closes, unless the user ticks "Keep my list after I close the browser".
- Prescription photos are read with Tesseract.js **inside the browser**. The image is never uploaded.
- Food lookups go through our own function, so the USDA API key stays secret.

## Tech stack

- Plain HTML, CSS and JavaScript (ES modules), with no framework or build step
- Three small serverless functions: food lookup (USDA FoodData Central), medicine name search and prescription word matching (NIH RxNorm names)
- Hosted on Vercel: static files from `public/`, API routes as serverless functions in `api/`

## Run it locally

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. Get a free USDA API key at https://fdc.nal.usda.gov/api-key-signup.
3. Copy `.env.example` to `.env` and paste your key after `USDA_API_KEY=`.
4. Install and start:

```bash
npm install
```

```bash
npm run dev
```

5. Open http://localhost:3000.

## Deploy to Vercel (free)

1. Push this folder to a GitHub repository.
2. On https://vercel.com, sign in with GitHub and choose **Add New → Project**, then import the repository.
3. Leave the settings as they are. `vercel.json` already sets the output folder to `public` and turns off the build step.
4. Under **Environment Variables**, add `USDA_API_KEY` with your key.
5. Click **Deploy**. The site will be at `https://<project-name>.vercel.app`.

Every push to the `main` branch redeploys automatically. Vercel doesn't put the site to sleep, so it loads quickly every time.

## Project structure

```
api/                      Vercel functions: food, meds, meds-match
lib/                      Shared food and medicine search logic
lib/data/med-names.json   RxNorm medicine names for type-ahead
dev-server.js             Local server for testing
vercel.json               Vercel settings
public/*.html             One page per step, plus home and numbers
public/css/styles.css     Design tokens, layout, light and dark themes
public/js/app.js          Loads the right script for each page
public/js/layout.js       Header, step bar, back and next buttons, footer
public/js/score.js        Works out the score out of 100
public/js/pages/          One script per page
public/js/storage.js      Browser storage helpers
public/js/i18n.js         English and Spanish
public/img/               Logo, app icons and icon sprite
public/manifest.webmanifest  App name, icons and colors for installing
public/sw.js              Service worker for offline use
public/js/install.js      Install prompt for Android and iPhone
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
