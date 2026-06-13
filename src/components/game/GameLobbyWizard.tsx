import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Play, Save } from "lucide-react";
import type { Theme } from "../../types/contest";
import type { GameCatalogItem, GamePlayMode, GamePlaylistMode, GamePlayer, SavedPlaylistSummary } from "../../types/game";
import { createSavedPlaylist, fetchSavedPlaylists } from "../../api/game";
import { catalogToPlaylistEntries } from "../../utils/gamePlaylist";
import { GameQuickChips } from "./GameQuickChips";
import { GamePlaylistPanel } from "./GamePlaylistPanel";
import { GamePlaylistPicker } from "./GamePlaylistPicker";
import { GamePlaylistRoulette } from "./GamePlaylistRoulette";
import { GameLobbyPlayers } from "./GameLobbyPlayers";

import { UserAvatar } from "../UserAvatar";

export type LobbyWizardStep = "rules" | "source" | "build" | "review" | "ready";

type SourceKind = "saved" | "manual" | "auto";

type Props = {
  theme: Theme;
  hostUserId: string;
  players: GamePlayer[];
  savedPoints: number;
  savedDuration: number;
  playMode: GamePlayMode;
  playlistMode: GamePlaylistMode;
  autoCount: number;
  catalog: GameCatalogItem[];
  selectedOrder: string[];
  selectedById: Map<string, GameCatalogItem>;
  catalogQuery: string;
  pickTab: "eurovision" | "youtube";
  rouletteSpinning: boolean;
  roulettePreview: GameCatalogItem | null;
  rouletteStrip: GameCatalogItem[];
  rouletteProgress: number;
  textColor: string;
  subColor: string;
  accent: string;
  cardBorder: string;
  inputBg: string;
  cardBg: string;
  onCatalogQueryChange: (q: string) => void;
  onPickTabChange: (tab: "eurovision" | "youtube") => void;
  onApplyPoints: (n: number) => void;
  onApplyDuration: (n: number) => void;
  onApplyPlayMode: (mode: GamePlayMode) => void;
  onSwitchPlaylistMode: (mode: GamePlaylistMode) => void;
  onAutoCountChange: (n: number) => void;
  onAddTrack: (item: GameCatalogItem) => void;
  onToggleSong: (item: GameCatalogItem) => void;
  onReorder: (order: string[]) => void;
  onRemove: (id: string) => void;
  onApplySavedEntries: (entries: import("../../types/game").GamePlaylistEntryInput[]) => Promise<void>;
  onAutoGenerate: () => Promise<void>;
  onStart: () => Promise<void>;
  avatarUrl: (userId: string, avatarUrl?: string | null) => string | null;
  startDisabled: boolean;
  startLoading?: boolean;
};

const STEPS: { id: LobbyWizardStep; label: string }[] = [
  { id: "rules", label: "Настройки" },
  { id: "source", label: "Плейлист" },
  { id: "build", label: "Сборка" },
  { id: "review", label: "Проверка" },
  { id: "ready", label: "Старт" },
];

