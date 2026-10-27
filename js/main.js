import { state, save, saveNow, uid, dayKey, monthKey, replaceState, exportState, resetState } from "./state.js";
import { alienSVG, PALETTES, palette, setMood, wiggle } from "./alien.js";
import { streamReply, describeError, MODELS, verifyKey } from "./claude.js";
import {
  systemPrompt,
  apiMessages,
  addMessage,
  addEvent,
  greetingEvent,
  recordUsage,
  updateMemories,
  refreshDailyIdeas,
  useIdea,
  addManualMemory,
  removeMemory,
} from "./companion.js";
import { ITEMS, itemById, itemPhrase, itemPreview, findFreeAngle, planetSVG } from "./planet.js";
import { speak, unlockSpeech, speechSupported, stopSpeaking } from "./speech.js";
import { $, escapeHtml, formatMessage, toast, sheet, confirmSheet, formatUSD, dayLabel } from "./ui.js";

const GREETING_GAP_MS = 3 * 60 * 60 * 1000;
const MEMORY_STALE_MS = 30 * 60 * 1000;
const DUST_PER_MESSAGE = 3;
const DUST_DAILY_CAP = 60;
const NAME_SUGGESTIONS = ["Pip", "Lumi", "Zibo", "Nuka", "Momo", "Bibbi"];
const POKES = ["Hihi, det kilder!", "Bip bop! 👋", "Hej med dig!", "Det var min antenne!", "Jeg er her skam!", "Klar til at snakke?"];

let busy = false;
let streamingText = null; // teksten i det svar, der er ved at blive skrevet
let stageColor = "";

const friend = () => state.profile.friendName || "Pip";
const user = () => state.profile.userName || "dig";

// ---------- Tema, stjernehimmel og skærmhøjde ----------

function applyTheme(color = state.profile.color) {
  const p = palette(color);
  const root = document.documentElement.style;
  root.setProperty("--accent", p.body);
  root.setProperty("--accent-light", p.light);
  root.setProperty("--accent-dark", p.dark);
  root.setProperty("--accent-ink", p.ink);
}

function buildSky() {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let html = "";
  for (let i = 0; i < 90; i++) {
    const size = (rand() * 1.8 + 0.6).toFixed(1);
    html += `<i class="star${rand() > 0.6 ? " twinkle" : ""}" style="left:${(rand() * 100).toFixed(2)}%;top:${(
      rand() * 100
    ).toFixed(2)}%;width:${size}px;height:${size}px;opacity:${(rand() * 0.6 + 0.25).toFixed(2)};animation-delay:${(
      rand() * 6
    ).toFixed(1)}s"></i>`;
  }
  $(".sky").innerHTML = `${html}<i class="shooting-star"></i>`;
}

// På iOS skrumper kun det synlige område, når tastaturet kommer frem.
function syncViewport() {
  const vv = window.visualViewport;
  document.documentElement.style.setProperty("--app-height", `${vv ? vv.height : window.innerHeight}px`);
  if (vv && vv.offsetTop > 0) window.scrollTo(0, 0);
}

// ---------- Navigation ----------

function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  document.querySelectorAll("#tabbar button").forEach((b) => {
    b.setAttribute("aria-current", b.dataset.view === name ? "page" : "false");
  });
  $("#tabbar").hidden = name === "onboarding";
  if (name === "chat") {
    renderChat();
    scrollToBottom(true);
  }
  if (name === "planet") renderPlanet();
  if (name === "memories") renderMemories();
  if (name === "settings") renderSettings();
}

// ---------- Velkomst ----------

let step = 0;
const draft = { userName: "", friendName: "", color: "mint" };

function swatchesHTML(selected, name) {
  return Object.entries(PALETTES)
    .map(
      ([id, p]) => `<label class="swatch" style="--sw:${p.body}" title="${p.label}">
        <input type="radio" name="${name}" value="${id}" ${id === selected ? "checked" : ""} aria-label="${p.label}">
        <span></span></label>`,
    )
    .join("");
}

