// Workout buddies, drawn as inline SVG on one shared rig so that every
// exercise animation in css/figures.css works for every figure.
//
// Rig (viewBox 0 0 200 240, ground at y = 222):
//   shoulders (65,118) and (135,118), hips (86,168) and (114,168),
//   neck (100,116), feet centre (100,222).
// Moods (data-mood): idle, happy, work, strain, rest, sleepy.

const INK = "#2a1d33";

let counter = 0;

function eyes({ y, lx = 84, rx = 116, open, stroke = INK, size = 8 }) {
  const up = (x) => `M${x - size} ${y + 3} Q ${x} ${y - size} ${x + size} ${y + 3}`;
  const down = (x) => `M${x - size} ${y - 2} Q ${x} ${y + size * 0.8} ${x + size} ${y - 2}`;
  const chevron = (x, dir) =>
    `M${x - 6 * dir} ${y - 6} L ${x + 5 * dir} ${y} L ${x - 6 * dir} ${y + 6}`;
  const line = `stroke="${stroke}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  return `
    <g class="eyes eyes-open">${open}</g>
    <g class="eyes eyes-happy" ${line}><path d="${up(lx)}"/><path d="${up(rx)}"/></g>
    <g class="eyes eyes-closed" ${line}><path d="${down(lx)}"/><path d="${down(rx)}"/></g>
    <g class="eyes eyes-strain" ${line}><path d="${chevron(lx, 1)}"/><path d="${chevron(rx, -1)}"/></g>`;
}

function mouth({ y, x = 100, w = 8, stroke = INK, fill = "#6b2440" }) {
  return `
    <path class="mouth mouth-smile" d="M${x - w} ${y} Q ${x} ${y + w} ${x + w} ${y}" stroke="${stroke}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path class="mouth mouth-grin" d="M${x - w - 2} ${y - 1} Q ${x} ${y + w + 9} ${x + w + 2} ${y - 1} Z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse class="mouth mouth-open" cx="${x}" cy="${y + 3}" rx="${(w * 0.6).toFixed(1)}" ry="${(w * 0.75).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
    <path class="mouth mouth-flat" d="M${x - w + 2} ${y + 3} L ${x + w - 2} ${y + 3}" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/>`;
}

// A furry outline: a circle with small bumps.
function fuzzy(cx, cy, r, bumps = 18, depth = 4) {
  let d = "";
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const x = (cx + r * Math.cos(a)).toFixed(1);
    const y = (cy + r * Math.sin(a)).toFixed(1);
    if (i === 0) {
      d = `M${x} ${y}`;
      continue;
    }
    const m = ((i - 0.5) / bumps) * Math.PI * 2;
    d += ` Q ${(cx + (r + depth) * Math.cos(m)).toFixed(1)} ${(cy + (r + depth) * Math.sin(m)).toFixed(1)} ${x} ${y}`;
  }
  return `${d} Z`;
}

function star(cx, cy, outer, inner) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    d += `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return `${d}Z`;
}

const BODY = "M100 100 C 128 100 138 120 138 146 C 138 170 122 184 100 184 C 78 184 62 170 62 146 C 62 120 72 100 100 100 Z";

function limbs({ arm, hand, leg, foot }) {
  return {
    legL: `<rect x="77" y="160" width="18" height="52" rx="9" fill="${leg}"/><ellipse cx="83" cy="214" rx="13" ry="8" fill="${foot}"/>`,
    legR: `<rect x="105" y="160" width="18" height="52" rx="9" fill="${leg}"/><ellipse cx="117" cy="214" rx="13" ry="8" fill="${foot}"/>`,
    armL: `<rect x="57" y="110" width="16" height="48" rx="8" fill="${arm}"/><circle cx="65" cy="158" r="9" fill="${hand}"/>`,
    armR: `<rect x="127" y="110" width="16" height="48" rx="8" fill="${arm}"/><circle cx="135" cy="158" r="9" fill="${hand}"/>`,
  };
}

function radial(id, [light, mid, dark]) {
  return `<radialGradient id="${id}" cx="38%" cy="30%" r="80%">
    <stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/>
  </radialGradient>`;
}

