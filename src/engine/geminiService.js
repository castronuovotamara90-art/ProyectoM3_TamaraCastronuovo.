
export function normalizeAIResponse(raw) {
    const candidate = raw?.candidates?.[0];
 
    const text = candidate?.content?.parts?.[0]?.text ?? "";
 
    // Gemini marca en finishReason si el modelo se quedo sin espacio
    // (MAX_TOKENS) en vez de terminar naturalmente (STOP).
    const truncated = candidate?.finishReason === "MAX_TOKENS";
 
    return {
        text,
        truncated,
    };
}
 
/*
 * extractUsage(raw)
 * Extrae metricas de tokens para logging/debug educativo.
 * Gemini las reporta en usageMetadata, no en "usage" como Claude.
 */
export function extractUsage(raw) {
  return {
    inputTokens: raw?.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: raw?.usageMetadata?.candidatesTokenCount ?? 0,
  };
}