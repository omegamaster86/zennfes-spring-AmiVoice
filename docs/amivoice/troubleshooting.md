# Next.js から AmiVoice API を呼ぶと `received illegal service authorization` になる原因と対処

AmiVoice API の同期 HTTP を Next.js の Route Handler（BFF）から `fetch` + `FormData` で呼んだとき、**curl では成功するのにアプリだけ認証エラー**になる、という話です。公式ドキュメントを読み飛ばすと半日溶けやすいポイントなので、原因と対策を整理します。

## この記事でわかること

- `received illegal service authorization` が意味すること
- **multipart のパート順**が原因になりうる理由（`a` は必ず最後）
- curl とアプリの結果が食い違うときの切り分け手順
- Next.js BFF で `502` が返るときの読み方

## 想定読者・環境

- AmiVoice API をサーバー側（BFF）から呼びたい方
- Next.js App Router + `fetch` + `FormData` で `/v1/recognize` に POST している方
- ブラウザ録音（WebM）をそのまま API に渡している構成

本記事のコード例は TypeScript / Node.js 前提です。他言語でも **「マルチパートの最後に音声を置く」** ルールは同じです。

## 症状

AmiVoice から次のような JSON が返ることがあります。

```json
{
  "text": "",
  "code": ":-",
  "message": "received illegal service authorization"
}
```

Next.js で BFF に包んでいる場合は、例えば次のように見えます。

- ターミナル: `POST /api/speech/transcribe 502 in 600ms` 前後
- レスポンス body: `{ "error": "received illegal service authorization" }`

**502 は AmiVoice サーバーそのものではなく、BFF が「外部 API（AmiVoice / LLM）の失敗」として返している** ことが多いです。まず Network タブの `error` 本文を確認してください。

## 切り分け：curl は成功するのにアプリだけ失敗

API キーが本当に有効かは、**アプリを通さず curl で先に確認**するのが早いです。

```bash
export AMIVOICE_API_KEY='ここにマイページのAPIキー'

curl https://acp-api.amivoice.com/v1/nolog/recognize \
  -F "u=${AMIVOICE_API_KEY}" \
  -F "d=-a-general" \
  -F "a=@./test.wav"
```

| curl の結果 | 次に疑う場所 |
|-------------|----------------|
| `code` が空で `text` に認識文 | キーは有効 → **アプリのリクエスト組み立て** |
| 同じ `illegal service authorization` | キー・アカウント（本登録・IP 制限など） |
| `curl: (26) Failed to open/read local data` | `@` のパスが存在しない（AmiVoice 未到達） |

:::message alert
`@/path/to/test.wav` のような**存在しないパス**を指定すると `(26)` で止まります。認証エラーとは別問題です。
:::

## 原因① multipart の順序（いちばん見落としがち）

