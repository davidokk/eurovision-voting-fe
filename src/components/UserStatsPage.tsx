import { useEffect, useState } from "react";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import type { Theme } from "../types/contest";

type ScoreFiltered = {
    Username: string;
    CountryName: string;
    ContestYear: number;
    ContestType: string;
    Score: number;
    Comment: string | null;
    YoutubeLink: string;
    GifURL: string | null;
    Song: string;
    Artist: string;
};

type SortType = "time" | "score";

type Country = {
    id: string;
    name_ru: string;
    flag_emoji: string;
};

type ContestMap = Record<
    string,
    {
        id: string;
        type: string;
        year: number;
        starts: string;
        ends: string;
    }[]
>;

type Props = {
    userId: string;
    theme?: Theme;
};

function getYouTubeId(url: string) {
    const match = url.match(
        /(?:youtu\.be\/|youtube\.com.*v=)([^&?/]+)/i
    );
    return match?.[1] || null;
}

function formatContestType(type: string) {
    switch (type) {
        case "final":
            return "Финал";
        case "first-semifinal":
            return "Первый полуфинал";
        case "second-semifinal":
            return "Второй полуфинал";
        default:
            return type;
    }
}

function formatAvg(value: number) {
    if (!value || Number.isNaN(value)) return "0";
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded)
        ? String(rounded)
        : rounded.toFixed(2);
}

