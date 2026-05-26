"use server";

import { ActionError, handler } from "@/services/handler";
import { createLogger } from "@/services/logger";
import { callEdgeFunction } from "@/services/supabase/edge-function";
import { createClient } from "@/services/supabase/server";
import type { FileUploadApi } from "@/types";
import { FileUploadDeleteSchema, FileUploadSchema } from "@/types";

const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 日

export type UploadedFileInfo = {
  id: string;
  bucket: string;
  name: string;
  path: string;
  url: string;
  size: number;
};

export type UploadFileResult =
  | { success: true; file: UploadedFileInfo }
  | { success: false; error: string };

export type DeleteFileResult =
  | { success: true }
  | { success: false; error: string };

/**
 * ファイルを Supabase Storage にアップロードし、DB に履歴を記録する
 *
 * 1. Storage にファイルをアップロード（直接）
 * 2. Edge Function でアップロード履歴を DB に保存
 * 3. Storage 成功 → DB 失敗時は Storage からロールバック
 */
export async function uploadFileToStorage(
  formData: FormData,
): Promise<UploadFileResult> {
  return handler(
    "uploadFileToStorage",
    async (logger): Promise<UploadFileResult> => {
      const file = formData.get("file") as File | null;
      const bucket = formData.get("bucket") as string | null;
      const storagePath = (formData.get("storagePath") as string | null) ?? "";

      if (!file || !bucket) {
        throw new ActionError("ファイルまたはバケット名が指定されていません");
      }

      const supabase = await createClient();

      // 認証ユーザーID取得（Storage RLS でフォルダ制御に使用）
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        logger.error(userError, { context: "authentication" });
        throw new ActionError("認証に失敗しました");
      }

      // Step 1: Storage にアップロード
      // パス規約: {auth.uid()}/{storagePath}/{fileName}
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileName = `${timestamp}_${randomStr}${ext ? `.${ext}` : ""}`;
      const userDir = user.id;
      const subPath = storagePath ? `${storagePath}/${fileName}` : fileName;
      const fullPath = `${userDir}/${subPath}`;

      logger.info("storage_upload_start", {
        bucket,
        path: fullPath,
        size: file.size,
        originalName: file.name,
      });

      const { data: storageData, error: storageError } = await supabase.storage
        .from(bucket)
        .upload(fullPath, file, { cacheControl: "3600", upsert: false });

      if (storageError) {
        logger.error(storageError, { context: "storage_upload" });
        throw new ActionError(storageError.message);
      }

      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from(bucket)
          .createSignedUrl(storageData.path, SIGNED_URL_EXPIRY);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        logger.error(signedUrlError, { context: "signed_url" });
        throw new ActionError("署名付きURLの生成に失敗しました");
      }

      logger.info("storage_upload_complete", { path: storageData.path });

      // Step 2: Edge Function で DB に履歴を保存
      let record: FileUploadApi;
      try {
        record = await callEdgeFunction("save-file-record", FileUploadSchema, {
          method: "POST",
          body: {
            bucket,
            storagePath: storageData.path,
            fileName,
            originalName: file.name,
            sizeBytes: file.size,
            mimeType: file.type || null,
            url: signedUrlData.signedUrl,
          },
          logger,
        });
      } catch (error) {
        // DB 保存失敗時は Storage からロールバック
        logger.warn("db_save_failed_rollback_storage", {
          path: storageData.path,
        });
        await supabase.storage.from(bucket).remove([storageData.path]);
        throw error;
      }

      return {
        success: true,
        file: {
          id: record.id,
          bucket,
          name: file.name,
          path: record.storagePath,
          url: record.url,
          size: file.size,
        },
      };
    },
    {
      startMeta: {
        bucket: formData.get("bucket"),
        originalName: (formData.get("file") as File | null)?.name,
      },
      onError: (error): UploadFileResult => ({
        success: false,
        error:
          error instanceof ActionError
            ? error.message
            : "予期しないエラーが発生しました",
      }),
    },
  );
}

/**
 * ファイルを DB から論理削除し、Storage からも物理削除する
 *
 * 1. Edge Function で DB レコードを論理削除（bucket, storagePath を取得）
 * 2. Storage からファイルを物理削除
 */
export async function deleteFileFromStorage(
  fileId: string,
): Promise<DeleteFileResult> {
  return handler(
    "deleteFileFromStorage",
    async (logger): Promise<DeleteFileResult> => {
      // Step 1: Edge Function で DB レコードを論理削除
      const deleted = await callEdgeFunction(
        "delete-file-record",
        FileUploadDeleteSchema,
        {
          method: "POST",
          body: { id: fileId },
          logger,
        },
      );

      // Step 2: Storage からファイルを物理削除
      const supabase = await createClient();

      logger.info("storage_delete_start", {
        bucket: deleted.bucket,
        path: deleted.storagePath,
      });

      const { error: storageError } = await supabase.storage
        .from(deleted.bucket)
        .remove([deleted.storagePath]);

      if (storageError) {
        logger.warn("storage_delete_failed", {
          error: storageError.message,
          path: deleted.storagePath,
        });
      }

      return { success: true };
    },
    {
      startMeta: { fileId },
      onError: (error): DeleteFileResult => ({
        success: false,
        error:
          error instanceof ActionError
            ? error.message
            : "予期しないエラーが発生しました",
      }),
    },
  );
}

/**
 * アップロード済みファイルの署名付き URL を一括再生成する
 *
 * DB に保存された URL は有効期限があるため、
 * ページロード時やファイル一覧取得時にこの関数で URL をリフレッシュする
 */
export async function refreshSignedUrls(
  files: UploadedFileInfo[],
): Promise<UploadedFileInfo[]> {
  if (files.length === 0) return files;

  const logger = createLogger("refreshSignedUrls");
  logger.start({ fileCount: files.length });

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.error(userError, { context: "authentication" });
    logger.end({ success: false, errorMessage: "認証に失敗しました" });
    return files;
  }

  const bucketGroups = new Map<string, UploadedFileInfo[]>();
  for (const file of files) {
    const group = bucketGroups.get(file.bucket) ?? [];
    group.push(file);
    bucketGroups.set(file.bucket, group);
  }

  const refreshed = new Map<string, string>();

  for (const [bucket, group] of bucketGroups) {
    const paths = group.map((f) => f.path);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, SIGNED_URL_EXPIRY);

    if (error) {
      logger.warn("signed_urls_refresh_failed", {
        bucket,
        error: error.message,
      });
      continue;
    }

    for (const item of data) {
      if (item.signedUrl && item.path) {
        refreshed.set(`${bucket}:${item.path}`, item.signedUrl);
      }
    }
  }

  const result = files.map((file) => {
    const newUrl = refreshed.get(`${file.bucket}:${file.path}`);
    return newUrl ? { ...file, url: newUrl } : file;
  });

  logger.info("refresh_completed", { refreshedCount: refreshed.size });
  logger.end({ success: true });
  return result;
}