export const FIGURES = [
  {
    id: "kit",
    name: "Kit",
    species: "Fox",
    color: "#ff8a3d",
    blurb: "Quick, cheeky and always up for a sprint.",
    cheers: ["Fox-tastic!", "Quick like a fox!", "Tail up, keep going!"],
    fit: { band: [58, 37], eyes: { y: 80, lx: 82, rx: 118 }, crown: 42 },
    parts(g) {
      const fur = `url(#${g})`;
      return {
        defs: radial(g, ["#ffb27a", "#ff8a3d", "#e0662a"]),
        back: `
          <path d="M116 172 C 154 180 178 152 171 116 C 168 100 153 93 146 105 C 158 128 146 156 114 160 Z" fill="${fur}"/>
          <path d="M171 116 C 168 100 153 93 146 105 C 150 110 153 116 155 123 C 160 118 165 116 171 116 Z" fill="#fff3e6"/>`,
        ...limbs({ arm: "#ff8a3d", hand: "#5a2d1a", leg: "#f47d33", foot: "#5a2d1a" }),
        torso: `<path d="${BODY}" fill="${fur}"/><ellipse cx="100" cy="152" rx="22" ry="22" fill="#fff3e6"/>`,
        head: `
          <path d="M66 62 L 54 16 L 94 44 Z" fill="#ff8a3d" stroke="#e0662a" stroke-width="3" stroke-linejoin="round"/>
          <path d="M68 52 L 61 27 L 84 44 Z" fill="#5a2d1a"/>
          <path d="M134 62 L 146 16 L 106 44 Z" fill="#ff8a3d" stroke="#e0662a" stroke-width="3" stroke-linejoin="round"/>
          <path d="M132 52 L 139 27 L 116 44 Z" fill="#5a2d1a"/>
          <path d="M100 40 C 134 40 148 62 148 84 C 148 106 128 122 100 122 C 72 122 52 106 52 84 C 52 62 66 40 100 40 Z" fill="${fur}"/>
          <path d="M58 90 C 72 88 88 96 100 106 C 112 96 128 88 142 90 C 138 110 120 122 100 122 C 80 122 62 110 58 90 Z" fill="#fff3e6"/>
          <ellipse cx="70" cy="100" rx="7" ry="4" fill="#ff7a8a" opacity=".55"/>
          <ellipse cx="130" cy="100" rx="7" ry="4" fill="#ff7a8a" opacity=".55"/>
          ${eyes({
            y: 80,
            lx: 82,
            rx: 118,
            open: `<ellipse cx="82" cy="80" rx="6.5" ry="8.5" fill="${INK}"/><circle cx="84.5" cy="76.5" r="2.6" fill="#fff"/>
                   <ellipse cx="118" cy="80" rx="6.5" ry="8.5" fill="${INK}"/><circle cx="120.5" cy="76.5" r="2.6" fill="#fff"/>`,
          })}
          <path d="M93 96 Q 100 91 107 96 Q 105 102 100 103 Q 95 102 93 96 Z" fill="${INK}"/>
          ${mouth({ y: 107, w: 7 })}`,
      };
    },
  },
  {
    id: "bao",
    name: "Bao",
    species: "Panda",
    color: "#3a3a46",
    blurb: "Calm, strong and secretly very bouncy.",
    cheers: ["Bam-boo-yah!", "Panda power!", "Strong like bamboo!"],
    fit: { band: [52, 36], eyes: { y: 84, lx: 83, rx: 117 }, crown: 40 },
    parts(g) {
      return {
        defs: radial(g, ["#ffffff", "#ffffff", "#e3e6ee"]),
        back: "",
        ...limbs({ arm: "#2b2b35", hand: "#3a3a46", leg: "#2b2b35", foot: "#3a3a46" }),
        torso: `<path d="${BODY}" fill="url(#${g})"/>
          <path d="M62 134 C 62 112 76 101 100 101 C 124 101 138 112 138 134 C 124 125 112 122 100 122 C 88 122 76 125 62 134 Z" fill="#2b2b35"/>
          <ellipse cx="100" cy="156" rx="22" ry="19" fill="#eef0f5"/>`,
        head: `
          <circle cx="62" cy="48" r="16" fill="#2b2b35"/><circle cx="138" cy="48" r="16" fill="#2b2b35"/>
          <ellipse cx="100" cy="82" rx="46" ry="42" fill="url(#${g})"/>
          <ellipse cx="81" cy="84" rx="12" ry="16" transform="rotate(-25 81 84)" fill="#2b2b35"/>
          <ellipse cx="119" cy="84" rx="12" ry="16" transform="rotate(25 119 84)" fill="#2b2b35"/>
          <ellipse cx="66" cy="104" rx="7" ry="4" fill="#ffb3c1" opacity=".8"/>
          <ellipse cx="134" cy="104" rx="7" ry="4" fill="#ffb3c1" opacity=".8"/>
          ${eyes({
            y: 84,
            lx: 83,
            rx: 117,
            stroke: "#ffffff",
            size: 6.5,
            open: `<circle cx="83" cy="84" r="6" fill="#fff"/><circle cx="84" cy="85" r="3.6" fill="#2b2b35"/><circle cx="85.4" cy="83.2" r="1.3" fill="#fff"/>
                   <circle cx="117" cy="84" r="6" fill="#fff"/><circle cx="116" cy="85" r="3.6" fill="#2b2b35"/><circle cx="117.4" cy="83.2" r="1.3" fill="#fff"/>`,
          })}
          <ellipse cx="100" cy="100" rx="7" ry="4.5" fill="#2b2b35"/>
          ${mouth({ y: 108, w: 6 })}`,
      };
    },
  },
  {
    id: "bolt",
    name: "Bolt",
    species: "Robot",
    color: "#62769a",
    blurb: "Runs on high fives and fully charged batteries.",
    cheers: ["Power level rising!", "Beep boop, you rock!", "System status: awesome!"],
    fit: { band: [47, 44], eyes: { y: 76, lx: 83.5, rx: 116.5 }, crown: 40 },
    parts(g) {
      const steel = `url(#${g})`;
      return {
        defs: `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d5e0f0"/><stop offset=".5" stop-color="#9db0cc"/><stop offset="1" stop-color="#7488aa"/>
        </linearGradient>`,
        back: "",
        legL: `<rect x="77" y="160" width="18" height="50" rx="8" fill="#9db0cc"/><circle cx="86" cy="186" r="5" fill="#62769a"/><rect x="70" y="206" width="27" height="16" rx="7" fill="#62769a"/>`,
        legR: `<rect x="105" y="160" width="18" height="50" rx="8" fill="#9db0cc"/><circle cx="114" cy="186" r="5" fill="#62769a"/><rect x="103" y="206" width="27" height="16" rx="7" fill="#62769a"/>`,
        armL: `<rect x="57" y="110" width="16" height="48" rx="8" fill="#9db0cc"/><circle cx="65" cy="134" r="4.5" fill="#62769a"/><circle cx="65" cy="158" r="9" fill="#62769a"/>`,
        armR: `<rect x="127" y="110" width="16" height="48" rx="8" fill="#9db0cc"/><circle cx="135" cy="134" r="4.5" fill="#62769a"/><circle cx="135" cy="158" r="9" fill="#62769a"/>`,
        torso: `<rect x="63" y="102" width="74" height="80" rx="20" fill="${steel}"/>
          <rect x="80" y="122" width="40" height="28" rx="8" fill="#18202f"/>
          <rect class="battery" x="86" y="129" width="8" height="14" rx="2" fill="#5ef2ff"/>
          <rect class="battery" x="96" y="129" width="8" height="14" rx="2" fill="#5ef2ff"/>
          <rect class="battery" x="106" y="129" width="8" height="14" rx="2" fill="#5ef2ff"/>`,
        head: `
          <line x1="100" y1="42" x2="100" y2="22" stroke="#62769a" stroke-width="4" stroke-linecap="round"/>
          <circle class="bulb" cx="100" cy="18" r="7" fill="#ffcf3f"/>
          <rect x="49" y="68" width="12" height="24" rx="5" fill="#62769a"/>
          <rect x="139" y="68" width="12" height="24" rx="5" fill="#62769a"/>
          <rect x="56" y="40" width="88" height="78" rx="24" fill="${steel}"/>
          <rect x="66" y="54" width="68" height="50" rx="15" fill="#18202f"/>
          <circle cx="74" cy="94" r="3.5" fill="#ff7aa8" opacity=".85"/>
          <circle cx="126" cy="94" r="3.5" fill="#ff7aa8" opacity=".85"/>
          ${eyes({
            y: 76,
            lx: 83.5,
            rx: 116.5,
            stroke: "#5ef2ff",
            size: 7,
            open: `<rect x="77" y="68" width="13" height="16" rx="5" fill="#5ef2ff"/><rect x="110" y="68" width="13" height="16" rx="5" fill="#5ef2ff"/>`,
          })}
          ${mouth({ y: 91, w: 7, stroke: "#5ef2ff", fill: "#24405a" })}`,
      };
    },
  },
  {
    id: "mo",
    name: "Mo",
    species: "Monster",
    color: "#8f6bff",
    blurb: "Fluffy, loud and very proud of every rep.",
    cheers: ["RAWR-some!", "Monster mode on!", "Fluffy but mighty!"],
    fit: { band: [52, 34], eyes: { y: 76, single: true }, crown: 38 },
    parts(g) {
      const fur = `url(#${g})`;
      const line = `stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
      return {
        defs: radial(g, ["#c4b2ff", "#8f6bff", "#6446d8"]),
        back: "",
        ...limbs({ arm: "#8f6bff", hand: "#b49dff", leg: "#8462f5", foot: "#b49dff" }),
        torso: `<path d="${fuzzy(100, 146, 39, 18, 4)}" fill="${fur}"/>
          <circle cx="92" cy="150" r="7" fill="#c9b8ff" opacity=".7"/><circle cx="110" cy="160" r="5" fill="#c9b8ff" opacity=".7"/>
          <circle cx="106" cy="138" r="3.5" fill="#c9b8ff" opacity=".7"/>`,
        head: `
          <path d="M70 52 Q 58 34 66 16 Q 78 32 86 46 Z" fill="#ffd970"/>
          <path d="M130 52 Q 142 34 134 16 Q 122 32 114 46 Z" fill="#ffd970"/>
          <path d="${fuzzy(100, 80, 42, 20, 4)}" fill="${fur}"/>
          <ellipse cx="70" cy="96" rx="7" ry="4" fill="#ff8fc0" opacity=".7"/>
          <ellipse cx="130" cy="96" rx="7" ry="4" fill="#ff8fc0" opacity=".7"/>
          <g class="eyes eyes-open"><circle cx="100" cy="76" r="18" fill="#fff"/><circle cx="101" cy="78" r="9.5" fill="${INK}"/><circle cx="104.5" cy="73.5" r="3.4" fill="#fff"/></g>
          <g class="eyes eyes-happy" ${line}><path d="M86 80 Q 100 62 114 80"/></g>
          <g class="eyes eyes-closed" ${line}><path d="M86 75 Q 100 88 114 75"/></g>
          <g class="eyes eyes-strain" ${line}><path d="M86 77 L 93 72 L 100 78 L 107 72 L 114 77"/></g>
          <g class="mouth mouth-smile"><path d="M86 100 Q 100 112 114 100" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
            <path d="M91 103 l 3 6 l 3 -5 Z" fill="#fff"/><path d="M103 104 l 3 5 l 3 -6 Z" fill="#fff"/></g>
          <g class="mouth mouth-grin"><path d="M84 99 Q 100 122 116 99 Z" fill="#3b1d5e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M90 100 l 3 6 l 3 -6 Z" fill="#fff"/><path d="M104 100 l 3 6 l 3 -6 Z" fill="#fff"/></g>
          <ellipse class="mouth mouth-open" cx="100" cy="104" rx="8" ry="9" fill="#3b1d5e" stroke="${INK}" stroke-width="3"/>
          <path class="mouth mouth-flat" d="M88 104 Q 94 100 100 104 Q 106 108 112 104" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      };
    },
  },
  {
    id: "pip",
    name: "Pip",
    species: "Alien",
    color: "#2fbf8f",
    blurb: "A tiny alien who thinks squats are a fun Earth dance.",
    cheers: ["Out of this world!", "Cosmic effort!", "Earthlings are so strong!"],
    fit: { band: [58, 38], eyes: { y: 86, lx: 83, rx: 117 }, crown: 44 },
    parts(g) {
      const skin = `url(#${g})`;
      const glow = `${g}-glow`;
      return {
        defs: `${radial(g, ["#c8f8e7", "#5fe0b5", "#259173"])}
          <radialGradient id="${glow}"><stop offset="0" stop-color="#fff27a"/><stop offset="1" stop-color="#fff27a" stop-opacity="0"/></radialGradient>`,
        back: "",
        ...limbs({ arm: "#5fe0b5", hand: "#8ef0cc", leg: "#4fd3a6", foot: "#259173" }),
        torso: `<path d="${BODY}" fill="${skin}"/><ellipse cx="100" cy="152" rx="22" ry="20" fill="#fff" opacity=".25"/>`,
        head: `
          <path d="M84 50 Q 74 32 68 18" stroke="#259173" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <path d="M116 50 Q 126 32 132 18" stroke="#259173" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <circle class="bulb" cx="67" cy="16" r="12" fill="url(#${glow})"/><circle cx="67" cy="16" r="6" fill="#fff27a"/>
          <circle class="bulb" cx="133" cy="16" r="12" fill="url(#${glow})"/><circle cx="133" cy="16" r="6" fill="#fff27a"/>
          <ellipse cx="100" cy="84" rx="46" ry="40" fill="${skin}"/>
          <circle cx="124" cy="62" r="4.5" fill="#fff" opacity=".3"/><circle cx="134" cy="74" r="2.8" fill="#fff" opacity=".3"/>
          <ellipse cx="65" cy="104" rx="8" ry="4.5" fill="#ff6f9f" opacity=".6"/>
          <ellipse cx="135" cy="104" rx="8" ry="4.5" fill="#ff6f9f" opacity=".6"/>
          ${eyes({
            y: 86,
            lx: 83,
            rx: 117,
            size: 9,
            open: `<ellipse cx="83" cy="86" rx="12" ry="14" fill="#fff"/><circle cx="85" cy="88" r="7" fill="#1d1640"/><circle cx="88" cy="84" r="2.6" fill="#fff"/>
                   <ellipse cx="117" cy="86" rx="12" ry="14" fill="#fff"/><circle cx="119" cy="88" r="7" fill="#1d1640"/><circle cx="122" cy="84" r="2.6" fill="#fff"/>`,
          })}
          ${mouth({ y: 108, w: 7 })}`,
      };
    },
  },
];

