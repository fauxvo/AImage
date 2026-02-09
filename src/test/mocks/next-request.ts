/**
 * Helpers for testing Next.js route handlers.
 */

/** Build a Request object suitable for route handler tests */
export function createRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    formData?: FormData;
  } = {}
): Request {
  const { method = "GET", body, headers = {}, formData } = options;

  const init: RequestInit = { method, headers };

  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json", ...headers };
    init.body = JSON.stringify(body);
  }

  return new Request(`http://localhost:3000${url}`, init);
}

/** Wrap params in the Next.js 16 async params shape */
export function createParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

/** Extract JSON body from a Response */
export async function readJson<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

/** Parse SSE text into structured events */
export async function readSSEEvents(
  response: Response
): Promise<Array<{ event: string; data: unknown }>> {
  const text = await response.text();
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = text.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7);
      if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (data) {
      const eventName = event || "message";
      try {
        events.push({ event: eventName, data: JSON.parse(data) });
      } catch {
        events.push({ event: eventName, data });
      }
    }
  }

  return events;
}
