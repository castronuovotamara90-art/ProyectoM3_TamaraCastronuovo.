import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "./chat.js";

describe("chat handler", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL = "openai/gpt-3.5-turbo";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
  });

  it("devuelve 405 para metodos no POST", async () => {
    const req = { method: "GET" };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "METHOD_NOT_ALLOWED" })
    );
  });

  it("devuelve 500 si falta OPENROUTER_API_KEY", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const req = { method: "POST", body: { message: "Hola" } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "MISSING_API_KEY" })
    );
  });

  it("devuelve 200 y respuesta normal cuando OpenRouter responde", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Hola desde OpenRouter" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 4 },
      }),
    });

    const req = { method: "POST", body: { message: "Hola", characterId: "homer", history: [] } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Hola desde OpenRouter",
        truncated: false,
        usage: { inputTokens: 5, outputTokens: 4 },
      })
    );
  });
});
