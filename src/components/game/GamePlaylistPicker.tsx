import { useMemo } from "react";
import type { GameCatalogItem } from "../../types/game";
import { getYouTubeThumb } from "../../utils/youtube";
import { contestTypeLabel } from "../../utils/contestLabels";
import { getDoesBrowserSupportFlagEmojis } from "../../utils/emojiSupport";
import { GameYouTubeSearchTab } from "./GameYouTubeSearchTab";

type Props = {
  catalog: GameCatalogItem[];
  selectedIds: Set<string>;
  pickTab: "eurovision" | "youtube";
  catalogQuery: string;
  onPickTabChange: (tab: "eurovision" | "youtube") => void;
  onCatalogQueryChange: (q: string) => void;
  onToggleSong: (item: GameCatalogItem) => void;
  onAddTrack: (item: GameCatalogItem) => void;
  textColor: string;
  subColor: string;
  accent: string;
  cardBorder: string;
  inputBg: string;
};

export function GamePlaylistPicker({
  catalog,
  selectedIds,
  pickTab,
  catalogQuery,
  onPickTabChange,
  onCatalogQueryChange,
  onToggleSong,
  onAddTrack,
  textColor,
  subColor,
  accent,
  cardBorder,
  inputBg,
}: Props) {
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (c) =>
        c.artist.toLowerCase().includes(q) ||
        c.song.toLowerCase().includes(q) ||
        c.country_name.toLowerCase().includes(q) ||
        String(c.year).includes(q)
    );
  }, [catalog, catalogQuery]);

  return (
    <div className="gts-playlist-build__picker">
      <div className="gts-lobby__pick-tabs">
        <button
          type="button"
          className={`gts-mode-tab ${pickTab === "eurovision" ? "gts-mode-tab--active" : ""}`}
          onClick={() => onPickTabChange("eurovision")}
        >
          Eurovision
        </button>
        <button
          type="button"
          className={`gts-mode-tab ${pickTab === "youtube" ? "gts-mode-tab--active" : ""}`}
          onClick={() => onPickTabChange("youtube")}
        >
          YouTube
        </button>
      </div>

      {pickTab === "eurovision" ? (
        <>
          <input
            className="gts-lobby__search"
            value={catalogQuery}
            onChange={(e) => onCatalogQueryChange(e.target.value)}
            placeholder="Поиск по исполнителю, песне, стране…"
            style={{ border: cardBorder, background: inputBg, color: textColor }}
          />
          <div className="gts-song-picker gts-lobby__picker">
            {filteredCatalog.length === 0 ? (
              <p className="gts-playlist-build__empty" style={{ color: subColor }}>
                Ничего не найдено
              </p>
            ) : (
              filteredCatalog.slice(0, 200).map((item) => {
                const thumb = getYouTubeThumb(item.youtube_link);
                const selected = selectedIds.has(item.performance_id);
                return (
                  <button
                    key={item.performance_id}
                    type="button"
                    className={`gts-song-item ${selected ? "gts-song-item--selected" : ""}`}
                    style={{ color: textColor }}
                    onClick={() => onToggleSong(item)}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="gts-song-thumb" loading="lazy" />
                    ) : (
                      <span className="gts-song-thumb gts-song-thumb--placeholder">🎬</span>
                    )}
                    <span className="gts-song-item__text">
                      <strong>{item.artist}</strong> — {item.song}
                      <span className="gts-song-item__meta" style={{ color: subColor }}>
                        {supportsEmoji ? item.flag_emoji : "🌍"} {item.year} · {contestTypeLabel(item.contest_type)}
                      </span>
                    </span>
                    <span className="gts-song-item__mark">{selected ? "✓" : "+"}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="gts-playlist-build__youtube">
          <GameYouTubeSearchTab
            selectedIds={selectedIds}
            onAdd={onAddTrack}
            text={textColor}
            sub={subColor}
            cardBorder={cardBorder}
            inputBg={inputBg}
            accent={accent}
          />
        </div>
      )}
    </div>
  );
}