export function UserStatsPage({ userId, theme = "dark-blue" }: Props) {
    const API_URL = (import.meta as any).env?.VITE_API_URL || "";

    const [data, setData] = useState<ScoreFiltered[]>([]);
    const [loading, setLoading] = useState(false);

    const [countries, setCountries] = useState<Country[]>([]);
    const [selectedCountry, setSelectedCountry] = useState("");

    const [contests, setContests] = useState<ContestMap>({});
    const [selectedYear, setSelectedYear] = useState<string>("");

    const supportsEmoji = getDoesBrowserSupportFlagEmojis();
    const [sort, setSort] = useState<SortType>("score");

    useEffect(() => {
        if (!API_URL) return;
        fetch(`${API_URL}/v1/countries`)
            .then((r) => r.json())
            .then(setCountries)
            .catch(() => setCountries([]));
    }, []);

    useEffect(() => {
        if (!API_URL) return;
        fetch(`${API_URL}/v1/contest`)
            .then((r) => r.json())
            .then(setContests)
            .catch(() => setContests({}));
    }, []);

    useEffect(() => {
        load();
    }, [userId, selectedCountry, selectedYear, sort]);

    async function load() {
        setLoading(true);
        try {
            if (!API_URL) {
                setData([]);
                setLoading(false);
                return;
            }
            const params = new URLSearchParams();
            params.append("user_id", userId);
            if (selectedCountry) params.append("country_id", selectedCountry);
            if (selectedYear) params.append("year", selectedYear);
            params.append("sort", sort);

            const res = await fetch(`${API_URL}/v1/scores?${params.toString()}`);
            const json = await res.json();
            setData(Array.isArray(json) ? json : []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    const avgScore =
        data.length > 0
            ? data.reduce((sum, i) => sum + (i.Score || 0), 0) / data.length
            : 0;

    const isLight = theme === "light";
    const isGray = theme === "dark-gray";

    const pageBg = isLight 
        ? "radial-gradient(circle at top left, rgba(55, 65, 81, 0.06), transparent 40%), radial-gradient(circle at bottom right, rgba(75, 85, 99, 0.06), transparent 40%), #f8fafc" 
        : isGray 
        ? "radial-gradient(circle at top left, rgba(255, 255, 255, 0.03), transparent 40%), radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.02), transparent 40%), #121212" 
        : "radial-gradient(circle at top left, rgba(79,124,255,0.15), transparent 40%), radial-gradient(circle at bottom right, rgba(167,139,250,0.15), transparent 40%), #020617";

    const textColor = isLight ? "#0f172a" : "#fff";
    const subTextColor = isLight ? "#64748b" : "#94a3b8";

    const titleShadow = isLight ? "0 10px 30px rgba(0,0,0,0.05)" : "0 10px 30px rgba(79,124,255,0.3)";
    const highlightColor = isLight ? "#1f2937" : isGray ? "#e5e7eb" : "#7aa2ff";

    const boxBg = isLight ? "#ffffff" : isGray ? "#1e1e1e" : "rgba(15, 23, 42, 0.4)";
    const boxBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2d2d2d" : "1px solid rgba(79, 124, 255, 0.2)";
    const boxShadow = isLight ? "0 10px 30px rgba(0,0,0,0.05)" : "0 15px 35px rgba(0,0,0,0.2)";

    const filtersBg = isLight ? "rgba(255, 255, 255, 0.8)" : isGray ? "rgba(30, 30, 30, 0.4)" : "rgba(15, 23, 42, 0.3)";
    const filtersBorder = isLight ? "1px solid #cbd5e1" : isGray ? "1px solid #333" : "1px solid rgba(255, 255, 255, 0.06)";

    const btnBg = isLight ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.03)";
    const btnBorder = isLight ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)";
    const btnColor = isLight ? "#475569" : "#94a3b8";

    const activePrimaryBg = isLight ? "#1f2937" : isGray ? "#4b5563" : "#4f7cff";
    const activePrimaryShadow = isLight ? "0 4px 12px rgba(31, 41, 55, 0.2)" : isGray ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(79, 124, 255, 0.3)";

    const cardBg = isLight ? "#ffffff" : isGray ? "#1c1c1c" : "rgba(30, 41, 59, 0.4)";
    const cardBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2d2d2d" : "1px solid rgba(255, 255, 255, 0.06)";

    const contestTagColor = isLight ? "#1f2937" : isGray ? "#9ca3af" : "#7aa2ff";
    const artistColor = isLight ? "#0f172a" : "#e2e8f0";

    const scoreBoxBg = isLight ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 209, 102, 0.1)";
    const scoreBoxBorder = isLight ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(255, 209, 102, 0.2)";
    const scoreValColor = isLight ? "#d97706" : "#ffd166";

    const commentBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(122, 162, 255, 0.08)";
    const commentBorder = isLight ? "4px solid #374151" : isGray ? "4px solid #6b7280" : "4px solid #4f7cff";
    const commentTextColor = isLight ? "#374151" : isGray ? "#e5e7eb" : "#7aa2ff";

    return (
        <div style={{ ...styles.page, background: pageBg, color: textColor }}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <h2 style={{ ...styles.title, textShadow: titleShadow }}>
                        Оценки пользователя <span style={{ ...styles.usernameHighlight, color: highlightColor }}>{data?.[0]?.Username || userId}</span>
                    </h2>
                </header>

                {/* AVG SCORE BOX */}
                <div style={{ ...styles.avgBox, background: boxBg, border: boxBorder, boxShadow: boxShadow }}>
                    <div style={{ ...styles.avgLabelBig, color: subTextColor }}>Средняя оценка</div>
                    <div style={{ ...styles.avgValue, color: scoreValColor }}>{formatAvg(avgScore)} ⭐</div>
                </div>

                {/* FILTERS */}
                <div style={{ ...styles.filters, background: filtersBg, border: filtersBorder }}>
                    <div style={styles.block}>
                        <div style={{ ...styles.label, color: subTextColor }}>Страна</div>
                        <div style={styles.row}>
                            <button
                                onClick={() => setSelectedCountry("")}
                                style={{
                                    ...styles.btn,
                                    background: selectedCountry === "" ? activePrimaryBg : btnBg,
                                    color: selectedCountry === "" ? "#fff" : btnColor,
                                    border: selectedCountry === "" ? "none" : btnBorder,
                                    boxShadow: selectedCountry === "" ? activePrimaryShadow : "none",
                                }}
                            >
                                Все страны
                            </button>
                            {countries.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCountry(c.id)}
                                    style={{
                                        ...styles.btn,
                                        background: selectedCountry === c.id ? activePrimaryBg : btnBg,
                                        color: selectedCountry === c.id ? "#fff" : btnColor,
                                        border: selectedCountry === c.id ? "none" : btnBorder,
                                        boxShadow: selectedCountry === c.id ? activePrimaryShadow : "none",
                                    }}
                                >
                                    {supportsEmoji && <span style={{marginRight: 6}}>{c.flag_emoji}</span>}
                                    {c.name_ru}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={styles.block}>
                        <div style={{ ...styles.label, color: subTextColor }}>Год</div>
                        <div style={styles.row}>
                            <button
                                onClick={() => setSelectedYear("")}
                                style={{
                                    ...styles.btn,
                                    background: selectedYear === "" ? "#22c55e" : btnBg,
                                    color: selectedYear === "" ? "#fff" : btnColor,
                                    border: selectedYear === "" ? "none" : btnBorder,
                                    boxShadow: selectedYear === "" ? "0 4px 12px rgba(34, 197, 94, 0.3)" : "none",
                                }}
                            >
                                Все годы
                            </button>
                            {Object.keys(contests)
                                .sort((a, b) => Number(b) - Number(a))
                                .map((year) => (
                                    <button
                                        key={year}
                                        onClick={() => setSelectedYear(year)}
                                        style={{
                                            ...styles.btn,
                                            background: selectedYear === year ? "#22c55e" : btnBg,
                                            color: selectedYear === year ? "#fff" : btnColor,
                                            border: selectedYear === year ? "none" : btnBorder,
                                            boxShadow: selectedYear === year ? "0 4px 12px rgba(34, 197, 94, 0.3)" : "none",
                                        }}
                                    >
                                        {year}
                                    </button>
                                ))}
                        </div>
                    </div>

                    <div style={styles.block}>
                        <div style={{ ...styles.label, color: subTextColor }}>Сортировка</div>
                        <div style={styles.row}>
                            <button
                                onClick={() => setSort("time")}
                                style={{
                                    ...styles.btn,
                                    background: sort === "time" ? "#f97316" : btnBg,
                                    color: sort === "time" ? "#fff" : btnColor,
                                    border: sort === "time" ? "none" : btnBorder,
                                    boxShadow: sort === "time" ? "0 4px 12px rgba(249, 115, 22, 0.3)" : "none",
                                }}
                            >
                                Сначала новые
                            </button>
                            <button
                                onClick={() => setSort("score")}
                                style={{
                                    ...styles.btn,
                                    background: sort === "score" ? "#f97316" : btnBg,
                                    color: sort === "score" ? "#fff" : btnColor,
                                    border: sort === "score" ? "none" : btnBorder,
                                    boxShadow: sort === "score" ? "0 4px 12px rgba(249, 115, 22, 0.3)" : "none",
                                }}
                            >
                                По баллу
                            </button>
                        </div>
                    </div>
                </div>

                {loading && <div style={{ ...styles.loading, color: highlightColor }}>Обновление данных...</div>}

                {/* LIST */}
                <div style={styles.list}>
                    {data.map((item, i) => {
                        const youtubeId = item.YoutubeLink ? getYouTubeId(item.YoutubeLink) : null;
                        const country = countries.find((c) => c.name_ru === item.CountryName);

                        return (
                            <div key={i} style={{ ...styles.card, background: cardBg, border: cardBorder }}>
                                <div style={styles.cardMain}>
                                    <div style={styles.meta}>
                                        <div style={{ ...styles.contestTag, color: contestTagColor }}>
                                            {item.ContestYear} • {formatContestType(item.ContestType)}
                                        </div>
                                        <div style={styles.countryRow}>
                                            {supportsEmoji && country?.flag_emoji && (
                                                <span style={styles.flagLarge}>{country.flag_emoji}</span>
                                            )}
                                            <div style={{ ...styles.countryName, color: textColor }}>{item.CountryName}</div>
                                        </div>
                                        <div style={{ ...styles.artistInfo, color: subTextColor }}>
                                            <span style={{ ...styles.artist, color: artistColor }}>{item.Artist}</span>
                                            <span style={styles.song}> — {item.Song}</span>
                                        </div>
                                    </div>

                                    <div style={{ ...styles.scoreContainer, background: scoreBoxBg, border: scoreBoxBorder }}>
                                        <div style={{ ...styles.scoreBig, color: scoreValColor }}>{item.Score}</div>
                                        <div style={styles.starSmall}>⭐</div>
                                    </div>
                                </div>

                                {item.Comment && (
                                    <div style={{ ...styles.comment, background: commentBg, borderLeft: commentBorder, color: commentTextColor }}>
                                        “{item.Comment}”
                                    </div>
                                )}

                                {youtubeId && (
                                    <div style={styles.mediaContainer}>
                                        <a href={item.YoutubeLink} target="_blank" rel="noreferrer" style={styles.thumbnailWrapper}>
                                            <img
                                                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                                style={styles.thumbnailImg}
                                            />
                                            <div style={styles.playOverlay}>▶ YouTube</div>
                                        </a>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        padding: "40px 20px",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
    },

    container: {
        maxWidth: 1200,
        margin: "0 auto",
    },

    header: {
        textAlign: "center",
        marginBottom: 32,
    },

    title: {
        fontSize: "2.2rem",
        fontWeight: 900,
        letterSpacing: "-0.04em",
        margin: 0,
    },

    usernameHighlight: {
        fontWeight: 900,
    },

    avgBox: {
        textAlign: "center",
        margin: "0 auto 48px",
        padding: "24px",
        maxWidth: 360,
        borderRadius: "28px",
        backdropFilter: "blur(12px)",
    },

    avgLabelBig: {
        fontSize: 13,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: 8,
    },

    avgValue: {
        fontSize: 48,
        fontWeight: 950,
    },

    filters: {
        display: "flex",
        flexDirection: "column",
        gap: 24,
        marginBottom: 40,
        padding: "24px",
        borderRadius: "24px",
        backdropFilter: "blur(8px)",
    },

    block: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },

    label: {
        fontWeight: 800,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        paddingLeft: 4,
    },

    row: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
    },

    btn: {
        padding: "8px 14px",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        transition: "all 0.2s ease",
    },

    loading: {
        textAlign: "center",
        fontSize: 14,
        fontWeight: 600,
        marginBottom: 20,
    },

    list: {
        display: "grid",
        gap: 20,
        gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    },

    card: {
        padding: "24px",
        borderRadius: "24px",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        transition: "transform 0.2s ease",
    },

    cardMain: {
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "flex-start",
    },

    meta: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        flex: 1,
    },

    contestTag: {
        fontSize: 13,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    },

    countryRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
    },

    flagLarge: {
        fontSize: 28,
    },

    countryName: {
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: "-0.02em",
    },

    artistInfo: {
        fontSize: 15,
        fontWeight: 600,
        lineHeight: "1.4",
    },

    scoreContainer: {
        textAlign: "center",
        padding: "10px 16px",
        borderRadius: "18px",
    },

    scoreBig: {
        fontSize: 44,
        fontWeight: 1000,
        lineHeight: 1,
    },

    starSmall: {
        fontSize: 12,
        marginTop: 4,
    },

    comment: {
        fontStyle: "italic",
        fontSize: 14,
        padding: "12px 16px",
        borderRadius: "14px",
        lineHeight: "1.5",
    },

    mediaContainer: {
        display: "flex",
        gap: 12,
        width: "100%",
    },

    thumbnailWrapper: {
        width: "100%",
        maxWidth: "320px",
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        aspectRatio: "16/9",
    },

    thumbnailImg: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        background: "#000",
    },

    playOverlay: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.4)",
        color: "#fff",
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
    },
};
