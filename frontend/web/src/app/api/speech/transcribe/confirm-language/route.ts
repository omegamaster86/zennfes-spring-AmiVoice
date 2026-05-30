import { AmiVoiceError } from "@/features/speech/adapters/amivoice-client";
import { LlmTranslationError } from "@/features/speech/adapters/llm-translator";
import { confirmLanguageAndSave } from "@/features/speech/domain/transcription-pipeline";
import { jsonError, toRecordDto } from "@/features/speech/api/response";
import { ConfirmLanguageSchema } from "@/features/speech/schemas/api-schemas";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = ConfirmLanguageSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("リクエストが不正です", 400);
    }

    const record = await confirmLanguageAndSave({
      recognizedText: parsed.data.recognizedText,
      language: parsed.data.language,
      inputSource: parsed.data.inputSource,
      amivoiceUtteranceId: parsed.data.amivoiceUtteranceId,
      confidence: parsed.data.confidence,
    });

    const dto = toRecordDto(record);
    return Response.json({
      recordId: dto.id,
      finalText: dto.finalText,
      record: dto,
    });
  } catch (error) {
    if (error instanceof AmiVoiceError || error instanceof LlmTranslationError) {
      return jsonError(error.message, 502);
    }
    console.error("[speech/confirm-language]", error);
    return jsonError("保存に失敗しました", 500);
  }
}
