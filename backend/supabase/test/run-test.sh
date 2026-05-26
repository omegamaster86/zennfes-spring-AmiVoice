#!/bin/bash
# Supabaseローカル環境の環境変数を設定してDenoテストを実行するスクリプト

set -e  # エラーが発生したら停止
set -o pipefail  # パイプライン中の失敗を検知

# 色の定義
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Deno Test Runner ===${NC}"

# スクリプトがあるディレクトリを取得（tests/functions）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

# プロジェクトルートを推定（スクリプトディレクトリから3階層上）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd -P)"

# 作業ディレクトリを tests/functions に移動
cd "$SCRIPT_DIR"

echo -e "${GREEN}✓ Project Root: $PROJECT_ROOT${NC}"
echo -e "${GREEN}✓ Working Directory: $SCRIPT_DIR${NC}"

# Supabaseが起動しているか確認（backend/ディレクトリに移動して実行）
echo -e "\n${YELLOW}Supabaseの状態を確認中...${NC}"
cd "$PROJECT_ROOT/backend"
if ! supabase status &> /dev/null; then
    echo -e "${RED}エラー: Supabaseが起動していません。${NC}"
    echo -e "${YELLOW}以下のコマンドで起動してください:${NC}"
    echo -e "  cd backend && supabase start"
    exit 1
fi

# データベースをリセット
echo -e "\n${YELLOW}データベースをリセット中...${NC}"
if supabase db reset; then
    echo -e "${GREEN}✓ データベースのリセットが完了しました${NC}"
else
    echo -e "${RED}エラー: データベースのリセットに失敗しました${NC}"
    exit 1
fi

# テスト実行のために tests/functions に戻る
cd "$SCRIPT_DIR"

# 環境変数を設定
echo -e "\n${YELLOW}環境変数を設定中...${NC}"

# supabase status -o env から環境変数を取得（backend/ディレクトリから実行）
ENV_OUTPUT=$(cd "$PROJECT_ROOT/backend" && supabase status -o env)
echo "$ENV_OUTPUT"

# 必要な環境変数のみを抽出して設定
# supabase status -o envの出力から必要な値を取得
API_URL=$(echo "$ENV_OUTPUT" | grep "^API_URL=" | sed 's/API_URL=//g' | sed 's/"//g')
ANON_KEY=$(echo "$ENV_OUTPUT" | grep "^ANON_KEY=" | sed 's/ANON_KEY=//g' | sed 's/"//g')
DB_URL=$(echo "$ENV_OUTPUT" | grep "^DB_URL=" | sed 's/DB_URL=//g' | sed 's/"//g')
SERVICE_ROLE_KEY=$(echo "$ENV_OUTPUT" | grep "^SERVICE_ROLE_KEY=" | sed 's/SERVICE_ROLE_KEY=//g' | sed 's/"//g')

# 必要な環境変数が取得できているか確認
if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ]; then
    echo -e "${RED}エラー: Supabaseの環境変数を取得できませんでした。${NC}"
    exit 1
fi

# テストに必要な環境変数をexport
export SUPABASE_URL="${API_URL%/}"  # 末尾のスラッシュを削除
export SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
export DB_URL="$DB_URL"
export SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

echo -e "${GREEN}✓ SUPABASE_URL: $SUPABASE_URL${NC}"
echo -e "${GREEN}✓ SUPABASE_PUBLISHABLE_KEY: ${SUPABASE_PUBLISHABLE_KEY:0:20}...${NC}"
echo -e "${GREEN}✓ DB_URL: ${DB_URL:0:40}...${NC}"
echo -e "${GREEN}✓ SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY:0:20}...${NC}"

# Denoテストを実行（出力を保存）
echo -e "\n${YELLOW}Denoテストを実行中...${NC}"
set +e
# 第1引数でテスト対象ファイル/ディレクトリが指定された場合はそれのみ実行、未指定なら全テスト
if [ -n "${1:-}" ]; then
  TARGET_PATH="$1"
  # tests ディレクトリからの相対パスまたはファイル名のみ許可
  if [ ! -e "$TARGET_PATH" ]; then
    echo -e "${RED}エラー: 指定したパスが見つかりません: ${TARGET_PATH}${NC}"
    echo -e "${YELLOW}tests/functions ディレクトリからの相対パスまたはファイル名で指定してください。${NC}"
    exit 1
  fi
  echo -e "${CYAN}Target:${NC} ${TARGET_PATH}"
  # deno.json の test タスクは "*.test.ts" を固定指定しているため、
  # 個別指定時は task を使わずに直接 deno test を呼び出す
  deno test --allow-all "$TARGET_PATH" | tee test-results.txt
else
  deno task test | tee test-results.txt
