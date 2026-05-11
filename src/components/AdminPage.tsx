import { useEffect, useState } from "react";

import { Topbar } from "./Topbar";
import { getContests, getContest } from "../api/contest";
import { setQualified } from "../api/admin";

import type {
    ContestView,
    ContestsByYear,
} from "../types/contest";

type Props = {
    initialContest: ContestView | null;
};

export function AdminPage({ initialContest }: Props) {
    const token = localStorage.getItem("token");

    const [contests, setContests] = useState<ContestsByYear>({});
    const [selectedContest, setSelectedContest] =
        useState<ContestView | null>(initialContest);

    const [items, setItems] = useState(
        initialContest?.performances ?? []
    );

    useEffect(() => {
        getContests().then(setContests);
    }, []);

    async function handleSelectContest(id: string) {
        const data = await getContest(id);

        setSelectedContest(data);
        setItems(data.performances);

        localStorage.setItem("selectedContestId", id);
    }

    async function toggleQualified(id: string, current: boolean) {
        if (!token) return;

        const newValue = !current;

        await setQualified(token, id, newValue);

        setItems((prev) =>
            prev.map((p) =>
                p.performance_id === id
                    ? { ...p, qualified: newValue }
                    : p
            )
        );
    }

    return (
        <div style={styles.app}>
            <Topbar
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
                        {items.map((p) => (
                            <div
                                key={p.performance_id}
                                style={{
                                    ...styles.card,
                                    border: p.qualified
                                        ? "1px solid #2ecc71"
                                        : "1px solid #24324f",
                                }}
                            >
                                {/* HEADER */}
                                <div style={styles.rowTop}>
                                    <div>
                                        {p.country.name_ru}
                                    </div>

                                    <div>
                                        {p.qualified ? "✅" : "❌"}
                                    </div>
                                </div>

                                {/* INFO */}
                                <div style={styles.meta}>
                                    {p.artist} — {p.song}
                                </div>

                                {/* ACTION */}
                                <button
                                    style={{
                                        ...styles.btn,
                                        background: p.qualified
                                            ? "#3a1f1f"
                                            : "#4f7cff",
                                    }}
                                    onClick={() =>
                                        toggleQualified(
                                            p.performance_id,
                                            p.qualified
                                        )
                                    }
                                >
                                    {p.qualified
                                        ? "Undo"
                                        : "Set qualified"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    app: {
        height: "100vh",
        overflow: "hidden",
        background: "#0b1220",
    },

    wrapper: {
        padding: 20,
        color: "#e6edf7",
        overflowY: "auto",
        height: "calc(100vh - 72px)",
    },

    title: {
        marginBottom: 10,
    },

    hint: {
        color: "#9fb0d0",
    },

    list: {
        display: "grid",
        gap: 12,
        width: "100%",
    },

    card: {
        width: "100%", // 🔥 ВАЖНО
        padding: 16,
        borderRadius: 12,
        background: "#111a2e",
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },

    rowTop: {
        display: "flex",
        justifyContent: "space-between",
        fontWeight: 700,
    },

    meta: {
        color: "#9fb0d0",
    },

    btn: {
        alignSelf: "flex-end",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #24324f",
        color: "white",
        cursor: "pointer",
        fontWeight: 600,
    },

    empty: {
        padding: 20,
        color: "#9fb0d0",
    },
};