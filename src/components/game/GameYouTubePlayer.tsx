import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Theme } from "../../types/contest";
import { UserAvatar } from "../UserAvatar";
import { getYouTubeId, loadYouTubeIframeAPI, type YTPlayer } from "../../utils/youtube";

export type PlayerMode = "audio" | "video" | "video_full" | "silent";

export type PlayerOverlay =
  | { kind: "buzzed"; username: string; avatarUrl?: string | null }
  | { kind: "paused" };

type Props = {
  youtubeLink: string;
  mode: PlayerMode;
  active: boolean;
  paused: boolean;
  startSeconds: number;
  instanceKey: string;
  overlay?: PlayerOverlay | null;
  theme?: Theme;
  onPlaybackReady?: () => void;
};

type PlaybackProps = {
  active: boolean;
  paused: boolean;
  startSeconds: number;
  mode: PlayerMode;
  isVideoSurface: boolean;
};

const SEEK_TOLERANCE_SEC = 3;
const SEEK_STABILIZE_MS = 140;
const PLAY_VERIFY_MS = 420;
const MAX_SYNC_ATTEMPTS = 8;

function destroyYouTubePlayer(player: YTPlayer | null, host: HTMLDivElement | null) {
  try {
    player?.destroy();
  } catch {
    // iframe may already be detached
  }
  if (host) {
    host.replaceChildren();
  }
}

function targetStartSec(props: PlaybackProps): number {
  return props.mode === "video_full" ? 0 : Math.max(0, props.startSeconds);
}

function shouldPlay(props: PlaybackProps): boolean {
  return props.active && !props.paused && props.mode !== "silent";
}

function loadKey(videoId: string, props: PlaybackProps): string {
  return `${videoId}:${targetStartSec(props)}`;
}

function getPlayerState(player: YTPlayer): number | null {
  try {
    return player.getPlayerState?.() ?? null;
  } catch {
    return null;
  }
}

