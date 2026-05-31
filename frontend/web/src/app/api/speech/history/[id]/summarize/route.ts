import {
  LlmSummarizationError,
  summarizeText,
} from "@/features/speech/adapters/llm-summarizer";
import {
  getTranscriptionRecordById,
  updateTranscriptionSummary,
} from "@/features/speech/adapters/transcription-repository";
import { jsonError } from "@/features/speech/api/response";
import { RecordIdParamsSchema } from "@/features/speech/schemas/api-schemas";

type RouteContext = { params: Promise<{ id: string }> };

function readCachedSummary(
  metadataJson: Record<string, unknown> | null,
): { summary: string; summarizedAt: string | null } | null {
  if (!metadataJson || typeof metadataJson.summary !== "string") {
    return null;
  }

  const summarizedAt =
    typeof metadataJson.summarizedAt === "string"
      ? metadataJson.summarizedAt
      : null;

  return { summary: metadataJson.summary, summarizedAt };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsed = RecordIdParamsSchema.safeParse({ id });

    if (!parsed.success) {
      return jsonError("ID が不正です", 400);
    }

    const record = await getTranscriptionRecordById(parsed.data.id);

    if (!record) {
      return jsonError("レコードが見つかりません", 404);
    }

    const cached = readCachedSummary(record.metadata_json);
    if (cached) {
      return Response.json({
        summary: cached.summary,
        summarizedAt: cached.summarizedAt,
        recordId: record.id,
      });
    }

    const summary = await summarizeText(record.final_text);
    const updated = await updateTranscriptionSummary(record.id, summary);
    const saved = readCachedSummary(updated.metadata_json);

    return Response.json({
      summary,
      summarizedAt: saved?.summarizedAt ?? new Date().toISOString(),
      recordId: updated.id,
    });
  } catch (error) {
    if (error instanceof LlmSummarizationError) {
      return jsonError(error.message, 502);
    }
    console.error("[speech/history/id/summarize]", error);
    return jsonError("要約処理に失敗しました", 500);
  }
}
