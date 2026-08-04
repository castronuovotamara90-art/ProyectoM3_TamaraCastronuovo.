
export function normalizeAIResponse(raw, provider = "openrouter") {
  if (provider !== "openrouter") {
    return { text: "", truncated: false };
  }

  const choice = raw?.choices?.[0];
  const text = extractText(choice);

  return {
    text,
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

function extractText(choice) {
  const content = choice?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("")
      .trim();

    if (joined) return joined;
  }

  if (typeof choice?.text === "string") {
    return choice.text;
  }

  return "";
}