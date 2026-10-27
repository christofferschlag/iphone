// Laver PNG-ikoner ud fra icons/icon.svg: node tools/make-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync("icons/icon.svg", "utf8");
const sizes = {
  "icons/apple-touch-icon.png": 180,
  "icons/icon-192.png": 192,
  "icons/icon-512.png": 512,
  // Figuren holder sig inden for den sikre zone, så samme motiv kan beskæres rundt.
  "icons/icon-maskable-512.png": 512,
};

for (const [file, size] of Object.entries(sizes)) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(file, png);
  console.log(`${file} (${size}px)`);
}
