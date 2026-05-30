"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAudioRecorder } from "@/features/speech/hooks/use-audio-recorder";

type PendingLanguage = {
  recognizedText: string;
  detectedLanguage: string;
  amivoiceUtteranceId: string | null;
  confidence: number | null;
  inputSource: "mic" | "file";
};

export function SpeechHomeClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    status: recorderStatus,
    error: recorderError,
    startRecording,
    stopRecording,
    resetError: resetRecorderError,
  } = useAudioRecorder();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalText, setFinalText] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLanguage | null>(null);

  const isRecording = recorderStatus === "recording";
  const inputDisabled = loading || isRecording;
  const displayError = error ?? recorderError;

  async function submitAudio(file: File, inputSource: "mic" | "file") {
    setLoading(true);
    setError(null);
    setFinalText(null);
    setRecordId(null);
    setPending(null);

    try {
      const form = new FormData();
      form.append("audio", file);
      form.append("inputSource", inputSource);

      const res = await fetch("/api/speech/transcribe", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        needsManualLanguage?: boolean;
        recognizedText?: string;
        detectedLanguage?: string;
        amivoiceUtteranceId?: string | null;
        confidence?: number | null;
        inputSource?: "mic" | "file";
        finalText?: string;
        recordId?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "変換に失敗しました");
      }

      if (data.needsManualLanguage && data.recognizedText) {
        setPending({
          recognizedText: data.recognizedText,
          detectedLanguage: data.detectedLanguage ?? "unknown",
          amivoiceUtteranceId: data.amivoiceUtteranceId ?? null,
          confidence: data.confidence ?? null,
          inputSource: data.inputSource ?? inputSource,
        });
        return;
      }

      setFinalText(data.finalText ?? null);
      setRecordId(data.recordId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "変換に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function onFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    resetRecorderError();
    await submitAudio(file, "file");
  }

  async function onStartRecording() {
    resetRecorderError();
    setError(null);
    await startRecording();
  }

  async function onStopRecording() {
    const file = await stopRecording();
    if (!file) {
      return;
    }
    await submitAudio(file, "mic");
  }

  async function confirmLanguage(language: "en" | "ja") {
    if (!pending) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/speech/transcribe/confirm-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recognizedText: pending.recognizedText,
          language,
          inputSource: pending.inputSource,
          amivoiceUtteranceId: pending.amivoiceUtteranceId,
          confidence: pending.confidence,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        finalText?: string;
        recordId?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "保存に失敗しました");
      }

      setPending(null);
      setFinalText(data.finalText ?? null);
      setRecordId(data.recordId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>音声入力・変換</CardTitle>
          <CardDescription>
            PC の内蔵マイク（既定のマイク）で録音するか、音声ファイルを
            AmiVoice で認識し、英語のみ日本語へ翻訳します（ログイン不要）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recorderStatus !== "unsupported" && (
            <div className="space-y-2">
              <Label>マイク録音</Label>
              <div className="flex flex-wrap items-center gap-2">
                {!isRecording ? (
                  <Button
                    type="button"
                    disabled={inputDisabled}
                    onClick={() => void onStartRecording()}
                  >
                    録音を開始
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void onStopRecording()}
                  >
                    録音を停止
                  </Button>
                )}
                {isRecording && (
                  <span className="text-sm text-muted-foreground">
                    録音中…
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="audio-file">音声ファイル</Label>
            <input
              id="audio-file"
              ref={fileRef}
              type="file"
              accept="audio/*"
              disabled={inputDisabled}
              onChange={() => void onFileChange()}
              className="block w-full text-sm"
            />
          </div>
          {loading && (
            <p className="text-sm text-muted-foreground">処理中…</p>
          )}
          {displayError && (
            <p className="text-sm text-destructive" role="alert">
              {displayError}
            </p>
          )}
        </CardContent>
      </Card>

      {pending && (
        <Card>
          <CardHeader>
            <CardTitle>言語を選択</CardTitle>
            <CardDescription>
              自動判定: {pending.detectedLanguage} — 認識文を確認して言語を選んでください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap rounded-md border p-3 bg-muted/40">
              {pending.recognizedText}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={loading}
                onClick={() => void confirmLanguage("ja")}
              >
                日本語として保存
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => void confirmLanguage("en")}
              >
                英語として翻訳・保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {finalText && (
        <Card>
          <CardHeader>
            <CardTitle>変換結果</CardTitle>
            {recordId && (
              <CardDescription>
                <Link
                  href={`/speech/history/${recordId}`}
                  className="text-primary underline"
                >
                  詳細を見る
                </Link>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{finalText}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-sm">
        <Link href="/speech/history" className="text-primary underline">
          変換履歴一覧 →
        </Link>
      </p>
    </div>
  );
}
