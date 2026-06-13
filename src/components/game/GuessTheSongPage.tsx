import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  Users,
  Zap,
} from "lucide-react";
import type { Theme } from "../../types/contest";
import type { GameCatalogItem, GamePlaylistMode, GameRoomState, GameRoomView, GameRoundView } from "../../types/game";
import {
  buildPlaylistPayload,
  createGameRoom,
  fetchGameCatalog,
  gameBuzz,
  gameRoomAction,
  getGameRoom,
  joinGameRoom,
} from "../../api/game";
import { useGameWebSocket } from "../../hooks/useGameWebSocket";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import { GameYouTubePlayer, type PlayerMode } from "./GameYouTubePlayer";
import { GameRoundTimer } from "./GameRoundTimer";
import { GameContestScoresFeed } from "./GameContestScoresFeed";
import { GameEndConfetti } from "./GameEndConfetti";
import { GameYouTubeSearchTab } from "./GameYouTubeSearchTab";
import { UserAvatar } from "../UserAvatar";
import {
  cacheGameRoom,
  isActiveRoundState,
  isValidRoom,
  loadCachedGameRoom,
  mergeGameRoom,
} from "../../utils/gameRoomState";
import { AuthModal } from "../AuthModal";
import { contestTypeLabel } from "../../utils/contestLabels";
import { getDoesBrowserSupportFlagEmojis } from "../../utils/emojiSupport";
import { getYouTubeThumb, loadYouTubeIframeAPI } from "../../utils/youtube";
import "../../styles/guessTheSong.css";

const WS_URL = import.meta.env.VITE_WS_URL || "";
const API_URL = import.meta.env.VITE_API_URL || "";

type Props = {
  theme: Theme;
  roomCode?: string;
};

function parseRoomFromPath(): string | null {
  const m = window.location.pathname.match(/^\/game\/([A-Za-z0-9]+)$/);
  return m ? m[1].toUpperCase() : null;
}

function gameStateLabel(state: GameRoomState, paused: boolean): string {
  if (state === "lobby") return "Лобби";
  if (paused) return "Пауза";
  switch (state) {
    case "round_playing":
      return "Угадывание";
    case "round_buzzed":
      return "Ответ";
    case "round_waiting_reveal":
      return "Время вышло";
    case "round_reveal":
      return "Раскрытие";
    case "round_clip":
      return "Клип";
    case "finished":
      return "Финал";
    default:
      return "В эфире";
  }
}

function derivePlayerMode(state: GameRoomState | string | undefined): PlayerMode {
  switch (state) {
    case "round_reveal":
      return "video";
    case "round_clip":
      return "video_full";
    case "round_buzzed":
    case "round_waiting_reveal":
      return "silent";
    case "round_playing":
      return "audio";
    default:
      return "silent";
  }
}

function playlistFromRoom(r: GameRoomView): { order: string[]; byId: Map<string, GameCatalogItem> } {
  const byId = new Map<string, GameCatalogItem>();
  const order: string[] = [];
  if (r.playlist_preview?.length) {
    for (const item of r.playlist_preview) {
      byId.set(item.performance_id, item);
      order.push(item.performance_id);
    }
    return { order, byId };
  }
  for (const id of r.playlist_ids ?? []) {
    order.push(id);
  }
  return { order, byId };
}

