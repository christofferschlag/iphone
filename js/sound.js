// Beeps made with Web Audio (no sound files) and a spoken coach.

let ctx = null;
let speechReady = false;

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
  if (ctx?.state === "suspended") ctx.resume();
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

function englishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "en-US" && v.localService) ||
    voices.find((v) => v.lang?.startsWith("en")) ||
    null
  );
}

export function say(text) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}/gu, ""));
  utterance.lang = "en-US";
  const voice = englishVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1.02;
  synth.speak(utterance);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
