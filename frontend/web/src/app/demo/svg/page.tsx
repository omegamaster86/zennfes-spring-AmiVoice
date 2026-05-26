import {
  Bell,
  Heart,
  Home,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import Image from "next/image";
import { Logo, LogoWordmark } from "@/components/brand/Logo";
import { EmptyTodosIllustration } from "@/components/illustrations/EmptyTodos";
import { Button } from "@/components/ui/button";
import welcomeSvg from "../../../../public/illustration-welcome.svg";
import logoSvg from "../../../../public/logo.svg";

/**
 * SVG 取扱いサンプルページ
 * /demo/svg でアクセス可能
 *
 * 1. アイコン: lucide-react
 * 2. カスタムインラインアイコン
 * 3. ロゴ（React コンポーネント / 静的ファイル）
 * 4. イラスト（React コンポーネント / 静的ファイル）
 */
export default function SvgDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="h-1 w-full bg-primary" />
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogoWordmark size={28} />
            </div>
            <span className="rounded-full border border-primary bg-secondary px-3 py-1 text-xs font-semibold text-primary">
              SVG デモ
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-12">
        {/* ========================================== */}
        {/* 1. アイコン: lucide-react                   */}
        {/* ========================================== */}
        <Section
          number="1"
          title="アイコン (lucide-react)"
          description="最も使用頻度の高いアイコンは lucide-react を使うのが定番。Tree-shaking が効き、className でサイズと色を制御できる。"
        >
          <div className="flex flex-wrap gap-6 items-end">
            <IconCell icon={<Home className="h-5 w-5" />} label="h-5 w-5" />
            <IconCell icon={<Settings className="h-6 w-6" />} label="h-6 w-6" />
            <IconCell
              icon={<Bell className="h-8 w-8 text-primary" />}
              label="text-primary"
            />
            <IconCell
              icon={<Heart className="h-8 w-8 text-red-500 fill-red-500" />}
              label="text + fill"
            />
            <IconCell
              icon={<Search className="h-10 w-10 text-muted-foreground" />}
              label="h-10 w-10"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              プロフィール
            </Button>
          </div>

          <CodeBlock>
            {`import { Home } from "lucide-react"\n\n<Home className="h-5 w-5 text-primary" />`}
          </CodeBlock>
        </Section>

        {/* ========================================== */}
        {/* 2. カスタムインラインアイコン                */}
        {/* ========================================== */}
        <Section
          number="2"
          title="カスタムインラインアイコン"
          description="lucide に無い独自形状が必要なときは React コンポーネント化。fill/stroke を currentColor にすることで text-* で色を制御可能。"
        >
          <div className="flex flex-wrap gap-6 items-end">
            <IconCell
              icon={<SparkleIcon className="h-6 w-6" />}
              label="default"
            />
            <IconCell
              icon={<SparkleIcon className="h-8 w-8 text-amber-500" />}
              label="amber-500"
            />
            <IconCell
              icon={<SparkleIcon className="h-10 w-10 text-primary" />}
              label="text-primary"
            />
          </div>

          <CodeBlock>
            {`// currentColor を使えば text-* で色が切り替わる
<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
  <path d="..." />
</svg>`}
          </CodeBlock>
        </Section>

        {/* ========================================== */}
        {/* 3. ロゴ                                      */}
        {/* ========================================== */}
        <Section
          number="3"
          title="ロゴ"
          description="ロゴは React コンポーネント化するのが最も柔軟。色・サイズを動的に変更でき、ダークモード対応も容易。"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* 3-1: React コンポーネント */}
            <Card title="3-1. React コンポーネント版（推奨）">
              <div className="flex items-center gap-8">
                <Logo size={32} />
                <Logo size={48} />
                <Logo size={64} className="text-emerald-600" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                size prop とクラスで色を自由に変更可能。LogoWordmark
                のように派生コンポーネントも作りやすい。
              </p>
              <div className="mt-4 rounded-md border border-border bg-muted/40 p-4">
                <LogoWordmark size={32} />
              </div>
              <CodeBlock>
                {`import { Logo } from "@/components/brand/Logo"\n\n<Logo size={48} className="text-primary" />`}
              </CodeBlock>
            </Card>

            {/* 3-2: 静的 SVG ファイル */}
            <Card title="3-2. public/ 配下の静的 SVG">
              <div className="flex items-center gap-8">
                <Image
                  src={logoSvg}
                  alt="App Logo"
                  width={32}
                  height={32}
                  priority
                />
                <Image src={logoSvg} alt="App Logo" width={48} height={48} />
                <Image src={logoSvg} alt="App Logo" width={64} height={64} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                表示するだけ（色変更不要）ならこちらが最速。キャッシュも効く。色変更やアニメーションは不可。
              </p>
              <CodeBlock>
                {`import Image from "next/image"
import logo from "@/public/logo.svg"

<Image src={logo} alt="Logo" width={48} height={48} />`}
              </CodeBlock>
            </Card>
          </div>
        </Section>

        {/* ========================================== */}
        {/* 4. イラスト                                  */}
        {/* ========================================== */}
        <Section
          number="4"
          title="イラスト"
          description="空状態 / オンボーディングなどで使うイラスト。テーマに追従させたいなら React コンポーネント、固定ビジュアルなら next/image。"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* 4-1: React コンポーネント（テーマ追従） */}
            <Card title="4-1. React コンポーネント版（テーマ追従）">
              <div className="flex justify-center rounded-md bg-muted/30 p-6">
                <EmptyTodosIllustration className="max-w-[240px]" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                fill に Tailwind の{" "}
                <code className="font-mono text-xs">fill-primary</code> /{" "}
                <code className="font-mono text-xs">fill-card</code>{" "}
                などを使うと、ダークモードに自動追従する。
              </p>
              <CodeBlock>
                {`<rect className="fill-primary" ... />
<rect className="fill-card stroke-border" ... />`}
              </CodeBlock>
            </Card>

            {/* 4-2: 静的 SVG ファイル */}
            <Card title="4-2. public/ 配下の静的 SVG">
              <div className="flex justify-center rounded-md bg-muted/30 p-6">
                <Image
                  src={welcomeSvg}
                  alt="Welcome illustration"
                  width={320}
                  height={220}
                  className="max-w-[240px] h-auto"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                デザイナーから納品された SVG をそのまま表示する場合に最適。色は
                SVG 内部に固定される。
              </p>
              <CodeBlock>
                {`import Image from "next/image"
import welcome from "@/public/illustration-welcome.svg"

<Image src={welcome} alt="" width={320} height={220} />`}
              </CodeBlock>
            </Card>
          </div>
        </Section>

        {/* ========================================== */}
        {/* 使い分けまとめ                                */}
        {/* ========================================== */}
        <Section
          number="※"
          title="使い分けまとめ"
          description="プロジェクトで迷ったときの目安。"
        >
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">用途</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    推奨アプローチ
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">理由</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <Row
                  cells={[
                    "UI アイコン",
                    "lucide-react",
                    "Tree-shaking / 豊富なラインナップ",
                  ]}
                />
                <Row
                  cells={[
                    "独自アイコン",
                    "インライン SVG コンポーネント",
                    "currentColor で色制御可能",
                  ]}
                />
                <Row
                  cells={[
                    "ロゴ（色/サイズ変更あり）",
                    "React コンポーネント版 Logo",
                    "柔軟性が最も高い",
                  ]}
                />
                <Row
                  cells={[
                    "ロゴ（表示のみ）",
                    "next/image + public/",
                    "最速・キャッシュ効く",
                  ]}
                />
                <Row
                  cells={[
                    "イラスト（テーマ追従）",
                    "React コンポーネント + fill-*",
                    "ダークモード追従が容易",
                  ]}
                />
                <Row
                  cells={[
                    "イラスト（固定）",
                    "next/image + public/",
                    "デザイナー納品物をそのまま使える",
                  ]}
                />
              </tbody>
            </table>
          </div>
        </Section>
      </main>
    </div>
  );
}

/* ============================================ */
/* インラインアイコンのサンプル実装                */
/* ============================================ */
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="sparkle"
      className={className}
    >
      <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" />
      <path d="M19 14L19.9 16.1L22 17L19.9 17.9L19 20L18.1 17.9L16 17L18.1 16.1L19 14Z" />
    </svg>
  );
}

/* ============================================ */
/* レイアウト用のミニコンポーネント                */
/* ============================================ */
function Section({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
          {number}
        </span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <div className="flex-1 border-t border-border" />
      </div>
      {description && (
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {children}
      </div>
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function IconCell({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-background">
        {icon}
      </div>
      <span className="text-xs text-muted-foreground font-mono">{label}</span>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs font-mono text-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Row({ cells }: { cells: [string, string, string] }) {
  return (
    <tr>
      <td className="px-4 py-3 text-foreground">{cells[0]}</td>
      <td className="px-4 py-3 font-medium text-foreground">{cells[1]}</td>
      <td className="px-4 py-3 text-muted-foreground">{cells[2]}</td>
    </tr>
  );
}
