#!/usr/bin/env node
// pre-push 用エントリスクリプト。
// - Lint/Format は push 対象の差分ファイルのみに当てる（ハイブリッド戦略）
// - 型チェック (tsc --noEmit / deno check / flutter analyze) は依存解決上、常に全体実行
// - プロジェクト固有のルールチェックは全体スキャンで実行
//
// hook 仕様 (man githooks "pre-push"):
//   stdin に各 push 対象の参照ごとに 1 行ずつ
//   "<local_ref> <local_oid> <remote_ref> <remote_oid>" が渡される。
//   remote_oid が 0 埋めの場合は新規ブランチ。

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const ZERO_OID = "0000000000000000000000000000000000000000";

function log(line) {
  process.stdout.write(`[pre-push] ${line}\n`);
}

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    return {
      ok: false,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }
  return { ok: true, stdout: result.stdout ?? "" };
}

// gitleaks のような任意ツールが PATH に存在するかを確認する。
// 未インストールの環境 (新規参画者など) で push が失敗しないようにするため、
// スキップ判定に使う。
function hasCommand(cmd) {
  const probe = spawnSync(cmd, ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return probe.status === 0;
}

// 各ステップを子プロセスで実行する。
// stdout/stderr はリアルタイムで親プロセスにも流しつつ、
// 失敗時にまとめて再表示できるよう全文をキャプチャする。
function run(command, args, options = {}) {
  log(
    `> ${command} ${args.join(" ")}${options.cwd ? `  (cwd=${options.cwd})` : ""}`,
  );
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["inherit", "pipe", "pipe"],
      shell: process.platform === "win32",
      ...options,
    });
    let output = "";
    const onStdout = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    };
    const onStderr = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    };
    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.on("error", (err) => {
      const text = `${err?.stack ?? err}\n`;
      output += text;
      process.stderr.write(text);
      resolve({ code: 1, output });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  return await new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buf += chunk;
    });
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", () => resolve(buf));
  });
}

function parseHookStdin(stdinText) {
  const ranges = [];
  for (const raw of stdinText.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;
    const [localRef, localOid, _remoteRef, remoteOid] = parts;
    if (localOid === ZERO_OID) continue;
    ranges.push({ localRef, localOid, remoteOid });
  }
  return ranges;
}

function diffFilesForRange(localOid, remoteOid) {
  if (remoteOid === ZERO_OID) {
    const merged = runGit([
      "for-each-ref",
      "--format=%(refname)",
      "refs/remotes",
    ]);
    if (!merged.ok) return [];
    const remoteRefs = merged.stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (remoteRefs.length === 0) {
      const log = runGit(["log", "--name-only", "--pretty=format:", localOid]);
      return parseFileList(log.stdout);
    }
    const base = runGit(["merge-base", localOid, ...remoteRefs]);
    if (base.ok && base.stdout.trim()) {
      const result = runGit([
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        `${base.stdout.trim()}..${localOid}`,
      ]);
      if (result.ok) return parseFileList(result.stdout);
    }
    const log = runGit(["log", "--name-only", "--pretty=format:", localOid]);
    return parseFileList(log.stdout);
  }
  const result = runGit([
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    `${remoteOid}..${localOid}`,
  ]);
  if (!result.ok) return [];
  return parseFileList(result.stdout);
}

