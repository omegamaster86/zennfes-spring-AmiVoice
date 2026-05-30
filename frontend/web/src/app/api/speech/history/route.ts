import {
  listTranscriptionRecords,
} from "@/features/speech/adapters/transcription-repository";
import { jsonError, toRecordDto } from "@/features/speech/api/response";
import { HistoryQuerySchema } from "@/features/speech/schemas/api-schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = HistoryQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("クエリが不正です", 400);
    }

    const rows = await listTranscriptionRecords(parsed.data);
    return Response.json({
      items: rows.map(toRecordDto),
    });
  } catch (error) {
    console.error("[speech/history]", error);
    return jsonError("履歴の取得に失敗しました", 500);
  }
}
