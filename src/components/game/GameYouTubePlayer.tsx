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

const PLAY_RETRY_MS = 280;
const MAX_PLAY_RETRIES = 10;

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

function loadVideoOnPlayer(player: YTPlayer, videoId: string, props: PlaybackProps) {
  const startAt = targetStartSec(props);
  const args = { videoId, startSeconds: startAt };
  try {
    if (shouldPlay(props) && player.loadVideoById) {
      player.loadVideoById(args);
      return;
    }
    if (player.cueVideoById) {
      player.cueVideoById(args);
      return;
    }
    player.loadVideoById?.(args);
  } catch {
    // ignore
  }
}

function getPlayerState(player: YTPlayer): number | null {
  try {
    return player.getPlayerState?.() ?? null;
  } catch {
    return null;
  }
}

function isPlayingState(state: number | null): boolean {
  if (state == null) return false;
  const { PLAYING, BUFFERING } = window.YT?.PlayerState ?? {};
  return state === PLAYING || state === BUFFERING;
}

function syncPlayback(
  player: YTPlayer,
  props: PlaybackProps,
  seekKeyRef: { current: string | null },
  onReady?: () => void,
  retry = 0
) {
  if (!shouldPlay(props)) {
    try {
      player.pauseVideo();
    } catch {
      // ignore
    }
    return;
  }

  const seekTo = targetStartSec(props);
  const seekKey = `${seekTo}`;
  if (seekKeyRef.current !== seekKey) {
    seekKeyRef.current = seekKey;
    try {
      player.seekTo(seekTo, true);
    } catch {
      // ignore
    }
    if (seekTo > 0) {
      window.setTimeout(() => {
        try {
          player.seekTo(seekTo, true);
        } catch {
          // ignore
        }
      }, 200);
    }
  }

  const startPlayback = () => {
    try {
      player.mute?.();
      player.playVideo();
      window.setTimeout(() => {
        try {
          player.unMute?.();
        } catch {
          // ignore
        }
      }, props.isVideoSurface ? 350 : 120);
    } catch {
      // ignore
    }
  };

  startPlayback();

  window.setTimeout(() => {
    const state = getPlayerState(player);
    if (isPlayingState(state)) {
      onReady?.();
      return;
    }
    if (retry >= MAX_PLAY_RETRIES) return;

    if (state === window.YT?.PlayerState?.CUED || state === window.YT?.PlayerState?.UNSTARTED) {
      startPlayback();
    }
    syncPlayback(player, props, seekKeyRef, onReady, retry + 1);
  }, PLAY_RETRY_MS);
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
  const seekKeyRef = useRef<string | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
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

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !videoId) return;

    let cancelled = false;
    setReady(false);
    seekKeyRef.current = null;
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
              loadVideoOnPlayer(event.target, videoId, props);
              loadedKeyRef.current = loadKey(videoId, props);
              syncPlayback(event.target, props, seekKeyRef, signalReady);
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
                event.data === window.YT?.PlayerState?.PAUSED ||
                event.data === window.YT?.PlayerState?.UNSTARTED
              ) {
                syncPlayback(player, props, seekKeyRef, signalReady);
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
      setReady(false);
      destroyYouTubePlayer(playerRef.current, host);
      playerRef.current = null;
      loadedKeyRef.current = null;
      seekKeyRef.current = null;
    };
  }, [instanceKey, videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !ready || !videoId) return;

    const props = propsRef.current;
    const nextLoadKey = loadKey(videoId, props);
    if (loadedKeyRef.current !== nextLoadKey) {
      loadedKeyRef.current = nextLoadKey;
      seekKeyRef.current = null;
      loadVideoOnPlayer(player, videoId, props);
    }

    syncPlayback(player, props, seekKeyRef, signalReady);
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
