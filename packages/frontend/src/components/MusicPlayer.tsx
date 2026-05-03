"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useConfig } from "@/hooks/useConfig";
import type { MusicTrack } from "@/lib/api";

function needsProxy(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function getAudioSrc(url: string): string {
  if (needsProxy(url)) {
    return `/api/audio-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MusicPlayer() {
  const config = useConfig();
  const playlist = config.musicPlaylist;
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const currentTrack = playlist[currentTrackIndex];

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const handlePlay = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const handlePause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

  const handlePrev = useCallback(() => {
    setCurrentTrackIndex((i) => (i - 1 + playlist.length) % playlist.length);
    setIsPlaying(false);
  }, [playlist.length]);

  const handleNext = useCallback(() => {
    setCurrentTrackIndex((i) => (i + 1) % playlist.length);
    setIsPlaying(false);
  }, [playlist.length]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
  }, [duration]);

  // Reset state on track change
  useEffect(() => {
    setLoading(true);
    setError(false);
    setCurrentTime(0);
    setDuration(0);
  }, [currentTrackIndex]);

  // Auto-play on track change
  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        audioRef.current?.play().catch(() => {
          setError(true);
          setIsPlaying(false);
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentTrackIndex, isPlaying]);

  if (playlist.length === 0) return null;

  const coverClass = isPlaying
    ? "music-cover-spin"
    : currentTime > 0
      ? "music-cover-spin music-cover-paused"
      : "";

  return (
    <div ref={containerRef} className="fixed bottom-16 left-4 z-40 lg:bottom-6 lg:left-6">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack ? getAudioSrc(currentTrack.url) : undefined}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          setDuration(audioRef.current?.duration ?? 0);
          if (audioRef.current?.duration && isFinite(audioRef.current.duration)) {
            setLoading(false);
          }
        }}
        onCanPlay={() => setLoading(false)}
        onPlay={() => { setIsPlaying(true); setError(false); }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleNext}
        onError={() => { setError(true); setLoading(false); setIsPlaying(false); }}
        onLoadStart={() => setLoading(true)}
      />

      {expanded ? (
        /* Expanded panel */
        <div
          className="flex items-center gap-3 p-3 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md shadow-lg"
          style={{ width: 280 }}
        >
          {/* Album cover */}
          <button
            onClick={handleToggle}
            className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--color-primary)] cursor-pointer"
            title={isPlaying ? "暂停" : "播放"}
          >
            {currentTrack?.cover ? (
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className={`w-full h-full object-cover ${coverClass}`}
              />
            ) : (
              <div
                className={`w-full h-full bg-[var(--color-sakura-bg)] flex items-center justify-center text-lg ${coverClass}`}
              >
                ♪
              </div>
            )}
          </button>

          {/* Info + controls */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[var(--color-text)] truncate">
              {currentTrack?.title ?? ""}
            </p>
            {currentTrack?.artist && (
              <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                {currentTrack.artist}
              </p>
            )}

            {/* Progress bar */}
            <div
              ref={progressRef}
              className="mt-1.5 h-1 rounded-full bg-[var(--color-border)] cursor-pointer group"
              onClick={handleSeek}
            >
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
            </div>

            {/* Time + controls */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
                {error ? "加载失败" : loading ? "加载中..." : `${formatTime(currentTime)} / ${formatTime(duration)}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  className="w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                  title="上一首"
                >
                  ⏮
                </button>
                <button
                  onClick={handleToggle}
                  className="w-7 h-7 flex items-center justify-center text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer text-sm"
                  title={isPlaying ? "暂停" : "播放"}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <button
                  onClick={handleNext}
                  className="w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                  title="下一首"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setExpanded(false)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer text-xs"
            title="收起"
          >
            ✕
          </button>
        </div>
      ) : (
        /* Collapsed: floating album cover */
        <button
          onClick={() => setExpanded(true)}
          className={`w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--color-primary)] shadow-lg cursor-pointer transition-transform hover:scale-110 ${coverClass}`}
          title={currentTrack ? `${currentTrack.title}${currentTrack.artist ? ` - ${currentTrack.artist}` : ""}` : "音乐播放器"}
        >
          {currentTrack?.cover ? (
            <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[var(--color-sakura-bg)] flex items-center justify-center text-lg">
              ♪
            </div>
          )}
        </button>
      )}
    </div>
  );
}
