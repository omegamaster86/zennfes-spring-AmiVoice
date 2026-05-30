import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranscriptionRecordById } from "@/features/speech/adapters/transcription-repository";
import { toRecordDto } from "@/features/speech/api/response";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return { title: `変換詳細 | AmiVoice Demo` };
}

export default async function SpeechHistoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  let record: ReturnType<typeof toRecordDto> | null = null;

  try {
    const row = await getTranscriptionRecordById(id);
    if (!row) {
      notFound();
    }
    record = toRecordDto(row);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link href="/speech/history" className="text-sm text-primary underline">
            ← 履歴一覧
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <section className="space-y-2">
          <h1 className="text-lg font-semibold">最終テキスト</h1>
          <p className="text-sm whitespace-pre-wrap rounded-md border p-4">
            {record.finalText}
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-medium">認識原文</h2>
          <p className="text-sm whitespace-pre-wrap rounded-md border p-4 bg-muted/30">
            {record.recognizedText}
          </p>
        </section>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">処理</dt>
          <dd>{record.translationPolicy}</dd>
          <dt className="text-muted-foreground">入力</dt>
          <dd>{record.inputSource}</dd>
          <dt className="text-muted-foreground">判定言語</dt>
          <dd>{record.detectedLanguage ?? "—"}</dd>
          <dt className="text-muted-foreground">作成日時</dt>
          <dd>{new Date(record.createdAt).toLocaleString("ja-JP")}</dd>
        </dl>
      </main>
    </div>
  );
}
