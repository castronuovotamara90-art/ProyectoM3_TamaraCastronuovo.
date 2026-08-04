import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSendMessage, mockStartChat, mockGetGenerativeModel } = vi.hoisted(() => {
  const mockSendMessage = vi.fn();
  const mockStartChat = vi.fn(() => ({ sendMessage: mockSendMessage }));
  const mockGetGenerativeModel = vi.fn(() => ({ startChat: mockStartChat }));

  return { mockSendMessage, mockStartChat, mockGetGenerativeModel };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    constructor(apiKey) {
      this.apiKey = apiKey;
    }

    getGenerativeModel() {
      return mockGetGenerativeModel();
    }
  },
}));

import handler from "./chat.js";

describe("chat handler", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-3.1-flash-lite";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
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

  it("devuelve 500 si falta GEMINI_API_KEY", async () => {
    delete process.env.GEMINI_API_KEY;

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

  it("devuelve 200 y respuesta normal cuando Gemini responde", async () => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => "Hola desde Gemini",
        candidates: [{ finishReason: "STOP" }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 4 },
      },
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
        text: "Hola desde Gemini",
        truncated: false,
        usage: { inputTokens: 5, outputTokens: 4 },
      })
    );
  });
});