function renderOnboarding() {
  const view = $("#view-onboarding");
  const friendName = escapeHtml(draft.friendName || "din ven");
  const screens = [
    () => `
      <div class="ob-alien">${alienSVG({ color: draft.color, label: "Et lille rumvæsen" })}</div>
      <h1>Hej, jordbo!</h1>
      <p>Langt ude i rummet sidder et lille væsen og kigger ned på Jorden. Det leder efter en ven.</p>
      <button class="btn primary big" type="button" data-action="next">Sig hej 👋</button>`,
    () => `
      <form class="ob-form" data-step="name">
        <div class="ob-alien small">${alienSVG({ color: draft.color, mood: "listening" })}</div>
        <h1>Hvad hedder du?</h1>
        <input name="userName" maxlength="40" required autocomplete="given-name" placeholder="Dit navn" value="${escapeHtml(draft.userName)}">
        <button class="btn primary big">Videre</button>
      </form>`,
    () => `
      <form class="ob-form" data-step="friend">
        <div class="ob-alien" id="ob-preview">${alienSVG({ color: draft.color, mood: "happy" })}</div>
        <h1>Din nye ven</h1>
        <p>Hvad skal den hedde, og hvilken farve har den?</p>
        <input name="friendName" maxlength="24" required placeholder="Fx Pip" value="${escapeHtml(draft.friendName)}">
        <div class="chips">${NAME_SUGGESTIONS.map((n) => `<button type="button" class="chip" data-name="${n}">${n}</button>`).join("")}</div>
        <div class="swatches">${swatchesHTML(draft.color, "color")}</div>
        <button class="btn primary big">Videre</button>
      </form>`,
    () => `
      <form class="ob-form" data-step="key">
        <div class="ob-alien small">${alienSVG({ color: draft.color })}</div>
        <h1>Giv ${friendName} en stemme</h1>
        <p>${friendName} tænker med Claude fra Anthropic. Indsæt din egen API-nøgle. Den gemmes kun på denne telefon.</p>
        <input name="apiKey" type="password" placeholder="sk-ant-…" autocomplete="off" autocapitalize="off" spellcheck="false">
        <p class="hint">Opret en nøgle på <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. Du betaler selv for forbruget hos Anthropic: ca. 5-20 øre pr. besked med Opus og langt mindre med Haiku.</p>
        <button class="btn primary big">Start</button>
        <button class="btn ghost" type="button" data-action="skip-key">Spring over</button>
      </form>`,
  ];
  view.innerHTML = `<div class="onboarding">
    <div class="ob-dots">${screens.map((_, i) => `<span class="${i === step ? "on" : ""}"></span>`).join("")}</div>
    ${screens[step]()}</div>`;
  view.querySelector("input:not([type=radio])")?.focus({ preventScroll: true });
}

function finishOnboarding(apiKey) {
  Object.assign(state.profile, {
    userName: draft.userName,
    friendName: draft.friendName,
    color: draft.color,
  });
  state.settings.apiKey = apiKey.trim();
  state.onboarded = true;
  saveNow();
  applyTheme();
  showView("chat");
  onAppVisible();
}

function bindOnboarding() {
  const view = $("#view-onboarding");
  view.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "next") {
      step = 1;
      renderOnboarding();
    } else if (action === "skip-key") {
      finishOnboarding("");
    }
    const name = e.target.closest("[data-name]")?.dataset.name;
    if (name) view.querySelector("input[name=friendName]").value = name;
  });
  view.addEventListener("change", (e) => {
    if (e.target.name !== "color") return;
    draft.color = e.target.value;
    applyTheme(draft.color);
    $("#ob-preview").innerHTML = alienSVG({ color: draft.color, mood: "happy" });
  });
  view.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    if (form.dataset.step === "name") {
      draft.userName = String(data.get("userName")).trim();
      step = 2;
    } else if (form.dataset.step === "friend") {
      draft.friendName = String(data.get("friendName")).trim();
      draft.color = String(data.get("color") || draft.color);
      step = 3;
    } else if (form.dataset.step === "key") {
      finishOnboarding(String(data.get("apiKey")));
      return;
    }
    renderOnboarding();
  });
}

