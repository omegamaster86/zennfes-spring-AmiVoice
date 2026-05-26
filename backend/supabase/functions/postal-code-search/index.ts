import { handler } from "../_shared/handler.ts";
import { postalCodeSearchSchema } from "../_shared/schemas/postal-code-search-schema.ts";

type TokenResponse = {
  token?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

type SearchAddressRecord = {
  pref_name?: string | null;
  city_name?: string | null;
  town_name?: string | null;
  block_name?: string | null;
};

type SearchResponse = {
  addresses?: SearchAddressRecord[];
};

/** 相対パス or フル URL を受け取り、常にフル URL を返す */
function resolveUrl(urlOrPath: string, baseUrl: string): string {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    return urlOrPath;
  }
  const base = baseUrl.replace(/\/+$/, "");
  const path = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  return `${base}${path}`;
}

Deno.serve(
  handler(async (_req, ctx) => {
    const { postalCode } = await ctx.validate(postalCodeSearchSchema);

    const clientId = Deno.env.get("JAPANPOST_CLIENT_ID") ?? "";
    const secretKey = Deno.env.get("JAPANPOST_SECRET_KEY") ?? "";
    const tokenUrlRaw = Deno.env.get("JAPANPOST_TOKEN_URL") ?? "";
    const searchBaseUrlRaw = Deno.env.get("JAPANPOST_SEARCH_BASE_URL") ?? "";
    const forwardedFor = Deno.env.get("JAPANPOST_X_FORWARDED_FOR") ?? "";
    const baseUrl = Deno.env.get("JAPANPOST_BASE_URL") ?? "";

    if (
      !clientId ||
      !secretKey ||
      !tokenUrlRaw ||
      !searchBaseUrlRaw ||
      !forwardedFor
    ) {
      return ctx.error(500, "CONFIG_ERROR", "サーバー設定が不正です");
    }

    const tokenUrl = resolveUrl(tokenUrlRaw, baseUrl);
    const searchBaseUrl = resolveUrl(searchBaseUrlRaw, baseUrl);

    // 相対パスが指定されているのに JAPANPOST_BASE_URL が未設定の場合
    if (!tokenUrl.startsWith("http") || !searchBaseUrl.startsWith("http")) {
      return ctx.error(
        500,
        "CONFIG_ERROR",
        "JAPANPOST_BASE_URL が設定されていません",
      );
    }

    const normalizedBase = searchBaseUrl.replace(/\/+$/, "");
    // z.preprocess を経由しているためスキーマ出力の TS 型が広がる場合があり、
    // encodeURIComponent の引数型を満たすため String() で明示的に文字列化する。
    const searchUrl = `${normalizedBase}/${encodeURIComponent(String(postalCode))}`;

    const tokenData = (await ctx.callExternalApi("japanpost-token", tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": forwardedFor,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        secret_key: secretKey,
      }),
    })) as TokenResponse;

    const accessToken = tokenData.token ?? tokenData.access_token ?? "";

    if (!accessToken) {
      return ctx.error(502, "UPSTREAM_ERROR", "トークン取得に失敗しました");
    }

    const searchData = (await ctx.callExternalApi(
      "japanpost-address-search",
      searchUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    )) as SearchResponse;

    const first = searchData.addresses?.[0];

    if (!first) {
      return ctx.error(404, "NOT_FOUND", "住所が見つかりませんでした");
    }

    const prefecture = first.pref_name ?? "";
    const city = first.city_name ?? "";
    const town = first.town_name ?? "";
    const block = first.block_name ?? "";
    const address = `${town}${block}`;

    return ctx.success({
      prefecture,
      city,
      town,
      block,
      address,
    });
  }),
);
