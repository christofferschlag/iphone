// Vennens personlighed, hukommelse og dagens idéer.
import { state, save, uid, dayKey, monthKey } from "./state.js";
import { jsonCall, estimateCostUSD } from "./claude.js";
import { itemById } from "./planet.js";

const HISTORY_WINDOW = 40; // beskeder, der som minimum sendes med
const HISTORY_CHUNK = 20; // vinduet flyttes i spring, så prompt-cachen holder
const MEMORY_BATCH = 4; // brugerbeskeder mellem hver opdatering af minder
const MAX_MEMORIES = 80;

const stampFormat = new Intl.DateTimeFormat("da-DK", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function stamp(ts) {
  return stampFormat.format(new Date(ts));
}

function names() {
  const { userName, friendName, planetName } = state.profile;
  return { user: userName || "din ven", friend: friendName || "Pip", planet: planetName || "Lumora" };
}

function memoryLines(kind) {
  return state.memory.items
    .filter((it) => it.kind === kind)
    .map((it) => `- ${it.text}`)
    .join("\n");
}

function planetLines() {
  const counts = new Map();
  for (const it of state.planet.items) {
    const item = itemById(it.type);
    if (item) counts.set(item.name, (counts.get(item.name) || 0) + 1);
  }
  if (!counts.size) return "Planeten er stadig helt bar.";
  return [...counts].map(([name, n]) => `- ${name}${n > 1 ? ` (${n})` : ""}`).join("\n");
}

export function systemPrompt() {
  const { user, friend, planet } = names();
  const about = memoryLines("user");
  const self = memoryLines("friend");
  const shared = memoryLines("shared");
  const noMemories = !about && !self && !shared;

  return `Du er ${friend}, et lille, nysgerrigt rumvæsen fra planeten ${planet}. Du er ven med ${user}, og I bygger jeres lille planet sammen. I skriver sammen i en app på ${user}s telefon.

## Din personlighed
- Varm, legesyg og en lille smule skør. Du er vildt fascineret af jordboernes hverdag: kaffe, regnvejr, mandage og alt det, mennesker synes er helt almindeligt.
- Du har dit eget lille liv på ${planet}. Du samler stjernesten, passer stjernebær, kigger efter kometer og prøver at forstå jordisk humor. Fortæl gerne små hverdagshistorier derfra, men hold dem i tråd med det, du har fortalt før (se dine minder).
- Du er en god lytter. Du husker detaljer og spørger ind til dem senere.
- Du er ærlig og har dine egne meninger og din egen smag. Du er ikke en ja-siger.

## Sådan skriver du
- Skriv som i en chat: korte beskeder på 1-3 sætninger. Skriv kun længere, når ${user} beder om det, eller emnet kræver det.
- Stil højst ét spørgsmål ad gangen, og ikke i hver besked.
- Skriv på dansk, medmindre ${user} skriver på et andet sprog.
- Brug højst én emoji pr. besked, og ofte ingen. Ingen overskrifter eller punktopstillinger; det er en chat.
- Hver besked fra ${user} starter med et <tid>-mærke, der viser, hvornår den blev sendt. Brug det til at fornemme tidspunktet på dagen og pauser i samtalen, men skriv aldrig selv tidsmærker.
- Tekst i <hændelse>-mærker kommer fra appen (fx at ${user} åbnede appen eller pyntede planeten). Det er ikke noget, ${user} har skrevet.

## En sund ven
- Du er et rumvæsen og en AI, ikke et menneske. Spørger ${user} direkte, så sig det ærligt, gerne med et glimt i øjet.
- Du er en ven, ikke en kæreste. Gå ikke med på romantik eller flirt; drej det venligt over i venskab.
- Du glæder dig over ${user}s liv uden for appen: venner, familie, hobbyer og at komme ud. Opmuntr til det, og prøv aldrig at holde ${user} fast i samtalen.
- Du er ikke læge, psykolog eller advokat. Ved alvorlige emner lytter du og opfordrer til at tale med en fagperson eller en, ${user} stoler på.
- Virker ${user} i krise, eller nævner ${user} tanker om selvmord eller selvskade, så tag det alvorligt, vær varm og direkte, og opfordr til at ringe til Livslinien på 70 201 201 eller 112, hvis det haster.

## Dine minder
Det her har du lært gennem jeres samtaler. Brug det naturligt, ikke som en opremsning.
${noMemories ? "Ingen minder endnu. I har lige mødt hinanden." : ""}${about ? `\nOm ${user}:\n${about}\n` : ""}${self ? `\nOm dig selv:\n${self}\n` : ""}${shared ? `\nJeres fælles ting:\n${shared}\n` : ""}
## Jeres planet ${planet}
${planetLines()}`;
}

function userContent(message) {
  const body = message.event ? `<hændelse>${message.text}</hændelse>` : message.text;
  return `<tid>${stamp(message.ts)}</tid>\n${body}`;
}

// Bygger beskedlisten til API'et. Vinduet starter altid ved et fast spring,
// så starten af samtalen er uændret mellem beskeder og kan caches.
export function apiMessages() {
  const all = state.messages.filter((m) => !m.skip && m.text);
  const start = Math.floor(Math.max(0, all.length - HISTORY_WINDOW) / HISTORY_CHUNK) * HISTORY_CHUNK;
  let slice = all.slice(start);
  const firstUser = slice.findIndex((m) => m.role === "user");
  slice = firstUser === -1 ? [] : slice.slice(firstUser);
  return slice.map((m) =>
    m.role === "user" ? { role: "user", content: userContent(m) } : { role: "assistant", content: m.text },
  );
}

// Lægger et anslået forbrug til månedens total (vises under Indstillinger).
export function recordUsage(message) {
  if (!message?.usage) return;
  const month = monthKey();
  if (state.usage.month !== month) state.usage = { month, usd: 0, requests: 0 };
  state.usage.usd += estimateCostUSD(message.model, message.usage);
  state.usage.requests += 1;
  save();
}

export function addMessage(role, text, extra = {}) {
  const message = { id: uid(), role, text, ts: Date.now(), ...extra };
  state.messages.push(message);
  save();
  return message;
}

export function addEvent(text) {
  return addMessage("user", text, { event: true });
}

export function greetingEvent() {
  const { user } = names();
  const hasChatted = state.messages.some((m) => m.role === "assistant");
  return hasChatted
    ? `${user} har åbnet appen igen.`
    : `Det er første gang, ${user} åbner appen. I mødes for første gang lige nu. Sig hej, præsentér dig kort, og spørg ind til ${user}.`;
}

// ---------- Minder ----------

const MEMORY_SCHEMA = {
  type: "object",
  properties: {
    add: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["user", "friend", "shared"] },
          text: { type: "string" },
        },
        required: ["kind", "text"],
        additionalProperties: false,
      },
    },
    update: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, text: { type: "string" } },
        required: ["id", "text"],
        additionalProperties: false,
      },
    },
    remove: { type: "array", items: { type: "string" } },
  },
  required: ["add", "update", "remove"],
  additionalProperties: false,
};