// ---------- Chat ----------

function setStatus(kind) {
  const text = {
    idle: `fra planeten ${state.profile.planetName}`,
    thinking: "tænker …",
    talking: "skriver …",
  }[kind];
  $("#chat-status").textContent = text;
}

function restingMood() {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 6 ? "sleepy" : "idle";
}

function renderStage() {
  if (stageColor === `${state.profile.color}|${friend()}`) return;
  stageColor = `${state.profile.color}|${friend()}`;
  $("#stage-alien").innerHTML = alienSVG({ color: state.profile.color, label: friend(), mood: restingMood() });
}

function messageHTML(m) {
  if (m.event) return m.note ? `<div class="msg notice">${escapeHtml(m.note)}</div>` : "";
  const cls = m.role === "user" ? "me" : "friend";
  return `<div class="msg ${cls}${m.skip ? " skipped" : ""}" data-id="${m.id}">${formatMessage(m.text)}</div>`;
}

function renderChat() {
  $("#chat-name").textContent = friend();
  $("#input").placeholder = `Skriv til ${friend()} …`;
  if (!busy) setStatus("idle");
  renderStage();
  updateDust();
  let html = "";
  let lastDay = "";
  for (const m of state.messages) {
    const piece = messageHTML(m);
    if (!piece) continue;
    const day = dayLabel(m.ts);
    if (day !== lastDay) {
      html += `<div class="day-sep">${day}</div>`;
      lastDay = day;
    }
    html += piece;
  }
  if (streamingText !== null) {
    html += streamingText
      ? `<div class="msg friend" id="pending">${formatMessage(streamingText)}</div>`
      : `<div class="msg friend typing" id="pending"><span></span><span></span><span></span></div>`;
  } else if (!state.messages.some((m) => !m.event || m.note)) {
    html += `<div class="msg notice" id="hello-hint">Sig hej til ${escapeHtml(friend())} 👋</div>`;
  }
  $("#messages").innerHTML = html;
  if (!state.settings.apiKey) showNotice(`${friend()} mangler en API-nøgle for at kunne svare.`, "Indstillinger", () => showView("settings"));
  renderIdeas();
}