export function GameLobbyWizard(props: Props) {
  const [step, setStep] = useState<LobbyWizardStep>("rules");
  const [sourceKind, setSourceKind] = useState<SourceKind>("manual");
  const [savedList, setSavedList] = useState<SavedPlaylistSummary[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [applyingSaved, setApplyingSaved] = useState(false);
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  const {
    theme,
    hostUserId,
    players,
    savedPoints,
    savedDuration,
    playMode,
    playlistMode,
    autoCount,
    catalog,
    selectedOrder,
    selectedById,
    catalogQuery,
    pickTab,
    rouletteSpinning,
    roulettePreview,
    rouletteStrip,
    rouletteProgress,
    textColor,
    subColor,
    accent,
    cardBorder,
    inputBg,
    cardBg,
    onCatalogQueryChange,
    onPickTabChange,
    onApplyPoints,
    onApplyDuration,
    onApplyPlayMode,
    onSwitchPlaylistMode,
    onAutoCountChange,
    onToggleSong,
    onReorder,
    onRemove,
    onApplySavedEntries,
    onAutoGenerate,
    onStart,
    avatarUrl,
    startDisabled,
    startLoading,
  } = props;

  const selectedIds = useMemo(() => new Set(selectedOrder), [selectedOrder]);

  useEffect(() => {
    if (step !== "source" || sourceKind !== "saved") return;
    setSavedLoading(true);
    setSavedError(null);
    void fetchSavedPlaylists()
      .then(setSavedList)
      .catch((e) => setSavedError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setSavedLoading(false));
  }, [step, sourceKind]);

  function visibleSteps(): LobbyWizardStep[] {
    if (sourceKind === "saved") return ["rules", "source", "review", "ready"];
    return ["rules", "source", "build", "review", "ready"];
  }

  const stepIndex = visibleSteps().indexOf(step);

  function goNext() {
    const steps = visibleSteps();
    const i = steps.indexOf(step);
    if (i < 0 || i >= steps.length - 1) return;
    const next = steps[i + 1];
    if (next === "build") {
      if (sourceKind === "manual") void onSwitchPlaylistMode("manual");
      if (sourceKind === "auto") void onSwitchPlaylistMode("auto");
    }
    setStep(next);
  }

  function goBack() {
    const steps = visibleSteps();
    const i = steps.indexOf(step);
    if (i <= 0) return;
    setStep(steps[i - 1]);
  }

  async function pickSaved(id: string) {
    setApplyingSaved(true);
    setSavedError(null);
    try {
      const { fetchSavedPlaylist } = await import("../../api/game");
      const pl = await fetchSavedPlaylist(id);
      await onApplySavedEntries(pl.entries);
      setSourceKind("saved");
      setStep("review");
    } catch (e) {
      setSavedError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setApplyingSaved(false);
    }
  }

  async function saveCurrentPlaylist() {
    const name = window.prompt("Название плейлиста");
    if (!name?.trim()) return;
    if (selectedOrder.length === 0) {
      window.alert("Добавьте песни в плейлист");
      return;
    }
    setSavingPlaylist(true);
    try {
      await createSavedPlaylist(name.trim(), catalogToPlaylistEntries(selectedOrder, selectedById));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingPlaylist(false);
    }
  }

  const canNextFromBuild =
    playlistMode === "auto" ? selectedOrder.length > 0 && !rouletteSpinning : selectedOrder.length > 0;

  const showPlaylistPanel = step === "build" || step === "review" || step === "ready";
  const otherPlayers = players.filter((p) => p.user_id !== hostUserId);

  return (
    <div className="gts-wizard">
      <nav className="gts-wizard__steps" aria-label="Шаги настройки">
        {visibleSteps().map((id, i) => (
          <div
            key={id}
            className={`gts-wizard__step ${step === id ? "gts-wizard__step--active" : ""} ${i < stepIndex ? "gts-wizard__step--done" : ""}`}
          >
            <span className="gts-wizard__step-num">{i + 1}</span>
            <span className="gts-wizard__step-label">{STEPS.find((s) => s.id === id)?.label}</span>
          </div>
        ))}
      </nav>

      <div className={`gts-wizard__body ${showPlaylistPanel ? "gts-wizard__body--split" : ""}`}>
        <div
          className={`gts-wizard__main ${step === "build" && playlistMode === "manual" ? "gts-wizard__main--build" : ""}`}
        >
          {step === "rules" && (
            <div className="gts-wizard-panel">
              <h3 className="gts-wizard-panel__title">Правила игры</h3>
              <div className="gts-wizard-panel__chips">
                <GameQuickChips label="Баллы" value={savedPoints} chips={[5, 10, 15, 20]} onSelect={onApplyPoints} />
                <GameQuickChips
                  label="Секунд на ответ"
                  value={savedDuration}
                  chips={[5, 10, 15, 20, 30]}
                  onSelect={onApplyDuration}
                />
              </div>
              <div className="gts-lobby__play-mode">
                <span className="gts-lobby__play-label" style={{ color: subColor }}>
                  Тип игры
                </span>
                <div className="gts-mode-tabs">
                  <button
                    type="button"
                    className={`gts-mode-tab ${playMode === "offline" ? "gts-mode-tab--active" : ""}`}
                    onClick={() => void onApplyPlayMode("offline")}
                  >
                    Офлайн
                  </button>
                  <button
                    type="button"
                    className={`gts-mode-tab ${playMode === "online" ? "gts-mode-tab--active" : ""}`}
                    onClick={() => void onApplyPlayMode("online")}
                  >
                    Онлайн
                  </button>
                </div>
                <p className="gts-lobby__play-hint" style={{ color: subColor }}>
                  {playMode === "online"
                    ? "Ответ вводится в чат — все видят его, ведущий засчитывает"
                    : "Ответ вслух — ведущий ставит полный балл, полбалла или снимает балл"}
                </p>
              </div>
            </div>
          )}

          {step === "source" && (
            <div className="gts-wizard-panel">
              <h3 className="gts-wizard-panel__title">Откуда взять плейлист?</h3>
              <div className="gts-source-cards">
                <button
                  type="button"
                  className={`gts-source-card ${sourceKind === "saved" ? "gts-source-card--active" : ""}`}
                  style={{ border: cardBorder }}
                  onClick={() => setSourceKind("saved")}
                >
                  <span className="gts-source-card__icon">📁</span>
                  <strong>Сохранённый</strong>
                  <span style={{ color: subColor, fontSize: 12 }}>Ваши готовые списки</span>
                </button>
                <button
                  type="button"
                  className={`gts-source-card ${sourceKind === "manual" ? "gts-source-card--active" : ""}`}
                  style={{ border: cardBorder }}
                  onClick={() => setSourceKind("manual")}
                >
                  <span className="gts-source-card__icon">🎵</span>
                  <strong>Собрать вручную</strong>
                  <span style={{ color: subColor, fontSize: 12 }}>Eurovision и YouTube</span>
                </button>
                <button
                  type="button"
                  className={`gts-source-card ${sourceKind === "auto" ? "gts-source-card--active" : ""}`}
                  style={{ border: cardBorder }}
                  onClick={() => setSourceKind("auto")}
                >
                  <span className="gts-source-card__icon">🎲</span>
                  <strong>Случайный</strong>
                  <span style={{ color: subColor, fontSize: 12 }}>Из каталога Eurovision</span>
                </button>
              </div>

              {sourceKind === "saved" && (
                <div className="gts-saved-pick">
                  {savedLoading || applyingSaved ? (
                    <Loader2 size={24} className="gts-spin" color={accent} />
                  ) : savedError ? (
                    <p className="gts-saved-editor__error">{savedError}</p>
                  ) : savedList.length === 0 ? (
                    <p style={{ color: subColor, fontSize: 13 }}>
                      Нет сохранённых плейлистов. Создайте их на главной странице игры.
                    </p>
                  ) : (
                    <div className="gts-saved-list gts-saved-list--compact">
                      {savedList.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="gts-saved-list__row gts-saved-list__row--pick"
                          style={{ border: cardBorder }}
                          onClick={() => void pickSaved(item.id)}
                        >
                          <strong>{item.name}</strong>
                          <span style={{ color: subColor, fontSize: 12 }}>{item.entry_count} песен</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === "build" && playlistMode === "auto" && (
            <div className="gts-wizard-panel gts-wizard-panel--build">
              <GameQuickChips
                label="Песен"
                value={autoCount}
                chips={[5, 10, 15, 20]}
                onSelect={(n) => {
                  onAutoCountChange(n);
                }}
              />
              <div className="gts-lobby__auto">
                <div className="gts-lobby__auto-stage">
                {rouletteSpinning ? (
                  <GamePlaylistRoulette
                    item={roulettePreview}
                    strip={rouletteStrip}
                    spinning
                    progress={rouletteProgress}
                    targetCount={autoCount}
                  />
                ) : selectedOrder.length > 0 ? (
                  <div className="gts-auto-ready">
                    <div className="gts-auto-ready__icon">✓</div>
                    <div>
                      <strong className="gts-auto-ready__title">Плейлист готов</strong>
                      <p className="gts-auto-ready__text" style={{ color: subColor }}>
                        {selectedOrder.length} случайных песен
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="gts-auto-idle">
                    <div className="gts-auto-idle__icon">🎲</div>
                    <div>
                      <strong className="gts-auto-idle__title">Сгенерируйте плейлист</strong>
                      <p className="gts-auto-idle__text" style={{ color: subColor }}>
                        Нажмите кнопку ниже
                      </p>
                    </div>
                  </div>
                )}
                </div>
                <button
                  type="button"
                  className="gts-btn gts-btn--ghost"
                  disabled={rouletteSpinning}
                  onClick={() => void onAutoGenerate()}
                >
                  🎲 {selectedOrder.length > 0 ? "Перегенерировать" : "Сгенерировать"}
                </button>
              </div>
            </div>
          )}

          {step === "build" && playlistMode === "manual" && (
            <GamePlaylistPicker
              catalog={catalog}
              selectedIds={selectedIds}
              pickTab={pickTab}
              catalogQuery={catalogQuery}
              onPickTabChange={onPickTabChange}
              onCatalogQueryChange={onCatalogQueryChange}
              onToggleSong={onToggleSong}
              onAddTrack={props.onAddTrack}
              textColor={textColor}
              subColor={subColor}
              accent={accent}
              cardBorder={cardBorder}
              inputBg={inputBg}
            />
          )}

          {step === "review" && (
            <div className="gts-wizard-panel">
              <h3 className="gts-wizard-panel__title">Проверьте перед стартом</h3>
              <ul className="gts-wizard-summary" style={{ color: subColor }}>
                <li>
                  <strong style={{ color: textColor }}>{savedPoints}</strong> баллов ·{" "}
                  <strong style={{ color: textColor }}>{savedDuration}</strong> сек ·{" "}
                  {playMode === "online" ? "онлайн" : "офлайн"}
                </li>
                <li>
                  <strong style={{ color: textColor }}>{selectedOrder.length}</strong>{" "}
                  {playlistMode === "auto" ? "случайных песен" : "песен в плейлисте"}
                </li>
              </ul>
              {playlistMode === "manual" && selectedOrder.length > 0 && (
                <button
                  type="button"
                  className="gts-btn gts-btn--ghost gts-wizard-save-btn"
                  disabled={savingPlaylist}
                  onClick={() => void saveCurrentPlaylist()}
                >
                  {savingPlaylist ? <Loader2 size={14} className="gts-spin" /> : <Save size={14} />}
                  Сохранить плейлист
                </button>
              )}
            </div>
          )}

          {step === "ready" && (
            <div className="gts-wizard-panel">
              <h3 className="gts-wizard-panel__title">Все готовы?</h3>
              <p className="gts-wizard-ready__lead" style={{ color: subColor }}>
                Убедитесь, что все игроки подключились — после старта изменить плейлист и настройки будет нельзя.
              </p>
              <div className="gts-wizard-ready__stats" style={{ border: cardBorder, background: cardBg }}>
                <div>
                  <span className="gts-wizard-ready__stat-num" style={{ color: accent }}>
                    {otherPlayers.length}
                  </span>
                  <span className="gts-wizard-ready__stat-label" style={{ color: subColor }}>
                    {otherPlayers.length === 1
                      ? "игрок подключён"
                      : otherPlayers.length < 5
                        ? "игрока подключено"
                        : "игроков подключено"}
                  </span>
                </div>
              </div>
              {otherPlayers.length > 0 ? (
                <ul className="gts-wizard-ready__players">
                  {otherPlayers.map((p) => (
                    <li key={p.user_id} className="gts-wizard-ready__player" style={{ border: cardBorder }}>
                      <UserAvatar
                        username={p.username}
                        avatarUrl={avatarUrl(p.user_id, p.avatar_url)}
                        size={32}
                        theme={theme}
                      />
                      <span style={{ color: textColor }}>{p.username}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="gts-wizard-ready__hint" style={{ color: subColor }}>
                  Пока никого нет — отправьте код комнаты и дождитесь, пока игроки войдут.
                </p>
              )}
            </div>
          )}
        </div>

        {showPlaylistPanel && (
          <GamePlaylistPanel
            order={selectedOrder}
            itemsById={selectedById}
            catalog={catalog}
            onReorder={onReorder}
            onRemove={onRemove}
            textColor={textColor}
            subColor={subColor}
            border={cardBorder}
          />
        )}
      </div>

      <div className="gts-wizard__aside">
        <GameLobbyPlayers
          players={players}
          hostUserId={hostUserId}
          theme={theme}
          textColor={textColor}
          subColor={subColor}
          cardBg={cardBg}
          border={cardBorder}
          avatarUrl={avatarUrl}
        />
      </div>

      <footer className="gts-wizard__footer">
        <button
          type="button"
          className="gts-btn gts-btn--ghost gts-btn--back"
          disabled={stepIndex <= 0}
          onClick={goBack}
        >
          <ChevronLeft size={16} /> Назад
        </button>
        <div className="gts-wizard__footer-right">
          {step === "ready" ? (
            <button
              type="button"
              className="gts-btn gts-btn--primary"
              disabled={startDisabled || startLoading}
              onClick={() => void onStart()}
            >
              {startLoading ? <Loader2 size={18} className="gts-spin" /> : <Play size={18} />}
              Начать игру
            </button>
          ) : step === "review" ? (
            <button type="button" className="gts-btn gts-btn--primary" onClick={goNext}>
              Далее <ChevronRight size={16} />
            </button>
          ) : step === "source" && sourceKind === "saved" ? (
            <span className="gts-wizard__footer-hint" style={{ color: subColor }}>
              Выберите плейлист из списка
            </span>
          ) : (
            <button
              type="button"
              className="gts-btn gts-btn--primary"
              disabled={(step === "build" && !canNextFromBuild) || (step === "source" && sourceKind === "saved")}
              onClick={goNext}
            >
              Далее <ChevronRight size={16} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
