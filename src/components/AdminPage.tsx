import { useEffect, useState } from "react";

import { Topbar } from "./Topbar";
import { getContests, getContest } from "../api/contest";

import type {
    ContestView,
    ContestsByYear,
} from "../types/contest";

type Props = {
    initialContest: ContestView | null;
};

type EditablePerformance = any & {
    editedQualified: boolean;
    editedYoutube: string;

    saving: boolean;

    saveMessage: string;
    saveError: boolean;
};

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const API_URL = import.meta.env.VITE_API_URL;

function getYouTubeId(url: string) {
    const match = url.match(
        /(?:youtu\.be\/|youtube\.com.*v=)([^&?/]+)/i
    );

    return match?.[1] || null;
}

export function AdminPage({ initialContest }: Props) {
    const token = localStorage.getItem("token");

    const [contests, setContests] =
        useState<ContestsByYear>({});

    const [selectedContest, setSelectedContest] =
        useState<ContestView | null>(initialContest);

    const [items, setItems] = useState<EditablePerformance[]>(
        (initialContest?.performances ?? []).map((p) => ({
            ...p,
            editedQualified: p.qualified,
            editedYoutube: p.youtube_link || "",
            saving: false,
            saveMessage: "",
            saveError: false,
        }))
    );

    // 👇 youtube results per performance
    const [ytResultsById, setYtResultsById] = useState<
        Record<string, any[]>
    >({});

    useEffect(() => {
        getContests().then(setContests);
    }, []);

    async function handleSelectContest(id: string) {
        const data = await getContest(id);

        setSelectedContest(data);

        setItems(
            data.performances.map((p) => ({
                ...p,
                editedQualified: p.qualified,
                editedYoutube: p.youtube_link || "",
                saving: false,
                saveMessage: "",
                saveError: false,
            }))
        );

        localStorage.setItem("selectedContestId", id);
    }

    function toggleQualified(id: string) {
        setItems((prev) =>
            prev.map((p) =>
                p.performance_id === id
                    ? { ...p, editedQualified: !p.editedQualified }
                    : p
            )
        );
    }

    function updateYoutube(id: string, value: string) {
        setItems((prev) =>
            prev.map((p) =>
                p.performance_id === id
                    ? { ...p, editedYoutube: value }
                    : p
            )
        );
    }

    async function searchYouTube(performanceId: string, query: string) {
        if (!query) return;

        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
                    query
                )}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
            );

            const data = await res.json();

            setYtResultsById((prev) => ({
                ...prev,
                [performanceId]: data.items || [],
            }));
        } catch (e) {
            console.error(e);
        }
    }

    function selectVideo(performanceId: string, video: any) {
        const url = `https://www.youtube.com/watch?v=${video.id.videoId}`;

        setItems((prev) =>
            prev.map((p) =>
                p.performance_id === performanceId
                    ? { ...p, editedYoutube: url }
                    : p
            )
        );

        setYtResultsById((prev) => ({
            ...prev,
            [performanceId]: [],
        }));
    }

    async function savePerformance(item: EditablePerformance) {
        if (!token) return;

        setItems((prev) =>
            prev.map((p) =>
                p.performance_id === item.performance_id
                    ? {
                          ...p,
                          saving: true,
                          saveMessage: "",
                          saveError: false,
                      }
                    : p
            )
        );

        try {
            await fetch(
                `${API_URL}/admin/performance/${item.performance_id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        qualified: item.editedQualified,
                        youtube_link: item.editedYoutube,
                    }),
                }
            );

            setItems((prev) =>
                prev.map((p) =>
                    p.performance_id === item.performance_id
                        ? {
                              ...p,
                              qualified: p.editedQualified,
                              youtube_link: p.editedYoutube,
                              saving: false,
                              saveMessage: "✅ Сохранено",
                              saveError: false,
                          }
                        : p
                )
            );

            setTimeout(() => {
                setItems((prev) =>
                    prev.map((p) =>
                        p.performance_id === item.performance_id
                            ? { ...p, saveMessage: "" }
                            : p
                    )
                );
            }, 2500);
        } catch (e) {
            setItems((prev) =>
                prev.map((p) =>
                    p.performance_id === item.performance_id
                        ? {
                              ...p,
                              saving: false,
                              saveMessage: "❌ Ошибка сохранения",
                              saveError: true,
                          }
                        : p
                )
            );
        }
    }

    return (
        <div style={styles.app}>
            <Topbar
                theme={"dark-blue"}
                onSelectTheme={function(){}}
                contests={contests}
                onSelectContest={handleSelectContest}
            />

            {!selectedContest ? (
                <div style={styles.empty}>
                    <h1 style={styles.title}>🛠 Админка</h1>
                    <div style={styles.hint}>
                        Выберите контест сверху
                    </div>
                </div>
            ) : (
                <div style={styles.wrapper}>
                    <h1 style={styles.title}>🛠 Админка</h1>

                    <div style={styles.list}>
                        {items.map((p) => {
                            const youtubeId = getYouTubeId(
                                p.editedYoutube
                            );

                            return (
                                <div
                                    key={p.performance_id}
                                    style={{
                                        ...styles.card,
                                        border: p.editedQualified
                                            ? "1px solid #22c55e"
                                            : "1px solid #24324f",
                                    }}
                                >
                                    <div style={styles.rowTop}>
                                        <div style={styles.country}>
                                            {p.country.flag_emoji}{" "}
                                            {p.country.name_ru}
                                        </div>

                                        <label style={styles.switch}>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    p.editedQualified
                                                }
                                                onChange={() =>
                                                    toggleQualified(
                                                        p.performance_id
                                                    )
                                                }
                                                style={{ display: "none" }}
                                            />
                                            <div
                                                style={{
                                                    ...styles.slider,
                                                    background:
                                                        p.editedQualified
                                                            ? "#22c55e"
                                                            : "#24324f",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        ...styles.knob,
                                                        transform:
                                                            p.editedQualified
                                                                ? "translateX(20px)"
                                                                : "translateX(0px)",
                                                    }}
                                                />
                                            </div>
                                        </label>
                                    </div>

                                    <div style={styles.song}>
                                        {p.artist} — {p.song}
                                    </div>

                                    <div style={styles.youtubeSection}>
                                        <input
                                            value={p.editedYoutube}
                                            onChange={(e) =>
                                                updateYoutube(
                                                    p.performance_id,
                                                    e.target.value
                                                )
                                            }
                                            placeholder="YouTube link"
                                            style={styles.input}
                                        />

                                        <button
                                            style={{
                                                marginTop: 8,
                                                padding: "12px 14px",
                                                borderRadius: 10,
                                                border: "1px solid #24324f",
                                                background: "#0f1a30",
                                                color: "#fff",
                                                fontWeight: 700,
                                                fontSize: 14,
                                                cursor: "pointer",
                                                width: "fit-content",
                                                minWidth: 180,
                                                height: 44,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                            onClick={() =>
                                                searchYouTube(
                                                    p.performance_id,
                                                    `${p.artist} ${p.song}`
                                                )
                                            }
                                        >
                                            🔍 Поиск YouTube
                                        </button>

                                        {/* RESULTS INSIDE CARD */}
                                        {ytResultsById[p.performance_id]
                                            ?.length > 0 && (
                                            <div
                                                style={{
                                                    marginTop: 10,
                                                    display: "grid",
                                                    gap: 10,
                                                    maxHeight: 260,
                                                    overflowY: "auto",
                                                }}
                                            >
                                                {ytResultsById[
                                                    p.performance_id
                                                ].map((v: any) => (
                                                    <div
                                                        key={v.id.videoId}
                                                        onClick={() =>
                                                            selectVideo(
                                                                p.performance_id,
                                                                v
                                                            )
                                                        }
                                                        style={{
                                                            display: "flex",
                                                            gap: 10,
                                                            cursor: "pointer",
                                                            background:
                                                                "#0b1220",
                                                            padding: 8,
                                                            borderRadius: 10,
                                                            border:
                                                                "1px solid #24324f",
                                                        }}
                                                    >
                                                        <img
                                                            src={
                                                                v.snippet
                                                                    .thumbnails
                                                                    .default
                                                                    .url
                                                            }
                                                            style={{
                                                                width: 100,
                                                                borderRadius: 6,
                                                            }}
                                                        />

                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            {v.snippet.title}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {youtubeId && (
                                            <img
                                                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                                style={styles.preview}
                                            />
                                        )}
                                    </div>

                                    <button
                                        style={styles.saveBtn}
                                        onClick={() =>
                                            savePerformance(p)
                                        }
                                    >
                                        {p.saving
                                            ? "Сохранение..."
                                            : "Сохранить"}
                                    </button>

                                    {p.saveMessage && (
                                        <div
                                            style={{
                                                color: p.saveError
                                                    ? "#ff6b6b"
                                                    : "#22c55e",
                                                fontWeight: 700,
                                                fontSize: 13,
                                                marginTop: 8,
                                                textAlign: "right",
                                            }}
                                        >
                                            {p.saveMessage}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    app: { height: "100vh", overflow: "hidden", background: "#0b1220" },
    wrapper: {
        padding: 20,
        color: "#e6edf7",
        overflowY: "auto",
        height: "calc(100vh - 72px)",
    },
    title: { marginBottom: 14 },
    hint: { color: "#9fb0d0" },
    empty: { padding: 20, color: "#9fb0d0" },
    list: { display: "grid", gap: 14 },
    card: {
        background: "#111a2e",
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
    },
    rowTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    country: { fontSize: 18, fontWeight: 700 },
    song: { color: "#9fb0d0", fontSize: 15 },
    youtubeSection: { display: "flex", flexDirection: "column", gap: 10 },
    input: {
        width: "100%",
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #24324f",
        background: "#0b1220",
        color: "#fff",
        fontSize: 14,
        outline: "none",
    },
    preview: {
        width: 220,
        borderRadius: 12,
        border: "1px solid #24324f",
    },
    saveBtn: {
        alignSelf: "flex-end",
        padding: "10px 16px",
        borderRadius: 10,
        border: "none",
        background: "#22c55e",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 14,
    },
    switch: { position: "relative", width: 44, height: 24, cursor: "pointer" },
    slider: {
        width: "100%",
        height: "100%",
        borderRadius: 999,
        position: "relative",
        transition: "0.2s",
    },
    knob: {
        width: 20,
        height: 20,
        background: "#fff",
        borderRadius: "50%",
        position: "absolute",
        top: 2,
        left: 2,
        transition: "0.2s",
    },
};