function nearBottom() {
  const el = $("#messages");
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

function scrollToBottom(force = false) {
  const el = $("#messages");
  if (force || nearBottom()) el.scrollTop = el.scrollHeight;
}

function appendHTML(html) {
  $("#hello-hint")?.remove();
  const stick = nearBottom();
  $("#messages").insertAdjacentHTML("beforeend", html);
  if (stick) scrollToBottom(true);
}

function showNotice(text, buttonLabel, onClick) {
  const id = `n${uid()}`;
  appendHTML(`<div class="msg notice error" id="${id}">${escapeHtml(text)}${
    buttonLabel ? ` <button type="button" class="link">${escapeHtml(buttonLabel)}</button>` : ""
  }</div>`);
  if (onClick) $(`#${id} button`).addEventListener("click", onClick);
}

function renderIdeas() {
  const show = state.daily.ideas.length && !busy && !$("#input").value.trim();
  $("#ideas").innerHTML = show
    ? state.daily.ideas.map((idea) => `<button type="button" class="chip" data-idea="${escapeHtml(idea)}">${escapeHtml(idea)}</button>`).join("")
    : "";
}

function setBusy(value) {
  busy = value;
  $("#send").disabled = value;
  renderIdeas();
}

function earnDust(amount) {
  const d = state.dust;
  const today = dayKey();
  if (d.earnedDay !== today) {
    d.earnedDay = today;
    d.earnedToday = 0;
  }
  const gain = Math.min(amount, DUST_DAILY_CAP - d.earnedToday);
  if (gain <= 0) return;
  d.earnedToday += gain;
  d.balance += gain;
  save();
  updateDust();
  const pill = $("#chat-dust");
  const float = document.createElement("span");
  float.className = "dust-float";
  float.textContent = `+${gain}`;
  pill.append(float);
  setTimeout(() => float.remove(), 1200);
}

function updateDust() {
  document.querySelectorAll(".dust-count").forEach((el) => {
    el.textContent = state.dust.balance;
  });
}

function checkDailyBonus() {
  const d = state.dust;
  const today = dayKey();
  if (d.lastVisitDay === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  d.streak = d.lastVisitDay === dayKey(yesterday) ? d.streak + 1 : 1;
  d.lastVisitDay = today;
  const bonus = 10 + 2 * Math.min(d.streak, 7);
  d.balance += bonus;
  save();
  updateDust();
  toast(d.streak > 1 ? `✨ +${bonus} stjernestøv – dag ${d.streak} i træk!` : `✨ +${bonus} stjernestøv for at kigge forbi!`);
}

// Markerer ubesvarede beskeder, så de ikke sendes igen (fx efter en afvisning).
function skipUnanswered() {
  for (let i = state.messages.length - 1; i >= 0 && state.messages[i].role === "user"; i--) {
    state.messages[i].skip = true;
  }
  save();
}

async function requestReply() {
  const messages = apiMessages();
  if (busy || !state.settings.apiKey || messages.at(-1)?.role !== "user") return;
  setBusy(true);
  const stage = $("#stage-alien");
  setMood(stage, "thinking");
  setStatus("thinking");
  appendHTML(`<div class="msg friend typing" id="pending"><span></span><span></span><span></span></div>`);

  let text = "";
  let frame = 0;
  streamingText = "";
  const paint = () => {
    frame = 0;
    const el = $("#pending");
    if (!el) return;
    el.classList.remove("typing");
    el.innerHTML = formatMessage(text);
    scrollToBottom();
  };

  try {
    const { message, text: finalText } = await streamReply({
      apiKey: state.settings.apiKey,
      model: state.settings.model,
      system: systemPrompt(),
      messages,
      onText: (delta) => {
        if (!text) {
          setMood(stage, "talking");
          setStatus("talking");
        }
        text += delta;
        streamingText = text;
        frame ||= requestAnimationFrame(paint);
      },
    });
    recordUsage(message);
    cancelAnimationFrame(frame);
    streamingText = null;
    $("#pending")?.remove();
    if (message.stop_reason === "refusal") {
      skipUnanswered();
      renderChat();
      showNotice(`${friend()} kan ikke svare på det. Prøv at skrive noget andet.`);
      return;
    }
    const reply = (finalText || text).trim();
    if (!reply) {
      showNotice(`${friend()} fandt ikke på noget at sige.`, "Prøv igen", (e) => {
        e.target.closest(".msg").remove();
        requestReply();
      });
      return;
    }
    const stored = addMessage("assistant", message.stop_reason === "max_tokens" ? `${reply} …` : reply);
    appendHTML(messageHTML(stored));
    if (state.settings.speak) speak(reply);
    setMood(stage, "happy");
    setTimeout(() => !busy && setMood(stage, restingMood()), 1400);
    updateMemories()
      .then((added) => added > 0 && toast(`✨ ${friend()} husker det`))
      .catch((err) => console.warn("Kunne ikke opdatere minder", err));
  } catch (err) {
    cancelAnimationFrame(frame);
    streamingText = null;
    $("#pending")?.remove();
    const reason = describeError(err);
    if (reason) showNotice(reason, "Prøv igen", (e) => {
      e.target.closest(".msg").remove();
      requestReply();
    });
    console.warn(err);
  } finally {
    setBusy(false);
    setStatus("idle");
    if ($("#stage-alien svg")?.dataset.mood !== "happy") setMood(stage, restingMood());
  }
}

async function sendText(raw) {
  const text = raw.trim();
  if (!text || busy) return;
  if (!state.settings.apiKey) {
    showNotice(`Tilføj din API-nøgle, så ${friend()} kan svare.`, "Indstillinger", () => showView("settings"));
    return;
  }
  if (state.settings.speak) unlockSpeech();
  const input = $("#input");
  input.value = "";
  autosize(input);
  const message = addMessage("user", text);
  appendHTML(messageHTML(message));
  scrollToBottom(true);
  earnDust(DUST_PER_MESSAGE);
  await requestReply();
}

async function maybeGreet() {
  if (!state.onboarded || busy || !state.settings.apiKey) return;
  const last = state.messages.at(-1);
  // En hilsen, der ikke blev besvaret sidst, prøves igen i stedet for at lave en ny.
  if (last?.event && last.role === "user" && !last.note && !last.skip) {
    await requestReply();
    return;
  }
  const hasChatted = state.messages.some((m) => m.role === "assistant");
  const lastActivity = Math.max(last?.ts || 0, state.lastGreetingTs);
  if (hasChatted && Date.now() - lastActivity < GREETING_GAP_MS) return;
  state.lastGreetingTs = Date.now();
  addEvent(greetingEvent());
  await requestReply();
}

function autosize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
}

function poke() {
  const stage = $("#stage-alien");
  wiggle(stage);
  if (busy) return;
  const bubble = $("#poke");
  bubble.textContent = POKES[Math.floor(Math.random() * POKES.length)];
  bubble.classList.remove("show");
  void bubble.offsetWidth;
  bubble.classList.add("show");
  setMood(stage, "happy");
  setTimeout(() => !busy && setMood(stage, restingMood()), 1200);
}

function bindChat() {
  const input = $("#input");
  $("#composer").addEventListener("submit", (e) => {
    e.preventDefault();
    sendText(input.value);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendText(input.value);
    }
  });
  input.addEventListener("input", () => {
    autosize(input);
    renderIdeas();
    if (!busy) setMood($("#stage-alien"), input.value.trim() ? "listening" : restingMood());
  });
  input.addEventListener("focus", () => {
    document.body.classList.add("typing");
    setTimeout(() => scrollToBottom(true), 300);
  });
  input.addEventListener("blur", () => document.body.classList.remove("typing"));
  // Send-knappen må ikke tage fokus, så tastaturet bliver oppe efter afsendelse.
  $("#send").addEventListener("mousedown", (e) => e.preventDefault());
  // Et tryk i samtalen lukker tastaturet igen.
  $("#messages").addEventListener("click", (e) => {
    if (!e.target.closest("button")) input.blur();
  });
  $("#ideas").addEventListener("click", (e) => {
    const idea = e.target.closest("[data-idea]")?.dataset.idea;
    if (!idea || busy) return;
    useIdea(idea);
    sendText(idea);
  });
  $("#stage").addEventListener("click", poke);
  $("#chat-dust").addEventListener("click", () => showView("planet"));
}

