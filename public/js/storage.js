const PREFIX = "reno.";

// Wrap browser storage safely
function makeStore(getArea) {
  return {
    get(key, fallback = null) {
      try {
        const raw = getArea().getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        getArea().setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        getArea().removeItem(PREFIX + key);
      } catch {
        return false;
      }
      return true;
    }
  };
}

// Kept across visits
export const store = makeStore(() => localStorage);

// Kept until tab closes
export const sessionStore = makeStore(() => sessionStorage);

export function clearAll() {
  for (const area of [localStorage, sessionStorage]) {
    try {
      Object.keys(area).filter((key) => key.startsWith(PREFIX)).forEach((key) => area.removeItem(key));
    } catch {
      continue;
    }
  }
}

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function lastDays(count, from = new Date()) {
  const days = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const day = new Date(from);
    day.setDate(from.getDate() - offset);
    days.push(day);
  }
  return days;
}

// Monday to Sunday
export function weekDays(from = new Date()) {
  const start = new Date(from);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function icon(name) {
  return `<svg aria-hidden="true"><use href="img/icons.svg#i-${name}"/></svg>`;
}

export function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function emit(source) {
  document.dispatchEvent(new CustomEvent("reno:update", { detail: { source } }));
}
