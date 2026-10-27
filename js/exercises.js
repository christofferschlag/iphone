// Exercises and workouts. anim names match the keyframes in css/figures.css;
// cycle is the length of one rep in seconds; peak is the most telling
// moment of the move (0-1), used for still thumbnails.

export const EXERCISES = {
  "jumping-jacks": {
    name: "Jumping Jacks", cycle: 0.9, peak: 0.5,
    tip: "Jump your feet wide while swinging your arms overhead, then back together.",
  },
  squats: {
    name: "Squats", cycle: 2.2, peak: 0.5,
    tip: "Feet shoulder-width apart. Sit back like into a chair, chest up, knees over toes.",
  },
  "high-knees": {
    name: "High Knees", cycle: 0.7, peak: 0.25,
    tip: "Run on the spot and drive your knees up to hip height. Stay light on your feet.",
  },
  "arm-circles": {
    name: "Arm Circles", cycle: 1.4, peak: 0.3,
    tip: "Arms out wide, make big circles. Switch direction halfway.",
  },
  "side-lunges": {
    name: "Side Lunges", cycle: 3, peak: 0.25,
    tip: "Step wide to one side and bend that knee, keep the other leg straight. Alternate sides.",
  },
  "torso-twists": {
    name: "Torso Twists", cycle: 2, peak: 0.25,
    tip: "Feet planted, rotate your upper body from side to side and let your arms swing.",
  },
  boxing: {
    name: "Shadow Boxing", cycle: 0.9, peak: 0.25,
    tip: "Stay light on your feet and throw quick punches straight ahead. Keep your guard up.",
  },
  jog: {
    name: "Jog in Place", cycle: 0.6, peak: 0.25,
    tip: "Easy jog on the spot. Relax your shoulders and breathe.",
  },
  "calf-raises": {
    name: "Calf Raises", cycle: 2, peak: 0.5,
    tip: "Rise up onto your toes, pause at the top, then lower slowly.",
  },
  "side-bends": {
    name: "Side Bends", cycle: 3, peak: 0.25,
    tip: "Reach one arm overhead and lean to the opposite side. Alternate sides.",
  },
  "wall-sit": {
    name: "Wall Sit", cycle: 0.2, peak: 0, hold: true,
    tip: "Back flat against a wall, knees at 90 degrees. Hold it!",
  },
  plank: {
    name: "Plank", cycle: 0.25, peak: 0, hold: true,
    tip: "Forearms on the floor, body in one straight line. Squeeze your belly and glutes.",
  },
  "push-ups": {
    name: "Push-ups", cycle: 2, peak: 0.5,
    tip: "Hands under your shoulders, lower your chest towards the floor. Knees down is fine!",
  },
  "mountain-climbers": {
    name: "Mountain Climbers", cycle: 0.7, peak: 0.25,
    tip: "From a high plank, drive your knees towards your chest, one at a time.",
  },
  burpees: {
    name: "Burpees", cycle: 3.2, peak: 0.35,
    tip: "Squat down, jump your feet back to a plank, jump them in again and jump up.",
  },
};

export const DIFFICULTIES = {
  easy: { label: "Easy", work: 20, rest: 20 },
  normal: { label: "Normal", work: 30, rest: 15 },
  hard: { label: "Hard", work: 45, rest: 15 },
};

const ROUND_REST = 40;

export const WORKOUTS = [
  {
    id: "wake-up", emoji: "☀️", name: "Wake-Up Boost", rounds: 1,
    blurb: "A gentle start that gets the blood flowing.",
    moves: ["jumping-jacks", "arm-circles", "squats", "torso-twists", "jog", "side-bends"],
  },
  {
    id: "full-body", emoji: "💪", name: "Full Body Basics", rounds: 2,
    blurb: "A bit of everything: legs, arms, core and cardio.",
    moves: ["jumping-jacks", "squats", "push-ups", "high-knees", "side-lunges", "plank", "boxing", "calf-raises"],
  },
  {
    id: "cardio", emoji: "🔥", name: "Cardio Blast", rounds: 2,
    blurb: "Get your heart pumping and break a sweat.",
    moves: ["high-knees", "jumping-jacks", "burpees", "boxing", "mountain-climbers", "jog"],
  },
  {
    id: "legs", emoji: "🦵", name: "Strong Legs", rounds: 2,
    blurb: "Squats, lunges and a wall sit for strong legs.",
    moves: ["squats", "side-lunges", "calf-raises", "wall-sit", "jumping-jacks", "squats"],
  },
  {
    id: "core", emoji: "🧱", name: "Core Power", rounds: 2,
    blurb: "A stronger middle for better posture.",
    moves: ["plank", "mountain-climbers", "torso-twists", "side-bends", "plank"],
  },
  {
    id: "upper", emoji: "🥊", name: "Upper Body", rounds: 2,
    blurb: "Arms, shoulders and chest without any equipment.",
    moves: ["push-ups", "arm-circles", "boxing", "plank", "push-ups", "arm-circles"],
  },
  {
    id: "seven", emoji: "⏱️", name: "7-Minute Mix", rounds: 1, rest: 10,
    blurb: "Twelve quick moves with short breaks. Short and intense.",
    moves: [
      "jumping-jacks", "wall-sit", "push-ups", "torso-twists", "squats", "boxing",
      "plank", "high-knees", "side-lunges", "mountain-climbers", "side-bends", "burpees",
    ],
  },
  {
    id: "desk", emoji: "🪑", name: "Desk Break", rounds: 1,
    blurb: "Loosen up after sitting still for too long.",
    moves: ["arm-circles", "side-bends", "torso-twists", "calf-raises", "squats"],
  },
];

export function workoutById(id) {
  return WORKOUTS.find((w) => w.id === id);
}

// Turns a workout into the timed segments the player runs through.
export function buildSegments(workout, { difficulty = "normal", rounds = workout.rounds, readySeconds = 10 } = {}) {
  const { work, rest: baseRest } = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const rest = workout.rest ?? baseRest;
  const segments = [{ type: "ready", dur: readySeconds, ex: workout.moves[0] }];
  for (let round = 0; round < rounds; round++) {
    workout.moves.forEach((ex, i) => {
      segments.push({ type: "work", dur: work, ex, round });
      const lastInRound = i === workout.moves.length - 1;
      if (lastInRound && round === rounds - 1) return;
      const next = lastInRound ? workout.moves[0] : workout.moves[i + 1];
      segments.push({ type: "rest", dur: lastInRound ? ROUND_REST : rest, ex: next, round, roundBreak: lastInRound });
    });
  }
  return segments;
}

export function totalSeconds(segments) {
  return segments.reduce((sum, s) => sum + s.dur, 0);
}

export function formatDuration(seconds) {
  const m = Math.round(seconds / 60);
  return m < 1 ? `${seconds} sec` : `${m} min`;
}