[同期 HTTP インタフェース](https://docs.amivoice.com/amivoice-api/manual/sync-http-interface) には、次の注意があります。

> **`a` パラメータの後に設定されたパラメータは無視されます。**

公式例の正しい順序は **`u`（認証）→ `d`（エンジン）→ `a`（音声）** です。

```bash
# ✅ 正しい例（a が最後）
curl ... -F u={APIキー} -F d=-a-general -F a=@test.wav
```

### 認証エラーになる並び

`a` の**後**に `u` を付けると、認証パラメータが無視され、次のエラーになります。

```bash
# ❌ u が a より後 → illegal service authorization
curl ... -F d=-a-general -F a=@test.wav -F u={APIキー}
```

### 修正前のコード例（問題あり）

BFF から AmiVoice を呼ぶ処理で、次のように **`a` のあとに `d` を付けている** と、`d` は無視されます。環境によっては認証まわりも意図どおり効かず、先のエラーになります。

```typescript
const form = new FormData();
form.append("u", apiKey);
form.append("a", blob, "audio.webm");
form.append("d", "-a-general"); // ❌ a より後

const response = await fetch("https://acp-api.amivoice.com/v1/recognize", {
  method: "POST",
  body: form,
});
```

### 修正後のコード例

**`a` を最後に append** します。キーは `.trim()` しておくと `.env` の改行混入を防げます。

```typescript
const apiKey = process.env.AMIVOICE_API_KEY?.trim();
if (!apiKey) {
  throw new Error("AMIVOICE_API_KEY が設定されていません");
}

const engine = "-a-general";
const blob = new Blob([new Uint8Array(audioBuffer)], {
  type: mimeType, // 例: audio/webm
});

const form = new FormData();
form.append("u", apiKey);
form.append("d", engine);
form.append("a", blob, "audio.webm"); // ✅ 必ず最後

const response = await fetch("https://acp-api.amivoice.com/v1/recognize", {
  method: "POST",
  body: form,
});
```

レスポンスの `code` が空でないときは、AmiVoice 側のメッセージをそのままエラーにします。

```typescript
const body = (await response.json()) as {
  text?: string;
  code?: string;
  message?: string;
};

if (body.code && body.code !== "") {
  throw new Error(body.message?.trim() ?? "AmiVoice API で認識に失敗しました");
}
```

ファイル名は MIME に合わせておくと無難です（WebM 録音なら `audio.webm` など）。

```typescript
function filenameForMime(mimeType: string): string {
  if (mimeType.includes("webm")) return "audio.webm";
  if (mimeType.includes("wav")) return "audio.wav";
  return "audio.bin";
}
```

Python の `requests` で `files={}` 辞書を使うと順序が崩れる、という報告もあります（[参考記事（Zenn）](https://zenn.dev/gen99/articles/c7c39ce8e2fc98)）。**順序が保証される API** を使うか、明示的に並べてください。

## 原因② API キーそのものが不正

multipart が正しくても、キーが違えば同じメッセージになります。

| よくあるミス | 補足 |
|--------------|------|
| ログインパスワードを入れた | マイページの **API キー** が必要 |
| サービス ID / サービスパスワードを入れた | 発行 API 用。認識 API の `u` には使わない |
| 一時キーの期限切れ | `issue_service_authorization` のデフォルトは **30 秒** |
| IP 制限付きキー | ローカル開発 PC の IP が範囲外 |
| `.env` 変更後に再起動していない | Next.js は起動時に env を読む |

キーは [マイページ上で発行](https://docs.amivoice.com/amivoice-api/manual/issue-api-key-on-mypage)します。クーポン入力と API キー発行は**別手順**です。

```env
# NEXT_PUBLIC_ は付けない（ブラウザに漏れる）
AMIVOICE_API_KEY=マイページで発行したAPIキー
```

## 原因③ Next.js BFF の 502 の読み方

BFF で AmiVoice / LLM のエラーを `502` にマッピングしている場合、ログの `502` だけでは原因が特定できません。

| HTTP | 典型原因 |
|------|----------|
| 502 | AmiVoice 認識失敗、LLM 翻訳失敗 |
| 500 | DB 保存など BFF 内のその他例外 |
| 400 | 音声ファイル未送信 |

Route Handler では、専用エラーを `502`、それ以外を `500` に分ける形がよくあります。

```typescript
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "音声ファイルが必要です" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "audio/wav";

    // 認識パイプライン（内部で recognizeWithAmiVoice → 必要なら翻訳 → DB）
    const result = await runTranscriptionPipeline({ audio: buffer, mimeType });

    return Response.json(result);
  } catch (error) {
    if (error instanceof AmiVoiceError || error instanceof LlmTranslationError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    return Response.json({ error: "変換処理に失敗しました" }, { status: 500 });
  }
}
```

処理の流れの例:

1. AmiVoice 認識
2. （英語と判定されたら）LLM 翻訳
3. DB 保存

英語翻訳まで行く構成では `LLM_API_KEY` 未設定でも 502 になります。日本語のみのテストなら AmiVoice までの失敗に絞れます。

## WebM 録音について

ブラウザの `MediaRecorder` は `audio/webm`（Opus）になりがちです。AmiVoice は **WebM Opus に対応**しています（[音声フォーマット](https://docs.amivoice.com/amivoice-api/manual/audio-format/)、[2025-08 更新](https://docs.amivoice.com/amivoice-api/manual/history)）。

クライアントから BFF へは、録音停止後に `FormData` で送る形が一般的です。

```typescript
const form = new FormData();
form.append("audio", recordedFile); // File（type: audio/webm など）
form.append("inputSource", "mic");

await fetch("/api/speech/transcribe", { method: "POST", body: form });
```

HTTP でヘッダ付きコンテナを AmiVoice に渡す場合、多くのケースで **`c`（フォーマット名）を省略可能**です。認証エラーと混同しやすいのは **`認識結果が空`** で、無音・録音時間が極端に短い場合などに起きます。

## まとめ

| チェック項目 | 内容 |
|--------------|------|
| curl | `u` → `d` → `a` の順で WAV が認識できるか |
| FormData | **`a` を最後**に `append` しているか |
| API キー | マイページの API キーか、期限・IP 制限はないか |
| Next.js | `.env` 変更後に dev サーバーを再起動したか |
| 502 | レスポンス JSON の `error` 本文を読んだか |

**curl で通ってアプリだけ落ちる**ときは、キーより **multipart の順序** を疑うと早いです。

## 参考リンク

- [同期 HTTP インタフェース](https://docs.amivoice.com/amivoice-api/manual/sync-http-interface)
- [マイページ上で API キーを発行](https://docs.amivoice.com/amivoice-api/manual/issue-api-key-on-mypage)
- [API キー発行 API（一時キー・期限）](https://docs.amivoice.com/amivoice-api/manual/issue-api-key-with-api/)
- [音声フォーマット](https://docs.amivoice.com/amivoice-api/manual/audio-format/)
- [AmiVoice API トラブルシューティング（公式）](https://docs.amivoice.com/amivoice-api/manual/troubleshooting/)
