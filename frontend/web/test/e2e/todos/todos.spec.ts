import { expect, test } from "@playwright/test";
import { freezeTime } from "../shared/freezeTime";
import { logTestEnd, logTestStart } from "../shared/test-helpers";
import {
  buildLongString,
  cleanupTestTodos,
  countTestTodos,
  createBasicTodos,
  createPriorityTestTodos,
  createStatusTestTodos,
  createTestTodos,
} from "../shared/todo-helpers";
import {
  cleanupE2ETestUser,
  createE2ETestUser,
  type E2ETestUser,
} from "../shared/user-helpers";

/**
 * ToDo 機能の E2E テスト
 *
 * テスト観点（test-perspectives 準拠）:
 * - 正常系 / 異常系 / 境界値 / 重要分岐（権限・遷移・二重送信）
 * - 10 切り口: 入力検証 / ビジネスルール / 状態遷移 / 権限・所有 /
 *              エラー設計 / 時間 / 冪等性・二重送信 / データ整合 /
 *              契約 / リソース制約
 *
 * 現状の実装（Tailwind v4 + shadcn）に合わせて、
 * 色（bg-muted / text-muted-foreground）は CSS 変数経由のため
 * ハードコード色は priority 系（red/yellow/green）と
 * status 系（blue/green/red）の **明示色のみ** 検証する。
 */

