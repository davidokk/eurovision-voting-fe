import { useState } from "react";
import type { PerformanceWithScores } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";

type Props = {
    performances: PerformanceWithScores[];
};

type Mode = "all" | "mine";

export function SidebarLeaderboard({ performances }: Props) {
    const [hidden, setHidden] = useState(false);
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

    if (hidden) {
        return (
            <div style={styles.collapsed}>
                <button
                    style={styles.showBtn}
                    onClick={() => setHidden(false)}
                >
                    ▶
                </button>
            </div>
        );
    }

    return (
        <div style={styles.sidebar}>
            {/* HEADER */}
            <div style={styles.header}>
                <h2 style={styles.title}>Топ</h2>

                <button
                    style={styles.hideBtn}
                    onClick={() => setHidden(true)}
                >
                    ◀
                </button>
            </div>

            {/* FILTER BUTTONS */}
            <div style={styles.filters}>
                <button
                    style={{
                        ...styles.filterBtn,
                        background:
                            mode === "all"
                                ? "#4f7cff"
                                : "#16213a",
                    }}
                    onClick={() => setMode("all")}
                >
                    Общий топ
                </button>

                {user && (
                    <button
                        style={{
                            ...styles.filterBtn,
                            background:
                                mode === "mine"
                                    ? "#4f7cff"
                                    : "#16213a",
                        }}
                        onClick={() => setMode("mine")}
                    >
                        Мой топ
                    </button>
                )}
            </div>

            {/* LIST */}
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
                        style={styles.row}
                    >
                        <div style={{ flex: 1 }}>
                            <div>
                                {supportsEmoji
                                    ? p.country.flag_emoji
                                    : ""}{" "}
                                {p.country.name_ru}
                            </div>

                            {/* 🔥 комментарий в МОЁМ ТОПЕ */}
                            {mode === "mine" &&
                                myComment && (
                                    <div
                                        style={
                                            styles.comment
                                        }
                                    >
                                        “{myComment}”
                                    </div>
                                )}
                        </div>

                        <div>
                            ⭐{" "}
                            {Number(
                                displayScore.toFixed(2)
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    sidebar: {
        width: 260,
        borderRight: "1px solid #24324f",
        padding: 16,
        display: "grid",
        gap: 10,
        height: "calc(100vh - 72px)",
        overflowY: "auto",
        background: "#111a2e",
    },

    collapsed: {
        width: 40,
        height: "calc(100vh - 72px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111a2e",
        borderRight: "1px solid #24324f",
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },

    title: {
        margin: 0,
        color: "#e6edf7",
        flex: 1,
        textAlign: "center",
    },

    filters: {
        display: "flex",
        gap: 8,
    },

    filterBtn: {
        flex: 1,
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid #24324f",
        color: "#e6edf7",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
    },

    row: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        border: "1px solid #24324f",
        borderRadius: 10,
        background: "#16213a",
        fontWeight: 600,
        gap: 10,
    },

    comment: {
        marginTop: 4,
        fontSize: 12,
        color: "#9fb0d0",
        fontStyle: "italic",
    },

    hideBtn: {
        background: "#16213a",
        border: "1px solid #24324f",
        color: "#e6edf7",
        borderRadius: 8,
        padding: "4px 8px",
        cursor: "pointer",
    },

    showBtn: {
        background: "#16213a",
        border: "1px solid #24324f",
        color: "#e6edf7",
        borderRadius: 8,
        padding: "6px 8px",
        cursor: "pointer",
    },
};