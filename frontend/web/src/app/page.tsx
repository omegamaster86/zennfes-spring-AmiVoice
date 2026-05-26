import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dev Starter",
  description: "Next.js + shadcn/ui スターターキット",
};

const DEMO_LINKS = [
  {
    href: "/demo/ui",
    title: "UI カタログ",
    description: "shadcn/ui コンポーネントの一覧・スタイル確認",
    badge: "デモ",
    badgeColor: "bg-violet-100 text-violet-700",
    border: "hover:border-violet-400",
    dot: "bg-violet-400",
    arrow: "text-violet-500",
  },
  {
    href: "/demo/todos",
    title: "ToDo（デモ）",
    description: "モックデータを使ったToDo管理画面",
    badge: "デモ",
    badgeColor: "bg-blue-100 text-blue-700",
    border: "hover:border-blue-400",
    dot: "bg-blue-400",
    arrow: "text-blue-500",
  },
  {
    href: "/demo/login",
    title: "ログイン（デモ）",
    description: "認証フォームのデモ画面",
    badge: "デモ",
    badgeColor: "bg-emerald-100 text-emerald-700",
    border: "hover:border-emerald-400",
    dot: "bg-emerald-400",
    arrow: "text-emerald-500",
  },
];

const AUTH_LINKS = [
  {
    href: "/login",
    title: "ログイン",
    description: "実際の認証フローへ進む",
  },
  {
    href: "/todos",
    title: "ダッシュボード",
    description: "認証済みユーザー向けの管理画面",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー — フル幅 */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="h-0.5 w-full bg-primary" />
        <div className="mx-auto max-w-5xl px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <span className="text-base font-bold tracking-tight text-foreground">
              Dev Starter
            </span>
          </div>
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            ログイン
          </Link>
        </div>
      </header>

      {/* ヒーロー — フル幅グラデーション */}
      <section className="bg-gradient-to-b from-secondary/60 to-background border-b border-border">
        <div className="mx-auto max-w-5xl px-8 py-24 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary mb-6 tracking-wide">
            Next.js + shadcn/ui スターターキット
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl leading-tight">
            開発を素早く
            <br />
            始めよう
          </h1>
          <p className="mt-5 text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            認証・ToDo管理・UIコンポーネントカタログを含む、すぐに使えるスターターテンプレートです。
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/demo/ui"
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
            >
              UIカタログを見る →
            </Link>
            <Link
              href="/demo/todos"
              className="rounded-md border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              デモを試す
            </Link>
          </div>
        </div>
      </section>

      {/* メインコンテンツ — max-w で中央配置 */}
      <main className="mx-auto max-w-5xl px-8 py-16 space-y-16">
        {/* デモページ */}
        <section>
          <SectionHeading label="デモページ" />
          <div className="grid gap-5 sm:grid-cols-3">
            {DEMO_LINKS.map(
              ({
                href,
                title,
                description,
                badge,
                badgeColor,
                border,
                dot,
                arrow,
              }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-200 ${border}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full mt-0.5 shrink-0 ${dot}`}
                    />
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}
                    >
                      {badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                  <span
                    className={`mt-4 inline-block text-xs font-semibold ${arrow}`}
                  >
                    開く →
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>

        {/* 本番ページ */}
        <section>
          <SectionHeading label="本番ページ" muted />
          <div className="grid gap-5 sm:grid-cols-2">
            {AUTH_LINKS.map(({ href, title, description }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all duration-200"
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  <code className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                    {href}
                  </code>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t border-border mt-8">
        <div className="mx-auto max-w-5xl px-8 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>Dev Starter</span>
          <span>Next.js · shadcn/ui · TypeScript</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  label,
  muted = false,
}: {
  label: string;
  muted?: boolean;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div
        className={`h-4 w-0.5 rounded-full ${muted ? "bg-muted-foreground/40" : "bg-primary"}`}
      />
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </h2>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}
