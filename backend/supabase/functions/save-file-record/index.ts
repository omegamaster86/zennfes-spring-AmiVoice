import { handler } from "../_shared/handler.ts";
import {
  type SaveFileRecordResponse,
  saveFileRecordSchema,
} from "../_shared/schemas/save-file-record-schema.ts";

interface RpcRow {
  out_id: string;
  out_bucket: string;
  out_storage_path: string;
  out_file_name: string;
  out_original_name: string;
  out_size_bytes: number;
  out_mime_type: string | null;
  out_url: string;
}

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(saveFileRecordSchema);

    const data = await ctx.callRpc(
      "ins_file_upload",
      {
        p_auth_user_id: ctx.authUserId,
        p_bucket: body.bucket,
        p_storage_path: body.storagePath,
        p_original_name: body.originalName,
        p_size_bytes: body.sizeBytes,
        p_mime_type: body.mimeType ?? null,
        p_url: body.url,
        p_file_name: body.fileName,
        p_created_program: "save-file-record",
      },
      { admin: true },
    );

    const raw = (data as RpcRow[])?.[0];
    if (!raw) {
      return ctx.error(500, "INSERT_FAILED", "レコードの作成に失敗しました");
    }

    const response: SaveFileRecordResponse = {
      id: raw.out_id,
      bucket: raw.out_bucket,
      storagePath: raw.out_storage_path,
      fileName: raw.out_file_name,
      originalName: raw.out_original_name,
      sizeBytes: raw.out_size_bytes,
      mimeType: raw.out_mime_type,
      url: raw.out_url,
    };

    return ctx.success(response, 201);
  }),
);
