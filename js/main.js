import { state, save, saveNow, uid, dayKey, replaceState, exportState, resetState } from "./state.js";
import { FIGURES, ACCESSORIES, figureById, figureSVG, pose } from "./figures.js";
import { EXERCISES, WORKOUTS, DIFFICULTIES, workoutById, buildSegments, totalSeconds, formatDuration } from "./exercises.js";
import {
  levelInfo,
  trainedDays,
  currentStreak,
  bestStreak,
  thisWeek,
  workoutsThisWeek,
  calendar,
  totals,
  sessionXP,
} from "./progress.js";
import { startWorkout, isRunning } from "./player.js";
import { beep, sayLines, unlockAudio } from "./sound.js";
import {
  $,
  escapeHtml,
  toast,
  sheet,
  confirmSheet,
  formatLongDate,
  formatShortDate,
  formatMonth,
  relativeDay,
} from "./ui.js";

const DAY_MS = 86400000;
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

let currentView = "today";
let detail = null; // { id, difficulty, rounds } for the open workout

const buddyName = (id = state.buddy) => state.buddyNames[id] || figureById(id).name;
const level = () => levelInfo(state.xp).level;
const wearing = () => state.wear.filter((id) => (ACCESSORIES.find((a) => a.id === id)?.level ?? 99) <= level());
const dayIndex = () => Math.floor(new Date(`${dayKey()}T12:00:00`).getTime() / DAY_MS);

function workoutLength(workout, difficulty = state.settings.difficulty, rounds = workout.rounds) {
  return totalSeconds(buildSegments(workout, { difficulty, rounds, readySeconds: state.settings.readySeconds }));
}

// ---------- Navigation ----------

function showView(name) {
  currentView = name;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  const tab = name === "workout" ? "today" : name;
  document.querySelectorAll("#tabbar button").forEach((b) => {
    b.setAttribute("aria-current", b.dataset.view === tab ? "page" : "false");
  });
  $("#tabbar").hidden = name === "onboarding";
  const render = {
    onboarding: renderOnboarding,
    today: renderToday,
    workout: renderWorkout,
    progress: renderProgress,
    buddy: renderBuddy,
    settings: renderSettings,
  }[name];
  render?.();
  $(`#view-${name} .scroll`)?.scrollTo(0, 0);
}

// ---------- Onboarding ----------

const ob = { step: 0, buddy: "kit", name: "", buddyName: "", goal: 3, difficulty: "normal" };

function renderOnboarding() {
  const fig = figureById(ob.buddy);
  const view = $("#view-onboarding");
  const dots = `<div class="ob-dots">${[0, 1, 2].map((i) => `<span class="${i === ob.step ? "on" : ""}"></span>`).join("")}</div>`;
  if (ob.step === 0) {
    view.innerHTML = `<div class="ob">
      ${dots}
      <h1>Meet your workout buddy</h1>
      <p class="muted">Pick a friend who trains with you and cheers you on.</p>
      <div class="ob-hero">${figureSVG(ob.buddy, { anim: "ready", cycle: 0.6, mood: "happy" })}</div>
      <div class="ob-who"><b>${fig.name}</b> the ${fig.species.toLowerCase()}</div>
      <p class="muted ob-blurb">${fig.blurb}</p>
      <div class="ob-picker" role="radiogroup" aria-label="Buddies">${FIGURES.map(
        (f) => `<button type="button" role="radio" aria-checked="${f.id === ob.buddy}" aria-label="${f.name} the ${f.species}" data-pick="${f.id}">
          ${figureSVG(f.id, { anim: "idle", phase: 0, cycle: 3.2 })}</button>`,
      ).join("")}</div>
      <button class="btn primary big" type="button" data-next>Choose ${fig.name}</button>
    </div>`;
  } else if (ob.step === 1) {
    view.innerHTML = `<form class="ob" data-step="names">
      ${dots}
      <div class="ob-hero small">${figureSVG(ob.buddy, { anim: "idle", cycle: 3.2 })}</div>
      <h1>Nice to meet you!</h1>
      <label class="field">What's your name?
        <input name="name" maxlength="30" autocomplete="given-name" placeholder="Your name" value="${escapeHtml(ob.name)}">
      </label>
      <label class="field">Your buddy's name
        <input name="buddyName" maxlength="16" required value="${escapeHtml(ob.buddyName || fig.name)}">
      </label>
      <button class="btn primary big">Next</button>
    </form>`;
  } else {
    view.innerHTML = `<form class="ob" data-step="goal">
      ${dots}
      <div class="ob-hero small">${figureSVG(ob.buddy, { anim: "jumping-jacks", cycle: 0.9, mood: "work" })}</div>
      <h1>Your weekly goal</h1>
      <p class="muted">How many workouts a week? Most people start with 3.</p>
      <div class="goal-picker" role="radiogroup" aria-label="Workouts per week">${[1, 2, 3, 4, 5, 6, 7]
        .map((n) => `<button type="button" role="radio" aria-checked="${n === ob.goal}" data-goal="${n}">${n}</button>`)
        .join("")}</div>
      <div class="field-label">How fit do you feel?</div>
      ${segmented("ob-difficulty", Object.entries(DIFFICULTIES).map(([id, d]) => [id, d.label]), ob.difficulty)}
      <p class="muted small">You can change this for each workout.</p>
      <button class="btn primary big">Let's go!</button>
    </form>`;
  }
}

