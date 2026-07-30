
export function normalizeAIResponse(raw, provider = "openrouter") {
  if (provider !== "openrouter") {
    return { text: "", truncated: false };
  }

  const choice = raw?.choices?.[0];

  return {
    text: choice?.message?.content ?? "",
    truncated: choice?.finish_reason === "length",
  };
}

export function extractUsage(raw, provider = "openrouter") {
  if (provider !== "openrouter") {
    return { inputTokens: 0, outputTokens: 0 };
  }

  return {
    inputTokens: raw?.usage?.prompt_tokens ?? 0,
    outputTokens: raw?.usage?.completion_tokens ?? 0,
  };
}