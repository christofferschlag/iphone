// Oplæsning af vennens beskeder med telefonens indbyggede stemmer.

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
let unlocked = false;

export const speechSupported = Boolean(synth);

function danishVoice() {
  const voices = synth.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith("da")) || null;
}

// iOS kræver, at den første oplæsning startes direkte af et tryk.
export function unlockSpeech() {
  if (!synth || unlocked) return;
  unlocked = true;
  const silent = new SpeechSynthesisUtterance(" ");
  silent.volume = 0;
  synth.speak(silent);
}

export function speak(text) {
  if (!synth) return;
  const clean = text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\*+/g, "")
    .trim();
  if (!clean) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "da-DK";
  const voice = danishVoice();
  if (voice) utterance.voice = voice;
  utterance.pitch = 1.35;
  utterance.rate = 1.02;
  synth.speak(utterance);
}

export function stopSpeaking() {
  synth?.cancel();
}