function bindOnboarding() {
  const view = $("#view-onboarding");
  view.addEventListener("click", (e) => {
    const picked = e.target.closest("[data-pick]")?.dataset.pick;
    if (picked) {
      ob.buddy = picked;
      ob.buddyName = "";
      renderOnboarding();
      return;
    }
    if (e.target.closest("[data-next]")) {
      ob.step = 1;
      renderOnboarding();
      return;
    }
    const goal = e.target.closest("[data-goal]")?.dataset.goal;
    if (goal) {
      ob.goal = Number(goal);
      view.querySelectorAll("[data-goal]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.goal === goal)));
    }
    const choice = e.target.closest("[data-seg='ob-difficulty']");
    if (choice) {
      ob.difficulty = choice.dataset.value;
      selectSegment(choice);
    }
  });
  view.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    if (e.target.dataset.step === "names") {
      ob.name = String(data.get("name") || "").trim();
      ob.buddyName = String(data.get("buddyName") || "").trim();
      ob.step = 2;
      renderOnboarding();
      return;
    }
    state.name = ob.name;
    state.buddy = ob.buddy;
    if (ob.buddyName && ob.buddyName !== figureById(ob.buddy).name) state.buddyNames[ob.buddy] = ob.buddyName;
    state.settings.weeklyGoal = ob.goal;
    state.settings.difficulty = ob.difficulty;
    state.onboarded = true;
    saveNow();
    showView("today");
  });
}

// ---------- Shared bits ----------

function segmented(name, options, selected) {
  return `<div class="segmented" role="radiogroup">${options
    .map(
      ([value, label]) =>
        `<button type="button" role="radio" data-seg="${name}" data-value="${value}" aria-checked="${value === selected}">${label}</button>`,
    )
    .join("")}</div>`;
}

function selectSegment(button) {
  button.parentElement.querySelectorAll("[role=radio]").forEach((b) => b.setAttribute("aria-checked", String(b === button)));
}

function workoutCard(w) {
  return `<button type="button" class="wcard" data-open="${w.id}">
    <span class="wcard-emoji" aria-hidden="true">${w.emoji}</span>
    <span class="wcard-body">
      <span class="wcard-name">${escapeHtml(w.name)}</span>
      <span class="wcard-meta">${formatDuration(workoutLength(w))} · ${w.moves.length * w.rounds} moves</span>
    </span>
    <span class="wcard-go" aria-hidden="true">›</span>
  </button>`;
}

// ---------- Today ----------

function todaysPick() {
  if (!state.history.length) return workoutById("wake-up");
  const recent = new Set(state.history.filter((s) => Date.now() - s.ts < 2 * DAY_MS).map((s) => s.workout));
  for (let i = 0; i < WORKOUTS.length; i++) {
    const w = WORKOUTS[(dayIndex() + i) % WORKOUTS.length];
    if (!recent.has(w.id)) return w;
  }
  return WORKOUTS[dayIndex() % WORKOUTS.length];
}

