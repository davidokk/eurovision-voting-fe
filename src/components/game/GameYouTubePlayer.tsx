import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getYouTubeId, loadYouTubeIframeAPI, type YTPlayer } from "../../utils/youtube";

export type PlayerMode = "audio" | "video" | "video_full" | "silent";

type Props = {
  youtubeLink: string;
  mode: PlayerMode;
  active: boolean;
  paused: boolean;
  startSeconds: number;
  instanceKey: string;
  onPlaybackReady?: () => void;
};

type PlaybackProps = {
  active: boolean;
  paused: boolean;
  startSeconds: number;
  mode: PlayerMode;
  isVideoSurface: boolean;
};

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

function syncPlayback(player: YTPlayer, props: PlaybackProps, seekKeyRef: { current: string | null }) {
  const { active, paused, startSeconds, mode, isVideoSurface } = props;
  const shouldPlay = active && !paused && mode !== "silent";

  if (!shouldPlay) {
    try {
      player.pauseVideo();
    } catch {
      // ignore
    }
    return;
  }

  const seekTo = mode === "video_full" ? 0 : Math.max(0, startSeconds);
  const seekKey = `${mode}:${seekTo}`;
  if (seekKeyRef.current !== seekKey) {
    seekKeyRef.current = seekKey;
    try {
      player.seekTo(seekTo, true);
    } catch {
      // ignore
    }
  }

  if (isVideoSurface) {
    try {
      player.mute?.();
    } catch {
      // ignore
    }
  }

  try {
    player.playVideo();
  } catch {
    // ignore
  }

  if (isVideoSurface) {
    window.setTimeout(() => {
      try {
        player.unMute?.();
      } catch {
        // ignore
      }
    }, 300);
  }
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
  onPlaybackReady,
}: Props) {
  const onPlaybackReadyRef = useRef(onPlaybackReady);
  onPlaybackReadyRef.current = onPlaybackReady;
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const seekKeyRef = useRef<string | null>(null);
  const initialSyncDoneRef = useRef(false);
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
  const mountKey = `${instanceKey}-${isVideoSurface ? mode : "audio"}`;
  const showAudioVisual = mode === "audio" && active && !paused;
  const showSilent = !showAudioVisual && !isVideoSurface;

  propsRef.current = { active, paused, startSeconds, mode, isVideoSurface };

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!videoId || !host) return;

    let cancelled = false;
    setReady(false);
    seekKeyRef.current = null;
    initialSyncDoneRef.current = false;

    const mount = document.createElement("div");
    mount.className = "gts-yt-mount-inner";
    host.appendChild(mount);

    const startAt = Math.max(0, startSeconds);

    loadYouTubeIframeAPI().then(() => {
      if (cancelled || !window.YT || !mount.isConnected) return;

      destroyYouTubePlayer(playerRef.current, null);
      playerRef.current = null;

      try {
        new window.YT.Player(mount, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            start: startAt,
            controls: isVideoSurface ? 1 : 0,
            disablekb: isVideoSurface ? 0 : 1,
            fs: isVideoSurface ? 1 : 0,
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
              syncPlayback(event.target, propsRef.current, seekKeyRef);
              onPlaybackReadyRef.current?.();
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
    };
  }, [videoId, mountKey, isVideoSurface, startSeconds]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !ready) return;
    if (!initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      return;
    }
    syncPlayback(player, propsRef.current, seekKeyRef);
  }, [ready, active, paused, mode, startSeconds, isVideoSurface]);

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
          <div className="gts-audio-hint">🎧 Слушайте и угадывайте…</div>
        </div>
      )}
      {showSilent && <div className="gts-silent-hint">🔇 Пауза</div>}
      <div
        ref={hostRef}
        className={`gts-yt-host ${isVideoSurface ? "gts-yt-host--visible" : "gts-yt-host--hidden"}`}
      />
    </div>
  );
}
