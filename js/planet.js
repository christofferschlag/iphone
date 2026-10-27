// Planeten: et lille "Den lille prins"-agtigt kloderum, hvor ting står rundt
// om overfladen. Alt tegnes i SVG; koordinaterne er i en 400 x 420 viewBox.
import { alienSVG, palette } from "./alien.js";

const CX = 200;
const CY = 250;
const R = 120;
const ITEM_SCALE = 1.35;
const MIN_GAP = 17; // mindste vinkel mellem to ting
const MAX_SURFACE_ITEMS = 20;

function star(cx, cy, outer, inner, points = 5) {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return d + "Z";
}

// Hver ting tegnes med origo på overfladen og vokser opad (negativ y).
export const ITEMS = [
  {
    id: "blomst", name: "Stjerneblomst", article: "en", cost: 10,
    svg: () => `
      <path d="M0 0 C -2 -8 2 -14 0 -21" stroke="#4fd18b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="4" cy="-9" rx="5" ry="2.4" fill="#4fd18b" transform="rotate(-30 4 -9)"/>
      <path d="${star(0, -27, 8.5, 3.8)}" fill="#ffd65a" stroke="#ffb13d" stroke-width="1"/>
      <circle cx="0" cy="-27" r="2.4" fill="#ff8fb1"/>`,
  },
  {
    id: "svamp", name: "Glimtsvamp", article: "en", cost: 15,
    svg: () => `
      <circle class="glow-pulse" cx="0" cy="-16" r="18" fill="#c58bff" opacity=".2"/>
      <path d="M-4 0 L-3 -12 L3 -12 L4 0 Z" fill="#f3e6d0"/>
      <path d="M-14 -11 Q -14 -27 0 -27 Q 14 -27 14 -11 Z" fill="#b06cff"/>
      <circle cx="-6" cy="-18" r="2.3" fill="#c9fff5"/>
      <circle cx="4" cy="-22" r="1.8" fill="#c9fff5"/>
      <circle cx="8" cy="-14" r="1.6" fill="#c9fff5"/>`,
  },
  {
    id: "busk", name: "Stjernebærbusk", article: "en", cost: 20,
    svg: () => `
      <circle cx="-8" cy="-8" r="9" fill="#2fb57d"/>
      <circle cx="8" cy="-8" r="9" fill="#2fb57d"/>
      <circle cx="0" cy="-15" r="10" fill="#3fcf8f"/>
      <path d="${star(-6, -12, 3.4, 1.5)}" fill="#ffd65a"/>
      <path d="${star(5, -18, 3.4, 1.5)}" fill="#ff7aa8"/>
      <path d="${star(9, -7, 3, 1.3)}" fill="#ffd65a"/>
      <path d="${star(-2, -5, 2.8, 1.2)}" fill="#ff7aa8"/>`,
  },
  {
    id: "sten", name: "Kæledyrssten", article: "en", cost: 20,
    svg: () => `
      <ellipse cx="0" cy="-8" rx="13" ry="9.5" fill="#9aa3b8"/>
      <ellipse cx="-4" cy="-12.5" rx="5" ry="2.4" fill="#c7cede" opacity=".8"/>
      <circle cx="-4" cy="-8" r="1.6" fill="#1d1640"/>
      <circle cx="4" cy="-8" r="1.6" fill="#1d1640"/>
      <path d="M-3 -4.6 Q 0 -2 3 -4.6" stroke="#1d1640" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <ellipse cx="-7.5" cy="-5.5" rx="2" ry="1.2" fill="#ff8fb1" opacity=".6"/>
      <ellipse cx="7.5" cy="-5.5" rx="2" ry="1.2" fill="#ff8fb1" opacity=".6"/>`,
  },
  {
    id: "krystal", name: "Krystal", article: "en", cost: 25,
    svg: () => `
      <path d="M-10 0 L-14 -15 L-8 -24 L-3 -10 Z" fill="#7fe7ff" opacity=".9"/>
      <path d="M-5 0 L-6 -26 L1 -38 L8 -26 L6 0 Z" fill="#a98bff" opacity=".95"/>
      <path d="M5 0 L10 -14 L15 -18 L14 -3 Z" fill="#ff9ed1" opacity=".9"/>
      <path d="M1 -38 L-1 -26 L1 -6" stroke="#fff" stroke-width="1.2" opacity=".6" fill="none"/>`,
  },
  {
    id: "trae", name: "Rumtræ", article: "et", cost: 30,
    svg: () => `
      <path d="M-3 0 L-2 -25 L2 -25 L3 0 Z" fill="#8a5a3c"/>
      <circle cx="-9" cy="-30" r="11" fill="#ff8fc6"/>
      <circle cx="9" cy="-31" r="11" fill="#ff8fc6"/>
      <circle cx="0" cy="-41" r="13" fill="#ffb3dc"/>
      <circle cx="-4" cy="-45" r="3" fill="#fff" opacity=".5"/>`,
  },
  {
    id: "lygte", name: "Lygtepæl", article: "en", cost: 35,
    svg: () => `
      <circle class="glow-pulse" cx="7" cy="-39" r="15" fill="#ffd65a" opacity=".25"/>
      <path d="M0 0 L0 -42" stroke="#3a3366" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 -42 Q 0 -47 7 -47" stroke="#3a3366" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M2.5 -47 L11.5 -47 L9.5 -41 L4.5 -41 Z" fill="#3a3366"/>
      <circle cx="7" cy="-39.5" r="3.4" fill="#fff3b0"/>`,
  },
  {
    id: "dam", name: "Lille dam", article: "en", cost: 40,
    svg: () => `
      <ellipse cx="0" cy="-1.5" rx="22" ry="5.5" fill="#3d8bff"/>
      <ellipse cx="-5" cy="-2.6" rx="10" ry="1.9" fill="#a8d4ff" opacity=".7"/>
      <ellipse cx="10" cy="-2.2" rx="4" ry="1.6" fill="#4fd18b"/>`,
  },
  {
    id: "teleskop", name: "Teleskop", article: "et", cost: 60,
    svg: () => `
      <path d="M0 -15 L-8 0 M0 -15 L8 0 M0 -15 L0 0" stroke="#3a3366" stroke-width="2.2" stroke-linecap="round"/>
      <g transform="rotate(-35 0 -17)">
        <rect x="-7" y="-22" width="25" height="9" rx="3" fill="#e8e4ff"/>
        <rect x="15" y="-23.5" width="6" height="12" rx="2" fill="#a98bff"/>
      </g>`,
  },
  {
    id: "hus", name: "Lille hus", article: "et", cost: 80,
    svg: () => `
      <rect x="-15" y="-18" width="30" height="18" rx="3" fill="#f2efff"/>
      <path d="M-17.5 -17 Q 0 -42 17.5 -17 Z" fill="#ff8f8f"/>
      <rect x="-4" y="-11" width="8" height="11" rx="4" fill="#5b4bb3"/>
      <circle cx="9" cy="-10" r="3.2" fill="#ffd65a"/>
      <circle cx="-9" cy="-10" r="3.2" fill="#ffd65a"/>`,
  },
  {
    id: "fyrtaarn", name: "Fyrtårn", article: "et", cost: 100,
    svg: () => `
      <path class="beam" d="M2 -51 L44 -64 L44 -38 Z" fill="#fff3b0" opacity=".22"/>
      <path d="M-9 0 L-6 -46 L6 -46 L9 0 Z" fill="#f2efff"/>
      <path d="M-8.2 -12 L8.2 -12 L7.6 -22 L-7.6 -22 Z" fill="#ff6b8a"/>
      <path d="M-7 -32 L7 -32 L6.5 -40 L-6.5 -40 Z" fill="#ff6b8a"/>
      <rect x="-7" y="-55" width="14" height="9" rx="2" fill="#3a3366"/>
      <circle cx="0" cy="-50.5" r="3.5" fill="#fff3b0"/>
      <path d="M-8.5 -55 Q 0 -63 8.5 -55 Z" fill="#ff6b8a"/>`,
  },
  {
    id: "raket", name: "Raket", article: "en", cost: 150,
    svg: () => `
      <path d="M-11 0 L-7 -8 L7 -8 L11 0 Z" fill="#3a3366"/>
      <path d="M0 -62 C 9 -52 10 -30 8 -9 L-8 -9 C -10 -30 -9 -52 0 -62 Z" fill="#f2efff"/>
      <path d="M-8 -26 L-15 -9 L-8 -12 Z" fill="#ff6b8a"/>
      <path d="M8 -26 L15 -9 L8 -12 Z" fill="#ff6b8a"/>
      <circle cx="0" cy="-37" r="4.6" fill="#66b9ff" stroke="#3a3366" stroke-width="1.5"/>
      <path d="M0 -62 C 4 -58 6 -54 7 -50 L-7 -50 C -6 -54 -4 -58 0 -62 Z" fill="#ff6b8a"/>`,
  },
  // Særlige ting: findes kun én af hver og står ikke på overfladen.
  {
    id: "maane", name: "Lille måne", article: "en", cost: 200, unique: true,
    svg: () => `
      <circle cx="0" cy="-14" r="13" fill="#e8e4ff"/>
      <circle cx="-4" cy="-18" r="3" fill="#c9c2f0"/>
      <circle cx="5" cy="-10" r="2.2" fill="#c9c2f0"/>`,
  },
  {
    id: "ring", name: "Planetring", article: "en", cost: 250, unique: true,
    svg: () => `
      <ellipse cx="0" cy="-14" rx="22" ry="7" fill="none" stroke="#ffd65a" stroke-width="3.5" transform="rotate(-15 0 -14)"/>
      <circle cx="0" cy="-14" r="10" fill="#8a7bff"/>
      <path d="M-21 -9 Q 0 -1 21 -19" fill="none" stroke="#ffd65a" stroke-width="3.5" transform="rotate(-6 0 -14)"/>`,
  },
];

