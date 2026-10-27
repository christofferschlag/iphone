// Everything the voice coach says. Each line is a recorded clip, audio/<id>.mp3,
// made from this file by tools/make-voice.py. Rerun it after changing a line.
import { EXERCISES } from "./exercises.js";

const PER_MOVE = {
  ready: "Get ready! First up: {name}.",
  go: "{name}. Go!",
  last: "Last one! {name}. Give it everything!",
  next: "Rest. Next up: {name}.",
};

export const LINES = {
  "round-done": "Round done! Take a sip of water.",
  "half-1": "Halfway there!",
  "half-2": "You're doing great. Keep it up!",
  "half-3": "Nice. Keep breathing.",
  "push-1": "Five more seconds!",
  "push-2": "Almost there. Push!",
  "push-3": "Finish strong!",
  "done-1": "Workout complete. Amazing job!",
  "done-2": "You did it! I'm so proud of you.",
  ended: "Nice effort. See you next time!",
  test: "Hi! I'm your coach. Ready when you are.",
};

for (const [id, ex] of Object.entries(EXERCISES)) {
  for (const [kind, text] of Object.entries(PER_MOVE)) LINES[`${kind}-${id}`] = text.replace("{name}", ex.name);
}
