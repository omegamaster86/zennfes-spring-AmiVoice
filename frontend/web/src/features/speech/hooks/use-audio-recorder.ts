"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AudioRecorderStatus = "idle" | "recording" | "unsupported";

export type UseAudioRecorderResult = {
  status: AudioRecorderStatus;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<File | null>;
  resetError: () => void;
};

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
] as const;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  return (
    PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? ""
  );
}

function mapGetUserMediaError(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "録音を開始できませんでした";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "マイクの使用が許可されていません";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "マイクが見つかりません";
    case "NotReadableError":
      return "マイクにアクセスできません";
    case "SecurityError":
      return "この環境ではマイクを使用できません";
    default:
      return "録音を開始できませんでした";
  }
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }
  if (mimeType.includes("webm")) {
    return "webm";
  }
  return "audio";
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<AudioRecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef("");

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore stop errors during cleanup
      }
    }
    recorderRef.current = null;
    releaseStream();
    chunksRef.current = [];
  }, [releaseStream]);

  useEffect(() => {
    const unsupported =
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined";

    if (unsupported) {
      setStatus("unsupported");
    }

    return () => {
      cleanup();
    };
  }, [cleanup]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    if (status === "unsupported") {
      return;
    }

    setError(null);
    cleanup();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { ideal: "default" },
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      if (recorder.mimeType) {
        mimeTypeRef.current = recorder.mimeType;
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch (err) {
      cleanup();
      setError(mapGetUserMediaError(err));
      setStatus("idle");
    }
  }, [status, cleanup]);

  const stopRecording = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanup();
        setStatus("idle");
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType =
          mimeTypeRef.current || recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });

        recorderRef.current = null;
        releaseStream();
        chunksRef.current = [];
        setStatus("idle");

        if (blob.size === 0) {
          setError("録音データが空です");
          resolve(null);
          return;
        }

        const file = new File(
          [blob],
          `recording.${extensionForMime(mimeType)}`,
          { type: mimeType },
        );
        resolve(file);
      };

      recorder.stop();
    });
  }, [cleanup, releaseStream]);

  return {
    status,
    error,
    startRecording,
    stopRecording,
    resetError,
  };
}
