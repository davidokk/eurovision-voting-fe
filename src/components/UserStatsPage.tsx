import { useEffect, useState } from "react";

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

    // ✔️ DEFAULT SORT = SCORE
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

            if (selectedCountry) {
                params.append("country_id", selectedCountry);
            }

            if (selectedYear) {
                params.append("year", selectedYear);
            }

            params.append("sort", sort);

            const res = await fetch(
                `${API_URL}/v1/scores?${params.toString()}`
            );

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
            ? data.reduce((sum, i) => sum + (i.Score || 0), 0) /
              data.length
            : 0;

    return (
        <div style={styles.page}>
            <h2 style={styles.title}>
                Оценки пользователя {data?.[0]?.Username || ""}
            </h2>

            {/* FILTERS */}
            <div style={styles.filters}>
                {/* COUNTRY */}
                <div style={styles.block}>
                    <div style={styles.label}>Страна</div>

                    <div style={styles.row}>
                        {countries.map((c) => {
                            const active =
                                selectedCountry === c.id;

                            return (
                                <button
                                    key={c.id}
                                    onClick={() =>
                                        setSelectedCountry(
                                            active ? "" : c.id
                                        )
                                    }
                                    style={{
                                        ...styles.btn,
                                        background: active
                                            ? "#4f7cff"
                                            : "#111a2e",
                                    }}
                                >
                                    {c.flag_emoji} {c.name_ru}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* YEAR */}
                <div style={styles.block}>
                    <div style={styles.label}>Год</div>

                    <div style={styles.row}>
                        {Object.keys(contests)
                            .sort((a, b) => Number(b) - Number(a))
                            .map((year) => {
                                const active =
                                    selectedYear === year;

                                return (
                                    <button
                                        key={year}
                                        onClick={() =>
                                            setSelectedYear(
                                                active ? "" : year
                                            )
                                        }
                                        style={{
                                            ...styles.btn,
                                            background: active
                                                ? "#22c55e"
                                                : "#111a2e",
                                        }}
                                    >
                                        {year}
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* SORT */}
                <div style={styles.block}>
                    <div style={styles.label}>
                        Сортировать по
                    </div>

                    <div style={styles.row}>
                        <button
                            onClick={() => setSort("time")}
                            style={{
                                ...styles.btn,
                                background:
                                    sort === "time"
                                        ? "#f97316"
                                        : "#111a2e",
                            }}
                        >
                            Новые
                        </button>

                        <button
                            onClick={() => setSort("score")}
                            style={{
                                ...styles.btn,
                                background:
                                    sort === "score"
                                        ? "#f97316"
                                        : "#111a2e",
                            }}
                        >
                            Оценка
                        </button>
                    </div>
                </div>
            </div>

            {/* ⭐️ AVG SCORE (BIGGER) */}
            <div style={styles.avgBox}>
                <div style={styles.avgLabelBig}>
                    Средняя оценка
                </div>

                <div style={styles.avgValue}>
                    {formatAvg(avgScore)} ⭐
                </div>
            </div>

            {loading && (
                <div style={styles.loading}>Загрузка...</div>
            )}

            {/* LIST */}
            <div style={styles.list}>
                {data.map((item, i) => {
                    const youtubeId = item.YoutubeLink
                        ? getYouTubeId(item.YoutubeLink)
                        : null;

                    return (
                        <div key={i} style={styles.card}>
                            <div style={styles.topRow}>
                                <div style={styles.meta}>
                                    <div style={styles.country}>
                                        {item.CountryName}
                                    </div>

                                    <div style={styles.contest}>
                                        {item.ContestYear} •{" "}
                                        {formatContestType(
                                            item.ContestType
                                        )}
                                    </div>

                                    <div style={styles.songSmall}>
                                        {item.Artist} —{" "}
                                        {item.Song}
                                    </div>
                                </div>

                                <div style={styles.mediaBlock}>
                                    {youtubeId && (
                                        <div
                                            style={
                                                styles.thumbnailWrapper
                                            }
                                        >
                                            <a
                                                href={
                                                    item.YoutubeLink
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                style={
                                                    styles.thumbnail
                                                }
                                            >
                                                <img
                                                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                                                    style={
                                                        styles.thumbnailImg
                                                    }
                                                />
                                            </a>

                                            <a
                                                href={
                                                    item.YoutubeLink
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                style={
                                                    styles.youtubeOverlay
                                                }
                                            >
                                                ▶ YouTube
                                            </a>
                                        </div>
                                    )}

                                    <div
                                        style={styles.scoreBig}
                                    >
                                        {item.Score}
                                    </div>
                                </div>
                            </div>

                            {item.Comment && (
                                <div style={styles.comment}>
                                    “{item.Comment}”
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        padding: 20,
        background: "#0b1220",
        minHeight: "100vh",
        color: "#e6edf7",
    },

    title: {
        fontSize: 22,
        fontWeight: 800,
        marginBottom: 16,
    },

    filters: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 10,
    },

    block: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },

    label: {
        fontWeight: 800,
        fontSize: 13,
        color: "#94a3b8",
    },

    row: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
    },

    btn: {
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #24324f",
        color: "#fff",
        cursor: "pointer",
        fontSize: 12,
    },

    avgBox: {
        textAlign: "center",
        margin: "10px 0 20px",
    },

    avgLabelBig: {
        fontSize: 18,
        fontWeight: 800,
        color: "#94a3b8",
        marginBottom: 4,
    },

    avgValue: {
        fontSize: 40,
        fontWeight: 900,
        color: "#ffd166",
    },

    loading: {
        color: "#94a3b8",
        marginBottom: 10,
    },

    list: {
        display: "grid",
        gap: 14,
    },

    card: {
        padding: 16,
        background: "#111a2e",
        borderRadius: 14,
        border: "1px solid #1f2a44",
    },

    topRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "flex-start",
    },

    meta: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },

    country: {
        fontSize: 22,
        fontWeight: 800,
    },

    contest: {
        fontSize: 14,
        color: "#94a3b8",
    },

    songSmall: {
        fontSize: 13,
        color: "#7f8fb3",
    },

    mediaBlock: {
        display: "flex",
        alignItems: "center",
        gap: 14,
    },

    scoreBig: {
        fontSize: 54,
        fontWeight: 900,
        color: "#ffd166",
        lineHeight: 1,
        minWidth: 70,
        textAlign: "center",
    },

    thumbnailWrapper: {
        position: "relative",
    },

    thumbnail: {
        display: "block",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #24324f",
    },

    thumbnailImg: {
        width: 240,
        height: 135,
        objectFit: "cover",
        borderRadius: 10,
        display: "block",
    },

    youtubeOverlay: {
        position: "absolute",
        right: 6,
        bottom: 6,
        padding: "4px 8px",
        background: "rgba(255,0,51,0.9)",
        color: "white",
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 700,
        textDecoration: "none",
    },

    comment: {
        marginTop: 10,
        fontStyle: "italic",
        color: "#9fb0d0",
    },
};