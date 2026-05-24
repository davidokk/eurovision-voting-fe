import { useCallback, useEffect, useMemo, useState } from "react";
import { getContests, getContest } from "../api/contest";
import {
    createContest,
    createPerformance,
    getCountries,
    updateContest,
    updatePerformance,
    updatePlaces,
    type Country,
} from "../api/admin";
import type { ContestItem, ContestView, ContestsByYear, PerformanceWithScores } from "../types/contest";
import { AdminPlaceRanking } from "./AdminPlaceRanking";
import {
    AdminCountrySelect,
    AdminField,
    AdminInput,
    AdminPrimaryButton,
    AdminSecondaryButton,
    ContestFormFields,
    adminFormCardStyle,
    contestTypeLabel,
    defaultDatetimeLocal,
    isoToDatetimeLocal,
    type ContestFormValues,
} from "./admin/AdminFormFields";

type Props = {
    initialContest: ContestView | null;
};

type Tab = "performances" | "places" | "contest" | "settings";

type EditablePerformance = PerformanceWithScores & {
    editedQualified: boolean;
    editedYoutube: string;
    editedPlace: number | null;
    saving: boolean;
    saveMessage: string;
    saveError: boolean;
};

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || "";
const NEW_PERF_YT_KEY = "__new_performance__";

type YoutubeItem = {
    id: { videoId: string };
    snippet: { title: string; thumbnails: { default: { url: string } } };
};

function getYouTubeId(url: string) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com.*v=)([^&?/]+)/i);
    return match?.[1] || null;
}

function toEditable(p: PerformanceWithScores): EditablePerformance {
    return {
        ...p,
        editedQualified: p.qualified,
        editedYoutube: p.youtube_link || "",
        editedPlace: p.place ?? null,
        saving: false,
        saveMessage: "",
        saveError: false,
    };
}

function contestFormPayload(v: ContestFormValues) {
    return {
        year: v.year,
        type: v.type,
        starts: new Date(v.starts).toISOString(),
        ends: new Date(v.ends).toISOString(),
    };
}

function YoutubeSearchResults({
    items,
    onSelect,
}: {
    items: YoutubeItem[];
    onSelect: (video: YoutubeItem) => void;
}) {
    if (items.length === 0) return null;
    return (
        <div style={styles.ytList}>
            {items.map((v) => (
                <button
                    key={v.id.videoId}
                    type="button"
                    style={styles.ytItem}
                    onClick={() => onSelect(v)}
                >
                    <img src={v.snippet.thumbnails.default.url} alt="" style={styles.ytThumb} />
                    <span>{v.snippet.title}</span>
                </button>
            ))}
        </div>
    );
}

