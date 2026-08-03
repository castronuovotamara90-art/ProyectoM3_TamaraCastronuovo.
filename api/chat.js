import { fetchJson } from "../src/engine/fetchjson.js";
import { buildPayload, getCharacter, isValidPayload } from "../src/engine/payload.js";
import { extractUsage, normalizeAIResponse } from "../src/engine/normalizer.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST for /api/chat",
    });
  }

  if (!getOpenRouterApiKey()) {
    return sendJson(res, 500, {
      error: "MISSING_API_KEY",
      message: "Set OPENROUTER_API_KEY in .env",
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
    const messages = [...history, { role: "user", content: message }];
    const payload = buildPayload(character, messages, "openrouter");

    if (!isValidPayload(payload, "openrouter")) {
      return sendJson(res, 400, {
        error: "INVALID_PAYLOAD",
        message: "Payload validation failed",
      });
    }

    const providerResult = await requestOpenRouter(payload);
    const normalized = normalizeAIResponse(providerResult.raw, "openrouter");
    const usage = extractUsage(providerResult.raw, "openrouter");

    if (!normalized.text) {
      return sendJson(res, 502, {
        error: "EMPTY_MODEL_RESPONSE",
        message: "The AI provider returned an empty response",
      });
    }

    return sendJson(res, 200, {
      text: normalized.text,
      truncated: normalized.truncated,
      usage,
      model: providerResult.model,
      character: {
        id: characterId,
        name: character.name,
      },
    });
  } catch (error) {
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

async function requestOpenRouter(payload) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const requestPayload = {
    ...payload,
    model: getOpenRouterModel(),
  };

  const raw = await fetchJson(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_X_TITLE || "SPA Simpsons Chat",
    },
    body: JSON.stringify(requestPayload),
  });

  return {
    raw,
    model: getOpenRouterModel(),
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

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY;
}

function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";
}

function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}
