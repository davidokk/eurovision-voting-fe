import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import type { GameCatalogItem } from "../../types/game";
import { getYouTubeThumb } from "../../utils/youtube";

type Props = {
  order: string[];
  itemsById: Map<string, GameCatalogItem>;
  catalog: GameCatalogItem[];
  onReorder: (nextOrder: string[]) => void;
  onRemove: (id: string) => void;
  textColor: string;
  subColor: string;
  border: string;
};

function resolveItem(
  id: string,
  itemsById: Map<string, GameCatalogItem>,
  catalog: GameCatalogItem[]
): GameCatalogItem | undefined {
  return itemsById.get(id) ?? catalog.find((c) => c.performance_id === id);
}

export function GamePlaylistPanel({
  order,
  itemsById,
  catalog,
  onReorder,
  onRemove,
  textColor,
  subColor,
  border,
}: Props) {
  const dragId = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function move(id: string, delta: -1 | 1) {
    const i = order.indexOf(id);
    if (i < 0) return;
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(next);
  }

  function handleDrop(targetId: string) {
    const fromId = dragId.current;
    dragId.current = null;
    setOverId(null);
    if (!fromId || fromId === targetId) return;

    const fromIdx = order.indexOf(fromId);
    const toIdx = order.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const next = [...order];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromId);
    onReorder(next);
  }

  return (
    <aside className="gts-playlist-panel" style={{ border }}>
      <div className="gts-playlist-panel__head" style={{ borderBottom: border }}>
        <span className="gts-playlist-panel__title" style={{ color: subColor }}>
          Плейлист
        </span>
        <span className="gts-playlist-panel__count" style={{ color: textColor }}>
          {order.length}
        </span>
      </div>

      <div className="gts-playlist-panel__list">
        {order.length === 0 ? (
          <p className="gts-playlist-panel__empty" style={{ color: subColor }}>
            Добавьте песни слева или сгенерируйте случайный набор
          </p>
        ) : (
          order.map((id, index) => {
            const item = resolveItem(id, itemsById, catalog);
            if (!item) return null;
            const thumb = getYouTubeThumb(item.youtube_link);
            const isOver = overId === id;

            return (
              <div
                key={id}
                className={`gts-playlist-panel__row ${isOver ? "gts-playlist-panel__row--over" : ""}`}
                style={{ border, color: textColor }}
                draggable
                onDragStart={() => {
                  dragId.current = id;
                }}
                onDragEnd={() => {
                  dragId.current = null;
                  setOverId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverId(id);
                }}
                onDrop={() => handleDrop(id)}
              >
                <span className="gts-playlist-panel__index">{index + 1}</span>
                <GripVertical size={14} className="gts-playlist-panel__grip" aria-hidden />
                {thumb ? (
                  <img src={thumb} alt="" className="gts-playlist-panel__thumb" loading="lazy" />
                ) : (
                  <span className="gts-playlist-panel__thumb gts-playlist-panel__thumb--ph">🎬</span>
                )}
                <div className="gts-playlist-panel__meta">
                  <span className="gts-playlist-panel__artist">{item.artist}</span>
                  <span className="gts-playlist-panel__song" style={{ color: subColor }}>
                    {item.song}
                  </span>
                </div>
                <div className="gts-playlist-panel__actions">
                  <button
                    type="button"
                    className="gts-playlist-panel__icon-btn"
                    disabled={index === 0}
                    onClick={() => move(id, -1)}
                    aria-label="Выше"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="gts-playlist-panel__icon-btn"
                    disabled={index === order.length - 1}
                    onClick={() => move(id, 1)}
                    aria-label="Ниже"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="gts-playlist-panel__icon-btn gts-playlist-panel__icon-btn--remove"
                    onClick={() => onRemove(id)}
                    aria-label="Удалить"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
