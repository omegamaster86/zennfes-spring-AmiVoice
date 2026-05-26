#!/usr/bin/env node
// 統合テストランナー。
// 3 スタック (Deno / Playwright / Flutter) のテストを順次実行し、結果を集計する。
//
// 出力:
//   - 標準出力に各スイートのリアルタイムログ
//   - .test-results/summary.md   (Markdown サマリ)
//   - .test-results/summary.json (機械可読サマリ)
//   - .test-results/<suite>.log  (各スイートの生ログ)
//
// 使い方:
//   node scripts/test-runner.mjs              # 全スイート実行
//   node scripts/test-runner.mjs --only=web   # Playwright のみ
//   node scripts/test-runner.mjs --only=backend,mobile
//   node scripts/test-runner.mjs --target=get-todos/get-todos.test.ts  # Deno の特定ファイルのみ
//   node scripts/test-runner.mjs --bail       # 1 つでも失敗したら以降をスキップ
//   node scripts/test-runner.mjs --help

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const RESULTS_DIR = path.join(REPO_ROOT, ".test-results");

// Windows では PATH 上の `bash` が WSL を指していることがあり、
// Git Bash 同梱の sed/grep/pwd 等が使えないため、Git Bash の絶対パスを明示的に解決する。
function resolveBashCommand() {
  if (process.platform !== "win32") {
    return "bash";
  }
  const candidates = [
    process.env.GIT_BASH,
    process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, "Git", "bin", "bash.exe")
      : null,
    process.env["ProgramFiles(x86)"]
      ? path.join(process.env["ProgramFiles(x86)"], "Git", "bin", "bash.exe")
      : null,
    process.env.LOCALAPPDATA
      ? path.join(
          process.env.LOCALAPPDATA,
          "Programs",
          "Git",
          "bin",
          "bash.exe",
        )
      : null,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  // フォールバック: PATH 解決に委ねる（WSL を踏む場合は失敗するので分かりやすいエラーが出る）
  return "bash";
}

const BASH_COMMAND = resolveBashCommand();

const SUITES = {
  backend: {
    label: "Deno (Supabase Edge Functions)",
    icon: "🧪",
    cwd: path.join(REPO_ROOT, "backend", "supabase", "test"),
    logFile: "backend.log",
    buildCommand({ target }) {
      // OS によらず run-test.sh 経由で実行する。
      // run-test.sh 内で `supabase status -o env` を読み込み、
      // SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SERVICE_ROLE_KEY / DB_URL を export してから
      // deno test を呼ぶため、テスト側で必要な環境変数が確実に渡る。
      const script = target ? `./run-test.sh ${target}` : "./run-test.sh";
      // Windows 上で Git Bash の絶対パス (`C:\Program Files\Git\bin\bash.exe`) を
      // 使う場合、spawn の `shell: true` ではスペース入りパスが正しくクォートされず
      // 切れてしまうため、bash は shell を介さず直接起動する。
      return { command: BASH_COMMAND, args: ["-c", script], shell: false };
    },
    parseStats(stdout) {
      const cleaned = stripAnsi(stdout);
      const passMatch = cleaned.match(/(\d+)\s+passed/);
      const failMatch = cleaned.match(/(\d+)\s+failed/);
      const passed = passMatch ? Number(passMatch[1]) : 0;
      const failed = failMatch ? Number(failMatch[1]) : 0;
      return { passed, failed, total: passed + failed };
    },
  },
  web: {
    label: "Playwright E2E (frontend/web)",
    icon: "🎭",
    // @playwright/test の二重解決を避けるため frontend/web 配下から実行する。
    // --target は frontend/web を基準としたパスで指定する (例: test/e2e/todos/todos.spec.ts)。
    cwd: path.join(REPO_ROOT, "frontend", "web"),
    logFile: "web.log",
    // テスト実行前に Playwright ブラウザが揃っているか確認し、不足分のみダウンロードする。
    async preCheck(suite) {
      await ensurePlaywrightBrowsers(suite);
    },
    buildCommand({ target }) {
      const args = [
        "playwright",
        "test",
        "--config=test/e2e/playwright.config.ts",
        target ?? "test/e2e",
        "--reporter=list",
      ];
      return { command: "npx", args };
    },
    parseStats(stdout) {
      const cleaned = stripAnsi(stdout);
      const passMatch = cleaned.match(/(\d+)\s+passed/);
      const failMatch = cleaned.match(/(\d+)\s+failed/);
      const skipMatch = cleaned.match(/(\d+)\s+skipped/);
      const passed = passMatch ? Number(passMatch[1]) : 0;
      const failed = failMatch ? Number(failMatch[1]) : 0;
      const skipped = skipMatch ? Number(skipMatch[1]) : 0;
      return { passed, failed, skipped, total: passed + failed + skipped };
    },
  },
  mobile: {
    label: "Flutter (frontend/mobile)",
    icon: "📱",
    cwd: path.join(REPO_ROOT, "frontend", "mobile"),
    logFile: "mobile.log",
    buildCommand({ target }) {
      const args = ["flutter", "test"];
      if (target) args.push(target);
      return { command: "fvm", args };
    },
    parseStats(stdout) {
      const cleaned = stripAnsi(stdout);
      const allMatch = cleaned.match(/All tests passed/i);
      const someFailMatch = cleaned.match(/(\d+)\s*[-:]\s*Some tests failed/i);
      const ranMatch = cleaned.match(/(\d+)\s+tests?\s+passed/i);
      const failMatch = cleaned.match(/(\d+)\s+(?:test|tests)\s+failed/i);
      const passed = ranMatch ? Number(ranMatch[1]) : allMatch ? 1 : 0;
      const failed = failMatch
        ? Number(failMatch[1])
        : someFailMatch
          ? Number(someFailMatch[1])
          : 0;
      return { passed, failed, total: passed + failed };
    },
  },
};