// ===========================================================================
// ToDo 一覧ページ
// ===========================================================================
test.describe("ToDo一覧ページ", () => {
  let testUser: E2ETestUser;

  test.beforeAll(async () => {
    console.log("\n🔧 [SETUP] テストユーザーを作成中...");
    testUser = await createE2ETestUser(
      "e2e-todos-list@example.com",
      "TestPass1@",
      "user",
    );
    console.log(`✅ [SETUP] テストユーザー作成完了: ${testUser.email}\n`);
  });

  test.afterAll(async () => {
    if (testUser) {
      console.log("\n🧹 [CLEANUP] テストユーザーを削除中...");
      await cleanupE2ETestUser(testUser);
      console.log("✅ [CLEANUP] テストユーザー削除完了\n");
    }
  });

  test.beforeEach(async ({ context, page }, testInfo) => {
    logTestStart(testInfo.title);

    await freezeTime(context, process.env.FIXED_DATE ?? "2025-10-01T13:00:00Z");

    await page.goto("/login");
    await page.waitForSelector("input#email", { timeout: 10000 });
    await page.fill("input#email", testUser.email);
    await page.fill("input#password", testUser.password);
    await page.click("button[type='submit']");
    await page.waitForURL("**/todos", { timeout: 30000 });
  });

  test.afterEach(async ({ page: _page }, testInfo) => {
    const status =
      testInfo.status === "interrupted" ? "failed" : testInfo.status;
    logTestEnd(testInfo.title, status, testInfo.duration);
  });

  test("【一覧表示】ページタイトルと説明が表示される", async ({ page }) => {
    await page.goto("/todos");

    const pageTitle = page.locator("main h2.text-2xl.font-bold").first();
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toHaveText("ToDo");

    const pageDescription = page
      .locator("main p.text-sm.text-muted-foreground")
      .first();
    await expect(pageDescription).toBeVisible();
    await expect(pageDescription).toHaveText("あなたのToDo一覧を管理します。");
  });

  test("【一覧表示】登録された全てのToDoがORDER BY通りに表示される", async ({
    page,
  }) => {
    // Arrange: 既存データをクリアしてから 5 件投入
    await cleanupTestTodos(testUser.mUserId);
    await createBasicTodos(testUser.mUserId);

    // Act
    await page.goto("/todos");

    // Assert: 件数表示
    const header = page.locator("h3.text-lg.font-semibold");
    await expect(header).toHaveText("ToDoリスト (5件)");

    const todoItems = page.locator("div.p-6.transition-colors");
    await expect(todoItems).toHaveCount(5);

    // ORDER BY:
    //  1. status: in_progress(1) → pending(2) → completed(3) → ELSE(4)
    //  2. priority: high(1) → medium(2) → low(3) → ELSE(4)
    //  3. due_date ASC NULLS LAST
    //  4. created_at DESC
    const expected = [
      {
        title: "バグ修正",
        description: "ログイン画面の不具合を修正する",
        status: "進行中",
        priority: "高",
      },
      {
        title: "ミーティング資料の準備",
        description: "来週の定例会議用の資料を準備する",
        status: "進行中",
        priority: "中",
      },
      {
        title: "週報を作成する",
        description: "先週の活動をまとめて週報を作成",
        status: "未着手",
        priority: "高",
      },
      {
        title: "環境構築ドキュメント更新",
        description: "新しい開発環境のセットアップ手順を文書化",
        status: "未着手",
        priority: "中",
      },
      {
        title: "コードレビュー",
        description: "プルリクエストのレビューを実施",
        status: "完了",
        priority: "低",
      },
    ];

    for (let i = 0; i < expected.length; i++) {
      const todo = todoItems.nth(i);
      const titleElement = todo.locator("h4.text-base.font-medium");
      await expect(titleElement).toHaveText(expected[i].title);

      const descriptionElement = todo.locator(
        "p.text-sm.text-muted-foreground",
      );
      await expect(descriptionElement).toHaveText(expected[i].description);

      // ステータス（1 つ目のバッジ）
      const statusBadge = todo.locator("span.inline-flex.rounded-full").first();
      await expect(statusBadge).toHaveText(expected[i].status);

      // 優先度（2 つ目のバッジ）
      const priorityBadge = todo
        .locator("span.inline-flex.rounded-full")
        .nth(1);
      await expect(priorityBadge).toHaveText(`優先度: ${expected[i].priority}`);
    }
  });

  test("【空状態】データがない時に空状態メッセージと0件表示される", async ({
    page,
  }) => {
    await cleanupTestTodos(testUser.mUserId);

    await page.goto("/todos");

    const todoItems = page.locator("div.p-6.transition-colors");
    await expect(todoItems).toHaveCount(0);

    const header = page.locator("h3.text-lg.font-semibold");
    await expect(header).toHaveText("ToDoリスト (0件)");

    const emptyMessage = page.locator(
      "div.p-6.text-center.text-muted-foreground",
    );
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toHaveText(
      "ToDoがありません。新しいToDoを作成してください。",
    );
  });

  test("【バッジ】優先度別のバッジ色が正しく表示される（高=赤/中=黄/低=緑）", async ({
    page,
  }) => {
    await cleanupTestTodos(testUser.mUserId);
    await createPriorityTestTodos(testUser.mUserId);

    await page.goto("/todos");

    const todoItems = page.locator("div.p-6.transition-colors");
    await expect(todoItems).toHaveCount(3);

    // 高（赤）
    const high = todoItems
      .nth(0)
      .locator("span.inline-flex.rounded-full")
      .nth(1);
    await expect(high).toHaveText("優先度: 高");
    await expect(high).toHaveClass(/bg-red-100/);
    await expect(high).toHaveClass(/text-red-800/);

    // 中（黄）
    const medium = todoItems
      .nth(1)
      .locator("span.inline-flex.rounded-full")
      .nth(1);
    await expect(medium).toHaveText("優先度: 中");
    await expect(medium).toHaveClass(/bg-yellow-100/);
    await expect(medium).toHaveClass(/text-yellow-800/);

    // 低（緑）
    const low = todoItems
      .nth(2)
      .locator("span.inline-flex.rounded-full")
      .nth(1);
    await expect(low).toHaveText("優先度: 低");
    await expect(low).toHaveClass(/bg-green-100/);
    await expect(low).toHaveClass(/text-green-800/);
  });

  test("【バッジ】ステータス別のバッジが正しく表示される（in_progress=青/pending=muted/completed=緑/cancelled=赤）", async ({
    page,
  }) => {
    await cleanupTestTodos(testUser.mUserId);
    await createStatusTestTodos(testUser.mUserId);

    await page.goto("/todos");

    const todoItems = page.locator("div.p-6.transition-colors");
    await expect(todoItems).toHaveCount(4);

    // 1: 進行中（青）
    const inProgress = todoItems
      .nth(0)
      .locator("span.inline-flex.rounded-full")
      .first();
    await expect(inProgress).toHaveText("進行中");
    await expect(inProgress).toHaveClass(/bg-blue-100/);
    await expect(inProgress).toHaveClass(/text-blue-800/);

    // 2: 未着手（muted: Tailwind v4 + shadcn の CSS 変数経由のため、
    //    クラス名 bg-muted / text-muted-foreground を検証）
    const pending = todoItems
      .nth(1)
      .locator("span.inline-flex.rounded-full")
      .first();
    await expect(pending).toHaveText("未着手");
    await expect(pending).toHaveClass(/bg-muted/);
    await expect(pending).toHaveClass(/text-muted-foreground/);

    // 3: 完了（緑）
    const completed = todoItems
      .nth(2)
      .locator("span.inline-flex.rounded-full")
      .first();
    await expect(completed).toHaveText("完了");
    await expect(completed).toHaveClass(/bg-green-100/);
    await expect(completed).toHaveClass(/text-green-800/);

    // 4: キャンセル（赤）
    const cancelled = todoItems
      .nth(3)
      .locator("span.inline-flex.rounded-full")
      .first();
    await expect(cancelled).toHaveText("キャンセル");
    await expect(cancelled).toHaveClass(/bg-red-100/);
    await expect(cancelled).toHaveClass(/text-red-800/);
  });

  test("【並び順】同ステータス・同優先度では due_date 昇順、NULLS LAST", async ({
    page,
  }) => {
    // Arrange: 全 pending / high で due_date のみ違う 3 件 + NULL 1 件
    await cleanupTestTodos(testUser.mUserId);
    await createTestTodos(
      [
        {
          title: "due_dateなし",
          status: "pending",
          priority: "high",
          due_date: null,
        },
        {
          title: "due_date_2025-10-05",
          status: "pending",
          priority: "high",
          due_date: "2025-10-05T09:00:00Z",
        },
        {
          title: "due_date_2025-10-10",
          status: "pending",
          priority: "high",
          due_date: "2025-10-10T09:00:00Z",
        },
        {
          title: "due_date_2025-10-03",
          status: "pending",
          priority: "high",
          due_date: "2025-10-03T09:00:00Z",
        },
      ],
      testUser.mUserId,
    );

    // Act
    await page.goto("/todos");

    // Assert: due_date 昇順 → 最後に NULL
    const todoItems = page.locator("div.p-6.transition-colors");
    await expect(todoItems).toHaveCount(4);

    const titles = await todoItems
      .locator("h4.text-base.font-medium")
      .allTextContents();
    expect(titles).toEqual([
      "due_date_2025-10-03",
      "due_date_2025-10-05",
      "due_date_2025-10-10",
      "due_dateなし",
    ]);
  });

  test("【遷移】「新しいToDoを作成」ボタンで /todos/new に遷移する", async ({
    page,
  }) => {
    await page.goto("/todos");

    const createButton = page.locator('a[href="/todos/new"]');
    await expect(createButton).toBeVisible();
    await expect(createButton).toHaveText("新しいToDoを作成");

    await createButton.click();
    await page.waitForURL("**/todos/new", { timeout: 10000 });
    expect(page.url()).toContain("/todos/new");
  });

  test("【権限・所有】他ユーザーのToDoは一覧に表示されない", async ({
    page,
  }) => {
    // Arrange: 別ユーザーを作って 5 件投入。本ユーザーは 0 件に。
    const otherUser = await createE2ETestUser(
      "e2e-todos-other@example.com",
      "TestPass1@",
      "user",
    );
    try {
      await cleanupTestTodos(testUser.mUserId);
      await createBasicTodos(otherUser.mUserId);

      // 念のため DB 件数を確認（前提）
      expect(await countTestTodos(otherUser.mUserId)).toBe(5);
      expect(await countTestTodos(testUser.mUserId)).toBe(0);

      // Act
      await page.goto("/todos");

      // Assert: 本ユーザーには 0 件のみが見える
      const todoItems = page.locator("div.p-6.transition-colors");
      await expect(todoItems).toHaveCount(0);

      const header = page.locator("h3.text-lg.font-semibold");
      await expect(header).toHaveText("ToDoリスト (0件)");
    } finally {
      await cleanupTestTodos(otherUser.mUserId);
      await cleanupE2ETestUser(otherUser);
    }
  });

  test("【権限】未認証で /todos にアクセスすると /login にリダイレクトされる", async ({
    browser,
  }) => {
    // 認証クッキーを持たない新規 context で確認
    const ctx = await browser.newContext({ baseURL: "http://localhost:3000" });
    try {
      const page = await ctx.newPage();
      await page.goto("/todos");
      await page.waitForURL(/\/login(\?|$)/, { timeout: 10000 });
      expect(page.url()).toContain("/login");
      expect(page.url()).toContain("redirectedFrom=%2Ftodos");
    } finally {
      await ctx.close();
    }
  });
});