// ---------- Planet ----------

function renderPlanet() {
  $("#planet-name").textContent = state.profile.planetName;
  $("#planet-wrap").innerHTML = planetSVG({ planet: state.planet, color: state.profile.color, friendName: friend() });
  updateDust();
  $("#shop-list").innerHTML = ITEMS.map((item) => {
    const owned = item.unique && state.planet.items.some((it) => it.type === item.id);
    const poor = !owned && state.dust.balance < item.cost;
    return `<button type="button" class="shop-item${owned ? " owned" : ""}${poor ? " poor" : ""}" data-buy="${item.id}" ${owned ? "disabled" : ""}>
      ${itemPreview(item)}
      <span class="shop-name">${item.name}</span>
      <span class="shop-cost">${owned ? "På planeten" : `✨ ${item.cost}`}</span>
    </button>`;
  }).join("");
}

function buy(id) {
  const item = itemById(id);
  if (!item) return;
  const missing = item.cost - state.dust.balance;
  if (missing > 0) {
    toast(`Du mangler ${missing} stjernestøv. Snak med ${friend()} for at samle mere ✨`);
    return;
  }
  let angle = 0;
  if (!item.unique) {
    angle = findFreeAngle(state.planet);
    if (angle === null) {
      toast("Planeten er fuld. Tryk på en ting for at fjerne den.");
      return;
    }
  }
  state.dust.balance -= item.cost;
  state.planet.items.push({ id: uid(), type: item.id, angle });
  addMessage("user", `${state.profile.userName} satte ${itemPhrase(item)} på planeten.`, {
    event: true,
    note: `Du satte ${itemPhrase(item)} på planeten`,
  });
  save();
  renderPlanet();
  const alien = $("#planet-wrap");
  setMood(alien, "happy");
  setTimeout(() => setMood(alien, "idle"), 1600);
  toast(`${item.name} er sat på ${state.profile.planetName}!`);
}

