import { useEffect, useRef, useState } from "react";

export type ChatMessage = {
    contestId: string;
    username: string;
    message: string;
    createdAt: string;
};

type Props = {
    contestId: string;
    username: string;
};

const API_URL = import.meta.env.VITE_API_URL;

export function ChatModel({ contestId }: Props) {
    const ws = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        ws.current = new WebSocket(
            `ws://localhost:8080/v1/ws`
        );

        ws.current.onopen = () => {
            setConnected(true);
        };

        ws.current.onmessage = (event) => {
            try {
                const msg: ChatMessage = JSON.parse(event.data);
                setMessages((prev) => [...prev, msg]);
            } catch (e) {
                console.error("Invalid message", e);
            }
        };

        ws.current.onclose = () => {
            setConnected(false);
        };

        ws.current.onerror = () => {
            setConnected(false);
        };

        return () => {
            ws.current?.close();
        };
    }, [contestId]);

    async function sendMessage() {
        if (!input.trim()) return;

        const token = localStorage.getItem("token");

        if (!token) return;

        try {
            const params = new URLSearchParams({
                contest_id: contestId,
                message: input,
            });

            const res = await fetch(
                `${API_URL}/v1/message/send?${params.toString()}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) {
                throw new Error("Failed to send message");
            }

            setInput("");
        } catch (err) {
            console.error("Send message error:", err);
        }
    }

    return (
        <div style={styles.container}>
            {/* HEADER */}
            <div style={styles.header}>
                <div>
                    Chat {connected ? "🟢" : "🔴"}
                </div>
            </div>

            {/* MESSAGES */}
            <div style={styles.messages}>
                {messages.map((m, i) => (
                    <div key={i} style={styles.message}>
                        <div style={styles.meta}>
                            <b>{m.username}</b>
                            <span style={styles.time}>
                                {new Date(m.createdAt).toLocaleTimeString()}
                            </span>
                        </div>

                        <div>{m.message}</div>
                    </div>
                ))}
            </div>

            {/* INPUT */}
            <div style={styles.inputBox}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Введите сообщение..."
                    style={styles.input}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage();
                    }}
                />

                <button onClick={sendMessage} style={styles.button}>
                    Отправить
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        width: "100%",
        maxWidth: 500,
        height: 500,
        display: "flex",
        flexDirection: "column",
        border: "1px solid #24324f",
        borderRadius: 12,
        overflow: "hidden",
        background: "#0f172a",
        color: "#e6edf7",
    },

    header: {
        padding: 10,
        borderBottom: "1px solid #24324f",
        fontWeight: 700,
    },

    messages: {
        flex: 1,
        padding: 10,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },

    message: {
        padding: 8,
        background: "#111a2e",
        borderRadius: 10,
    },

    meta: {
        fontSize: 12,
        color: "#94a3b8",
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 4,
    },

    time: {
        fontSize: 11,
        opacity: 0.7,
    },

    inputBox: {
        display: "flex",
        borderTop: "1px solid #24324f",
    },

    input: {
        flex: 1,
        padding: 10,
        border: "none",
        outline: "none",
        background: "#0b1220",
        color: "white",
    },

    button: {
        padding: "0 16px",
        background: "#4f7cff",
        border: "none",
        color: "white",
        cursor: "pointer",
        fontWeight: 600,
    },
};