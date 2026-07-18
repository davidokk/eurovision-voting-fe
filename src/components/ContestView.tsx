import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, startTransition } from "react";
import type { ContestView as ContestViewType, Theme } from "../types/contest";
import { useChatWebSocket } from "../hooks/useChatWebSocket";
import { PerformanceCard } from "./PerformanceCard";
import { ScoresTableView } from "./ScoresTableView";
import { ScoresLeaderboardView } from "./ScoresLeaderboardView";
import { ScoresHeatmapView } from "./ScoresHeatmapView";
import { ScoresRunningOrderView } from "./ScoresRunningOrderView";
import type { ScoresViewMode } from "./scores/scoresViewShared";
import { YouTubeLiveSection } from "./YouTubeLiveSection";
import { ContestHeaderHighlights } from "./ContestHeaderHighlights";
import { UserAvatar } from "./UserAvatar";
import { useAvatarUrl } from "../hooks/useAvatarUrl";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import { isScoreSystemMessage } from "../utils/chatMessage";
import { ScoreTwelveDisplay } from "./ScoreTwelveDisplay";
import { isScoreTwelve } from "../utils/scoreUtils";
import { LayoutGrid, Settings2 } from "lucide-react";

type Props = {
    contest: ContestViewType | null;
    chatOpen: boolean;
    setChatOpen: (open: boolean) => void;
    theme?: Theme;
    onRefreshContest?: () => void | Promise<void>;
};

type ChatMessage = {
    username: string;
    message: string;
    createdAt: string;
    type?: string;
    gif?: string;
    country?: string;
    country_flag?: string;
    score?: number;
    old_score?: number;
    comment?: string;
    avatarUrl?: string;
};

type ChatToast = {
    id: string;
    username: string;
    message: string;
    avatarUrl?: string;
    kind?: "chat" | "system";
};

const API_URL = (import.meta as any).env?.VITE_API_URL || "";
const WS_URL = (import.meta as any).env?.VITE_WS_URL || "";
const SCORES_VIEW_KEY = "ev_scores_view_mode";
const CHAT_VISIBLE_BATCH = 50;
const chatSeenKey = (contestId: string) => `ev_chat_seen_${contestId}`;

const VIEW_MODE_OPTIONS: { mode: ScoresViewMode; label: string; icon: string }[] = [
    { mode: "cards", label: "Карточки", icon: "🃏" },
    { mode: "table", label: "Таблица", icon: "📊" },
    { mode: "leaderboard", label: "Рейтинг", icon: "🏆" },
    { mode: "heatmap", label: "Heatmap", icon: "🌡" },
    { mode: "order", label: "Порядок", icon: "📋" },
];

function readStoredViewMode(): ScoresViewMode {
    const raw = localStorage.getItem(SCORES_VIEW_KEY);
    if (VIEW_MODE_OPTIONS.some((o) => o.mode === raw)) return raw as ScoresViewMode;
    return "cards";
}

function translateContestType(type: string) {
    switch (type) {
        case "first-semifinal": return "Первый полуфинал";
        case "second-semifinal": return "Второй полуфинал";
        case "final": return "Финал";
        default: return type;
    }
}

function plural(value: number, one: string, few: string, many: string) {
    const mod10 = value % 10;
    const mod100 = value % 100;

    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;

    return many;
}

function viewModeBtnStyle(active: boolean, isLight: boolean, isGray: boolean): CSSProperties {
    return {
        padding: "10px 12px",
        borderRadius: 10,
        border: "none",
        background: active
            ? "rgba(79,124,255,0.2)"
            : "transparent",
        color: active ? (isLight ? "#3b5bdb" : "#93b4ff") : isLight ? "#334155" : "#e2e8f0",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
    };
}