async function removeItem(id) {
  const placed = state.planet.items.find((it) => it.id === id);
  const item = placed && itemById(placed.type);
  if (!item) return;
  const refund = Math.floor(item.cost / 2);
  const ok = await confirmSheet(item.name, `Vil du fjerne den fra planeten? Du får ${refund} stjernestøv tilbage.`, "Fjern", "danger");
  if (!ok) return;
  state.planet.items = state.planet.items.filter((it) => it.id !== id);
  state.dust.balance += refund;
  addMessage("user", `${state.profile.userName} fjernede ${itemPhrase(item)} fra planeten.`, {
    event: true,
    note: `Du fjernede ${itemPhrase(item)} fra planeten`,
  });
  save();
  renderPlanet();
}

function bindPlanet() {
  const wrap = $("#planet-wrap");
  let drag = null;
  wrap.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, start: state.planet.rotation, moved: false, target: e.target };
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    if (!drag.moved) return;
    state.planet.rotation = drag.start + dx * 0.45;
    $("#planet-rot")?.setAttribute("transform", `rotate(${state.planet.rotation.toFixed(1)} 200 250)`);
  });
  const end = () => {
    if (!drag) return;
    const { moved, target } = drag;
    drag = null;
    if (moved) {
      state.planet.rotation = ((state.planet.rotation % 360) + 360) % 360;
      save();
      return;
    }
    const itemId = target.closest?.("[data-item]")?.dataset.item;
    if (itemId) removeItem(itemId);
    else if (target.closest?.(".alien")) wiggle(wrap);
  };
  wrap.addEventListener("pointerup", end);
  wrap.addEventListener("pointercancel", () => {
    drag = null;
  });
  $("#shop-list").addEventListener("click", (e) => {
    const id = e.target.closest("[data-buy]")?.dataset.buy;
    if (id) buy(id);
  });
}

// ---------- Minder ----------

function renderMemories() {
  const groups = [
    ["user", "Om dig"],
    ["friend", `Om ${friend()}`],
    ["shared", "Jeres fælles"],
  ];
  const list = groups
    .map(([kind, title]) => {
      const items = state.memory.items.filter((it) => it.kind === kind);
      if (!items.length) return "";
      return `<section class="card"><h2>${escapeHtml(title)}</h2><ul class="memory-list">${items
        .map(
          (it) => `<li><span>${escapeHtml(it.text)}</span>
            <button type="button" class="icon-btn" data-forget="${it.id}" aria-label="Glem">×</button></li>`,
        )
        .join("")}</ul></section>`;
    })
    .join("");
  $("#mem-sub").textContent = `Det, ${friend()} husker`;
  $("#mem-list").innerHTML = `
    <p class="intro">${escapeHtml(friend())} husker selv vigtige ting fra jeres samtaler. Du kan slette det, du ikke vil have, at den husker, eller fortælle den noget direkte.</p>
    <form class="card add-memory" id="add-memory">
      <input name="text" maxlength="200" placeholder="Fx: Jeg er vild med lakrids" aria-label="Nyt minde">
      <button class="btn primary">Tilføj</button>
    </form>
    ${list || `<p class="empty">Ingen minder endnu. Snak lidt med ${escapeHtml(friend())} først ✨</p>`}
    <button type="button" class="btn ghost" data-action="refresh-memories">Gennemgå nye beskeder nu</button>`;
}

