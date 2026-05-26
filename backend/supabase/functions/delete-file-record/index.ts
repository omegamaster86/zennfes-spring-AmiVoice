import { handler } from "../_shared/handler.ts";
import {
  type DeleteFileRecordResponse,
  deleteFileRecordSchema,
} from "../_shared/schemas/delete-file-record-schema.ts";

interface RpcRow {
  out_id: string;
  out_bucket: string;
  out_storage_path: string;
  out_original_name: string;
}

Deno.serve(
  handler(async (_req, ctx) => {
    const body = await ctx.validate(deleteFileRecordSchema);

    const data = await ctx.callRpc(
      "del_file_upload",
      {
        p_auth_user_id: ctx.authUserId,
        p_file_id: body.id,
        p_updated_program: "delete-file-record",
      },
      { admin: true },
    );

    const raw = (data as RpcRow[])?.[0];
    if (!raw) {
      return ctx.error(404, "NOT_FOUND", "対象のファイルが見つかりません");
    }

    const response: DeleteFileRecordResponse = {
      id: raw.out_id,
      bucket: raw.out_bucket,
      storagePath: raw.out_storage_path,
      originalName: raw.out_original_name,
    };

    return ctx.success(response);
  }),
);
