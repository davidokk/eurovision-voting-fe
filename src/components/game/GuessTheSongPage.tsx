import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  Users,
  ListMusic,
  Zap,
} from "lucide-react";
import type { Theme } from "../../types/contest";
import type { GameCatalogItem, GameJudgement, GameJudgeOutcome, GamePlaylistEntryInput, GamePlaylistMode, GamePlayMode, GameRoomState, GameRoomView, GameRoundView } from "../../types/game";
import {
  buildPlaylistPayload,
  createGameRoom,
  fetchGameCatalog,
  gameBuzz,
  gameRoomAction,
  gameSubmitAnswer,
  getGameRoom,
  joinGameRoom,
} from "../../api/game";
import { useGameWebSocket } from "../../hooks/useGameWebSocket";
import { useGameTrackPreload } from "../../hooks/useGameTrackPreload";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";
import { GameYouTubePlayer, type PlayerMode, type PlayerOverlay } from "./GameYouTubePlayer";
import { GameRoundTimer } from "./GameRoundTimer";
import { GameRoundCountdown } from "./GameRoundCountdown";
import { GameContestScoresFeed } from "./GameContestScoresFeed";
import { GameEndConfetti } from "./GameEndConfetti";
import { GameLobbyWizard } from "./GameLobbyWizard";
import { GameSavedPlaylistsManager } from "./GameSavedPlaylistsManager";
import { GameAnswerForm } from "./GameAnswerForm";
import { GameJudgementPopup } from "./GameJudgementPopup";
import { playlistEntriesToCatalog } from "../../utils/gamePlaylist";
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
import { loadYouTubeIframeAPI } from "../../utils/youtube";
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
    case "round_countdown":
      return "Приготовьтесь";
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

function halfPoints(points: number): number {
  const half = Math.floor(points / 2);
  return half > 0 ? half : 1;
}

function judgementPopupKey(j: GameJudgement, round: number): string {
  return `${round}:${j.username}:${j.delta}:${j.outcome ?? ""}:${j.points}`;
}