// ===========================================================================
// ToDo 新規作成ページ
// ===========================================================================
test.describe("ToDo新規作成ページ", () => {
  let testUser: E2ETestUser;

  test.beforeAll(async () => {
    console.log("\n🔧 [SETUP] テストユーザーを作成中...");
    testUser = await createE2ETestUser(
      "e2e-todos-new@example.com",
      "TestPass1@",
      "user",
    );
    console.log(`✅ [SETUP] テストユーザー作成完了: ${testUser.email}\n`);
  });

  test.afterAll(async () => {
    if (testUser) {
      console.log("\n🧹 [CLEANUP] テストユーザーを削除中...");
      await cleanupE2ETestUser(testUser);
      console.log("✅ [CLEANUP] テストユーザー削除完了\n");
    }
  });

  test.beforeEach(async ({ context, page }, testInfo) => {
    logTestStart(testInfo.title);

    await freezeTime(context, process.env.FIXED_DATE ?? "2025-10-01T13:00:00Z");

    // ログインしてから各テストへ
    await page.goto("/login");
    await page.waitForSelector("input#email", { timeout: 10000 });
    await page.fill("input#email", testUser.email);
    await page.fill("input#password", testUser.password);
    await page.click("button[type='submit']");
    await page.waitForURL("**/todos", { timeout: 30000 });

    // 各テストはクリーンな状態から開始
    await cleanupTestTodos(testUser.mUserId);
  });

  test.afterEach(async ({ page: _page }, testInfo) => {
    const status =
      testInfo.status === "interrupted" ? "failed" : testInfo.status;
    logTestEnd(testInfo.title, status, testInfo.duration);
  });

  test("【表示】新規作成フォームの全要素が正しく表示される", async ({
    page,
  }) => {
    await page.goto("/todos/new");

    // ページタイトル / 説明（dashboard layout の h2/p と区別するため main 内に限定）
    const pageTitle = page.locator("main h2.text-2xl.font-bold").first();
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toHaveText("新しいToDoを作成");

    const pageDescription = page
      .locator("main p.mt-1.text-sm.text-muted-foreground")
      .first();
    await expect(pageDescription).toBeVisible();
    await expect(pageDescription).toHaveText(
      "必要な情報を入力して新しいToDoを作成できます。",
    );

    // フォーム
    await expect(page.locator("form")).toBeVisible();

    // タイトル入力
    const titleLabel = page.locator("label[for='title']");
    await expect(titleLabel).toBeVisible();
    await expect(titleLabel).toHaveText(/タイトル/);
    const titleInput = page.locator("input#title");
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveAttribute(
      "placeholder",
      "例：週報を作成する",
    );

    // 説明入力
    const descriptionLabel = page.locator("label[for='description']");
    await expect(descriptionLabel).toBeVisible();
    await expect(descriptionLabel).toHaveText("説明（任意）");
    const descriptionTextarea = page.locator("textarea#description");
    await expect(descriptionTextarea).toBeVisible();
    await expect(descriptionTextarea).toHaveAttribute(
      "placeholder",
      "ToDoの詳細を入力...",
    );

    // 優先度
    const priorityLabel = page.locator("label[for='priority']");
    await expect(priorityLabel).toBeVisible();
    await expect(priorityLabel).toHaveText("優先度");

    // キャンセル / 作成ボタン
    const cancelButton = page
      .locator("button[type='button']")
      .filter({ hasText: "キャンセル" });
    await expect(cancelButton).toBeVisible();
    const submitButton = page.locator("button[type='submit']");
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText("ToDoを作成");
  });

  test("【表示】優先度のデフォルトが「中」になっている", async ({ page }) => {
    await page.goto("/todos/new");

    // SelectTrigger（id="priority"）に「中」が表示される
    const priorityTrigger = page.locator("#priority");
    await expect(priorityTrigger).toBeVisible();
    await expect(priorityTrigger).toContainText("中");

    // hidden input にもデフォルト "medium" が設定されている
    const hiddenPriority = page.locator(
      "input[type='hidden'][name='priority']",
    );
    await expect(hiddenPriority).toHaveValue("medium");
  });

  test("【正常系】タイトルのみで作成すると一覧に1件表示される（デフォルト優先度=中）", async ({
    page,
  }) => {
    await page.goto("/todos/new");

    await page.fill("input#title", "最小入力テスト");
    await page.click("button[type='submit']");

    await page.waitForURL("**/todos", { timeout: 10000 });

    const todoItems = page.locator("div.p-6.transition-colors");
    await expect(todoItems).toHaveCount(1);

    const first = todoItems.first();
    await expect(first.locator("h4.text-base.font-medium")).toHaveText(
      "最小入力テスト",
    );
    await expect(
      first.locator("span.inline-flex.rounded-full").first(),
    ).toHaveText("未着手"); // 初期 status: pending
    await expect(
      first.locator("span.inline-flex.rounded-full").nth(1),
    ).toHaveText("優先度: 中");
  });

  test("【正常系】タイトル+説明+優先度（高）で作成すると全て反映される", async ({
    page,
  }) => {
    await page.goto("/todos/new");

    await page.fill("input#title", "E2Eテスト用のToDo");
    await page.fill(
      "textarea#description",
      "これはE2Eテストで作成されたToDoです",
    );

    await page.locator("#priority").click();
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    await page.locator('[role="option"]').filter({ hasText: "高" }).click();

    await page.click("button[type='submit']");
    await page.waitForURL("**/todos", { timeout: 10000 });

    const todoItems = page.locator("div.p-6.transition-colors");
    await expect(todoItems).toHaveCount(1);

    const first = todoItems.first();
    await expect(first.locator("h4.text-base.font-medium")).toHaveText(
      "E2Eテスト用のToDo",
    );
    await expect(first.locator("p.text-sm.text-muted-foreground")).toHaveText(
      "これはE2Eテストで作成されたToDoです",
    );
    await expect(
      first.locator("span.inline-flex.rounded-full").nth(1),
    ).toHaveText("優先度: 高");
  });

  test("【入力・正規化】タイトル前後の空白は trim されて保存される", async ({
    page,
  }) => {
    await page.goto("/todos/new");

    await page.fill("input#title", "   前後に空白あり   ");
    await page.click("button[type='submit']");

    await page.waitForURL("**/todos", { timeout: 10000 });

    const first = page.locator("div.p-6.transition-colors").first();
    await expect(first.locator("h4.text-base.font-medium")).toHaveText(
      "前後に空白あり",
    );
  });

  test("【異常系】タイトル未入力で送信するとエラーメッセージが表示される", async ({
    page,
  }) => {
    await page.goto("/todos/new");

    await page.click("button[type='submit']");

    const errorMessage = page.locator("#title-error");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText("※タイトルは必須です");

    // aria-invalid="true" が付与される
    await expect(page.locator("input#title")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    // 遷移していない
    expect(page.url()).toContain("/todos/new");
  });

  test("【境界値】タイトル100文字（上限ちょうど）で作成成功する", async ({
    page,
  }) => {
    const title = buildLongString(100, "あ");

    await page.goto("/todos/new");
    await page.fill("input#title", title);
    await page.click("button[type='submit']");

    await page.waitForURL("**/todos", { timeout: 10000 });

    const first = page.locator("div.p-6.transition-colors").first();
    await expect(first.locator("h4.text-base.font-medium")).toHaveText(title);
  });

  test("【境界値】タイトル101文字（上限超過）で「100文字以内」エラーが表示される", async ({
    page,
  }) => {
    const title = buildLongString(101, "あ");

    await page.goto("/todos/new");
    await page.fill("input#title", title);
    await page.click("button[type='submit']");

    const errorMessage = page.locator("#title-error");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(
      "※タイトルは100文字以内で入力してください",
    );

    expect(page.url()).toContain("/todos/new");
  });

  test("【境界値】説明1000文字（上限ちょうど）で作成成功する", async ({
    page,
  }) => {
    const description = buildLongString(1000, "あ");

    await page.goto("/todos/new");
    await page.fill("input#title", "説明上限テスト");
    await page.fill("textarea#description", description);
    await page.click("button[type='submit']");

    await page.waitForURL("**/todos", { timeout: 10000 });

    const first = page.locator("div.p-6.transition-colors").first();
    await expect(first.locator("h4.text-base.font-medium")).toHaveText(
      "説明上限テスト",
    );
    await expect(first.locator("p.text-sm.text-muted-foreground")).toHaveText(
      description,
    );
  });

  test("【境界値】説明1001文字（上限超過）で「1000文字以内」エラーが表示される", async ({
    page,
  }) => {
    const description = buildLongString(1001, "あ");

    await page.goto("/todos/new");
    await page.fill("input#title", "説明上限超過テスト");
    await page.fill("textarea#description", description);
    await page.click("button[type='submit']");

    const errorMessage = page.locator("#description-error");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(
      "※説明は1000文字以内で入力してください",
    );

    expect(page.url()).toContain("/todos/new");
  });

  test("【エラーUX】バリデーションエラー後に入力値が保持される（再入力させない）", async ({
    page,
  }) => {
    await page.goto("/todos/new");

    // タイトルは未入力、説明だけ入力 → タイトル必須エラーになる
    await page.fill("textarea#description", "再入力されたくない説明");
    await page.click("button[type='submit']");

    // エラー表示
    await expect(page.locator("#title-error")).toBeVisible();

    // 入力値は保持されている
    await expect(page.locator("textarea#description")).toHaveValue(
      "再入力されたくない説明",
    );
  });

  test("【二重送信防止】送信中はボタンが「作成中...」になり disabled となり、ToDoは1件のみ作成される", async ({
    page,
  }) => {
    await page.goto("/todos/new");
    await page.fill("input#title", "二重送信テスト");

    // Server Action のレスポンスを遅延させ、pending 状態を観測可能にする。
    // Next.js Server Actions は POST /todos/new に対する Multipart リクエストとして送信される。
    // GET（ページ読み込み）は対象外にしたいので、POST のみを対象にルーティング。
    await page.route("**/todos/new", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      await route.continue();
    });

    const submitButton = page.locator("button[type='submit']");

    // 1 回目のクリック（待たずに次へ）
    await submitButton.click();

    // pending 表示と disabled を観測
    await expect(submitButton).toHaveText("作成中...");
    await expect(submitButton).toBeDisabled();

    // 入力フィールドも disabled
    await expect(page.locator("input#title")).toBeDisabled();
    await expect(page.locator("textarea#description")).toBeDisabled();

    // disabled な要素への 2 回目クリックは force でも noop（DOM 上で受け取れない）
    // ここでは「待たずに即時に投げる」ことで二重送信を試みる
    await submitButton
      .click({ force: true, noWaitAfter: true, timeout: 1000 })
      .catch(() => {
        // disabled な要素はクリックできないため catch で握りつぶす
      });

    // ルーティングが解除されて遷移する
    await page.unroute("**/todos/new");
    await page.waitForURL("**/todos", { timeout: 10000 });

    // 1 件しか作成されていない
    expect(await countTestTodos(testUser.mUserId)).toBe(1);
    await expect(page.locator("div.p-6.transition-colors")).toHaveCount(1);
  });

  test("【遷移】キャンセルボタンで /todos に戻る（作成されない）", async ({
    page,
  }) => {
    await page.goto("/todos/new");
    await page.fill("input#title", "キャンセルされるはずのToDo");

    await page
      .locator("button[type='button']")
      .filter({ hasText: "キャンセル" })
      .click();

    await page.waitForURL("**/todos", { timeout: 10000 });
    expect(page.url()).toContain("/todos");
    expect(page.url()).not.toContain("/todos/new");

    // 作成されていない
    expect(await countTestTodos(testUser.mUserId)).toBe(0);
  });

  test("【a11y】title 必須エラー時に aria-describedby が #title-error を指す", async ({
    page,
  }) => {
    await page.goto("/todos/new");
    await page.click("button[type='submit']");

    const titleInput = page.locator("input#title");
    await expect(titleInput).toHaveAttribute("aria-invalid", "true");
    await expect(titleInput).toHaveAttribute("aria-describedby", "title-error");
  });

  test("【XSS耐性】HTMLタグ・スクリプトを含むタイトルがエスケープされて表示される", async ({
    page,
  }) => {
    const malicious = '<img src=x onerror="window.__xss=true" />スクリプト注入';

    await page.goto("/todos/new");
    await page.fill("input#title", malicious);
    await page.click("button[type='submit']");

    await page.waitForURL("**/todos", { timeout: 10000 });

    // テキストとしてそのまま表示され、スクリプトは実行されない
    const titleElement = page
      .locator("div.p-6.transition-colors")
      .first()
      .locator("h4.text-base.font-medium");
    await expect(titleElement).toHaveText(malicious);

    // window.__xss が定義されない（onerror が実行されていない）
    const xssTriggered = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__xss !== undefined,
    );
    expect(xssTriggered).toBe(false);
  });
});
