import { useState } from "react";
import type { PerformanceWithScores } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";

type Props = {
    performances: PerformanceWithScores[];
};

type Mode = "all" | "mine";

export function SidebarLeaderboard({ performances }: Props) {
    const [mode, setMode] = useState<Mode>("all");

    const supportsEmoji = getDoesBrowserSupportFlagEmojis();
    const user = localStorage.getItem("username");

    const getMyScore = (p: PerformanceWithScores) =>
        p.scores.find((s) => s.username === user)?.score ?? 0;

    const getMyComment = (p: PerformanceWithScores) =>
        p.scores.find((s) => s.username === user)?.comment ?? "";

    const sorted = [...performances].sort(
        (a, b) => b.total_score - a.total_score
    );

    const filtered = (() => {
        if (mode === "all") return sorted;

        return [...sorted].sort(
            (a, b) => getMyScore(b) - getMyScore(a)
        );
    })();

    return (
        <div style={styles.sidebar}>
            {/* HEADER */}
            <div style={styles.header}>
                <h2 style={styles.title}>Топ</h2>
            </div>

            {/* FILTER BUTTONS */}
            <div style={styles.filters}>
                <button
                    style={{
                        ...styles.filterBtn,
                        background: mode === "all" ? "#4f7cff" : "#16213a",
                    }}
                    onClick={() => setMode("all")}
                >
                    Общий топ
                </button>

                {user && (
                    <button
                        style={{
                            ...styles.filterBtn,
                            background: mode === "mine" ? "#4f7cff" : "#16213a",
                        }}
                        onClick={() => setMode("mine")}
                    >
                        Мой топ
                    </button>
                )}
            </div>

            {/* LIST */}
            <div style={styles.list}>
                {filtered.map((p) => {
                    const displayScore =
                        mode === "mine"
                            ? getMyScore(p)
                            : p.total_score;

                    const myComment =
                        mode === "mine"
                            ? getMyComment(p)
                            : null;

                    return (
                        <div
                            key={p.performance_id}
                            style={{
                                ...styles.row,
                                ...(p.qualified
                                    ? {
                                          border: "1px solid #22c55e",
                                          background: "#0f2a1c",
                                      }
                                    : {}),
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div>
                                    {supportsEmoji ? p.country.flag_emoji : ""}{" "}
                                    {p.country.name_ru}
                                </div>

                                {mode === "mine" && myComment && (
                                    <div style={styles.comment}>
                                        “{myComment}”
                                    </div>
                                )}
                            </div>

                            <div style={styles.score}>
                                ⭐ {Number(displayScore.toFixed(2))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    sidebar: {
        width: "100%", // Теперь шириной управляет родительский контейнер
        height: "100%",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "#111a2e",
        boxSizing: "border-box",
    },

    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    title: {
        margin: 0,
        color: "#e6edf7",
        fontSize: "1.2rem",
    },

    filters: {
        display: "flex",
        gap: 8,
    },

    filterBtn: {
        flex: 1,
        padding: "8px",
        borderRadius: 8,
        border: "1px solid #24324f",
        color: "#e6edf7",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        transition: "background 0.2s",
    },

    list: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        overflowY: "auto",
        paddingRight: 4,
    },

    row: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px",
        border: "1px solid #24324f",
        borderRadius: 10,
        background: "#16213a",
        fontWeight: 600,
        gap: 10,
    },

    score: {
        whiteSpace: "nowrap",
    },

    comment: {
        marginTop: 4,
        fontSize: 12,
        color: "#9fb0d0",
        fontStyle: "italic",
        fontWeight: 400,
    },
};