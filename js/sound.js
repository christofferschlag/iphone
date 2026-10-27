// Beeps made with Web Audio, and the voice coach: recorded clips (see coach.js),
// with the phone's own speech voice as a fallback.
import { LINES } from "./coach.js";

let ctx = null;
let speechReady = false;
let beepsEnd = 0;
let clips = new Map(); // clip id -> Promise<AudioBuffer | null>
let playing = [];
let token = 0;

// Must be called from a tap: iOS only allows audio that a tap started.
export function unlockAudio() {
  try {
    // Mix with music instead of stopping it.
    if (navigator.audioSession) navigator.audioSession.type = "ambient";
  } catch {
    /* not supported */
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!ctx && AudioCtx) ctx = new AudioCtx();
  // iOS also suspends audio while the phone is locked or a call comes in.
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
  if (window.speechSynthesis && !speechReady) {
    const silent = new SpeechSynthesisUtterance(" ");
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    speechReady = true;
  }
}

function tone(freq, at, duration, gain = 0.22) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
  beepsEnd = Math.max(beepsEnd, t + duration);
}

export const beep = {
  tick: () => tone(880, 0, 0.1),
  go: () => {
    tone(660, 0, 0.12);
    tone(990, 0.13, 0.22);
  },
  rest: () => {
    tone(784, 0, 0.14);
    tone(523, 0.15, 0.25);
  },
  done: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3)),
};

async function loadClip(id) {
  try {
    const response = await fetch(`audio/${id}.mp3`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    // The callback form also works in older Safari.
    return await new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));
  } catch (err) {
    console.warn(`Could not load voice clip ${id}`, err);
    return null;
  }
}

function clip(id) {
  if (!clips.has(id)) clips.set(id, loadClip(id));
  return clips.get(id);
}

// Loads a workout's clips up front so they play on time, and lets go of the rest.
export function preloadLines(ids) {
  if (!ctx) return;
  clips = new Map(ids.map((id) => [id, clips.get(id) ?? loadClip(id)]));
}

// Says one or more lines one after the other, after any beep that is playing.
// A new line cuts off the one before.
export async function sayLines(ids) {
  stopSpeaking();
  if (!ctx) return say(ids.map((id) => LINES[id]).join(" "));
  const mine = token;
  const buffers = await Promise.all(ids.map(clip));
  if (mine !== token) return;
  if (buffers.includes(null)) {
    ids.forEach((id, i) => buffers[i] || clips.delete(id)); // try again next time
    say(ids.map((id) => LINES[id]).join(" "));
    return;
  }
  let at = Math.max(ctx.currentTime + 0.02, beepsEnd + 0.05);
  playing = buffers.map((buffer) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(at);
    at += buffer.duration + 0.3;
    return source;
  });
}

// iOS and macOS also list novelty and old robot voices as English.
const ODD_VOICES =
  /^(albert|bad news|bahh|bells|boing|bubbles|cellos|eddy|flo|fred|good news|grandma|grandpa|jester|junior|kathy|organ|ralph|reed|rocko|sandy|shelley|superstar|trinoids|whisper|wobble|zarvox)\b/i;

function voiceScore(v) {
  if (!/^en/i.test(v.lang) || ODD_VOICES.test(v.name)) return -1;
  let score = /^en[-_]us/i.test(v.lang) ? 1 : 0;
  if (/premium|enhanced|natural|neural/i.test(v.name)) score += 4;
  if (/samantha|ava|zoe|allison|nathan|evan|daniel|karen|serena|google/i.test(v.name)) score += 2;
  return score;
}

function englishVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => voiceScore(v) >= 0);
  return voices.sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
}

export function say(text) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}/gu, ""));
  utterance.lang = "en-US";
  const match = englishVoice();
  if (match) utterance.voice = match;
  utterance.rate = 1.02;
  synth.speak(utterance);
}

export function stopSpeaking() {
  token++;
  for (const source of playing) {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  }
  playing = [];
  window.speechSynthesis?.cancel();
}
