#!/usr/bin/env node
// SQL / テーブル設計規約チェッカー（プロジェクト固有）。
// 対象: backend/supabase/migrations/**/*.sql
//
// 検査ルール:
//   sql/table-name-prefix  : テーブル名が <英字1>_<snake_case> の形（m_, t_ など）  [error]
//   sql/pk-uuid-v7         : 主キーが id UUID PRIMARY KEY DEFAULT generate_uuid_v7()  [error]
//   sql/required-columns   : 共通カラム必須  [error]
//   sql/comment-table      : COMMENT ON TABLE が存在  [error]
//   sql/comment-columns    : 宣言された各カラムに COMMENT ON COLUMN が存在  [error]
//   sql/index-naming       : インデックス名が idx_<table>_<col1>[_<col2>...] 規約  [error]
//   sql/rls-enabled        : ALTER TABLE ... ENABLE ROW LEVEL SECURITY が存在  [error]
//   sql/no-physical-delete : DELETE FROM / TRUNCATE の使用禁止（論理削除 deleted_at を使うこと）  [warning]
//
// 重大度: error はジョブを失敗させる。warning は exit 0 のまま標準出力に表示のみ。
// エスケープハッチ: 行末コメント `-- linter-disable: <rule>` で個別抑制可能。
// 規約は CREATE TABLE 文単体ごと、もしくは関連する COMMENT/INDEX/ALTER 行に書く。

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(
  REPO_ROOT,
  "backend",
  "supabase",
  "migrations",
);

const REQUIRED_COLUMNS = [
  "created_at",
  "created_program",
  "updated_at",
  "updated_program",
  "lock_no",
  "deleted_at",
];

const TABLE_NAME_RE = /^[a-z]_[a-z0-9_]+$/;
const PK_LINE_RE =
  /\bid\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+generate_uuid_v7\s*\(\s*\)/i;

const DDL_KEYWORDS = new Set([
  "constraint",
  "check",
  "foreign",
  "primary",
  "unique",
  "index",
  "like",
  "exclude",
  "partition",
]);

const violations = [];

function reportViolation(file, line, rule, message, severity = "error") {
  violations.push({ file, line, rule, message, severity });
}

function listSqlFiles(dir) {
  const out = [];
  if (!safeExists(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listSqlFiles(full));
    } else if (st.isFile() && entry.toLowerCase().endsWith(".sql")) {
      out.push(full);
    }
  }
  return out;
}

function safeExists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function indexOfLine(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 0x0a) line++;
  }
  return line;
}

// 連続する `--` 行コメントは抽出に支障があるため、ブロック検出時はコメントを残したまま処理する。
// `$$ ... $$` のドル引用は内部の括弧を無視する必要があるためマスク処理する。
function maskDollarQuoted(text) {
  return text.replace(/\$\$[\s\S]*?\$\$/g, (m) => " ".repeat(m.length));
}

// CREATE TABLE [IF NOT EXISTS] [schema.]name ( ... ) ; を抽出
function extractTableBlocks(rawText) {
  const masked = maskDollarQuoted(rawText);
  const blocks = [];
  const headerRe =
    /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z_][\w.]*)\s*\(/gi;
  let m;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec ループの定石パターン
  while ((m = headerRe.exec(masked)) !== null) {
    const headerStart = m.index;
    const headerEnd = m.index + m[0].length;
    const rawName = m[1];
    if (rawName.includes(".")) {
      continue;
    }
    let depth = 1;
    let i = headerEnd;
    let inSingle = false;
    while (i < masked.length && depth > 0) {
      const c = masked[i];
      if (c === "'" && masked[i - 1] !== "\\") {
        inSingle = !inSingle;
      } else if (!inSingle) {
        if (c === "(") depth++;
        else if (c === ")") depth--;
      }
      i++;
    }
    if (depth !== 0) {
      break;
    }
    const closeIdx = i - 1;
    let end = i;
    while (end < masked.length && /\s/.test(masked[end])) end++;
    if (masked[end] === ";") end++;
    const body = rawText.slice(headerEnd, closeIdx);
    blocks.push({
      name: rawName,
      headerOffset: headerStart,
      bodyOffset: headerEnd,
      endOffset: end,
      body,
      headerLine: indexOfLine(rawText, headerStart) + 0,
    });
  }
  return blocks;
}

