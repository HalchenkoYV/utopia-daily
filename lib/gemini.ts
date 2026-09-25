// Server-only: calls the Gemini API and returns parsed JSON. The key never reaches the browser.

// Tried in order. GEMINI_MODEL (Vercel env var) goes first when set.
const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];

/** `code` is short and safe to show to the reader (e.g. "gemini_PERMISSION_DENIED"). */
export class AiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Attempt = { model: string; withSchema: boolean };

async function callOnce(key: string, prompt: string, schema: object, attempt: Attempt): Promise<unknown> {
  const generationConfig: Record<string, unknown> = { temperature: 0.2, responseMimeType: "application/json" };
  if (attempt.withSchema) generationConfig.responseJsonSchema = schema;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(attempt.model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig }),
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    throw new AiError(timeout ? "gemini_timeout" : "gemini_network", `fetch failed: ${String(err)}`);
  }

  if (!res.ok) {
    const text = await res.text();
    let status = String(res.status);
    try {
      status = JSON.parse(text)?.error?.status ?? status;
    } catch {}
    if (/API_KEY_INVALID|API key not valid|API key expired/i.test(text)) status = "bad_key";
    throw new AiError(`gemini_${status}`, `${attempt.model} → HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim()
    // Without a schema some models wrap JSON in ```json fences.
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(text);
  } catch {
    const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason ?? "unknown";
    throw new AiError("gemini_bad_output", `${attempt.model} → non-JSON output (${reason}): ${text.slice(0, 200)}`);
  }
}

export async function geminiJson<T>(prompt: string, schema: object): Promise<T> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new AiError("no_key", "GEMINI_API_KEY is not set");

  const models = [...new Set([process.env.GEMINI_MODEL?.trim(), ...DEFAULT_MODELS].filter(Boolean) as string[])];
  let lastError: AiError | null = null;

  for (const model of models) {
    for (const withSchema of [true, false]) {
      try {
        return (await callOnce(key, prompt, schema, { model, withSchema })) as T;
      } catch (err) {
        lastError = err instanceof AiError ? err : new AiError("gemini_error", String(err));
        console.error("[gemini]", lastError.message);
        // Only retry for problems that another model / request shape can fix.
        const retryable =
          lastError.code === "gemini_NOT_FOUND" ||
          lastError.code === "gemini_404" ||
          lastError.code === "gemini_INVALID_ARGUMENT" ||
          lastError.code === "gemini_400" ||
          lastError.code === "gemini_bad_output";
        if (!retryable) throw lastError;
        // A missing model won't work without the schema either — go to the next model.
        if (lastError.code === "gemini_NOT_FOUND" || lastError.code === "gemini_404") break;
      }
    }
  }
  throw lastError ?? new AiError("gemini_error", "no models to try");
}

/** Reader-friendly message for an AI failure. */
export function aiErrorMessage(err: unknown, what: string): { error: string; code: string } {
  const code = err instanceof AiError ? err.code : "gemini_error";
  if (code === "no_key" || code === "gemini_bad_key") return { error: `${what} are not set up correctly yet.`, code };
  if (code === "gemini_RESOURCE_EXHAUSTED" || code === "gemini_429") {
    return { error: `${what} are very busy right now. Please try again in a minute.`, code };
  }
  return { error: `${what} are not available right now. Please try again.`, code };
}

/** Trim a model-provided string to a safe length; non-strings become "". */
export function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
