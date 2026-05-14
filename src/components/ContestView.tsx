import { useEffect, useMemo, useRef, useState } from "react";
import type { ContestView as ContestViewType, Theme } from "../types/contest";
import { PerformanceCard } from "./PerformanceCard";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";

type Props = {
    contest: ContestViewType | null;
    chatOpen: boolean;
    setChatOpen: (open: boolean) => void;
    theme?: Theme;
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
};

const API_URL = (import.meta as any).env?.VITE_API_URL || "";
const WS_URL = (import.meta as any).env?.VITE_WS_URL || "";

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

export function ContestView({ contest, chatOpen, setChatOpen, theme = "dark-blue" }: Props) {
    const supportsEmoji = getDoesBrowserSupportFlagEmojis();
    const [now, setNow] = useState(Date.now());
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const myUsername = localStorage.getItem("username");
    const myUserId = localStorage.getItem("user_id");
    const token = localStorage.getItem("token");

    const isAuthenticated = !!token;

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
        if (!contest || !API_URL) return;

        async function fetchMessages() {
            try {
                if (!contest || !API_URL) return;
                
                const params = new URLSearchParams({
                    contest_id: contest.contest.id
                });

                const res = await fetch(
                    `${API_URL}/v1/message?${params.toString()}`
                );

                if (!res.ok) throw new Error("Failed");

                const data = await res.json();
                setMessages(data || []);
            } catch (err) {
                console.error(err);
            }
        }

        fetchMessages();
    }, [contest?.contest.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages, chatOpen]);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!WS_URL) return;
        try {
            ws.current = new WebSocket(`${WS_URL}/v1/ws`);
            ws.current.onmessage = (e) => {
                const msg: ChatMessage = JSON.parse(e.data);
                setMessages((prev) => [...prev, msg]);
            };
        } catch (err) {
            console.error("WS error", err);
        }

        return () => ws.current?.close();
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

    const chatPanelBg = isLight ? "rgba(255, 255, 255, 0.95)" : isGray ? "rgba(28, 28, 28, 0.95)" : "rgba(15, 23, 42, 0.72)";
    const chatPanelBorder = isLight ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)";
    const chatPanelShadow = isLight ? "-10px 0 40px rgba(0,0,0,0.1)" : "-10px 0 40px rgba(0,0,0,0.35), inset 1px 0 rgba(255,255,255,0.05)";

    const chatHeaderBg = isLight ? "rgba(241, 245, 249, 0.8)" : isGray ? "rgba(45, 45, 45, 0.8)" : "rgba(30, 41, 59, 0.45)";
    const chatCloseBg = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";

    const chatInputWrapBg = isLight ? "rgba(241, 245, 249, 0.8)" : isGray ? "rgba(45, 45, 45, 0.8)" : "rgba(30,41,59,0.45)";
    const inputInnerBg = isLight ? "rgba(255, 255, 255, 0.9)" : isGray ? "rgba(18, 18, 18, 0.8)" : "rgba(15,23,42,0.65)";
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
            <div style={{ ...styles.layout, background: layoutBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
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
                    margin: "auto",
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

                    <h1 style={{
                        margin: 0,
                        color: titleColor,
                        fontSize: isMobile ? "2.2rem" : "3.6rem",
                        fontWeight: 950,
                        lineHeight: 1.1,
                        letterSpacing: "-0.03em",
                        textShadow: titleShadow,
                    }}>
                        {translateContestType(contest.contest.type)}
                    </h1>

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
                        />
                    ))}
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setChatOpen(!chatOpen);
                    }}
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
                </button>
            </div>

            <div
                style={{
                    ...styles.chatPanel,
                    background: chatPanelBg,
                    borderLeft: chatPanelBorder,
                    boxShadow: chatPanelShadow,
                    width: chatOpen
                        ? (isMobile ? "100%" : 340)
                        : 0,
                    transform: chatOpen
                        ? "translateX(0)"
                        : "translateX(100%)",
                    position: isMobile ? "absolute" : "relative",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    height: "100%",
                    zIndex: 2000,
                }}
            >
                {chatOpen && (
                    <>
                        <div style={{ ...styles.chatHeader, background: chatHeaderBg, borderBottom: chatPanelBorder }}>
                            <div style={{ ...styles.chatTitle, color: titleColor }}>
                                Чат
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setChatOpen(false);
                                }}
                                style={{ ...styles.closeChatHeader, background: chatCloseBg, color: titleColor }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.chatMessages}>
                            {messages.map((m, i) => {
                                if (m.type === "system") {
                                    return (
                                        <div key={i} style={styles.systemMsg}>
                                            <div style={{ ...styles.systemMsgInner, background: sysMsgBg, border: sysMsgBorder }}>
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
                                                            <span style={{ ...styles.systemScore, color: timerValColor }}>
                                                                {m.score} {plural(m.score || 0, "балл", "балла", "баллов")}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ ...styles.systemScore, color: timerValColor }}>
                                                            {m.score} {plural(m.score || 0, "балл", "балла", "баллов")}
                                                        </span>
                                                    )}
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
                                        key={i}
                                        style={{
                                            ...styles.msgWrap,
                                            flexDirection:
                                                isMe
                                                    ? "row-reverse"
                                                    : "row",
                                        }}
                                    >
                                        <div
                                            style={{
                                                ...styles.avatar,
                                                background: isMe
                                                    ? (isLight ? "linear-gradient(135deg, #4b5563, #1f2937)" : isGray ? "#4b5563" : "linear-gradient(135deg, #6b8eff, #4f7cff)")
                                                    : (isLight ? "#cbd5e1" : "#24324f"),
                                                color: isLight && !isMe ? "#0f172a" : "#fff",
                                            }}
                                        >
                                            {m.username
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

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
                                                boxShadow: isLight ? "0 4px 15px rgba(0,0,0,0.05)" : styles.bubble.boxShadow,
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
                    </>
                )}
            </div>
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
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
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
