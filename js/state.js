// Everything is stored locally on the phone in localStorage.

const KEY = "peppy.v1";
const MAX_HISTORY = 1000;

function defaults() {
  return {
    version: 1,
    onboarded: false,
    name: "",
    buddy: "kit",
    buddyNames: {},
    wear: [],
    settings: { sound: true, voice: true, difficulty: "normal", weeklyGoal: 3, readySeconds: 10 },
    xp: 0,
    // { id, workout, ts, active, total, difficulty, rounds, completed, xp }
    history: [],
  };
}

// Merges saved data into the defaults so new fields always exist.
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
    console.warn("Could not read saved data", err);
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
  if (state.history.length > MAX_HISTORY) state.history = state.history.slice(-MAX_HISTORY);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Could not save", err);
  }
}

export function replaceState(data) {
  const next = merge(data);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  saveNow();
}

export function exportState() {
  return { ...JSON.parse(JSON.stringify(state)), exportedAt: new Date().toISOString() };
}

export function resetState() {
  clearTimeout(timer);
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Local date as "2026-10-27".
export function dayKey(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