function buddyLine() {
  const fig = figureById(state.buddy);
  const hello = state.name ? ` ${state.name}` : "";
  const choose = (lines) => lines[dayIndex() % lines.length];
  if (!state.history.length) {
    return { mood: "happy", line: `Hi${hello}! I'm ${buddyName()}. Shall we start with something easy?` };
  }
  if (trainedDays(state.history).has(dayKey())) {
    return {
      mood: "happy",
      line: choose([`We trained today! ${fig.cheers[0]}`, "Workout done. I'm so proud of you!", "Look at you go! See you tomorrow?"]),
    };
  }
  const daysSince = (Date.now() - state.history.at(-1).ts) / DAY_MS;
  if (daysSince >= 3) return { mood: "sleepy", line: `I missed you${hello}… shall we move a little today?` };
  const hour = new Date().getHours();
  if (hour < 5 || hour >= 22) return { mood: "sleepy", line: "It's late… a gentle Desk Break, maybe?" };
  if (hour < 11) return { mood: "idle", line: `Good morning${hello}! A quick workout to wake up?` };
  if (hour < 17) return { mood: "idle", line: "Ready for a little workout? I am!" };
  return { mood: "idle", line: "Evening! Something sweaty or something calm?" };
}

function renderToday() {
  const lv = levelInfo(state.xp);
  const streak = currentStreak(state.history);
  const goal = state.settings.weeklyGoal;
  const done = workoutsThisWeek(state.history);
  const pick = todaysPick();
  const { mood, line } = buddyLine();
  const todayKey = dayKey();
  const week = thisWeek(state.history);
  $("#view-today").innerHTML = `
    <header class="topbar">
      <div>
        <div class="title">Hi${state.name ? `, ${escapeHtml(state.name)}` : ""} 👋</div>
        <div class="sub">${formatLongDate(new Date())}</div>
      </div>
      <div class="pill" aria-label="${streak} day streak">🔥 ${streak}</div>
    </header>
    <div class="scroll">
      <section class="hero">
        <div class="speech" id="speech">${escapeHtml(line)}</div>
        <button type="button" class="hero-buddy" data-act="poke" aria-label="Give ${escapeHtml(buddyName())} a high five">
          ${figureSVG(state.buddy, { anim: "idle", mood, wear: wearing(), cycle: 3.2, label: buddyName() })}
        </button>
        <div class="level-row">
          <span class="level-tag">Level ${lv.level}</span>
          <span class="meter" role="progressbar" aria-label="XP towards the next level" aria-valuemin="0" aria-valuemax="${lv.span}" aria-valuenow="${lv.into}"><i style="width:${Math.round((lv.into / lv.span) * 100)}%"></i></span>
          <span class="muted small">${lv.into} / ${lv.span} XP</span>
        </div>
      </section>
      <section class="card pick">
        <div class="pick-label">Today's pick</div>
        <div class="pick-main">
          <span class="pick-emoji" aria-hidden="true">${pick.emoji}</span>
          <div>
            <div class="pick-name">${escapeHtml(pick.name)}</div>
            <div class="muted small">${formatDuration(workoutLength(pick))} · ${pick.moves.length * pick.rounds} moves · ${DIFFICULTIES[state.settings.difficulty].label}</div>
          </div>
        </div>
        <div class="row">
          <button type="button" class="btn primary grow" data-start="${pick.id}">▶ Start</button>
          <button type="button" class="btn" data-open="${pick.id}">Details</button>
        </div>
      </section>
      <section class="card week-card">
        <div class="row-between"><h2>This week</h2><span class="muted small">${Math.min(done, goal)} of ${goal} workouts${done >= goal ? " ✅" : ""}</span></div>
        <div class="week-dots">${week
          .map(
            (d, i) => `<div class="wd${d.minutes ? " on" : ""}${d.key === todayKey ? " today" : ""}" title="${formatShortDate(d.date)}${d.minutes ? `: ${d.minutes} min` : ""}">
              <i aria-hidden="true">${d.minutes ? "✓" : ""}</i><span>${WEEKDAY_LETTERS[i]}</span></div>`,
          )
          .join("")}</div>
      </section>
      <h2 class="section-title">All workouts</h2>
      <div class="workout-list">${WORKOUTS.map(workoutCard).join("")}</div>
    </div>`;
}

