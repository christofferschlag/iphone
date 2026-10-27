// The full-screen workout player: timer, buddy, sounds and the finish screen.
import { EXERCISES, buildSegments } from "./exercises.js";
import { figureById, figureSVG, pose } from "./figures.js";
import { beep, say, stopSpeaking, unlockAudio } from "./sound.js";
import { $, escapeHtml, confirmSheet } from "./ui.js";

const RING = 2 * Math.PI * 52;

const CHEERS = {
  start: ["Let's go!", "You've got this!", "Here we go!", "Show me what you've got!"],
  half: ["Halfway there!", "Looking strong!", "Keep breathing!", "Nice form!"],
  end: ["Last few seconds!", "Push, push, push!", "Almost done!", "Finish strong!"],
  rest: ["Shake it out!", "Sip some water 💧", "Breathe in… and out.", "Great job so far!"],
  done: ["You did it! 🎉", "So proud of you!", "That was awesome!"],
};

const ICONS = {
  close: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  soundOn: `<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`,
  prev: `<svg viewBox="0 0 24 24"><path d="M7 5v14M19 5.5 9.5 12 19 18.5z"/></svg>`,
  next: `<svg viewBox="0 0 24 24"><path d="M17 5v14M5 5.5 14.5 12 5 18.5z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><path d="M7 4.5v15L19.5 12z"/></svg>`,
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function clock(seconds) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

let run = null;

export function isRunning() {
  return Boolean(run);
}

// Starts a workout. Call it straight from a tap so iOS allows sound.
// onComplete(result) records the session and returns { xp, streak, level, levelUp, unlocked }.
export function startWorkout({ workout, difficulty, rounds, settings, buddy, wear, onComplete, onSettings, onClose }) {
  unlockAudio();
  const segments = buildSegments(workout, { difficulty, rounds, readySeconds: settings.readySeconds });
  const works = segments.filter((s) => s.type === "work");
  const fig = figureById(buddy);
  const root = $("#player");

  run = {
    workout, difficulty, rounds, segments, works, fig, settings, onComplete, onSettings, onClose,
    index: 0, startedAt: 0, pausedAt: null, begin: performance.now(), pausedTotal: 0,
    active: 0, movesDone: 0, lastSecond: null, raf: 0, wakeLock: null, bubbleTimer: 0,
  };

  root.innerHTML = `
    <div class="pl" data-phase="ready">
      <div class="pl-top">
        <button class="pl-icon" type="button" data-act="close" aria-label="End workout">${ICONS.close}</button>
        <div class="pl-count"></div>
        <button class="pl-icon" type="button" data-act="sound" aria-label="Sound on or off"></button>
      </div>
      <div class="pl-bar">${works.map(() => "<i><b></b></i>").join("")}</div>
      <div class="pl-head">
        <div class="pl-label"></div>
        <div class="pl-name"></div>
      </div>
      <div class="pl-stage">
        <div class="pl-bubble" aria-live="polite"></div>
        ${figureSVG(buddy, { anim: "ready", mood: "idle", wear, cycle: 0.6 })}
      </div>
      <div class="pl-timer">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r="52"/>
          <circle class="ring" cx="60" cy="60" r="52" stroke-dasharray="${RING.toFixed(1)}"/>
        </svg>
        <div class="pl-sec" role="timer"></div>
      </div>
      <div class="pl-tip"></div>
      <div class="pl-controls">
        <button type="button" data-act="prev" aria-label="Previous move">${ICONS.prev}</button>
        <button type="button" class="pl-main" data-act="pause" aria-label="Pause">${ICONS.pause}</button>
        <button type="button" data-act="next" aria-label="Skip">${ICONS.next}</button>
      </div>
    </div>`;
  root.hidden = false;
  document.body.classList.add("in-workout");
  root.onclick = onTap;
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("keydown", onKey);
  updateSoundButton();
  keepAwake();
  startSegment(0);
  run.raf = requestAnimationFrame(frame);
}

const el = (selector) => $(`#player ${selector}`);
const buddySvg = () => el(".pl-stage svg.fig");
const soundOn = () => run.settings.sound || run.settings.voice;

function speak(text) {
  if (run.settings.voice) say(text);
}

function sound(name) {
  if (run.settings.sound) beep[name]();
}

function bubble(text) {
  const b = el(".pl-bubble");
  if (!b) return;
  b.textContent = text;
  b.classList.remove("show");
  void b.offsetWidth;
  b.classList.add("show");
}

function updateSoundButton() {
  const button = el("[data-act=sound]");
  button.innerHTML = soundOn() ? ICONS.soundOn : ICONS.soundOff;
  button.setAttribute("aria-pressed", String(soundOn()));
}

function workNumber(index) {
  // The move that is running now, or the next one during a break.
  let n = 0;
  for (let i = 0; i <= index; i++) if (run.segments[i].type === "work") n++;
  return run.segments[index].type === "work" ? n : n + 1;
}

function startSegment(index) {
  run.index = index;
  run.startedAt = performance.now();
  if (run.pausedAt) run.pausedAt = run.startedAt;
  run.lastSecond = null;
  const seg = run.segments[index];
  const ex = EXERCISES[seg.ex];
  const svg = buddySvg();
  const lastMove = seg.type === "work" && !run.segments.slice(index + 1).some((s) => s.type === "work");
  el(".pl").dataset.phase = seg.type;
  svg.classList.remove("sweaty");
  el(".pl-count").textContent = `${Math.min(workNumber(index), run.works.length)} / ${run.works.length}`;

  const roundText = run.rounds > 1 ? ` · Round ${seg.round + 1} of ${run.rounds}` : "";
  if (seg.type === "ready") {
    pose(svg, { anim: "ready", mood: "idle", cycle: 0.6 });
    el(".pl-label").textContent = "Get ready";
    el(".pl-name").textContent = ex.name;
    el(".pl-tip").textContent = ex.tip;
    speak(`Get ready. First up: ${ex.name}.`);
    bubble(pick(CHEERS.start));
  } else if (seg.type === "work") {
    pose(svg, { anim: seg.ex, mood: "work", cycle: ex.cycle });
    el(".pl-label").textContent = `${lastMove ? "Last move" : `Move ${workNumber(index)}`}${roundText}`;
    el(".pl-name").textContent = ex.name;
    el(".pl-tip").textContent = ex.tip;
    sound("go");
    speak(lastMove ? `Last one! ${ex.name}.` : `${ex.name}. Go!`);
  } else {
    pose(svg, { anim: "rest", mood: "rest", cycle: 3.6 });
    el(".pl-label").textContent = seg.roundBreak ? "Round break" : "Rest";
    el(".pl-name").textContent = "Breathe";
    el(".pl-tip").innerHTML = `<span class="pl-next">${figureSVG(run.fig.id, {
      anim: seg.ex,
      mood: "work",
      cycle: ex.cycle,
      phase: ex.peak,
    })}</span><span>Next: <b>${escapeHtml(ex.name)}</b></span>`;
    sound("rest");
    speak(`Rest. Next up: ${ex.name}.`);
    bubble(pick(seg.roundBreak ? ["Round done! 🎉", ...CHEERS.rest] : CHEERS.rest));
  }
  el(".pl-name").classList.remove("pop");
  void el(".pl-name").offsetWidth;
  el(".pl-name").classList.add("pop");
  paintBar();
}

function paintBar(fraction = 0) {
  const cells = el(".pl-bar").children;
  const current = workNumber(run.index) - 1;
  const inWork = run.segments[run.index].type === "work";
  [...cells].forEach((cell, i) => {
    const fill = i < current ? 1 : i === current && inWork ? fraction : 0;
    cell.firstChild.style.transform = `scaleX(${fill})`;
  });
}

function onSecond(seg, sec) {
  if (sec <= 3 && sec > 0) sound("tick");
  if (seg.type !== "work") return;
  const ex = EXERCISES[seg.ex];
  const svg = buddySvg();
  if (sec === Math.ceil(seg.dur / 2) && seg.dur >= 20) {
    svg.classList.add("sweaty");
    if (ex.hold) pose(svg, { mood: "strain" });
    bubble(pick([...CHEERS.half, ...run.fig.cheers]));
    if (seg.dur >= 30) speak("Halfway!");
  }
  if (sec === 5 && seg.dur >= 15) {
    pose(svg, { mood: "strain" });
    bubble(pick(CHEERS.end));
  }
}

function frame() {
  if (!run || run.finished) return;
  const seg = run.segments[run.index];
  const now = run.pausedAt ?? performance.now();
  const elapsed = (now - run.startedAt) / 1000;
  const remaining = Math.max(0, seg.dur - elapsed);
  el(".ring").style.strokeDashoffset = (RING * Math.min(1, elapsed / seg.dur)).toFixed(1);
  const sec = Math.ceil(remaining);
  if (sec !== run.lastSecond) {
    run.lastSecond = sec;
    el(".pl-sec").textContent = sec;
    if (!run.pausedAt) onSecond(seg, sec);
  }
  if (seg.type === "work") paintBar(Math.min(1, elapsed / seg.dur));
  if (remaining <= 0 && !run.pausedAt) {
    if (seg.type === "work") {
      run.active += seg.dur;
      run.movesDone++;
    }
    advance();
    if (!run || run.finished) return;
  }
  run.raf = requestAnimationFrame(frame);
}

function advance() {
  if (run.index + 1 >= run.segments.length) finish(true);
  else startSegment(run.index + 1);
}

function elapsedInSegment() {
  return ((run.pausedAt ?? performance.now()) - run.startedAt) / 1000;
}

function skip() {
  const seg = run.segments[run.index];
  if (seg.type === "work") {
    const elapsed = Math.min(seg.dur, elapsedInSegment());
    run.active += elapsed;
    if (elapsed >= seg.dur / 2) run.movesDone++;
  }
  advance();
}

function previous() {
  const seg = run.segments[run.index];
  let target = run.index;
  if (seg.type !== "work" || elapsedInSegment() < 3) {
    for (let i = run.index - 1; i >= 0; i--) {
      if (run.segments[i].type === "work") {
        target = i;
        break;
      }
    }
  }
  startSegment(target);
}

function pause() {
  if (!run || run.finished || run.pausedAt) return;
  run.pausedAt = performance.now();
  buddySvg().classList.add("paused");
  el(".pl").classList.add("is-paused");
  el("[data-act=pause]").innerHTML = ICONS.play;
  el("[data-act=pause]").setAttribute("aria-label", "Resume");
  stopSpeaking();
}

function resume() {
  if (!run?.pausedAt) return;
  const pausedFor = performance.now() - run.pausedAt;
  run.startedAt += pausedFor;
  run.pausedTotal += pausedFor;
  run.pausedAt = null;
  buddySvg().classList.remove("paused");
  el(".pl").classList.remove("is-paused");
  el("[data-act=pause]").innerHTML = ICONS.pause;
  el("[data-act=pause]").setAttribute("aria-label", "Pause");
  keepAwake();
}

async function askToEnd() {
  const wasPaused = Boolean(run.pausedAt);
  pause();
  const minutes = Math.floor(run.active / 60);
  const text = run.active >= 60
    ? `You've moved for ${minutes} min. That still counts towards your streak.`
    : "You've only just started. Nothing will be saved.";
  const end = await confirmSheet("End workout?", text, "End workout", "danger");
  if (!run) return;
  if (end) finish(false);
  else if (!wasPaused) resume();
}

function onTap(e) {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (!act || !run) return;
  if (run.finished && act !== "done") return;
  if (act === "pause") run.pausedAt ? resume() : pause();
  else if (act === "next") skip();
  else if (act === "prev") previous();
  else if (act === "close") askToEnd();
  else if (act === "sound") {
    const on = !soundOn();
    run.settings.sound = on;
    run.settings.voice = on;
    run.onSettings?.({ sound: on, voice: on });
    if (on) unlockAudio();
    else stopSpeaking();
    updateSoundButton();
  } else if (act === "done") close();
}

function onKey(e) {
  if (!run || run.finished || e.target.closest?.("input, textarea, dialog")) return;
  if (e.key === " ") {
    e.preventDefault();
    run.pausedAt ? resume() : pause();
  } else if (e.key === "ArrowRight") skip();
  else if (e.key === "ArrowLeft") previous();
}

function onVisibility() {
  if (!run || run.finished) return;
  if (document.visibilityState === "hidden") pause();
  else keepAwake();
}

async function keepAwake() {
  try {
    if (navigator.wakeLock && !run.wakeLock) {
      run.wakeLock = await navigator.wakeLock.request("screen");
      run.wakeLock.addEventListener("release", () => {
        if (run) run.wakeLock = null;
      });
    }
  } catch {
    /* not allowed right now */
  }
}

function finish(completed) {
  cancelAnimationFrame(run.raf);
  stopSpeaking();
  const total = (performance.now() - run.begin - run.pausedTotal) / 1000;
  if (!completed && run.active < 60) {
    close();
    return;
  }
  const result = {
    workout: run.workout.id,
    active: Math.round(run.active),
    total: Math.round(total),
    difficulty: run.difficulty,
    rounds: run.rounds,
    completed,
  };
  const outcome = run.onComplete(result);
  sound("done");
  speak(completed ? "Workout complete. Amazing job!" : "Nice effort. See you next time!");
  const confetti = Array.from({ length: 28 }, (_, i) => {
    const colors = ["#ff6a3d", "#19b394", "#ffcf3f", "#6b5cff", "#ff8fc6"];
    return `<i style="left:${(i * 37) % 100}%;background:${colors[i % colors.length]};animation-delay:${((i * 0.13) % 1.6).toFixed(2)}s;animation-duration:${(2.4 + (i % 5) * 0.35).toFixed(2)}s"></i>`;
  }).join("");
  el(".pl").outerHTML = `
    <div class="pl" data-phase="done">
      <div class="confetti" aria-hidden="true">${confetti}</div>
      <div class="pl-done">
        <div class="pl-label">${completed ? "Workout complete!" : "Nice effort!"}</div>
        <div class="pl-name">${run.workout.emoji} ${escapeHtml(run.workout.name)}</div>
        <div class="pl-stage">${figureSVG(run.fig.id, { anim: "celebrate", mood: "happy", wear: outcome.wear, cycle: 0.8 })}
          <div class="pl-bubble show">${escapeHtml(pick([...CHEERS.done, ...run.fig.cheers]))}</div></div>
        <div class="pl-stats">
          <div><b>${clock(result.active)}</b><span>Active time</span></div>
          <div><b>${run.movesDone}</b><span>Moves</span></div>
          <div><b>+${outcome.xp}</b><span>XP</span></div>
          <div><b>🔥 ${outcome.streak}</b><span>Day streak</span></div>
        </div>
        ${
          outcome.levelUp
            ? `<div class="pl-levelup">Level ${outcome.level}!${outcome.unlocked.length ? ` New: ${outcome.unlocked.map((a) => escapeHtml(a.name)).join(", ")} 🎁` : ""}</div>`
            : ""
        }
        <button class="btn big light" type="button" data-act="done">Done</button>
      </div>
    </div>`;
  run.wakeLock?.release().catch(() => {});
  run.finished = true;
}

function close() {
  if (!run) return;
  cancelAnimationFrame(run.raf);
  stopSpeaking();
  run.wakeLock?.release().catch(() => {});
  document.removeEventListener("visibilitychange", onVisibility);
  document.removeEventListener("keydown", onKey);
  const root = $("#player");
  root.hidden = true;
  root.innerHTML = "";
  root.onclick = null;
  document.body.classList.remove("in-workout");
  const done = run.onClose;
  run = null;
  done?.();
}