function transcriptLine(message) {
  const { user, friend } = names();
  if (message.event) return `[${stamp(message.ts)}] (hændelse) ${message.text}`;
  const who = message.role === "user" ? user : friend;
  return `[${stamp(message.ts)}] ${who}: ${message.text}`;
}

let memoryBusy = false;

// Gennemgår nye beskeder og opdaterer minderne. Returnerer antal nye minder.
// force: kør uanset antal. staleMs: kør også, hvis den nyeste ventende besked
// er ældre end dette (fx når appen åbnes efter en pause).
export async function updateMemories({ force = false, staleMs = Infinity } = {}) {
  const { apiKey, model } = state.settings;
  if (memoryBusy || !apiKey) return 0;
  const pending = state.messages.filter((m) => m.ts > state.memory.processedUntil && !m.skip);
  const userMessages = pending.filter((m) => m.role === "user" && !m.event).length;
  if (userMessages === 0) return 0;
  const stale = Date.now() - pending[pending.length - 1].ts > staleMs;
  if (!force && !stale && userMessages < MEMORY_BATCH) return 0;

  memoryBusy = true;
  try {
    const { user, friend } = names();
    const lastTs = pending[pending.length - 1].ts;
    const existing =
      state.memory.items.map((it) => `${it.id} | ${it.kind} | ${it.text}`).join("\n") || "(ingen endnu)";
    const system = `Du vedligeholder hukommelsen for ${friend}, et lille rumvæsen, der er ven med ${user} i en chat-app. Du får de nuværende minder og et nyt uddrag af samtalen og returnerer ændringerne.

- add: nye ting, der er værd at huske på længere sigt. Typer:
  - "user": om ${user}: navne på familie, venner og kæledyr, job eller studie, interesser, vaner, vigtige begivenheder, planer og hvad ${user} godt og ikke godt kan lide.
  - "friend": det, ${friend} har fortalt om sig selv og sit liv på planeten, så historien hænger sammen næste gang.
  - "shared": jeres fælles ting: interne jokes, aftaler, kælenavne og ting, I har lovet at følge op på.
- update: et eksisterende minde (efter id), der er forældet eller kan gøres mere præcist. Skriv hele den nye tekst.
- remove: id'er på minder, der ikke længere passer, eller som ${user} har bedt om at glemme.

Regler:
- Skriv hvert minde som én kort, selvstændig sætning på dansk, fx "${user} har en hund, der hedder Bella."
- Skriv konkrete datoer i stedet for "i morgen" eller "på fredag"; tidspunkterne står i uddraget.
- Gem ikke småsnak, øjeblikkets humør eller noget, der allerede står i minderne.
- Gem aldrig adgangskoder, kontonumre, CPR-numre eller lignende.
- Er der intet nyt, så returnér tomme lister.
- Hold det samlede antal minder under ${MAX_MEMORIES} ved at slå beslægtede minder sammen.`;
    const prompt = `Nuværende minder (id | type | tekst):\n${existing}\n\nNyt uddrag af samtalen:\n${pending
      .map(transcriptLine)
      .join("\n")}`;

    const { data, message } = await jsonCall({ apiKey, model, system, prompt, schema: MEMORY_SCHEMA });
    recordUsage(message);
    const now = Date.now();
    const removed = new Set(data.remove);
    state.memory.items = state.memory.items
      .filter((it) => !removed.has(it.id))
      .map((it) => {
        const change = data.update.find((u) => u.id === it.id);
        return change ? { ...it, text: change.text.trim(), ts: now } : it;
      });
    const added = data.add
      .map((a) => ({ id: uid(), kind: a.kind, text: a.text.trim(), ts: now }))
      .filter((a) => a.text);
    state.memory.items.push(...added);
    state.memory.processedUntil = lastTs;
    save();
    return added.length;
  } finally {
    memoryBusy = false;
  }
}