export function figureById(id) {
  return FIGURES.find((f) => f.id === id) || FIGURES[0];
}

// Unlocked with levels; drawn on whichever buddy you pick.
export const ACCESSORIES = [
  { id: "headband", name: "Sweatband", level: 2 },
  { id: "wristbands", name: "Wristbands", level: 3 },
  { id: "sneakers", name: "Sneakers", level: 4 },
  { id: "medal", name: "Gold medal", level: 5 },
  { id: "shades", name: "Sunglasses", level: 6 },
  { id: "cape", name: "Hero cape", level: 8 },
  { id: "crown", name: "Crown", level: 10 },
];

function sneaker() {
  return `<path d="M69 216 C 69 206 76 203 84 203 C 92 203 98 208 98 214 L 98 218 Q 98 222 94 222 L 73 222 Q 69 222 69 218 Z" fill="#3ec7ff"/>
    <path d="M69 217 L 98 217 L 98 219 Q 98 222 94 222 L 73 222 Q 69 222 69 219 Z" fill="#fff"/>
    <circle cx="81" cy="209" r="1.6" fill="#fff"/><circle cx="87" cy="208" r="1.6" fill="#fff"/>`;
}

function accessory(id, fit) {
  const [by, hw] = fit.band;
  const e = fit.eyes;
  switch (id) {
    case "headband":
      return `<rect x="${100 - hw}" y="${by - 5}" width="${hw * 2}" height="10" rx="5" fill="#ff4d6d"/>
        <rect x="${100 - hw + 2}" y="${by - 1.5}" width="${hw * 2 - 4}" height="3" rx="1.5" fill="#fff" opacity=".6"/>
        <path d="M${100 + hw - 3} ${by} q 11 3 15 12 q -9 0 -15 -7 Z" fill="#ff4d6d"/>
        <path d="M${100 + hw - 3} ${by} q 13 -3 19 5 q -10 3 -19 -1 Z" fill="#e63958"/>`;
    case "shades":
      return e.single
        ? `<rect x="78" y="${e.y - 11}" width="44" height="21" rx="10" fill="#1d1d2b"/><path d="M84 ${e.y - 5} l 9 0" stroke="#fff" stroke-width="2.5" opacity=".5" stroke-linecap="round"/>`
        : `<rect x="${e.lx - 13}" y="${e.y - 9}" width="26" height="18" rx="7" fill="#1d1d2b"/>
           <rect x="${e.rx - 13}" y="${e.y - 9}" width="26" height="18" rx="7" fill="#1d1d2b"/>
           <path d="M${e.lx + 13} ${e.y - 3} L ${e.rx - 13} ${e.y - 3}" stroke="#1d1d2b" stroke-width="3"/>
           <path d="M${e.lx - 8} ${e.y - 4} l 7 0 M${e.rx - 8} ${e.y - 4} l 7 0" stroke="#fff" stroke-width="2.5" opacity=".5" stroke-linecap="round"/>`;
    case "crown": {
      const y = fit.crown;
      return `<path d="M82 ${y} L 80 ${y - 18} L 90 ${y - 9} L 100 ${y - 22} L 110 ${y - 9} L 120 ${y - 18} L 118 ${y} Z" fill="#ffcf3f" stroke="#e0a800" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="100" cy="${y - 6}" r="3" fill="#ff4d6d"/>`;
    }
    case "medal":
      return `<path d="M88 104 L 100 128 L 112 104" fill="none" stroke="#3e7bff" stroke-width="6" stroke-linejoin="round"/>
        <circle cx="100" cy="134" r="10" fill="#ffcf3f" stroke="#e0a800" stroke-width="2"/>
        <path d="${star(100, 134.5, 5.5, 2.4)}" fill="#fff6c2"/>`;
    default:
      return "";
  }
}