function bindMemories() {
  const root = $("#mem-list");
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = e.target.elements.text;
    addManualMemory(input.value);
    renderMemories();
  });
  root.addEventListener("click", async (e) => {
    const id = e.target.closest("[data-forget]")?.dataset.forget;
    if (id) {
      removeMemory(id);
      renderMemories();
      return;
    }
    if (e.target.closest("[data-action=refresh-memories]")) {
      if (!state.settings.apiKey) return toast("Tilføj en API-nøgle først.");
      toast(`${friend()} tænker over jeres samtaler …`);
      try {
        const added = await updateMemories({ force: true });
        toast(added ? `✨ ${added} nye minder` : "Ingen nye ting at huske lige nu.");
        renderMemories();
      } catch (err) {
        toast(describeError(err) || "Det lykkedes ikke.");
      }
    }
  });
}

// ---------- Indstillinger ----------

function renderSettings() {
  const { profile, settings, usage } = state;
  const month = new Intl.DateTimeFormat("da-DK", { month: "long" }).format(new Date());
  const spent = usage.month === monthKey() ? usage : { usd: 0, requests: 0 };
  $("#settings-body").innerHTML = `
    <section class="card">
      <h2>Profil</h2>
      <label>Dit navn<input data-field="profile.userName" maxlength="40" value="${escapeHtml(profile.userName)}"></label>
      <label>Vennens navn<input data-field="profile.friendName" maxlength="24" value="${escapeHtml(profile.friendName)}"></label>
      <label>Planetens navn<input data-field="profile.planetName" maxlength="30" value="${escapeHtml(profile.planetName)}"></label>
      <div class="label">Farve</div>
      <div class="swatches">${swatchesHTML(profile.color, "settings-color")}</div>
    </section>
    <section class="card">
      <h2>Claude</h2>
      <label>API-nøgle<input data-field="settings.apiKey" type="password" placeholder="sk-ant-…" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escapeHtml(settings.apiKey)}"></label>
      <p class="hint">Nøglen gemmes kun på denne telefon og sendes kun til Anthropic. <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Få en nøgle</a></p>
      <label>Model<select data-field="settings.model">${MODELS.map(
        (m) => `<option value="${m.id}" ${m.id === settings.model ? "selected" : ""}>${m.label} – ${m.note}</option>`,
      ).join("")}</select></label>
      <button type="button" class="btn" data-action="test-key">Test forbindelsen</button>
      <p class="hint">Forbrug i ${month}: ca. ${formatUSD(spent.usd)} (${spent.requests} kald). Det præcise tal står på console.anthropic.com.</p>
    </section>
    <section class="card">
      <h2>Lyd</h2>
      <label class="toggle"><input type="checkbox" data-field="settings.speak" ${settings.speak ? "checked" : ""} ${
        speechSupported ? "" : "disabled"
      }><span>Læs ${escapeHtml(friend())}s beskeder højt</span></label>
    </section>
    <section class="card">
      <h2>Dine data</h2>
      <p class="hint">Alt gemmes kun på denne telefon. Gem en sikkerhedskopi, hvis du skifter telefon. API-nøglen kommer ikke med.</p>
      <div class="row">
        <button type="button" class="btn" data-action="export">Gem sikkerhedskopi</button>
        <label class="btn">Hent sikkerhedskopi<input type="file" accept="application/json,.json" data-action="import" hidden></label>
      </div>
      <button type="button" class="btn danger" data-action="reset">Slet alt og start forfra</button>
    </section>
    <p class="about">Stjerneven · din lille ven fra rummet</p>`;
}

