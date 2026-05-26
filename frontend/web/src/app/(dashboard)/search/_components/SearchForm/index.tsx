"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

/**
 * 検索フォーム（Client Component）
 * 入力値を URL の ?q= に反映して Server Component 側で再検索させる
 */
export function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const [value, setValue] = useState(initial);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      router.push("/search");
      return;
    }
    const params = new URLSearchParams();
    params.set("q", trimmed);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="flex items-center gap-2">
        <label htmlFor="search-q" className="sr-only">
          検索キーワード
        </label>
        <input
          id="search-q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='例: 北海道 札幌 "Next js"'
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={200}
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          検索
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        空白区切りで AND 検索（例:{" "}
        <code className="font-mono">北海道 札幌</code>）。
        <code className="font-mono">{'"…"'}</code> で囲むとフレーズ検索。
      </p>
    </form>
  );
}
