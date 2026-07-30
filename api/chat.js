import { GoogleGenerativeAI } from "@google/generative-ai";

import { fetchJson } from "../src/engine/fetchjson.js";
import { buildPayload, getCharacter, isValidPayload } from "../src/engine/payload.js";
import { extractUsage, normalizeAIResponse } from "../src/engine/normalizer.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST for /api/chat",
    });
  }

  const provider = resolveProvider(process.env.AI_PROVIDER);
  if (!provider) {
    return sendJson(res, 500, {
      error: "MISSING_API_KEY",
      message: "Set GEMINI_API_KEY and optional OPENROUTER_API_KEY in .env",
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
    const payload = buildPayload(character, messages, provider.name);

    if (!isValidPayload(payload, provider.name)) {
      return sendJson(res, 400, {
        error: "INVALID_PAYLOAD",
        message: `Payload validation failed for provider: ${provider.name}`,
      });
    }

    const providerResult = await requestWithProvider(payload, provider.name);
    const normalized = normalizeAIResponse(providerResult.raw, providerResult.providerName);
    const usage = extractUsage(providerResult.raw, providerResult.providerName);

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

    return sendJson(res, 502, {
      error: "AI_REQUEST_FAILED",
      message: error?.message || "The AI provider request failed",
    });
  }
}

async function requestWithProvider(payload, providerName) {
  if (providerName === "gemini") {
    try {
      return await requestGeminiWithFallback(payload);
    } catch (error) {
      if (!OPENROUTER_API_KEY || !isRecoverableProviderError(error)) {
        throw error;
      }

      const openRouterPayload = convertToOpenRouterPayload(payload);
      return requestOpenRouter(openRouterPayload);
    }
  }

  if (providerName === "openrouter") {
    return requestOpenRouter(payload);
  }

  throw new Error(`Unsupported provider: ${providerName}`);
}

async function requestGeminiWithFallback(payload) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const models = Array.from(new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(Boolean)));
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  let lastError;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(payload);
      const response = await result.response;

      return {
        raw: response,
        model: modelName,
        providerName: "gemini",
      };
    } catch (error) {
      lastError = error;
      if (!shouldRetryWithNextGeminiModel(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Gemini request failed for all configured models");
}

async function requestOpenRouter(payload) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY for fallback");
  }

  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const requestPayload = {
    ...payload,
    model: OPENROUTER_MODEL,
  };

  const raw = await fetchJson(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_X_TITLE || "SPA Simpsons Chat",
    },
    body: JSON.stringify(requestPayload),
  });

  return {
    raw,
    model: OPENROUTER_MODEL,
    providerName: "openrouter",
  };
}

function convertToOpenRouterPayload(geminiPayload) {
  const systemPrompt = geminiPayload?.system_instruction?.parts?.[0]?.text || "";
  const contents = Array.isArray(geminiPayload?.contents) ? geminiPayload.contents : [];

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const item of contents) {
    const role = item?.role === "model" ? "assistant" : "user";
    const text = item?.parts?.[0]?.text;
    if (typeof text === "string" && text.trim()) {
      messages.push({ role, content: text });
    }
  }

  return {
    messages,
    temperature: geminiPayload?.generationConfig?.temperature ?? 0.6,
    max_tokens: geminiPayload?.generationConfig?.maxOutputTokens ?? 150,
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
    .filter((msg) => msg.content)
    .slice(-12);
}

function resolveProvider(preferredProvider) {
  const preferred = String(preferredProvider || "").toLowerCase().trim();

  if (preferred === "gemini") {
    if (GEMINI_API_KEY) return { name: "gemini" };
    if (OPENROUTER_API_KEY) return { name: "openrouter" };
    return null;
  }

  if (preferred === "openrouter") {
    if (OPENROUTER_API_KEY) return { name: "openrouter" };
    if (GEMINI_API_KEY) return { name: "gemini" };
    return null;
  }

  if (GEMINI_API_KEY) return { name: "gemini" };
  if (OPENROUTER_API_KEY) return { name: "openrouter" };
  return null;
}

function shouldRetryWithNextGeminiModel(error) {
  const text = String(error?.message || "").toLowerCase();
  return (
    text.includes("no longer available") ||
    text.includes("not found for api version") ||
    text.includes("is not found") ||
    text.includes("unsupported model")
  );
}

function isRecoverableProviderError(error) {
  const text = String(error?.message || "").toLowerCase();
  return (
    error?.status === 429 ||
    text.includes("quota") ||
    text.includes("rate") ||
    text.includes("resource exhausted") ||
    text.includes("no longer available") ||
    text.includes("not found") ||
    text.includes("unsupported model")
  );
}

function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}