function getCurrentTime(player: YTPlayer): number | null {
  try {
    const t = player.getCurrentTime?.();
    return typeof t === "number" && Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

function isPlayingState(state: number | null): boolean {
  if (state == null) return false;
  const { PLAYING, BUFFERING } = window.YT?.PlayerState ?? {};
  return state === PLAYING || state === BUFFERING;
}

function pauseSafe(player: YTPlayer) {
  try {
    player.pauseVideo();
  } catch {
    // ignore
  }
}

function seekSafe(player: YTPlayer, sec: number) {
  try {
    player.seekTo(sec, true);
  } catch {
    // ignore
  }
}

function cueVideoOnPlayer(player: YTPlayer, videoId: string, props: PlaybackProps) {
  const startAt = targetStartSec(props);
  const args = { videoId, startSeconds: startAt };
  try {
    if (player.cueVideoById) {
      player.cueVideoById(args);
      return;
    }
    player.loadVideoById?.(args);
  } catch {
    // ignore
  }
}

function stabilizeSeek(player: YTPlayer, targetSec: number, onDone: () => void) {
  seekSafe(player, targetSec);
  window.setTimeout(() => {
    seekSafe(player, targetSec);
    pauseSafe(player);
    window.setTimeout(onDone, SEEK_STABILIZE_MS);
  }, SEEK_STABILIZE_MS);
}

function beginPlayback(
  player: YTPlayer,
  props: PlaybackProps,
  sessionGen: number,
  playbackGenRef: { current: number },
  onReady?: () => void,
  attempt = 0
) {
  if (sessionGen !== playbackGenRef.current) return;

  if (!shouldPlay(props)) {
    pauseSafe(player);
    return;
  }

  const targetSec = targetStartSec(props);

  const startMutedPlayback = () => {
    if (sessionGen !== playbackGenRef.current) return;
    try {
      player.mute?.();
      player.playVideo();
    } catch {
      // ignore
    }
  };

  stabilizeSeek(player, targetSec, () => {
    if (sessionGen !== playbackGenRef.current) return;
    startMutedPlayback();

    window.setTimeout(() => {
      if (sessionGen !== playbackGenRef.current) return;

      const state = getPlayerState(player);
      const current = getCurrentTime(player);
      const playing = isPlayingState(state);
      const timeOk =
        targetSec <= 0 || current == null || Math.abs(current - targetSec) <= SEEK_TOLERANCE_SEC;

      if (playing && timeOk) {
        try {
          player.unMute?.();
        } catch {
          // ignore
        }
        onReady?.();
        return;
      }

      if (attempt >= MAX_SYNC_ATTEMPTS) {
        try {
          player.unMute?.();
        } catch {
          // ignore
        }
        if (playing) onReady?.();
        return;
      }

      pauseSafe(player);
      beginPlayback(player, props, sessionGen, playbackGenRef, onReady, attempt + 1);
    }, PLAY_VERIFY_MS);
  });
}

export function GamePlayerPlaceholder({ label = "🔇 Пауза" }: { label?: string }) {
  return (
    <div className="gts-player gts-player--silent">
      <div className="gts-silent-hint">{label}</div>
    </div>
  );
}

export function GameYouTubePlayer({
  youtubeLink,
  mode,
  active,
  paused,
  startSeconds,
  instanceKey,
  overlay,
  theme = "dark-blue",
  onPlaybackReady,
}: Props) {
  const onPlaybackReadyRef = useRef(onPlaybackReady);
  onPlaybackReadyRef.current = onPlaybackReady;
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const playbackGenRef = useRef(0);
  const propsRef = useRef<PlaybackProps>({
    active,
    paused,
    startSeconds,
    mode,
    isVideoSurface: mode === "video" || mode === "video_full",
  });
  const [ready, setReady] = useState(false);
  const videoId = getYouTubeId(youtubeLink);

  const isVideoSurface = mode === "video" || mode === "video_full";
  const showBuzzed = overlay?.kind === "buzzed" && !isVideoSurface;
  const showAudioVisual = mode === "audio" && active && !paused && !showBuzzed;
  const showSilent = !showAudioVisual && !isVideoSurface;

  propsRef.current = { active, paused, startSeconds, mode, isVideoSurface };

  const signalReady = () => {
    onPlaybackReadyRef.current?.();
  };

  const runPlayback = () => {
    const player = playerRef.current;
    if (!player || !ready || !videoId) return;
    const gen = ++playbackGenRef.current;
    beginPlayback(player, propsRef.current, gen, playbackGenRef, signalReady);
  };

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !videoId) return;

    let cancelled = false;
    playbackGenRef.current += 1;
    setReady(false);
    loadedKeyRef.current = null;

    loadYouTubeIframeAPI().then(() => {
      if (cancelled || !window.YT || !host.isConnected) return;

      destroyYouTubePlayer(playerRef.current, host);
      playerRef.current = null;

      const mount = document.createElement("div");
      mount.className = "gts-yt-mount-inner";
      host.appendChild(mount);

      try {
        new window.YT.Player(mount, {
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: { target: YTPlayer }) => {
              if (cancelled) return;
              playerRef.current = event.target;
              setReady(true);
              const props = propsRef.current;
              cueVideoOnPlayer(event.target, videoId, props);
              loadedKeyRef.current = loadKey(videoId, props);
              runPlayback();
            },
            onStateChange: (event: { data: number }) => {
              if (cancelled) return;
              const player = playerRef.current;
              if (!player) return;
              const props = propsRef.current;

              if (event.data === window.YT?.PlayerState?.PLAYING || event.data === window.YT?.PlayerState?.BUFFERING) {
                signalReady();
              }

              if (!shouldPlay(props)) return;

              if (
                event.data === window.YT?.PlayerState?.CUED ||
                event.data === window.YT?.PlayerState?.UNSTARTED
              ) {
                runPlayback();
              }
            },
          },
        });
      } catch {
        // ignore init errors
      }
    });

    return () => {
      cancelled = true;
      playbackGenRef.current += 1;
      setReady(false);
      destroyYouTubePlayer(playerRef.current, host);
      playerRef.current = null;
      loadedKeyRef.current = null;
    };
  }, [instanceKey, videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !ready || !videoId) return;

    const props = propsRef.current;
    const nextLoadKey = loadKey(videoId, props);
    if (loadedKeyRef.current !== nextLoadKey) {
      loadedKeyRef.current = nextLoadKey;
      cueVideoOnPlayer(player, videoId, props);
    }

    runPlayback();
  }, [ready, videoId, active, paused, mode, startSeconds, isVideoSurface]);

  if (!videoId || !youtubeLink.trim()) {
    return <GamePlayerPlaceholder />;
  }

  return (
    <div
      className={`gts-player ${isVideoSurface ? "gts-player--video gts-player-reveal-in" : showSilent ? "gts-player--silent" : "gts-player--audio"}`}
    >
      {showAudioVisual && (
        <div className="gts-audio-visual">
          <div className="gts-equalizer">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="gts-eq-bar" />
            ))}
          </div>
        </div>
      )}
      {showBuzzed && (
        <div className="gts-player-buzzed">
          <UserAvatar
            username={overlay.username}
            avatarUrl={overlay.avatarUrl}
            size={64}
            theme={theme}
          />
          <p className="gts-player-buzzed__name">{overlay.username}</p>
          <p className="gts-player-buzzed__label">отвечает</p>
        </div>
      )}
      {showSilent && !showBuzzed && (
        <div className="gts-silent-hint">{overlay?.kind === "paused" ? "⏸ Пауза" : "🔇 Пауза"}</div>
      )}
      {!isVideoSurface && <div className="gts-yt-shield" aria-hidden />}
      <div
        ref={hostRef}
        className={`gts-yt-host ${isVideoSurface ? "gts-yt-host--visible" : "gts-yt-host--hidden"}`}
      />
    </div>
  );
}