export function GuessTheSongPage({ theme, roomCode: roomCodeProp }: Props) {
  const initialCode = roomCodeProp || parseRoomFromPath();
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [myUserId] = useState(() => localStorage.getItem("user_id"));
  const myAvatarUrl = useAvatarUrl();
  const [authMode, setAuthMode] = useState(false);

  const [joinInput, setJoinInput] = useState("");
  const [room, setRoom] = useState<GameRoomView | null>(() =>
    initialCode ? loadCachedGameRoom(initialCode) : null
  );
  const [catalog, setCatalog] = useState<GameCatalogItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [selectedById, setSelectedById] = useState<Map<string, GameCatalogItem>>(() => new Map());
  const [playlistMode, setPlaylistMode] = useState<GamePlaylistMode>("manual");
  const [autoCount, setAutoCount] = useState(10);
  const [pickTab, setPickTab] = useState<"eurovision" | "youtube">("eurovision");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [loading, setLoading] = useState(() => !!initialCode);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pointsDraft, setPointsDraft] = useState(10);
  const [roundDurationDraft, setRoundDurationDraft] = useState(10);
  const [buzzLoading, setBuzzLoading] = useState(false);
  const [clientTimerDone, setClientTimerDone] = useState(false);
  const [trackReady, setTrackReady] = useState(false);
  const lastRoundRef = useRef<GameRoundView | undefined>(room?.round ?? undefined);

  const activeCode = room?.code || roomCodeProp || parseRoomFromPath() || null;

  const applyRoomUpdate = useCallback((value: GameRoomView | ((prev: GameRoomView | null) => GameRoomView | null)) => {
    setRoom((prev) => {
      const raw = typeof value === "function" ? value(prev) : value;
      if (!raw || !isValidRoom(raw)) return prev;
      const merged = mergeGameRoom(prev, raw);
      if (merged.round) lastRoundRef.current = merged.round;
      cacheGameRoom(merged);
      return merged;
    });
  }, []);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const text = isLight ? "#0f172a" : "#f1f5f9";
  const sub = isLight ? "#64748b" : "#94a3b8";
  const accent = isLight ? "#4f46e5" : "#7aa2ff";
  const cardBg = isLight
    ? "rgba(255,255,255,0.95)"
    : isGray
      ? "rgba(28,28,28,0.95)"
      : "rgba(15, 23, 42, 0.75)";
  const cardBorder = isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)";
  const inputBg = isLight ? "#f8fafc" : isGray ? "#252525" : "rgba(15,23,42,0.8)";

  const isHost = room && myUserId === room.host_user_id;
  const sortedPlayers = useMemo(
    () => [...(room?.players ?? [])].sort((a, b) => b.score - a.score || a.username.localeCompare(b.username, "ru")),
    [room?.players]
  );

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

  const selectedIds = useMemo(() => new Set(selectedOrder), [selectedOrder]);

  const syncRoomPlaylist = useCallback((r: GameRoomView) => {
    const { order, byId } = playlistFromRoom(r);
    if (order.length > 0) {
      setSelectedOrder(order);
      setSelectedById((prev) => {
        const next = new Map(byId);
        for (const id of order) {
          if (!next.has(id)) {
            const fromCatalog = catalog.find((c) => c.performance_id === id);
            if (fromCatalog) next.set(id, fromCatalog);
          }
        }
        if (next.size === 0 && prev.size > 0) return prev;
        return next.size > 0 ? next : prev;
      });
    }
    if (r.playlist_mode) setPlaylistMode(r.playlist_mode);
    if (r.auto_count && r.auto_count > 0) setAutoCount(r.auto_count);
  }, [catalog]);

  const handleTimerExpire = useCallback(() => {
    // Defer until after GameRoundTimer finishes its commit — avoids DOM race with YouTube iframe.
    requestAnimationFrame(() => {
      setClientTimerDone(true);
      const code = room?.code;
      if (!code) return;

      void (async () => {
        for (let attempt = 0; attempt < 20; attempt++) {
          if (attempt > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, 250));
          }
          try {
            const r = await getGameRoom(code);
            if (!isValidRoom(r)) continue;
            applyRoomUpdate(r);
            if (r.state !== "round_playing") return;
          } catch {
            // retry until server timeout lands
          }
        }
      })();
    });
  }, [room?.code, applyRoomUpdate]);

  useEffect(() => {
    if (room?.state !== "round_playing") {
      setClientTimerDone(false);
    }
  }, [room?.state, room?.current_round]);

  useEffect(() => {
    setTrackReady(false);
  }, [room?.current_round, room?.round?.performance_id]);

  const onGameEvent = useCallback((msg: { type: string; room?: GameRoomView }) => {
    if (msg.type !== "game.state" || !isValidRoom(msg.room)) return;
    const next = msg.room!;
    const apply = () => {
      applyRoomUpdate(next);
      setPointsDraft(next.points_per_correct);
      if (next.round_duration_sec) setRoundDurationDraft(next.round_duration_sec);
      if (next.state === "lobby") syncRoomPlaylist(next);
    };
    if (next.state === "round_waiting_reveal" || next.state === "round_buzzed") {
      window.setTimeout(apply, 50);
      return;
    }
    apply();
  }, [applyRoomUpdate, syncRoomPlaylist]);

  useGameWebSocket({
    wsUrl: WS_URL || API_URL.replace(/^http/, "ws"),
    token,
    roomCode: activeCode || "",
    enabled: !!token && !!activeCode,
    onMessage: onGameEvent,
  });

  useEffect(() => {
    if (room?.round) {
      lastRoundRef.current = room.round;
    }
  }, [room?.round]);

  useEffect(() => {
    fetchGameCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    void loadYouTubeIframeAPI();
  }, []);

  useEffect(() => {
    if (!catalog.length || selectedOrder.length === 0) return;
    setSelectedById((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const id of selectedOrder) {
        if (!next.has(id)) {
          const fromCatalog = catalog.find((c) => c.performance_id === id);
          if (fromCatalog) {
            next.set(id, fromCatalog);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [catalog, selectedOrder]);

  useEffect(() => {
    if (!token || !activeCode || room) return;
    setLoading(true);
    joinGameRoom(activeCode)
      .then((r) => {
        if (!isValidRoom(r)) return;
        applyRoomUpdate(r);
        syncRoomPlaylist(r);
        setPointsDraft(r.points_per_correct);
        if (r.round_duration_sec) setRoundDurationDraft(r.round_duration_sec);
        if (window.location.pathname === "/game") {
          window.history.replaceState(null, "", `/game/${r.code}`);
        }
      })
      .catch(() => setError("Не удалось войти в комнату"))
      .finally(() => setLoading(false));
  }, [token, activeCode, room, syncRoomPlaylist, applyRoomUpdate]);

  async function handleCreate() {
    if (!token) {
      setAuthMode(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await createGameRoom();
      applyRoomUpdate(r);
      setSelectedOrder([]);
      setSelectedById(new Map());
      setPlaylistMode("manual");
      setRoundDurationDraft(r.round_duration_sec ?? 10);
      window.history.pushState(null, "", `/game/${r.code}`);
    } catch {
      setError("Не удалось создать игру");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!token) {
      setAuthMode(true);
      return;
    }
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const r = await joinGameRoom(code);
      applyRoomUpdate(r);
      syncRoomPlaylist(r);
      setRoundDurationDraft(r.round_duration_sec ?? 10);
      window.history.pushState(null, "", `/game/${r.code}`);
    } catch {
      setError("Комната не найдена");
    } finally {
      setLoading(false);
    }
  }

  async function hostAction(action: string, payload: Record<string, unknown> = {}) {
    if (!room) return;
    try {
      const r = await gameRoomAction(room.code, action, payload);
      if (!isValidRoom(r)) return;
      applyRoomUpdate(r);
      if (r.state === "lobby") syncRoomPlaylist(r);
      if (r.round_duration_sec) setRoundDurationDraft(r.round_duration_sec);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  function addTrack(item: GameCatalogItem) {
    setSelectedById((prev) => new Map(prev).set(item.performance_id, item));
    setSelectedOrder((prev) => (prev.includes(item.performance_id) ? prev : [...prev, item.performance_id]));
  }

  function removeTrack(id: string) {
    setSelectedOrder((prev) => prev.filter((x) => x !== id));
    setSelectedById((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleSong(item: GameCatalogItem) {
    if (selectedIds.has(item.performance_id)) {
      removeTrack(item.performance_id);
    } else {
      addTrack(item);
    }
  }

  async function savePlaylist() {
    await hostAction("set_playlist", buildPlaylistPayload(selectedOrder, selectedById));
  }

  async function applyAutoPlaylist() {
    await hostAction("set_playlist_auto", { count: autoCount });
  }

  async function switchPlaylistMode(mode: GamePlaylistMode) {
    setPlaylistMode(mode);
    await hostAction("set_playlist_mode", { mode, count: autoCount });
  }

  async function handleBuzz() {
    if (!room || buzzLoading) return;
    setBuzzLoading(true);
    try {
      const r = await gameBuzz(room.code);
      if (isValidRoom(r)) applyRoomUpdate(r);
    } catch {
      // ws may have already updated
    } finally {
      setBuzzLoading(false);
    }
  }

  function copyCode() {
    if (!room) return;
    void navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canBuzz =
    room &&
    !isHost &&
    room.state === "round_playing" &&
    !clientTimerDone &&
    !room.paused &&
    !room.buzzed_user_id;

  const inRound = isActiveRoundState(room?.state);
  const guessSeconds = room?.round_duration_sec ?? roundDurationDraft ?? 10;
  const waitingForReveal =
    room?.state === "round_waiting_reveal" ||
    (room?.state === "round_playing" && clientTimerDone);

  const playerAvatarUrl = (userId: string, avatarUrl?: string | null) =>
    avatarUrl ?? (userId === myUserId ? myAvatarUrl : null);

  // Landing — only when no room code in URL
  if (!room && !loading && !activeCode) {
    return (
      <div className="gts-page" data-theme={theme} style={{ color: text }}>
        <div className="gts-hero">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
          <h1>Угадай песню</h1>
          <p>
            Создайте комнату, выберите песни Eurovision и соревнуйтесь с друзьями в реальном времени.
            Кто первый нажмёт «Ответить» — тот и отвечает!
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          <div className="gts-card" style={{ background: cardBg, border: cardBorder }}>
            <Music2 size={28} color={accent} style={{ marginBottom: 12 }} />
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Создать игру</h2>
            <p style={{ margin: "0 0 16px", color: sub, fontSize: 14 }}>
              Вы станете ведущим и выберете песни для раундов.
            </p>
            <button type="button" className="gts-btn gts-btn--primary" onClick={() => void handleCreate()}>
              <Plus size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Создать
            </button>
          </div>

          <div className="gts-card" style={{ background: cardBg, border: cardBorder }}>
            <Users size={28} color={accent} style={{ marginBottom: 12 }} />
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Подключиться</h2>
            <p style={{ margin: "0 0 12px", color: sub, fontSize: 14 }}>
              Введите код комнаты от ведущего.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: cardBorder,
                  background: inputBg,
                  color: text,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                }}
              />
              <button type="button" className="gts-btn gts-btn--primary" onClick={() => void handleJoin()}>
                Войти
              </button>
            </div>
          </div>
        </div>

        {error && <p style={{ textAlign: "center", color: "#f87171", marginTop: 20 }}>{error}</p>}

        {authMode && (
          <AuthModal
            onClose={() => setAuthMode(false)}
            onSuccess={(t: string) => {
              setToken(t);
              setAuthMode(false);
            }}
            theme={theme}
          />
        )}
      </div>
    );
  }

  if (loading && !room) {
    return (
      <div className="gts-page" data-theme={theme} style={{ color: text, textAlign: "center", paddingTop: 80 }}>
        <Loader2 size={32} className="gts-spin" color={accent} />
        <p style={{ marginTop: 16, color: sub }}>Подключаемся…</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="gts-page" data-theme={theme} style={{ color: text, textAlign: "center", paddingTop: 80 }}>
        <Loader2 size={32} className="gts-spin" color={accent} />
        <p style={{ marginTop: 16, color: sub }}>Загрузка комнаты…</p>
      </div>
    );
  }

  const displayRound = room.round ?? lastRoundRef.current;
  const roundPlayerMode = derivePlayerMode(room.state);

  const playerInstanceKey = `${room.current_round}-${displayRound?.performance_id ?? "round"}`;

  const playerActive =
    inRound &&
    !!displayRound &&
    ((room.state === "round_playing" && !clientTimerDone) ||
      room.state === "round_reveal" ||
      room.state === "round_clip");

  const showRevealInfo =
    displayRound &&
    (room.state === "round_reveal" || room.state === "round_clip") &&
    displayRound.artist;

  return (
    <div className="gts-page" data-theme={theme} style={{ color: text }}>
      <GameEndConfetti active={room.state === "finished"} />
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <span className="gts-status-pill gts-status-pill--live" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
            {gameStateLabel(room.state, room.paused)}
          </span>
          {room.state !== "lobby" && room.total_rounds > 0 && (
            <span style={{ marginLeft: 12, color: sub, fontSize: 14, fontWeight: 600 }}>
              Раунд {room.current_round + 1} / {room.total_rounds}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="gts-code" style={{ background: inputBg, border: cardBorder, fontSize: "1.25rem" }}>
            {room.code}
          </span>
          <button type="button" className="gts-btn gts-btn--ghost" onClick={copyCode} style={{ color: text, borderColor: sub }}>
            <Copy size={16} /> {copied ? "✓" : ""}
          </button>
        </div>
      </div>

      <div className="gts-grid-2">
        <div className="gts-card" style={{ background: cardBg, border: cardBorder }}>
          {room.state === "lobby" && isHost && (
            <>
              <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Настройка игры</h2>

              <div className="gts-mode-tabs" style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  className={`gts-mode-tab ${playlistMode === "manual" ? "gts-mode-tab--active" : ""}`}
                  onClick={() => void switchPlaylistMode("manual")}
                >
                  Ручной выбор
                </button>
                <button
                  type="button"
                  className={`gts-mode-tab ${playlistMode === "auto" ? "gts-mode-tab--active" : ""}`}
                  onClick={() => void switchPlaylistMode("auto")}
                >
                  Авто
                </button>
              </div>

              {playlistMode === "auto" ? (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: "0 0 10px", color: sub, fontSize: 13 }}>
                    Случайные песни из каталога Eurovision. Можно перегенерировать до старта.
                  </p>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: sub, marginBottom: 12 }}>
                    Количество песен:
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={autoCount}
                      onChange={(e) => setAutoCount(Math.max(1, Math.min(100, Number(e.target.value) || 10)))}
                      style={{ width: 64, padding: 6, borderRadius: 8, border: cardBorder, background: inputBg, color: text }}
                    />
                  </label>
                  <button type="button" className="gts-btn gts-btn--primary" onClick={() => void applyAutoPlaylist()}>
                    🎲 Сгенерировать случайный плейлист
                  </button>
                </div>
              ) : (
                <>
                  <div className="gts-mode-tabs gts-mode-tabs--sub" style={{ marginBottom: 10 }}>
                    <button
                      type="button"
                      className={`gts-mode-tab ${pickTab === "eurovision" ? "gts-mode-tab--active" : ""}`}
                      onClick={() => setPickTab("eurovision")}
                    >
                      Eurovision
                    </button>
                    <button
                      type="button"
                      className={`gts-mode-tab ${pickTab === "youtube" ? "gts-mode-tab--active" : ""}`}
                      onClick={() => setPickTab("youtube")}
                    >
                      YouTube
                    </button>
                  </div>

                  {pickTab === "eurovision" ? (
                    <>
                      <input
                        value={catalogQuery}
                        onChange={(e) => setCatalogQuery(e.target.value)}
                        placeholder="Поиск по артисту, песне, стране…"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: cardBorder,
                          background: inputBg,
                          color: text,
                          marginBottom: 8,
                        }}
                      />
                      <div className="gts-song-picker">
                        {filteredCatalog.slice(0, 200).map((item) => {
                          const thumb = getYouTubeThumb(item.youtube_link);
                          return (
                            <button
                              key={item.performance_id}
                              type="button"
                              className={`gts-song-item ${selectedIds.has(item.performance_id) ? "gts-song-item--selected" : ""}`}
                              style={{ color: text }}
                              onClick={() => toggleSong(item)}
                            >
                              {thumb ? (
                                <img src={thumb} alt="" className="gts-song-thumb" loading="lazy" />
                              ) : (
                                <span className="gts-song-thumb gts-song-thumb--placeholder">🎬</span>
                              )}
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <strong>{item.artist}</strong> — {item.song}
                                <span style={{ display: "block", fontSize: 12, color: sub }}>
                                  {supportsEmoji ? item.flag_emoji : "🌍"} {item.year} · {contestTypeLabel(item.contest_type)} · {item.country_name}
                                </span>
                              </span>
                              <span>{selectedIds.has(item.performance_id) ? "✓" : "+"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <GameYouTubeSearchTab
                      selectedIds={selectedIds}
                      onAdd={addTrack}
                      text={text}
                      sub={sub}
                      cardBorder={cardBorder}
                      inputBg={inputBg}
                      accent={accent}
                    />
                  )}
                </>
              )}

              {selectedOrder.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 13, color: sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Плейлист ({selectedOrder.length})
                  </h3>
                  <div className="gts-song-picker gts-song-picker--compact">
                    {selectedOrder.map((id) => {
                      const item = selectedById.get(id) ?? catalog.find((c) => c.performance_id === id);
                      if (!item) return null;
                      const thumb = getYouTubeThumb(item.youtube_link);
                      return (
                        <div key={id} className="gts-song-item gts-song-item--selected" style={{ color: text }}>
                          {thumb ? (
                            <img src={thumb} alt="" className="gts-song-thumb" loading="lazy" />
                          ) : (
                            <span className="gts-song-thumb gts-song-thumb--placeholder">🎬</span>
                          )}
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <strong>{item.artist}</strong> — {item.song}
                            {item.custom && (
                              <span style={{ display: "block", fontSize: 11, color: sub }}>YouTube</span>
                            )}
                          </span>
                          {playlistMode === "manual" && (
                            <button
                              type="button"
                              className="gts-btn gts-btn--ghost"
                              style={{ color: text, padding: "4px 8px" }}
                              onClick={() => removeTrack(id)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p style={{ margin: "12px 0 0", color: sub, fontSize: 13 }}>
                {playlistMode === "auto"
                  ? `Режим авто · ${selectedOrder.length || autoCount} песен`
                  : `Выбрано: ${selectedOrder.length}. Минимум 1 песня для старта.`}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                {playlistMode === "manual" && (
                  <button type="button" className="gts-btn gts-btn--ghost" style={{ color: text }} onClick={() => void savePlaylist()}>
                    Сохранить плейлист
                  </button>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: sub }}>
                  Баллы:
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={pointsDraft}
                    onChange={(e) => setPointsDraft(Number(e.target.value))}
                    style={{ width: 56, padding: 6, borderRadius: 8, border: cardBorder, background: inputBg, color: text }}
                  />
                  <button
                    type="button"
                    className="gts-btn gts-btn--ghost"
                    style={{ color: text, padding: "6px 10px" }}
                    onClick={() => void hostAction("set_points", { points: pointsDraft })}
                  >
                    OK
                  </button>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: sub }}>
                  Время (сек):
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={roundDurationDraft}
                    onChange={(e) => setRoundDurationDraft(Math.max(3, Math.min(120, Number(e.target.value) || 10)))}
                    style={{ width: 56, padding: 6, borderRadius: 8, border: cardBorder, background: inputBg, color: text }}
                  />
                  <button
                    type="button"
                    className="gts-btn gts-btn--ghost"
                    style={{ color: text, padding: "6px 10px" }}
                    onClick={() => void hostAction("set_round_duration", { seconds: roundDurationDraft })}
                  >
                    OK
                  </button>
                </label>
                <button
                  type="button"
                  className="gts-btn gts-btn--primary"
                  disabled={
                    playlistMode === "manual"
                      ? selectedOrder.length === 0 && (room.playlist_ids?.length ?? 0) === 0
                      : false
                  }
                  onClick={async () => {
                    if (playlistMode === "manual" && selectedOrder.length > 0) {
                      await hostAction("set_playlist", buildPlaylistPayload(selectedOrder, selectedById));
                    } else if (playlistMode === "auto") {
                      if (selectedOrder.length === 0) {
                        await hostAction("set_playlist_mode", { mode: "auto", count: autoCount });
                      }
                    }
                    await hostAction("start");
                  }}
                >
                  <Play size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Начать игру
                </button>
              </div>
            </>
          )}

          {room.state === "lobby" && !isHost && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Loader2 size={28} className="gts-spin" color={accent} />
              <p style={{ marginTop: 16, color: sub }}>
                Ожидаем ведущего <strong style={{ color: text }}>{room.host_username}</strong>…
              </p>
              <p style={{ fontSize: 14, color: sub }}>
                Песни: {room.total_rounds || room.playlist_ids?.length || 0}
                {room.playlist_mode === "auto" ? " (авто)" : ""}
              </p>
              {room.playlist_preview && room.playlist_preview.length > 0 && (
                <div className="gts-song-picker gts-song-picker--compact" style={{ marginTop: 16, textAlign: "left" }}>
                  {room.playlist_preview.map((item) => (
                    <div key={item.performance_id} className="gts-song-item" style={{ color: text, cursor: "default" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong>{item.artist}</strong> — {item.song}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {inRound && (
            <>
              {displayRound ? (
                <>
                  <div className="gts-round-header">
                    {room.state === "round_playing" && displayRound.round_ends_at && (
                      <GameRoundTimer
                        endsAt={displayRound.round_ends_at}
                        color={accent}
                        onExpire={handleTimerExpire}
                      />
                    )}
                  </div>

                  <GameYouTubePlayer
                    key={playerInstanceKey}
                    youtubeLink={displayRound.youtube_link ?? ""}
                    mode={roundPlayerMode}
                    active={playerActive}
                    paused={room.paused}
                    startSeconds={displayRound.video_start_sec ?? 0}
                    instanceKey={playerInstanceKey}
                    onPlaybackReady={() => setTrackReady(true)}
                  />

                  {room.state === "round_playing" && playerActive && !trackReady && (
                    <p style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: sub }}>
                      Загрузка трека…
                    </p>
                  )}

                  {showRevealInfo && (
                    <div className="gts-reveal-card">
                      <div style={{ fontSize: 32, marginBottom: 8 }}>
                        {supportsEmoji && displayRound.flag_emoji ? displayRound.flag_emoji : "🎤"}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>{displayRound.artist}</div>
                      <div className="gts-reveal-song">{displayRound.song}</div>
                      <div style={{ fontSize: 13, color: sub, marginTop: 6 }}>
                        {displayRound.country_name}
                        {displayRound.year ? ` · ${displayRound.year}` : ""}
                      </div>
                      <GameContestScoresFeed
                        scores={displayRound.contest_scores ?? []}
                        theme={theme}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 16px", color: sub }}>
                  <Loader2 size={28} className="gts-spin" color={accent} />
                  <p style={{ marginTop: 16 }}>Обновляем раунд…</p>
                </div>
              )}

              {room.state === "round_buzzed" && room.buzzed_username && (
                <p style={{ textAlign: "center", marginTop: 16, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  🔔 Отвечает:
                  {room.buzzed_user_id && (
                    <UserAvatar
                      username={room.buzzed_username}
                      avatarUrl={playerAvatarUrl(
                        room.buzzed_user_id,
                        sortedPlayers.find((p) => p.user_id === room.buzzed_user_id)?.avatar_url
                      )}
                      size={32}
                      theme={theme}
                    />
                  )}
                  <span style={{ color: accent }}>{room.buzzed_username}</span>
                </p>
              )}

              {room.state === "round_waiting_reveal" && (
                <p style={{ textAlign: "center", marginTop: 16, fontSize: 15, color: sub, fontWeight: 600 }}>
                  ⏱ Никто не успел ответить за {guessSeconds} секунд
                </p>
              )}

              {room.state === "round_playing" && clientTimerDone && (
                <p style={{ textAlign: "center", marginTop: 16, fontSize: 15, color: sub, fontWeight: 600 }}>
                  ⏱ Время вышло…
                </p>
              )}

              {room.last_judgement && room.state === "round_reveal" && (
                <p
                  style={{
                    textAlign: "center",
                    marginTop: 12,
                    fontWeight: 700,
                    color: room.last_judgement.correct ? "#22c55e" : "#f87171",
                  }}
                >
                  {room.last_judgement.correct
                    ? `✓ ${room.last_judgement.username}: верно! +${room.last_judgement.delta}`
                    : `✗ ${room.last_judgement.username}: неверно`}
                </p>
              )}

              {isHost && room.state === "round_buzzed" && (
                <div className="gts-judge-btns">
                  <button type="button" className="gts-btn gts-btn--success" onClick={() => void hostAction("judge", { correct: true })}>
                    ✓ Верно
                  </button>
                  <button type="button" className="gts-btn gts-btn--danger" onClick={() => void hostAction("judge", { correct: false })}>
                    ✗ Неверно
                  </button>
                </div>
              )}

              {isHost && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20, justifyContent: "center" }}>
                  {room.state === "round_waiting_reveal" && (
                    <button type="button" className="gts-btn gts-btn--primary" onClick={() => void hostAction("reveal")}>
                      Раскрыть ответ
                    </button>
                  )}

                  {room.state === "round_reveal" && (
                    <button type="button" className="gts-btn gts-btn--primary" onClick={() => void hostAction("next_round")}>
                      Следующий раунд →
                    </button>
                  )}

                  {(room.state === "round_playing" || room.state === "round_reveal") && (
                    <button
                      type="button"
                      className="gts-btn gts-btn--ghost"
                      style={{ color: text }}
                      onClick={() => void hostAction(room.paused ? "resume" : "pause")}
                    >
                      {room.paused ? <Play size={16} /> : <Pause size={16} />}
                      {room.paused ? " Продолжить" : " Пауза"}
                    </button>
                  )}

                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: sub }}>
                    Баллы:
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={pointsDraft}
                      onChange={(e) => setPointsDraft(Number(e.target.value))}
                      style={{ width: 48, padding: 4, borderRadius: 8, border: cardBorder, background: inputBg, color: text }}
                    />
                    <button type="button" className="gts-btn gts-btn--ghost" style={{ color: text, padding: "4px 8px" }} onClick={() => void hostAction("set_points", { points: pointsDraft })}>
                      OK
                    </button>
                  </label>
                </div>
              )}

              {!isHost && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                  <button
                    type="button"
                    className="gts-buzz-btn"
                    disabled={!canBuzz || buzzLoading}
                    onClick={() => void handleBuzz()}
                  >
                    <Zap size={22} style={{ verticalAlign: "middle", marginRight: 8 }} />
                    {room.state === "round_buzzed" && room.buzzed_user_id === myUserId
                      ? "Ваш ход!"
                      : room.state === "round_buzzed"
                        ? "Ждём ответ…"
                        : waitingForReveal
                          ? "Время вышло…"
                          : room.state === "round_reveal" || room.state === "round_clip"
                            ? "Смотрим ответ"
                            : "Ответить!"}
                  </button>
                </div>
              )}
            </>
          )}

          {room.state === "finished" && (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
              <h2 style={{ margin: "0 0 8px" }}>Игра окончена!</h2>
              {sortedPlayers[0] && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
                  <UserAvatar
                    username={sortedPlayers[0].username}
                    avatarUrl={playerAvatarUrl(sortedPlayers[0].user_id, sortedPlayers[0].avatar_url)}
                    size={48}
                    theme={theme}
                  />
                  <p style={{ margin: 0, color: sub }}>
                    Победитель: <strong style={{ color: accent }}>{sortedPlayers[0].username}</strong>
                    {" "}({sortedPlayers[0].score} очков)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="gts-scoreboard" style={{ background: cardBg, border: cardBorder }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: sub }}>
            Игроки
          </h3>
          {sortedPlayers.map((p, i) => (
            <div
              key={p.user_id}
              className={`gts-score-row ${i === 0 && p.score > 0 ? "gts-score-row--leader" : ""} ${room.buzzed_user_id === p.user_id ? "gts-score-row--buzzed" : ""}`}
              style={{ background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)" }}
            >
              <span className="gts-score-row__main">
                <UserAvatar
                  username={p.username}
                  avatarUrl={playerAvatarUrl(p.user_id, p.avatar_url)}
                  size={36}
                  theme={theme}
                />
                <span className="gts-score-row__name">
                  {i === 0 && p.score > 0 ? "👑 " : ""}
                  {p.username}
                  {p.user_id === room.host_user_id && (
                    <span style={{ fontSize: 11, color: sub, marginLeft: 6 }}>ведущий</span>
                  )}
                </span>
              </span>
              <strong style={{ color: accent, fontSize: 18 }}>{p.score}</strong>
            </div>
          ))}
        </aside>
      </div>

      {error && <p style={{ textAlign: "center", color: "#f87171", marginTop: 16 }}>{error}</p>}
    </div>
  );
}
