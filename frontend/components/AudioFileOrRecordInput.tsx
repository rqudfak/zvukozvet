"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  blobToAudioFile,
  createAudioMediaRecorder,
  formatRecordingDuration,
  getRecordingAvailability,
  requestMicrophoneStream,
  type RecordingAvailability,
} from "@/lib/audioRecording";

type SourceMode = "file" | "record";

export type AudioFileOrRecordInputProps = {
  id?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
  fileInputClassName?: string;
};

export default function AudioFileOrRecordInput({
  id = "audio",
  file,
  onFileChange,
  accept = ".mp3,.wav,.ogg,.m4a,.webm,audio/*",
  disabled = false,
  className,
  fileInputClassName,
}: AudioFileOrRecordInputProps) {
  const [mode, setMode] = useState<SourceMode>("file");
  const [recordingAvailability, setRecordingAvailability] = useState<RecordingAvailability>({
    canRecord: false,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>("");
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setRecordingAvailability(getRecordingAvailability());
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const resetRecorder = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopStream();
    setIsRecording(false);
    setElapsedSec(0);
  }, [clearTimer, stopStream]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
      stopStream();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [clearTimer, stopStream]);

  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetRecorder();
    revokePreview();
    setRecordError(null);
    onFileChange(event.target.files?.[0] ?? null);
  };

  const switchMode = (nextMode: SourceMode) => {
    if (disabled || nextMode === mode) return;
    resetRecorder();
    revokePreview();
    setRecordError(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMode(nextMode);
  };

  const startRecording = async () => {
    if (disabled || isRecording) return;

    if (!recordingAvailability.canRecord) {
      setRecordError(recordingAvailability.reason ?? "Запись с микрофона недоступна.");
      return;
    }

    setRecordError(null);
    revokePreview();
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      const stream = await requestMicrophoneStream();
      streamRef.current = stream;
      chunksRef.current = [];

      const { recorder, mimeType } = createAudioMediaRecorder(stream);
      mimeTypeRef.current = mimeType;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearTimer();
        stopStream();
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current.split(";")[0] });
        chunksRef.current = [];

        if (blob.size === 0) {
          setRecordError("Запись пуста. Попробуйте ещё раз.");
          onFileChange(null);
          return;
        }

        const recordedFile = blobToAudioFile(blob, mimeTypeRef.current);
        const url = URL.createObjectURL(recordedFile);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        onFileChange(recordedFile);
        setRecordError(null);
      };

      recorder.onerror = () => {
        setRecordError("Ошибка записи. Попробуйте ещё раз.");
        resetRecorder();
      };

      recorder.start(250);
      setIsRecording(true);
      setElapsedSec(0);
      timerRef.current = setInterval(() => {
        setElapsedSec((value) => value + 1);
      }, 1000);
    } catch (error) {
      stopStream();
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось получить доступ к микрофону. Разрешите доступ в настройках браузера или загрузите файл.";
      setRecordError(message);
      resetRecorder();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.stop();
  };

  const discardRecording = () => {
    resetRecorder();
    revokePreview();
    onFileChange(null);
    setRecordError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fileLabel = file
    ? file.name
    : mode === "file"
      ? "Файл не выбран"
      : previewUrl
        ? "Запись готова к отправке"
        : "Запись не создана";

  return (
    <div className={["audio-source-input", className].filter(Boolean).join(" ")}>
      <div className="audio-source-tabs" role="tablist" aria-label="Способ добавления аудио">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "file"}
          className={`audio-source-tab${mode === "file" ? " is-active" : ""}`}
          disabled={disabled || isRecording}
          onClick={() => switchMode("file")}
        >
          Загрузить файл
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "record"}
          className={`audio-source-tab${mode === "record" ? " is-active" : ""}`}
          disabled={disabled || isRecording}
          onClick={() => switchMode("record")}
        >
          Записать с микрофона
        </button>
      </div>

      {mode === "file" ? (
        <input
          ref={fileInputRef}
          type="file"
          id={id}
          name={id}
          accept={accept}
          disabled={disabled}
          className={fileInputClassName}
          onChange={handleFileChange}
        />
      ) : (
        <div className="audio-source-record-panel">
          {!recordingAvailability.canRecord ? (
            <p className="audio-source-hint audio-source-hint-warning">
              {recordingAvailability.reason ??
                "Запись с микрофона недоступна. Загрузите готовый файл."}
            </p>
          ) : (
            <>
              <div className="audio-source-record-controls">
                {!isRecording ? (
                  <button
                    type="button"
                    className="btn-submit audio-source-record-btn"
                    disabled={disabled}
                    onClick={() => void startRecording()}
                  >
                    Начать запись
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-switch audio-source-record-btn"
                    disabled={disabled}
                    onClick={stopRecording}
                  >
                    Остановить
                  </button>
                )}
                <span className="audio-source-timer" aria-live="polite">
                  {formatRecordingDuration(elapsedSec)}
                </span>
                {previewUrl && !isRecording ? (
                  <button type="button" className="btn-switch" disabled={disabled} onClick={discardRecording}>
                    Удалить запись
                  </button>
                ) : null}
              </div>
              {previewUrl && !isRecording ? (
                <audio className="audio-source-preview" controls src={previewUrl} preload="metadata" />
              ) : null}
              <p className="audio-source-hint">После остановки запись можно прослушать и отправить вместе с формой.</p>
            </>
          )}
        </div>
      )}

      <p className="audio-source-file-name">{fileLabel}</p>
      {recordError ? <p className="audio-source-error">{recordError}</p> : null}
    </div>
  );
}
