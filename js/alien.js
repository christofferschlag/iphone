// Rumvæsenet tegnes som inline-SVG. Humøret styres med data-mood på <svg>,
// og selve animationerne ligger i css/app.css.

export const PALETTES = {
  mint:     { label: "Mint",     body: "#5fe0b5", light: "#c8f8e7", dark: "#259173", glow: "#fff27a", ink: "#0b2a20", planet: ["#8a7bff", "#5543c7", "#2b1f73"] },
  lavendel: { label: "Lavendel", body: "#a98bff", light: "#e4dbff", dark: "#6447c9", glow: "#ffd36e", ink: "#1e1147", planet: ["#5fd8d0", "#2a9d9a", "#145a63"] },
  fersken:  { label: "Fersken",  body: "#ffa979", light: "#ffe2d0", dark: "#d0602f", glow: "#fff27a", ink: "#3a1606", planet: ["#7c8cff", "#4251c7", "#222a73"] },
  himmel:   { label: "Himmel",   body: "#66b9ff", light: "#d3eaff", dark: "#2a72c2", glow: "#ffe27a", ink: "#0a2440", planet: ["#d08bff", "#9a4fd6", "#55237d"] },
  citron:   { label: "Citron",   body: "#f2d64b", light: "#fff6c2", dark: "#b8950f", glow: "#ff9ed1", ink: "#332800", planet: ["#7c8cff", "#4251c7", "#222a73"] },
  rosa:     { label: "Rosa",     body: "#ff8fc6", light: "#ffdaee", dark: "#cc4f91", glow: "#fff27a", ink: "#3d0c25", planet: ["#5fd8d0", "#2a9d9a", "#145a63"] },
};

export function palette(id) {
  return PALETTES[id] || PALETTES.mint;
}

let counter = 0;

// attrs bruges, når figuren indlejres i en anden SVG (x, y, width, height).
export function alienSVG({ color = "mint", label = "", mood = "idle", attrs = "" } = {}) {
  const p = palette(color);
  const id = `al${++counter}`;
  const style = `--a-body:${p.body};--a-light:${p.light};--a-dark:${p.dark};--a-glow:${p.glow}`;
  return `
<svg class="alien" viewBox="0 0 200 210" ${attrs} role="img" aria-label="${label}" data-mood="${mood}" style="${style}">
  <defs>
    <radialGradient id="${id}-b" cx="38%" cy="28%" r="78%">
      <stop offset="0" style="stop-color:var(--a-light)"/>
      <stop offset="0.5" style="stop-color:var(--a-body)"/>
      <stop offset="1" style="stop-color:var(--a-dark)"/>
    </radialGradient>
    <radialGradient id="${id}-g">
      <stop offset="0" style="stop-color:var(--a-glow);stop-opacity:1"/>
      <stop offset="1" style="stop-color:var(--a-glow);stop-opacity:0"/>
    </radialGradient>
  </defs>
  <ellipse class="alien-shadow" cx="100" cy="198" rx="44" ry="7"/>
  <g class="alien-bob">
    <g class="alien-wiggle">
      <g class="antenna antenna-l">
        <path d="M82 58 Q 72 38 62 22"/>
        <circle class="antenna-glow" cx="61" cy="20" r="15" fill="url(#${id}-g)"/>
        <circle class="antenna-tip" cx="61" cy="20" r="7"/>
      </g>
      <g class="antenna antenna-r">
        <path d="M118 58 Q 128 38 138 22"/>
        <circle class="antenna-glow" cx="139" cy="20" r="15" fill="url(#${id}-g)"/>
        <circle class="antenna-tip" cx="139" cy="20" r="7"/>
      </g>
      <g class="arm arm-l"><ellipse cx="40" cy="134" rx="10" ry="17" transform="rotate(28 40 134)"/></g>
      <g class="arm arm-r"><ellipse cx="160" cy="134" rx="10" ry="17" transform="rotate(-28 160 134)"/></g>
      <ellipse class="foot" cx="80" cy="186" rx="15" ry="8"/>
      <ellipse class="foot" cx="120" cy="186" rx="15" ry="8"/>
      <path class="alien-body" fill="url(#${id}-b)" d="M100 46 C 146 46 166 86 166 124 C 166 164 138 188 100 188 C 62 188 34 164 34 124 C 34 86 54 46 100 46 Z"/>
      <ellipse class="belly" cx="100" cy="152" rx="36" ry="25"/>
      <circle class="spot" cx="122" cy="66" r="5"/>
      <circle class="spot" cx="135" cy="79" r="3"/>
      <circle class="spot" cx="72" cy="69" r="3.5"/>
      <ellipse class="cheek" cx="62" cy="128" rx="10" ry="6"/>
      <ellipse class="cheek" cx="138" cy="128" rx="10" ry="6"/>
      <g class="eyes eyes-open">
        <g class="eye">
          <ellipse class="eye-white" cx="78" cy="104" rx="17" ry="20"/>
          <g class="pupils">
            <circle class="pupil" cx="80" cy="107" r="10"/>
            <circle class="shine" cx="84" cy="102" r="3.6"/>
            <circle class="shine" cx="77" cy="111" r="1.6"/>
          </g>
        </g>
        <g class="eye">
          <ellipse class="eye-white" cx="122" cy="104" rx="17" ry="20"/>
          <g class="pupils">
            <circle class="pupil" cx="124" cy="107" r="10"/>
            <circle class="shine" cx="128" cy="102" r="3.6"/>
            <circle class="shine" cx="121" cy="111" r="1.6"/>
          </g>
        </g>
      </g>
      <g class="eyes eyes-happy">
        <path d="M64 109 Q 78 92 92 109"/>
        <path d="M108 109 Q 122 92 136 109"/>
      </g>
      <g class="eyes eyes-sleepy">
        <path d="M64 106 Q 78 115 92 106"/>
        <path d="M108 106 Q 122 115 136 106"/>
      </g>
      <path class="mouth mouth-smile" d="M88 134 Q 100 146 112 134"/>
      <ellipse class="mouth mouth-talk" cx="100" cy="139" rx="8" ry="6"/>
      <path class="mouth mouth-flat" d="M92 139 Q 100 136 108 139"/>
      <path class="mouth mouth-grin" d="M84 132 Q 100 156 116 132 Z"/>
    </g>
  </g>
</svg>`;
}

// Sætter humør på alle rumvæsner inde i et element.
export function setMood(root, mood) {
  root?.querySelectorAll("svg.alien").forEach((svg) => {
    svg.dataset.mood = mood;
  });
}

// Kort kærlig reaktion, fx når man prikker til figuren.
export function wiggle(root) {
  root?.querySelectorAll("svg.alien").forEach((svg) => {
    svg.classList.remove("wiggle");
    void svg.getBoundingClientRect();
    svg.classList.add("wiggle");
    setTimeout(() => svg.classList.remove("wiggle"), 600);
  });
}