function poke() {
  const svg = $("#view-today .hero-buddy svg");
  const fig = figureById(state.buddy);
  pose(svg, { anim: "celebrate", mood: "happy", cycle: 0.8 });
  const speech = $("#speech");
  speech.textContent = fig.cheers[Math.floor(Math.random() * fig.cheers.length)];
  speech.classList.remove("bump");
  void speech.offsetWidth;
  speech.classList.add("bump");
  clearTimeout(poke.timer);
  poke.timer = setTimeout(() => {
    if (svg.isConnected) pose(svg, { anim: "idle", mood: buddyLine().mood, cycle: 3.2 });
  }, 1600);
}

// ---------- Workout details ----------

function openWorkout(id) {
  const w = workoutById(id);
  if (!w) return;
  detail = { id, difficulty: state.settings.difficulty, rounds: w.rounds };
  showView("workout");
}

function renderWorkout() {
  const w = workoutById(detail.id);
  const d = DIFFICULTIES[detail.difficulty];
  const length = workoutLength(w, detail.difficulty, detail.rounds);
  $("#view-workout").innerHTML = `
    <header class="topbar"><button type="button" class="back" data-act="back">‹ Workouts</button></header>
    <div class="scroll">
      <div class="detail-head">
        <div class="detail-emoji" aria-hidden="true">${w.emoji}</div>
        <h1>${escapeHtml(w.name)}</h1>
        <p class="muted">${escapeHtml(w.blurb)}</p>
      </div>
      <section class="card">
        <div class="field-label">Difficulty</div>
        ${segmented("difficulty", Object.entries(DIFFICULTIES).map(([id, x]) => [id, x.label]), detail.difficulty)}
        <div class="row-between">
          <div class="field-label">Rounds</div>
          <div class="stepper">
            <button type="button" data-rounds="-1" aria-label="Fewer rounds" ${detail.rounds <= 1 ? "disabled" : ""}>−</button>
            <span>${detail.rounds}</span>
            <button type="button" data-rounds="1" aria-label="More rounds" ${detail.rounds >= 4 ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="summary"><b>${formatDuration(length)}</b> · ${w.moves.length * detail.rounds} moves · ${d.work} s on, ${w.rest ?? d.rest} s rest</div>
      </section>
      <h2 class="section-title">Moves</h2>
      <ul class="moves">${w.moves
        .map((id) => {
          const ex = EXERCISES[id];
          return `<li><button type="button" class="move" data-preview="${id}">
            <span class="move-thumb">${figureSVG(state.buddy, { anim: id, mood: "work", cycle: ex.cycle, phase: ex.peak })}</span>
            <span class="move-text"><b>${escapeHtml(ex.name)}</b><span class="muted small">${escapeHtml(ex.tip)}</span></span>
          </button></li>`;
        })
        .join("")}</ul>
    </div>
    <div class="start-bar"><button type="button" class="btn primary big" data-start="${w.id}">▶ Start workout</button></div>`;
}

function previewMove(id) {
  const ex = EXERCISES[id];
  sheet({
    title: ex.name,
    text: ex.tip,
    html: `<div class="preview-buddy">${figureSVG(state.buddy, { anim: id, mood: "work", cycle: ex.cycle, wear: wearing() })}</div>`,
    buttons: [{ value: "ok", label: "Got it", kind: "primary" }],
  });
}

// ---------- Running a workout ----------

function begin(id) {
  if (isRunning()) return;
  const workout = workoutById(id);
  const fromDetail = currentView === "workout" && detail?.id === id;
  startWorkout({
    workout,
    difficulty: fromDetail ? detail.difficulty : state.settings.difficulty,
    rounds: fromDetail ? detail.rounds : workout.rounds,
    settings: state.settings,
    buddy: state.buddy,
    wear: wearing(),
    onComplete: recordSession,
    onSettings: () => save(),
    onClose: () => showView("today"),
  });
}

function recordSession(result) {
  const before = level();
  const session = { id: uid(), ts: Date.now(), ...result };
  state.history.push(session);
  const streak = currentStreak(state.history);
  session.xp = sessionXP({ active: result.active, completed: result.completed, streak });
  state.xp += session.xp;
  const after = level();
  const unlocked = ACCESSORIES.filter((a) => a.level > before && a.level <= after);
  for (const a of unlocked) if (!state.wear.includes(a.id)) state.wear.push(a.id);
  saveNow();
  return { xp: session.xp, streak, level: after, levelUp: after > before, unlocked, wear: wearing() };
}

// ---------- Progress ----------