export function AdminPage({ initialContest }: Props) {
    const token = localStorage.getItem("token") || "";

    const [contests, setContests] = useState<ContestsByYear>({});
    const [selectedContest, setSelectedContest] = useState<ContestView | null>(initialContest);
    const [items, setItems] = useState<EditablePerformance[]>(
        (initialContest?.performances ?? []).map(toEditable)
    );
    const [tab, setTab] = useState<Tab>("performances");
    const [placesSaving, setPlacesSaving] = useState(false);

    const [countries, setCountries] = useState<Country[]>([]);
    const [ytResultsById, setYtResultsById] = useState<Record<string, YoutubeItem[]>>({});

    const [showCreateContest, setShowCreateContest] = useState(false);
    const [newContest, setNewContest] = useState<ContestFormValues>({
        year: new Date().getFullYear(),
        type: "final",
        starts: defaultDatetimeLocal(1),
        ends: defaultDatetimeLocal(24 * 7),
    });
    const [editContest, setEditContest] = useState<ContestFormValues | null>(null);
    const [contestSaving, setContestSaving] = useState(false);
    const [newPerf, setNewPerf] = useState({
        country_id: "",
        number: "",
        artist: "",
        song: "",
        youtube_link: "",
    });
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const refreshContests = useCallback(() => {
        getContests().then(setContests);
    }, []);

    useEffect(() => {
        refreshContests();
        getCountries().then(setCountries).catch(() => {});
    }, [refreshContests]);

    async function handleSelectContest(id: string) {
        const data = await getContest(id);
        setSelectedContest(data);
        setItems(data.performances.map(toEditable));
        setEditContest({
            year: data.contest.year,
            type: data.contest.type,
            starts: isoToDatetimeLocal(data.contest.starts),
            ends: isoToDatetimeLocal(data.contest.ends),
        });
        setTab("performances");
        localStorage.setItem("selectedContestId", id);
    }

    const contestList = useMemo(() => {
        const rows: { year: string; items: ContestItem[] }[] = [];
        for (const [year, list] of Object.entries(contests)) {
            rows.push({ year, items: [...list].sort((a, b) => a.type.localeCompare(b.type)) });
        }
        rows.sort((a, b) => Number(b.year) - Number(a.year));
        return rows;
    }, [contests]);

    async function handleCreateContest() {
        if (!token) return;
        setErrorMsg(null);
        try {
            const created = await createContest(token, contestFormPayload(newContest));
            refreshContests();
            setShowCreateContest(false);
            setStatusMsg("Контест создан");
            await handleSelectContest(created.id);
        } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : "Ошибка");
        }
    }

    async function handleUpdateContest() {
        if (!token || !selectedContest || !editContest) return;
        setContestSaving(true);
        setErrorMsg(null);
        try {
            await updateContest(token, selectedContest.contest.id, contestFormPayload(editContest));
            refreshContests();
            setStatusMsg("Контест обновлён");
            await handleSelectContest(selectedContest.contest.id);
        } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : "Ошибка");
        } finally {
            setContestSaving(false);
        }
    }

    async function handleAddPerformance() {
        if (!token || !selectedContest) return;
        setErrorMsg(null);
        try {
            await createPerformance(token, selectedContest.contest.id, {
                country_id: newPerf.country_id,
                number: newPerf.number ? parseInt(newPerf.number, 10) : undefined,
                artist: newPerf.artist,
                song: newPerf.song,
                youtube_link: newPerf.youtube_link || undefined,
            });
            setNewPerf({ country_id: "", number: "", artist: "", song: "", youtube_link: "" });
            setYtResultsById((prev) => ({ ...prev, [NEW_PERF_YT_KEY]: [] }));
            setStatusMsg("Выступление добавлено");
            await handleSelectContest(selectedContest.contest.id);
        } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : "Ошибка");
        }
    }

    async function handleSavePlaces(ranked: string[]) {
        if (!token || !selectedContest) return;
        setPlacesSaving(true);
        try {
            await updatePlaces(token, selectedContest.contest.id, ranked);
            await handleSelectContest(selectedContest.contest.id);
            setTab("places");
            setStatusMsg("Места сохранены");
        } finally {
            setPlacesSaving(false);
        }
    }

    function toggleQualified(id: string) {
        setItems((prev) =>
            prev.map((p) =>
                p.performance_id === id ? { ...p, editedQualified: !p.editedQualified } : p
            )
        );
    }

    function updateYoutube(id: string, value: string) {
        setItems((prev) =>
            prev.map((p) => (p.performance_id === id ? { ...p, editedYoutube: value } : p))
        );
    }

    async function searchYouTube(resultKey: string, query: string) {
        if (!query.trim() || !YOUTUBE_API_KEY) return;
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
            );
            const data = await res.json();
            setYtResultsById((prev) => ({
                ...prev,
                [resultKey]: (data.items || []) as YoutubeItem[],
            }));
        } catch (e) {
            console.error(e);
        }
    }

    function selectVideoForPerformance(performanceId: string, video: YoutubeItem) {
        updateYoutube(performanceId, `https://www.youtube.com/watch?v=${video.id.videoId}`);
        setYtResultsById((prev) => ({ ...prev, [performanceId]: [] }));
    }

    function selectVideoForNewPerf(video: YoutubeItem) {
        setNewPerf((s) => ({
            ...s,
            youtube_link: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        }));
        setYtResultsById((prev) => ({ ...prev, [NEW_PERF_YT_KEY]: [] }));
    }

    async function savePerformance(item: EditablePerformance) {
        if (!token) return;
        setItems((prev) =>
            prev.map((p) =>
                p.performance_id === item.performance_id
                    ? { ...p, saving: true, saveMessage: "", saveError: false }
                    : p
            )
        );
        try {
            await updatePerformance(token, item.performance_id, {
                qualified: item.editedQualified,
                youtube_link: item.editedYoutube,
                place: item.editedPlace,
            });
            setItems((prev) =>
                prev.map((p) =>
                    p.performance_id === item.performance_id
                        ? {
                              ...p,
                              qualified: p.editedQualified,
                              youtube_link: p.editedYoutube,
                              place: p.editedPlace,
                              saving: false,
                              saveMessage: "Сохранено",
                              saveError: false,
                          }
                        : p
                )
            );
        } catch {
            setItems((prev) =>
                prev.map((p) =>
                    p.performance_id === item.performance_id
                        ? { ...p, saving: false, saveMessage: "Ошибка", saveError: true }
                        : p
                )
            );
        }
    }

    return (
        <div style={styles.app}>
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHead}>
                    <h1 style={styles.logo}>Админка</h1>
                    <button
                        type="button"
                        style={styles.newContestBtn}
                        onClick={() => setShowCreateContest((v) => !v)}
                    >
                        {showCreateContest ? "Скрыть" : "+ Контест"}
                    </button>
                </div>

                {showCreateContest && (
                    <div style={adminFormCardStyle}>
                        <div style={styles.formCardTitle}>Новый контест</div>
                        <ContestFormFields
                            value={newContest}
                            onChange={setNewContest}
                            compact
                        />
                        <AdminPrimaryButton
                            style={{ width: "100%" }}
                            onClick={() => void handleCreateContest()}
                        >
                            Создать контест
                        </AdminPrimaryButton>
                    </div>
                )}

                <div style={styles.contestList}>
                    {contestList.map(({ year, items: list }) => (
                        <div key={year}>
                            <div style={styles.yearLabel}>{year}</div>
                            {list.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    style={{
                                        ...styles.contestBtn,
                                        ...(selectedContest?.contest.id === c.id
                                            ? styles.contestBtnActive
                                            : {}),
                                    }}
                                    onClick={() => void handleSelectContest(c.id)}
                                >
                                    {contestTypeLabel(c.type)}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </aside>

            <main style={styles.main}>
                {!selectedContest ? (
                    <div style={styles.emptyMain}>
                        <p>Выберите контест слева или создайте новый</p>
                    </div>
                ) : (
                    <>
                        <header style={styles.mainHeader}>
                            <div>
                                <h2 style={styles.mainTitle}>
                                    {selectedContest.contest.year} · {contestTypeLabel(selectedContest.contest.type)}
                                </h2>
                                <p style={styles.mainSub}>{items.length} выступлений</p>
                            </div>
                            <div style={styles.tabs}>
                                {(
                                    [
                                        ["performances", "Выступления"],
                                        ["places", "Места"],
                                        ["contest", "Добавить"],
                                        ["settings", "Контест"],
                                    ] as const
                                ).map(([id, label]) => (
                                    <button
                                        key={id}
                                        type="button"
                                        style={{
                                            ...styles.tab,
                                            ...(tab === id ? styles.tabActive : {}),
                                        }}
                                        onClick={() => setTab(id)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </header>

                        {(statusMsg || errorMsg) && (
                            <div style={styles.flash}>
                                {errorMsg && <span style={{ color: "#ff6b6b" }}>{errorMsg}</span>}
                                {statusMsg && !errorMsg && (
                                    <span style={{ color: "#4ade80" }}>{statusMsg}</span>
                                )}
                                <button
                                    type="button"
                                    style={styles.flashClose}
                                    onClick={() => {
                                        setStatusMsg(null);
                                        setErrorMsg(null);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {tab === "places" && (
                            <AdminPlaceRanking
                                items={items}
                                saving={placesSaving}
                                onSave={handleSavePlaces}
                            />
                        )}

                        {tab === "settings" && editContest && (
                            <section style={{ ...adminFormCardStyle, maxWidth: 560 }}>
                                <div style={styles.formCardTitle}>Параметры контеста</div>
                                <p style={styles.formCardSub}>
                                    Год, тип и окно голосования. Изменения применяются сразу после сохранения.
                                </p>
                                <ContestFormFields value={editContest} onChange={setEditContest} />
                                <div style={styles.formActions}>
                                    <AdminPrimaryButton
                                        disabled={contestSaving}
                                        onClick={() => void handleUpdateContest()}
                                    >
                                        {contestSaving ? "Сохранение…" : "Сохранить изменения"}
                                    </AdminPrimaryButton>
                                </div>
                            </section>
                        )}

                        {tab === "contest" && (
                            <section style={{ ...adminFormCardStyle, maxWidth: 520 }}>
                                <div style={styles.formCardTitle}>Добавить выступление</div>
                                <AdminField label="Страна">
                                    <AdminCountrySelect
                                        countries={countries}
                                        value={newPerf.country_id}
                                        onChange={(country_id) =>
                                            setNewPerf((s) => ({ ...s, country_id }))
                                        }
                                    />
                                </AdminField>
                                <AdminField label="Номер" hint="Оставьте пустым для автонумерации">
                                    <AdminInput
                                        value={newPerf.number}
                                        onChange={(e) =>
                                            setNewPerf((s) => ({ ...s, number: e.target.value }))
                                        }
                                        placeholder="авто"
                                    />
                                </AdminField>
                                <AdminField label="Артист">
                                    <AdminInput
                                        value={newPerf.artist}
                                        onChange={(e) =>
                                            setNewPerf((s) => ({ ...s, artist: e.target.value }))
                                        }
                                    />
                                </AdminField>
                                <AdminField label="Песня">
                                    <AdminInput
                                        value={newPerf.song}
                                        onChange={(e) =>
                                            setNewPerf((s) => ({ ...s, song: e.target.value }))
                                        }
                                    />
                                </AdminField>
                                <AdminField label="YouTube">
                                    <AdminInput
                                        value={newPerf.youtube_link}
                                        onChange={(e) =>
                                            setNewPerf((s) => ({ ...s, youtube_link: e.target.value }))
                                        }
                                        placeholder="https://..."
                                    />
                                </AdminField>
                                <AdminSecondaryButton
                                    onClick={() =>
                                        searchYouTube(
                                            NEW_PERF_YT_KEY,
                                            `${newPerf.artist} ${newPerf.song}`.trim()
                                        )
                                    }
                                >
                                    Поиск YouTube
                                </AdminSecondaryButton>
                                <YoutubeSearchResults
                                    items={ytResultsById[NEW_PERF_YT_KEY] ?? []}
                                    onSelect={selectVideoForNewPerf}
                                />
                                {getYouTubeId(newPerf.youtube_link) && (
                                    <img
                                        src={`https://img.youtube.com/vi/${getYouTubeId(newPerf.youtube_link)}/mqdefault.jpg`}
                                        alt=""
                                        style={styles.preview}
                                    />
                                )}
                                <AdminPrimaryButton
                                    style={{ width: "100%" }}
                                    onClick={() => void handleAddPerformance()}
                                >
                                    Добавить в контест
                                </AdminPrimaryButton>
                            </section>
                        )}

                        {tab === "performances" && (
                            <div style={styles.perfGrid}>
                                {items.map((p) => {
                                    const youtubeId = getYouTubeId(p.editedYoutube);
                                    const ytItems = ytResultsById[p.performance_id] ?? [];

                                    return (
                                        <article
                                            key={p.performance_id}
                                            style={{
                                                ...styles.card,
                                                borderColor: p.editedQualified ? "#22c55e" : "#24324f",
                                            }}
                                        >
                                            <div style={styles.cardTop}>
                                                <div>
                                                    <div style={styles.country}>
                                                        #{p.number} {p.country?.flag_emoji} {p.country?.name_ru}
                                                    </div>
                                                    <div style={styles.song}>
                                                        {p.artist} — {p.song}
                                                    </div>
                                                    {p.place != null && p.place > 0 && (
                                                        <div style={styles.placeTag}>Место: {p.place}</div>
                                                    )}
                                                </div>
                                                <label style={styles.switch}>
                                                    <input
                                                        type="checkbox"
                                                        checked={p.editedQualified}
                                                        onChange={() => toggleQualified(p.performance_id)}
                                                        style={{ display: "none" }}
                                                    />
                                                    <div
                                                        style={{
                                                            ...styles.slider,
                                                            background: p.editedQualified
                                                                ? "#22c55e"
                                                                : "#24324f",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                ...styles.knob,
                                                                transform: p.editedQualified
                                                                    ? "translateX(20px)"
                                                                    : "translateX(0)",
                                                            }}
                                                        />
                                                    </div>
                                                </label>
                                            </div>

                                            <AdminInput
                                                value={p.editedYoutube}
                                                onChange={(e) =>
                                                    updateYoutube(p.performance_id, e.target.value)
                                                }
                                                placeholder="YouTube link"
                                            />

                                            <div style={styles.cardActions}>
                                                <AdminSecondaryButton
                                                    onClick={() =>
                                                        searchYouTube(
                                                            p.performance_id,
                                                            `${p.artist} ${p.song}`
                                                        )
                                                    }
                                                >
                                                    Поиск YouTube
                                                </AdminSecondaryButton>
                                                <button
                                                    type="button"
                                                    style={styles.saveBtn}
                                                    disabled={p.saving}
                                                    onClick={() => void savePerformance(p)}
                                                >
                                                    {p.saving ? "…" : "Сохранить"}
                                                </button>
                                            </div>

                                            <YoutubeSearchResults
                                                items={ytItems}
                                                onSelect={(v) => selectVideoForPerformance(p.performance_id, v)}
                                            />

                                            {youtubeId && (
                                                <img
                                                    src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                                    alt=""
                                                    style={styles.preview}
                                                />
                                            )}

                                            {p.saveMessage && (
                                                <div
                                                    style={{
                                                        color: p.saveError ? "#ff6b6b" : "#4ade80",
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    {p.saveMessage}
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>

            <a href="/" style={styles.backLink}>
                ← На сайт
            </a>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    app: {
        display: "flex",
        minHeight: "100vh",
        background: "#0b1220",
        color: "#e6edf7",
        position: "relative",
    },
    sidebar: {
        width: 280,
        flexShrink: 0,
        borderRight: "1px solid #1e293b",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflowY: "auto",
        maxHeight: "100vh",
    },
    sidebarHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    logo: { margin: 0, fontSize: 20, fontWeight: 900 },
    newContestBtn: {
        border: "1px solid #334155",
        background: "rgba(255,255,255,0.05)",
        color: "#e6edf7",
        borderRadius: 10,
        padding: "6px 10px",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
    },
    formCardTitle: { fontSize: 15, fontWeight: 900, color: "#f1f5f9" },
    formCardSub: { margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.45 },
    formActions: { display: "flex", gap: 10, paddingTop: 4 },
    contestList: { display: "flex", flexDirection: "column", gap: 12 },
    yearLabel: { fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 6 },
    contestBtn: {
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        marginBottom: 4,
        borderRadius: 10,
        border: "none",
        background: "transparent",
        color: "#cbd5e1",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
    },
    contestBtnActive: { background: "rgba(79, 124, 255, 0.2)", color: "#fff" },
    main: { flex: 1, padding: 24, overflowY: "auto", maxHeight: "100vh" },
    emptyMain: { color: "#9fb0d0", paddingTop: 40 },
    mainHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 20,
    },
    mainTitle: { margin: 0, fontSize: 22, fontWeight: 900 },
    mainSub: { margin: "6px 0 0", fontSize: 13, color: "#9fb0d0" },
    tabs: { display: "flex", gap: 6, flexWrap: "wrap" },
    tab: {
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid #24324f",
        background: "transparent",
        color: "#9fb0d0",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
    },
    tabActive: { background: "#1e293b", color: "#fff", borderColor: "#4f7cff" },
    flash: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        borderRadius: 12,
        background: "#111a2e",
        marginBottom: 16,
        fontSize: 13,
    },
    flashClose: {
        border: "none",
        background: "transparent",
        color: "#9fb0d0",
        cursor: "pointer",
    },
    panel: {
        background: "#111a2e",
        borderRadius: 16,
        padding: 18,
        border: "1px solid #24324f",
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    perfGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 14,
    },
    card: {
        background: "#111a2e",
        borderRadius: 16,
        padding: 16,
        border: "1px solid #24324f",
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    cardTop: { display: "flex", justifyContent: "space-between", gap: 12 },
    country: { fontWeight: 800, fontSize: 15 },
    song: { color: "#9fb0d0", fontSize: 14, marginTop: 4 },
    placeTag: { marginTop: 6, fontSize: 12, color: "#7aa2ff", fontWeight: 700 },
    cardActions: { display: "flex", gap: 8, justifyContent: "flex-end" },
    saveBtn: {
        padding: "8px 14px",
        borderRadius: 10,
        border: "none",
        background: "#22c55e",
        color: "#fff",
        fontWeight: 700,
        cursor: "pointer",
        fontSize: 13,
    },
    ytList: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" },
    ytItem: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: 6,
        borderRadius: 8,
        border: "1px solid #24324f",
        background: "#0b1220",
        color: "#fff",
        cursor: "pointer",
        textAlign: "left",
        fontSize: 12,
    },
    ytThumb: { width: 72, borderRadius: 6, flexShrink: 0 },
    preview: { width: "100%", maxWidth: 280, borderRadius: 10, border: "1px solid #24324f" },
    switch: { position: "relative", width: 44, height: 24, cursor: "pointer", flexShrink: 0 },
    slider: { width: "100%", height: "100%", borderRadius: 999, position: "relative", transition: "0.2s" },
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
    backLink: {
        position: "fixed",
        bottom: 16,
        right: 16,
        color: "#9fb0d0",
        fontSize: 13,
        textDecoration: "none",
        padding: "8px 12px",
        background: "rgba(17,26,46,0.9)",
        borderRadius: 10,
    },
};
