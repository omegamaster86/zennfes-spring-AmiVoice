import { cn } from "@/utils";

type LogoProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

/**
 * ブランドロゴ（React コンポーネント版）
 *
 * - `fill="currentColor"` にすることで Tailwind の `text-*` で色を制御できる
 * - `className` / `size` で柔軟にサイズ調整可能
 * - SSR でインライン展開されるため追加リクエスト不要
 */
export function Logo({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="App Logo"
      role="img"
      className={cn("text-primary", className)}
      {...props}
    >
      <rect x="4" y="4" width="40" height="40" rx="10" fill="currentColor" />
      <path
        d="M16 24.5L21.5 30L32 18"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 横並びのロゴ（マーク + サービス名）
 */
export function LogoWordmark({ size = 28, className, ...props }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Logo size={size} {...props} />
      <span
        className="text-lg font-bold tracking-tight text-foreground"
        style={{ fontSize: size * 0.6 }}
      >
        DevStarter
      </span>
    </div>
  );
}
