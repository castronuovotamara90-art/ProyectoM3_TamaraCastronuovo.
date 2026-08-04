import { buildPayload, getCharacter, isValidPayload } from "../src/engine/payload.js";
import { fetchJson } from "../src/engine/fetchjson.js";
import { extractUsage, normalizeAIResponse } from "../src/engine/normalizer.js";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadFirstExistingEnv([
  path.join(__dirname, "..", ".env"),
  path.join(__dirname, "..", "src", ".env"),
]);

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
      message:
        "Set OPENROUTER_API_KEY in .env (project root). If your file is in src/.env, move it to root or configure Vercel env vars.",
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
    const providerResult = await requestOpenRouter(character, message, history);

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
    console.error("Error calling OpenRouter:", error);

    if (isUnavailableFreeModelError(error)) {
      return sendJson(res, 502, {
        error: "MODEL_UNAVAILABLE",
        message:
          "The configured OpenRouter model is no longer available in free tier. Set OPENROUTER_MODEL to an available model or use OPENROUTER_MODEL=openrouter/auto.",
      });
    }

    if (error?.status === 429) {
      return sendJson(res, 429, {
        error: "AI_QUOTA_EXCEEDED",
        message:
          error?.message ||
          "AI provider quota exceeded. Retry later or choose another free model.",
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

async function requestOpenRouter(character, message, history) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const payload = buildPayload(character, history, "openrouter");

  if (!isValidPayload(payload, "openrouter")) {
    throw new Error("Payload validation failed");
  }

  const response = await fetchJson("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenRouterModel(),
      messages: [...payload.messages, { role: "user", content: message }],
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
    }),
    timeoutMs: 30000,
  });
  const normalized = normalizeAIResponse(response, "openrouter");
  const usage = extractUsage(response, "openrouter");

  return {
    text: normalized.text,
    truncated: normalized.truncated,
    usage,
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
  return process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
}

function isUnavailableFreeModelError(error) {
  const text = String(error?.message || "").toLowerCase();
  return text.includes("unavailable for free") || text.includes("paid version is available");
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf-8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const idx = trimmed.indexOf("=");
    if (idx === -1) return;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();

    if (!key || process.env[key]) return;
    process.env[key] = value;
  });
}

function loadFirstExistingEnv(candidates) {
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    loadDotEnv(candidate);
    return;
  }
}

function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}
