import { useEffect, useState, useMemo } from "react";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";

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

export function CountryStatsPage({ countryId }: Props) {
    const API_URL = import.meta.env.VITE_API_URL;

    const [data, setData] = useState<ScoreFiltered[]>([]);
    const [loading, setLoading] = useState(false);

    const [countries, setCountries] = useState<Country[]>([]);
    const [contests, setContests] = useState<ContestMap>({});
    const [selectedYear, setSelectedYear] = useState<string>("");

    const supportsEmoji = getDoesBrowserSupportFlagEmojis();
    const [sort, setSort] = useState<SortType>("score");

    useEffect(() => {
        fetch(`${API_URL}/v1/countries`)
            .then((r) => r.json())
            .then(setCountries)
            .catch(() => setCountries([]));
    }, []);

    useEffect(() => {
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

    // Grouping data by performance (unique combination of year, type, artist, song)
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

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <h2 style={styles.title}>
                        История {supportsEmoji && country?.flag_emoji} <span style={styles.usernameHighlight}>{country?.name_ru || "страны"}</span>
                    </h2>
                </header>

                <div style={styles.avgBox}>
                    <div style={styles.avgLabelBig}>Средний балл за всё время</div>
                    <div style={styles.avgValue}>{formatAvg(avgScore)} ⭐</div>
                </div>

                <div style={styles.filters}>
                    <div style={styles.block}>
                        <div style={styles.label}>Год</div>
                        <div style={styles.row}>
                            <button
                                onClick={() => setSelectedYear("")}
                                style={{
                                    ...styles.btn,
                                    ...(selectedYear === "" ? styles.btnActiveGreen : {})
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
                                            ...(selectedYear === year ? styles.btnActiveGreen : {})
                                        }}
                                    >
                                        {year}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>

                {loading && <div style={styles.loading}>Обновление данных...</div>}

                <div style={styles.list}>
                    {performances.map((perf, i) => {
                        const item = perf.info;
                        const youtubeId = item.YoutubeLink ? getYouTubeId(item.YoutubeLink) : null;

                        return (
                            <div key={i} style={styles.card}>
                                <div style={styles.cardMain}>
                                    <div style={styles.meta}>
                                        <div style={styles.contestTag}>
                                            {item.ContestYear} • {formatContestType(item.ContestType)}
                                        </div>
                                        <div style={styles.artistInfo}>
                                            <div style={styles.artist}>{item.Artist}</div>
                                            <div style={styles.song}>{item.Song}</div>
                                        </div>
                                    </div>

                                    <div style={styles.scoreContainer}>
                                        <div style={styles.avgLabelSmall}>СРЕДНИЙ</div>
                                        <div style={styles.scoreBig}>{formatAvg(perf.avg)}</div>
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

                                <div style={styles.userScoresList}>
                                    <div style={styles.scoresHeader}>Оценки зрителей:</div>
                                    {perf.scores.map((s, idx) => (
                                        <div key={idx} style={styles.userScoreItem}>
                                            <div style={styles.userScoreRow}>
                                                <span style={styles.userScoreName}>{s.Username}</span>
                                                <span style={styles.userScoreValue}>⭐ {s.Score}</span>
                                            </div>
                                            {s.Comment && (
                                                <div style={styles.userScoreComment}>
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
        background: `
            radial-gradient(circle at top left, rgba(79,124,255,0.15), transparent 40%),
            radial-gradient(circle at bottom right, rgba(167,139,250,0.15), transparent 40%),
            #020617
        `,
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
    },
    container: { maxWidth: 1200, margin: "0 auto" },
    header: { textAlign: "center", marginBottom: 32 },
    title: { fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.04em", margin: 0, textShadow: "0 10px 30px rgba(79,124,255,0.3)" },
    usernameHighlight: { color: "#7aa2ff" },
    avgBox: { textAlign: "center", margin: "0 auto 48px", padding: "24px", maxWidth: 360, background: "rgba(15, 23, 42, 0.4)", borderRadius: "28px", border: "1px solid rgba(79, 124, 255, 0.2)", boxShadow: "0 15px 35px rgba(0,0,0,0.2)", backdropFilter: "blur(12px)" },
    avgLabelBig: { fontSize: 13, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 },
    avgValue: { fontSize: 48, fontWeight: 950, color: "#ffd166", textShadow: "0 0 20px rgba(255, 209, 102, 0.4)" },
    filters: { display: "flex", flexDirection: "column", gap: 24, marginBottom: 40, background: "rgba(15, 23, 42, 0.3)", padding: "24px", borderRadius: "24px", border: "1px solid rgba(255, 255, 255, 0.06)", backdropFilter: "blur(8px)" },
    block: { display: "flex", flexDirection: "column", gap: 12 },
    label: { fontWeight: 800, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 4 },
    row: { display: "flex", gap: 8, flexWrap: "wrap" },
    btn: { padding: "8px 14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(255, 255, 255, 0.03)", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s ease" },
    btnActiveGreen: { background: "#22c55e", color: "#fff", borderColor: "#22c55e", boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)" },
    btnActiveOrange: { background: "#f97316", color: "#fff", borderColor: "#f97316", boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)" },
    loading: { color: "#4f7cff", textAlign: "center", fontSize: 14, fontWeight: 600, marginBottom: 20 },
    list: { display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" },
    card: { padding: "24px", background: "rgba(30, 41, 59, 0.4)", borderRadius: "24px", border: "1px solid rgba(255, 255, 255, 0.06)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", gap: 16 },
    cardMain: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" },
    meta: { display: "flex", flexDirection: "column", gap: 6, flex: 1 },
    contestTag: { fontSize: 11, color: "#7aa2ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" },
    userRow: { display: "flex", alignItems: "center", gap: 10 },
    username: { fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" },
    artistInfo: { fontSize: 15, color: "#94a3b8", fontWeight: 600, lineHeight: "1.4" },
    artist: { color: "#e2e8f0" },
    song: { color: "#64748b" },
    scoreContainer: { textAlign: "center", background: "rgba(255, 209, 102, 0.1)", padding: "10px 16px", borderRadius: "18px", border: "1px solid rgba(255, 209, 102, 0.2)" },
    scoreBig: { fontSize: 44, fontWeight: 1000, color: "#ffd166", lineHeight: 1 },
    starSmall: { fontSize: 12, marginTop: 4 },
    comment: { fontStyle: "italic", color: "#7aa2ff", fontSize: 14, padding: "12px 16px", background: "rgba(122, 162, 255, 0.08)", borderRadius: "14px", borderLeft: "4px solid #4f7cff", lineHeight: "1.5" },
    mediaContainer: { display: "flex", gap: 12, width: "100%" },
    thumbnailWrapper: { width: "100%", maxWidth: "320px", position: "relative", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.1)", aspectRatio: "16/9" },
    thumbnailImg: { width: "100%", height: "100%", objectFit: "contain", background: "#000" },
    playOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0, 0, 0, 0.4)", color: "#fff", fontSize: 10, fontWeight: 800, textTransform: "uppercase" },
    avgLabelSmall: { fontSize: 9, fontWeight: 800, color: "#64748b", marginBottom: 2 },
    userScoresList: { display: "flex", flexDirection: "column", gap: 12, background: "rgba(15, 23, 42, 0.3)", padding: 16, borderRadius: 16, border: "1px solid rgba(255, 255, 255, 0.04)" },
    scoresHeader: { fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
    userScoreItem: { borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: 10 },
    userScoreRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    userScoreName: { fontSize: 14, fontWeight: 700, color: "#e2e8f0" },
    userScoreValue: { fontSize: 14, fontWeight: 800, color: "#ffd166" },
    userScoreComment: { fontSize: 13, color: "#94a3b8", fontStyle: "italic", lineHeight: "1.4" },
};
