// Små hjælpere til DOM, beskeder og dialoger.

export const $ = (selector, root = document) => root.querySelector(selector);

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Viser **fed** og *kursiv* (fx *vifter med antennerne*) og linjeskift.
export function formatMessage(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(?!\s)(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

let toastTimer = 0;

export function toast(text, ms = 2600) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

// Viser et ark nederst på skærmen med knapper. Returnerer værdien af den
// valgte knap eller null, hvis arket lukkes.
export function sheet({ title, text = "", buttons }) {
  const dialog = $("#sheet");
  dialog.innerHTML = `
    <form method="dialog" class="sheet-body">
      <h2>${escapeHtml(title)}</h2>
      ${text ? `<p>${escapeHtml(text)}</p>` : ""}
      <div class="sheet-buttons">
        ${buttons
          .map(
            (b) =>
              `<button value="${escapeHtml(b.value)}" class="btn ${b.kind || ""}">${escapeHtml(b.label)}</button>`,
          )
          .join("")}
      </div>
    </form>`;
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue && dialog.returnValue !== "cancel" ? dialog.returnValue : null),
      { once: true },
    );
    dialog.returnValue = "";
    dialog.showModal();
  });
}

export async function confirmSheet(title, text, okLabel = "OK", kind = "primary") {
  const answer = await sheet({
    title,
    text,
    buttons: [
      { value: "ok", label: okLabel, kind },
      { value: "cancel", label: "Annullér", kind: "ghost" },
    ],
  });
  return answer === "ok";
}

const usdFormat = new Intl.NumberFormat("da-DK", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function formatUSD(value) {
  return usdFormat.format(value);
}

const dayFormat = new Intl.DateTimeFormat("da-DK", { weekday: "long", day: "numeric", month: "long" });
const timeFormat = new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit" });

export function dayLabel(ts) {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "I dag";
  if (date.toDateString() === yesterday.toDateString()) return "I går";
  const label = dayFormat.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function timeLabel(ts) {
  return timeFormat.format(new Date(ts));
}
