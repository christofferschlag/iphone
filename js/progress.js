// XP, levels, streaks and weekly numbers, all derived from the workout history.
import { dayKey } from "./state.js";

const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
const XP_PER_LEVEL_AFTER = 600;

function threshold(level) {
  if (level <= LEVEL_XP.length) return LEVEL_XP[level - 1];
  return LEVEL_XP.at(-1) + (level - LEVEL_XP.length) * XP_PER_LEVEL_AFTER;
}

export function levelInfo(xp) {
  let level = 1;
  while (xp >= threshold(level + 1)) level++;
  const floor = threshold(level);
  const next = threshold(level + 1);
  return { level, into: xp - floor, span: next - floor, next };
}

// A session counts as a training day when it was finished or lasted a minute.
function counts(session) {
  return session.completed || session.active >= 60;
}

export function trainedDays(history) {
  return new Set(history.filter(counts).map((s) => dayKey(s.ts)));
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Days in a row up to today, or up to yesterday if today has no workout yet.
export function currentStreak(history, today = new Date()) {
  const days = trainedDays(history);
  let day = days.has(dayKey(today)) ? new Date(today) : addDays(today, -1);
  let streak = 0;
  while (days.has(dayKey(day))) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function bestStreak(history) {
  const days = [...trainedDays(history)].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of days) {
    const date = new Date(`${key}T12:00:00`);
    run = prev && dayKey(addDays(prev, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

export function weekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

// Active minutes for each day of the current week, Monday first.
export function thisWeek(history, today = new Date()) {
  const start = weekStart(today);
  const minutes = minutesByDay(history);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const key = dayKey(date);
    return { key, date, minutes: minutes.get(key) || 0, future: date > today };
  });
}

export function workoutsThisWeek(history, today = new Date()) {
  const start = weekStart(today).getTime();
  return history.filter((s) => s.completed && s.ts >= start).length;
}

export function minutesByDay(history) {
  const map = new Map();
  for (const s of history) {
    const key = dayKey(s.ts);
    map.set(key, (map.get(key) || 0) + s.active / 60);
  }
  for (const [key, value] of map) map.set(key, Math.round(value));
  return map;
}

// The last `weeks` weeks as columns of 7 days, Monday on top.
export function calendar(history, weeks = 12, today = new Date()) {
  const minutes = minutesByDay(history);
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const key = dayKey(date);
      return { key, date, minutes: minutes.get(key) || 0, future: date > today };
    }),
  );
}

export function totals(history) {
  const done = history.filter((s) => s.completed);
  const minutes = Math.round(history.reduce((sum, s) => sum + s.active, 0) / 60);
  return { workouts: done.length, minutes };
}

// 10 XP per active minute, plus a bonus for finishing that grows with the streak.
export function sessionXP({ active, completed, streak }) {
  return Math.round(active / 6) + (completed ? 20 + 5 * Math.min(streak, 7) : 0);
}
