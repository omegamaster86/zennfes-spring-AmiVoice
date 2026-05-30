import type { Metadata } from "next";
import Link from "next/link";
import { listTranscriptionRecords } from "@/features/speech/adapters/transcription-repository";
import { toRecordDto } from "@/features/speech/api/response";

export const metadata: Metadata = {
  title: "変換履歴 | AmiVoice Demo",
};

export default async function SpeechHistoryPage() {
  let items: ReturnType<typeof toRecordDto>[] = [];
  let loadError: string | null = null;

  try {
    const rows = await listTranscriptionRecords({ limit: 50 });
    items = rows.map(toRecordDto);
  } catch {
    loadError =
      "履歴を読み込めませんでした。Supabase が起動しているか、マイグレーションと環境変数を確認してください。";
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/speech" className="text-sm text-primary underline">
            ← 音声変換
          </Link>
          <h1 className="text-lg font-semibold">変換履歴</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        {loadError && (
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        )}
        {!loadError && items.length === 0 && (
          <p className="text-sm text-muted-foreground">履歴はまだありません。</p>
        )}
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/speech/history/${item.id}`}
                className="block rounded-lg border p-4 hover:border-primary transition-colors"
              >
                <p className="text-sm font-medium line-clamp-2">{item.finalText}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString("ja-JP")} ·{" "}
                  {item.translationPolicy}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
