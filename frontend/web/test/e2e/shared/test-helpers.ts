/**
 * E2Eテスト用ヘルパー
 *
 * テストのログ出力など、Playwrightテストで使用するヘルパー関数
 */

/**
 * テスト開始のログを出力（区切り線付き）
 * @param testName - テスト名
 */
export function logTestStart(testName: string): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🚀 テスト開始: ${testName}`);
  console.log("=".repeat(80));
}

/**
 * テスト終了のログを出力（区切り線付き）
 * @param testName - テスト名
 * @param status - テスト結果のステータス（passed, failed, skipped, timedOut）
 * @param duration - テスト実行時間（ミリ秒）
 */
export function logTestEnd(
  testName: string,
  status: "passed" | "failed" | "skipped" | "timedOut" = "passed",
  duration?: number,
): void {
  console.log("=".repeat(80));

  const durationText = duration !== undefined ? ` (${duration}ms)` : "";

  if (status === "passed") {
    console.log(`✅ テスト成功: ${testName}${durationText}`);
  } else if (status === "failed") {
    console.log(`❌ テスト失敗: ${testName}${durationText}`);
  } else if (status === "skipped") {
    console.log(`⏭️  テストスキップ: ${testName}`);
  } else if (status === "timedOut") {
    console.log(`⏱️  テストタイムアウト: ${testName}${durationText}`);
  }

  console.log(`${"=".repeat(80)}\n`);
}
