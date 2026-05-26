import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
/**
 * Read environment variables from file (optional).
 * CIでは .env.test が存在しないため、ワークフローで設定された環境変数に依存する。
 */
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, ".env.test");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: ".",
  /* E2Eテストファイル(.spec.ts)のみをマッチ */
  testMatch: /.*\.spec\.ts/,
  /* Supabase Functionsのテスト(Deno)を除外 */
  testIgnore: ["**/backend/supabase/functions/**"],
  /* 全テスト実行前にデータベースをリセット */
  globalSetup: "./global-setup.ts",
  /* プロジェクトを順次実行することでDB競合を防ぐ */
  /* ブラウザの違いによるテストなので、順次実行でも実用上問題ない */
  fullyParallel: false,
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
    baseURL: "http://localhost:3000",
    // timezoneId: "UTC", // タイムゾーン固定
  },

  /* Configure projects for major browsers */
  projects: [
    // ブラウザプロジェクト: 順次実行される
    // global-setup.ts により、全テスト実行前に一度だけDBリセットが実行される
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        locale: "ja-JP", // 日本語ロケールを設定
      },
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false, // 環境変数を確実に反映させるため、毎回新しいサーバーを起動
    env: {
      // E2Eテスト用：FIXED_DATEが設定されている場合、サーバーサイドにも渡す
      // テスト実行時に環境変数として設定することで、サーバーサイドの日付もモックされる
      FIXED_DATE: process.env.FIXED_DATE || "2025-10-01T13:00:00Z",
      // Next.js(クライアント)に公開されるSupabaseの接続情報
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    },
  },
});
