import { useEffect, useRef } from "react";
import { getYouTubeId, loadYouTubeIframeAPI, type YTPlayer } from "../../utils/youtube";

type Props = {
  youtubeLink: string;
  mode: "audio" | "video";
  paused: boolean;
  roundKey: string;
};

export function GameYouTubePlayer({ youtubeLink, mode, paused, roundKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const videoId = getYouTubeId(youtubeLink);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    let cancelled = false;

    loadYouTubeIframeAPI().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;

      playerRef.current?.destroy();
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: mode === "video" ? "100%" : "1",
        height: mode === "video" ? "100%" : "1",
        playerVars: {
          autoplay: 1,
          controls: mode === "video" ? 1 : 0,
          disablekb: mode === "audio" ? 1 : 0,
          fs: mode === "video" ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            if (!paused) e.target.playVideo();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, roundKey, mode]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (paused) p.pauseVideo();
    else p.playVideo();
  }, [paused]);

  if (!videoId) {
    return (
      <div className="gts-player gts-player--empty">
        <span>Видео недоступно</span>
      </div>
    );
  }

  return (
    <div
      className={`gts-player ${mode === "audio" ? "gts-player--audio" : "gts-player--video gts-player-reveal-in"}`}
    >
      {mode === "audio" && (
        <div className="gts-audio-visual">
          <div className="gts-equalizer">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`gts-eq-bar ${paused ? "gts-eq-bar--paused" : ""}`} />
            ))}
          </div>
          <p className="gts-audio-hint">🎧 Слушайте и угадывайте…</p>
        </div>
      )}
      <div ref={containerRef} className="gts-yt-mount" />
    </div>
  );
}
