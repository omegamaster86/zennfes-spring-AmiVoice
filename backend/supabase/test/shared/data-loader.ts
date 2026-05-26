/**
 * 統合テストデータローダー（Supabase Functions & E2E共通）
 *
 * CSVファイルからテストデータを読み込み、Supabaseにロードするユーティリティ
 * Deno（Supabase Functions）とNode.js（E2Eテスト）の両環境で動作します
 */

// 環境判定
const isDeno = typeof Deno !== "undefined";

// 型定義
type ParseFunction = (
  input: string,
  options?: Record<string, unknown>,
) => Record<string, unknown>[];

type FsModule = {
  readFileSync: (path: string, encoding: string) => string;
};

// 環境に応じたインポート
let parse: ParseFunction;
let fs: FsModule | undefined;

if (isDeno) {
  // Deno環境
  parse = (await import("@std/csv")).parse as ParseFunction;
} else {
  // Node.js環境（Deno linterは無視）
  // @ts-expect-error - Node.js環境でのみ使用されるimport
  const csvParse = await import("csv-parse/sync");
  parse = csvParse.parse as ParseFunction;
  fs = (await import("node:fs")) as FsModule;
}

/**
 * Supabase設定を取得
 */
function getSupabaseConfig(): {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
} {
  if (isDeno) {
    // Deno環境（Supabase Functions）
    const url = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!url) throw new Error("SUPABASE_URL environment variable is not set.");
    if (!publishableKey) {
      throw new Error(
        "SUPABASE_PUBLISHABLE_KEY environment variable is not set.",
      );
    }
    if (!serviceRoleKey) {
      throw new Error("SERVICE_ROLE_KEY environment variable is not set.");
    }

    return { url, publishableKey, serviceRoleKey };
  } else {
    // Node.js環境（E2Eテスト）
    // Deno環境での型チェックエラーを回避するため、globalThis経由でアクセス
    const processEnv = (
      globalThis as typeof globalThis & {
        process?: { env: Record<string, string | undefined> };
      }
    ).process?.env || {};
    const url = processEnv.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = processEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = processEnv.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL environment variable is not set.",
      );
    }
    if (!publishableKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable is not set.",
      );
    }
    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY environment variable is not set.",
      );
    }

    return { url, publishableKey, serviceRoleKey };
  }
}

/**
 * CSVファイルからデータを読み込む
 * @param filePath - CSVファイルのパス
 * @returns パースされたデータ
 */
export async function loadCsvFile(
  filePath: string,
): Promise<Record<string, unknown>[]> {
  let content: string;

  if (isDeno) {
    // Deno環境
    content = await Deno.readTextFile(filePath);
  } else {
    // Node.js環境
    if (!fs) throw new Error("fs module not loaded");
    content = fs.readFileSync(filePath, "utf-8");
  }

  let records: Record<string, unknown>[];

  if (isDeno) {
    // Deno環境のパース
    records = parse(content, {
      skipFirstRow: true, // ヘッダー行をスキップ
      strip: true, // 前後の空白を削除
    });
  } else {
    // Node.js環境のパース
    records = parse(content, {
      columns: true, // 最初の行をヘッダーとして使用
      skip_empty_lines: true,
      trim: true,
    });
  }

  // 空文字列をnullに変換（PostgreSQLの数値型カラムなどのため）
  const processedData = records.map((row) => {
    const processedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      processedRow[key] = value === "" ? null : value;
    }
    return processedRow;
  });

  return processedData;
}

/**
 * テーブルにデータを挿入
 * @param tableName - テーブル名
 * @param data - 挿入するデータ
 */
export async function insertTestData(
  tableName: string,
  data: Record<string, unknown>[],
): Promise<void> {
  const { url, publishableKey } = getSupabaseConfig();

  // データを一括挿入
  const response = await fetch(`${url}/rest/v1/${tableName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publishableKey}`,
      apikey: publishableKey,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to insert test data into ${tableName}: ${response.status} ${errorText}`,
    );
  }

  // レスポンスボディを消費
  if (isDeno) {
    await response.body?.cancel();
  } else {
    await response.arrayBuffer();
  }
}

/**
 * テーブルのデータをクリア
 * @param tableName - テーブル名
 */
export async function clearTable(tableName: string): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseConfig();

  // まず全レコードを取得してIDを確認
  const getResponse = await fetch(
    `${url}/rest/v1/${tableName}?select=notice_id`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    throw new Error(
      `Failed to fetch records from ${tableName}: ${getResponse.status} ${errorText}`,
    );
  }

  const records = await getResponse.json();

  // レコードがない場合は何もしない
  if (!Array.isArray(records) || records.length === 0) {
    return;
  }

  // notice_idのリストを取得
  const ids = records
    .map((r: { notice_id?: string }) => r.notice_id)
    .filter((id) => id != null);

  if (ids.length === 0) {
    return;
  }

  // 各IDを個別に削除
  for (const id of ids) {
    const deleteResponse = await fetch(
      `${url}/rest/v1/${tableName}?notice_id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          Prefer: "return=minimal",
        },
      },
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(
        `Failed to delete record ${id} from ${tableName}: ${deleteResponse.status} ${errorText}`,
      );
    }

    // レスポンスボディを消費
    if (isDeno) {
      await deleteResponse.body?.cancel();
    } else {
      await deleteResponse.arrayBuffer();
    }
  }
}

/**
 * CSVファイルからテーブルにテストデータをロード
 * @param tableName - テーブル名
 * @param csvFilePath - CSVファイルのパス
 * @param truncate - 挿入前にテーブルをクリアするか（デフォルト: false）
 */
export async function loadTestData(
  tableName: string,
  csvFilePath: string,
  truncate = false,
): Promise<void> {
  console.log(`📥 テストデータ読み込み中: ${csvFilePath} → ${tableName}`);

  // truncate=trueの場合は、データの有無に関わらず最初にテーブルをクリア
  if (truncate) {
    console.log(`🧹 テーブルをクリアします: ${tableName}`);
    await clearTable(tableName);
    console.log(`✅ ${tableName} をクリアしました`);
  }

  const data = await loadCsvFile(csvFilePath);

  if (data.length === 0) {
    console.warn(`⚠️  データが見つかりません: ${csvFilePath}`);
    return;
  }

  // 既にクリア済みなのでデータを挿入
  await insertTestData(tableName, data);

  console.log(`✅ ${data.length}件のレコードを ${tableName} に読み込みました`);
}

/**
 * 複数のテストデータを順次ロード
 * @param testDataList - テストデータ設定の配列
 */
export async function loadMultipleTestData(
  testDataList: Array<{
    tableName: string;
    csvFilePath: string;
    truncate?: boolean;
  }>,
): Promise<void> {
  for (const testData of testDataList) {
    await loadTestData(
      testData.tableName,
      testData.csvFilePath,
      testData.truncate ?? false,
    );
  }
}

/**
 * テストデータファイルのパスを解決
 * テスト実行ディレクトリからの相対パスを構築
 * @param testDir - テストディレクトリ名（例: "notice-list"）
 * @param fileName - テストデータファイル名（例: "base.csv"）
 * @returns 完全なファイルパス
 */
export function resolveDataPath(testDir: string, fileName: string): string {
  // テストファイルからの相対パスでdataディレクトリを参照
  return `./${testDir}/data/${fileName}`;
}
