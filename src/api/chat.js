/*
 * api/chat.js — Vercel Serverless Function para el chat de M3L7
 *
 * Responsabilidad:
 * - Recibir el payload construido por el engine del frontend.
 * - Leer GEMINI_API_KEY desde process.env.
 * - Adaptar el payload interno del chat a Gemini.
 * - Devolver un shape compatible con normalizer.js: content[].
 *
 * La API key nunca se envía al navegador.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { isRateLimitError, getHttpStatus } from "./utils/errors.js";
import { toGeminiContents } from "./utils/gemini.js";
import { parseJsonBody, getMessages, getGenerationSettings } from "./utils/request.js";
import { createChatResponse } from "./utils/response.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = parseJsonBody(req.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY no configurada" });
    }

    const messages = getMessages(payload);
    const { system, modelName, temperature, maxOutputTokens } = getGenerationSettings(payload);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: system,
    });

    // messages[] viene del historial recortado de M3L6. Lo enviamos completo
    // a Gemini para que el modelo reciba contexto conversacional.
    const contents = toGeminiContents(messages);

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    });

    const text = result.response.text().trim();

    return res.status(200).json(createChatResponse({ text, payload }));
  } catch (error) {
    console.error("[/api/chat] Error:", error);

    if (isRateLimitError(error)) {
      return res.status(429).json({
        error: "Rate limit de Gemini. Reintentá en unos segundos.",
        retryAfterSeconds: 8,
      });
    }

    return res.status(getHttpStatus(error)).json({
      error: error.message || "Error generando respuesta del chat",
    });
  }
}