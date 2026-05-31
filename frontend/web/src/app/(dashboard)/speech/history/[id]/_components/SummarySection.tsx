"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SummarySectionProps = {
  recordId: string;
  initialSummary?: string | null;
};

export function SummarySection({
  recordId,
  initialSummary,
}: SummarySectionProps) {
  const [summary, setSummary] = useState<string | null>(
    initialSummary ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/speech/history/${recordId}/summarize`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        summary?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "要約に失敗しました");
      }

      if (!data.summary) {
        throw new Error("要約結果が空です");
      }

      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "要約に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">要約</h2>
      {!summary && (
        <Button type="button" onClick={handleSummarize} disabled={loading}>
          {loading ? "要約中…" : "要約する"}
        </Button>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {summary && (
        <p className="text-sm whitespace-pre-wrap rounded-md border p-4 bg-muted/20">
          {summary}
        </p>
      )}
    </section>
  );
}
