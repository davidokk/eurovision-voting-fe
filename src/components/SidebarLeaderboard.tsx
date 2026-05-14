import { useState } from "react";
import type { PerformanceWithScores, Theme } from "../types/contest";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";

type Props = {
    performances: PerformanceWithScores[];
    contestType?: string;
    onClose?: () => void;
    theme?: Theme;
};

type Mode = "all" | "mine" | "results";

export function SidebarLeaderboard({ performances, contestType, onClose, theme = "dark-blue" }: Props) {
    const [mode, setMode] = useState<Mode>("all");

    const supportsEmoji = getDoesBrowserSupportFlagEmojis();
    const user = localStorage.getItem("username");

    const getMyScore = (p: PerformanceWithScores) =>
        p.scores.find((s) => s.username === user)?.score ?? 0;

    const getMyComment = (p: PerformanceWithScores) =>
        p.scores.find((s) => s.username === user)?.comment ?? "";

    const sortedByScore = [...performances].sort(
        (a, b) => b.total_score - a.total_score
    );

    const sortedByPlace = [...performances].sort((a, b) => {
        const placeA = (a as any).place ?? (a as any).Place ?? Infinity;
        const placeB = (b as any).place ?? (b as any).Place ?? Infinity;
        return placeA - placeB;
    });

    const filtered = (() => {
        if (mode === "results") return sortedByPlace;
        if (mode === "all") return sortedByScore;

        return [...sortedByScore].sort(
            (a, b) => getMyScore(b) - getMyScore(a)
        );
    })();

    const isLight = theme === "light";
    const isGray = theme === "dark-gray";

    const textColor = isLight ? "#0f172a" : "#fff";
    const subTextColor = isLight ? "#64748b" : "#94a3b8";
    const btnBg = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)";
    const btnBgHover = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";

    const filtersBg = isLight ? "rgba(0, 0, 0, 0.04)" : isGray ? "rgba(20, 20, 20, 0.6)" : "rgba(15, 23, 42, 0.6)";
    const filtersBorder = isLight ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.06)";

    const activeFilterGrad = isLight 
        ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)" 
        : isGray 
        ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)" 
        : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)";

    const activeFilterShadow = isLight ? "0 4px 12px rgba(31, 41, 55, 0.2)" : isGray ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(79, 124, 255, 0.25)";

    const rowBg = isLight ? "rgba(255, 255, 255, 0.6)" : isGray ? "rgba(30, 30, 30, 0.4)" : "rgba(30, 41, 59, 0.4)";
    const rowHoverBg = isLight ? "rgba(255, 255, 255, 0.9)" : isGray ? "rgba(45, 45, 45, 0.6)" : "rgba(45, 55, 75, 0.6)";
    const rowBorder = isLight ? "1px solid rgba(0, 0, 0, 0.06)" : "1px solid rgba(255, 255, 255, 0.06)";

    const rankBg = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)";
    const rankColor = isLight ? "#64748b" : "#94a3b8";

    const countryColor = isLight ? "#0f172a" : "#e6edf7";
    const commentColor = isLight ? "#374151" : isGray ? "#9ca3af" : "#7aa2ff";
    const scoreColor = isLight ? "#d97706" : "#ffd166";
    const scorePillBg = isLight ? "rgba(217, 119, 6, 0.1)" : "rgba(255, 209, 102, 0.12)";
    const scorePillBorder = isLight ? "1px solid rgba(217, 119, 6, 0.2)" : "1px solid rgba(255, 209, 102, 0.2)";

    return (
        <div style={styles.sidebar}>
            {/* HEADER */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.headerIcon}>🏆</span>
                    <h2 style={{ ...styles.title, color: textColor }}>Топ</h2>
                </div>
                {onClose && (
                    <button
                        style={{ ...styles.closeBtn, background: btnBg, color: subTextColor }}
                        onClick={onClose}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = btnBgHover;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = btnBg;
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* FILTER BUTTONS */}
            <div style={{ ...styles.filters, background: filtersBg, border: filtersBorder }}>
                <button
                    style={{
                        ...styles.filterBtn,
                        color: mode === "all" ? "#fff" : subTextColor,
                        background: mode === "all" ? activeFilterGrad : "transparent",
                        boxShadow: mode === "all" ? activeFilterShadow : "none",
                    }}
                    onClick={() => setMode("all")}
                >
                    Общий топ
                </button>

                {user && (
                    <button
                        style={{
                            ...styles.filterBtn,
                            color: mode === "mine" ? "#fff" : subTextColor,
                            background: mode === "mine" ? activeFilterGrad : "transparent",
                            boxShadow: mode === "mine" ? activeFilterShadow : "none",
                        }}
                        onClick={() => setMode("mine")}
                    >
                        Мой топ
                    </button>
                )}

                {(contestType === "final" || contestType === "Финал") && (
                    <button
                        style={{
                            ...styles.filterBtn,
                            color: mode === "results" ? "#fff" : subTextColor,
                            background: mode === "results" ? activeFilterGrad : "transparent",
                            boxShadow: mode === "results" ? activeFilterShadow : "none",
                        }}
                        onClick={() => setMode("results")}
                    >
                        Результаты
                    </button>
                )}
            </div>

            {/* LIST */}
            <div style={styles.list}>
                {mode === "results" && !performances.some(p => (p as any).place !== undefined && (p as any).place !== null && (p as any).place !== "" || (p as any).Place !== undefined && (p as any).Place !== null && (p as any).Place !== "") ? (
                    <div style={{ textAlign: "center", padding: "32px 16px", color: subTextColor, fontSize: 14 }}>
                        Результаты еще не сформированы
                    </div>
                ) : filtered.map((p, index) => {
                    const displayScore =
                        mode === "mine"
                            ? getMyScore(p)
                            : p.total_score;

                    const myComment =
                        mode === "mine"
                            ? getMyComment(p)
                            : null;

                    const actualPlace = (p as any).place ?? (p as any).Place;
                    const rank = mode === "results" && actualPlace ? actualPlace : index + 1;
                    const isTop3 = rank <= 3;

                    return (
                        <div
                            key={p.performance_id}
                            onClick={() => {
                                window.location.href = `/country/${p.country.id}`;
                            }}
                            style={{
                                ...styles.row,
                                background: rowBg,
                                border: rowBorder,
                                ...(p.qualified ? styles.rowQualified : {}),
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = rowHoverBg;
                                e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = p.qualified ? "rgba(74, 222, 128, 0.12)" : rowBg;
                                e.currentTarget.style.transform = "translateY(0)";
                            }}
                        >
                            {/* Rank */}
                            <div style={{
                                ...styles.rank,
                                background: rankBg,
                                color: rankColor,
                                ...(isTop3 ? styles.rankTop : {}),
                                ...(rank === 1 ? { background: "linear-gradient(135deg, #ffd700, #ffaa00)", color: "#fff" } : {}),
                                ...(rank === 2 ? { background: "linear-gradient(135deg, #c0c0c0, #a8a8a8)", color: "#fff" } : {}),
                                ...(rank === 3 ? { background: "linear-gradient(135deg, #cd7f32, #b8690e)", color: "#fff" } : {}),
                            }}>
                                {rank}
                            </div>

                            {/* Country info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ ...styles.countryName, color: countryColor }}>
                                    {supportsEmoji ? p.country.flag_emoji : ""}{" "}
                                    {p.country.name_ru}
                                </div>

                                {mode === "mine" && myComment && (
                                    <div style={{ ...styles.comment, color: commentColor }}>
                                        "{myComment}"
                                    </div>
                                )}
                            </div>

                                {(contestType === "final" || contestType === "Финал") && mode !== "results" && actualPlace !== undefined && actualPlace !== null && actualPlace !== "" ? (
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        fontSize: 12,
                                        fontWeight: 800,
                                        fontFamily: "monospace",
                                        color: (rank - actualPlace) > 0 ? "#22c55e" : (rank - actualPlace) < 0 ? "#ef4444" : subTextColor,
                                    }}>
                                        {(rank - actualPlace) > 0 ? `▲ ${rank - actualPlace}` : (rank - actualPlace) < 0 ? `▼ ${Math.abs(rank - actualPlace)}` : "═ 0"}
                                    </div>
                                ) : null}

                            {/* Score & Diff Container */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    background: p.qualified ? "rgba(74, 222, 128, 0.15)" : scorePillBg,
                                    border: p.qualified ? "1px solid rgba(74, 222, 128, 0.3)" : scorePillBorder,
                                    padding: "4px 10px",
                                    borderRadius: 10,
                                    color: p.qualified ? "#4ade80" : scoreColor,
                                }}>
                                    <span style={{ fontSize: 13 }}>⭐</span>
                                    <span style={{ fontSize: 15, fontWeight: 900, fontFamily: "monospace" }}>
                                        {Number(displayScore.toFixed(2))}
                                    </span>
                                </div>

            
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
        width: "100%",
        height: "100%",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "transparent",
        boxSizing: "border-box",
    },

    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },

    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },

    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        fontSize: 15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s ease",
        flexShrink: 0,
    },

    headerIcon: {
        fontSize: 20,
        filter: "drop-shadow(0 2px 6px rgba(255, 215, 0, 0.4))",
    },

    title: {
        margin: 0,
        fontSize: "1.2rem",
        fontWeight: 900,
        letterSpacing: "-0.02em",
    },

    filters: {
        display: "flex",
        gap: 4,
        borderRadius: 14,
        padding: 4,
    },

    filterBtn: {
        flex: 1,
        padding: "10px 8px",
        borderRadius: 11,
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        transition: "all 0.25s ease",
    },

    list: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflowY: "auto",
        paddingRight: 4,
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(79, 124, 255, 0.2) transparent",
    },

    row: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: 14,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontWeight: 600,
        gap: 10,
        cursor: "pointer",
        transition: "all 0.2s ease",
    },

    rowQualified: {
        border: "1px solid rgba(74, 222, 128, 0.5)",
        background: "rgba(74, 222, 128, 0.12)",
        boxShadow: "0 0 24px rgba(74, 222, 128, 0.15), inset 0 0 20px rgba(74, 222, 128, 0.05)",
    },

    rank: {
        width: 28,
        height: 28,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 900,
        flexShrink: 0,
    },

    rankTop: {
        color: "#fff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
    },

    countryName: {
        fontSize: "14px",
        fontWeight: 700,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },

    comment: {
        marginTop: 3,
        fontSize: 11,
        fontStyle: "italic",
        fontWeight: 400,
        opacity: 0.8,
        lineHeight: 1.4,
        wordBreak: "break-word" as const,
    },
};