// "en stjerneblomst", "et rumtræ" osv.
export function itemPhrase(item) {
  return `${item.article} ${item.name.toLowerCase()}`;
}

export function itemById(id) {
  return ITEMS.find((item) => item.id === id);
}

export function itemPreview(item) {
  return `<svg viewBox="-26 -68 52 72" aria-hidden="true">${item.svg()}</svg>`;
}

function normalize(angle) {
  return ((angle % 360) + 540) % 360 - 180;
}

// Finder en ledig plads tæt på det sted, der lige nu vender op mod skærmens
// højre side af rumvæsenet. Returnerer null, hvis planeten er fuld.
export function findFreeAngle(planet) {
  const surface = planet.items.filter((it) => !itemById(it.type)?.unique);
  if (surface.length >= MAX_SURFACE_ITEMS) return null;
  const target = normalize(28 - planet.rotation);
  for (let step = 0; step <= 180; step += 3) {
    for (const candidate of [target + step, target - step]) {
      const angle = normalize(candidate);
      const screen = normalize(angle + planet.rotation);
      if (Math.abs(screen) < 17) continue; // pladsen under rumvæsenet
      if (surface.every((it) => Math.abs(normalize(it.angle - angle)) >= MIN_GAP)) return angle;
    }
  }
  return null;
}

