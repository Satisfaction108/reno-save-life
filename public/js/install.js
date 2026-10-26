import { store, icon } from "./storage.js";
import { t } from "./i18n.js";

let deferredPrompt = null;

// Android hands us this early
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  document.dispatchEvent(new CustomEvent("reno:installable"));
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  store.set("installChoice", "installed");
  closeSheet();
});

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (location.protocol !== "https:" && !local) return;
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function platform() {
  const ua = navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return window.matchMedia("(pointer: coarse) and (max-width: 900px)").matches ? "mobile" : "desktop";
}

// Steps or button per phone
function bodyHtml() {
  const kind = platform();
  if (deferredPrompt) {
    return `<p>${t({ en: "Install RENO on your phone. It opens full screen from your home screen, like any other app.", es: "Instala RENO en tu teléfono. Se abre en pantalla completa desde tu pantalla de inicio, como cualquier app." })}</p>
      <div class="install-actions">
        <button type="button" class="btn btn-primary" data-install>${icon("down")}<span>${t({ en: "Install app", es: "Instalar app" })}</span></button>
        <button type="button" class="btn btn-ghost" data-web>${t({ en: "Keep using the website", es: "Seguir en el sitio web" })}</button>
      </div>`;
  }
  const steps = kind === "ios"
    ? [
        { en: "Tap the Share button {share} at the bottom of Safari (or the top in Chrome).", es: "Toca el botón Compartir {share} abajo en Safari (o arriba en Chrome)." },
        { en: "Scroll down and tap \"Add to Home Screen\".", es: "Desliza y toca \"Agregar a inicio\"." },
        { en: "Tap \"Add\". RENO will appear on your home screen.", es: "Toca \"Agregar\". RENO aparecerá en tu pantalla de inicio." }
      ]
    : [
        { en: "Open your browser menu (the ⋮ button).", es: "Abre el menú del navegador (el botón ⋮)." },
        { en: "Tap \"Install app\" or \"Add to Home screen\".", es: "Toca \"Instalar app\" o \"Agregar a pantalla de inicio\"." },
        { en: "Confirm, and RENO will appear with your other apps.", es: "Confirma y RENO aparecerá con tus otras apps." }
      ];
  const note = kind === "ios"
    ? `<p class="fine">${t({ en: "On iPhone, the app keeps its own saved data, separate from Safari. Start your check-up in the app to keep everything in one place.", es: "En iPhone, la app guarda sus propios datos, separados de Safari. Empieza tu chequeo en la app para tener todo en un lugar." })}</p>`
    : "";
  return `<ol class="install-steps">${steps.map((step) => `<li>${t(step, { share: `<span class="share-glyph">${icon("share")}</span>` })}</li>`).join("")}</ol>
    ${note}
    <div class="install-actions"><button type="button" class="btn btn-ghost" data-web>${t({ en: "Keep using the website", es: "Seguir en el sitio web" })}</button></div>`;
}

function closeSheet() {
  document.getElementById("install-sheet")?.remove();
}

export function openSheet() {
  closeSheet();
  const sheet = document.createElement("div");
  sheet.id = "install-sheet";
  sheet.className = "install-sheet";
  sheet.innerHTML = `
    <div class="install-backdrop" data-web></div>
    <section class="install-panel" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <div class="install-head">
        <img src="img/icon-192.png" alt="" width="56" height="56">
        <div><h2 id="install-title">${t({ en: "Get the RENO app", es: "Descarga la app de RENO" })}</h2><p class="fine" style="margin:2px 0 0">${t({ en: "Free · no account · works offline for reading", es: "Gratis · sin cuenta · funciona sin conexión para leer" })}</p></div>
        <button type="button" class="icon-only" data-web aria-label="${t({ en: "Close", es: "Cerrar" })}">${icon("close")}</button>
      </div>
      ${bodyHtml()}
    </section>`;
  document.body.appendChild(sheet);
  sheet.querySelectorAll("[data-web]").forEach((el) => el.addEventListener("click", () => {
    store.set("installChoice", "web");
    closeSheet();
  }));
  sheet.querySelector("[data-install]")?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    store.set("installChoice", outcome === "accepted" ? "installed" : "web");
    closeSheet();
  });
  sheet.querySelector(".install-panel button")?.focus();
}

// Ask once on phones
export function maybeOfferInstall() {
  if (isStandalone() || store.get("installChoice")) return;
  if (platform() === "desktop") return;
  setTimeout(() => {
    if (!document.getElementById("install-sheet")) openSheet();
  }, 1200);
}

// Card on the home page
export function installCardHtml() {
  if (isStandalone()) return "";
  const desktop = platform() === "desktop";
  return `<div class="install-card">
    <img src="img/icon-192.png" alt="" width="64" height="64">
    <div>
      <h3>${t({ en: "Use RENO as an app", es: "Usa RENO como app" })}</h3>
      <p>${desktop
        ? t({ en: "Open this site on your phone to install RENO on your home screen. It works on Android and iPhone.", es: "Abre este sitio en tu teléfono para instalar RENO en tu pantalla de inicio. Funciona en Android y iPhone." })
        : t({ en: "Install RENO on your home screen so it's one tap away when you log your meals each day.", es: "Instala RENO en tu pantalla de inicio para tenerlo a un toque cuando registres tus comidas." })}</p>
    </div>
    ${desktop ? "" : `<button type="button" class="btn btn-primary" data-open-install>${icon("down")}<span>${t({ en: "Get the app", es: "Descargar la app" })}</span></button>`}
  </div>`;
}
