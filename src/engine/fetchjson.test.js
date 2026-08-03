import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchJson } from "./fetchjson.js";

describe("fetchJson", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("convierte un abort en timeout 504", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation((_url, options) => {
      return new Promise((_, reject) => {
        options.signal.addEventListener("abort", () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const promise = fetchJson("https://example.com", { timeoutMs: 10 });

    await vi.advanceTimersByTimeAsync(10);

    await expect(promise).rejects.toMatchObject({
      status: 504,
      message: "AI provider request timed out after 10ms",
    });
  });
});