function heatLevel(minutes) {
  if (!minutes) return 0;
  if (minutes <= 10) return 1;
  if (minutes <= 20) return 2;
  if (minutes <= 30) return 3;
  return 4;
}

function renderProgress() {
  const t = totals(state.history);
  const streak = currentStreak(state.history);
  const best = bestStreak(state.history);
  const week = thisWeek(state.history);
  const weekTotal = week.reduce((sum, d) => sum + d.minutes, 0);
  const max = Math.max(...week.map((d) => d.minutes));
  // Headroom above the tallest bar so its label never meets the scale label.
  const scale = Math.max(10, Math.ceil((max * 1.2) / 10) * 10);
  const maxIndex = max > 0 ? week.findIndex((d) => d.minutes === max) : -1;
  const weeks = calendar(state.history, 12);
  const trained = weeks.flat().filter((d) => d.minutes > 0).length;
  const recent = state.history.slice(-8).reverse();
  const days = (n) => `${n} ${n === 1 ? "day" : "days"}`;

  $("#view-progress").innerHTML = `
    <header class="topbar"><div class="title">Progress</div></header>
    <div class="scroll">
      <div class="stats">
        <div class="stat"><span class="stat-label">Workouts</span><span class="stat-value">${t.workouts}</span></div>
        <div class="stat"><span class="stat-label">Active minutes</span><span class="stat-value">${t.minutes}</span></div>
        <div class="stat"><span class="stat-label">Current streak</span><span class="stat-value">${days(streak)}</span></div>
        <div class="stat"><span class="stat-label">Best streak</span><span class="stat-value">${days(best)}</span></div>
      </div>

      <section class="card viz">
        <div class="row-between"><h2>Active minutes this week</h2><span class="muted small">${weekTotal} min</span></div>
        <div class="bars" role="group" aria-label="Active minutes per day this week">
          <span class="bars-scale" aria-hidden="true">${scale}</span>
          ${week
            .map((d, i) => {
              const h = d.minutes ? Math.max(4, (d.minutes / scale) * 100) : 0;
              return `<button type="button" class="bar-col${d.future ? " future" : ""}" data-tip="${d.minutes} min" data-tip-label="${formatShortDate(d.date)}" aria-label="${formatShortDate(d.date)}: ${d.minutes} minutes">
                <span class="bar-area">${i === maxIndex ? `<span class="bar-value" style="bottom:${h}%">${d.minutes}</span>` : ""}<span class="bar" style="height:${h}%"></span></span>
                <span class="bar-day${d.key === dayKey() ? " today" : ""}">${WEEKDAY_LETTERS[i]}</span>
              </button>`;
            })
            .join("")}
        </div>
        <details class="table-view"><summary>Show as table</summary>
          <table><thead><tr><th>Day</th><th>Minutes</th></tr></thead><tbody>${week
            .map((d) => `<tr><td>${formatShortDate(d.date)}</td><td>${d.minutes}</td></tr>`)
            .join("")}</tbody></table>
        </details>
      </section>

      <section class="card viz">
        <div class="row-between"><h2>Last 12 weeks</h2><span class="muted small">${days(trained)} with training</span></div>
        <div class="heat" role="group" aria-label="Training days in the last 12 weeks">
          <div class="heat-months" aria-hidden="true"><span></span>${weeks
            .map((w, i) => {
              const first = w[0].date;
              const show = i === 0 || first.getMonth() !== weeks[i - 1][0].date.getMonth();
              return `<span>${show ? formatMonth(first) : ""}</span>`;
            })
            .join("")}</div>
          <div class="heat-grid">
            <div class="heat-days" aria-hidden="true"><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span><span></span></div>
            ${weeks
              .map(
                (w) => `<div class="heat-week">${w
                  .map((d) =>
                    d.future
                      ? `<span class="cell future"></span>`
                      : `<span class="cell h${heatLevel(d.minutes)}" data-tip="${d.minutes ? `${d.minutes} min` : "Rest day"}" data-tip-label="${formatShortDate(d.date)}"></span>`,
                  )
                  .join("")}</div>`,
              )
              .join("")}
          </div>
          <div class="heat-legend" aria-hidden="true">Less <i class="cell h0"></i><i class="cell h1"></i><i class="cell h2"></i><i class="cell h3"></i><i class="cell h4"></i> More</div>
        </div>
      </section>

      <section class="card">
        <h2>Recent workouts</h2>
        ${
          recent.length
            ? `<ul class="history">${recent
                .map((s) => {
                  const w = workoutById(s.workout);
                  return `<li><span class="history-emoji" aria-hidden="true">${w?.emoji ?? "💪"}</span>
                    <span class="history-text"><b>${escapeHtml(w?.name ?? "Workout")}</b>
                    <span class="muted small">${relativeDay(s.ts)} · ${Math.max(1, Math.round(s.active / 60))} min · ${DIFFICULTIES[s.difficulty]?.label ?? ""}${s.completed ? "" : " · ended early"}</span></span>
                    <span class="history-xp">+${s.xp} XP</span></li>`;
                })
                .join("")}</ul>`
            : `<p class="muted">No workouts yet. Your first one will show up here.</p>`
        }
      </section>
      <div class="viz-tip" id="viz-tip" role="status"><b></b><span></span></div>
    </div>`;
}

