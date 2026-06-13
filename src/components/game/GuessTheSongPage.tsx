import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { GameCatalogItem, GameRoomView } from "../../types/game";
import {
  createGameRoom,
  fetchGameCatalog,
  gameBuzz,
  gameRoomAction,
  joinGameRoom,
} from "../../api/game";
import { useGameWebSocket } from "../../hooks/useGameWebSocket";
import { GameYouTubePlayer } from "./GameYouTubePlayer";
import { AuthModal } from "../AuthModal";
import { contestTypeLabel } from "../../utils/contestLabels";
import { getDoesBrowserSupportFlagEmojis } from "../../utils/emojiSupport";
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

export function GuessTheSongPage({ theme, roomCode: roomCodeProp }: Props) {
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [myUserId] = useState(() => localStorage.getItem("user_id"));
  const [authMode, setAuthMode] = useState(false);

  const [joinInput, setJoinInput] = useState("");
  const [room, setRoom] = useState<GameRoomView | null>(null);
  const [catalog, setCatalog] = useState<GameCatalogItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [catalogQuery, setCatalogQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pointsDraft, setPointsDraft] = useState(10);
  const [buzzLoading, setBuzzLoading] = useState(false);

  const activeCode = room?.code || roomCodeProp || parseRoomFromPath() || null;

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

  const onGameEvent = useCallback((msg: { type: string; room?: GameRoomView }) => {
    if (msg.type === "game.state" && msg.room) {
      setRoom(msg.room);
      setPointsDraft(msg.room.points_per_correct);
    }
  }, []);

  useGameWebSocket({
    wsUrl: WS_URL || API_URL.replace(/^http/, "ws"),
    token,
    roomCode: activeCode || "",
    enabled: !!token && !!activeCode && !!room,
    onMessage: onGameEvent,
  });

  useEffect(() => {
    fetchGameCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (!token || !activeCode || room) return;
    setLoading(true);
    joinGameRoom(activeCode)
      .then((r) => {
        setRoom(r);
        setSelectedIds(new Set(r.playlist_ids ?? []));
        setPointsDraft(r.points_per_correct);
        if (window.location.pathname === "/game") {
          window.history.replaceState(null, "", `/game/${r.code}`);
        }
      })
      .catch(() => setError("Не удалось войти в комнату"))
      .finally(() => setLoading(false));
  }, [token, activeCode, room]);

  async function handleCreate() {
    if (!token) {
      setAuthMode(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await createGameRoom();
      setRoom(r);
      setSelectedIds(new Set());
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
      setRoom(r);
      setSelectedIds(new Set(r.playlist_ids ?? []));
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
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  function toggleSong(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function savePlaylist() {
    await hostAction("set_playlist", { performance_ids: [...selectedIds] });
  }

  async function handleBuzz() {
    if (!room || buzzLoading) return;
    setBuzzLoading(true);
    try {
      const r = await gameBuzz(room.code);
      setRoom(r);
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
    !room.paused &&
    !room.buzzed_user_id;

  const roundKey = room?.round
    ? `${room.current_round}-${room.round.mode}-${room.state}`
    : "none";

  // Landing
  if (!room && !loading) {
    return (
      <div className="gts-page" style={{ color: text }}>
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
      <div className="gts-page" style={{ color: text, textAlign: "center", paddingTop: 80 }}>
        <Loader2 size={32} className="gts-spin" color={accent} />
        <p style={{ marginTop: 16, color: sub }}>Подключаемся…</p>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="gts-page" style={{ color: text }}>
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
            {room.state === "lobby" ? "Лобби" : room.paused ? "Пауза" : "В эфире"}
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
              <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Выберите песни</h2>
              <p style={{ margin: "0 0 12px", color: sub, fontSize: 13 }}>
                Выбрано: {selectedIds.size}. Минимум 1 песня для старта.
              </p>
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
                {filteredCatalog.slice(0, 200).map((item) => (
                  <button
                    key={item.performance_id}
                    type="button"
                    className={`gts-song-item ${selectedIds.has(item.performance_id) ? "gts-song-item--selected" : ""}`}
                    style={{ color: text }}
                    onClick={() => toggleSong(item.performance_id)}
                  >
                    <span style={{ fontSize: 18 }}>{supportsEmoji ? item.flag_emoji : "🌍"}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{item.artist}</strong> — {item.song}
                      <span style={{ display: "block", fontSize: 12, color: sub }}>
                        {item.year} · {contestTypeLabel(item.contest_type)} · {item.country_name}
                      </span>
                    </span>
                    <span>{selectedIds.has(item.performance_id) ? "✓" : "+"}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                <button type="button" className="gts-btn gts-btn--ghost" style={{ color: text }} onClick={() => void savePlaylist()}>
                  Сохранить плейлист
                </button>
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
                <button
                  type="button"
                  className="gts-btn gts-btn--primary"
                  disabled={selectedIds.size === 0 && (room.playlist_ids?.length ?? 0) === 0}
                  onClick={async () => {
                    if (selectedIds.size > 0) {
                      await hostAction("set_playlist", { performance_ids: [...selectedIds] });
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
              <p style={{ fontSize: 14, color: sub }}>Песни: {room.total_rounds || room.playlist_ids?.length || 0}</p>
            </div>
          )}

          {(room.state === "round_playing" ||
            room.state === "round_buzzed" ||
            room.state === "round_reveal") &&
            room.round && (
              <>
                {room.round.mode === "audio" && (
                  <GameYouTubePlayer
                    youtubeLink={room.round.youtube_link}
                    mode="audio"
                    paused={room.paused || room.state !== "round_playing"}
                    roundKey={roundKey}
                  />
                )}
                {room.round.mode === "video" && (
                  <>
                    <GameYouTubePlayer
                      youtubeLink={room.round.youtube_link}
                      mode="video"
                      paused={room.paused}
                      roundKey={roundKey}
                    />
                    {room.round.artist && (
                      <div
                        className="gts-reveal-card"
                        style={{
                          background: isLight ? "rgba(79,70,229,0.08)" : "rgba(79,124,255,0.12)",
                          border: cardBorder,
                        }}
                      >
                        <div style={{ fontSize: 32, marginBottom: 8 }}>
                          {supportsEmoji && room.round.flag_emoji ? room.round.flag_emoji : "🎤"}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900 }}>{room.round.artist}</div>
                        <div style={{ fontSize: 17, color: accent, fontWeight: 700 }}>{room.round.song}</div>
                        <div style={{ fontSize: 13, color: sub, marginTop: 6 }}>
                          {room.round.country_name} · {room.round.year}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {room.state === "round_buzzed" && room.buzzed_username && (
                  <p style={{ textAlign: "center", marginTop: 16, fontSize: 16, fontWeight: 700 }}>
                    🔔 Отвечает: <span style={{ color: accent }}>{room.buzzed_username}</span>
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
                      ? `✓ Верно! +${room.last_judgement.delta}`
                      : "✗ Неверно"}
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
                    <button
                      type="button"
                      className="gts-btn gts-btn--ghost"
                      style={{ color: text }}
                      onClick={() => void hostAction(room.paused ? "resume" : "pause")}
                    >
                      {room.paused ? <Play size={16} /> : <Pause size={16} />}
                      {room.paused ? " Продолжить" : " Пауза"}
                    </button>
                    {room.state === "round_reveal" && (
                      <button type="button" className="gts-btn gts-btn--primary" onClick={() => void hostAction("next")}>
                        Следующий раунд →
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
              <p style={{ color: sub }}>
                Победитель: <strong style={{ color: accent }}>{sortedPlayers[0]?.username ?? "—"}</strong>
                {" "}({sortedPlayers[0]?.score ?? 0} очков)
              </p>
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
              <span>
                {i === 0 && p.score > 0 ? "👑 " : ""}
                {p.username}
                {p.user_id === room.host_user_id && (
                  <span style={{ fontSize: 11, color: sub, marginLeft: 6 }}>ведущий</span>
                )}
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
