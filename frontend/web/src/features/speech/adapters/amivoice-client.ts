import type { AmiVoiceRecognitionResult } from "../domain/types";

const AMIVOICE_RECOGNIZE_URL =
  "https://acp-api.amivoice.com/v1/recognize";

type AmiVoiceJson = {
  text?: string;
  utteranceid?: string;
  code?: string;
  message?: string;
  results?: Array<{ confidence?: number }>;
};

export class AmiVoiceError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "AmiVoiceError";
  }
}

export async function recognizeWithAmiVoice(
  audio: Buffer,
  mimeType: string,
  options?: { engine?: string },
): Promise<AmiVoiceRecognitionResult> {
  const apiKey = process.env.AMIVOICE_API_KEY;
  if (!apiKey) {
    throw new AmiVoiceError("AMIVOICE_API_KEY が設定されていません");
  }

  const form = new FormData();
  form.append("u", apiKey);
  const blob = new Blob([new Uint8Array(audio)], { type: mimeType });
  form.append("a", blob, "audio");
  form.append("d", options?.engine ?? "-a-general");

  const response = await fetch(AMIVOICE_RECOGNIZE_URL, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new AmiVoiceError(
      `AmiVoice API がエラーを返しました (${response.status})`,
    );
  }

  const body = (await response.json()) as AmiVoiceJson;

  if (body.code && body.code !== "") {
    throw new AmiVoiceError(
      body.message?.trim() || "AmiVoice API で認識に失敗しました",
      body.code,
    );
  }

  const recognizedText = body.text?.trim() ?? "";
  if (!recognizedText) {
    throw new AmiVoiceError("認識結果が空です");
  }

  const confidence = body.results?.[0]?.confidence ?? null;

  return {
    recognizedText,
    utteranceId: body.utteranceid ?? null,
    confidence,
  };
}
