// Al data ligger lokalt på telefonen i localStorage.

const KEY = "stjerneven.v1";
const MAX_STORED_MESSAGES = 600;

function defaults() {
  return {
    version: 1,
    onboarded: false,
    profile: { userName: "", friendName: "Pip", color: "mint", planetName: "Lumora" },
    settings: { apiKey: "", model: "claude-opus-5-5", speak: false },
    // { id, role: "user" | "assistant", text, ts, event?: true, skip?: true }
    messages: [],
    // items: { id, kind: "user" | "friend" | "shared", text, ts }
    memory: { items: [], processedUntil: 0 },
    // items: { id, type, angle }
    planet: { items: [], rotation: 0 },
    dust: { balance: 20, earnedDay: "", earnedToday: 0, streak: 0, lastVisitDay: "" },
    daily: { day: "", ideas: [] },
    usage: { month: "", usd: 0, requests: 0 },
    lastGreetingTs: 0,
  };
}

// Fletter gemte data ind i standardværdierne, så nye felter altid findes.
function merge(data) {
  const base = defaults();
  if (!data || typeof data !== "object") return base;
  for (const key of Object.keys(base)) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    const isSection = typeof base[key] === "object" && !Array.isArray(base[key]);
    base[key] = isSection ? { ...base[key], ...value } : value;
  }
  return base;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch (err) {
    console.warn("Kunne ikke læse gemte data", err);
  }
  return defaults();
}

export const state = load();

let timer = 0;

export function save() {
  clearTimeout(timer);
  timer = setTimeout(saveNow, 200);
}

export function saveNow() {
  clearTimeout(timer);
  if (state.messages.length > MAX_STORED_MESSAGES) {
    state.messages = state.messages.slice(-(MAX_STORED_MESSAGES - 100));
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // Lageret er fuldt: behold kun de nyeste beskeder og prøv igen.
    console.warn("Lageret er fuldt", err);
    state.messages = state.messages.slice(-150);
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* opgiv stille */
    }
  }
}

// Erstatter alt med importerede data, men beholder den nuværende API-nøgle.
export function replaceState(data) {
  const apiKey = state.settings.apiKey;
  const next = merge(data);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  if (!state.settings.apiKey) state.settings.apiKey = apiKey;
  saveNow();
}

export function exportState() {
  const copy = JSON.parse(JSON.stringify(state));
  copy.settings.apiKey = "";
  copy.exportedAt = new Date().toISOString();
  return copy;
}

export function resetState() {
  clearTimeout(timer);
  localStorage.removeItem(KEY);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Lokal dato som "2026-10-27".
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(date = new Date()) {
  return dayKey(date).slice(0, 7);
}
