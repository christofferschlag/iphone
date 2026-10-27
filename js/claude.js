// Kald til Claude via Anthropics officielle SDK (bundlet i vendor/).
// Nøglen bliver på telefonen og sendes kun direkte til api.anthropic.com.
import Anthropic from "../vendor/anthropic-sdk.js";

export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Klogest (standard)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "Hurtig og billigere" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "Billigst" },
];

// USD pr. million tokens: input, output, cache-skrivning (5 min.), cache-læsning.
const PRICES = {
  "claude-opus-5-5": [4, 20, 5, 0.2],
  "claude-sonnet-5-5": [2, 10, 2.5, 0.2],
  "claude-haiku-5-5": [0.1, 0.5, 0.125, 0.01],
  // Mulige reservemodeller, hvis en forespørgsel bliver afvist og sendt videre.
  "claude-opus-5": [5, 25, 6.25, 0.5],
  "claude-opus-4-8": [5, 25, 6.25, 0.5],
  "claude-sonnet-5": [2, 10, 2.5, 0.2],
};

// Server-side fallback: afviser modellen en forespørgsel, prøver API'et
// automatisk en anden model. Findes ikke til Haiku.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

export class RefusalError extends Error {}

let cached = { key: "", client: null };

function client(apiKey) {
  if (cached.key !== apiKey) {
    cached = { key: apiKey, client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) };
  }
  return cached.client;
}

function withFallback(params) {
  if (!FALLBACK_MODELS.has(params.model)) return { beta: false, params };
  return {
    beta: true,
    params: { ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" },
  };
}

function textOf(message) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export function estimateCostUSD(model, usage) {
  if (!usage) return 0;
  const [input, output, write, read] = PRICES[model] || PRICES["claude-opus-5-5"];
  const cost =
    (usage.input_tokens || 0) * input +
    (usage.output_tokens || 0) * output +
    (usage.cache_creation_input_tokens || 0) * write +
    (usage.cache_read_input_tokens || 0) * read;
  return cost / 1e6;
}

// Streamer et svar. onText får hvert nyt stykke tekst, efterhånden som det kommer.
export async function streamReply({ apiKey, model, system, messages, onText, signal }) {
  const { beta, params } = withFallback({
    model,
    max_tokens: 8000,
    system,
    messages,
    // Automatisk prompt-caching af samtalen, så hver ny besked bliver billigere.
    cache_control: { type: "ephemeral" },
    // Lav effort passer til hurtig, hverdagsagtig chat.
    output_config: { effort: "low" },
  });
  const api = client(apiKey);
  const stream = beta
    ? api.beta.messages.stream(params, { signal })
    : api.messages.stream(params, { signal });
  stream.on("text", (delta) => onText?.(delta));
  const message = await stream.finalMessage();
  return { message, text: textOf(message) };
}

// Ét kald, der skal returnere JSON efter et skema (structured outputs).
export async function jsonCall({ apiKey, model, system, prompt, schema }) {
  const { beta, params } = withFallback({
    model,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort: "low", format: { type: "json_schema", schema } },
  });
  const api = client(apiKey);
  const message = beta ? await api.beta.messages.create(params) : await api.messages.create(params);
  if (message.stop_reason === "refusal") throw new RefusalError("Claude afviste forespørgslen");
  if (message.stop_reason === "max_tokens") throw new Error("Svaret blev afbrudt");
  return { message, data: JSON.parse(textOf(message)) };
}

// Tjekker nøglen og modellen via Models-API'et, som ikke koster tokens.
export async function verifyKey({ apiKey, model }) {
  await client(apiKey).models.retrieve(model);
}

// Oversætter fejl til en kort dansk forklaring. null betyder "ignorér".
export function describeError(err) {
  if (err instanceof Anthropic.APIUserAbortError) return null;
  if (err instanceof Anthropic.AuthenticationError) {
    return "API-nøglen blev afvist. Tjek den under Indstillinger.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "Din API-nøgle har ikke adgang til den valgte model.";
  }
  if (err instanceof Anthropic.NotFoundError) {
    return "Modellen blev ikke fundet. Vælg en anden under Indstillinger.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "For mange beskeder på kort tid. Vent et øjeblik, og prøv igen.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    const detail = err.error?.error?.message || err.message;
    return `Claude kunne ikke svare: ${detail}`;
  }
  if (err instanceof Anthropic.InternalServerError) {
    return "Claude er overbelastet lige nu. Prøv igen om lidt.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Ingen forbindelse til Claude. Er du på nettet?";
  }
  if (err instanceof Anthropic.APIError) {
    return `Der skete en fejl hos Claude (${err.status ?? "ukendt"}). Prøv igen.`;
  }
  if (err instanceof SyntaxError) return "Claude svarede i et uventet format.";
  return "Noget gik galt. Prøv igen.";
}
