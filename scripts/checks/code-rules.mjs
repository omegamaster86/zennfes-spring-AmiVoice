#!/usr/bin/env node
// Edge Functions コード規約チェッカー（プロジェクト固有）。
// 対象: backend/supabase/functions/**/*.ts （_shared/ ディレクトリは除外）
//
// 検査ルール:
//   code/use-shared-response        : new Response(JSON.stringify(...)) 直書き禁止           [error]
//   code/use-shared-supabase-client : createClient( 直呼び禁止                                [error]
//   code/use-shared-validation      : req.headers.get("Authorization") 直読み禁止             [error]
//   code/no-console-log-edge        : console.log( 禁止                                       [error]
//   code/no-physical-delete         : Supabase クライアントの .delete() 物理削除を検出        [warning]
//
// 重大度: error はジョブを失敗させる。warning は exit 0 のまま標準出力に表示のみ。
//
// エスケープハッチ:
//   - 末尾コメント `// linter-disable: code/<rule>` で同一行を抑制
//   - 直上行のコメント `// linter-disable-next-line: code/<rule>` で次行を抑制

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const FUNCTIONS_DIR = path.join(REPO_ROOT, "backend", "supabase", "functions");
const EXCLUDED_DIRS = new Set(["_shared", "node_modules"]);

const violations = [];

function report(file, line, rule, message, severity = "error") {
  violations.push({ file, line, rule, message, severity });
}

function safeExists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function listTsFiles(dir, rel = "") {
  const out = [];
  if (!safeExists(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      out.push(...listTsFiles(full, rel ? `${rel}/${entry}` : entry));
    } else if (st.isFile() && entry.toLowerCase().endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

function getDisabledRulesOnLine(line) {
  const out = new Set();
  if (!line) return out;
  const m = /\/\/.*linter-disable(?:-next-line)?\s*:\s*([\w/\-,\s]+)/.exec(
    line,
  );
  if (!m) return out;
  for (const r of m[1].split(/[\s,]+/)) {
    if (r) out.add(r.trim());
  }
  return out;
}

function isLineSuppressed(lines, idx, rule) {
  const here = getDisabledRulesOnLine(lines[idx] ?? "");
  if (here.has(rule)) return true;
  const prev = lines[idx - 1] ?? "";
  if (/linter-disable-next-line/.test(prev)) {
    const rules = getDisabledRulesOnLine(prev);
    if (rules.has(rule)) return true;
  }
  return false;
}

function stripStringsAndComments(line) {
  let out = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "/" && line[i + 1] === "/") break;
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += " ";
      i++;
      while (i < line.length) {
        if (line[i] === "\\") {
          i += 2;
          continue;
        }
        if (line[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function offsetToLine(text, offset) {
  let line = 1;
  const limit = Math.min(offset, text.length);
  for (let i = 0; i < limit; i++) {
    if (text.charCodeAt(i) === 0x0a) line++;
  }
  return line;
}

function checkPhysicalDelete(file, lines, codeOnly) {
  const flatten = codeOnly.join("\n");
  const re =
    /\.\s*from\s*\([^)]*\)\s*(?:\.\s*\w+\s*\([^)]*\)\s*)*\.\s*delete\s*\(/g;
  let m;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec ループの定石パターン
  while ((m = re.exec(flatten)) !== null) {
    const deleteIdx = m.index + m[0].lastIndexOf(".delete");
    const lineNo = offsetToLine(flatten, deleteIdx);
    if (isLineSuppressed(lines, lineNo - 1, "code/no-physical-delete"))
      continue;
    report(
      file,
      lineNo,
      "code/no-physical-delete",
      "Supabase クライアントの .delete() による物理削除を検出しました。原則は論理削除 (.update({ deleted_at: ... })) を使用してください",
      "warning",
    );
  }
}

function checkFile(file) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const codeOnly = lines.map(stripStringsAndComments);

  checkPhysicalDelete(file, lines, codeOnly);

  for (let i = 0; i < lines.length; i++) {
    const code = codeOnly[i];

    const responseRule = "code/use-shared-response";
    if (!isLineSuppressed(lines, i, responseRule)) {
      if (/new\s+Response\s*\(\s*JSON\s*\.\s*stringify/.test(code)) {
        report(
          file,
          i + 1,
          responseRule,
          "new Response(JSON.stringify(...)) を直接使わず、_shared/response.ts の createSuccessResponse / createErrorResponse / createJsonResponse 等を使ってください",
        );
      }
    }

    const clientRule = "code/use-shared-supabase-client";
    if (!isLineSuppressed(lines, i, clientRule)) {
      if (/\bcreateClient\s*\(/.test(code)) {
        report(
          file,
          i + 1,
          clientRule,
          "createClient(...) を直接呼ばず、_shared/supabase.ts の createAuthenticatedClient を使ってください",
        );
      }
    }

    const validationRule = "code/use-shared-validation";
    if (!isLineSuppressed(lines, i, validationRule)) {
      if (
        /req(?:uest)?\s*\.\s*headers\s*\.\s*get\s*\(/.test(code) &&
        /Authorization/i.test(lines[i])
      ) {
        report(
          file,
          i + 1,
          validationRule,
          'req.headers.get("Authorization") を直接読まず、_shared/validation.ts の getAuthHeader を使ってください',
        );
      }
    }

    const consoleRule = "code/no-console-log-edge";
    if (!isLineSuppressed(lines, i, consoleRule)) {
      if (/\bconsole\s*\.\s*log\s*\(/.test(code)) {
        report(
          file,
          i + 1,
          consoleRule,
          "console.log は Edge Functions では使わず、console.error / console.warn を利用してください（一時的に必要なら linter-disable で抑制）",
        );
      }
    }
  }
}

function main() {
  if (!safeExists(FUNCTIONS_DIR)) {
    console.log(`[code-rules] functions directory not found: ${FUNCTIONS_DIR}`);
    process.exit(0);
  }
  const files = listTsFiles(FUNCTIONS_DIR);
  for (const f of files) checkFile(f);

  if (violations.length === 0) {
    console.log(
      `[code-rules] No violations. (${files.length} file(s) scanned)`,
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
