import { useEffect, useMemo, useRef, useState } from "react";

import type { ContestView as ContestViewType } from "../types/contest";
import { PerformanceCard } from "./PerformanceCard";

type Props = {
    contest: ContestViewType | null;
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
    if (days > 0) parts.push(`${days} ${plural(days, "день", "дня", "дней")}`);
    if (hours > 0) parts.push(`${hours} ${plural(hours, "час", "часа", "часов")}`);
    if (minutes > 0) parts.push(`${minutes} ${plural(minutes, "минута", "минуты", "минут")}`);
    if (seconds > 0 || parts.length === 0)
        parts.push(`${seconds} ${plural(seconds, "секунда", "секунды", "секунд")}`);
    return parts.join(" ");
}

export function ContestView({ contest }: Props) {
    const [now, setNow] = useState(Date.now());
    const [chatOpen, setChatOpen] = useState(false); // На мобилках лучше по умолчанию закрыт
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const myUsername = localStorage.getItem("username");
    const token = localStorage.getItem("token");
    const isAuthenticated = !!token;

    // Следим за размером экрана
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setChatOpen(true); // На десктопе открываем
        };
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!contest) return;
        async function fetchMessages() {
            try {
                const params = new URLSearchParams({ contest_id: contest!.contest.id });
                const res = await fetch(`${API_URL}/v1/message?${params.toString()}`);
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                setMessages(data || []);
            } catch (err) { console.error(err); }
        }
        fetchMessages();
    }, [contest?.contest.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, chatOpen]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
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
            const params = new URLSearchParams({ contest_id: contest.contest.id, message: input });
            const res = await fetch(`${API_URL}/v1/message/send?${params.toString()}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setInput("");
        } catch (err) { console.error(err); }
    }

    const timerText = useMemo(() => {
        if (!contest) return null;
        const starts = new Date(contest.contest.starts).getTime();
        const diff = starts - now;
        if (diff > 0) return `евравидение чере........ ${formatTime(diff)}`;
        if (Math.abs(diff) <= 600000) return "start voting now!!!!!!!!!!!!!";
        return null;
    }, [contest, now]);

    if (!contest) return <div style={styles.empty}>Выберите год</div>;

    return (
        <div style={styles.layout}>
            {/* MAIN CONTENT */}
            <div 
                style={styles.wrapper}
                onClick={() => isMobile && chatOpen && setChatOpen(false)}
            >
                <h1 style={styles.title}>
                    {contest.contest.year} | {translateContestType(contest.contest.type)}
                </h1>
                {timerText && <div style={styles.timer}>{timerText}</div>}
                <div style={styles.grid}>
                    {contest.performances.map((p) => (
                        <PerformanceCard
                            key={p.performance_id}
                            performance={p}
                            votingStarted={now >= new Date(contest.contest.starts).getTime()}
                            votingEnded={now > new Date(contest.contest.ends).getTime()}
                        />
                    ))}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); setChatOpen(!chatOpen); }}
                    style={{
                        ...styles.chatButton,
                        right: (chatOpen && !isMobile) ? 360 : 20,
                    }}
                >
                    {chatOpen ? "✕" : "💬"}
                </button>
            </div>

            {/* CHAT SIDEBAR */}
            <div
                style={{
                    ...styles.chatPanel,
                    width: chatOpen ? (isMobile ? "100%" : 340) : 0,
                    position: isMobile ? "absolute" : "relative",
                    right: 0,
                    zIndex: 1000,
                    borderLeft: chatOpen ? "1px solid #24324f" : "none",
                    boxShadow: isMobile && chatOpen ? "-10px 0 30px rgba(0,0,0,0.5)" : "none",
                }}
            >
                {chatOpen && (
                    <>
                        <div style={styles.chatHeader}>
                            <div style={styles.chatTitle}>💬 Чат</div>
                        </div>
                        <div style={styles.chatMessages}>
                            {messages.map((m, i) => {
                                const isMe = m.username === myUsername;
                                return (
                                    <div key={i} style={{ ...styles.msgWrap, flexDirection: isMe ? "row-reverse" : "row" }}>
                                        <div style={{ ...styles.avatar, background: isMe ? "#6b8eff" : "#24324f" }}>
                                            {m.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{
                                            ...styles.bubble,
                                            background: isMe ? "#4f7cff" : "#1e293b",
                                            border: isMe ? "1px solid #7598ff" : "1px solid #334155",
                                            borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                                        }}>
                                            {!isMe && <div style={styles.name}>{m.username}</div>}
                                            <div style={styles.messageText}>{m.message}</div>
                                            <div style={styles.time}>
                                                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div style={styles.chatInput}>
                            {isAuthenticated ? (
                                <>
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Напиши..."
                                        style={styles.input}
                                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                    />
                                    <button onClick={sendMessage} style={styles.sendBtn}>➤</button>
                                </>
                            ) : (
                                <div style={styles.authPrompt}>Войдите, чтобы общаться</div>
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
        height: "calc(100vh - 96px)",
        overflow: "hidden",
        position: "relative",
    },
    wrapper: {
        flex: 1,
        padding: "16px",
        height: "100%",
        overflowY: "auto",
        background: "#0b1220",
        position: "relative",
    },
    empty: { padding: 20, color: "#9aa7bd", textAlign: "center" },
    title: { textAlign: "center", color: "#e6edf7", fontSize: "1.5rem", marginBottom: 16 },
    timer: { textAlign: "center", color: "#ffd166", marginBottom: 20, fontWeight: 700 },
    grid: { display: "grid", gap: 16 },
    chatButton: {
        position: "fixed",
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#4f7cff",
        color: "#fff",
        border: "none",
        fontSize: 20,
        cursor: "pointer",
        boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
        transition: "right 0.25s ease",
        zIndex: 1100,
    },
    chatPanel: {
        height: "100%",
        background: "#0f172a",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease",
        overflow: "hidden",
    },
    chatHeader: { padding: "16px 20px", borderBottom: "1px solid #24324f", color: "#fff", background: "#161f33" },
    chatTitle: { fontWeight: 700, fontSize: "1.1rem" },
    chatMessages: { flex: 1, padding: "16px 12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 },
    msgWrap: { display: "flex", gap: 8, alignItems: "flex-end" },
    avatar: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, marginBottom: 2 },
    bubble: { maxWidth: "80%", padding: "10px 14px", color: "#fff", display: "flex", flexDirection: "column", gap: 2 },
    name: { fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 2 },
    messageText: { fontSize: 14, lineHeight: "1.4", wordBreak: "break-word" },
    time: { fontSize: 10, opacity: 0.5, alignSelf: "flex-end", marginTop: 2 },
    chatInput: { display: "flex", padding: "16px", borderTop: "1px solid #24324f", background: "#0f172a", gap: 10, minHeight: "76px", alignItems: "center" },
    input: { flex: 1, padding: "12px 16px", borderRadius: "20px", border: "1px solid #334155", background: "#1e293b", color: "#fff", outline: "none", fontSize: 14, minWidth: 0 },
    sendBtn: { width: 44, height: 44, borderRadius: "50%", border: "none", background: "#4f7cff", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    authPrompt: { flex: 1, textAlign: "center", color: "#94a3b8", fontSize: 13, fontStyle: "italic", padding: "10px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "12px", border: "1px dashed #334155" }
};