function stripAnsi(text) {
  // ANSI エスケープシーケンス除去のため ESC (U+001B) を意図的に含める。
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping requires ESC
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");
}

function log(line) {
  process.stdout.write(`[test-runner] ${line}\n`);
}

/**
 * Playwright ブラウザが揃っているか確認し、不足していればダウンロードする。
 * `playwright install --dry-run` で期待される install location を取得し、
 * いずれかが欠落していたら `playwright install chromium` を実行する。
 */
async function ensurePlaywrightBrowsers(suite) {
  log("🔍 Playwright ブラウザの状態を確認中...");

  const dryRun = await runCommand({
    command: "npx",
    args: ["playwright", "install", "--dry-run", "chromium"],
    cwd: suite.cwd,
    silent: true,
  });

  if (dryRun.exitCode !== 0) {
    throw new Error(
      `playwright install --dry-run が失敗しました (exit=${dryRun.exitCode})`,
    );
  }

  const locations = [];
  const re = /Install location:\s+(.+)/g;
  const stdout = stripAnsi(dryRun.stdout);
  for (const m of stdout.matchAll(re)) {
    locations.push(m[1].trim());
  }

  if (locations.length === 0) {
    log(
      "⚠️  Playwright のインストール先を判定できませんでした。install をスキップします。",
    );
    return;
  }

  const missing = locations.filter((p) => !existsSync(p));

  if (missing.length === 0) {
    log(
      `✓ Playwright ブラウザは既にインストール済み (${locations.length} パッケージ)`,
    );
    return;
  }

  log(
    `⏬ 未インストール: ${missing.length} / ${locations.length} パッケージ。ダウンロードを実行します...`,
  );
  for (const p of missing) log(`     missing: ${p}`);

  const install = await runCommand({
    command: "npx",
    args: ["playwright", "install", "chromium"],
    cwd: suite.cwd,
  });

  if (install.exitCode !== 0) {
    throw new Error(
      `playwright install に失敗しました (exit=${install.exitCode})`,
    );
  }

  log("✅ Playwright ブラウザのインストール完了");
}