function parseFileList(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function fallbackChangedFiles() {
  const head = runGit([
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    "HEAD~1..HEAD",
  ]);
  if (head.ok) return parseFileList(head.stdout);
  return [];
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function bucketize(files) {
  const buckets = {
    biome: [],
    denoFunctions: [],
    denoTest: [],
    hasMobile: false,
  };
  for (const original of files) {
    const f = toPosix(original);
    if (!existsSync(path.join(REPO_ROOT, f))) continue;
    if (f.startsWith("backend/supabase/functions/") && f.endsWith(".ts")) {
      buckets.denoFunctions.push(f);
      continue;
    }
    if (f.startsWith("backend/supabase/test/") && f.endsWith(".ts")) {
      buckets.denoTest.push(f);
      continue;
    }
    if (f.startsWith("frontend/mobile/") && f.endsWith(".dart")) {
      buckets.hasMobile = true;
      continue;
    }
    if (/\.(tsx?|jsx?|mjs|cjs|json|css)$/.test(f)) {
      buckets.biome.push(f);
    }
  }
  return buckets;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

async function main() {
  const stdinText = await readStdin();
  const ranges = parseHookStdin(stdinText);

  let changedFiles = [];
  if (ranges.length > 0) {
    for (const r of ranges) {
      changedFiles = changedFiles.concat(
        diffFilesForRange(r.localOid, r.remoteOid),
      );
    }
    changedFiles = uniq(changedFiles);
  } else {
    log("hook stdin not provided. Falling back to HEAD~1..HEAD diff.");
    changedFiles = fallbackChangedFiles();
  }

  log(`changed files: ${changedFiles.length}`);
  for (const f of changedFiles) log(`  - ${f}`);

  const buckets = bucketize(changedFiles);
  const failures = [];
  const recordFailure = (name, output) => {
    failures.push({ name, output: (output ?? "").trim() });
  };

  // ------------------------------------------------------------
  // シークレット検知 (Gitleaks)
  //   - ローカル未インストール時は警告して skip (CI で必ず走るため push はブロックしない)
  //   - インストール済みなら push 対象コミット範囲のみ高速にスキャン
  // ------------------------------------------------------------
  if (!hasCommand("gitleaks")) {
    log(
      "gitleaks not found in PATH. Skipping local secret scan. " +
        "(CI で必ずチェックされます。ローカルでも実行したい場合は https://github.com/gitleaks/gitleaks からインストールしてください)",
    );
  } else if (ranges.length === 0) {
    log("gitleaks: hook ranges not provided. Skipping local scan.");
  } else {
    for (const r of ranges) {
      const logOpts =
        r.remoteOid === ZERO_OID
          ? // 新規ブランチ: 過去 20 コミットまでに限定 (履歴全体は CI 側で実施)
            `-20 ${r.localOid}`
          : `${r.remoteOid}..${r.localOid}`;
      log(`Running gitleaks for range: ${logOpts}`);
      const { code, output } = await run(
        "gitleaks",
        [
          "detect",
          "--source",
          ".",
          "--config",
          ".gitleaks.toml",
          "--redact",
          "--no-banner",
          "--log-opts",
          logOpts,
        ],
        { cwd: REPO_ROOT },
      );
      if (code !== 0) {
        recordFailure(`gitleaks (${logOpts})`, output);
      }
    }
  }

  if (buckets.biome.length > 0) {
    log(`Running Biome on ${buckets.biome.length} file(s)...`);
    const { code, output } = await run(
      "npx",
      ["--yes", "biome", "check", "--no-errors-on-unmatched", ...buckets.biome],
      { cwd: REPO_ROOT },
    );
    if (code !== 0) recordFailure("biome (changed files)", output);
  } else {
    log("Biome: no target files. skipped.");
  }

  if (buckets.denoFunctions.length > 0) {
    log(
      `Running deno lint on ${buckets.denoFunctions.length} functions file(s)...`,
    );
    const rel = buckets.denoFunctions.map((f) =>
      path.relative("backend/supabase/functions", f),
    );
    const { code, output } = await run("deno", ["lint", ...rel], {
      cwd: path.join(REPO_ROOT, "backend/supabase/functions"),
    });
    if (code !== 0)
      recordFailure("deno lint (functions, changed files)", output);
  } else {
    log("Deno lint (functions): no target files. skipped.");
  }

  if (buckets.denoTest.length > 0) {
    log(
      `Running deno lint / fmt --check on ${buckets.denoTest.length} test file(s)...`,
    );
    const rel = buckets.denoTest.map((f) =>
      path.relative("backend/supabase/test", f),
    );
    const lintResult = await run("deno", ["lint", ...rel], {
      cwd: path.join(REPO_ROOT, "backend/supabase/test"),
    });
    if (lintResult.code !== 0) {
      recordFailure("deno lint (test, changed files)", lintResult.output);
    }
    const fmtResult = await run("deno", ["fmt", "--check", ...rel], {
      cwd: path.join(REPO_ROOT, "backend/supabase/test"),
    });
    if (fmtResult.code !== 0) {
      recordFailure("deno fmt --check (test, changed files)", fmtResult.output);
    }
  } else {
    log("Deno lint/fmt (test): no target files. skipped.");
  }

  log("Running full type checks (always)...");
  const typecheckSteps = [
    {
      name: "web tsc --noEmit",
      command: "npm",
      args: ["run", "check:web:types"],
    },
    {
      name: "deno check (functions)",
      command: "npm",
      args: ["run", "check:deno:functions"],
    },
    {
      name: "deno check (test)",
      command: "npm",
      args: ["run", "check:deno:test"],
    },
  ];
  for (const step of typecheckSteps) {
    const { code, output } = await run(step.command, step.args, {
      cwd: REPO_ROOT,
    });
    if (code !== 0) recordFailure(step.name, output);
  }

  if (buckets.hasMobile) {
    log("Mobile changes detected. Running flutter analyze...");
    const { code, output } = await run("npm", ["run", "check:mobile"], {
      cwd: REPO_ROOT,
    });
    if (code !== 0) recordFailure("flutter analyze (mobile)", output);
  } else {
    log("Mobile: no .dart changes. skipped.");
  }

  log("Running project rule checks (SQL & Code, full scan)...");
  const sqlResult = await run("npm", ["run", "check:rules:sql"], {
    cwd: REPO_ROOT,
  });
  if (sqlResult.code !== 0)
    recordFailure("project rules (SQL)", sqlResult.output);
  const codeResult = await run("npm", ["run", "check:rules:code"], {
    cwd: REPO_ROOT,
  });
  if (codeResult.code !== 0)
    recordFailure("project rules (code)", codeResult.output);

  if (failures.length > 0) {
    log("");
    log("================================================================");
    log(
      ` FAILED steps (${failures.length}) - fix the items below and retry push`,
    );
    log("================================================================");
    for (let i = 0; i < failures.length; i++) {
      const f = failures[i];
      log("");
      log(`[${i + 1}/${failures.length}] ${f.name}`);
      log("----------------------------------------------------------------");
      if (f.output) {
        process.stdout.write(`${f.output}\n`);
      } else {
        log("(no captured output)");
      }
    }
    log("");
    log(`Summary: ${failures.map((f) => f.name).join(", ")}`);
    log("Push aborted. Fix the above issues and try again.");
    process.exit(1);
  }

  log("All checks passed. Proceeding with push.");
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[pre-push] unexpected error: ${err?.stack ?? err}\n`);
  process.exit(1);
});
