
export function normalizeAIResponse(raw, provider = "gemini") {
  if (provider === "openrouter") {
    const choice = raw?.choices?.[0];

    return {
      text: choice?.message?.content ?? "",
      truncated: choice?.finish_reason === "length",
    };
  }

  const candidate = raw?.candidates?.[0];

  return {
    text: candidate?.content?.parts?.[0]?.text ?? "",
    truncated: candidate?.finishReason === "MAX_TOKENS",
  };
}

export function extractUsage(raw, provider = "gemini") {
  if (provider === "openrouter") {
    return {
      inputTokens: raw?.usage?.prompt_tokens ?? 0,
      outputTokens: raw?.usage?.completion_tokens ?? 0,
    };
  }

  return {
    inputTokens: raw?.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: raw?.usageMetadata?.candidatesTokenCount ?? 0,
  };
}