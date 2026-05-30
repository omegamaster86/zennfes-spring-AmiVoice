import { AmiVoiceError } from "@/features/speech/adapters/amivoice-client";
import { LlmTranslationError } from "@/features/speech/adapters/llm-translator";
import { runTranscriptionPipeline } from "@/features/speech/domain/transcription-pipeline";
import type { InputSource } from "@/features/speech/domain/types";
import { jsonError, toRecordDto } from "@/features/speech/api/response";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("audio");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("音声ファイルが必要です", 400);
    }

    const inputSourceRaw = form.get("inputSource");
    const inputSource: InputSource =
      inputSourceRaw === "mic" ? "mic" : "file";

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "audio/wav";

    const result = await runTranscriptionPipeline({
      audio: buffer,
      mimeType,
      inputSource,
    });

    if (result.kind === "needs_manual_language") {
      return Response.json({
        needsManualLanguage: true,
        recognizedText: result.recognizedText,
        detectedLanguage: result.detectedLanguage,
        amivoiceUtteranceId: result.utteranceId,
        confidence: result.confidence,
        inputSource: result.inputSource,
      });
    }

    const dto = toRecordDto(result.record);
    return Response.json({
      recordId: dto.id,
      recognizedText: result.recognizedText,
      finalText: result.finalText,
      translationApplied: result.translationApplied,
      createdAt: dto.createdAt,
      record: dto,
    });
  } catch (error) {
    if (error instanceof AmiVoiceError || error instanceof LlmTranslationError) {
      return jsonError(error.message, 502);
    }
    console.error("[speech/transcribe]", error);
    return jsonError("変換処理に失敗しました", 500);
  }
}
