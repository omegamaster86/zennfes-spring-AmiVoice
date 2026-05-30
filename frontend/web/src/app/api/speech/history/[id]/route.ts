import { getTranscriptionRecordById } from "@/features/speech/adapters/transcription-repository";
import { jsonError, toRecordDto } from "@/features/speech/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = await getTranscriptionRecordById(id);

    if (!record) {
      return jsonError("レコードが見つかりません", 404);
    }

    return Response.json({ record: toRecordDto(record) });
  } catch (error) {
    console.error("[speech/history/id]", error);
    return jsonError("詳細の取得に失敗しました", 500);
  }
}