const BANDS = {
  l: `<rect class="acc" x="56" y="142" width="18" height="7" rx="3.5" fill="#19b394"/>`,
  r: `<rect class="acc" x="126" y="142" width="18" height="7" rx="3.5" fill="#19b394"/>`,
};

const CAPE = `<path d="M68 106 Q 100 116 132 106 L 164 198 Q 100 214 36 198 Z" fill="#ff4d6d"/>
  <path d="M80 110 Q 100 118 120 110 L 140 192 Q 100 202 60 192 Z" fill="#e63958" opacity=".45"/>`;

const CAPE_CLASP = `<path d="M70 104 L 100 112 L 86 122 Z" fill="#ff4d6d"/><path d="M130 104 L 100 112 L 114 122 Z" fill="#ff4d6d"/>
  <circle cx="100" cy="112" r="4.5" fill="#ffcf3f"/>`;

const SWEAT = `<path d="M150 56 q 5 8 0 11 q -5 -3 0 -11 Z" fill="#7fd3ff"/><path d="M52 68 q 4 7 0 9 q -4 -2 0 -9 Z" fill="#7fd3ff"/>`;

// Returns the buddy as an SVG string. cycle is the length of one rep in
// seconds; phase (0-1) freezes the pose at that point, for thumbnails.
export function figureSVG(id, { anim = "idle", mood = "idle", wear = [], cycle = 1, phase = null, label = "", attrs = "" } = {}) {
  const fig = figureById(id);
  const g = `fg${++counter}`;
  const p = fig.parts(g);
  const has = (name) => wear.includes(name);
  const style = `--cycle:${cycle}s${phase === null ? "" : `;--phase:${(-phase * cycle).toFixed(2)}s`}`;
  return `<svg class="fig fig-${fig.id}${phase === null ? "" : " frozen"}" viewBox="0 0 200 240" ${attrs}
      data-anim="${anim}" data-mood="${mood}" style="${style}" role="img" aria-label="${label || fig.name}">
    <defs>${p.defs}</defs>
    <ellipse class="fig-shadow" cx="100" cy="224" rx="48" ry="7"/>
    <g class="fig-move">
      <g class="leg leg-l">${p.legL}${has("sneakers") ? sneaker() : ""}</g>
      <g class="leg leg-r">${p.legR}${has("sneakers") ? `<g transform="translate(200 0) scale(-1 1)">${sneaker()}</g>` : ""}</g>
      <g class="upper">
        ${has("cape") ? `<g class="cape">${CAPE}</g>` : ""}
        ${p.back}
        ${p.torso}
        ${has("cape") ? CAPE_CLASP : ""}
        ${has("medal") ? accessory("medal", fig.fit) : ""}
        <g class="arm arm-l">${p.armL}${has("wristbands") ? BANDS.l : ""}</g>
        <g class="arm arm-r">${p.armR}${has("wristbands") ? BANDS.r : ""}</g>
        <g class="head">
          ${p.head}
          ${has("headband") ? accessory("headband", fig.fit) : ""}
          ${has("shades") ? accessory("shades", fig.fit) : ""}
          ${has("crown") ? accessory("crown", fig.fit) : ""}
          <g class="sweat">${SWEAT}</g>
        </g>
      </g>
    </g>
  </svg>`;
}

// Sets animation, cycle and mood on one rendered buddy.
export function pose(svg, { anim, mood, cycle }) {
  if (!svg) return;
  if (cycle) svg.style.setProperty("--cycle", `${cycle}s`);
  if (anim) svg.dataset.anim = anim;
  if (mood) svg.dataset.mood = mood;
}