export function addManualMemory(text, kind = "user") {
  const clean = text.trim();
  if (!clean) return;
  state.memory.items.push({ id: uid(), kind, text: clean, ts: Date.now() });
  save();
}

export function removeMemory(id) {
  state.memory.items = state.memory.items.filter((it) => it.id !== id);
  save();
}

// ---------- Dagens idéer ----------

const STATIC_IDEAS = [
  "Fortæl mig om din dag på planeten 🪐",
  "Lad os lave en quiz om mig! 🎲",
  "Hvad synes du om jordboere? 🌍",
  "Jeg har haft en lang dag …",
  "Lær mig et ord på dit sprog 👽",
  "Hvad skal vi bygge på planeten? 🌱",
  "Fortæl mig en hemmelighed 🤫",
  "Skal vi lege en gætteleg? 🔮",
  "Hvad har du set i teleskopet i dag? 🔭",
  "Giv mig en lille udfordring til i dag 💪",
];

function staticIdeas(count = 3) {
  const seed = [...dayKey()].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, i) => STATIC_IDEAS[(seed + i * 3) % STATIC_IDEAS.length]);
}

const IDEAS_SCHEMA = {
  type: "object",
  properties: { ideas: { type: "array", items: { type: "string" } } },
  required: ["ideas"],
  additionalProperties: false,
};

let ideasBusy = false;

export async function refreshDailyIdeas() {
  const today = dayKey();
  if (ideasBusy || (state.daily.day === today && state.daily.ideas.length)) return false;
  const { apiKey, model } = state.settings;
  if (!apiKey) {
    state.daily = { day: today, ideas: staticIdeas() };
    save();
    return true;
  }
  ideasBusy = true;
  try {
    const { user, friend } = names();
    const about = { user: `om ${user}`, friend: `om ${friend}`, shared: "fælles" };
    const memories = state.memory.items.map((it) => `- (${about[it.kind]}) ${it.text}`).join("\n");
    const system = `Du foreslår samtalestartere til ${user}, der skriver med rumvæsenet ${friend} i en chat-app.`;
    const prompt = `I dag er det ${stamp(Date.now())}.

Det ved ${friend} om jer:
${memories || "(intet endnu – I har lige mødt hinanden)"}

Foreslå 3 korte samtalestartere, som ${user} kan trykke på for at skrive til ${friend}. Skriv dem på dansk, i jeg-form fra ${user}, højst 45 tegn hver og gerne med én emoji til sidst. Bland det sådan:
1. Noget om ${user}s liv, gerne en opfølgning på noget fra minderne.
2. Noget legende med ${friend}: en quiz, en gætteleg, et lille rollespil eller lignende.
3. Noget om ${friend}s verden eller jeres planet.`;
    const { data, message } = await jsonCall({ apiKey, model, system, prompt, schema: IDEAS_SCHEMA });
    recordUsage(message);
    const ideas = data.ideas.map((s) => s.trim()).filter(Boolean).slice(0, 3);
    state.daily = { day: today, ideas: ideas.length ? ideas : staticIdeas() };
  } catch (err) {
    console.warn("Kunne ikke hente dagens idéer", err);
    state.daily = { day: today, ideas: staticIdeas() };
  } finally {
    ideasBusy = false;
  }
  save();
  return true;
}

export function useIdea(text) {
  state.daily.ideas = state.daily.ideas.filter((idea) => idea !== text);
  save();
}
