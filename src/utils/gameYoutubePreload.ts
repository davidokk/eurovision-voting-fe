import { getYouTubeId, loadYouTubeIframeAPI, type YTPlayer } from "./youtube";

type PreloadEntry = {
  videoId: string;
  host: HTMLDivElement;
  player: YTPlayer | null;
  ready: boolean;
};

const MAX_POOL = 24;
const PRELOAD_CONCURRENCY = 3;

class GameYoutubePreloadPool {
  private entries = new Map<string, PreloadEntry>();
  private queue: string[] = [];
  private active = 0;
  private poolRoot: HTMLDivElement | null = null;

  private ensureRoot() {
    if (this.poolRoot?.isConnected) return this.poolRoot;
    const root = document.createElement("div");
    root.className = "gts-yt-preload-pool";
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
    this.poolRoot = root;
    return root;
  }

  private trimPool() {
    if (this.entries.size <= MAX_POOL) return;
    for (const [id, entry] of this.entries) {
      if (this.entries.size <= MAX_POOL) break;
      try {
        entry.player?.destroy();
      } catch {
        // ignore
      }
      entry.host.remove();
      this.entries.delete(id);
    }
  }

  private pump() {
    while (this.active < PRELOAD_CONCURRENCY && this.queue.length > 0) {
      const videoId = this.queue.shift();
      if (!videoId || this.entries.has(videoId)) continue;
      this.active++;
      void this.createEntry(videoId).finally(() => {
        this.active--;
        this.pump();
      });
    }
  }

  private async createEntry(videoId: string) {
    await loadYouTubeIframeAPI();
    if (this.entries.has(videoId)) return;

    const root = this.ensureRoot();
    const host = document.createElement("div");
    host.className = "gts-yt-preload-item";
    root.appendChild(host);

    const entry: PreloadEntry = { videoId, host, player: null, ready: false };
    this.entries.set(videoId, entry);

    await new Promise<void>((resolve) => {
      if (!window.YT?.Player) {
        resolve();
        return;
      }

      try {
        new window.YT.Player(host, {
          videoId,
          width: 1,
          height: 1,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: { target: YTPlayer }) => {
              entry.player = event.target;
              entry.ready = true;
              try {
                event.target.mute?.();
                event.target.pauseVideo();
              } catch {
                // ignore warmup errors
              }
              resolve();
            },
            onError: () => resolve(),
          },
        });
      } catch {
        resolve();
      }

      window.setTimeout(resolve, 8000);
    });

    this.trimPool();
  }

  schedule(links: string[], priorityRoundIndex = 0) {
    const ordered: string[] = [];
    const seen = new Set<string>();

    const addLink = (link: string | null | undefined) => {
      const id = getYouTubeId(link ?? "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      ordered.push(id);
    };

    if (priorityRoundIndex >= 0 && priorityRoundIndex < links.length) {
      addLink(links[priorityRoundIndex]);
      for (let i = priorityRoundIndex + 1; i < links.length; i++) addLink(links[i]);
      for (let i = 0; i < priorityRoundIndex; i++) addLink(links[i]);
    } else {
      for (const link of links) addLink(link);
    }

    this.queue = ordered.filter((id) => !this.entries.has(id));
    this.pump();
  }

  isWarm(videoId: string | null): boolean {
    if (!videoId) return false;
    return this.entries.get(videoId)?.ready ?? false;
  }

  dispose() {
    for (const entry of this.entries.values()) {
      try {
        entry.player?.destroy();
      } catch {
        // ignore
      }
      entry.host.remove();
    }
    this.entries.clear();
    this.queue = [];
    this.poolRoot?.remove();
    this.poolRoot = null;
  }
}

export const gameYoutubePreloadPool = new GameYoutubePreloadPool();

export function scheduleGamePlaylistPreload(links: string[], currentRoundIndex = 0) {
  if (!links.length) return;
  gameYoutubePreloadPool.schedule(links, currentRoundIndex);
}