function setField(path, value) {
  const [section, key] = path.split(".");
  state[section][key] = value;
  save();
  if (section === "profile") {
    applyTheme();
    stageColor = "";
  }
}

async function exportBackup() {
  const name = `stjerneven-${dayKey()}.json`;
  const file = new File([JSON.stringify(exportState(), null, 2)], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Stjerneven-sikkerhedskopi" });
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
    if (!data || !Array.isArray(data.messages) || typeof data.profile !== "object") throw new Error("ugyldig");
  } catch {
    toast("Filen er ikke en Stjerneven-sikkerhedskopi.");
    return;
  }
  const ok = await confirmSheet("Hent sikkerhedskopi?", "Det erstatter alt på denne telefon. Din API-nøgle bliver.", "Hent");
  if (!ok) return;
  replaceState(data);
  applyTheme();
  stageColor = "";
  toast("Sikkerhedskopien er hentet ✨");
  showView("chat");
}

function bindSettings() {
  const root = $("#settings-body");
  root.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.name === "settings-color") {
      setField("profile.color", t.value);
      return;
    }
    if (t.dataset.action === "import" && t.files[0]) {
      await importBackup(t.files[0]);
      t.value = "";
      return;
    }
    if (!t.dataset.field) return;
    const value = t.type === "checkbox" ? t.checked : t.value.trim();
    if (t.dataset.field.startsWith("profile.") && !value) return;
    setField(t.dataset.field, value);
    if (t.dataset.field === "settings.speak" && value) unlockSpeech();
    if (t.dataset.field === "settings.apiKey" && value) refreshDailyIdeas();
  });
  root.addEventListener("click", async (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "test-key") {
      const key = state.settings.apiKey;
      if (!key) return toast("Indsæt en API-nøgle først.");
      toast("Tester …");
      try {
        await verifyKey({ apiKey: key, model: state.settings.model });
        toast("✅ Nøglen virker!");
      } catch (err) {
        toast(describeError(err) || "Det lykkedes ikke.", 4000);
      }
    } else if (action === "export") {
      exportBackup();
    } else if (action === "reset") {
      const ok = await confirmSheet(
        "Slet alt?",
        `Alle beskeder, minder og jeres planet bliver slettet fra telefonen. ${friend()} glemmer dig.`,
        "Slet alt",
        "danger",
      );
      if (!ok) return;
      resetState();
      location.reload();
    }
  });
}

// ---------- Opstart ----------

function onAppVisible() {
  if (!state.onboarded) return;
  checkDailyBonus();
  maybeGreet();
  refreshDailyIdeas().then((changed) => changed && renderIdeas());
  updateMemories({ staleMs: MEMORY_STALE_MS })
    .then((added) => added > 0 && toast(`✨ ${friend()} husker nye ting`))
    .catch((err) => console.warn("Kunne ikke opdatere minder", err));
}

function init() {
  applyTheme();
  buildSky();
  syncViewport();
  window.visualViewport?.addEventListener("resize", syncViewport);
  window.visualViewport?.addEventListener("scroll", syncViewport);
  window.addEventListener("resize", syncViewport);

  bindOnboarding();
  bindChat();
  bindPlanet();
  bindMemories();
  bindSettings();
  $("#tabbar").addEventListener("click", (e) => {
    const view = e.target.closest("[data-view]")?.dataset.view;
    if (view) showView(view);
  });
  $("#sheet").addEventListener("click", (e) => {
    if (e.target.id === "sheet") e.target.close("cancel");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") onAppVisible();
    else {
      saveNow();
      stopSpeaking();
    }
  });
  window.addEventListener("pagehide", saveNow);

  if (state.onboarded) {
    showView("chat");
    onAppVisible();
  } else {
    renderOnboarding();
    showView("onboarding");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("Service worker fejlede", err));
  }
  navigator.storage?.persist?.().catch(() => {});
}

init();
