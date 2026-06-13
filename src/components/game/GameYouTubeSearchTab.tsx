import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { GameCatalogItem } from "../../types/game";
import { searchYouTubeVideos, type YouTubeSearchItem } from "../../api/game";
import { getYouTubeThumb } from "../../utils/youtube";

type Props = {
  selectedIds: Set<string>;
  onAdd: (item: GameCatalogItem) => void;
  text: string;
  sub: string;
  cardBorder: string;
  inputBg: string;
  accent: string;
};

function parseYouTubeTitle(title: string): { artist: string; song: string } {
  const cleaned = title.replace(/\s*\[.*?\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, "").trim();
  const parts = cleaned.split(/\s[-–—|]\s/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), song: parts.slice(1).join(" - ").trim() };
  }
  return { artist: "YouTube", song: cleaned || "Без названия" };
}

function toCatalogItem(video: YouTubeSearchItem): GameCatalogItem {
  const videoId = video.id.videoId;
  const { artist, song } = parseYouTubeTitle(video.snippet.title);
  return {
    performance_id: `yt:${videoId}`,
    artist: video.snippet.channelTitle || artist,
    song,
    country_name: "YouTube",
    flag_emoji: "🎵",
    year: 0,
    contest_type: "youtube",
    youtube_link: `https://www.youtube.com/watch?v=${videoId}`,
    custom: true,
  };
}

export function GameYouTubeSearchTab({
  selectedIds,
  onAdd,
  text,
  sub,
  cardBorder,
  inputBg,
  accent,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<YouTubeSearchItem[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const items = await searchYouTubeVideos(query.trim(), 10);
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={(e) => void handleSearch(e)} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск любого трека на YouTube…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            border: cardBorder,
            background: inputBg,
            color: text,
          }}
        />
        <button type="submit" className="gts-btn gts-btn--primary" disabled={loading || !query.trim()}>
          {loading ? <Loader2 size={16} className="gts-spin" /> : <Search size={16} />}
        </button>
      </form>

      <div className="gts-song-picker">
        {loading && (
          <p style={{ textAlign: "center", color: sub, padding: 16 }}>
            <Loader2 size={20} className="gts-spin" color={accent} /> Ищем…
          </p>
        )}
        {!loading && searched && results.length === 0 && (
          <p style={{ textAlign: "center", color: sub, padding: 16 }}>Ничего не найдено</p>
        )}
        {!loading &&
          results.map((video) => {
            const item = toCatalogItem(video);
            const thumb =
              video.snippet.thumbnails?.medium?.url ||
              video.snippet.thumbnails?.default?.url ||
              getYouTubeThumb(item.youtube_link);
            const picked = selectedIds.has(item.performance_id);
            return (
              <button
                key={item.performance_id}
                type="button"
                className={`gts-song-item ${picked ? "gts-song-item--selected" : ""}`}
                style={{ color: text }}
                onClick={() => onAdd(item)}
                disabled={picked}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="gts-song-thumb" loading="lazy" />
                ) : (
                  <span className="gts-song-thumb gts-song-thumb--placeholder">🎬</span>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{item.song}</strong>
                  <span style={{ display: "block", fontSize: 12, color: sub }}>{item.artist}</span>
                </span>
                <span>{picked ? "✓" : "+"}</span>
              </button>
            );
          })}
        {!loading && !searched && (
          <p style={{ textAlign: "center", color: sub, padding: 20, fontSize: 13 }}>
            Введите название песни или артиста — можно добавить любой трек с YouTube
          </p>
        )}
      </div>
    </div>
  );
}
