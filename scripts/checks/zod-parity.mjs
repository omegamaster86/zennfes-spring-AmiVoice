#!/usr/bin/env node
// Next.js (frontend/web) と Edge Functions (backend/supabase/functions) の
// zod バリデーションスキーマが「同じロジック」になっているかを検査する。
//
// 対応関係の特定:
//   - Web 側で `callEdgeFunction("<name>", ...)` を呼び出している場所を起点にする
//   - 同じファイル内の `validate(<SchemaName>, ...)` から zod スキーマを特定し、
//     import 文経由で `_actions/schema.ts` 等のスキーマ定義を解析する
//   - Edge Function 側は `backend/supabase/functions/<name>/index.ts` の
//     `ctx.validate(<schemaName>)` から `_shared/schemas/*` を解析する
//
// 検査ルール:
//   code/zod-parity-missing-field : 片方のスキーマにしかないフィールドがある         [error]
//   code/zod-parity-type-mismatch : 同じフィールドの型が一致していない                 [error]
//   code/zod-parity-optional      : 同じフィールドの optional / nullable 指定が違う   [error]
//
// エスケープハッチ:
//   - Web 側の callEdgeFunction 呼び出し行の末尾コメントや直上行の
//     `// linter-disable: code/zod-parity-*` で抑制
//
// 制限事項（誤検知を避けるためのスキップ条件）:
//   - Web 側で `validate(...)` が見つからない場合は対象外（zod を経由していない）
//   - Edge Function 側に zod スキーマファイルが存在しない場合は対象外（GET 等）
//   - スキーマ定義が `z.object({...})` 形式でない場合（intersection / extend のみ等）

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const WEB_SRC_DIR = path.join(REPO_ROOT, "frontend", "web", "src");
const FUNCTIONS_DIR = path.join(REPO_ROOT, "backend", "supabase", "functions");
const EXCLUDED_DIRS = new Set(["node_modules", ".next", "test", "tests"]);

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

function listFiles(dir, exts) {
  const out = [];
  if (!safeExists(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      out.push(...listFiles(full, exts));
    } else if (
      st.isFile() &&
      exts.some((e) => entry.toLowerCase().endsWith(e))
    ) {
      out.push(full);
    }
  }
  return out;
}

// =============================================================
// 1. ソースコードからコメント・文字列を除去するユーティリティ
// =============================================================

