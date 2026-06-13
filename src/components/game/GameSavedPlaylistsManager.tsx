import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import type { Theme } from "../../types/contest";
import type { GameCatalogItem, SavedPlaylist, SavedPlaylistSummary } from "../../types/game";
import {
  createSavedPlaylist,
  deleteSavedPlaylist,
  fetchSavedPlaylist,
  fetchSavedPlaylists,
  updateSavedPlaylist,
} from "../../api/game";
import { GameSavedPlaylistEditor } from "./GameSavedPlaylistEditor";

type Props = {
  theme: Theme;
  catalog: GameCatalogItem[];
  textColor: string;
  subColor: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  onClose: () => void;
};

export function GameSavedPlaylistsManager({
  theme,
  catalog,
  textColor,
  subColor,
  accent,
  cardBg,
  cardBorder,
  inputBg,
  onClose,
}: Props) {
  const [list, setList] = useState<SavedPlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SavedPlaylist | null | "new">(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchSavedPlaylists());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function openEdit(id: string) {
    setLoadingEdit(true);
    setError(null);
    try {
      setEditing(await fetchSavedPlaylist(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось открыть");
    } finally {
      setLoadingEdit(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Удалить плейлист «${name}»?`)) return;
    try {
      await deleteSavedPlaylist(id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  }

  return (
    <section className="gts-saved-page" data-theme={theme} style={{ color: textColor, background: cardBg, border: cardBorder }}>
      {editing ? (
        loadingEdit ? (
          <div className="gts-saved-page__loading">
            <Loader2 size={32} className="gts-spin" color={accent} />
          </div>
        ) : (
          <GameSavedPlaylistEditor
            catalog={catalog}
            initial={editing === "new" ? null : editing}
            textColor={textColor}
            subColor={subColor}
            accent={accent}
            cardBorder={cardBorder}
            inputBg={inputBg}
            onCancel={() => setEditing(null)}
            onSave={async (name, entries) => {
              if (editing !== "new" && editing) {
                await updateSavedPlaylist(editing.id, name, entries);
              } else {
                await createSavedPlaylist(name, entries);
              }
              setEditing(null);
              await reload();
            }}
          />
        )
      ) : (
        <>
          <header className="gts-saved-page__head">
            <button type="button" className="gts-btn gts-btn--ghost gts-btn--back" onClick={onClose}>
              <ArrowLeft size={16} /> Назад к игре
            </button>
            <div className="gts-saved-page__head-main">
              <h2 className="gts-saved-page__title">Мои плейлисты</h2>
              <p className="gts-saved-page__hint" style={{ color: subColor }}>
                Соберите списки песен заранее и используйте при создании игры.
              </p>
            </div>
            <button type="button" className="gts-btn gts-btn--primary" onClick={() => setEditing("new")}>
              <Plus size={16} /> Новый плейлист
            </button>
          </header>

          {error && <p className="gts-saved-editor__error">{error}</p>}

          {loading ? (
            <div className="gts-saved-page__loading">
              <Loader2 size={32} className="gts-spin" color={accent} />
            </div>
          ) : (
            <div className="gts-saved-page__list">
              {list.length === 0 ? (
                <div className="gts-saved-page__empty" style={{ border: cardBorder }}>
                  <p style={{ color: subColor }}>Пока нет сохранённых плейлистов</p>
                  <button type="button" className="gts-btn gts-btn--primary" onClick={() => setEditing("new")}>
                    <Plus size={16} /> Создать первый плейлист
                  </button>
                </div>
              ) : (
                list.map((item) => (
                  <div key={item.id} className="gts-saved-list__row" style={{ border: cardBorder, background: inputBg }}>
                    <button type="button" className="gts-saved-list__main" onClick={() => void openEdit(item.id)}>
                      <strong>{item.name}</strong>
                      <span style={{ color: subColor, fontSize: 12 }}>{item.entry_count} песен</span>
                    </button>
                    <button
                      type="button"
                      className="gts-saved-list__delete"
                      onClick={() => void handleDelete(item.id, item.name)}
                      aria-label="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
