import { icon, escapeHtml } from "../storage.js";
import { t } from "../i18n.js";

// Reference ranges for adults
const CARDS = [
  {
    icon: "flask",
    wide: true,
    title: { en: "eGFR", es: "TFGe (eGFR)" },
    sub: { en: "Blood test · how well your kidneys filter", es: "Análisis de sangre · qué tan bien filtran tus riñones" },
    text: { en: "Worked out from a creatinine blood test, your age and your sex. It's measured in mL/min/1.73m². US labs stopped using race in this calculation in 2021.", es: "Se calcula con un análisis de creatinina, tu edad y tu sexo. Se mide en mL/min/1.73m². Desde 2021 los laboratorios de EE. UU. ya no usan la raza en el cálculo." },
    rows: [
      { level: "g", range: "90 +", text: { en: "Stage 1. Normal, unless other tests show damage", es: "Etapa 1. Normal, salvo que otras pruebas muestren daño" } },
      { level: "g", range: "60 – 89", text: { en: "Stage 2. Slightly lower", es: "Etapa 2. Un poco más baja" } },
      { level: "y", range: "45 – 59", text: { en: "Stage 3a. Mild to moderate loss", es: "Etapa 3a. Pérdida leve a moderada" } },
      { level: "o", range: "30 – 44", text: { en: "Stage 3b. Moderate to severe loss", es: "Etapa 3b. Pérdida moderada a grave" } },
      { level: "r", range: "15 – 29", text: { en: "Stage 4. Severe loss", es: "Etapa 4. Pérdida grave" } },
      { level: "dr", range: "< 15", text: { en: "Stage 5. Kidney failure", es: "Etapa 5. Insuficiencia renal" } }
    ],
    tip: { en: "One low result isn't a diagnosis. CKD means the number stays low for 3 months or more.", es: "Un solo resultado bajo no es un diagnóstico. La ERC es cuando el número sigue bajo por 3 meses o más." }
  },
  {
    icon: "drop",
    wide: true,
    title: { en: "Urine ACR", es: "ACR en orina" },
    sub: { en: "Urine test · protein leaking from the kidneys", es: "Análisis de orina · proteína que se escapa de los riñones" },
    text: { en: "Albumin is a protein that should stay in your blood. If your kidneys' filters are damaged, some leaks into your urine. This often shows up before eGFR drops.", es: "La albúmina es una proteína que debe quedarse en la sangre. Si los filtros del riñón están dañados, una parte pasa a la orina. Esto suele aparecer antes de que baje la TFGe." },
    rows: [
      { level: "g", range: "< 30 mg/g", text: { en: "Normal", es: "Normal" } },
      { level: "y", range: "30 – 300 mg/g", text: { en: "Moderately high. An early sign of damage", es: "Moderadamente alta. Una señal temprana de daño" } },
      { level: "r", range: "> 300 mg/g", text: { en: "Very high", es: "Muy alta" } }
    ],
    tip: { en: "If you have diabetes or high blood pressure, this should be checked every year.", es: "Si tienes diabetes o presión alta, esto debería revisarse cada año." }
  },
  {
    icon: "heart",
    title: { en: "Blood pressure", es: "Presión arterial" },
    sub: { en: "mmHg · top number / bottom number", es: "mmHg · número de arriba / de abajo" },
    text: { en: "High blood pressure damages the small blood vessels in the kidneys. Damaged kidneys then push blood pressure even higher.", es: "La presión alta daña los vasos pequeños de los riñones. Los riñones dañados suben todavía más la presión." },
    rows: [
      { level: "g", range: "< 120 / < 80", text: { en: "Normal", es: "Normal" } },
      { level: "y", range: "120–129 / < 80", text: { en: "Elevated", es: "Elevada" } },
      { level: "o", range: "130–139 / 80–89", text: { en: "High, stage 1", es: "Alta, etapa 1" } },
      { level: "r", range: "140+ / 90+", text: { en: "High, stage 2", es: "Alta, etapa 2" } },
      { level: "dr", range: "180+ / 120+", text: { en: "Get care right away", es: "Busca atención de inmediato" } }
    ],
    tip: { en: "Sit quietly for 5 minutes with your arm supported before measuring.", es: "Siéntate tranquilo 5 minutos con el brazo apoyado antes de medir." }
  },
  {
    icon: "sugar",
    title: { en: "Blood sugar and A1C", es: "Azúcar y A1C" },
    sub: { en: "Fasting glucose (mg/dL) · A1C (%)", es: "Glucosa en ayunas (mg/dL) · A1C (%)" },
    text: { en: "High blood sugar slowly damages the kidneys' filters. A1C shows your average blood sugar over the past 2 to 3 months.", es: "El azúcar alta daña poco a poco los filtros del riñón. La A1C muestra tu promedio de los últimos 2 a 3 meses." },
    rows: [
      { level: "g", range: "< 100 · < 5.7%", text: { en: "Normal", es: "Normal" } },
      { level: "y", range: "100–125 · 5.7–6.4%", text: { en: "Prediabetes", es: "Prediabetes" } },
      { level: "r", range: "126+ · 6.5%+", text: { en: "Diabetes", es: "Diabetes" } }
    ],
    tip: { en: "About 1 in 3 US adults has prediabetes and most don't know it.", es: "Cerca de 1 de cada 3 adultos en EE. UU. tiene prediabetes y la mayoría no lo sabe." }
  },
  {
    icon: "scale",
    title: { en: "BMI", es: "IMC" },
    sub: { en: "Weight compared with height", es: "Peso según la estatura" },
    text: { en: "Extra weight raises the risk of diabetes and high blood pressure. BMI is only a rough guide and doesn't account for muscle.", es: "El peso extra aumenta el riesgo de diabetes y presión alta. El IMC es solo una guía aproximada y no tiene en cuenta el músculo." },
    rows: [
      { level: "y", range: "< 18.5", text: { en: "Underweight", es: "Bajo peso" } },
      { level: "g", range: "18.5 – 24.9", text: { en: "Healthy range", es: "Rango saludable" } },
      { level: "o", range: "25 – 29.9", text: { en: "Overweight", es: "Sobrepeso" } },
      { level: "r", range: "30 +", text: { en: "Obesity", es: "Obesidad" } }
    ],
    tip: { en: "For many Asian American adults, diabetes risk starts rising at a BMI of 23.", es: "Para muchos adultos asiático-americanos, el riesgo de diabetes sube desde un IMC de 23." }
  }
];

function render() {
  document.getElementById("num-grid").innerHTML = CARDS.map((card) => `<article class="num-card${card.wide ? " wide" : ""}">
    <div class="num-head"><span class="num-icon">${icon(card.icon)}</span><div><h3>${escapeHtml(t(card.title))}</h3><div class="num-sub">${escapeHtml(t(card.sub))}</div></div></div>
    <p>${escapeHtml(t(card.text))}</p>
    <table class="range-table"><tbody>${card.rows.map((row) => `<tr><td><span class="lvl ${row.level}" aria-hidden="true"></span>${escapeHtml(row.range)}</td><td>${escapeHtml(t(row.text))}</td></tr>`).join("")}</tbody></table>
    <p class="num-tip">${escapeHtml(t(card.tip))}</p>
  </article>`).join("");
}

export function init() {
  render();
  document.addEventListener("langchange", render);
}
