
export function normalizeAIResponse(raw, provider = "gemini") {
  if (provider !== "gemini") {
    return { text: "", truncated: false };
  }

  const choice = raw?.choices?.[0];
  const candidate = raw?.candidates?.[0];

  if (candidate) {
    const parts = candidate?.content?.parts ?? [];
    const textFromParts = parts.map((part) => part?.text ?? "").join("");
    const textFromMethod = typeof raw?.text === "function" ? raw.text() : "";
    const text = textFromParts || textFromMethod;

    return {
      text,
      truncated: candidate?.finishReason === "MAX_TOKENS",
    };
  }

  return {
    text: choice?.message?.content ?? "",
    truncated: choice?.finish_reason === "length",
  };
}

export function extractUsage(raw, provider = "gemini") {
  if (provider !== "gemini") {
    return { inputTokens: 0, outputTokens: 0 };
  }

  if (raw?.usageMetadata) {
    return {
      inputTokens: raw?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: raw?.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  return {
    inputTokens: raw?.usage?.prompt_tokens ?? 0,
    outputTokens: raw?.usage?.completion_tokens ?? 0,
  };
}