function showTip(target) {
  const tip = $("#viz-tip");
  if (!tip || !target?.dataset.tip) return hideTip();
  tip.querySelector("b").textContent = target.dataset.tip;
  tip.querySelector("span").textContent = target.dataset.tipLabel || "";
  const scroller = $("#view-progress .scroll");
  const bar = target.querySelector(".bar");
  const box = (bar && bar.offsetHeight ? bar : target.querySelector(".bar-area") || target).getBoundingClientRect();
  const anchorTop = bar && !bar.offsetHeight ? box.bottom : box.top;
  const host = scroller.getBoundingClientRect();
  tip.classList.add("show");
  const left = box.left - host.left + box.width / 2 - tip.offsetWidth / 2;
  tip.style.left = `${Math.max(8, Math.min(left, host.width - tip.offsetWidth - 8))}px`;
  tip.style.top = `${anchorTop - host.top + scroller.scrollTop - tip.offsetHeight - 8}px`;
  document.querySelectorAll(".viz .active").forEach((el) => el.classList.remove("active"));
  target.classList.add("active");
}

function hideTip() {
  $("#viz-tip")?.classList.remove("show");
  document.querySelectorAll(".viz .active").forEach((el) => el.classList.remove("active"));
}

// ---------- Buddy ----------

function renderBuddy() {
  const fig = figureById(state.buddy);
  const lv = levelInfo(state.xp);
  $("#view-buddy").innerHTML = `
    <header class="topbar"><div class="title">Your buddy</div><div class="pill">Level ${lv.level}</div></header>
    <div class="scroll">
      <section class="card buddy-hero">
        <button type="button" class="buddy-big" data-act="cheer" aria-label="Make ${escapeHtml(buddyName())} jump">
          ${figureSVG(state.buddy, { anim: "idle", mood: "happy", wear: wearing(), cycle: 3.2, label: buddyName() })}
        </button>
        <label class="field">Name<input data-buddy-name maxlength="16" value="${escapeHtml(buddyName())}"></label>
        <p class="muted small">${fig.species} · ${escapeHtml(fig.blurb)}</p>
      </section>
      <h2 class="section-title">Choose your buddy</h2>
      <div class="buddy-grid" role="radiogroup" aria-label="Buddies">${FIGURES.map(
        (f) => `<button type="button" class="buddy-card" role="radio" aria-checked="${f.id === state.buddy}" data-buddy="${f.id}">
          ${figureSVG(f.id, { anim: "idle", phase: 0, cycle: 3.2, wear: wearing() })}
          <b>${escapeHtml(buddyName(f.id))}</b><span class="muted small">${f.species}</span></button>`,
      ).join("")}</div>
      <h2 class="section-title">Wardrobe</h2>
      <p class="muted small section-note">Train to level up and unlock new gear. Tap to put it on or take it off.</p>
      <div class="wardrobe">${ACCESSORIES.map((a) => {
        const unlocked = lv.level >= a.level;
        const on = unlocked && state.wear.includes(a.id);
        return `<button type="button" class="gear${unlocked ? "" : " locked"}${on ? " on" : ""}" data-gear="${a.id}" ${unlocked ? "" : "disabled"} aria-pressed="${on}">
          ${figureSVG(state.buddy, { anim: "idle", phase: 0, cycle: 3.2, wear: [a.id] })}
          <b>${a.name}</b><span class="muted small">${unlocked ? (on ? "Wearing" : "Tap to wear") : `🔒 Level ${a.level}`}</span></button>`;
      }).join("")}</div>
    </div>`;
}

