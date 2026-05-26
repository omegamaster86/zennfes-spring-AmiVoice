/**
 * 統合テストヘルパー（Supabase Functions & E2E共通）
 *
 * テストデータのセットアップ/クリーンアップやログ出力など、
 * 複数のテストファイルで共通して使用できるヘルパー関数とクラス
 */

import { clearTable, loadTestData } from "@shared/data-loader.ts";

/**
 * テスト開始のログを出力（区切り線付き）
 * @param testName - テスト名
 */
export function logTestStart(testName: string): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`テスト開始: ${testName}`);
  console.log("=".repeat(80));
}

/**
 * テスト終了のログを出力（区切り線付き）
 * @param testName - テスト名
 */
export function logTestEnd(testName: string): void {
  console.log("=".repeat(80));
  console.log(`テスト終了: ${testName}`);
  console.log(`${"=".repeat(80)}\n`);
}

/**
 * テストデータのセットアップとクリーンアップを管理するクラス
 *
 * 使用例:
 * ```typescript
 * const testData = new TestData("m_notice", "./tests/notice-list/data/base.csv");
 * await testData.setup();
 * try {
 *   // テスト実行
 * } finally {
 *   await testData.cleanup();
 * }
 * ```
 */
export class TestData {
  constructor(
    private tableName: string,
    private csvFilePath: string,
    private truncateOnSetup = true,
  ) {}

  /**
   * テストデータをセットアップ
   */
  async setup(): Promise<void> {
    await loadTestData(this.tableName, this.csvFilePath, this.truncateOnSetup);
  }

  /**
   * テストデータをクリーンアップ（テーブルをクリア）
   */
  async cleanup(): Promise<void> {
    await clearTable(this.tableName);
  }
}

// Supabase Functions固有のヘルパー関数は deno-helpers.ts を参照してください
