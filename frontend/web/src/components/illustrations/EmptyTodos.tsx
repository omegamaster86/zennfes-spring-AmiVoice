import { cn } from "@/utils";

type EmptyTodosProps = React.SVGProps<SVGSVGElement>;

/**
 * 空状態イラスト（React コンポーネント版）
 *
 * - Tailwind の `text-*` / `fill-*` でテーマカラーに追従可能
 * - `currentColor` を使っているため、ダークモードでも自動追従
 * - 親要素でサイズ制御（例: `className="w-48 h-48"`）
 */
export function EmptyTodosIllustration({
  className,
  ...props
}: EmptyTodosProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ToDo がありません"
      className={cn("w-full h-auto", className)}
      {...props}
    >
      {/* 背景サークル */}
      <circle cx="120" cy="90" r="70" className="fill-secondary" />

      {/* クリップボード本体 */}
      <rect
        x="80"
        y="40"
        width="80"
        height="100"
        rx="6"
        className="fill-card stroke-border"
        strokeWidth="2"
      />

      {/* クリップ部分 */}
      <rect
        x="104"
        y="32"
        width="32"
        height="14"
        rx="3"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />

      {/* リスト項目（3本のライン） */}
      <rect
        x="92"
        y="62"
        width="8"
        height="8"
        rx="2"
        className="fill-primary"
      />
      <rect
        x="106"
        y="64"
        width="44"
        height="4"
        rx="2"
        className="fill-muted-foreground/40"
      />

      <rect
        x="92"
        y="82"
        width="8"
        height="8"
        rx="2"
        className="fill-primary/50"
      />
      <rect
        x="106"
        y="84"
        width="36"
        height="4"
        rx="2"
        className="fill-muted-foreground/40"
      />

      <rect
        x="92"
        y="102"
        width="8"
        height="8"
        rx="2"
        className="fill-muted-foreground/30"
      />
      <rect
        x="106"
        y="104"
        width="40"
        height="4"
        rx="2"
        className="fill-muted-foreground/40"
      />

      {/* スパークル装飾 */}
      <path d="M48 60L52 64L48 68L44 64Z" className="fill-primary/60" />
      <path d="M192 44L196 48L192 52L188 48Z" className="fill-primary/40" />
      <circle cx="200" cy="120" r="3" className="fill-primary/50" />
      <circle cx="44" cy="110" r="4" className="fill-primary/30" />
    </svg>
  );
}
