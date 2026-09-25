// Server-only: calls the Gemini API and returns parsed JSON. The key never reaches the browser.

// Cheapest stable Flash model at the time of writing; override with GEMINI_MODEL in Vercel if it changes.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export class AiError extends Error {}

export async function geminiJson<T>(prompt: string, schema: object): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    },
  );

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new AiError(`Gemini ${model} returned ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiError(`Gemini returned non-JSON output: ${text.slice(0, 200)}`);
  }
}

/** Trim a model-provided string to a safe length; non-strings become "". */
export function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
