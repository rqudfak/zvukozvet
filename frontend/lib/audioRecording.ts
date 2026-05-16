const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
] as const;

export type RecordingAvailability = {
  canRecord: boolean;
  reason?: string;
};

function hasGetUserMediaApi(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  if (typeof navigator.mediaDevices !== "undefined") {
    return true;
  }

  const legacy = navigator as Navigator & {
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      success: (stream: MediaStream) => void,
      error: (error: unknown) => void,
    ) => void;
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      success: (stream: MediaStream) => void,
      error: (error: unknown) => void,
    ) => void;
  };

  return Boolean(legacy.webkitGetUserMedia || legacy.mozGetUserMedia);
}

export function getRecordingAvailability(): RecordingAvailability {
  if (typeof window === "undefined") {
    return { canRecord: false, reason: "Запись доступна только в браузере." };
  }

  if (typeof MediaRecorder === "undefined") {
    return {
      canRecord: false,
      reason: "Ваш браузер не поддерживает запись звука. Попробуйте Chrome, Firefox или Edge.",
    };
  }

  if (!window.isSecureContext) {
    return {
      canRecord: false,
      reason:
        "Микрофон доступен только по HTTPS или на localhost. Откройте сайт как https://… или http://127.0.0.1 (не по обычному http://имя-домена).",
    };
  }

  if (!hasGetUserMediaApi()) {
    return {
      canRecord: false,
      reason: "API микрофона недоступно. Обновите браузер или разрешите доступ к микрофону.",
    };
  }

  return { canRecord: true };
}

/** @deprecated используйте getRecordingAvailability */
export function isAudioRecordingSupported(): boolean {
  return getRecordingAvailability().canRecord;
}

export function getSupportedRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  if (typeof MediaRecorder.isTypeSupported !== "function") {
    return RECORDER_MIME_CANDIDATES[0];
  }

  return RECORDER_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function createAudioMediaRecorder(stream: MediaStream): {
  recorder: MediaRecorder;
  mimeType: string;
} {
  const preferred = getSupportedRecorderMimeType();

  if (preferred) {
    return {
      recorder: new MediaRecorder(stream, { mimeType: preferred }),
      mimeType: preferred,
    };
  }

  const recorder = new MediaRecorder(stream);
  const mimeType = recorder.mimeType || "audio/webm";

  return { recorder, mimeType };
}

export async function requestMicrophoneStream(): Promise<MediaStream> {
  const availability = getRecordingAvailability();
  if (!availability.canRecord) {
    throw new Error(availability.reason ?? "Запись с микрофона недоступна.");
  }

  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }

  const legacyNavigator = navigator as Navigator & {
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      success: (stream: MediaStream) => void,
      error: (error: unknown) => void,
    ) => void;
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      success: (stream: MediaStream) => void,
      error: (error: unknown) => void,
    ) => void;
  };

  const legacyGetUserMedia =
    legacyNavigator.webkitGetUserMedia ?? legacyNavigator.mozGetUserMedia;

  if (!legacyGetUserMedia) {
    throw new Error("API микрофона недоступно.");
  }

  return new Promise<MediaStream>((resolve, reject) => {
    legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject);
  });
}

function extensionForMime(mime: string): string {
  const base = mime.split(";")[0]?.toLowerCase() ?? "";

  if (base.includes("webm")) return "webm";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("mp4") || base.includes("m4a") || base.includes("aac")) return "m4a";
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
