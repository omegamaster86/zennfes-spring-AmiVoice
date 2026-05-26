import { handler, ValidationError } from "../_shared/handler.ts";
import {
  MAX_KEYWORD_COUNT,
  MAX_KEYWORD_LENGTH,
  searchTodosQuerySchema,
} from "../_shared/schemas/search-todos-schema.ts";
import {
  buildGroongaQuery,
  tokenizeSearchInput,
} from "../_shared/search-query.ts";

Deno.serve(
  handler(
    async (req, ctx) => {
      const url = new URL(req.url);
      const raw = {
        q: url.searchParams.get("q") ?? "",
        limit: url.searchParams.get("limit") ?? undefined,
        offset: url.searchParams.get("offset") ?? undefined,
      };

      const parsed = searchTodosQuerySchema.safeParse(raw);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(", ");
        throw new ValidationError(msg);
      }
      const { q, limit, offset } = parsed.data;

      // q を空白区切りでトークン化（"…" で囲んだ部分はフレーズ扱い）
      const keywords = tokenizeSearchInput(q);
      if (keywords.length === 0) {
        throw new ValidationError("キーワードを入力してください");
      }
      if (keywords.length > MAX_KEYWORD_COUNT) {
        throw new ValidationError(
          `キーワードは最大${MAX_KEYWORD_COUNT}個までです`,
        );
      }
      const tooLong = keywords.find((k) => k.length > MAX_KEYWORD_LENGTH);
      if (tooLong) {
        throw new ValidationError(
          `各キーワードは${MAX_KEYWORD_LENGTH}文字以内にしてください`,
        );
      }

      // pgroonga 用の AND クエリ（特殊文字エスケープ済み）と、
      // LIKE フォールバック用の生キーワード配列の両方を渡す
      const searchQuery = buildGroongaQuery(keywords);

      const data = await ctx.callRpc("sel_todos_search", {
        p_search_query: searchQuery,
        p_keyword_list: keywords,
        p_limit: limit,
        p_offset: offset,
      });

      return ctx.success(data ?? []);
    },
    { methods: ["GET"] },
  ),
);