function stripInlineComments(line) {
  const idx = line.indexOf("--");
  if (idx === -1) return line;
  return line.slice(0, idx);
}

function getDisabledRulesOnLine(line) {
  const idx = line.indexOf("--");
  if (idx === -1) return new Set();
  const tail = line.slice(idx);
  const out = new Set();
  const re = /linter-disable:\s*([\w/,\s-]+)/g;
  let m;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec ループの定石パターン
  while ((m = re.exec(tail)) !== null) {
    for (const r of m[1].split(/[\s,]+/)) {
      if (r) out.add(r.trim());
    }
  }
  return out;
}

// テーブルブロック本文を行ごとに分割し、各行が（カラム宣言|テーブル制約|空|コメント）かを判定する。
// カラム宣言の最初のワードを名前として返す。
function parseTableBody(body) {
  const lines = body.split(/\r?\n/);
  const columns = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = stripInlineComments(raw).trim().replace(/,$/, "").trim();
    if (!stripped) continue;
    const firstWord = stripped.split(/\s+/)[0].toLowerCase();
    if (DDL_KEYWORDS.has(firstWord)) continue;
    if (!/^[a-z_][\w]*$/i.test(stripped.split(/\s+/)[0])) continue;
    columns.push({
      name: stripped.split(/\s+/)[0],
      lineInBody: i,
      raw,
    });
  }
  return { columns, lines };
}