function parseArgs(argv) {
  const args = { only: null, target: null, bail: false, help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--bail") args.bail = true;
    else if (arg.startsWith("--only=")) args.only = arg.slice("--only=".length);
    else if (arg.startsWith("--target="))
      args.target = arg.slice("--target=".length);
  }
  return args;
}

function printHelp() {
  process.stdout.write(`統合テストランナー (dev-starter)

使い方:
  node scripts/test-runner.mjs [options]

オプション:
  --only=<suites>   実行対象を絞り込む (カンマ区切り)。値: backend, web, mobile, all
                    例: --only=backend,web
  --target=<path>   各スイートの実行対象パスを指定 (1 つのスイートにしか効かない場合あり)
  --bail            1 つでも失敗したら以降のスイートをスキップ
  --help, -h        このヘルプを表示

出力:
  .test-results/summary.md   Markdown サマリ
  .test-results/summary.json 機械可読サマリ
  .test-results/<suite>.log  各スイートの生ログ
`);
}

function runCommand({ command, args, cwd, shell, silent }) {
  return new Promise((resolve) => {
    // shell が明示指定されていればそれを優先し、なければ Windows のみ shell 経由で起動する
    // (npx / fvm 等 PATH 解決と拡張子解決のため)。
    const useShell =
      typeof shell === "boolean" ? shell : process.platform === "win32";
    const child = spawn(command, args, {
      cwd,
      shell: useShell,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (!silent) process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (!silent) process.stderr.write(text);
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      stderr += `\n${err.message}`;
      resolve({ exitCode: 1, stdout, stderr });
    });
  });
}

function resolveSelectedSuites(only) {
  if (!only || only === "all") return Object.keys(SUITES);
  const set = new Set(
    only
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const name of set) {
    if (!SUITES[name]) {
      throw new Error(
        `未知のスイート: ${name} (有効: backend, web, mobile, all)`,
      );
    }
  }
  return Array.from(set);
}