function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];

    if (days > 0) parts.push(`${days}${plural(days, "д", "д", "д")}`);
    if (hours > 0) parts.push(`${hours}${plural(hours, "ч", "ч", "ч")}`);
    if (minutes > 0) parts.push(`${minutes}м`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}с`);

    return parts.join(" ");
}

export function ContestView({ contest, chatOpen, setChatOpen, theme = "dark-blue", onRefreshContest }: Props) {
    const supportsEmoji = getDoesBrowserSupportFlagEmojis();
    const [now, setNow] = useState(Date.now());
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [uiReady, setUiReady] = useState(false);
    const [scoresViewMode, setScoresViewMode] = useState<ScoresViewMode>(readStoredViewMode);
    const [viewMenuOpen, setViewMenuOpen] = useState(false);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [chatToasts, setChatToasts] = useState<ChatToast[]>([]);
    const [chatHistoryExtra, setChatHistoryExtra] = useState(0);
    const [chatContentReady, setChatContentReady] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const contestRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const viewMenuRef = useRef<HTMLDivElement>(null);
    const chatOpenRef = useRef(chatOpen);
    const initialChatSyncDoneRef = useRef(false);
    const knownMessageKeysRef = useRef<Set<string>>(new Set());

    chatOpenRef.current = chatOpen;

    const scheduleContestRefresh = useCallback(() => {
        if (!onRefreshContest) return;
        if (contestRefreshTimerRef.current) {
            clearTimeout(contestRefreshTimerRef.current);
        }
        contestRefreshTimerRef.current = setTimeout(() => {
            contestRefreshTimerRef.current = null;
            void onRefreshContest();
        }, 400);
    }, [onRefreshContest]);

    useEffect(() => {
        return () => {
            if (contestRefreshTimerRef.current) {
                clearTimeout(contestRefreshTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(SCORES_VIEW_KEY, scoresViewMode);
    }, [scoresViewMode]);

    useEffect(() => {
        if (!viewMenuOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
                setViewMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [viewMenuOpen]);

    const myUsername = localStorage.getItem("username");
    const myUserId = localStorage.getItem("user_id");
    const myAvatarUrl = useAvatarUrl();
    const token = localStorage.getItem("token");

    const isAuthenticated = !!token;

    const messageKey = (m: ChatMessage) =>
        `${m.createdAt}-${m.username}-${m.message.slice(0, 20)}`;

    const markChatSeen = useCallback((contestId: string, msgs: ChatMessage[]) => {
        if (msgs.length === 0) {
            localStorage.setItem(chatSeenKey(contestId), "");
            setUnreadChatCount(0);
            return;
        }
        const last = msgs[msgs.length - 1];
        localStorage.setItem(chatSeenKey(contestId), messageKey(last));
        setUnreadChatCount(0);
    }, []);

    const pushChatToast = useCallback((msg: ChatMessage) => {
        if (msg.username === myUsername) return;

        let preview: string;
        let kind: ChatToast["kind"] = "chat";

        if (isScoreSystemMessage(msg)) {
            kind = "system";
            const action =
                msg.old_score != null && msg.old_score !== msg.score
                    ? "переобувается"
                    : "оценил(а)";
            const country = msg.country ? ` ${msg.country}` : "";
            const score = msg.score != null ? ` · ${msg.score}` : "";
            preview = `${action}${country}${score}`.trim();
        } else {
            preview = (msg.message || "").trim() || (msg.gif ? "GIF" : "");
        }

        if (!preview) return;

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setChatToasts((prev) => [
            ...prev.slice(-2),
            {
                id,
                username: msg.username,
                message: preview.length > 80 ? `${preview.slice(0, 80)}…` : preview,
                avatarUrl: msg.avatarUrl,
                kind,
            },
        ]);
        window.setTimeout(() => {
            setChatToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4200);
    }, [myUsername]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, [setChatOpen]);

    useEffect(() => {
        const id = requestAnimationFrame(() => setUiReady(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const fetchMessages = useCallback(async () => {
        if (!contest || !API_URL) return;
        try {
            const params = new URLSearchParams({
                contest_id: contest.contest.id,
            });
            const res = await fetch(`${API_URL}/v1/message?${params.toString()}`);
            if (!res.ok) throw new Error("Failed");
            const data = (await res.json()) as ChatMessage[] | null;
            const list = data || [];
            setMessages(list);
            for (const m of list) {
                knownMessageKeysRef.current.add(messageKey(m));
            }

            if (chatOpenRef.current) {
                markChatSeen(contest.contest.id, list);
            } else if (!initialChatSyncDoneRef.current) {
                const seen = localStorage.getItem(chatSeenKey(contest.contest.id));
                if (!seen) {
                    markChatSeen(contest.contest.id, list);
                } else {
                    let unread = 0;
                    let counting = false;
                    for (const m of list) {
                        if (messageKey(m) === seen) {
                            counting = true;
                            continue;
                        }
                        if (counting) unread += 1;
                    }
                    // If seen key not found (messages pruned), treat all as seen
                    if (!list.some((m) => messageKey(m) === seen)) {
                        markChatSeen(contest.contest.id, list);
                    } else {
                        setUnreadChatCount(unread);
                    }
                }
            }
            initialChatSyncDoneRef.current = true;
        } catch (err) {
            console.error(err);
        }
    }, [contest?.contest.id, markChatSeen]);

    useEffect(() => {
        initialChatSyncDoneRef.current = false;
        knownMessageKeysRef.current = new Set();
        setUnreadChatCount(0);
        setChatToasts([]);
        setChatHistoryExtra(0);
        fetchMessages();
    }, [fetchMessages]);

    useEffect(() => {
        if (chatOpen && contest) {
            markChatSeen(contest.contest.id, messages);
        }
    }, [chatOpen, contest?.contest.id, messages, markChatSeen]);

    useEffect(() => {
        if (!chatOpen) {
            setChatContentReady(false);
            return;
        }
        // Сначала рисуем оболочку чата, список — на следующий кадр (меньше лагов на телефоне)
        const id = requestAnimationFrame(() => setChatContentReady(true));
        return () => cancelAnimationFrame(id);
    }, [chatOpen]);

    useChatWebSocket<ChatMessage>({
        wsUrl: WS_URL,
        token,
        enabled: Boolean(contest && WS_URL),
        onMessage: (msg) => {
            const key = messageKey(msg);
            setMessages((prev) => {
                if (prev.some((m) => messageKey(m) === key)) return prev;
                return [...prev, msg];
            });
            if (isScoreSystemMessage(msg)) {
                scheduleContestRefresh();
            }

            if (knownMessageKeysRef.current.has(key)) return;
            knownMessageKeysRef.current.add(key);

            if (chatOpenRef.current) return;

            if (msg.username !== myUsername) {
                setUnreadChatCount((c) => c + 1);
                pushChatToast(msg);
            }
        },
        onConnected: fetchMessages,
    });

    const visibleMessages = useMemo(() => {
        const limit = CHAT_VISIBLE_BATCH + chatHistoryExtra;
        if (messages.length <= limit) return messages;
        return messages.slice(messages.length - limit);
    }, [messages, chatHistoryExtra]);

    const hasOlderChatMessages = visibleMessages.length < messages.length;

    useEffect(() => {
        if (!chatOpen || !chatContentReady) return;
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, [chatOpen, chatContentReady]);

    useEffect(() => {
        if (!chatOpen || !chatContentReady) return;
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    async function sendMessage() {
        if (!input.trim() || !isAuthenticated || !contest) return;

        try {
            const currentInput = input;
            setInput("");

            if (API_URL) {
                const params = new URLSearchParams({
                    contest_id: contest.contest.id,
                    message: currentInput,
                });

                await fetch(
                    `${API_URL}/v1/message/send?${params.toString()}`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
            } else {
                setMessages((prev) => [...prev, {
                    username: myUsername || "Гость",
                    message: currentInput,
                    createdAt: new Date().toISOString()
                }]);
            }
        } catch (err) {
            console.error(err);
        }
    }

    const ended =
        !!contest &&
        new Date(contest.contest.ends).getTime() < now;

    const started =
        !!contest &&
        new Date(contest.contest.starts).getTime() > now;

    const timerText = useMemo(() => {
        if (!contest) return null;

        const starts = new Date(contest.contest.starts).getTime();
        const diff = starts - now;

        if (diff > 0) return formatTime(diff);

        if (!ended) {
            return "ОЦЕНИВАНИЕ ОТКРЫТО!";
        }

        return null;
    }, [contest, now, ended]);

    const nextToRateId = useMemo(() => {
        if (!contest || !myUserId) return null;
        const unvoted = contest.performances.find(
            (p) => !p.scores.some((s) => s.user_id === myUserId || s.username === myUsername)
        );
        return unvoted?.performance_id ?? null;
    }, [contest, myUsername, myUserId]);

    const sortedPerformances = useMemo(() => {
        if (!contest) return [];
        
        const items = [...contest.performances];
        
        const firstUnvotedIndex = items.findIndex(p => 
            !p.scores.some(s => s.user_id === myUserId || s.username === myUsername)
        );
        
        if (firstUnvotedIndex > 0) {
            const [nextToVote] = items.splice(firstUnvotedIndex, 1);
            items.unshift(nextToVote);
        }
        
        return items;
    }, [contest, myUsername, myUserId]);

    const activeViewLabel =
        VIEW_MODE_OPTIONS.find((o) => o.mode === scoresViewMode)?.label ?? "Вид";

    const isLight = theme === "light";
    const isGray = theme === "dark-gray";

    const layoutBg = isLight 
        ? "radial-gradient(circle at top left, rgba(55, 65, 81, 0.06), transparent 30%), radial-gradient(circle at bottom right, rgba(75, 85, 99, 0.06), transparent 30%), #f8fafc" 
        : isGray 
        ? "radial-gradient(circle at top left, rgba(255, 255, 255, 0.03), transparent 30%), radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.02), transparent 30%), #121212" 
        : "radial-gradient(circle at top left, rgba(79,124,255,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(159,122,234,0.18), transparent 30%), #020617";

    const wrapperBgImage = isLight 
        ? "radial-gradient(circle at top, rgba(55, 65, 81, 0.04), transparent 35%)"
        : isGray
        ? "radial-gradient(circle at top, rgba(255, 255, 255, 0.02), transparent 35%)"
        : "radial-gradient(circle at top, rgba(79,124,255,0.08), transparent 35%)";

    const titleColor = isLight ? "#0f172a" : "#fff";
    const titleShadow = isLight ? "0 10px 30px rgba(0,0,0,0.05)" : isGray ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(79,124,255,0.35)";
    
    const yearTopBg = isLight ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)" : isGray ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)" : "linear-gradient(135deg, #4f7cff 0%, #3b5bdb 100%)";
    const yearTopShadow = isLight ? "0 8px 20px rgba(31, 41, 55, 0.2)" : isGray ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(79,124,255,0.35), inset 0 1px rgba(255,255,255,0.18)";
    const yearTopBorder = isLight ? "1px solid rgba(55, 65, 81, 0.2)" : "1px solid rgba(255,255,255,0.12)";

    const timerBg = isLight ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 209, 102, 0.1)";
    const timerBorder = isLight ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(255, 209, 102, 0.2)";
    const timerValColor = isLight ? "#d97706" : "#ffd166";

    const chatBtnBg = isLight ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)" : isGray ? "linear-gradient(135deg, #6b7280 0%, #374151 100%)" : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)";
    const chatBtnShadow = isLight ? "0 10px 30px rgba(0,0,0,0.15)" : "0 10px 30px rgba(79,124,255,0.35), inset 0 1px rgba(255,255,255,0.15)";
    const chatBtnBorder = isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.12)";

    const chatPanelBg = isLight
        ? (isMobile ? "#ffffff" : "rgba(255, 255, 255, 0.95)")
        : isGray
          ? (isMobile ? "#1c1c1c" : "rgba(28, 28, 28, 0.95)")
          : (isMobile ? "#0f172a" : "rgba(15, 23, 42, 0.72)");
    const chatPanelBorder = isLight ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)";
    const chatPanelShadow = isLight ? "-10px 0 40px rgba(0,0,0,0.1)" : "-10px 0 40px rgba(0,0,0,0.35), inset 1px 0 rgba(255,255,255,0.05)";

    const chatHeaderBg = isLight
        ? (isMobile ? "#f1f5f9" : "rgba(241, 245, 249, 0.8)")
        : isGray
          ? (isMobile ? "#2d2d2d" : "rgba(45, 45, 45, 0.8)")
          : (isMobile ? "#1e293b" : "rgba(30, 41, 59, 0.45)");
    const chatCloseBg = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";

    const chatInputWrapBg = isLight
        ? (isMobile ? "#f1f5f9" : "rgba(241, 245, 249, 0.8)")
        : isGray
          ? (isMobile ? "#2d2d2d" : "rgba(45, 45, 45, 0.8)")
          : (isMobile ? "#1e293b" : "rgba(30,41,59,0.45)");
    const inputInnerBg = isLight
        ? (isMobile ? "#ffffff" : "rgba(255, 255, 255, 0.9)")
        : isGray
          ? (isMobile ? "#121212" : "rgba(18, 18, 18, 0.8)")
          : (isMobile ? "#0f172a" : "rgba(15,23,42,0.65)");
    const inputBorder = isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)";
    const inputTextColor = isLight ? "#0f172a" : "#fff";

    const myBubbleBg = isLight ? "linear-gradient(135deg, #4b5563, #1f2937)" : isGray ? "linear-gradient(135deg, #4b5563, #374151)" : "linear-gradient(135deg, rgba(79,124,255,0.8), rgba(59,91,219,0.8))";
    const theirBubbleBg = isLight ? "#f1f5f9" : isGray ? "#282828" : "rgba(30,41,59,0.7)";
    const theirBubbleText = isLight ? "#0f172a" : "#fff";
    const theirBubbleBorder = isLight ? "1px solid rgba(0,0,0,0.05)" : "1px solid rgba(255,255,255,0.05)";

    const sysMsgBg = isLight ? "rgba(55, 65, 81, 0.06)" : "linear-gradient(135deg, rgba(79, 124, 255, 0.12), rgba(124, 77, 255, 0.08))";
    const sysMsgBorder = isLight ? "1px solid rgba(55, 65, 81, 0.2)" : "1px solid rgba(79, 124, 255, 0.25)";
    const sysMsgUser = isLight ? "#1f2937" : "#7aa2ff";
    const sysMsgAction = isLight ? "#64748b" : "#94a3b8";
    const sysMsgCountry = isLight ? "#0f172a" : "#e6edf7";
    const sysMsgCommentBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(255, 255, 255, 0.04)";
    const sysMsgCommentBorder = isLight ? "3px solid #374151" : "3px solid rgba(79, 124, 255, 0.4)";
    const sysMsgCommentText = isLight ? "#334155" : "#a5b4d4";

    const promptBg = isLight ? "rgba(0,0,0,0.03)" : isGray ? "rgba(30, 30, 30, 0.6)" : "rgba(15, 23, 42, 0.5)";
    const promptBorder = isLight ? "1px dashed rgba(0,0,0,0.15)" : isGray ? "1px dashed #4b5563" : "1px dashed #334155";
    const promptText = isLight ? "#64748b" : "#9ca3af";

    if (!contest) {
        return (
            <div style={{ ...styles.layout, background: layoutBg, display: "flex", flexDirection: "column", padding: 24, overflowY: "auto" }}>
                <YouTubeLiveSection theme={theme} />
                <div style={{
                    width: "100%",
                    maxWidth: 760,
                    background: isLight 
                        ? "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)" 
                        : isGray 
                        ? "linear-gradient(135deg, rgba(30, 30, 30, 0.8) 0%, rgba(18, 18, 18, 0.95) 100%)" 
                        : "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 100%)",
                    border: isLight ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 32,
                    padding: isMobile ? "36px 24px" : "56px 48px",
                    boxShadow: isLight ? "0 20px 40px rgba(0,0,0,0.05)" : "0 20px 60px rgba(0,0,0,0.5), inset 0 1px rgba(255,255,255,0.08)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 28,
                    margin: "24px auto auto",
                    alignSelf: "center",
                }}>
                    <div style={{
                        fontSize: isMobile ? 36 : 56,
                        fontWeight: 1000,
                        letterSpacing: "0.18em",
                        background: isLight ? "linear-gradient(135deg, #1f2937, #4b5563)" : isGray ? "linear-gradient(135deg, #e5e7eb, #9ca3af)" : "linear-gradient(135deg, #4f7cff, #a78bfa)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textTransform: "uppercase",
                        marginBottom: -10,
                        filter: isLight ? "drop-shadow(0 4px 12px rgba(31, 41, 55, 0.15))" : isGray ? "drop-shadow(0 4px 16px rgba(255, 255, 255, 0.2))" : "drop-shadow(0 4px 20px rgba(79, 124, 255, 0.4))",
                    }}>
                        EUROVISION
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <h1 style={{ margin: 0, color: titleColor, fontSize: isMobile ? 24 : 32, fontWeight: 950, letterSpacing: "-0.03em" }}>
                            Привет!
                        </h1>
                        <p style={{ margin: 0, color: isLight ? "#64748b" : "#94a3b8", fontSize: isMobile ? 14 : 16, lineHeight: 1.6, maxWidth: 600 }}>
                            Здесь вы можете следить за прямыми трансляциями полуфиналов и финалов, выставлять оценки участникам в реальном времени и общаться.
                        </p>
                    </div>

                    <div style={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 16,
                        marginTop: 8,
                        textAlign: "left",
                    }}>
                        <div style={{
                            background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                            border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 20,
                            padding: 20,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}>
                            <span style={{ fontSize: 22 }}>📅</span>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: titleColor }}>Выберите конкурс</h3>
                            <p style={{ margin: 0, fontSize: 13, color: isLight ? "#64748b" : "#94a3b8", lineHeight: 1.4 }}>
                                Используйте навигацию в верхней панели для выбора полуфинала или финала нужного года.
                            </p>
                        </div>

                        <div style={{
                            background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                            border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 20,
                            padding: 20,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}>
                            <span style={{ fontSize: 22 }}>⭐</span>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: titleColor }}>Оценивайте вживую</h3>
                            <p style={{ margin: 0, fontSize: 13, color: isLight ? "#64748b" : "#94a3b8", lineHeight: 1.4 }}>
                                Ставьте баллы от 1 до 10, делитесь комментариями и прикрепляйте гифки-реакции.
                            </p>
                        </div>

                        <div style={{
                            background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                            border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 20,
                            padding: 20,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}>
                            <span style={{ fontSize: 22 }}>💬</span>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: titleColor }}>Общайтесь в чате</h3>
                            <p style={{ margin: 0, fontSize: 13, color: isLight ? "#64748b" : "#94a3b8", lineHeight: 1.4 }}>
                                Делитесь впечатлениями и следите за уведомлениями об оценках других зрителей.
                            </p>
                        </div>

                        <div style={{
                            background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                            border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 20,
                            padding: 20,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}>
                            <span style={{ fontSize: 22 }}>📊</span>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: titleColor }}>Изучайте статистику</h3>
                            <p style={{ margin: 0, fontSize: 13, color: isLight ? "#64748b" : "#94a3b8", lineHeight: 1.4 }}>
                                Кликайте по именам пользователей или странам, чтобы узнать их подробную историю.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...styles.layout, background: layoutBg }}>
            <div
                style={{ ...styles.wrapper, backgroundImage: wrapperBgImage }}
                onClick={() => isMobile && chatOpen && setChatOpen(false)}
            >
                <header style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: isMobile ? "32px 20px" : "48px 40px",
                    background: isLight 
                        ? "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(241, 245, 249, 0.85) 100%)" 
                        : isGray 
                        ? "linear-gradient(135deg, rgba(30, 30, 30, 0.8) 0%, rgba(18, 18, 18, 0.9) 100%)" 
                        : "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    border: isLight ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "32px",
                    boxShadow: isLight ? "0 20px 40px rgba(0,0,0,0.05)" : "0 20px 60px rgba(0,0,0,0.4), inset 0 1px rgba(255,255,255,0.08)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    maxWidth: 1200,
                    margin: "0 auto 36px",
                    gap: 16,
                    textAlign: "center",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 18px",
                        background: yearTopBg,
                        borderRadius: "100px",
                        boxShadow: yearTopShadow,
                        border: yearTopBorder,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 900,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                    }}>
                        <span>✨</span>
                        <span>EUROVISION • {contest.contest.year}</span>
                    </div>

                    {contest.contest.type.includes("semifinal") ? (
                        <h1
                            style={{
                                margin: 0,
                                color: titleColor,
                                fontSize: isMobile ? "2.2rem" : "3.6rem",
                                fontWeight: 950,
                                lineHeight: 1.1,
                                letterSpacing: "-0.03em",
                                textShadow: titleShadow,
                            }}
                        >
                            {translateContestType(contest.contest.type)}
                        </h1>
                    ) : (
                        <ContestHeaderHighlights
                            contest={contest}
                            theme={theme}
                            isMobile={isMobile}
                            center={
                                <h1
                                    style={{
                                        margin: 0,
                                        color: titleColor,
                                        fontSize: isMobile ? "2rem" : "3.2rem",
                                        fontWeight: 950,
                                        lineHeight: 1.1,
                                        letterSpacing: "-0.03em",
                                        textShadow: titleShadow,
                                        textAlign: "center",
                                    }}
                                >
                                    {translateContestType(contest.contest.type)}
                                </h1>
                            }
                        />
                    )}

                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 24px",
                        background: timerBg,
                        border: timerBorder,
                        borderRadius: "100px",
                        marginTop: 8,
                    }}>
                        <span style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: timerValColor,
                            boxShadow: `0 0 12px ${timerValColor}`,
                        }} />

                        {started && <span style={{
                            fontSize: 13,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: isLight ? "#64748b" : "#94a3b8",
                            letterSpacing: "0.05em",
                        }}>
                            До начала:
                        </span>}

                        <span style={{
                            fontSize: 16,
                            fontWeight: 800,
                            fontFamily: "monospace",
                            color: timerValColor,
                            letterSpacing: "0.02em",
                        }}>
                            {timerText}
                            {ended && ("ОЦЕНИВАНИЕ ЗАКРЫТО")}
                        </span>
                    </div>
                </header>

                <YouTubeLiveSection theme={theme} />

                <div
                    style={{
                        maxWidth: 1200,
                        margin: "0 auto 16px",
                        display: "flex",
                        justifyContent: isMobile ? "flex-end" : "center",
                        alignItems: "center",
                        padding: isMobile ? "0 12px" : 0,
                    }}
                >
                    <div ref={viewMenuRef} style={{ position: "relative" }}>
                        <button
                            type="button"
                            onClick={() => setViewMenuOpen((v) => !v)}
                            aria-expanded={viewMenuOpen}
                            aria-label="Вид отображения"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: isMobile ? "8px 12px" : "8px 14px",
                                borderRadius: 12,
                                border: isLight
                                    ? "1px solid rgba(0,0,0,0.1)"
                                    : "1px solid rgba(255,255,255,0.12)",
                                background: isLight
                                    ? "rgba(255,255,255,0.85)"
                                    : isGray
                                      ? "rgba(40,40,40,0.9)"
                                      : "rgba(15,23,42,0.75)",
                                color: isLight ? "#334155" : "#e2e8f0",
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer",
                                boxShadow: isLight
                                    ? "0 4px 14px rgba(0,0,0,0.06)"
                                    : "0 4px 16px rgba(0,0,0,0.25)",
                            }}
                        >
                            {isMobile ? <Settings2 size={16} /> : <LayoutGrid size={16} />}
                            <span>{isMobile ? "Вид" : activeViewLabel}</span>
                        </button>

                        {viewMenuOpen && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "calc(100% + 8px)",
                                    right: 0,
                                    minWidth: 200,
                                    padding: 8,
                                    borderRadius: 14,
                                    border: isLight
                                        ? "1px solid rgba(0,0,0,0.08)"
                                        : "1px solid rgba(255,255,255,0.1)",
                                    background: isLight
                                        ? "rgba(255,255,255,0.98)"
                                        : isGray
                                          ? "rgba(28,28,28,0.98)"
                                          : "rgba(15,23,42,0.98)",
                                    boxShadow: isLight
                                        ? "0 12px 32px rgba(0,0,0,0.12)"
                                        : "0 16px 40px rgba(0,0,0,0.45)",
                                    zIndex: 50,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        color: isLight ? "#94a3b8" : "#64748b",
                                        padding: "4px 10px 8px",
                                    }}
                                >
                                    Отображение
                                </div>
                                {VIEW_MODE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.mode}
                                        type="button"
                                        onClick={() => {
                                            setScoresViewMode(opt.mode);
                                            setViewMenuOpen(false);
                                        }}
                                        style={viewModeBtnStyle(
                                            scoresViewMode === opt.mode,
                                            isLight,
                                            isGray
                                        )}
                                    >
                                        <span aria-hidden>{opt.icon}</span>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {scoresViewMode === "cards" && (
                    <div style={styles.grid}>
                        {sortedPerformances.map((p) => (
                            <PerformanceCard
                                key={p.performance_id}
                                performance={p}
                                votingStarted={
                                    now >= new Date(contest.contest.starts).getTime()
                                }
                                votingEnded={
                                    now > new Date(contest.contest.ends).getTime()
                                }
                                theme={theme}
                                contestType={contest.contest.type}
                                onRated={onRefreshContest}
                                awaitingRating={p.performance_id === nextToRateId}
                            />
                        ))}
                    </div>
                )}

                {scoresViewMode === "table" && (
                    <ScoresTableView
                        performances={contest.performances}
                        theme={theme}
                        contestType={contest.contest.type}
                        votingStarted={now >= new Date(contest.contest.starts).getTime()}
                        votingEnded={now > new Date(contest.contest.ends).getTime()}
                        isAuthenticated={isAuthenticated}
                        onRated={onRefreshContest}
                    />
                )}

                {scoresViewMode === "leaderboard" && (
                    <ScoresLeaderboardView
                        performances={contest.performances}
                        theme={theme}
                        contestType={contest.contest.type}
                        votingStarted={now >= new Date(contest.contest.starts).getTime()}
                        votingEnded={now > new Date(contest.contest.ends).getTime()}
                        isAuthenticated={isAuthenticated}
                        onRated={onRefreshContest}
                    />
                )}

                {scoresViewMode === "heatmap" && (
                    <ScoresHeatmapView
                        performances={contest.performances}
                        theme={theme}
                        contestType={contest.contest.type}
                        votingStarted={now >= new Date(contest.contest.starts).getTime()}
                        votingEnded={now > new Date(contest.contest.ends).getTime()}
                        isAuthenticated={isAuthenticated}
                        onRated={onRefreshContest}
                    />
                )}

                {scoresViewMode === "order" && (
                    <ScoresRunningOrderView
                        performances={contest.performances}
                        theme={theme}
                        contestType={contest.contest.type}
                        votingStarted={now >= new Date(contest.contest.starts).getTime()}
                        votingEnded={now > new Date(contest.contest.ends).getTime()}
                        isAuthenticated={isAuthenticated}
                        onRated={onRefreshContest}
                    />
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        startTransition(() => setChatOpen(!chatOpen));
                    }}
                    aria-label={
                        unreadChatCount > 0
                            ? `Чат, непрочитанных: ${unreadChatCount}`
                            : "Чат"
                    }
                    style={{
                        ...styles.chatButton,
                        background: chatBtnBg,
                        boxShadow: chatBtnShadow,
                        border: chatBtnBorder,
                        right: (chatOpen && !isMobile) ? 360 : 30,
                        transform:
                            (isMobile && chatOpen)
                                ? "scale(0)"
                                : "scale(1)",
                        opacity:
                            (isMobile && chatOpen)
                                ? 0
                                : 1,
                        pointerEvents:
                            (isMobile && chatOpen)
                                ? "none"
                                : "auto",
                    }}
                >
                    <span style={{ fontSize: 24 }}>
                        💬
                    </span>
                    {unreadChatCount > 0 && !chatOpen && (
                        <span
                            style={{
                                position: "absolute",
                                top: -4,
                                right: -4,
                                minWidth: 20,
                                height: 20,
                                padding: "0 6px",
                                borderRadius: 999,
                                background: "#ef4444",
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 2px 8px rgba(239,68,68,0.45)",
                                border: "2px solid rgba(255,255,255,0.9)",
                            }}
                        >
                            {unreadChatCount > 99 ? "99+" : unreadChatCount}
                        </span>
                    )}
                </button>

                {chatToasts.length > 0 && !chatOpen && (
                    <div
                        style={{
                            position: "fixed",
                            right: isMobile ? 16 : ((chatOpen && !isMobile) ? 360 : 30),
                            bottom: isMobile ? 110 : 110,
                            zIndex: 2050,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            width: isMobile ? "min(280px, calc(100vw - 32px))" : 280,
                            pointerEvents: "none",
                        }}
                    >
                        {chatToasts.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                    setChatOpen(true);
                                    setChatToasts([]);
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "10px 12px",
                                    borderRadius: 14,
                                    border: isLight
                                        ? "1px solid rgba(0,0,0,0.08)"
                                        : "1px solid rgba(255,255,255,0.12)",
                                    background: isLight
                                        ? "rgba(255,255,255,0.96)"
                                        : isGray
                                          ? "rgba(32,32,32,0.96)"
                                          : "rgba(15,23,42,0.96)",
                                    boxShadow: isLight
                                        ? "0 10px 28px rgba(0,0,0,0.12)"
                                        : "0 12px 32px rgba(0,0,0,0.45)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    pointerEvents: "auto",
                                    animation: "ev-chat-toast-in 0.28s ease-out",
                                }}
                            >
                                <UserAvatar
                                    username={t.username}
                                    avatarUrl={t.avatarUrl}
                                    size={32}
                                    theme={theme}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 800,
                                            color: isLight ? "#0f172a" : "#e2e8f0",
                                            marginBottom: 2,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {t.kind === "system" ? `⭐ ${t.username}` : t.username}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: isLight ? "#64748b" : "#94a3b8",
                                            lineHeight: 1.35,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {t.message}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {chatOpen && (
            <div
                style={{
                    ...styles.chatPanel,
                    background: chatPanelBg,
                    borderLeft: chatPanelBorder,
                    boxShadow: isMobile ? "none" : chatPanelShadow,
                    backdropFilter: isMobile ? "none" : undefined,
                    WebkitBackdropFilter: isMobile ? "none" : undefined,
                    width: isMobile ? "100%" : 340,
                    transform: isMobile
                        ? chatContentReady
                            ? "translateX(0)"
                            : "translateX(12px)"
                        : undefined,
                    opacity: 1,
                    transition: uiReady && isMobile
                        ? "transform 0.18s ease-out"
                        : uiReady
                          ? "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
                          : "none",
                    position: isMobile ? "absolute" : "relative",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    height: "100%",
                    zIndex: 2000,
                }}
            >
                <div style={{
                    ...styles.chatHeader,
                    background: chatHeaderBg,
                    borderBottom: chatPanelBorder,
                    backdropFilter: isMobile ? "none" : undefined,
                    WebkitBackdropFilter: isMobile ? "none" : undefined,
                }}>
                    <div style={{ ...styles.chatTitle, color: titleColor }}>
                        Чат
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setChatOpen(false);
                        }}
                        style={{
                            ...styles.closeChatHeader,
                            background: chatCloseBg,
                            color: titleColor,
                            backdropFilter: isMobile ? "none" : undefined,
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        ...styles.chatMessages,
                        WebkitOverflowScrolling: "touch",
                        overscrollBehavior: "contain",
                    }}
                >
                    {chatContentReady ? (
                        <>
                            {hasOlderChatMessages && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setChatHistoryExtra((n) => n + CHAT_VISIBLE_BATCH)
                                    }
                                    style={{
                                        alignSelf: "center",
                                        marginBottom: 4,
                                        padding: "8px 14px",
                                        borderRadius: 999,
                                        border: isLight
                                            ? "1px solid rgba(0,0,0,0.1)"
                                            : "1px solid rgba(255,255,255,0.12)",
                                        background: isLight
                                            ? "rgba(0,0,0,0.04)"
                                            : "rgba(255,255,255,0.06)",
                                        color: isLight ? "#475569" : "#94a3b8",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    Загрузить раньше
                                </button>
                            )}

                            {visibleMessages.map((m) => {
                                const key = messageKey(m);
                                if (m.type === "system" || isScoreSystemMessage(m)) {
                                    const scoreIsTwelve =
                                        m.score != null && isScoreTwelve(m.score);
                                    return (
                                        <div
                                            key={key}
                                            style={{
                                                ...styles.systemMsg,
                                                contentVisibility: "auto",
                                                containIntrinsicSize: "80px",
                                            }}
                                        >
                                            <div
                                                className={
                                                    scoreIsTwelve ? "ev-score-12-chat-msg" : undefined
                                                }
                                                style={{
                                                    ...styles.systemMsgInner,
                                                    background: sysMsgBg,
                                                    border: sysMsgBorder,
                                                    ...(isMobile
                                                        ? {
                                                              backdropFilter: "none",
                                                              WebkitBackdropFilter: "none",
                                                              boxShadow: "none",
                                                          }
                                                        : {}),
                                                }}
                                            >
                                                <div style={styles.systemHeader}>
                                                    <span style={styles.systemIcon}>⭐</span>
                                                    <span style={{ ...styles.systemUser, color: sysMsgUser }}>
                                                        {m.username}
                                                    </span>
                                                    <span style={{ ...styles.systemText, color: sysMsgAction }}>
                                                        {m.old_score != null && m.old_score !== m.score ? "переобувается" : "оценил(а)"}
                                                    </span>
                                                </div>

                                                <div style={styles.systemCountry}>
                                                    {supportsEmoji && m.country_flag && (
                                                        <span style={styles.systemFlag}>
                                                            {m.country_flag}
                                                        </span>
                                                    )}
                                                    <span style={{ ...styles.systemCountryName, color: sysMsgCountry }}>
                                                        {m.country}
                                                    </span>
                                                    {m.old_score != null && m.old_score !== m.score ? (
                                                        <div style={styles.scoreChange}>
                                                            <span style={styles.oldScore}>
                                                                {m.old_score}
                                                            </span>
                                                            <span style={styles.scoreArrow}>→</span>
                                                            {m.score != null ? (
                                                                <ScoreTwelveDisplay
                                                                    score={m.score}
                                                                    variant="chat"
                                                                    suffix={` ${plural(m.score, "балл", "балла", "баллов")}`}
                                                                    style={
                                                                        !scoreIsTwelve
                                                                            ? {
                                                                                  ...styles.systemScore,
                                                                                  color: timerValColor,
                                                                              }
                                                                            : undefined
                                                                    }
                                                                />
                                                            ) : null}
                                                        </div>
                                                    ) : m.score != null ? (
                                                        <ScoreTwelveDisplay
                                                            score={m.score}
                                                            variant="chat"
                                                            suffix={` ${plural(m.score, "балл", "балла", "баллов")}`}
                                                            style={
                                                                !scoreIsTwelve
                                                                    ? {
                                                                          ...styles.systemScore,
                                                                          color: timerValColor,
                                                                      }
                                                                    : undefined
                                                            }
                                                        />
                                                    ) : null}
                                                </div>

                                                {m.comment && (
                                                    <div style={{ ...styles.systemComment, background: sysMsgCommentBg, borderLeft: sysMsgCommentBorder, color: sysMsgCommentText }}>
                                                        «{m.comment}»
                                                    </div>
                                                )}

                                                {m.gif && (
                                                    <img
                                                        src={m.gif}
                                                        alt="reaction"
                                                        loading="lazy"
                                                        decoding="async"
                                                        style={styles.systemGif}
                                                    />
                                                )}

                                                <div style={styles.systemTime}>
                                                    {new Date(
                                                        m.createdAt
                                                    ).toLocaleTimeString(
                                                        [],
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                const isMe = m.username === myUsername;

                                return (
                                    <div
                                        key={key}
                                        style={{
                                            ...styles.msgWrap,
                                            flexDirection:
                                                isMe
                                                    ? "row-reverse"
                                                    : "row",
                                            contentVisibility: "auto",
                                            containIntrinsicSize: "56px",
                                        }}
                                    >
                                        <UserAvatar
                                            username={m.username}
                                            avatarUrl={isMe ? m.avatarUrl ?? myAvatarUrl : m.avatarUrl}
                                            size={32}
                                            theme={theme}
                                            style={{
                                                borderRadius: "50%",
                                                ...(isMe
                                                    ? {}
                                                    : {
                                                          boxShadow: isLight
                                                              ? "none"
                                                              : "0 0 0 1px rgba(255,255,255,0.08)",
                                                      }),
                                            }}
                                        />

                                        <div
                                            style={{
                                                ...styles.bubble,
                                                background: isMe ? myBubbleBg : theirBubbleBg,
                                                color: isMe ? "#fff" : theirBubbleText,
                                                border: isMe
                                                    ? "1px solid rgba(255,255,255,0.08)"
                                                    : theirBubbleBorder,
                                                borderRadius: isMe
                                                    ? "14px 14px 4px 14px"
                                                    : "14px 14px 14px 4px",
                                                boxShadow: isLight || isMobile
                                                    ? isLight
                                                        ? "0 4px 15px rgba(0,0,0,0.05)"
                                                        : "none"
                                                    : styles.bubble.boxShadow,
                                            }}
                                        >
                                            {!isMe && (
                                                <div style={{ ...styles.name, color: isLight ? "#1f2937" : isGray ? "#9ca3af" : "#7aa2ff" }}>
                                                    {m.username}
                                                </div>
                                            )}

                                            <div style={styles.messageText}>
                                                {m.message}
                                            </div>

                                            <div style={styles.time}>
                                                {new Date(
                                                    m.createdAt
                                                ).toLocaleTimeString(
                                                    [],
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    }
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </>
                    ) : (
                        <div
                            style={{
                                padding: 24,
                                textAlign: "center",
                                color: promptText,
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            Загрузка…
                        </div>
                    )}
                </div>

                <div style={{ ...styles.chatInput, background: chatInputWrapBg, borderTop: chatPanelBorder }}>
                    {started ? (
                        <div style={{ ...styles.authPrompt, background: promptBg, border: promptBorder, color: promptText }}>
                            Конкурс еще не начался. Чат закрыт
                        </div>
                    ) : ended ? (
                        <div style={{ ...styles.authPrompt, background: promptBg, border: promptBorder, color: promptText }}>
                            Конкурс завершился. Чат закрыт
                        </div>
                    ) : isAuthenticated ? (
                        <div style={{ ...styles.inputWrapper, background: inputInnerBg, border: inputBorder }}>
                            <input
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                }}
                                placeholder="Напиши что-нибудь..."
                                style={{ ...styles.input, color: inputTextColor }}
                                onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    sendMessage()
                                }
                            />

                            <button
                                onClick={sendMessage}
                                style={{ ...styles.sendBtn, background: chatBtnBg, boxShadow: isLight ? "0 4px 10px rgba(0,0,0,0.1)" : styles.sendBtn.boxShadow }}
                            >
                                ➤
                            </button>
                        </div>
                    ) : (
                        <div style={{ ...styles.authPrompt, background: promptBg, border: promptBorder, color: promptText }}>
                            Войдите для участия в чате
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    layout: {
        display: "flex",
        width: "100%",
        height: "calc(100vh - 72px)",
        overflow: "hidden",
        position: "relative",
    },

    wrapper: {
        flex: 1,
        padding: "24px",
        height: "100%",
        overflowY: "auto",
        position: "relative",
        scrollbarWidth: "none",
    },

    header: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 10,
        gap: 2,
    },

    yearTop: {
        padding: "8px 18px",
        borderRadius: "999px",
        color: "#fff",
        fontSize: 21,
        fontWeight: 1000,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
        backdropFilter: "blur(12px)",
        marginBottom: 10,
    },

    title: {
        fontSize: "2.8rem",
        fontWeight: 900,
        textAlign: "center",
        lineHeight: 1,
        letterSpacing: "-0.04em",
        margin: 10,
    },

    timerContainer: {
        padding: "8px 20px",
        borderRadius: "100px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        backdropFilter: "blur(10px)",
        marginBottom: 10,
    },

    timerLabel: {
        fontSize: 13,
        textTransform: "uppercase",
    },

    timerValue: {
        fontWeight: 800,
        fontSize: 15,
        fontFamily: "monospace",
    },

    grid: {
        display: "grid",
        gap: 24,
        maxWidth: 1200,
        margin: "0 auto",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    },

    empty: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    chatButton: {
        position: "fixed",
        bottom: 30,
        width: 68,
        height: 68,
        borderRadius: "24px",
        cursor: "pointer",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.25s ease",
    },

    chatPanel: {
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },

    chatHeader: {
        padding: "0 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        flexShrink: 0,
        height: "72px",
    },

    chatTitle: {
        fontWeight: 800,
        fontSize: "1.1rem",
    },

    closeChatHeader: {
        width: "38px",
        height: "38px",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(10px)",
        border: "none",
    },

    chatMessages: {
        flex: 1,
        padding: "16px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },

    msgWrap: {
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
    },

    avatar: {
        width: 30,
        height: 30,
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 800,
        flexShrink: 0,
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    },

    bubble: {
        maxWidth: "85%",
        padding: "10px 14px",
        position: "relative",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
    },

    name: {
        fontSize: 11,
        fontWeight: 700,
        marginBottom: 2,
    },

    messageText: {
        fontSize: 13,
        lineHeight: "1.4",
        wordBreak: "break-word",
    },

    time: {
        fontSize: 9,
        opacity: 0.5,
        marginTop: 4,
        textAlign: "right",
    },

    chatInput: {
        padding: "12px 16px",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
    },

    inputWrapper: {
        display: "flex",
        borderRadius: "16px",
        padding: "4px",
        alignItems: "center",
        backdropFilter: "blur(16px)",
    },

    input: {
        flex: 1,
        padding: "10px 14px",
        background: "transparent",
        border: "none",
        outline: "none",
        fontSize: "16px",
    },

    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: "12px",
        border: "none",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 20px rgba(79,124,255,0.35)",
    },

    authPrompt: {
        textAlign: "center",
        fontSize: 12,
        padding: "10px",
        borderRadius: "12px",
    },

    systemMsg: {
        display: "flex",
        justifyContent: "center",
        padding: "4px 0",
    },

    systemMsgInner: {
        width: "100%",
        maxWidth: "95%",
        borderRadius: 16,
        padding: "12px 14px",
        boxShadow: "0 4px 20px rgba(79, 124, 255, 0.12), inset 0 1px rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
    },

    systemHeader: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
        flexWrap: "wrap",
    },

    systemIcon: {
        fontSize: 16,
        filter: "drop-shadow(0 2px 6px rgba(255, 215, 0, 0.5))",
    },

    systemUser: {
        fontWeight: 800,
        fontSize: 13,
    },

    systemText: {
        fontSize: 12,
        fontWeight: 500,
    },

    systemCountry: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },

    systemFlag: {
        fontSize: 20,
    },

    systemCountryName: {
        fontWeight: 700,
        fontSize: 14,
        flex: 1,
    },

    systemScore: {
        fontWeight: 900,
        fontSize: 16,
        fontFamily: "monospace",
        background: "rgba(255, 209, 102, 0.12)",
        padding: "3px 10px",
        borderRadius: 8,
        border: "1px solid rgba(255, 209, 102, 0.2)",
    },

    scoreChange: {
        display: "flex",
        alignItems: "center",
        gap: 6,
    },

    oldScore: {
        color: "#ff6b6b",
        fontWeight: 900,
        fontSize: 16,
        fontFamily: "monospace",
        textDecoration: "line-through",
        background: "rgba(255, 107, 107, 0.12)",
        padding: "3px 10px",
        borderRadius: 8,
        border: "1px solid rgba(255, 107, 107, 0.2)",
    },

    scoreArrow: {
        color: "#4f7cff",
        fontSize: 18,
        fontWeight: 900,
    },

    systemComment: {
        fontSize: 13,
        fontStyle: "italic",
        lineHeight: 1.4,
        marginTop: 6,
        padding: "8px 12px",
        borderRadius: 10,
    },

    systemGif: {
        width: "100%",
        maxHeight: 140,
        objectFit: "cover",
        borderRadius: 12,
        marginTop: 8,
        border: "1px solid rgba(255, 255, 255, 0.06)",
    },

    systemTime: {
        fontSize: 9,
        color: "#64748b",
        textAlign: "right",
        marginTop: 6,
        opacity: 0.6,
    },
};
