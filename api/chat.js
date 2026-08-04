import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildPayload, getCharacter, isValidPayload } from "../src/engine/payload.js";
import { extractUsage, normalizeAIResponse } from "../src/engine/normalizer.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST for /api/chat",
    });
  }

  if (!getGeminiApiKey()) {
    return sendJson(res, 500, {
      error: "MISSING_API_KEY",
      message: "Set GEMINI_API_KEY in .env",
    });
  }

  try {
    const body = req.body ?? {};
    const characterId = sanitizeCharacterId(body?.characterId);
    const message = sanitizeMessage(body?.message);
    const history = sanitizeHistory(body?.history);

    if (!message) {
      return sendJson(res, 400, {
        error: "INVALID_MESSAGE",
        message: "message is required and must contain text",
      });
    }

    const character = getCharacter(characterId);
    const providerResult = await requestGemini(character, message, history);

    if (!providerResult.text) {
      return sendJson(res, 502, {
        error: "EMPTY_MODEL_RESPONSE",
        message: "The AI provider returned an empty response",
      });
    }

    return sendJson(res, 200, {
      text: providerResult.text,
      truncated: providerResult.truncated,
      usage: providerResult.usage,
      model: providerResult.model,
      character: {
        id: characterId,
        name: character.name,
      },
    });
  } catch (error) {
    console.error("Error calling Gemini:", error);

    if (error?.status === 429) {
      return sendJson(res, 429, {
        error: "AI_QUOTA_EXCEEDED",
        message: "AI provider quota exceeded. Check billing/quota and retry later.",
      });
    }

    if (error?.status === 504) {
      return sendJson(res, 504, {
        error: "AI_REQUEST_TIMEOUT",
        message:
          error?.message ||
          "The AI provider took too long to respond. Retry later or check the network.",
      });
    }

    return sendJson(res, 502, {
      error: "AI_REQUEST_FAILED",
      message: error?.message || "The AI provider request failed",
    });
  }
}

async function requestGemini(character, message, history) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const payload = buildPayload(character, history, "gemini");

  if (!isValidPayload(payload, "gemini")) {
    throw new Error("Payload validation failed");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModel(),
    systemInstruction: payload.systemInstruction,
    generationConfig: payload.generationConfig,
  });

  const chat = model.startChat({
    history: payload.history,
  });

  const result = await chat.sendMessage(message);
  const response = await result.response;
  const normalized = normalizeAIResponse(response, "gemini");
  const usage = extractUsage(response, "gemini");

  return {
    text: normalized.text,
    truncated: normalized.truncated,
    usage,
    model: getGeminiModel(),
  };
}

function sanitizeCharacterId(input) {
  if (typeof input !== "string") return "homer";
  return input.toLowerCase().trim();
}

function sanitizeMessage(input) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, 600);
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant"))
    .map((msg) => ({
      role: msg.role,
      content: typeof msg.content === "string" ? msg.content.slice(0, 600) : "",
    }))
    .filter((msg) => msg.content);
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY;
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
}

function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}