fi
TEST_EXIT_CODE=${PIPESTATUS[0]}
set -e

# ===== テスト結果のサマリー生成 =====
SUMMARY_TARGET="${GITHUB_STEP_SUMMARY:-}"

# ANSIカラーコード除去したクリーンファイルを作成
if [ -f test-results.txt ]; then
  sed 's/\x1b\[[0-9;]*m//g' test-results.txt > test-results-clean.txt
fi

# テスト統計の抽出（失敗時でも頑健に 0 を返す）
# macOS互換のため、grep -oPではなくsedを使用
# スペースを明示的に指定して貪欲マッチングの問題を回避
PASSED_TESTS=$(sed -n 's/.* \([0-9][0-9]*\) passed.*/\1/p' test-results-clean.txt 2>/dev/null | tail -1 || echo "0")
FAILED_TESTS=$(sed -n 's/.* \([0-9][0-9]*\) failed.*/\1/p' test-results-clean.txt 2>/dev/null | tail -1 || echo "0")
if [ -z "$PASSED_TESTS" ]; then PASSED_TESTS="0"; fi
if [ -z "$FAILED_TESTS" ]; then FAILED_TESTS="0"; fi
TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))

# 行ヘルパー: ステータス表示
status_label() {
  local code="$1"
  if [ "$code" -eq 0 ] 2>/dev/null; then
    echo "✅ Passed"
  elif [ "$code" -gt 0 ] 2>/dev/null; then
    echo "❌ Failed"
  else
    echo "⏭ Skipped"
  fi
}

TEST_STATUS_LABEL=$(status_label "$TEST_EXIT_CODE")

# 実行情報（可能なら git から取得）
REPO=$(git config --get remote.origin.url 2>/dev/null || echo "local")
COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "local")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "local")

# サマリを stdout に出力する純粋関数（呼び出し側でリダイレクトする）
# Git Bash (MSYS) 環境では /dev/stdout が解決できないため、関数側で
# リダイレクトせず、呼び出し側でファイルへ追記するかコンソールへ流すかを切り替える。
build_summary() {
  echo "## Test Results Summary"
  echo ""
  echo "### Run Information"
  echo "- **Repository**: ${REPO}"
  echo "- **Commit**: \`${COMMIT}\`"
  echo "- **Branch**: \`${BRANCH}\`"
  echo ""
  echo "### ✅ Check Results"
  echo ""
  echo "| Check | Status |"
  echo "|-------|--------|"
  echo "| 🧪 Deno Tests | ${TEST_STATUS_LABEL} |"
  echo ""
  if [ -f test-results.txt ]; then
    echo "### 📊 Test Details"
    echo ""
    echo "- **Total Tests**: ${TOTAL_TESTS}"
    echo "- **Passed**: ${PASSED_TESTS} ✅"
    echo "- **Failed**: ${FAILED_TESTS} ❌"
    echo ""
    if [ "${FAILED_TESTS}" != "0" ] && [ "${FAILED_TESTS}" != "" ]; then
      echo "### ❌ Failed Tests Details"
      echo ""
      echo '```'
      # Deno の出力は「FAILURES」セクションが無い場合があるため、無ければ末尾ログを出力
      sed -n '/FAILURES/,/FAILED.*passed/p' test-results-clean.txt 2>/dev/null | head -200
      if [ "${PIPESTATUS[0]}" -ne 0 ] || ! grep -q "FAILURES" test-results-clean.txt 2>/dev/null; then
        tail -200 test-results-clean.txt 2>/dev/null || true
      fi
      echo '```'
      echo ""
    fi
  fi
  echo ""
  if [ "$TEST_EXIT_CODE" -eq 0 ]; then
    echo "### 🎉 All checks passed!"
  else
    echo "### ⚠️ Some checks failed"
    echo "上記の失敗した項目を確認してください。"
  fi
}

# 出力先があれば Step Summary へ、無ければコンソールへ表示
if [ -n "$SUMMARY_TARGET" ]; then
  build_summary >> "$SUMMARY_TARGET"
  echo -e "\n${GREEN}✓ GitHub Step Summary に結果を追記しました。${NC}"
else
  echo ""
  build_summary
fi

# テスト結果ファイルのクリーンアップ（test-results.txtのみ削除）
if [ -f test-results.txt ]; then
  rm -f test-results.txt
fi

# 最後にテストの終了コードで終了（従来の挙動を維持）
if [ "$TEST_EXIT_CODE" -eq 0 ]; then
  echo -e "\n${GREEN}✓ すべてのテストが成功しました！${NC}"
  exit 0
else
  echo -e "\n${RED}✗ テストが失敗しました。${NC}"
  exit 1
fi
