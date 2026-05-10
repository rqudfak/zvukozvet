"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function formatDuration(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return "--:--";
  }
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function pauseOtherPortfolioAudios(current: HTMLAudioElement) {
  document.querySelectorAll("audio.portfolio-native-audio").forEach((element) => {
    if (element !== current && element instanceof HTMLAudioElement) {
      element.pause();
    }
  });
}

type PortfolioStyleAudioPlayerProps = {
  src?: string | null;
  className?: string;
};

export default function PortfolioStyleAudioPlayer({ src, className }: PortfolioStyleAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationLabel, setDurationLabel] = useState("--:--");
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setDurationLabel("--:--");
    setIsSeeking(false);
    audioRef.current?.pause();
  }, [src]);

  const seek = useCallback((percentValue: number, shouldStartPlayback: boolean) => {
    const targetAudio = audioRef.current;
    if (!targetAudio || !Number.isFinite(targetAudio.duration) || targetAudio.duration <= 0) return;

    pauseOtherPortfolioAudios(targetAudio);

    const clampedPercent = Math.min(100, Math.max(0, percentValue));
    targetAudio.currentTime = targetAudio.duration * (clampedPercent / 100);
    setProgress(clampedPercent);

    if (targetAudio.paused && shouldStartPlayback) {
      void targetAudio
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch(() => {
          setPlaying(false);
        });
      return;
    }

    if (!targetAudio.paused) {
      setPlaying(true);
    }
  }, []);

  const togglePlayback = useCallback(() => {
    const targetAudio = audioRef.current;
    if (!targetAudio) return;

    pauseOtherPortfolioAudios(targetAudio);

    if (targetAudio.paused) {
      void targetAudio.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        setPlaying(false);
      });
      return;
    }

    targetAudio.pause();
    setPlaying(false);
  }, []);

  if (!src) {
    return null;
  }

  return (
    <div className={`portfolio-item-audio ${className ?? ""}`.trim()}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        className="portfolio-native-audio"
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
          if (isSeeking) return;
          setProgress((audio.currentTime / audio.duration) * 100);
        }}
        onLoadedMetadata={(event) => {
          setDurationLabel(formatDuration(event.currentTarget.duration));
        }}
      />
      <div className="portfolio-audio-player">
        <button
          type="button"
          className={`portfolio-audio-play ${playing ? "is-playing" : ""}`}
          onClick={togglePlayback}
          aria-label={playing ? "Пауза" : "Воспроизвести"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          className="portfolio-audio-seek"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onMouseDown={() => {
            setIsSeeking(true);
          }}
          onTouchStart={() => {
            setIsSeeking(true);
          }}
          onInput={(event) => {
            const percent = Number(event.currentTarget.value);
            seek(percent, false);
          }}
          onChange={(event) => {
            const percent = Number(event.currentTarget.value);
            setIsSeeking(false);
            seek(percent, true);
          }}
        />
        <span className="portfolio-audio-duration">{durationLabel}</span>
      </div>
    </div>
  );
}
