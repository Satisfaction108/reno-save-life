import { store } from "./storage.js";
import { t } from "./i18n.js";

export const AGE_BANDS = [
  { value: "9-13", label: { en: "9–13", es: "9–13" } },
  { value: "14-18", label: { en: "14–18", es: "14–18" } },
  { value: "19-30", label: { en: "19–30", es: "19–30" } },
  { value: "31-49", label: { en: "31–49", es: "31–49" } },
  { value: "50-59", label: { en: "50–59", es: "50–59" } },
  { value: "60-69", label: { en: "60–69", es: "60–69" } },
  { value: "70+", label: { en: "70+", es: "70+" } }
];

export const SEX_OPTIONS = [
  { value: "female", label: { en: "Female", es: "Femenino" } },
  { value: "male", label: { en: "Male", es: "Masculino" } },
  { value: "skip", label: { en: "Prefer not to say", es: "Prefiero no decir" } }
];

export function loadProfile() {
  return store.get("profile", {});
}

export function saveProfile(changes) {
  const next = { ...loadProfile(), ...changes };
  store.set("profile", next);
  return next;
}

export function isYouth(profile = loadProfile()) {
  return profile.age === "9-13" || profile.age === "14-18";
}

// Daily targets by age and sex
export function targets(profile = loadProfile()) {
  const age = profile.age || "31-49";
  const sex = profile.sex || "skip";
  const pick = (female, male) => (sex === "female" ? female : sex === "male" ? male : Math.round((female + male) / 2));
  let sodium = 2300;
  let potassium;
  let phosphorus;
  let protein;
  if (age === "9-13") {
    sodium = 1800;
    potassium = pick(2300, 2500);
    phosphorus = 1250;
    protein = 34;
  } else if (age === "14-18") {
    potassium = pick(2300, 3000);
    phosphorus = 1250;
    protein = pick(46, 52);
  } else {
    potassium = pick(2600, 3400);
    phosphorus = 700;
    protein = pick(46, 56);
  }
  return { sodium, potassium, phosphorus, protein, exerciseGoal: isYouth(profile) ? 420 : 150 };
}

export function profileLabel(profile = loadProfile()) {
  const age = AGE_BANDS.find((band) => band.value === profile.age);
  const sex = SEX_OPTIONS.find((option) => option.value === profile.sex);
  if (!age) return "";
  return `${t({ en: "ages", es: "edad" })} ${t(age.label)}${sex && sex.value !== "skip" ? `, ${t(sex.label).toLowerCase()}` : ""}`;
}