// ---------- Settings ----------

function renderSettings() {
  const s = state.settings;
  $("#view-settings").innerHTML = `
    <header class="topbar"><div class="title">Settings</div></header>
    <div class="scroll">
      <section class="card">
        <h2>You</h2>
        <label class="field">Your name<input data-field="name" maxlength="30" value="${escapeHtml(state.name)}"></label>
      </section>
      <section class="card">
        <h2>Workouts</h2>
        <div class="field-label">Default difficulty</div>
        ${segmented("default-difficulty", Object.entries(DIFFICULTIES).map(([id, d]) => [id, `${d.label} · ${d.work}s`]), s.difficulty)}
        <div class="row-between">
          <div class="field-label">Weekly goal</div>
          <div class="stepper">
            <button type="button" data-weekly="-1" aria-label="Lower goal" ${s.weeklyGoal <= 1 ? "disabled" : ""}>−</button>
            <span>${s.weeklyGoal} × a week</span>
            <button type="button" data-weekly="1" aria-label="Raise goal" ${s.weeklyGoal >= 7 ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="field-label">Get-ready time</div>
        ${segmented("ready", [["5", "5 s"], ["10", "10 s"], ["15", "15 s"]], String(s.readySeconds))}
      </section>
      <section class="card">
        <h2>Sound</h2>
        <label class="toggle"><span>Beeps</span><input type="checkbox" data-setting="sound" ${s.sound ? "checked" : ""}></label>
        <label class="toggle"><span>Voice coach</span><input type="checkbox" data-setting="voice" ${s.voice ? "checked" : ""}></label>
        <button type="button" class="btn" data-act="test-sound">Test sound</button>
        <p class="muted small">Sound follows the ring/silent switch and plays along with your music.</p>
      </section>
      <section class="card">
        <h2>Your data</h2>
        <p class="muted small">Everything is stored only on this phone. Save a backup if you switch phones.</p>
        <div class="row">
          <button type="button" class="btn grow" data-act="export">Save backup</button>
          <label class="btn grow">Restore backup<input type="file" accept="application/json,.json" data-act="import" hidden></label>
        </div>
        <button type="button" class="btn danger" data-act="reset">Delete everything</button>
      </section>
      <p class="about">Peppy · works offline · no account, no ads</p>
    </div>`;
}

async function exportBackup() {
  const name = `peppy-backup-${dayKey()}.json`;
  const file = new File([JSON.stringify(exportState(), null, 2)], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Peppy backup" });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function importBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.history) || typeof data.settings !== "object") throw new Error("invalid");
  } catch {
    toast("That file isn't a Peppy backup.");
    return;
  }
  const ok = await confirmSheet("Restore backup?", "This replaces everything on this phone.", "Restore");
  if (!ok) return;
  replaceState(data);
  toast("Backup restored ✨");
  showView("today");
}

// ---------- Events ----------