function checkTable(file, fullText, block) {
  const { name: tableName, body, headerLine } = block;
  const headerLineText = fullText.split(/\r?\n/)[headerLine - 1] ?? "";
  const headerDisabled = getDisabledRulesOnLine(headerLineText);
  const fileLines = fullText.split(/\r?\n/);

  if (!headerDisabled.has("sql/table-name-prefix")) {
    if (!TABLE_NAME_RE.test(tableName)) {
      reportViolation(
        file,
        headerLine,
        "sql/table-name-prefix",
        `テーブル名 "${tableName}" がプレフィックス規約 <英字1>_<snake_case> に一致しません (例: m_user, t_purchase_result)`,
      );
    }
  }

  if (!headerDisabled.has("sql/pk-uuid-v7")) {
    if (!PK_LINE_RE.test(body)) {
      reportViolation(
        file,
        headerLine,
        "sql/pk-uuid-v7",
        `テーブル "${tableName}" の主キーが "id UUID PRIMARY KEY DEFAULT generate_uuid_v7()" 形式ではありません`,
      );
    }
  }

  const { columns } = parseTableBody(body);
  const columnNames = new Set(columns.map((c) => c.name.toLowerCase()));

  if (!headerDisabled.has("sql/required-columns")) {
    const missing = REQUIRED_COLUMNS.filter((col) => !columnNames.has(col));
    if (missing.length > 0) {
      reportViolation(
        file,
        headerLine,
        "sql/required-columns",
        `テーブル "${tableName}" に共通カラムが不足: ${missing.join(", ")}`,
      );
    }
  }

  if (!headerDisabled.has("sql/comment-table")) {
    const tableCommentRe = new RegExp(
      `COMMENT\\s+ON\\s+TABLE\\s+${escapeRegex(tableName)}\\s+IS\\s+'`,
      "i",
    );
    if (!tableCommentRe.test(fullText)) {
      reportViolation(
        file,
        headerLine,
        "sql/comment-table",
        `テーブル "${tableName}" の COMMENT ON TABLE が見つかりません`,
      );
    }
  }

  if (!headerDisabled.has("sql/comment-columns")) {
    for (const col of columns) {
      const colCommentRe = new RegExp(
        `COMMENT\\s+ON\\s+COLUMN\\s+${escapeRegex(tableName)}\\.${escapeRegex(col.name)}\\s+IS\\s+'`,
        "i",
      );
      if (!colCommentRe.test(fullText)) {
        const absLine = headerLine + col.lineInBody + 1;
        const lineText = fileLines[absLine - 1] ?? "";
        const colDisabled = getDisabledRulesOnLine(lineText);
        if (colDisabled.has("sql/comment-columns")) continue;
        reportViolation(
          file,
          absLine,
          "sql/comment-columns",
          `カラム "${tableName}.${col.name}" の COMMENT ON COLUMN が見つかりません`,
        );
      }
    }
  }

  if (!headerDisabled.has("sql/rls-enabled")) {
    const rlsRe = new RegExp(
      `ALTER\\s+TABLE\\s+${escapeRegex(tableName)}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      "i",
    );
    if (!rlsRe.test(fullText)) {
      reportViolation(
        file,
        headerLine,
        "sql/rls-enabled",
        `テーブル "${tableName}" に ALTER TABLE ... ENABLE ROW LEVEL SECURITY が見つかりません`,
      );
    }
  }
}

function checkPhysicalDelete(file, fullText) {
  const masked = maskDollarQuoted(fullText);
  const lines = fullText.split(/\r?\n/);
  const maskedLines = masked.split(/\r?\n/);
  const deleteRe = /\bDELETE\s+FROM\s+([A-Za-z_][\w.]*)/i;
  const truncateRe = /\bTRUNCATE\s+(?:TABLE\s+)?([A-Za-z_][\w.]*)/i;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const disabled = getDisabledRulesOnLine(raw);
    if (disabled.has("sql/no-physical-delete")) continue;
    const stripped = stripInlineComments(maskedLines[i] ?? "");
    const d = deleteRe.exec(stripped);
    if (d) {
      reportViolation(
        file,
        i + 1,
        "sql/no-physical-delete",
        `物理削除 (DELETE FROM ${d[1]}) を検出しました。原則は論理削除 (UPDATE ... SET deleted_at = ...) を使用してください`,
        "warning",
      );
      continue;
    }
    const t = truncateRe.exec(stripped);
    if (t) {
      reportViolation(
        file,
        i + 1,
        "sql/no-physical-delete",
        `物理削除 (TRUNCATE ${t[1]}) を検出しました。原則は論理削除 (UPDATE ... SET deleted_at = ...) を使用してください`,
        "warning",
      );
    }
  }
}

function checkIndexNaming(file, fullText, _knownTables) {
  const lines = fullText.split(/\r?\n/);
  const re =
    /CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z_][\w]*)\s+ON\s+([A-Za-z_][\w]*)\s*\(([^)]+)\)/gi;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const disabled = getDisabledRulesOnLine(raw);
    if (disabled.has("sql/index-naming")) continue;
    const stripped = stripInlineComments(raw);
    let m;
    re.lastIndex = 0;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec ループの定石パターン
    while ((m = re.exec(stripped)) !== null) {
      const idxName = m[1];
      const tableName = m[2];
      const cols = m[3]
        .split(",")
        .map((s) => s.trim().split(/\s+/)[0].replace(/["`]/g, "").toLowerCase())
        .filter(Boolean);
      if (cols.length === 0) continue;
      const expected = `idx_${tableName.toLowerCase()}_${cols.join("_")}`;
      if (idxName.toLowerCase() !== expected) {
        reportViolation(
          file,
          i + 1,
          "sql/index-naming",
          `インデックス名 "${idxName}" が規約に違反しています (期待値: "${expected}")`,
        );
      }
    }
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
  if (!safeExists(MIGRATIONS_DIR)) {
    console.log(
      `[sql-rules] migrations directory not found: ${MIGRATIONS_DIR}`,
    );
    process.exit(0);
  }
  const files = listSqlFiles(MIGRATIONS_DIR);
  let fileCount = 0;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    checkPhysicalDelete(file, text);
    if (!/CREATE\s+TABLE/i.test(text)) {
      checkIndexNaming(file, text, new Set());
      continue;
    }
    fileCount++;
    const blocks = extractTableBlocks(text);
    for (const b of blocks) {
      checkTable(file, text, b);
    }
    checkIndexNaming(file, text, new Set(blocks.map((b) => b.name)));
  }

  if (violations.length === 0) {
    console.log(
      `[sql-rules] No violations. (${files.length} file(s), ${fileCount} with CREATE TABLE)`,
    );
    process.exit(0);
  }
  for (const v of violations) {
    const rel = path.relative(REPO_ROOT, v.file).split(path.sep).join("/");
    console.log(`${rel}:${v.line}: ${v.severity}: ${v.rule}: ${v.message}`);
  }
  const errors = violations.filter((v) => v.severity === "error").length;
  const warnings = violations.filter((v) => v.severity === "warning").length;
  const filesWith = new Set(violations.map((v) => v.file));
  console.log(
    `\nFound ${errors} error(s) and ${warnings} warning(s) across ${filesWith.size} file(s).`,
  );
  process.exit(errors > 0 ? 1 : 0);
}

main();
