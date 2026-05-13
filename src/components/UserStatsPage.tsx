import { useEffect, useState } from "react";
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
    userId: string;
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

export function UserStatsPage({ userId }: Props) {
    const API_URL = import.meta.env.VITE_API_URL;

    const [data, setData] = useState<ScoreFiltered[]>([]);
    const [loading, setLoading] = useState(false);

    const [countries, setCountries] = useState<Country[]>([]);
    const [selectedCountry, setSelectedCountry] = useState("");

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
    }, [userId, selectedCountry, selectedYear, sort]);

    async function load() {
        setLoading(true);
        try {
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

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <h2 style={styles.title}>
                        Оценки пользователя <span style={styles.usernameHighlight}>{data?.[0]?.Username}</span>
                    </h2>
                </header>

                {/* AVG SCORE BOX */}
                <div style={styles.avgBox}>
                    <div style={styles.avgLabelBig}>Средняя оценка</div>
                    <div style={styles.avgValue}>{formatAvg(avgScore)} ⭐</div>
                </div>

                {/* FILTERS */}
                <div style={styles.filters}>
                    <div style={styles.block}>
                        <div style={styles.label}>Страна</div>
                        <div style={styles.row}>
                            <button
                                onClick={() => setSelectedCountry("")}
                                style={{
                                    ...styles.btn,
                                    ...(selectedCountry === "" ? styles.btnActivePrimary : {})
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
                                        ...(selectedCountry === c.id ? styles.btnActivePrimary : {})
                                    }}
                                >
                                    {supportsEmoji && <span style={{marginRight: 6}}>{c.flag_emoji}</span>}
                                    {c.name_ru}
                                </button>
                            ))}
                        </div>
                    </div>

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

                    <div style={styles.block}>
                        <div style={styles.label}>Сортировка</div>
                        <div style={styles.row}>
                            <button
                                onClick={() => setSort("time")}
                                style={{
                                    ...styles.btn,
                                    ...(sort === "time" ? styles.btnActiveOrange : {})
                                }}
                            >
                                Сначала новые
                            </button>
                            <button
                                onClick={() => setSort("score")}
                                style={{
                                    ...styles.btn,
                                    ...(sort === "score" ? styles.btnActiveOrange : {})
                                }}
                            >
                                По баллу
                            </button>
                        </div>
                    </div>
                </div>

                {loading && <div style={styles.loading}>Обновление данных...</div>}

                {/* LIST */}
                <div style={styles.list}>
                    {data.map((item, i) => {
                        const youtubeId = item.YoutubeLink ? getYouTubeId(item.YoutubeLink) : null;
                        const country = countries.find((c) => c.name_ru === item.CountryName);

                        return (
                            <div key={i} style={styles.card}>
                                <div style={styles.cardMain}>
                                    <div style={styles.meta}>
                                        <div style={styles.contestTag}>
                                            {item.ContestYear} • {formatContestType(item.ContestType)}
                                        </div>
                                        <div style={styles.countryRow}>
                                            {supportsEmoji && country?.flag_emoji && (
                                                <span style={styles.flagLarge}>{country.flag_emoji}</span>
                                            )}
                                            <div style={styles.countryName}>{item.CountryName}</div>
                                        </div>
                                        <div style={styles.artistInfo}>
                                            <span style={styles.artist}>{item.Artist}</span>
                                            <span style={styles.song}> — {item.Song}</span>
                                        </div>
                                    </div>

                                    <div style={styles.scoreContainer}>
                                        <div style={styles.scoreBig}>{item.Score}</div>
                                        <div style={styles.starSmall}>⭐</div>
                                    </div>
                                </div>

                                {item.Comment && (
                                    <div style={styles.comment}>
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
        background: `
            radial-gradient(circle at top left, rgba(79,124,255,0.15), transparent 40%),
            radial-gradient(circle at bottom right, rgba(167,139,250,0.15), transparent 40%),
            #020617
        `,
        minHeight: "100vh",
        color: "#fff",
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
        textShadow: "0 10px 30px rgba(79,124,255,0.3)",
    },

    usernameHighlight: {
        color: "#7aa2ff",
    },

    avgBox: {
        textAlign: "center",
        margin: "0 auto 48px",
        padding: "24px",
        maxWidth: 360,
        background: "rgba(15, 23, 42, 0.4)",
        borderRadius: "28px",
        border: "1px solid rgba(79, 124, 255, 0.2)",
        boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
        backdropFilter: "blur(12px)",
    },

    avgLabelBig: {
        fontSize: 13,
        fontWeight: 800,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: 8,
    },

    avgValue: {
        fontSize: 48,
        fontWeight: 950,
        color: "#ffd166",
        textShadow: "0 0 20px rgba(255, 209, 102, 0.4)",
    },

    filters: {
        display: "flex",
        flexDirection: "column",
        gap: 24,
        marginBottom: 40,
        background: "rgba(15, 23, 42, 0.3)",
        padding: "24px",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.06)",
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
        color: "#64748b",
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
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(255, 255, 255, 0.03)",
        color: "#94a3b8",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        transition: "all 0.2s ease",
    },

    btnActivePrimary: {
        background: "#4f7cff",
        color: "#fff",
        borderColor: "#4f7cff",
        boxShadow: "0 4px 12px rgba(79, 124, 255, 0.3)",
    },

    btnActiveGreen: {
        background: "#22c55e",
        color: "#fff",
        borderColor: "#22c55e",
        boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
    },

    btnActiveOrange: {
        background: "#f97316",
        color: "#fff",
        borderColor: "#f97316",
        boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)",
    },

    loading: {
        color: "#4f7cff",
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
        background: "rgba(30, 41, 59, 0.4)",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.06)",
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
        color: "#7aa2ff",
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
        color: "#fff",
        letterSpacing: "-0.02em",
    },

    artistInfo: {
        fontSize: 15,
        color: "#94a3b8",
        fontWeight: 600,
        lineHeight: "1.4",
    },

    artist: {
        color: "#e2e8f0",
    },

    song: {
        color: "#64748b",
    },

    scoreContainer: {
        textAlign: "center",
        background: "rgba(255, 209, 102, 0.1)",
        padding: "10px 16px",
        borderRadius: "18px",
        border: "1px solid rgba(255, 209, 102, 0.2)",
    },

    scoreBig: {
        fontSize: 44,
        fontWeight: 1000,
        color: "#ffd166",
        lineHeight: 1,
    },

    starSmall: {
        fontSize: 12,
        marginTop: 4,
    },

    comment: {
        fontStyle: "italic",
        color: "#7aa2ff",
        fontSize: 14,
        padding: "12px 16px",
        background: "rgba(122, 162, 255, 0.08)",
        borderRadius: "14px",
        borderLeft: "4px solid #4f7cff",
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

    gifWrapper: {
        width: 140,
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)",
    },

    gifImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
};
