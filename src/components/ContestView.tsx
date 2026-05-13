import { useEffect, useMemo, useRef, useState } from "react";
import type { ContestView as ContestViewType } from "../types/contest";
import { PerformanceCard } from "./PerformanceCard";

type Props = {
    contest: ContestViewType | null;
    chatOpen: boolean;
    setChatOpen: (open: boolean) => void;
};

type ChatMessage = {
    username: string;
    message: string;
    createdAt: string;
};

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

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

export function ContestView({ contest, chatOpen, setChatOpen }: Props) {
    const [now, setNow] = useState(Date.now());
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const myUsername = localStorage.getItem("username");
    const myUserId = localStorage.getItem("user_id"); // Предполагаю, что ID тоже в сторадже
    const token = localStorage.getItem("token");

    const isAuthenticated = !!token;

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;

            setIsMobile(mobile);

            // if (!mobile) setChatOpen(true);
        };

        window.addEventListener("resize", handleResize);

        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, [setChatOpen]);

    useEffect(() => {
        if (!contest) return;

        async function fetchMessages() {
            try {
                if (!contest) return;
                
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
        ws.current = new WebSocket(`${WS_URL}/v1/ws`);

        ws.current.onmessage = (e) => {
            const msg: ChatMessage = JSON.parse(e.data);

            setMessages((prev) => [...prev, msg]);
        };

        return () => ws.current?.close();
    }, []);

    async function sendMessage() {
        if (!input.trim() || !isAuthenticated || !contest) return;

        try {
            const currentInput = input;

            setInput("");

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
        
        // Ищем первое выступление, где в массиве scores нет объекта с твоим ID или username
        const firstUnvotedIndex = items.findIndex(p => 
            !p.scores.some(s => s.user_id === myUserId || s.username === myUsername)
        );
        
        if (firstUnvotedIndex > 0) {
            const [nextToVote] = items.splice(firstUnvotedIndex, 1);
            items.unshift(nextToVote);
        }
        
        return items;
    }, [contest, myUsername, myUserId]);

    if (!contest) {
        return (
            <div style={styles.empty}>
                Выберите год в меню
            </div>
        );
    }

    return (
        <div style={styles.layout}>
            <div
                style={styles.wrapper}
                onClick={() => isMobile && chatOpen && setChatOpen(false)}
            >
                <header style={styles.header}>
                    <h1 style={styles.title}>
                        {translateContestType(contest.contest.type)}
                    </h1>
                    <div style={styles.yearTop}>
                        {contest.contest.year}
                    </div>

                    {(
                        <div style={styles.timerContainer}>
                            {started && <span style={styles.timerLabel}>
                                До начала:
                            </span>}

                            <span style={styles.timerValue}>
                                {timerText}
                                {ended && ("ОЦЕНИВАНИЕ ЗАКРЫТО")}
                            </span>
                        </div>
                    )}
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
                        <div style={styles.chatHeader}>
                            <div style={styles.chatTitle}>
                                Чат
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();

                                    setChatOpen(false);
                                }}
                                style={styles.closeChatHeader}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.chatMessages}>
                            {messages.map((m, i) => {
                                const isMe =
                                    m.username === myUsername;

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
                                                    ? "linear-gradient(135deg, #6b8eff, #4f7cff)"
                                                    : "#24324f",
                                            }}
                                        >
                                            {m.username
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div
                                            style={{
                                                ...styles.bubble,
                                                background: isMe
                                                    ? "linear-gradient(135deg, rgba(79,124,255,0.8), rgba(59,91,219,0.8))"
                                                    : "rgba(30,41,59,0.7)",
                                                border: isMe
                                                    ? "1px solid rgba(255,255,255,0.08)"
                                                    : "1px solid rgba(255,255,255,0.05)",
                                                borderRadius: isMe
                                                    ? "14px 14px 4px 14px"
                                                    : "14px 14px 14px 4px",
                                            }}
                                        >
                                            {!isMe && (
                                                <div style={styles.name}>
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

                        <div style={styles.chatInput}>
                            {started ? (
                                <div style={styles.authPrompt}>
                                    Конкурс еще не начался. Чат закрыт
                                </div>
                            ) : ended ? (
                                <div style={styles.authPrompt}>
                                    Конкурс завершился. Чат закрыт
                                </div>
                            ) : isAuthenticated ? (
                                <div style={styles.inputWrapper}>
                                    <input
                                        value={input}
                                        onChange={(e) => {
                                            setInput(e.target.value);
                                        }}
                                        placeholder="Напиши что-нибудь..."
                                        style={styles.input}
                                        onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            sendMessage()
                                        }
                                    />

                                    <button
                                        onClick={sendMessage}
                                        style={styles.sendBtn}
                                    >
                                        ➤
                                    </button>
                                </div>
                            ) : (
                                <div style={styles.authPrompt}>
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
        background: `
            radial-gradient(circle at top left, rgba(79,124,255,0.18), transparent 30%),
            radial-gradient(circle at bottom right, rgba(159,122,234,0.18), transparent 30%),
            #020617
        `,
    },

    wrapper: {
        flex: 1,
        padding: "24px",
        height: "100%",
        overflowY: "auto",
        position: "relative",
        scrollbarWidth: "none",
        backgroundImage: `
            radial-gradient(circle at top, rgba(79,124,255,0.08), transparent 35%)
        `,
    },

    header: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 10,
        gap: 2,
    },

    yearTop: {
        background: "linear-gradient(135deg, #4f7cff 0%, #3b5bdb 100%)",
        padding: "8px 18px",
        borderRadius: "999px",
        color: "#fff",
        fontSize: 21,
        fontWeight: 1000,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
        boxShadow: `
        0 8px 24px rgba(79,124,255,0.35),
        inset 0 1px rgba(255,255,255,0.18)
    `,
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
        marginBottom: 10,
    },

    title: {
        color: "#fff",
        fontSize: "2.8rem",
        fontWeight: 900,
        textAlign: "center",
        lineHeight: 1,
        letterSpacing: "-0.04em",
        textShadow: "0 10px 40px rgba(79,124,255,0.35)",
        margin: 10,
    },

    timerContainer: {
        background: "rgba(255, 209, 102, 0.1)",
        padding: "8px 20px",
        borderRadius: "100px",
        border: "1px solid rgba(255, 209, 102, 0.2)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        backdropFilter: "blur(10px)",
        marginBottom: 10,
    },

    timerLabel: {
        color: "#94a3b8",
        fontSize: 13,
        textTransform: "uppercase",
    },

    timerValue: {
        color: "#ffd166",
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
        color: "#64748b",
    },

    chatButton: {
        position: "fixed",
        bottom: 30,
        width: 68,
        height: 68,
        borderRadius: "24px",
        background:
            "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.12)",
        cursor: "pointer",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `
            0 10px 30px rgba(79,124,255,0.35),
            inset 0 1px rgba(255,255,255,0.15)
        `,
        transition: "all 0.25s ease",
    },

    chatPanel: {
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        background: "rgba(15, 23, 42, 0.72)",
        display: "flex",
        flexDirection: "column",
        transition:
            "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        boxShadow: `
            -10px 0 40px rgba(0,0,0,0.35),
            inset 1px 0 rgba(255,255,255,0.05)
        `,
    },

    chatHeader: {
        padding: "0 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(30, 41, 59, 0.45)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        flexShrink: 0,
        height: "72px",
    },

    chatTitle: {
        fontWeight: 800,
        fontSize: "1.1rem",
        color: "#fff",
    },

    closeChatHeader: {
        background: "rgba(255,255,255,0.08)",
        border: "none",
        color: "#fff",
        width: "38px",
        height: "38px",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(10px)",
    },

    chatMessages: {
        flex: 1,
        padding: "16px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12, // Уменьшено расстояние между сообщениями
    },

    msgWrap: {
        display: "flex",
        gap: 8, // Уменьшен зазор между аватаром и бабблом
        alignItems: "flex-end",
    },

    avatar: {
        width: 30, // Уменьшен размер аватара
        height: 30,
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 800,
        color: "#fff",
        flexShrink: 0,
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    },

    bubble: {
        maxWidth: "85%", // Чуть увеличена макс. ширина для текста
        padding: "10px 14px", // Уменьшены внутренние отступы баббла
        color: "#fff",
        position: "relative",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
    },

    name: {
        fontSize: 11,
        fontWeight: 700,
        color: "#7aa2ff",
        marginBottom: 2,
    },

    messageText: {
        fontSize: 13, // Чуть уменьшен шрифт сообщения
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
        padding: "12px 16px", // Уменьшены отступы блока ввода
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(30,41,59,0.45)",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
        paddingBottom:
            "calc(12px + env(safe-area-inset-bottom))",
    },

    inputWrapper: {
        display: "flex",
        background: "rgba(15,23,42,0.65)",
        borderRadius: "16px",
        padding: "4px",
        border: "1px solid rgba(255,255,255,0.08)",
        alignItems: "center",
        backdropFilter: "blur(16px)",
    },

    input: {
        flex: 1,
        padding: "10px 14px",
        background: "transparent",
        border: "none",
        color: "#fff",
        outline: "none",
        fontSize: "16px",
    },

    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: "12px",
        border: "none",
        background:
            "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 20px rgba(79,124,255,0.35)",
    },

    authPrompt: {
        textAlign: "center",
        color: "#64748b",
        fontSize: 12,
        padding: "10px",
        background: "rgba(15, 23, 42, 0.5)",
        borderRadius: "12px",
        border: "1px dashed #334155",
    },
};
