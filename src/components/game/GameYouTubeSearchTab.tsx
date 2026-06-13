import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { GameCatalogItem } from "../../types/game";
import { searchYouTubeVideos, type YouTubeSearchItem } from "../../api/game";
import { getYouTubeThumb } from "../../utils/youtube";
import { GameSongGridCard } from "./GameSongGridCard";

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

function pickThumb(video: YouTubeSearchItem): string | null {
  return (
    video.snippet.thumbnails?.high?.url ||
    video.snippet.thumbnails?.medium?.url ||
    video.snippet.thumbnails?.default?.url ||
    getYouTubeThumb(`https://www.youtube.com/watch?v=${video.id.videoId}`, "hqdefault")
  );
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
      const items = await searchYouTubeVideos(query.trim(), 12);
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gts-youtube-search">
      <form className="gts-youtube-search__form" onSubmit={(e) => void handleSearch(e)}>
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

      <div className="gts-song-grid-scroll gts-lobby__picker">
        <div className="gts-song-grid">
        {loading && (
          <p className="gts-song-grid__empty" style={{ color: sub }}>
            <Loader2 size={20} className="gts-spin" color={accent} /> Ищем…
          </p>
        )}
        {!loading && searched && results.length === 0 && (
          <p className="gts-song-grid__empty" style={{ color: sub }}>
            Ничего не найдено
          </p>
        )}
        {!loading &&
          results.map((video) => {
            const item = toCatalogItem(video);
            const picked = selectedIds.has(item.performance_id);
            return (
              <GameSongGridCard
                key={item.performance_id}
                thumbUrl={pickThumb(video)}
                title={item.song}
                subtitle={item.artist}
                selected={picked}
                disabled={picked}
                textColor={text}
                subColor={sub}
                cardBorder={cardBorder}
                inputBg={inputBg}
                onClick={() => onAdd(item)}
              />
            );
          })}
        {!loading && !searched && (
          <p className="gts-song-grid__empty" style={{ color: sub }}>
            Введите название песни или артиста — можно добавить любой трек с YouTube
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
