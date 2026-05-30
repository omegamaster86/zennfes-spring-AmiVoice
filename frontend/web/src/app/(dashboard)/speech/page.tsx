import type { Metadata } from "next";
import Link from "next/link";
import { SpeechHomeClient } from "./_components/SpeechHomeClient";

export const metadata: Metadata = {
  title: "音声変換 | AmiVoice Demo",
  description: "AmiVoice API と生成 AI による音声認識・翻訳デモ",
};

export default function SpeechHomePage() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-lg font-semibold">AmiVoice 音声デモ</h1>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <SpeechHomeClient />
      </main>
    </div>
  );
}
