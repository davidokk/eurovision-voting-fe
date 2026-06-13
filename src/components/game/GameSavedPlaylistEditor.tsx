import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import type { GameCatalogItem, GamePlaylistEntryInput, SavedPlaylist } from "../../types/game";
import { catalogToPlaylistEntries, playlistEntriesToCatalog } from "../../utils/gamePlaylist";
import { GamePlaylistPanel } from "./GamePlaylistPanel";
import { GamePlaylistPicker } from "./GamePlaylistPicker";

type Props = {
  catalog: GameCatalogItem[];
  initial?: SavedPlaylist | null;
  textColor: string;
  subColor: string;
  accent: string;
  cardBorder: string;
  inputBg: string;
  onSave: (name: string, entries: GamePlaylistEntryInput[]) => Promise<void>;
  onCancel: () => void;
};

export function GameSavedPlaylistEditor({
  catalog,
  initial,
  textColor,
  subColor,
  accent,
  cardBorder,
  inputBg,
  onSave,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [pickTab, setPickTab] = useState<"eurovision" | "youtube">("eurovision");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [byId, setById] = useState<Map<string, GameCatalogItem>>(() => new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) {
      setOrder([]);
      setById(new Map());
      setName("");
      return;
    }
    setName(initial.name);
    const parsed = playlistEntriesToCatalog(initial.entries, catalog);
    setOrder(parsed.order);
    setById(parsed.byId);
  }, [initial, catalog]);

  const selectedIds = useMemo(() => new Set(order), [order]);

  function addTrack(item: GameCatalogItem) {
    if (order.includes(item.performance_id)) return;
    setOrder((prev) => [...prev, item.performance_id]);
    setById((prev) => new Map(prev).set(item.performance_id, item));
  }

  function removeTrack(id: string) {
    setOrder((prev) => prev.filter((x) => x !== id));
    setById((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleSong(item: GameCatalogItem) {
    if (selectedIds.has(item.performance_id)) removeTrack(item.performance_id);
    else addTrack(item);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введите название плейлиста");
      return;
    }
    if (order.length === 0) {
      setError("Добавьте хотя бы одну песню");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed, catalogToPlaylistEntries(order, byId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="gts-saved-editor">
      <div className="gts-saved-editor__toolbar">
        <button type="button" className="gts-btn gts-btn--ghost gts-btn--back" onClick={onCancel}>
          <ArrowLeft size={16} /> Назад
        </button>
        <input
          className="gts-saved-editor__name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название плейлиста"
          maxLength={80}
          style={{ border: cardBorder, background: inputBg, color: textColor }}
        />
        <button type="button" className="gts-btn gts-btn--primary" disabled={saving} onClick={() => void handleSave()}>
          {saving ? <Loader2 size={16} className="gts-spin" /> : <Save size={16} />}
          Сохранить
        </button>
      </div>

      {error && <p className="gts-saved-editor__error">{error}</p>}

      <div className="gts-playlist-build">
        <GamePlaylistPicker
          catalog={catalog}
          selectedIds={selectedIds}
          pickTab={pickTab}
          catalogQuery={catalogQuery}
          onPickTabChange={setPickTab}
          onCatalogQueryChange={setCatalogQuery}
          onToggleSong={toggleSong}
          onAddTrack={addTrack}
          textColor={textColor}
          subColor={subColor}
          accent={accent}
          cardBorder={cardBorder}
          inputBg={inputBg}
        />
        <GamePlaylistPanel
          order={order}
          itemsById={byId}
          catalog={catalog}
          onReorder={setOrder}
          onRemove={removeTrack}
          textColor={textColor}
          subColor={subColor}
          border={cardBorder}
        />
      </div>
    </div>
  );
}