export function planetSVG({ planet, color, friendName }) {
  const p = palette(color);
  const [light, mid, dark] = p.planet;
  const owns = (id) => planet.items.some((it) => it.type === id);
  const surface = planet.items
    .filter((it) => !itemById(it.type)?.unique)
    .map((it) => {
      const item = itemById(it.type);
      if (!item) return "";
      return `<g class="planet-item" data-item="${it.id}" transform="rotate(${it.angle.toFixed(1)} ${CX} ${CY}) translate(${CX} ${CY - R + 1}) scale(${ITEM_SCALE})">
        <rect x="-18" y="-66" width="36" height="68" fill="transparent"/>${item.svg()}</g>`;
    })
    .join("");

  const ringBack = owns("ring")
    ? `<ellipse cx="${CX}" cy="${CY}" rx="178" ry="36" transform="rotate(-16 ${CX} ${CY})" fill="none" stroke="#ffd65a" stroke-width="9" opacity=".55"/>`
    : "";
  const ringFront = owns("ring")
    ? `<g clip-path="url(#ring-front)"><ellipse cx="${CX}" cy="${CY}" rx="178" ry="36" transform="rotate(-16 ${CX} ${CY})" fill="none" stroke="#ffe48a" stroke-width="9" opacity=".9"/></g>`
    : "";
  const moon = owns("maane")
    ? `<g class="moon" data-item="${planet.items.find((it) => it.type === "maane").id}">
        <circle cx="${CX + 172}" cy="${CY}" r="13" fill="#e8e4ff"/>
        <circle cx="${CX + 168}" cy="${CY - 4}" r="3" fill="#c9c2f0"/>
        <circle cx="${CX + 177}" cy="${CY + 4}" r="2.2" fill="#c9c2f0"/>
        <animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="48s" repeatCount="indefinite"/>
      </g>`
    : "";

  return `
<svg class="planet-svg" viewBox="0 0 400 420" role="img" aria-label="Planeten med ${planet.items.length} ting">
  <defs>
    <radialGradient id="pl-body" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="${dark}"/>
    </radialGradient>
    <radialGradient id="pl-atmo">
      <stop offset="0.72" stop-color="${light}" stop-opacity=".35"/>
      <stop offset="1" stop-color="${light}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="ring-front"><rect x="0" y="0" width="400" height="420" transform="rotate(-16 ${CX} ${CY}) translate(0 ${CY})"/></clipPath>
  </defs>
  <circle cx="${CX}" cy="${CY}" r="${R + 46}" fill="url(#pl-atmo)"/>
  ${ringBack}
  <g id="planet-rot" transform="rotate(${planet.rotation.toFixed(1)} ${CX} ${CY})">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#pl-body)"/>
    <g fill="${dark}" opacity=".35">
      <circle cx="160" cy="205" r="14"/><circle cx="244" cy="292" r="20"/>
      <circle cx="218" cy="196" r="8"/><circle cx="148" cy="302" r="10"/>
      <circle cx="262" cy="224" r="6"/><circle cx="196" cy="338" r="7"/>
    </g>
    ${surface}
  </g>
  ${ringFront}
  ${moon}
  ${alienSVG({ color, label: friendName, attrs: `x="160" y="52" width="80" height="84"` })}
</svg>`;
}
