# Mobile (Flutter) テンプレ

この `frontend/mobile/` ディレクトリは **Flutterアプリ本体ではなく、`lib/` と `test/` を中心としたテンプレ** です。  
新規案件では、別途 `flutter create` で作成した Flutter プロジェクトへ、このテンプレをコピーして利用してください。

## できること / 採用アーキテクチャ

- Feature-First + Clean Architecture のサンプル実装
- 状態管理: Riverpod
- ルーティング: go_router
- バックエンド連携: Supabase（`--dart-define` で接続情報を注入）

## Flutter バージョン

- **Flutter**: `frontend/mobile/.fvmrc` に固定（現在 `3.38.4`）

## 前提条件

- **Flutter SDK がローカルにインストール済み**（FVMを使う場合でも、初回セットアップは必要です）
  - 公式ガイド: `https://docs.flutter.dev/get-started/install`
- **FVM**（Flutterバージョン固定用）
- 推奨: VSCode（`.vscode/settings.json` をコピーすると FVM の SDK パスを参照できます）

## クイックスタート（テンプレ適用）

> 以降のコマンド例は **Windows（PowerShell） / macOS（bash/zsh）両対応**で記載します。

### 1) 新規 Flutter プロジェクトを作成

#### Windows（PowerShell）

```powershell
# 任意の作業ディレクトリへ
mkdir your_app
cd your_app

# FVM（未導入なら）
dart pub global activate fvm

# Flutter プロジェクト作成
fvm flutter create --org com.yourcompany --project-name your_app .
```

#### macOS（bash/zsh）

```bash
# 任意の作業ディレクトリへ
mkdir -p your_app
cd your_app

# FVM（未導入なら）
dart pub global activate fvm

# Flutter プロジェクト作成
fvm flutter create --org com.yourcompany --project-name your_app .
```

### 2) テンプレファイルをコピー

`dev-starter/frontend/mobile` から、作成した Flutter プロジェクトへ **上書きコピー**します。

#### Windows（PowerShell）

```powershell
# テンプレの場所（適宜変更）
$Template = "C:\path\to\dev-starter\frontend\mobile"
$Dest = (Get-Location).Path

# FVM 設定
Copy-Item -Force "$Template\.fvmrc" "$Dest\.fvmrc"

# Lint / VSCode 設定（任意）
Copy-Item -Force "$Template\analysis_options.yaml" "$Dest\analysis_options.yaml"
New-Item -ItemType Directory -Force "$Dest\.vscode" | Out-Null
Copy-Item -Recurse -Force "$Template\.vscode\*" "$Dest\.vscode"

# lib（上書き）
Copy-Item -Recurse -Force "$Template\lib\*" "$Dest\lib"

# test（任意：ユースケース/ウィジェット等のサンプルテスト）
Copy-Item -Recurse -Force "$Template\test\*" "$Dest\test"
```

`.fvmrc` をコピーしたら、このプロジェクトで使う Flutter バージョンを導入して適用します。

#### Windows（PowerShell）

```powershell
fvm install
fvm use
```

> `.vscode/settings.json` をコピーした場合、`dart.flutterSdkPath` が `.fvm/versions/...` を指します。もしパスが合わない場合は、`fvm use` 後に作成される実際のディレクトリ（例: `.fvm\versions\3.38.4`）に合わせて調整してください。

#### macOS（bash/zsh）

```bash
# テンプレの場所（適宜変更）
TEMPLATE="/path/to/dev-starter/frontend/mobile"

# FVM 設定
cp -f "$TEMPLATE/.fvmrc" ./.fvmrc

# Lint / VSCode 設定（任意）
cp -f "$TEMPLATE/analysis_options.yaml" ./analysis_options.yaml
mkdir -p ./.vscode
cp -Rf "$TEMPLATE/.vscode/"* ./.vscode/

# lib（上書き）
cp -Rf "$TEMPLATE/lib/"* ./lib/

# test（任意：ユースケース/ウィジェット等のサンプルテスト）
cp -Rf "$TEMPLATE/test/"* ./test/

# Flutter バージョン導入・適用
fvm install
fvm use
```

### 3) import のパッケージ名を置換（重要）

