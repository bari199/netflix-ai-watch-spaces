import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Captions,
  LoaderCircle,
  Lock,
  GitBranch,
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/+$/,
  "",
);

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (value = 0) => {
  if (!Number.isFinite(value)) return "00:00";

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60);

  const pad = (number) => String(number).padStart(2, "0");

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

export default function CinematicPlayer({
  videoRef,
  videoUrl,
  thumbnailUrl,
  titleId,
  title,
  isHost = false,
  subtitleVariants = [],
  selectedSubtitle,
  onSubtitleChange,
  onPlay,
  onPause,
  onSeeked,
  pendingHeroStart = false,
  variationPoints = [],
}) {
  const containerRef = useRef(null);
  const hideControlsTimer = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showVotingMarkers, setShowVotingMarkers] = useState(true);
  const [isControlsLocked, setIsControlsLocked] = useState(false);

  const selectedVariantId =
    typeof selectedSubtitle === "string"
      ? selectedSubtitle
      : selectedSubtitle?.variantId || "";

  const displayTitle = title?.name || title?.title || title || "Now Playing";

  const canControlPlayback = isHost;
  const canStartFromHero = isHost && pendingHeroStart;

  const clearControlsTimer = () => {
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  };

  const scheduleHideControls = useCallback(() => {
    clearControlsTimer();

    if (isPlaying) {
      hideControlsTimer.current = window.setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 3000);
    }
  }, [isPlaying]);

  const revealControls = () => {
    if (isControlsLocked) return;
    setShowControls(true);
    scheduleHideControls();
  };

  const togglePlay = () => {
    if (isControlsLocked) return;
    const video = videoRef?.current;

    if (!video || !canControlPlayback) return;

    if (video.paused) {
      video.play().catch((error) => {
        console.error("Video playback failed:", error);
      });
    } else {
      video.pause();
    }
  };

  const seekBy = (seconds) => {
    if (isControlsLocked) return;
    const video = videoRef?.current;

    if (!video || !canControlPlayback || !Number.isFinite(video.duration)) {
      return;
    }

    video.currentTime = Math.max(
      0,
      Math.min(video.currentTime + seconds, video.duration),
    );
  };

  const handleSeek = (event) => {
    if (isControlsLocked) return;
    const video = videoRef?.current;

    if (!video || !canControlPlayback) return;

    const nextTime = Number(event.target.value);

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  useEffect(() => {
    const video = videoRef?.current;

    if (!video) return;

    const syncMediaState = () => {
      setIsPlaying(!video.paused && !video.ended);
      setCurrentTime(
        Number.isFinite(video.currentTime) ? video.currentTime : 0,
      );
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setVolume(video.volume);
      setIsMuted(video.muted);
      setPlaybackRate(video.playbackRate || 1);
    };

    syncMediaState();
    video.addEventListener("loadedmetadata", syncMediaState);
    video.addEventListener("durationchange", syncMediaState);
    video.addEventListener("timeupdate", syncMediaState);
    video.addEventListener("volumechange", syncMediaState);
    video.addEventListener("ratechange", syncMediaState);
    video.addEventListener("play", syncMediaState);
    video.addEventListener("pause", syncMediaState);

    return () => {
      video.removeEventListener("loadedmetadata", syncMediaState);
      video.removeEventListener("durationchange", syncMediaState);
      video.removeEventListener("timeupdate", syncMediaState);
      video.removeEventListener("volumechange", syncMediaState);
      video.removeEventListener("ratechange", syncMediaState);
      video.removeEventListener("play", syncMediaState);
      video.removeEventListener("pause", syncMediaState);
    };
  }, [videoRef, videoUrl]);

  const handleVolumeChange = (event) => {
    if (isControlsLocked) return;
    const nextVolume = Number(event.target.value);
    const video = videoRef?.current;

    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);

    if (video) {
      video.volume = nextVolume;
      video.muted = nextVolume === 0;
    }
  };

  const toggleMute = () => {
    if (isControlsLocked) return;
    const video = videoRef?.current;

    if (!video) return;

    const nextMuted = !video.muted;

    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && video.volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
  };

  const toggleFullscreen = async () => {
    if (isControlsLocked) return;
    const container = containerRef.current;

    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  };

  const changePlaybackRate = (rate) => {
    if (isControlsLocked) return;
    const video = videoRef?.current;

    if (!video || !canControlPlayback) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const handleSubtitleChange = (variantId) => {
    if (isControlsLocked) return;
    onSubtitleChange?.(variantId);
    setShowSettings(false);
  };

  // Video state synchronization
  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsBuffering(false);
    onPlay?.();
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    setShowControls(true);
    onPause?.();
  };

  const handleTimeUpdate = () => {
    const video = videoRef?.current;

    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef?.current;

    if (!video) return;

    setDuration(video.duration || 0);
    setCurrentTime(video.currentTime || 0);
  };

  // Subtitle track activation
  useEffect(() => {
    const video = videoRef?.current;

    if (!video?.textTracks) return;

    const updateSubtitleTracks = () => {
      Array.from(video.textTracks).forEach((track) => {
        track.mode = "disabled";
      });

      if (!selectedVariantId) return;

      const selectedTrack = Array.from(video.textTracks).find(
        (track) =>
          track.label ===
          subtitleVariants.find(
            (variant) => variant.variantId === selectedVariantId,
          )?.label,
      );

      if (selectedTrack) {
        selectedTrack.mode = "showing";
      }
    };

    updateSubtitleTracks();

    return () => {
      clearControlsTimer();
    };
  }, [selectedVariantId, subtitleVariants, videoRef]);

  // Fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Buffering state
  useEffect(() => {
    const video = videoRef?.current;

    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [videoRef]);

  useEffect(() => {
    return () => clearControlsTimer();
  }, []);

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div
        ref={containerRef}
        onMouseMove={revealControls}
        onMouseLeave={() => {
          if (isPlaying) {
            setShowControls(false);
            setShowSettings(false);
          }
        }}
        onTouchStart={revealControls}
        className="group relative isolate mx-auto aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-black/40 sm:rounded-2xl"
      >
        {/* Main video element */}
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          controls={false}
          playsInline
          preload="metadata"
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={onSeeked}
          onClick={() => {
            if (isControlsLocked) return;
            if (canStartFromHero && videoRef.current?.paused) {
              videoRef.current.play().catch((error) => {
                console.error("Video playback failed:", error);
              });
              return;
            }
            togglePlay();
          }}
          className="h-full w-full bg-black object-contain"
        >
          {subtitleVariants.map((variant) => (
            <track
              key={variant.variantId}
              kind="subtitles"
              srcLang={variant.locale}
              label={variant.label}
              src={`${API_BASE_URL}/titles/${titleId}/subtitle-variants/${variant.variantId}`}
              default={variant.variantId === selectedVariantId}
            />
          ))}
        </video>

        {/* Cinematic overlay */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Top bar */}
        <AnimatePresence>
          {showControls && !isControlsLocked && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-5"
            >
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-500 sm:text-[10px]">
                  Netflix Watch Spaces
                </p>

                <h2 className="mt-1 truncate text-sm font-bold text-white sm:text-lg">
                  {displayTitle}
                </h2>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[9px] font-bold text-white/80 backdrop-blur-md">
                  {isHost ? "HOST" : "VIEWER"}
                </span>

                <span className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[9px] font-bold text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  LIVE
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buffering */}
        <AnimatePresence>
          {isBuffering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/20"
            >
              <LoaderCircle size={42} className="animate-spin text-red-600" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center controls */}
        <AnimatePresence>
          {showControls && !isControlsLocked && !isBuffering && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              <div className="flex items-center gap-5 sm:gap-9">
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  disabled={!canControlPlayback}
                  aria-label="Rewind 10 seconds"
                  className="rounded-full p-2 text-white transition hover:bg-white/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 sm:p-3"
                >
                  <SkipBack size={25} />
                  <span className="block text-center text-[9px] font-semibold">
                    10s
                  </span>
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!canControlPlayback}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-xl backdrop-blur-xl transition hover:scale-110 hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40 sm:h-20 sm:w-20"
                >
                  {isPlaying ? (
                    <Pause size={30} fill="white" />
                  ) : (
                    <Play size={30} fill="white" className="ml-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  disabled={!canControlPlayback}
                  aria-label="Forward 10 seconds"
                  className="rounded-full p-2 text-white transition hover:bg-white/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 sm:p-3"
                >
                  <SkipForward size={25} />
                  <span className="block text-center text-[9px] font-semibold">
                    10s
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom controls */}
        <AnimatePresence>
          {showControls && !isControlsLocked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 pt-10 sm:px-5 sm:pb-5"
            >
              {/* Progress bar */}
              <div className="group/progress relative mb-3 flex h-4 items-center">
                <div className="absolute h-1 w-full overflow-hidden rounded-full bg-white/30 transition-all group-hover/progress:h-1.5">
                  <div
                    className="h-full rounded-full bg-red-600"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={Math.min(currentTime, duration || 0)}
                  onChange={handleSeek}
                  disabled={!canControlPlayback || !duration}
                  aria-label="Video progress"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />

                {showVotingMarkers &&
                  duration > 0 &&
                  variationPoints.map((point) => {
                    const markerTime = Number(point.startTime);
                    if (
                      !Number.isFinite(markerTime) ||
                      markerTime < 0 ||
                      markerTime > duration
                    )
                      return null;
                    return (
                      <span
                        key={point.eventId || point.variationId}
                        title={`${point.description || point.text || "Voting point"} · ${formatTime(markerTime)}`}
                        aria-label={`Voting point at ${formatTime(markerTime)}`}
                        className="pointer-events-none absolute z-20 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                        style={{ left: `${(markerTime / duration) * 100}%` }}
                      />
                    );
                  })}

                <div
                  className="pointer-events-none absolute h-3 w-3 rounded-full bg-red-600 opacity-0 transition-opacity group-hover/progress:opacity-100"
                  style={{
                    left: `calc(${progress}% - 6px)`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-white">
                {/* Left controls */}
                <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!canControlPlayback}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="transition hover:text-red-400 disabled:opacity-40"
                  >
                    {isPlaying ? (
                      <Pause size={20} fill="currentColor" />
                    ) : (
                      <Play size={20} fill="currentColor" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    className="transition hover:text-red-400"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={19} />
                    ) : (
                      <Volume2 size={19} />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume"
                    className="hidden h-1 w-20 cursor-pointer accent-red-600 sm:block"
                  />

                  <span className="whitespace-nowrap text-[10px] text-white/75 sm:text-xs">
                    {formatTime(currentTime)}
                    <span className="mx-1 text-white/40">/</span>
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Right controls */}
                <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                  {variationPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowVotingMarkers((visible) => !visible)
                      }
                      aria-label={
                        showVotingMarkers
                          ? "Hide voting timeline markers"
                          : "Show voting timeline markers"
                      }
                      aria-pressed={showVotingMarkers}
                      title={
                        showVotingMarkers
                          ? "Hide voting markers"
                          : "Show voting markers"
                      }
                      className={`transition hover:text-red-400 ${showVotingMarkers ? "text-red-400" : "text-white/55"}`}
                    >
                      <GitBranch size={19} />
                    </button>
                  )}
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowSettings((value) => !value)}
                      aria-label="Subtitle and playback settings"
                      className="flex h-8 w-8 items-center justify-center transition hover:text-red-400"
                    >
                      <Settings size={19} />
                    </button>

                    <AnimatePresence>
                      {showSettings && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute bottom-9 right-0 z-50 max-h-72 w-52 overflow-y-auto rounded-xl border border-white/10 bg-[#171717] p-3 shadow-2xl"
                        >
                          <p className="mb-3 text-xs font-bold text-white">
                            Playback settings
                          </p>

                          {isHost && (
                            <>
                              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-white/40">
                                Playback speed
                              </p>

                              <div className="mb-3 grid grid-cols-3 gap-1">
                                {PLAYBACK_RATES.map((rate) => (
                                  <button
                                    key={rate}
                                    type="button"
                                    onClick={() => changePlaybackRate(rate)}
                                    className={`rounded-md px-2 py-1.5 text-[10px] transition ${
                                      playbackRate === rate
                                        ? "bg-red-600 text-white"
                                        : "bg-white/5 text-white/70 hover:bg-white/10"
                                    }`}
                                  >
                                    {rate}x
                                  </button>
                                ))}
                              </div>
                            </>
                          )}

                          <div className="mb-2 flex items-center gap-2">
                            <Captions size={14} className="text-red-400" />
                            <p className="text-[10px] font-bold text-white">
                              Subtitles
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSubtitleChange("")}
                            className={`w-full rounded-md px-2 py-2 text-left text-[10px] transition hover:bg-white/10 ${
                              !selectedVariantId
                                ? "text-red-400"
                                : "text-white/70"
                            }`}
                          >
                            Off
                          </button>

                          {subtitleVariants.map((variant) => (
                            <button
                              key={variant.variantId}
                              type="button"
                              onClick={() =>
                                handleSubtitleChange(variant.variantId)
                              }
                              className={`w-full rounded-md px-2 py-2 text-left text-[10px] transition hover:bg-white/10 ${
                                selectedVariantId === variant.variantId
                                  ? "text-red-400"
                                  : "text-white/70"
                              }`}
                            >
                              {variant.label} ({variant.locale})
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsControlsLocked(true);
                      setShowSettings(false);
                      setShowControls(false);
                    }}
                    aria-label="Lock video controls"
                    title="Lock controls"
                    className="flex h-8 w-8 items-center justify-center transition hover:text-red-400"
                  >
                    <Lock size={19} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="Toggle fullscreen"
                    className="transition hover:text-red-400"
                  >
                    {isFullscreen ? (
                      <Minimize size={19} />
                    ) : (
                      <Maximize size={19} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal lock indicator; video remains visually unchanged */}
        {isControlsLocked && (
          <button
            type="button"
            onClick={() => {
              setIsControlsLocked(false);
              setShowControls(true);
              scheduleHideControls();
            }}
            aria-label="Unlock video controls"
            title="Unlock controls"
            className="absolute left-4 top-4 z-40 rounded-full border border-white/20 bg-black/65 p-2.5 text-white shadow-lg transition hover:scale-105 hover:bg-black/85"
          >
            <Lock size={19} />
          </button>
        )}

        {/* Viewer permission indicator */}
        {!isHost && showControls && (
          <div className="absolute bottom-[68px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[9px] text-white/65 backdrop-blur-md sm:bottom-[82px]">
            <Lock size={11} />
            Playback controlled by host
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[10px] text-white/45">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          Watching together
        </p>

        <p className="text-[9px] font-medium tracking-wider text-white/30">
          {isHost ? "HOST CONTROLS ENABLED" : "SYNCED VIEWER MODE"}
        </p>
      </div>
    </motion.section>
  );
}
