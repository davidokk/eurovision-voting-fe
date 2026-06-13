import { useMemo, useState } from "react";
import type { GameCatalogItem } from "../../types/game";
import { getYouTubeThumb } from "../../utils/youtube";
import { contestTypeLabel } from "../../utils/contestLabels";
import { getDoesBrowserSupportFlagEmojis } from "../../utils/emojiSupport";
import { GameYouTubeSearchTab } from "./GameYouTubeSearchTab";
import { GameSongGridCard } from "./GameSongGridCard";

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
  const [yearFilter, setYearFilter] = useState<number | null>(null);

  const catalogYears = useMemo(() => {
    const years = new Set<number>();
    for (const item of catalog) {
      if (item.year > 0) years.add(item.year);
    }
    return [...years].sort((a, b) => b - a);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    let items = catalog;
    if (yearFilter != null) {
      items = items.filter((c) => c.year === yearFilter);
    }
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.artist.toLowerCase().includes(q) ||
        c.song.toLowerCase().includes(q) ||
        c.country_name.toLowerCase().includes(q) ||
        String(c.year).includes(q)
    );
  }, [catalog, catalogQuery, yearFilter]);

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
          <div className="gts-playlist-build__filters">
            <input
              className="gts-lobby__search"
              value={catalogQuery}
              onChange={(e) => onCatalogQueryChange(e.target.value)}
              placeholder="Поиск по исполнителю, песне, стране…"
              style={{ border: cardBorder, background: inputBg, color: textColor }}
            />
            {catalogYears.length > 0 && (
              <div className="gts-year-filter">
                <span className="gts-year-filter__label" style={{ color: subColor }}>
                  Год
                </span>
                <div className="gts-year-filter__row">
                  <button
                    type="button"
                    className={`gts-year-filter__chip ${yearFilter == null ? "gts-year-filter__chip--active" : ""}`}
                    onClick={() => setYearFilter(null)}
                  >
                    Все
                  </button>
                  {catalogYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      className={`gts-year-filter__chip ${yearFilter === year ? "gts-year-filter__chip--active" : ""}`}
                      onClick={() => setYearFilter((prev) => (prev === year ? null : year))}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="gts-song-grid-scroll gts-lobby__picker">
            <div className="gts-song-grid">
            {filteredCatalog.length === 0 ? (
              <p className="gts-song-grid__empty" style={{ color: subColor }}>
                Ничего не найдено
              </p>
            ) : (
              filteredCatalog.slice(0, 200).map((item) => {
                const thumb = getYouTubeThumb(item.youtube_link, "hqdefault");
                const selected = selectedIds.has(item.performance_id);
                return (
                  <GameSongGridCard
                    key={item.performance_id}
                    thumbUrl={thumb}
                    title={item.artist}
                    subtitle={item.song}
                    meta={`${supportsEmoji ? item.flag_emoji : "🌍"} ${item.year} · ${contestTypeLabel(item.contest_type)}`}
                    selected={selected}
                    textColor={textColor}
                    subColor={subColor}
                    cardBorder={cardBorder}
                    inputBg={inputBg}
                    onClick={() => onToggleSong(item)}
                  />
                );
              })
            )}
            </div>
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