このテンプレの `lib/` には、`package:questionnaire/...` のように **パッケージ名が固定**された import が含まれます。  
作成したプロジェクト名（例: `your_app`）に合わせて置換してください。

例:

```dart
// 変更前
import 'package:questionnaire/core/core.dart';

// 変更後（あなたのプロジェクト名）
import 'package:your_app/core/core.dart';
```

> VSCode の「検索と置換（Ctrl+Shift+H）」で `package:questionnaire/` → `package:your_app/` を一括置換するのが早いです。

### 4) 依存パッケージを追加

このテンプレが使用する主要依存（抜粋）:

- `flutter_riverpod`, `riverpod_annotation`, `riverpod_generator`
- `go_router`
- `supabase_flutter`
- `dio`
- `connectivity_plus`
- `freezed_annotation`, `freezed`, `json_annotation`, `json_serializable`, `build_runner`
- `dartz`, `equatable`
- `intl`, `flutter_svg`
- テスト: `mocktail`

導入例:

#### Windows（PowerShell）

```powershell
fvm flutter pub add flutter_riverpod riverpod_annotation go_router supabase_flutter dio connectivity_plus dartz equatable freezed_annotation json_annotation intl flutter_svg
fvm flutter pub add --dev build_runner riverpod_generator freezed json_serializable mocktail
```

#### macOS（bash/zsh）

```bash
fvm flutter pub add flutter_riverpod riverpod_annotation go_router supabase_flutter dio connectivity_plus dartz equatable freezed_annotation json_annotation intl flutter_svg
fvm flutter pub add --dev build_runner riverpod_generator freezed json_serializable mocktail
```

### 5) コード生成を実行

#### Windows（PowerShell）

```powershell
fvm flutter pub get
fvm flutter pub run build_runner build --delete-conflicting-outputs
```

#### macOS（bash/zsh）

```bash
fvm flutter pub get
fvm flutter pub run build_runner build --delete-conflicting-outputs
```

## 実行（Supabase 接続情報）

`lib/config/env/env.dart` が以下の `--dart-define` を参照します。

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `ENVIRONMENT`（`development|staging|production`、未指定は `development`）

#### Windows（PowerShell）

```powershell
fvm flutter run `
  --dart-define=SUPABASE_URL="https://your-project.supabase.co" `
  --dart-define=SUPABASE_PUBLISHABLE_KEY="your-publishable-key" `
  --dart-define=ENVIRONMENT="development"
```

#### macOS（bash/zsh）

```bash
fvm flutter run \
  --dart-define=SUPABASE_URL="https://your-project.supabase.co" \
  --dart-define=SUPABASE_PUBLISHABLE_KEY="your-publishable-key" \
  --dart-define=ENVIRONMENT="development"
```

> この monorepo では Supabase は `backend/supabase/` 配下で管理されています。ローカル Supabase の起動/確認は、リポジトリルートの `README.md` を参照してください。

## テスト

#### Windows（PowerShell）

```powershell
# 静的解析
fvm flutter analyze

# 全テスト
fvm flutter test

# UseCase テストのみ
fvm flutter test test/usecase
```

#### macOS（bash/zsh）

```bash
# 静的解析
fvm flutter analyze

# 全テスト
fvm flutter test

# UseCase テストのみ
fvm flutter test test/usecase
```

### Supabase Functions テスト（Deno）について

`frontend/mobile/test/functions/` に Deno + Supabase のテスト例があります。  
README 本体では詳細手順は省略し、実行方法は `frontend/mobile/test/functions/README.md` を参照してください。

## ディレクトリ構成（抜粋）

```
frontend/mobile/
├── .fvmrc
├── analysis_options.yaml
├── .vscode/
├── lib/
│   ├── config/
│   │   ├── env/
│   │   └── routes/
│   ├── core/
│   │   ├── constants/
│   │   ├── errors/
│   │   ├── network/
│   │   ├── providers/
│   │   ├── theme/
│   │   ├── utils/
│   │   └── widgets/
│   ├── features/
│   │   ├── auth/
│   │   ├── home/
│   │   ├── profile/
│   │   └── questionnaire_detail/
│   ├── shared/
│   │   └── questionnaire/
│   └── main.dart
└── test/
    ├── usecase/
    ├── functions/
    └── widget_test.dart
```
