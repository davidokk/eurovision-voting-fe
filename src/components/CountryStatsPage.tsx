import { useEffect, useState, useMemo } from "react";
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
    countryId: string;
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

export function CountryStatsPage({ countryId, theme = "dark-blue" }: Props) {
    const API_URL = (import.meta as any).env?.VITE_API_URL || "";

    const [data, setData] = useState<ScoreFiltered[]>([]);
    const [loading, setLoading] = useState(false);

    const [countries, setCountries] = useState<Country[]>([]);
    const [contests, setContests] = useState<ContestMap>({});
    const [selectedYear, setSelectedYear] = useState<string>("");

    const supportsEmoji = getDoesBrowserSupportFlagEmojis();
    const [sort] = useState<SortType>("score");

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
    }, [countryId, selectedYear, sort]);

    async function load() {
        setLoading(true);
        try {
            if (!API_URL) {
                setData([]);
                setLoading(false);
                return;
            }
            const params = new URLSearchParams();
            params.append("country_id", countryId);
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

    const country = countries.find(c => c.id === countryId);

    const performances = useMemo(() => {
        const groups: Record<string, {
            info: ScoreFiltered;
            scores: { Username: string; Score: number; Comment: string | null }[];
            avg: number;
        }> = {};

        data.forEach(item => {
            const key = `${item.ContestYear}-${item.ContestType}-${item.Artist}-${item.Song}`;
            if (!groups[key]) {
                groups[key] = {
                    info: item,
                    scores: [],
                    avg: 0
                };
            }
            groups[key].scores.push({
                Username: item.Username,
                Score: item.Score,
                Comment: item.Comment
            });
        });

        return Object.values(groups).map(g => ({
            ...g,
            avg: g.scores.reduce((s, sc) => s + sc.Score, 0) / g.scores.length
        })).sort((a, b) => b.avg - a.avg);
    }, [data]);

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

    const cardBg = isLight ? "#ffffff" : isGray ? "#1c1c1c" : "rgba(30, 41, 59, 0.4)";
    const cardBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2d2d2d" : "1px solid rgba(255, 255, 255, 0.06)";

    const contestTagColor = isLight ? "#1f2937" : isGray ? "#9ca3af" : "#7aa2ff";
    const artistColor = isLight ? "#0f172a" : "#e2e8f0";

    const scoreBoxBg = isLight ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 209, 102, 0.1)";
    const scoreBoxBorder = isLight ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(255, 209, 102, 0.2)";
    const scoreValColor = isLight ? "#d97706" : "#ffd166";

    const userScoresBg = isLight ? "#f8fafc" : isGray ? "#242424" : "rgba(15, 23, 42, 0.3)";
    const userScoresBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2f2f2f" : "1px solid rgba(255, 255, 255, 0.04)";
    const userScoreItemBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2f2f2f" : "1px solid rgba(255, 255, 255, 0.05)";

    return (
        <div style={{ ...styles.page, background: pageBg, color: textColor }}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <h2 style={{ ...styles.title, textShadow: titleShadow }}>
                        История {supportsEmoji && country?.flag_emoji} <span style={{ ...styles.usernameHighlight, color: highlightColor }}>{country?.name_ru || countryId}</span>
                    </h2>
                </header>

                <div style={{ ...styles.avgBox, background: boxBg, border: boxBorder, boxShadow: boxShadow }}>
                    <div style={{ ...styles.avgLabelBig, color: subTextColor }}>Средний балл за всё время</div>
                    <div style={{ ...styles.avgValue, color: scoreValColor }}>{formatAvg(avgScore)} ⭐</div>
                </div>

                <div style={{ ...styles.filters, background: filtersBg, border: filtersBorder }}>
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
                </div>

                {loading && <div style={{ ...styles.loading, color: highlightColor }}>Обновление данных...</div>}

                <div style={styles.list}>
                    {performances.map((perf, i) => {
                        const item = perf.info;
                        const youtubeId = item.YoutubeLink ? getYouTubeId(item.YoutubeLink) : null;

                        return (
                            <div key={i} style={{ ...styles.card, background: cardBg, border: cardBorder }}>
                                <div style={styles.cardMain}>
                                    <div style={styles.meta}>
                                        <div style={{ ...styles.contestTag, color: contestTagColor }}>
                                            {item.ContestYear} • {formatContestType(item.ContestType)}
                                        </div>
                                        <div style={{ ...styles.artistInfo, color: subTextColor }}>
                                            <div style={{ ...styles.artist, color: artistColor }}>{item.Artist}</div>
                                            <div style={styles.song}>{item.Song}</div>
                                        </div>
                                    </div>

                                    <div style={{ ...styles.scoreContainer, background: scoreBoxBg, border: scoreBoxBorder }}>
                                        <div style={styles.avgLabelSmall}>СРЕДНИЙ</div>
                                        <div style={{ ...styles.scoreBig, color: scoreValColor }}>{formatAvg(perf.avg)}</div>
                                        <div style={styles.starSmall}>⭐</div>
                                    </div>
                                </div>

                                {youtubeId && (
                                    <div style={styles.mediaContainer}>
                                        <a href={item.YoutubeLink} target="_blank" rel="noreferrer" style={styles.thumbnailWrapper}>
                                            <img
                                                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                                style={styles.thumbnailImg}
                                            />
                                            <div style={styles.playOverlay}>▶ Смотреть</div>
                                        </a>
                                    </div>
                                )}

                                <div style={{ ...styles.userScoresList, background: userScoresBg, border: userScoresBorder }}>
                                    <div style={styles.scoresHeader}>Оценки зрителей:</div>
                                    {perf.scores.map((s, idx) => (
                                        <div key={idx} style={{ ...styles.userScoreItem, borderBottom: userScoreItemBorder }}>
                                            <div style={styles.userScoreRow}>
                                                <span style={{ ...styles.userScoreName, color: artistColor }}>{s.Username}</span>
                                                <span style={{ ...styles.userScoreValue, color: scoreValColor }}>⭐ {s.Score}</span>
                                            </div>
                                            {s.Comment && (
                                                <div style={{ ...styles.userScoreComment, color: subTextColor }}>
                                                    “{s.Comment}”
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
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
    container: { maxWidth: 1200, margin: "0 auto" },
    header: { textAlign: "center", marginBottom: 32 },
    title: { fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.04em", margin: 0 },
    usernameHighlight: { fontWeight: 900 },
    avgBox: { textAlign: "center", margin: "0 auto 48px", padding: "24px", maxWidth: 360, borderRadius: "28px", backdropFilter: "blur(12px)" },
    avgLabelBig: { fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 },
    avgValue: { fontSize: 48, fontWeight: 950 },
    filters: { display: "flex", flexDirection: "column", gap: 24, marginBottom: 40, padding: "24px", borderRadius: "24px", backdropFilter: "blur(8px)" },
    block: { display: "flex", flexDirection: "column", gap: 12 },
    label: { fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 4 },
    row: { display: "flex", gap: 8, flexWrap: "wrap" },
    btn: { padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s ease" },
    loading: { textAlign: "center", fontSize: 14, fontWeight: 600, marginBottom: 20 },
    list: { display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" },
    card: { padding: "24px", borderRadius: "24px", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", gap: 16 },
    cardMain: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" },
    meta: { display: "flex", flexDirection: "column", gap: 6, flex: 1 },
    contestTag: { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" },
    artistInfo: { fontSize: 15, fontWeight: 600, lineHeight: "1.4" },
    artist: { fontWeight: 700 },
    song: { fontStyle: "italic" },
    scoreContainer: { textAlign: "center", padding: "10px 16px", borderRadius: "18px" },
    scoreBig: { fontSize: 44, fontWeight: 1000, lineHeight: 1 },
    starSmall: { fontSize: 12, marginTop: 4 },
    mediaContainer: { display: "flex", gap: 12, width: "100%" },
    thumbnailWrapper: { width: "100%", maxWidth: "320px", position: "relative", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.1)", aspectRatio: "16/9" },
    thumbnailImg: { width: "100%", height: "100%", objectFit: "contain", background: "#000" },
    playOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0, 0, 0, 0.4)", color: "#fff", fontSize: 10, fontWeight: 800, textTransform: "uppercase" },
    avgLabelSmall: { fontSize: 9, fontWeight: 800, color: "#64748b", marginBottom: 2 },
    userScoresList: { display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 16 },
    scoresHeader: { fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
    userScoreItem: { paddingBottom: 10 },
    userScoreRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    userScoreName: { fontSize: 14, fontWeight: 700 },
    userScoreValue: { fontSize: 14, fontWeight: 800 },
    userScoreComment: { fontSize: 13, fontStyle: "italic", lineHeight: "1.4" },
};
