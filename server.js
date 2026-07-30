import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { fetchJson } from "./src/engine/fetchjson.js";
import { buildPayload, getCharacter, isValidPayload } from "./src/engine/payload.js";
import { extractUsage, normalizeAIResponse } from "./src/engine/normalizer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;

const loadedEnvPath = loadFirstExistingEnv([
  path.join(ROOT, ".env"),
  path.join(ROOT, "src", ".env"),
]);

const PORT = Number(process.env.PORT || 8095);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-pro";
const AI_PROVIDER = resolveProvider(process.env.AI_PROVIDER);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/chat") {
      await handleChatRequest(req, res);
      return;
    }

    await serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, {
      error: "INTERNAL_SERVER_ERROR",
      message: error?.message ?? "Unexpected server error",
    });
  }
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Close the process using that port or change PORT in .env.`,
    );
    process.exit(1);
    return;
  }

  throw error;
});

server.listen(PORT, () => {
  const source = loadedEnvPath ? ` (env: ${path.basename(path.dirname(loadedEnvPath))}/${path.basename(loadedEnvPath)})` : "";
  console.log(`Server ready at http://127.0.0.1:${PORT}${source}`);
});

async function handleChatRequest(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, {
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST for /api/chat",
    });
    return;
  }

  if (!AI_PROVIDER) {
    sendJson(res, 500, {
      error: "MISSING_API_KEY",
      message:
        "Missing provider configuration. Set OPENROUTER_API_KEY (recommended) or GEMINI_API_KEY in .env and restart the server.",
    });
    return;
  }

  const body = await parseJsonBody(req);
  const characterId = sanitizeCharacterId(body?.characterId);
  const message = sanitizeMessage(body?.message);
  const history = sanitizeHistory(body?.history);

  if (!message) {
    sendJson(res, 400, {
      error: "INVALID_MESSAGE",
      message: "message is required and must contain text",
    });
    return;
  }

  const character = getCharacter(characterId);
  const messages = [...history, { role: "user", content: message }];
  const payload = buildPayload(character, messages, AI_PROVIDER.name);

  if (!isValidPayload(payload, AI_PROVIDER.name)) {
    sendJson(res, 400, {
      error: "INVALID_PAYLOAD",
      message: `Payload validation failed for provider: ${AI_PROVIDER.name}`,
    });
    return;
  }

  let providerResult;

  try {
    providerResult = await requestWithProvider(payload, AI_PROVIDER.name);
  } catch (error) {
    if (error?.status === 429) {
      sendJson(res, 429, {
        error: "AI_QUOTA_EXCEEDED",
        message:
          error?.message ??
          "AI provider quota exceeded. Check billing/quota and retry later.",
      });
      return;
    }

    sendJson(res, 502, {
      error: "AI_REQUEST_FAILED",
      message:
        error?.message ??
        "The AI provider request failed. Verify provider API key and model configuration.",
    });
    return;
  }

  const normalized = normalizeAIResponse(providerResult.raw, AI_PROVIDER.name);
  const usage = extractUsage(providerResult.raw, AI_PROVIDER.name);

  if (!normalized.text) {
    sendJson(res, 502, {
      error: "EMPTY_MODEL_RESPONSE",
      message: "The AI provider returned an empty response",
    });
    return;
  }

  sendJson(res, 200, {
    text: normalized.text,
    truncated: normalized.truncated,
    usage,
    model: providerResult.model,
    character: {
      id: characterId,
      name: character.name,
    },
  });
}

async function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, {
      error: "METHOD_NOT_ALLOWED",
      message: "Unsupported method for static files",
    });
    return;
  }

  const safePath = pathname === "/" ? "/index.html" : pathname;
  const absolute = path.join(ROOT, safePath);

  const filePath = await resolveFilePath(absolute);
  const finalPath = filePath ?? path.join(ROOT, "index.html");

  const ext = path.extname(finalPath).toLowerCase();
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";
  const content = await readFile(finalPath);

  res.writeHead(200, { "Content-Type": mime });
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(content);
}

async function resolveFilePath(filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    return filePath;
  } catch {
    return null;
  }
}

async function parseJsonBody(req) {
  const chunks = [];
  let total = 0;
  const maxBytes = 64 * 1024;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
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
    return candidate;
  }

  return null;
}

async function requestGeminiWithFallback(payload) {
  const models = Array.from(new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(Boolean)));
  let lastError;

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
      const raw = await fetchJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      return { raw, model };
    } catch (error) {
      lastError = error;
      if (!shouldRetryWithNextModel(error)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Gemini request failed for all configured models");
}

async function requestOpenRouter(payload) {
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
      "HTTP-Referer": `http://127.0.0.1:${PORT}`,
      "X-Title": "SPA Simpsons Chat",
    },
    body: JSON.stringify(requestPayload),
  });

  return { raw, model: OPENROUTER_MODEL };
}

async function requestWithProvider(payload, providerName) {
  if (providerName === "openrouter") {
    return requestOpenRouter(payload);
  }

  if (providerName === "gemini") {
    return requestGeminiWithFallback(payload);
  }

  throw new Error(`Unsupported provider: ${providerName}`);
}

function resolveProvider(preferredProvider) {
  const preferred = String(preferredProvider ?? "").toLowerCase().trim();

  if (preferred === "openrouter") {
    return OPENROUTER_API_KEY
      ? { name: "openrouter" }
      : null;
  }

  if (preferred === "gemini") {
    return GEMINI_API_KEY
      ? { name: "gemini" }
      : null;
  }

  if (OPENROUTER_API_KEY) return { name: "openrouter" };
  if (GEMINI_API_KEY) return { name: "gemini" };
  return null;
}

function shouldRetryWithNextModel(error) {
  const text = String(error?.message ?? "").toLowerCase();
  return (
    text.includes("no longer available") ||
    text.includes("not found for api version") ||
    text.includes("is not found")
  );
}