// 文字列やコメントを空白に置き換え、構文構造（括弧位置等）のみを残す
function stripStringsAndCommentsAll(text) {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === "/" && next === "/") {
      while (i < n && text[i] !== "\n") {
        out += text[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }
    if (ch === "/" && next === "*") {
      out += "  ";
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) {
        out += text[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out += "  ";
        i += 2;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += " ";
      i++;
      while (i < n) {
        if (text[i] === "\\") {
          out += "  ";
          i += 2;
          continue;
        }
        if (text[i] === quote) {
          out += " ";
          i++;
          break;
        }
        out += text[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }
    // 正規表現リテラルの判定は行わない。
    // zod 内で使われる regex (/^pm_/ など) は括弧の対応が取れているため、
    // 文字列・コメントだけマスクできれば z.object({...}) 解析には十分。
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

// 対応する閉じカッコの位置を返す（開きカッコ位置を指定）
function findMatchingBracket(stripped, openIdx) {
  const open = stripped[openIdx];
  const close =
    open === "(" ? ")" : open === "{" ? "}" : open === "[" ? "]" : "";
  if (!close) return -1;
  let depth = 0;
  for (let i = openIdx; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// =============================================================
// 2. import 解析
// =============================================================

// 与えられたソースから `import { A, B as C } from "path"` を抽出
function parseImports(originalText) {
  const stripped = stripStringsAndCommentsAll(originalText);
  // import の位置を見つけ、from の手前まで stripped から、from 以降の path だけ
  // originalText から取り出す（path は文字列リテラル）
  const out = [];
  const re = /\bimport\b/g;
  let m;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec ループの定石パターン
  while ((m = re.exec(stripped)) !== null) {
    const start = m.index;
    // 次のセミコロンか改行までを取り出す（簡易）
    let end = start;
    while (
      end < stripped.length &&
      stripped[end] !== ";" &&
      stripped[end] !== "\n"
    ) {
      end++;
      // 複数行に渡る import { ... } from "..." を処理する
      if (stripped[end - 1] === "}") break;
    }
    // 末尾の文字列リテラル部分は stripped で空白になっているので、
    // 元テキストから抽出する
    const segOrig = originalText.slice(
      start,
      Math.min(end + 200, originalText.length),
    );
    // 名前部分: { ... } もしくは default
    const braceMatch = segOrig.match(/\{([\s\S]*?)\}/);
    const names = [];
    if (braceMatch) {
      for (const piece of braceMatch[1].split(",")) {
        const trimmed = piece.trim();
        if (!trimmed) continue;
        const asMatch = trimmed.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        if (asMatch) {
          names.push({ orig: asMatch[1], local: asMatch[2] ?? asMatch[1] });
        }
      }
    }
    const fromMatch = segOrig.match(/from\s+["']([^"']+)["']/);
    if (!fromMatch) continue;
    out.push({ names, path: fromMatch[1] });
  }
  return out;
}

// =============================================================
// 3. zod スキーマ定義（z.object({...})）のパース
// =============================================================

// `<schemaName>` という export を探し、対応する z.object({...}) を返す
function findZObjectDefinition(text, schemaName) {
  const stripped = stripStringsAndCommentsAll(text);
  // export const <name> = ... または const <name> = ...
  const re = new RegExp(
    `\\b(?:export\\s+)?const\\s+${schemaName}\\b\\s*=`,
    "g",
  );
  const m = re.exec(stripped);
  if (!m) return null;
  // = の次から先頭の z.object( を探す
  const i = m.index + m[0].length;
  // 行末まで or 次の式まで（簡略化のため z.object( の最初の出現を探す）
  const zObjectIdx = stripped.indexOf("z.object", i);
  if (zObjectIdx === -1) return null;
  // 最寄りのファイル末尾まででスコープ判定（厳密ではないが ; までで打ち切る）
  // 同名の別変数がないことが前提
  const openParen = stripped.indexOf("(", zObjectIdx);
  if (openParen === -1) return null;
  const closeParen = findMatchingBracket(stripped, openParen);
  if (closeParen === -1) return null;
  // 引数: 通常は { ... }
  const openBrace = stripped.indexOf("{", openParen);
  if (openBrace === -1 || openBrace > closeParen) return null;
  const closeBrace = findMatchingBracket(stripped, openBrace);
  if (closeBrace === -1 || closeBrace > closeParen) return null;
  // フィールド: { ... } の中身
  const bodyStart = openBrace + 1;
  const bodyEnd = closeBrace;
  return {
    bodyOriginal: text.slice(bodyStart, bodyEnd),
    bodyStripped: stripped.slice(bodyStart, bodyEnd),
    defStartLine: offsetToLine(text, m.index),
  };
}

// z.object body をフィールドに分解し、各フィールドの型情報を取り出す
function parseObjectFields(bodyOriginal, bodyStripped) {
  const fields = new Map();
  // トップレベルの "<key>:" を見つける
  // bodyStripped は文字列・コメントが空白化されているので、ブラケットの深さで分割しやすい
  const n = bodyStripped.length;
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  const splits = [];
  let cur = 0;
  for (let i = 0; i < n; i++) {
    const ch = bodyStripped[i];
    if (ch === "(") depthParen++;
    else if (ch === ")") depthParen--;
    else if (ch === "[") depthBracket++;
    else if (ch === "]") depthBracket--;
    else if (ch === "{") depthBrace++;
    else if (ch === "}") depthBrace--;
    else if (
      ch === "," &&
      depthParen === 0 &&
      depthBracket === 0 &&
      depthBrace === 0
    ) {
      splits.push([cur, i]);
      cur = i + 1;
    }
  }
  splits.push([cur, n]);

  for (const [s, e] of splits) {
    const segOrig = bodyOriginal.slice(s, e);
    const segStripped = bodyStripped.slice(s, e);
    // 先頭から識別子: ... を抽出
    const km = segStripped.match(/^\s*([A-Za-z_$][\w$]*|"[^"]+"|'[^']+')\s*:/);
    if (!km) continue;
    const rawKey = km[1];
    const key = rawKey.replace(/^["']|["']$/g, "");
    const valueStart = km[0].length;
    const valueOrig = segOrig.slice(valueStart).trim();
    const valueStripped = segStripped.slice(valueStart).trim();
    const typeInfo = analyzeFieldType(valueOrig, valueStripped);
    fields.set(key, typeInfo);
  }
  return fields;
}

// フィールドの値（zod チェイン）から型情報を取り出す
function analyzeFieldType(_valueOrig, valueStripped) {
  // 修飾子の検出: .optional() / .nullable() / .nullish() / .default(...)
  let optional = false;
  let nullable = false;
  if (/\.\s*nullish\s*\(/.test(valueStripped)) {
    optional = true;
    nullable = true;
  }
  if (/\.\s*optional\s*\(/.test(valueStripped)) optional = true;
  if (/\.\s*nullable\s*\(/.test(valueStripped)) nullable = true;
  if (/\.\s*default\s*\(/.test(valueStripped)) optional = true;

  // 主要な型: 最初に登場する `z.<keyword>(` または `<Identifier>` または `<Identifier>.<...>(`
  // ただし z.preprocess(<v>, <inner>) の場合は inner の zod を見る
  const preprocessMatch = valueStripped.match(/^z\s*\.\s*preprocess\s*\(/);
  if (preprocessMatch) {
    const openParen = valueStripped.indexOf("(", preprocessMatch[0].length - 1);
    const close = findMatchingBracket(valueStripped, openParen);
    if (close > -1) {
      // 第二引数の zod を探す
      const inner = valueStripped.slice(openParen + 1, close);
      // ブラケットの深さ 0 でカンマ分割
      let depth = 0;
      let commaIdx = -1;
      for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === "(" || ch === "{" || ch === "[") depth++;
        else if (ch === ")" || ch === "}" || ch === "]") depth--;
        else if (ch === "," && depth === 0) {
          commaIdx = i;
          break;
        }
      }
      if (commaIdx > -1) {
        const innerZod = inner.slice(commaIdx + 1).trim();
        const innerType = primaryTypeOf(innerZod);
        return mergeFlags(innerType, optional, nullable, valueStripped);
      }
    }
  }

  const baseType = primaryTypeOf(valueStripped);
  return mergeFlags(baseType, optional, nullable, valueStripped);
}

function mergeFlags(typeInfo, optional, nullable, valueStripped) {
  // .nullish() / .optional() / .nullable() がチェインで付いている場合があるため、
  // 上書きで強化する（既に true なら維持）
  const finalOptional =
    optional || typeInfo.optional || /\.\s*default\s*\(/.test(valueStripped);
  const finalNullable = nullable || typeInfo.nullable;
  return {
    type: typeInfo.type,
    raw: typeInfo.raw,
    optional: finalOptional,
    nullable: finalNullable,
  };
}

// 値の頭にある「型」だけを抽出する
function primaryTypeOf(valueStripped) {
  const trimmed = valueStripped.trim();
  const m = trimmed.match(/^z\s*\.\s*(\w+)\s*\(/);
  if (m) {
    return { type: m[1], raw: `z.${m[1]}`, optional: false, nullable: false };
  }
  const idm = trimmed.match(/^([A-Za-z_$][\w$]*)/);
  if (idm) {
    return {
      type: `ref:${idm[1]}`,
      raw: idm[1],
      optional: false,
      nullable: false,
    };
  }
  return {
    type: "unknown",
    raw: trimmed.slice(0, 40),
    optional: false,
    nullable: false,
  };
}

// =============================================================
// 4. スキーマ識別子から定義ファイルを解決する
// =============================================================

function resolveImport(currentFile, importPath) {
  // tsconfig path alias は単純なケースのみ対応
  // "@/..." を frontend/web/src/... に解決
  let resolved;
  if (importPath.startsWith("@/")) {
    resolved = path.join(WEB_SRC_DIR, importPath.slice(2));
  } else if (importPath.startsWith(".")) {
    resolved = path.resolve(path.dirname(currentFile), importPath);
  } else {
    return null;
  }
  // 拡張子の補完
  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    path.join(resolved, "index.ts"),
    path.join(resolved, "index.tsx"),
  ];
  for (const c of candidates) {
    if (safeExists(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function loadSchemaDefinition(fromFile, schemaName, visited = new Set()) {
  if (!safeExists(fromFile)) return null;
  const key = `${fromFile}::${schemaName}`;
  if (visited.has(key)) return null;
  visited.add(key);
  if (visited.size > 30) return null;
  const text = readFileSync(fromFile, "utf8");
  const def = findZObjectDefinition(text, schemaName);
  if (def) {
    const fields = parseObjectFields(def.bodyOriginal, def.bodyStripped);
    return {
      file: fromFile,
      defStartLine: def.defStartLine,
      fields,
    };
  }
  const imports = parseImports(text);
  for (const imp of imports) {
    const target = imp.names.find((n) => n.local === schemaName);
    if (!target) continue;
    const resolved = resolveImport(fromFile, imp.path);
    if (!resolved) continue;
    const result = loadSchemaDefinition(resolved, target.orig, visited);
    if (result) return result;
  }
  return null;
}

// =============================================================
// 5. Edge Function 側スキーマの収集
// =============================================================

function collectEdgeFunctionSchemas() {
  const map = new Map();
  if (!safeExists(FUNCTIONS_DIR)) return map;
  for (const entry of readdirSync(FUNCTIONS_DIR)) {
    if (entry === "_shared" || entry === "node_modules") continue;
    const dir = path.join(FUNCTIONS_DIR, entry);
    let st;
    try {
      st = statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const indexFile = path.join(dir, "index.ts");
    if (!safeExists(indexFile)) continue;
    const text = readFileSync(indexFile, "utf8");
    const stripped = stripStringsAndCommentsAll(text);
    // ctx.validate(<schemaName>) を見つける
    const re = /ctx\s*\.\s*validate\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g;
    let m;
    let schemaName = null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec ループの定石パターン
    while ((m = re.exec(stripped)) !== null) {
      schemaName = m[1];
      break;
    }
    if (!schemaName) continue;
    // index.ts の import から schemaName の場所を辿る
    const imports = parseImports(text);
    const target = imports.find((imp) =>
      imp.names.some((n) => n.local === schemaName),
    );
    if (!target) continue;
    const orig =
      target.names.find((n) => n.local === schemaName)?.orig ?? schemaName;
    let resolved;
    if (target.path.startsWith(".")) {
      resolved = path.resolve(path.dirname(indexFile), target.path);
    } else {
      continue;
    }
    const candidates = [
      resolved,
      `${resolved}.ts`,
      path.join(resolved, "index.ts"),
    ];
    let schemaFile = null;
    for (const c of candidates) {
      if (safeExists(c) && statSync(c).isFile()) {
        schemaFile = c;
        break;
      }
    }
    if (!schemaFile) continue;
    const def = findZObjectDefinition(readFileSync(schemaFile, "utf8"), orig);
    if (!def) continue;
    const fields = parseObjectFields(def.bodyOriginal, def.bodyStripped);
    map.set(entry, {
      schemaName: orig,
      file: schemaFile,
      defStartLine: def.defStartLine,
      indexFile,
      fields,
    });
  }
  return map;
}

// =============================================================
// 6. Web 側 callEdgeFunction 呼び出しの検出と対応スキーマの解析
// =============================================================

function getDisabledRulesOnLine(line) {
  const out = new Set();
  if (!line) return out;
  const m = /\/\/.*linter-disable(?:-next-line)?\s*:\s*([\w/\-,\s*]+)/.exec(
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
  if (here.has("code/zod-parity-*")) return true;
  const prev = lines[idx - 1] ?? "";
  if (/linter-disable-next-line/.test(prev)) {
    const rules = getDisabledRulesOnLine(prev);
    if (rules.has(rule) || rules.has("code/zod-parity-*")) return true;
  }
  return false;
}

function collectWebCallSites() {
  const out = [];
  if (!safeExists(WEB_SRC_DIR)) return out;
  const files = listFiles(WEB_SRC_DIR, [".ts", ".tsx"]);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const stripped = stripStringsAndCommentsAll(text);
    // callEdgeFunction("<name>" または callEdgeFunction(`<name>?...`) を抽出
    // strip 後は文字列が空白化されているため、元テキストから抽出する
    const re =
      /callEdgeFunction\s*\(\s*(?:"([^"]+)"|'([^']+)'|`([^`$]+?)(?:\?[^`]*)?`)\s*,/g;
    const lines = text.split(/\r?\n/);
    let m;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec ループの定石パターン
    while ((m = re.exec(text)) !== null) {
      const nameRaw = m[1] ?? m[2] ?? m[3];
      const name = nameRaw.split("?")[0].trim();
      if (!name) continue;
      const lineNo = offsetToLine(text, m.index);
      out.push({ file, line: lineNo, name, text, stripped, lines });
    }
  }
  return out;
}

// 呼び出しと同じファイルから validate(<SchemaName>, ...) を見つけて、
// その SchemaName の定義ファイルを辿る
function resolveWebSchemaForCallSite(callsite) {
  const { file, stripped } = callsite;
  const re = /\bvalidate\s*\(\s*([A-Za-z_$][\w$]*)\s*,/g;
  const found = [];
  let m;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec ループの定石パターン
  while ((m = re.exec(stripped)) !== null) {
    found.push(m[1]);
  }
  if (found.length === 0) return null;
  // 複数ある場合は最初のものを採用（同一 Server Action では通常 1 つ）
  const schemaName = found[0];
  const def = loadSchemaDefinition(file, schemaName);
  if (!def) return null;
  return { schemaName, ...def };
}

// =============================================================
// 7. 比較
// =============================================================

function typesAreCompatible(webType, edgeType) {
  // 同一文字列なら一致
  if (webType.type === edgeType.type) return true;
  // 片方が外部参照 (ref:...) なら、もう片方の型は判定できないため許容する
  if (webType.type.startsWith("ref:") || edgeType.type.startsWith("ref:")) {
    return true;
  }
  // unknown を含む場合は許容（パース失敗の可能性）
  if (webType.type === "unknown" || edgeType.type === "unknown") return true;
  return false;
}

function compareSchemas(webFields, edgeFields, callsite, edgeInfo) {
  const reportTarget = (rule, message) => {
    if (isLineSuppressed(callsite.lines, callsite.line - 1, rule)) return;
    const targetFile = callsite.file;
    report(targetFile, callsite.line, rule, message, "error");
  };

  const webKeys = new Set(webFields.keys());
  const edgeKeys = new Set(edgeFields.keys());

  // Web にのみあるフィールド: フォーム独自のバリデーション項目の可能性があるため警告のみ
  for (const k of webKeys) {
    if (!edgeKeys.has(k)) {
      const wt = webFields.get(k);
      if (wt.optional || wt.nullable) continue;
      reportTarget(
        "code/zod-parity-missing-field",
        `フィールド "${k}" は Web 側スキーマにあるが Edge Function 側スキーマ (${rel(edgeInfo.file)}) にありません。Edge Function "${callsite.name}" 側でも同名フィールドを受け取れるようにするか、Web 側フォーム専用なら .optional() / .nullable() を付けて意図を明示してください`,
      );
    }
  }
  // Edge にのみあるフィールド: Edge 側で optional または default を持つなら省略可能なのでスキップ
  for (const k of edgeKeys) {
    if (!webKeys.has(k)) {
      const et = edgeFields.get(k);
      if (et.optional || et.nullable) continue;
      reportTarget(
        "code/zod-parity-missing-field",
        `フィールド "${k}" は Edge Function 側スキーマ (${rel(edgeInfo.file)}) で必須だが Web 側スキーマにありません。Edge Function "${callsite.name}" に対して送信側で同名フィールドのバリデーションを追加してください`,
      );
    }
  }
  // 共通フィールドの型 / nullable / optional
  for (const k of webKeys) {
    if (!edgeKeys.has(k)) continue;
    const wt = webFields.get(k);
    const et = edgeFields.get(k);
    if (!typesAreCompatible(wt, et)) {
      reportTarget(
        "code/zod-parity-type-mismatch",
        `フィールド "${k}" の型が一致しません: Web=${wt.raw} / Edge=${et.raw} (Edge schema: ${rel(edgeInfo.file)})`,
      );
    }
    // 外部参照型は参照先で optional/nullable が決まるため比較対象外
    const refInvolved =
      wt.type.startsWith("ref:") || et.type.startsWith("ref:");
    if (
      !refInvolved &&
      (wt.optional !== et.optional || wt.nullable !== et.nullable)
    ) {
      const fmt = (t) => `optional=${t.optional}, nullable=${t.nullable}`;
      reportTarget(
        "code/zod-parity-optional",
        `フィールド "${k}" の optional / nullable 指定が一致しません: Web(${fmt(wt)}) / Edge(${fmt(et)}) (Edge schema: ${rel(edgeInfo.file)})`,
      );
    }
  }
}

function rel(p) {
  return path.relative(REPO_ROOT, p).split(path.sep).join("/");
}

// =============================================================
// 8. main
// =============================================================

function main() {
  const verbose = process.argv.includes("--verbose");

  if (!safeExists(WEB_SRC_DIR) || !safeExists(FUNCTIONS_DIR)) {
    console.log(
      `[zod-parity] required directories not found. web=${WEB_SRC_DIR} edge=${FUNCTIONS_DIR}`,
    );
    process.exit(0);
  }

  const edgeSchemas = collectEdgeFunctionSchemas();
  const callsites = collectWebCallSites();

  let checked = 0;
  const skipped = [];
  for (const cs of callsites) {
    const edgeInfo = edgeSchemas.get(cs.name);
    if (!edgeInfo) {
      skipped.push({
        file: cs.file,
        line: cs.line,
        name: cs.name,
        reason: "Edge Function 側に zod スキーマが見つからない (GET 系等)",
      });
      continue;
    }
    const webSchema = resolveWebSchemaForCallSite(cs);
    if (!webSchema) {
      skipped.push({
        file: cs.file,
        line: cs.line,
        name: cs.name,
        reason: "Web 側で validate(...) を経由していない / スキーマ未解決",
      });
      continue;
    }
    checked++;
    compareSchemas(webSchema.fields, edgeInfo.fields, cs, edgeInfo);
  }

  if (verbose) {
    console.log("[zod-parity] checked pairs:");
    for (const cs of callsites) {
      const edgeInfo = edgeSchemas.get(cs.name);
      if (!edgeInfo) continue;
      const webSchema = resolveWebSchemaForCallSite(cs);
      if (!webSchema) continue;
      console.log(
        `  - ${cs.name}: web=${rel(webSchema.file)} (${webSchema.fields.size} fields) <-> edge=${rel(edgeInfo.file)} (${edgeInfo.fields.size} fields)`,
      );
    }
    if (skipped.length > 0) {
      console.log("[zod-parity] skipped callsites:");
      for (const s of skipped) {
        console.log(`  - ${rel(s.file)}:${s.line}: ${s.name}: ${s.reason}`);
      }
    }
  }

  if (violations.length === 0) {
    console.log(
      `[zod-parity] No violations. (${checked} pair(s) checked, ${callsites.length} callsite(s), ${edgeSchemas.size} edge schema(s))`,
    );
    process.exit(0);
  }
  for (const v of violations) {
    const r = rel(v.file);
    console.log(`${r}:${v.line}: ${v.severity}: ${v.rule}: ${v.message}`);
  }
  const errors = violations.filter((v) => v.severity === "error").length;
  const warnings = violations.filter((v) => v.severity === "warning").length;
  const filesWith = new Set(violations.map((v) => v.file));
  console.log(
    `\nFound ${errors} error(s) and ${warnings} warning(s) across ${filesWith.size} file(s). (${checked} pair(s) checked)`,
  );
  process.exit(errors > 0 ? 1 : 0);
}

main();