function writeSummary(report) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    path.join(RESULTS_DIR, "summary.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  const lines = [];
  lines.push("# テスト実行サマリ");
  lines.push("");
  lines.push(`- 開始: ${report.startedAt}`);
  lines.push(`- 終了: ${report.finishedAt}`);
  lines.push(`- 所要時間: ${report.durationSec.toFixed(1)} 秒`);
  lines.push("");
  lines.push("## 結果一覧");
  lines.push("");
  lines.push("| Suite | Status | Passed | Failed | Total | Duration |");
  lines.push("|-------|--------|--------|--------|-------|----------|");
  for (const r of report.suites) {
    const status = r.skipped
      ? "⏭️ Skipped"
      : r.exitCode === 0
        ? "✅ Passed"
        : "❌ Failed";
    lines.push(
      `| ${r.icon} ${r.label} | ${status} | ${r.stats.passed ?? 0} | ${r.stats.failed ?? 0} | ${r.stats.total ?? 0} | ${(r.durationSec ?? 0).toFixed(1)}s |`,
    );
  }
  lines.push("");
  const totalFailed = report.suites.reduce(
    (acc, s) => acc + (s.stats.failed ?? 0),
    0,
  );
  const anySuiteFailed = report.suites.some(
    (s) => !s.skipped && s.exitCode !== 0,
  );
  if (anySuiteFailed || totalFailed > 0) {
    lines.push("## ⚠️ 失敗の概要");
    lines.push("");
    for (const r of report.suites) {
      if (r.skipped || r.exitCode === 0) continue;
      lines.push(`### ${r.icon} ${r.label}`);
      lines.push("");
      lines.push("```");
      const tail = (r.tail ?? "").split(/\r?\n/).slice(-40).join("\n");
      lines.push(tail || "(ログなし)");
      lines.push("```");
      lines.push(`> 全ログ: \`.test-results/${r.logFile}\``);
      lines.push("");
    }
  } else {
    lines.push("## 🎉 すべてのスイートが成功しました");
  }
  writeFileSync(path.join(RESULTS_DIR, "summary.md"), lines.join("\n"), "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  let selected;
  try {
    selected = resolveSelectedSuites(args.only);
  } catch (err) {
    process.stderr.write(`[test-runner] ${err.message}\n`);
    process.exit(2);
  }

  mkdirSync(RESULTS_DIR, { recursive: true });

  const startedAt = new Date();
  const report = {
    startedAt: startedAt.toISOString(),
    finishedAt: "",
    durationSec: 0,
    suites: [],
  };

  let bailed = false;

  for (const name of Object.keys(SUITES)) {
    const suite = SUITES[name];
    const entry = {
      name,
      label: suite.label,
      icon: suite.icon,
      logFile: suite.logFile,
      exitCode: 0,
      stats: { passed: 0, failed: 0, total: 0 },
      durationSec: 0,
      skipped: false,
      tail: "",
    };

    if (!selected.includes(name)) {
      entry.skipped = true;
      entry.reason = "not-selected";
      report.suites.push(entry);
      continue;
    }

    if (bailed) {
      entry.skipped = true;
      entry.reason = "bailed";
      report.suites.push(entry);
      continue;
    }

    if (typeof suite.preCheck === "function") {
      try {
        await suite.preCheck(suite);
      } catch (err) {
        log(`❌ ${suite.label} preCheck 失敗: ${err.message}`);
        entry.exitCode = 1;
        entry.tail = err.message;
        entry.parseError = err.message;
        report.suites.push(entry);
        if (args.bail) bailed = true;
        continue;
      }
    }

    const {
      command,
      args: cmdArgs,
      shell: cmdShell,
    } = suite.buildCommand({ target: args.target });
    log(`▶ ${suite.icon} ${suite.label} 実行中...`);
    log(
      `  > ${command} ${cmdArgs.join(" ")} (cwd=${path.relative(REPO_ROOT, suite.cwd) || "."})`,
    );

    const startSuite = Date.now();
    const { exitCode, stdout, stderr } = await runCommand({
      command,
      args: cmdArgs,
      cwd: suite.cwd,
      shell: cmdShell,
    });
    const durationSec = (Date.now() - startSuite) / 1000;

    const combined = `${stdout}\n${stderr}`;
    writeFileSync(path.join(RESULTS_DIR, suite.logFile), combined, "utf8");

    entry.exitCode = exitCode;
    entry.durationSec = durationSec;
    entry.tail = combined;
    try {
      entry.stats = suite.parseStats(combined);
    } catch (err) {
      entry.stats = { passed: 0, failed: 0, total: 0 };
      entry.parseError = err.message;
    }

    if (exitCode === 0) {
      log(
        `✅ ${suite.label} OK (${entry.stats.passed ?? 0} passed, ${(durationSec).toFixed(1)}s)`,
      );
    } else {
      log(
        `❌ ${suite.label} FAIL (exit=${exitCode}, ${entry.stats.failed ?? 0} failed, ${(durationSec).toFixed(1)}s)`,
      );
      if (args.bail) bailed = true;
    }
    report.suites.push(entry);
  }

  const finishedAt = new Date();
  report.finishedAt = finishedAt.toISOString();
  report.durationSec = (finishedAt - startedAt) / 1000;

  writeSummary(report);

  const overallFail = report.suites.some((s) => !s.skipped && s.exitCode !== 0);

  log("");
  log("=== 集計 ===");
  for (const s of report.suites) {
    const status = s.skipped ? "SKIP" : s.exitCode === 0 ? "PASS" : "FAIL";
    log(
      `  ${status.padEnd(4)} ${s.icon} ${s.label} (passed=${s.stats.passed ?? 0}, failed=${s.stats.failed ?? 0})`,
    );
  }
  log(
    `📝 サマリを書き出し: ${path.relative(REPO_ROOT, path.join(RESULTS_DIR, "summary.md"))}`,
  );

  process.exit(overallFail ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(
    `[test-runner] unexpected error: ${err?.stack ?? err}\n`,
  );
  process.exit(1);
});
