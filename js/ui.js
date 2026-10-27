// Small helpers for DOM, dialogs and formatting.

export const $ = (selector, root = document) => root.querySelector(selector);

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let toastTimer = 0;

export function toast(text, ms = 2600) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

// A sheet that slides up from the bottom. html is trusted markup built by
// the app; title, text and button labels are escaped. Resolves with the
// value of the tapped button, or null when the sheet is dismissed.
export function sheet({ title, text = "", html = "", buttons = [] }) {
  const dialog = $("#sheet");
  dialog.innerHTML = `
    <form method="dialog" class="sheet-body">
      <h2>${escapeHtml(title)}</h2>
      ${text ? `<p>${escapeHtml(text)}</p>` : ""}
      ${html}
      <div class="sheet-buttons">
        ${buttons
          .map((b) => `<button value="${escapeHtml(b.value)}" class="btn ${b.kind || ""}">${escapeHtml(b.label)}</button>`)
          .join("")}
      </div>
    </form>`;
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => {
        resolve(dialog.returnValue && dialog.returnValue !== "cancel" ? dialog.returnValue : null);
        dialog.innerHTML = "";
      },
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
      { value: "cancel", label: "Cancel", kind: "ghost" },
    ],
  });
  return answer === "ok";
}

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "short" });
const timeOfDay = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

export const formatLongDate = (date) => longDate.format(date);
export const formatShortDate = (date) => shortDate.format(date);
export const formatMonth = (date) => monthName.format(date);
export const formatTime = (date) => timeOfDay.format(date);

export function relativeDay(ts) {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return shortDate.format(date);
}
