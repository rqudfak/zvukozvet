const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
] as const;

export function getSupportedRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  return RECORDER_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function isAudioRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean(getSupportedRecorderMimeType())
  );
}

function extensionForMime(mime: string): string {
  const base = mime.split(";")[0]?.toLowerCase() ?? "";

  if (base.includes("webm")) return "webm";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("mp4") || base.includes("m4a")) return "m4a";
  if (base.includes("wav")) return "wav";

  return "webm";
}

export function blobToAudioFile(blob: Blob, mimeType: string): File {
  const mime = mimeType.split(";")[0] || blob.type || "audio/webm";
  const ext = extensionForMime(mime);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new File([blob], `recording-${stamp}.${ext}`, { type: mime });
}

export function formatRecordingDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
