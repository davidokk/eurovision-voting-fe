import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../types/contest";

const LIVE_VIDEO_ID = (import.meta as any).env?.VITE_YOUTUBE_LIVE_VIDEO_ID?.trim() || "";
const LIVE_EMBED_URL = (import.meta as any).env?.VITE_YOUTUBE_LIVE_EMBED_URL?.trim() || "";
const STORAGE_KEY = "ev_youtube_live_open";

function buildEmbedSrc(): string | null {
    const params = new URLSearchParams({
        rel: "0",
        modestbranding: "1",
        playsinline: "1",
        autoplay: "1",
    });

    if (LIVE_EMBED_URL) {
        const url = new URL(LIVE_EMBED_URL);
        params.forEach((v, k) => url.searchParams.set(k, v));
        return url.toString();
    }
    if (LIVE_VIDEO_ID) {
        return `https://www.youtube.com/embed/${LIVE_VIDEO_ID}?${params.toString()}`;
    }
    return null;
}

type Props = {
    theme: Theme;
};

export function YouTubeLiveSection({ theme }: Props) {
    const initialOpen = localStorage.getItem(STORAGE_KEY) === "1";
    const [open, setOpen] = useState(initialOpen);
    /** Плеер не размонтируем при «Скрыть» — иначе YouTube ставит на паузу */
    const [playerMounted, setPlayerMounted] = useState(initialOpen);

    const embedSrc = useMemo(() => buildEmbedSrc(), []);

    useEffect(() => {
        if (open) setPlayerMounted(true);
    }, [open]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    }, [open]);

    if (!embedSrc) return null;

    const isLight = theme === "light";
    const isGray = theme === "dark-gray";

    const cardBg = isLight
        ? "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(241,245,249,0.9) 100%)"
        : isGray
        ? "linear-gradient(135deg, rgba(30,30,30,0.85) 0%, rgba(18,18,18,0.95) 100%)"
        : "linear-gradient(135deg, rgba(30,41,59,0.75) 0%, rgba(15,23,42,0.9) 100%)";
    const border = isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.08)";
    const titleColor = isLight ? "#0f172a" : "#fff";
    const muted = isLight ? "#64748b" : "#94a3b8";
    const btnBg = isLight
        ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)"
        : isGray
        ? "linear-gradient(135deg, #6b7280 0%, #374151 100%)"
        : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)";

    return (
        <section style={{ maxWidth: 1200, margin: "0 auto 24px", padding: "0 4px" }}>
            <div
                style={{
                    background: cardBg,
                    border,
                    borderRadius: 24,
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.18), inset 0 1px rgba(255,255,255,0.06)",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "14px 18px",
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>
                            📺
                        </span>
                        <div>
                            <div style={{ margin: 0, fontSize: 16, fontWeight: 800, color: titleColor }}>
                                Прямая трансляция
                            </div>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: muted }}>
                                YouTube • можно свернуть в любой момент
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        style={{
                            border: "none",
                            borderRadius: 14,
                            padding: "10px 16px",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            background: btnBg,
                            boxShadow: "0 8px 24px rgba(79,124,255,0.25)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {open ? "Скрыть" : "Показать"}
                    </button>
                </div>

                {playerMounted && (
                    <div
                        style={{
                            padding: open ? "0 16px 16px" : 0,
                            height: open ? "auto" : 0,
                            overflow: "hidden",
                            visibility: open ? "visible" : "hidden",
                        }}
                        aria-hidden={!open}
                    >
                        <div
                            style={{
                                position: "relative",
                                width: "100%",
                                aspectRatio: "16 / 9",
                                borderRadius: 16,
                                overflow: "hidden",
                                border,
                                background: "#000",
                            }}
                        >
                            <iframe
                                title="Eurovision live stream"
                                src={embedSrc}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    border: "none",
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