function bindEvents() {
  $("#tabbar").addEventListener("click", (e) => {
    const view = e.target.closest("[data-view]")?.dataset.view;
    if (view) showView(view);
  });

  // Start buttons, workout cards and back buttons appear on several screens.
  document.querySelector(".views").addEventListener("click", (e) => {
    const start = e.target.closest("[data-start]")?.dataset.start;
    if (start) return begin(start);
    const open = e.target.closest("[data-open]")?.dataset.open;
    if (open) return openWorkout(open);
    if (e.target.closest("[data-act=back]")) showView("today");
  });

  $("#view-today").addEventListener("click", (e) => {
    if (e.target.closest("[data-act=poke]")) poke();
  });

  $("#view-workout").addEventListener("click", (e) => {
    const seg = e.target.closest("[data-seg=difficulty]");
    if (seg) {
      detail.difficulty = seg.dataset.value;
      renderWorkout();
      return;
    }
    const rounds = e.target.closest("[data-rounds]")?.dataset.rounds;
    if (rounds) {
      detail.rounds = Math.min(4, Math.max(1, detail.rounds + Number(rounds)));
      renderWorkout();
      return;
    }
    const preview = e.target.closest("[data-preview]")?.dataset.preview;
    if (preview) previewMove(preview);
  });

  const progress = $("#view-progress");
  progress.addEventListener("pointerover", (e) => {
    if (e.pointerType === "mouse") showTip(e.target.closest("[data-tip]"));
  });
  progress.addEventListener("click", (e) => {
    const target = e.target.closest("[data-tip]");
    if (target) showTip(target);
    else hideTip();
  });
  progress.addEventListener("focusin", (e) => showTip(e.target.closest("[data-tip]")));
  progress.addEventListener("pointerleave", hideTip);
  progress.addEventListener("scroll", hideTip, true);

  const buddy = $("#view-buddy");
  buddy.addEventListener("click", (e) => {
    const id = e.target.closest("[data-buddy]")?.dataset.buddy;
    if (id) {
      state.buddy = id;
      save();
      renderBuddy();
      return;
    }
    const gear = e.target.closest("[data-gear]")?.dataset.gear;
    if (gear) {
      state.wear = state.wear.includes(gear) ? state.wear.filter((g) => g !== gear) : [...state.wear, gear];
      save();
      renderBuddy();
      return;
    }
    if (e.target.closest("[data-act=cheer]")) {
      const svg = buddy.querySelector(".buddy-big svg");
      pose(svg, { anim: "celebrate", cycle: 0.8 });
      setTimeout(() => svg.isConnected && pose(svg, { anim: "idle", cycle: 3.2 }), 1600);
    }
  });
  buddy.addEventListener("change", (e) => {
    if (!e.target.matches("[data-buddy-name]")) return;
    const value = e.target.value.trim();
    if (!value || value === figureById(state.buddy).name) delete state.buddyNames[state.buddy];
    else state.buddyNames[state.buddy] = value;
    save();
    renderBuddy();
  });

  const settings = $("#view-settings");
  settings.addEventListener("click", async (e) => {
    const seg = e.target.closest("[data-seg]");
    if (seg?.dataset.seg === "default-difficulty") {
      state.settings.difficulty = seg.dataset.value;
      selectSegment(seg);
      save();
    } else if (seg?.dataset.seg === "ready") {
      state.settings.readySeconds = Number(seg.dataset.value);
      selectSegment(seg);
      save();
    }
    const weekly = e.target.closest("[data-weekly]")?.dataset.weekly;
    if (weekly) {
      state.settings.weeklyGoal = Math.min(7, Math.max(1, state.settings.weeklyGoal + Number(weekly)));
      save();
      renderSettings();
      return;
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "test-sound") {
      unlockAudio();
      if (state.settings.sound) beep.go();
      if (state.settings.voice) sayLines(["test"]);
      if (!state.settings.sound && !state.settings.voice) toast("Turn on beeps or the voice coach first.");
    } else if (act === "export") {
      exportBackup();
    } else if (act === "reset") {
      const ok = await confirmSheet(
        "Delete everything?",
        "All workouts, XP and settings will be removed from this phone.",
        "Delete everything",
        "danger",
      );
      if (!ok) return;
      resetState();
      location.reload();
    }
  });
  settings.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.dataset.act === "import" && t.files[0]) {
      await importBackup(t.files[0]);
      t.value = "";
    } else if (t.dataset.setting) {
      state.settings[t.dataset.setting] = t.checked;
      save();
    } else if (t.dataset.field === "name") {
      state.name = t.value.trim();
      save();
    }
  });

  $("#sheet").addEventListener("click", (e) => {
    if (e.target.id === "sheet") e.target.close("cancel");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveNow();
    else if (currentView === "today" && !isRunning()) renderToday();
  });
  window.addEventListener("pagehide", saveNow);
}

// On iOS only the visible part of the screen shrinks when the keyboard opens.
function syncViewport() {
  const vv = window.visualViewport;
  document.documentElement.style.setProperty("--app-height", `${vv ? vv.height : window.innerHeight}px`);
  if (vv && vv.offsetTop > 0) window.scrollTo(0, 0);
}

function init() {
  syncViewport();
  window.visualViewport?.addEventListener("resize", syncViewport);
  window.addEventListener("resize", syncViewport);
  bindOnboarding();
  bindEvents();
  showView(state.onboarded ? "today" : "onboarding");
  // Only as a top-level page: embedded previews (iframes) don't allow service workers.
  if ("serviceWorker" in navigator && window.self === window.top) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("Service worker failed", err));
  }
  navigator.storage?.persist?.().catch(() => {});
}

init();
