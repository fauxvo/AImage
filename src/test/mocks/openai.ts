import { vi } from "vitest";

/** Shared mock OpenAI client — configure per-test via mockOpenAIClient.images.generate etc. */
export const mockOpenAIClient = {
  images: {
    generate: vi.fn().mockResolvedValue({
      data: [{ b64_json: Buffer.from("fake-image").toString("base64") }],
    }),
    edit: vi.fn().mockResolvedValue({
      data: [{ b64_json: Buffer.from("fake-image").toString("base64") }],
    }),
  },
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                refinedPrompt: "A refined prompt",
                settings: {},
              }),
            },
          },
        ],
      }),
    },
  },
};

/**
 * Drop-in replacement for `@/lib/openai`.
 * `import { getOpenAIClient } from "@/lib/openai"` resolves here.
 */
export const getOpenAIClient = vi.fn().mockResolvedValue(mockOpenAIClient);
