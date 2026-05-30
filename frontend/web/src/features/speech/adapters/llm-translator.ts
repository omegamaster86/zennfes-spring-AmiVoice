export class LlmTranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmTranslationError";
  }
}

export async function translateEnglishToJapanese(text: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl =
    process.env.LLM_API_BASE_URL?.replace(/\/$/, "") ??
    "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new LlmTranslationError("LLM_API_KEY が設定されていません");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You translate English to natural Japanese. Output only the Japanese translation without explanations.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new LlmTranslationError(
      `翻訳 API がエラーを返しました (${response.status})`,
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const translated = json.choices?.[0]?.message?.content?.trim();
  if (!translated) {
    throw new LlmTranslationError("翻訳結果が空です");
  }

  return translated;
}
