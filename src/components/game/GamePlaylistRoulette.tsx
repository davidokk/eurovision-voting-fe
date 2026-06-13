import { useMemo } from "react";
import type { GameCatalogItem } from "../../types/game";
import { getYouTubeThumb } from "../../utils/youtube";

type Props = {
  item: GameCatalogItem | null;
  strip: GameCatalogItem[];
  spinning: boolean;
  progress: number;
  targetCount: number;
};

function PickThumb({ item, size = "md" }: { item: GameCatalogItem; size?: "md" | "sm" }) {
  const thumb = getYouTubeThumb(item.youtube_link);
  return (
    <div className={`gts-pick__thumb gts-pick__thumb--${size}`}>
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" />
      ) : (
        <span className="gts-pick__thumb-ph">🎬</span>
      )}
    </div>
  );
}

export function GamePlaylistRoulette({ item, strip, spinning, progress, targetCount }: Props) {
  const picked = spinning ? Math.min(targetCount, Math.max(0, Math.floor(progress * targetCount))) : 0;
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  const slotItems = useMemo(() => {
    const slots: (GameCatalogItem | null)[] = Array.from({ length: targetCount }, () => null);
    if (picked === 0) return slots;

    const unique: GameCatalogItem[] = [];
    const seen = new Set<string>();
    for (let i = strip.length - 1; i >= 0; i--) {
      const entry = strip[i];
      if (seen.has(entry.performance_id)) continue;
      seen.add(entry.performance_id);
      unique.unshift(entry);
      if (unique.length >= picked) break;
    }

    for (let i = 0; i < unique.length; i++) {
      slots[i] = unique[i];
    }
    return slots;
  }, [strip, picked, targetCount]);

  return (
    <div className={`gts-pick ${spinning ? "gts-pick--active" : ""}`}>
      <div className="gts-pick__head">
        <div>
          <span className="gts-pick__label">Случайный плейлист</span>
          <span className="gts-pick__sub">Треки из каталога Eurovision</span>
        </div>
        <div className="gts-pick__counter">
          <span className="gts-pick__counter-val">{picked}</span>
          <span className="gts-pick__counter-sep">/</span>
          <span className="gts-pick__counter-total">{targetCount}</span>
        </div>
      </div>

      <div className="gts-pick__hero" key={item?.performance_id ?? "empty"}>
        {item ? (
          <>
            <PickThumb item={item} size="md" />
            <div className="gts-pick__hero-text">
              <span className="gts-pick__scan">Кандидат</span>
              <strong className="gts-pick__artist">{item.artist}</strong>
              <span className="gts-pick__song">{item.song}</span>
            </div>
          </>
        ) : (
          <div className="gts-pick__hero-empty">Подбираем…</div>
        )}
      </div>

      <div className="gts-pick__slots" style={{ gridTemplateColumns: `repeat(${Math.min(targetCount, 10)}, minmax(0, 1fr))` }}>
        {slotItems.map((entry, i) => (
          <div
            key={i}
            className={`gts-pick__slot ${entry ? "gts-pick__slot--filled" : ""} ${entry && i === picked - 1 ? "gts-pick__slot--latest" : ""}`}
          >
            {entry ? (
              <>
                <PickThumb item={entry} size="sm" />
                <span className="gts-pick__slot-num">{i + 1}</span>
              </>
            ) : (
              <span className="gts-pick__slot-empty">{i + 1}</span>
            )}
          </div>
        ))}
      </div>

      <div className="gts-pick__progress">
        <div className="gts-pick__progress-track">
          <div className="gts-pick__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="gts-pick__progress-text">{pct}%</span>
      </div>
    </div>
  );
}