function derivePlayerMode(state: GameRoomState | string | undefined): PlayerMode {
  switch (state) {
    case "round_reveal":
      return "video";
    case "round_clip":
      return "video_full";
    case "round_buzzed":
    case "round_waiting_reveal":
    case "round_countdown":
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
  const [showSavedPlaylists, setShowSavedPlaylists] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

  const [joinInput, setJoinInput] = useState("");
  const [room, setRoom] = useState<GameRoomView | null>(() =>
    initialCode ? loadCachedGameRoom(initialCode) : null
  );
  const [catalog, setCatalog] = useState<GameCatalogItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [selectedById, setSelectedById] = useState<Map<string, GameCatalogItem>>(() => new Map());
  const [playlistMode, setPlaylistMode] = useState<GamePlaylistMode>("manual");
  const [playMode, setPlayMode] = useState<GamePlayMode>("offline");
  const [autoCount, setAutoCount] = useState(10);
  const [pickTab, setPickTab] = useState<"eurovision" | "youtube">("eurovision");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [loading, setLoading] = useState(() => !!initialCode);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedPoints, setSavedPoints] = useState(10);
  const [savedDuration, setSavedDuration] = useState(10);
  const [buzzLoading, setBuzzLoading] = useState(false);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgePending, setJudgePending] = useState<GameJudgeOutcome | null>(null);
  const [judgementPopup, setJudgementPopup] = useState<GameJudgement | null>(null);
  const lastJudgementPopupKeyRef = useRef("");
  const [clientTimerDone, setClientTimerDone] = useState(false);
  const [trackReady, setTrackReady] = useState(false);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [roulettePreview, setRoulettePreview] = useState<GameCatalogItem | null>(null);
  const [rouletteStrip, setRouletteStrip] = useState<GameCatalogItem[]>([]);
  const [rouletteProgress, setRouletteProgress] = useState(0);
  const rouletteIntervalRef = useRef<number | null>(null);
  const rouletteProgressRef = useRef<number | null>(null);
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
    if (r.play_mode) setPlayMode(r.play_mode);
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
            if (r.state !== "round_playing" && r.state !== "round_reveal") return;
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
  }, [room?.current_round, room?.round?.performance_id, room?.state]);

  const showJudgementPopup = useCallback((j: GameJudgement, roundIndex: number) => {
    const key = judgementPopupKey(j, roundIndex);
    if (lastJudgementPopupKeyRef.current === key) return;
    lastJudgementPopupKeyRef.current = key;
    setJudgementPopup(j);
  }, []);

  const onGameEvent = useCallback((msg: { type: string; room?: GameRoomView }) => {
    if (msg.type !== "game.state" || !isValidRoom(msg.room)) return;
    const next = msg.room!;
    const apply = () => {
      applyRoomUpdate(next);
      setSavedPoints(next.points_per_correct);
      if (next.round_duration_sec) {
        setSavedDuration(next.round_duration_sec);
      }
      if (next.state === "lobby") syncRoomPlaylist(next);
      else if (next.play_mode) setPlayMode(next.play_mode);
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
    if (!room?.last_judgement || room.state !== "round_reveal") return;
    showJudgementPopup(room.last_judgement, room.current_round);
  }, [room?.last_judgement, room?.state, room?.current_round, showJudgementPopup]);

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
        setSavedPoints(r.points_per_correct);
        if (r.round_duration_sec) {
          setSavedDuration(r.round_duration_sec);
        }
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
      setSavedDuration(r.round_duration_sec ?? 10);
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
      setSavedDuration(r.round_duration_sec ?? 10);
      window.history.pushState(null, "", `/game/${r.code}`);
    } catch {
      setError("Комната не найдена");
    } finally {
      setLoading(false);
    }
  }

  async function hostAction(action: string, payload: Record<string, unknown> = {}): Promise<GameRoomView | null> {
    if (!room) return null;
    try {
      const r = await gameRoomAction(room.code, action, payload);
      if (!isValidRoom(r)) return null;
      applyRoomUpdate(r);
      if (r.state === "lobby") syncRoomPlaylist(r);
      if (r.round_duration_sec) {
        setSavedDuration(r.round_duration_sec);
      }
      if (typeof r.points_per_correct === "number") {
        setSavedPoints(r.points_per_correct);
      }
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      return null;
    }
  }

  async function applyPoints(points: number) {
    await hostAction("set_points", { points });
  }

  async function applyDuration(seconds: number) {
    await hostAction("set_round_duration", { seconds });
  }

  async function handleJudge(outcome: GameJudgeOutcome) {
    if (judgeLoading || !room) return;
    setJudgeLoading(true);
    setJudgePending(outcome);
    try {
      const r = await hostAction("judge", {
        outcome,
        correct: outcome !== "wrong",
      });
      if (r?.last_judgement) {
        showJudgementPopup(r.last_judgement, r.current_round);
      }
    } finally {
      setJudgeLoading(false);
      setJudgePending(null);
    }
  }

  function commitManualPlaylist(order: string[], byId: Map<string, GameCatalogItem>) {
    if (playlistMode !== "manual") return;
    void hostAction("set_playlist", buildPlaylistPayload(order, byId));
  }

  function addTrack(item: GameCatalogItem) {
    if (selectedOrder.includes(item.performance_id)) return;
    const nextOrder = [...selectedOrder, item.performance_id];
    const nextById = new Map(selectedById).set(item.performance_id, item);
    setSelectedOrder(nextOrder);
    setSelectedById(nextById);
    commitManualPlaylist(nextOrder, nextById);
  }

  function removeTrack(id: string) {
    const nextOrder = selectedOrder.filter((x) => x !== id);
    const nextById = new Map(selectedById);
    nextById.delete(id);
    setSelectedOrder(nextOrder);
    setSelectedById(nextById);
    commitManualPlaylist(nextOrder, nextById);
  }

  function reorderPlaylist(nextOrder: string[]) {
    setSelectedOrder(nextOrder);
    commitManualPlaylist(nextOrder, selectedById);
  }

  function toggleSong(item: GameCatalogItem) {
    if (selectedIds.has(item.performance_id)) {
      removeTrack(item.performance_id);
    } else {
      addTrack(item);
    }
  }

  useEffect(() => {
    return () => {
      if (rouletteIntervalRef.current != null) {
        window.clearInterval(rouletteIntervalRef.current);
      }
      if (rouletteProgressRef.current != null) {
        window.clearInterval(rouletteProgressRef.current);
      }
    };
  }, []);

  async function applyAutoPlaylistWithAnimation() {
    if (rouletteSpinning) return;

    const pickRandom = () => catalog[Math.floor(Math.random() * catalog.length)] ?? null;

    if (catalog.length === 0) {
      await hostAction("set_playlist_auto", { count: autoCount });
      return;
    }

    setRouletteSpinning(true);
    setRouletteProgress(0);
    const first = pickRandom();
    setRoulettePreview(first);
    setRouletteStrip(first ? [first] : []);

    if (rouletteIntervalRef.current != null) {
      window.clearInterval(rouletteIntervalRef.current);
    }
    if (rouletteProgressRef.current != null) {
      window.clearInterval(rouletteProgressRef.current);
    }

    const spinDuration = 2400;
    const startedAt = Date.now();

    rouletteIntervalRef.current = window.setInterval(() => {
      const next = pickRandom();
      if (!next) return;
      setRoulettePreview(next);
      setRouletteStrip((prev) => [...prev, next].slice(-8));
    }, 90);

    rouletteProgressRef.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - startedAt) / spinDuration);
      setRouletteProgress(p);
    }, 40);

    const minDelay = new Promise<void>((resolve) => window.setTimeout(resolve, spinDuration));
    const apiCall = hostAction("set_playlist_auto", { count: autoCount });
    await Promise.all([minDelay, apiCall]);

    if (rouletteIntervalRef.current != null) {
      window.clearInterval(rouletteIntervalRef.current);
      rouletteIntervalRef.current = null;
    }
    if (rouletteProgressRef.current != null) {
      window.clearInterval(rouletteProgressRef.current);
      rouletteProgressRef.current = null;
    }
    setRouletteProgress(1);
    setRouletteSpinning(false);
  }

  async function switchPlaylistMode(mode: GamePlaylistMode) {
    setPlaylistMode(mode);
    await hostAction("set_playlist_mode", { mode, count: autoCount });
    if (mode === "auto" && selectedOrder.length === 0) {
      void applyAutoPlaylistWithAnimation();
    }
  }

  async function applyPlayMode(mode: GamePlayMode) {
    setPlayMode(mode);
    await hostAction("set_play_mode", { mode });
  }

  async function handleSubmitAnswer(answer: string) {
    if (!room) return;
    const r = await gameSubmitAnswer(room.code, answer);
    if (isValidRoom(r)) applyRoomUpdate(r);
  }

  async function applySavedEntries(entries: GamePlaylistEntryInput[]) {
    const { order, byId } = playlistEntriesToCatalog(entries, catalog);
    setSelectedOrder(order);
    setSelectedById(byId);
    setPlaylistMode("manual");
    await hostAction("set_playlist_mode", { mode: "manual", count: autoCount });
    await hostAction("set_playlist", buildPlaylistPayload(order, byId));
  }

  async function handleStartGame() {
    setStartLoading(true);
    try {
      if (selectedOrder.length > 0) {
        await hostAction("set_playlist", buildPlaylistPayload(selectedOrder, selectedById));
      } else if (playlistMode === "auto") {
        await applyAutoPlaylistWithAnimation();
      }
      await hostAction("start");
    } finally {
      setStartLoading(false);
    }
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
  const roundDurationSec = room?.round_duration_sec ?? 10;
  const guessSeconds = roundDurationSec;
  const inCountdown = room?.state === "round_countdown";
  const waitingForReveal =
    room?.state === "round_waiting_reveal" ||
    (room?.state === "round_playing" && clientTimerDone);

  const playerAvatarUrl = (userId: string, avatarUrl?: string | null) =>
    avatarUrl ?? (userId === myUserId ? myAvatarUrl : null);

  function roundStatusText(): { text: string; color?: string } | null {
    if (!room) return null;
    if (room.state === "round_buzzed" && room.buzzed_username) {
      if (room.play_mode === "online") {
        if (room.buzzed_answer) {
          return { text: `💬 ${room.buzzed_username}: «${room.buzzed_answer}»`, color: accent };
        }
        if (room.buzzed_user_id === myUserId) {
          return { text: "✍️ Введите ответ ниже", color: accent };
        }
        return { text: `🔔 ${room.buzzed_username} вводит ответ…`, color: accent };
      }
      return { text: `🔔 Отвечает: ${room.buzzed_username}`, color: accent };
    }
    if (room.state === "round_countdown") {
      return { text: "⏳ Приготовьтесь…", color: accent };
    }
    if (room.state === "round_waiting_reveal") {
      return { text: `⏱ Никто не успел за ${guessSeconds} сек`, color: sub };
    }
    if (room.state === "round_playing" && clientTimerDone) {
      return { text: "⏱ Время вышло…", color: sub };
    }
    if (room.state === "round_playing" && !clientTimerDone && !room.paused) {
      return { text: "🎧 Слушайте и угадывайте", color: sub };
    }
    if (room.paused) return { text: "⏸ Пауза", color: sub };
    if (room.state === "round_reveal" || room.state === "round_clip") {
      return { text: "🎬 Ответ", color: accent };
    }
    return null;
  }

  const playlistLinks = useMemo(() => {
    if (!room) return [];
    if (room.playlist_sources?.length) return room.playlist_sources.filter(Boolean);
    if (room.state === "lobby" && isHost) {
      return selectedOrder
        .map((id) => selectedById.get(id)?.youtube_link ?? catalog.find((c) => c.performance_id === id)?.youtube_link)
        .filter((link): link is string => !!link);
    }
    if (room.playlist_preview?.length) {
      return room.playlist_preview.map((item) => item.youtube_link).filter(Boolean);
    }
    return [];
  }, [room, room?.playlist_sources, room?.playlist_preview, room?.state, isHost, selectedOrder, selectedById, catalog]);

  useGameTrackPreload(playlistLinks, room?.current_round ?? 0, !!room && playlistLinks.length > 0);

  // Landing — only when no room code in URL
  if (!room && !loading && !activeCode) {
    return (
      <div
        className={`gts-page ${showSavedPlaylists && token ? "gts-page--saved" : "gts-page--landing"}`}
        data-theme={theme}
        style={{ color: text }}
      >
        {showSavedPlaylists && token ? (
          <GameSavedPlaylistsManager
            theme={theme}
            catalog={catalog}
            textColor={text}
            subColor={sub}
            accent={accent}
            cardBg={cardBg}
            cardBorder={cardBorder}
            inputBg={inputBg}
            onClose={() => setShowSavedPlaylists(false)}
          />
        ) : (
        <div className="gts-landing">
          <div className="gts-landing__hero">
            <span className="gts-landing__icon">🎵</span>
            <h1>Угадай песню</h1>
            <p>Комната, плейлист Eurovision, buzzer в реальном времени.</p>
          </div>

          <div className="gts-landing__cards">
            <div className="gts-landing__card" style={{ background: cardBg, border: cardBorder }}>
              <Music2 size={24} color={accent} />
              <div>
                <h2>Создать</h2>
                <p>Вы — ведущий, выбираете песни.</p>
              </div>
              <button type="button" className="gts-btn gts-btn--primary" onClick={() => void handleCreate()}>
                <Plus size={16} /> Новая игра
              </button>
            </div>

            <div className="gts-landing__card" style={{ background: cardBg, border: cardBorder }}>
              <Users size={24} color={accent} />
              <div>
                <h2>Войти</h2>
                <p>Код от ведущего.</p>
              </div>
              <div className="gts-landing__join">
                <input
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  style={{ border: cardBorder, background: inputBg, color: text }}
                />
                <button type="button" className="gts-btn gts-btn--primary" onClick={() => void handleJoin()}>
                  →
                </button>
              </div>
            </div>

            {token && (
              <div className="gts-landing__card gts-landing__card--wide" style={{ background: cardBg, border: cardBorder }}>
                <ListMusic size={24} color={accent} />
                <div>
                  <h2>Мои плейлисты</h2>
                  <p>Соберите списки песен заранее и используйте при создании игры.</p>
                </div>
                <button
                  type="button"
                  className="gts-btn gts-btn--ghost"
                  onClick={() => {
                    if (!catalog.length) void fetchGameCatalog().then(setCatalog);
                    setShowSavedPlaylists(true);
                  }}
                >
                  Открыть
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {!showSavedPlaylists && error && <p className="gts-landing__error">{error}</p>}

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
  const roundStartSec =
    displayRound?.video_start_sec && displayRound.video_start_sec > 0
      ? displayRound.video_start_sec
      : room.state === "round_playing" || room.state === "round_countdown"
        ? 45
        : 0;

  const playerInstanceKey = `${room.current_round}-${displayRound?.performance_id ?? "round"}`;

  const playerActive =
    inRound &&
    !!displayRound?.youtube_link &&
    (inCountdown ||
      (room.state === "round_playing" && !clientTimerDone) ||
      room.state === "round_reveal" ||
      room.state === "round_clip");

  const playerPaused = room.paused || inCountdown;

  const showRevealInfo =
    displayRound &&
    (room.state === "round_reveal" || room.state === "round_clip") &&
    displayRound.artist;

  const showHostAnswerHint =
    !!isHost &&
    room.state === "round_buzzed" &&
    !!displayRound?.artist &&
    !!displayRound?.song;

  const isOnlinePlay = room?.play_mode === "online";
  const isBuzzedPlayer = room?.buzzed_user_id === myUserId;
  const showAnswerForm =
    isOnlinePlay &&
    room?.state === "round_buzzed" &&
    isBuzzedPlayer &&
    !room.buzzed_answer;

  const hideScoreboardAside = inRound || (room.state === "lobby" && !!isHost);
  const judgePoints = room.points_per_correct ?? savedPoints;
  const judgeHalfPoints = halfPoints(judgePoints);

  const playerOverlay: PlayerOverlay | null =
    room.state === "round_buzzed" && room.buzzed_username
      ? {
          kind: "buzzed",
          username: room.buzzed_username,
          avatarUrl: playerAvatarUrl(
            room.buzzed_user_id!,
            sortedPlayers.find((p) => p.user_id === room.buzzed_user_id)?.avatar_url
          ),
        }
      : room.paused && inRound
        ? { kind: "paused" }
        : null;

  return (
    <div className="gts-page" data-theme={theme} style={{ color: text }}>
      <GameEndConfetti active={room.state === "finished"} />
      <GameJudgementPopup
        judgement={judgementPopup}
        pointsPerCorrect={judgePoints}
        onDismiss={() => setJudgementPopup(null)}
      />
      <div className="gts-room-topbar">
        <div>
          <span className="gts-status-pill gts-status-pill--live" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
            {gameStateLabel(room.state, room.paused)}
          </span>
          {room.state !== "lobby" && room.total_rounds > 0 && (
            <span style={{ marginLeft: 10, color: sub, fontSize: 13, fontWeight: 600 }}>
              Раунд {room.current_round + 1} / {room.total_rounds}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="gts-code" style={{ background: inputBg, border: cardBorder }}>
            {room.code}
          </span>
          <button type="button" className="gts-btn gts-btn--ghost" onClick={copyCode} style={{ color: text, borderColor: sub }}>
            <Copy size={16} /> {copied ? "✓" : ""}
          </button>
        </div>
      </div>

      <div
        className={`gts-room-shell ${hideScoreboardAside ? "gts-room-shell--in-round" : ""}`}
      >
        <div
          className={`gts-card ${room.state === "lobby" && isHost ? "gts-card--lobby" : ""} ${inRound ? "gts-card--round" : ""}`}
          style={inRound ? undefined : { background: cardBg, border: cardBorder }}
        >
          {room.state === "lobby" && isHost && (
            <GameLobbyWizard
              theme={theme}
              hostUserId={room.host_user_id}
              players={sortedPlayers}
              savedPoints={savedPoints}
              savedDuration={savedDuration}
              playMode={playMode}
              playlistMode={playlistMode}
              autoCount={autoCount}
              catalog={catalog}
              selectedOrder={selectedOrder}
              selectedById={selectedById}
              catalogQuery={catalogQuery}
              pickTab={pickTab}
              rouletteSpinning={rouletteSpinning}
              roulettePreview={roulettePreview}
              rouletteStrip={rouletteStrip}
              rouletteProgress={rouletteProgress}
              textColor={text}
              subColor={sub}
              accent={accent}
              cardBorder={cardBorder}
              inputBg={inputBg}
              cardBg={cardBg}
              onCatalogQueryChange={setCatalogQuery}
              onPickTabChange={setPickTab}
              onApplyPoints={(n) => void applyPoints(n)}
              onApplyDuration={(n) => void applyDuration(n)}
              onApplyPlayMode={(m) => void applyPlayMode(m)}
              onSwitchPlaylistMode={(m) => void switchPlaylistMode(m)}
              onAutoCountChange={(n) => {
                setAutoCount(n);
                void hostAction("set_playlist_mode", { mode: "auto", count: n });
              }}
              onAddTrack={addTrack}
              onToggleSong={toggleSong}
              onReorder={reorderPlaylist}
              onRemove={removeTrack}
              onApplySavedEntries={applySavedEntries}
              onAutoGenerate={applyAutoPlaylistWithAnimation}
              onStart={handleStartGame}
              avatarUrl={playerAvatarUrl}
              startDisabled={
                rouletteSpinning ||
                (playlistMode === "manual"
                  ? selectedOrder.length === 0 && (room.playlist_ids?.length ?? 0) === 0
                  : selectedOrder.length === 0)
              }
              startLoading={startLoading}
            />
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
                {room.play_mode === "online" ? " · онлайн" : ""}
              </p>
            </div>
          )}

          {inRound && (
            <article className="gts-stage" style={{ background: cardBg, border: cardBorder }}>
              {displayRound ? (
                <>
                  {room.state === "round_playing" && displayRound.round_ends_at && (
                    <GameRoundTimer
                      endsAt={displayRound.round_ends_at}
                      totalSec={roundDurationSec}
                      paused={room.paused}
                      onExpire={handleTimerExpire}
                    />
                  )}

                  <div className="gts-stage__body">
                    <div className="gts-stage__media">
                      <GameYouTubePlayer
                        youtubeLink={displayRound.youtube_link ?? ""}
                        mode={roundPlayerMode}
                        active={playerActive}
                        paused={playerPaused}
                        startSeconds={roundStartSec}
                        instanceKey={playerInstanceKey}
                        overlay={playerOverlay}
                        theme={theme}
                        onPlaybackReady={() => setTrackReady(true)}
                      />

                      {inCountdown && displayRound.round_ends_at && (
                        <GameRoundCountdown endsAt={displayRound.round_ends_at} totalSec={3} />
                      )}

                      {inRound && playerActive && !trackReady && !inCountdown && room.state !== "round_buzzed" && (
                        <div className="gts-stage__loading">Загрузка трека…</div>
                      )}
                    </div>

                    <aside className={`gts-stage__dock ${showRevealInfo ? "gts-stage__dock--reveal" : ""}`}>
                      {!showRevealInfo && (displayRound.year || displayRound.contest_type) && (
                        <div className="gts-meta-bar">
                          {displayRound.year ? (
                            <span className="gts-meta-bar__year">{displayRound.year}</span>
                          ) : null}
                          {displayRound.contest_type ? (
                            <span className="gts-meta-bar__type">{contestTypeLabel(displayRound.contest_type)}</span>
                          ) : null}
                          {displayRound.country_name && (
                            <span className="gts-meta-bar__hint">🎵 Угадайте!</span>
                          )}
                        </div>
                      )}

                      {showHostAnswerHint && (
                        <div className="gts-dock-section gts-dock-section--host-hint">
                          <div className="gts-dock-section__title" style={{ color: sub }}>
                            Правильный ответ
                          </div>
                          <div className="gts-answer-panel gts-answer-panel--host-hint">
                            <div className="gts-answer-panel__top">
                              <span className="gts-answer-panel__flag">
                                {supportsEmoji && displayRound.flag_emoji ? displayRound.flag_emoji : "🎤"}
                              </span>
                              {displayRound.contest_type && (
                                <span className="gts-answer-panel__type">{contestTypeLabel(displayRound.contest_type)}</span>
                              )}
                            </div>
                            <p className="gts-answer-panel__artist">{displayRound.artist}</p>
                            <p className="gts-answer-panel__song">{displayRound.song}</p>
                            <p className="gts-answer-panel__meta">
                              {displayRound.country_name}
                              {displayRound.year ? ` · ${displayRound.year}` : ""}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="gts-dock-section">
                        <div className="gts-dock-section__title" style={{ color: sub }}>
                          Игроки
                        </div>
                        <div className="gts-dock-players">
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
                                  size={26}
                                  theme={theme}
                                />
                                <span className="gts-score-row__name">
                                  {i === 0 && p.score > 0 ? "👑 " : ""}
                                  {p.username}
                                </span>
                              </span>
                              <strong style={{ color: accent, fontSize: 14 }}>{p.score}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isOnlinePlay && room.state === "round_buzzed" && room.buzzed_answer && room.buzzed_username && (
                        <div className="gts-dock-section gts-dock-section--live-answer">
                          <div className="gts-dock-section__title" style={{ color: sub }}>
                            Ответ
                          </div>
                          <div className="gts-live-answer">
                            <div className="gts-live-answer__who">
                              <UserAvatar
                                username={room.buzzed_username}
                                avatarUrl={playerAvatarUrl(
                                  room.buzzed_user_id!,
                                  sortedPlayers.find((p) => p.user_id === room.buzzed_user_id)?.avatar_url
                                )}
                                size={24}
                                theme={theme}
                              />
                              <strong>{room.buzzed_username}</strong>
                            </div>
                            <p className="gts-live-answer__text">{room.buzzed_answer}</p>
                          </div>
                        </div>
                      )}

                      {showRevealInfo && (
                        <div className="gts-dock-section gts-dock-section--answer">
                          <div className="gts-answer-panel">
                            <div className="gts-answer-panel__top">
                              <span className="gts-answer-panel__flag">
                                {supportsEmoji && displayRound.flag_emoji ? displayRound.flag_emoji : "🎤"}
                              </span>
                              {displayRound.contest_type && (
                                <span className="gts-answer-panel__type">{contestTypeLabel(displayRound.contest_type)}</span>
                              )}
                            </div>
                            <p className="gts-answer-panel__artist">{displayRound.artist}</p>
                            <p className="gts-answer-panel__song">{displayRound.song}</p>
                            <p className="gts-answer-panel__meta">
                              {displayRound.country_name}
                              {displayRound.year ? ` · ${displayRound.year}` : ""}
                            </p>
                          </div>
                          <GameContestScoresFeed
                            scores={displayRound.contest_scores ?? []}
                            theme={theme}
                            compact
                          />
                        </div>
                      )}
                    </aside>
                  </div>

                  <footer className={`gts-action-bar ${showAnswerForm ? "gts-action-bar--with-form" : ""}`}>
                    {showAnswerForm && (
                      <GameAnswerForm
                        onSubmit={handleSubmitAnswer}
                        inputBg={inputBg}
                        border={cardBorder}
                        textColor={text}
                      />
                    )}
                    <div className="gts-action-bar__row">
                    {(() => {
                      const st = roundStatusText();
                      return st ? (
                        <p className="gts-action-bar__status" style={{ color: st.color ?? text }}>
                          {room.state === "round_buzzed" &&
                          room.buzzed_user_id &&
                          room.buzzed_username &&
                          room.play_mode !== "online" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              🔔
                              <UserAvatar
                                username={room.buzzed_username}
                                avatarUrl={playerAvatarUrl(
                                  room.buzzed_user_id,
                                  sortedPlayers.find((p) => p.user_id === room.buzzed_user_id)?.avatar_url
                                )}
                                size={22}
                                theme={theme}
                              />
                              {room.buzzed_username}
                            </span>
                          ) : (
                            st.text
                          )}
                        </p>
                      ) : (
                        <p className="gts-action-bar__status" style={{ color: sub }}>—</p>
                      );
                    })()}

                    <div className="gts-action-bar__controls">
                      {isHost && room.state === "round_buzzed" && (
                        <div className="gts-judge-btns">
                          <button
                            type="button"
                            className={`gts-judge-btn gts-btn--success ${judgePending === "full" ? "gts-judge-btn--flash" : ""}`}
                            disabled={judgeLoading}
                            onClick={() => void handleJudge("full")}
                          >
                            {judgeLoading && judgePending === "full" ? "…" : `✓ +${judgePoints}`}
                          </button>
                          <button
                            type="button"
                            className={`gts-judge-btn gts-btn--half ${judgePending === "half" ? "gts-judge-btn--flash" : ""}`}
                            disabled={judgeLoading}
                            onClick={() => void handleJudge("half")}
                          >
                            {judgeLoading && judgePending === "half" ? "…" : `◐ +${judgeHalfPoints}`}
                          </button>
                          <button
                            type="button"
                            className={`gts-judge-btn gts-btn--danger ${judgePending === "wrong" ? "gts-judge-btn--flash" : ""}`}
                            disabled={judgeLoading}
                            onClick={() => void handleJudge("wrong")}
                          >
                            {judgeLoading && judgePending === "wrong" ? "…" : `✗ −${judgePoints}`}
                          </button>
                        </div>
                      )}

                      {isHost && room.state === "round_waiting_reveal" && (
                        <button type="button" className="gts-btn gts-btn--primary" onClick={() => void hostAction("reveal")}>
                          Раскрыть
                        </button>
                      )}

                      {isHost && (room.state === "round_reveal" || room.state === "round_clip") && (
                        <button type="button" className="gts-btn gts-btn--primary" onClick={() => void hostAction("next_round")}>
                          Дальше →
                        </button>
                      )}

                      {isHost && (room.state === "round_playing" || room.state === "round_reveal" || room.state === "round_clip") && (
                        <button
                          type="button"
                          className="gts-btn gts-btn--ghost"
                          style={{ color: text }}
                          onClick={() => void hostAction(room.paused ? "resume" : "pause")}
                        >
                          {room.paused ? <Play size={15} /> : <Pause size={15} />}
                        </button>
                      )}

                      {!isHost && (
                        <button
                          type="button"
                          className="gts-buzz-btn"
                          disabled={!canBuzz || buzzLoading}
                          onClick={() => void handleBuzz()}
                        >
                          <Zap size={18} style={{ verticalAlign: "middle", marginRight: 5 }} />
                          {room.state === "round_countdown"
                            ? "Старт…"
                            : room.state === "round_buzzed" && room.buzzed_user_id === myUserId
                            ? room.play_mode === "online" && !room.buzzed_answer
                              ? "Введите ответ ↑"
                              : "Ваш ход!"
                            : room.state === "round_buzzed"
                              ? "Ждём…"
                              : waitingForReveal
                                ? "Время вышло"
                                : room.state === "round_reveal" || room.state === "round_clip"
                                  ? "Смотрим"
                                  : "Ответить!"}
                        </button>
                      )}
                    </div>
                    </div>
                  </footer>
                </>
              ) : (
                <div className="gts-stage__loading-screen">
                  <Loader2 size={28} className="gts-spin" color={accent} />
                  <p>Обновляем раунд…</p>
                </div>
              )}
            </article>
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

        {!hideScoreboardAside && (
        <aside className="gts-scoreboard" style={{ background: cardBg, border: cardBorder }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: sub, flexShrink: 0 }}>
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
                  size={28}
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
              <strong style={{ color: accent, fontSize: 15 }}>{p.score}</strong>
            </div>
          ))}
        </aside>
        )}
      </div>

      {error && <p style={{ textAlign: "center", color: "#f87171", marginTop: 8, flexShrink: 0, fontSize: 13 }}>{error}</p>}
    </div>
  );
}
