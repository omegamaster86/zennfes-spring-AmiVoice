// ========================================
// 全文検索 (pgroonga) 用クエリ構築ヘルパー
//
// pgroonga の `&@~` 演算子は Groonga クエリ構文を使用するため、
// ユーザー入力の特殊文字をエスケープしないとクエリ構文エラーが発生する。
// このモジュールは以下の役割を担う:
//   1. 検索文字列をキーワード配列にトークン化（"…" で囲んだ部分はフレーズ扱い）
//   2. Groonga 特殊文字のエスケープ
//   3. キーワード配列を AND クエリ文字列に変換
// ========================================

/**
 * Groonga クエリ構文の特殊文字をエスケープする
 *
 * `"`, `(`, `)`, `\`, `+`, `-`, `>`, `<`, `~`, `*`, `:` を `\` でエスケープする。
 * これらをエスケープしないと、検索キーワードに含まれた場合に構文パースエラーが発生する。
 *
 * @param keyword エスケープ対象のキーワード
 * @returns エスケープ済みのキーワード
 */
export function escapeGroongaSpecialChars(keyword: string): string {
  return keyword.replace(/(["()\\+\-><~*:])/g, "\\$1");
}

/**
 * 検索文字列をキーワード配列にトークン化する
 *
 * - 空白で区切られた各トークンを 1 キーワードとして抽出する
 * - `"…"` で囲まれた部分は空白を含めて 1 キーワードとして扱う（フレーズ検索）
 * - 空文字や空白のみのトークンは除外する
 *
 * @example
 *   tokenizeSearchInput('北海道 札幌 "Next js"')
 *   // => ["北海道", "札幌", "Next js"]
 *
 * @param input 検索文字列
 * @returns キーワード配列
 */
export function tokenizeSearchInput(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let match: RegExpExecArray | null = re.exec(input);
  while (match !== null) {
    const token = (match[1] ?? match[2] ?? "").trim();
    if (token.length > 0) {
      tokens.push(token);
    }
    match = re.exec(input);
  }
  return tokens;
}

/**
 * キーワード配列を Groonga クエリ構文の AND 検索文字列に変換する
 *
 * - 各キーワードを {@link escapeGroongaSpecialChars} でエスケープ
 * - 空白を含むキーワードはダブルクォートで囲んでフレーズ扱いにする
 * - 空白で連結（Groonga ではスペース区切りは AND 検索）
 *
 * @example
 *   buildGroongaQuery(["北海道", "札幌", "Next js"])
 *   // => '北海道 札幌 "Next js"'
 *
 * @param keywords キーワード配列
 * @returns Groonga クエリ文字列（キーワードが 1 つも無い場合は空文字）
 */
export function buildGroongaQuery(keywords: string[]): string {
  return keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .map((k) => {
      const escaped = escapeGroongaSpecialChars(k);
      return k.includes(" ") ? `"${escaped}"` : escaped;
    })
    .join(" ");
}
