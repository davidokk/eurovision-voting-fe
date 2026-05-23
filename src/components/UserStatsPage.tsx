import { useEffect, useRef, useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { Camera, ChevronDown, Loader2, Search, Star, Trash2, X } from "lucide-react";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import type { Theme } from "../types/contest";
import { deleteAvatar, fetchUserPublic, setStoredAvatarUrl, uploadAvatar } from "../api/user";
import { UserAvatar } from "./UserAvatar";
import { AvatarCropModal } from "./AvatarCropModal";
import { useAvatarUrl } from "../hooks/useAvatarUrl";

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
    Qualified?: boolean;
    Place?: number;
};

type SortType = "time" | "score" | "place";

type Country = {
    id: string;
    name_ru: string;
    flag_emoji: string;
};

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

function pluralRatings(n: number) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return "оценок";
    if (mod10 === 1) return "оценка";
    if (mod10 >= 2 && mod10 <= 4) return "оценки";
    return "оценок";
}

type ChipColors = {
    activeBg: string;
    activeColor: string;
    idleBg: string;
    idleColor: string;
    border: string;
    activeShadow: string;
};

function FilterChip({
    active,
    onClick,
    children,
    colors,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    colors: ChipColors;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: active ? "none" : colors.border,
                background: active ? colors.activeBg : colors.idleBg,
                color: active ? colors.activeColor : colors.idleColor,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: active ? colors.activeShadow : "none",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </button>
    );
}

function CountryPicker({
    countries,
    value,
    onChange,
    supportsEmoji,
    inputBg,
    panelBg,
    textColor,
    subTextColor,
    border,
    accentSolid,
    activeRowBg,
}: {
    countries: Country[];
    value: string;
    onChange: (id: string) => void;
    supportsEmoji: boolean;
    inputBg: string;
    panelBg: string;
    textColor: string;
    subTextColor: string;
    border: string;
    accentSolid: string;
    activeRowBg: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);

    const selected = countries.find((c) => c.id === value);
    const label = selected
        ? `${supportsEmoji && selected.flag_emoji ? `${selected.flag_emoji} ` : ""}${selected.name_ru}`
        : "Все страны";

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return countries;
        return countries.filter((c) => c.name_ru.toLowerCase().includes(q));
    }, [countries, query]);

    useEffect(() => {
        if (!open) return;
        function onDocClick(e: MouseEvent) {
            if (!rootRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    return (
        <div ref={rootRef} style={{ position: "relative" }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "11px 12px",
                    borderRadius: 12,
                    border,
                    background: inputBg,
                    color: textColor,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                }}
            >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {label}
                </span>
                <ChevronDown
                    size={18}
                    style={{
                        flexShrink: 0,
                        opacity: 0.7,
                        transform: open ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s ease",
                    }}
                />
            </button>

            {open && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        borderRadius: 14,
                        border,
                        background: panelBg,
                        boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 12px",
                            borderBottom: border,
                        }}
                    >
                        <Search size={16} color={subTextColor} style={{ flexShrink: 0 }} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Поиск страны…"
                            autoFocus
                            style={{
                                flex: 1,
                                border: "none",
                                background: "transparent",
                                color: textColor,
                                fontSize: 14,
                                fontWeight: 500,
                                outline: "none",
                            }}
                        />
                        {(value || query) && (
                            <button
                                type="button"
                                title="Сбросить"
                                onClick={() => {
                                    onChange("");
                                    setQuery("");
                                    setOpen(false);
                                }}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    color: subTextColor,
                                    cursor: "pointer",
                                    padding: 2,
                                    display: "flex",
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <ul
                        style={{
                            listStyle: "none",
                            margin: 0,
                            padding: 6,
                            maxHeight: 260,
                            overflowY: "auto",
                        }}
                    >
                        <li>
                            <button
                                type="button"
                                onClick={() => {
                                    onChange("");
                                    setOpen(false);
                                    setQuery("");
                                }}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "9px 10px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: value === "" ? activeRowBg : "transparent",
                                    color: value === "" ? accentSolid : textColor,
                                    fontWeight: value === "" ? 800 : 600,
                                    fontSize: 14,
                                    cursor: "pointer",
                                }}
                            >
                                Все страны
                            </button>
                        </li>
                        {filtered.length === 0 ? (
                            <li style={{ padding: "12px 10px", color: subTextColor, fontSize: 13 }}>
                                Ничего не найдено
                            </li>
                        ) : (
                            filtered.map((c) => (
                                <li key={c.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onChange(c.id);
                                            setOpen(false);
                                            setQuery("");
                                        }}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "9px 10px",
                                            borderRadius: 10,
                                            border: "none",
                                            background: value === c.id ? activeRowBg : "transparent",
                                            color: value === c.id ? accentSolid : textColor,
                                            fontWeight: value === c.id ? 800 : 600,
                                            fontSize: 14,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {supportsEmoji && c.flag_emoji ? `${c.flag_emoji} ` : ""}
                                        {c.name_ru}
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

function StatCard({
    label,
    value,
    sub,
    accent,
    cardBg,
    cardBorder,
    labelColor,
}: {
    label: string;
    value: string;
    sub?: string;
    accent: string;
    cardBg: string;
    cardBorder: string;
    labelColor: string;
}) {
    return (
        <div
            style={{
                flex: 1,
                minWidth: 120,
                padding: "16px 18px",
                borderRadius: 16,
                background: cardBg,
                border: cardBorder,
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: labelColor,
                    marginBottom: 6,
                }}
            >
                {label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: accent, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: 12, color: labelColor, marginTop: 4, fontWeight: 600 }}>{sub}</div>
            )}
        </div>
    );
}

export function UserStatsPage({ userId, theme = "dark-blue" }: Props) {
    const API_URL = (import.meta as any).env?.VITE_API_URL || "";
    const myUserId = localStorage.getItem("user_id");
    const isOwnProfile = myUserId === userId;
    const myAvatarUrl = useAvatarUrl();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [data, setData] = useState<ScoreFiltered[]>([]);
    const [participationYears, setParticipationYears] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
    const [profileUsername, setProfileUsername] = useState<string | null>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [cropOpen, setCropOpen] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarDeleting, setAvatarDeleting] = useState(false);

    const [countries, setCountries] = useState<Country[]>([]);
    const [selectedCountry, setSelectedCountry] = useState("");

    const [selectedYear, setSelectedYear] = useState<string>("");
    const [filterType, setFilterType] = useState<string>("");
    const [qualifiedFilter, setQualifiedFilter] = useState<string>(""); // "" = все, "qualified", "not-qualified"

    const supportsEmoji = getDoesBrowserSupportFlagEmojis();
    const [sort, setSort] = useState<SortType>("score");

    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!API_URL) return;
        fetch(`${API_URL}/v1/countries`)
            .then((r) => r.json())
            .then(setCountries)
            .catch(() => setCountries([]));
    }, []);

    useEffect(() => {
        load();
    }, [userId, selectedCountry, selectedYear, sort === "time" ? "time" : "score"]);

    useEffect(() => {
        if (!API_URL || !userId) {
            setParticipationYears([]);
            return;
        }
        const params = new URLSearchParams();
        params.append("user_id", userId);
        params.append("sort", "score");
        fetch(`${API_URL}/v1/scores?${params.toString()}`)
            .then((r) => r.json())
            .then((json: ScoreFiltered[]) => {
                if (!Array.isArray(json)) {
                    setParticipationYears([]);
                    return;
                }
                const years = [
                    ...new Set(
                        json
                            .map((item) => item.ContestYear)
                            .filter((y): y is number => typeof y === "number" && y > 0)
                    ),
                ].sort((a, b) => b - a);
                setParticipationYears(years);
            })
            .catch(() => setParticipationYears([]));
    }, [userId]);

    useEffect(() => {
        fetchUserPublic(userId)
            .then((u) => {
                setProfileUsername(u.username);
                setProfileAvatar(u.avatar_url ?? null);
            })
            .catch(() => {
                setProfileUsername(null);
                setProfileAvatar(null);
            });
    }, [userId]);

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
            params.append("sort", sort === "time" ? "time" : "score");

            const res = await fetch(`${API_URL}/v1/scores?${params.toString()}`);
            const json = await res.json();
            setData(Array.isArray(json) ? json : []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    const filteredData = useMemo(() => {
        let res = [...data];
        if (filterType === "final") {
            res = res.filter(item => item.ContestType === "final" || item.ContestType === "Финал");
        } else if (filterType === "semifinal") {
            res = res.filter(item => item.ContestType?.includes("semifinal"));

            if (qualifiedFilter === "qualified") {
                res = res.filter(item => item.Qualified === true);
            } else if (qualifiedFilter === "not-qualified") {
                res = res.filter(item => item.Qualified === false || item.Qualified === null || item.Qualified === undefined);
            }
        }

        if (filterType === "final" && sort === "place") {
            res.sort((a, b) => (a.Place ?? Infinity) - (b.Place ?? Infinity));
        }

        return res;
    }, [data, filterType, qualifiedFilter, sort]);

    const avgScore =
        filteredData.length > 0
            ? filteredData.reduce((sum, i) => sum + (i.Score || 0), 0) / filteredData.length
            : 0;

    const isLight = theme === "light";
    const isGray = theme === "dark-gray";

    const pageBg = isLight
        ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79, 124, 255, 0.08), transparent), #f1f5f9"
        : isGray
          ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.04), transparent), #0f0f0f"
          : "radial-gradient(ellipse 80% 55% at 50% -15%, rgba(79,124,255,0.22), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(124,77,255,0.12), transparent), #020617";

    const textColor = isLight ? "#0f172a" : "#f8fafc";
    const subTextColor = isLight ? "#64748b" : "#94a3b8";
    const accent = isLight ? "#4f46e5" : isGray ? "#a5b4fc" : "#7aa2ff";
    const accentSolid = isLight ? "#4f46e5" : isGray ? "#6366f1" : "#4f7cff";

    const surfaceBg = isLight ? "#ffffff" : isGray ? "#1a1a1a" : "rgba(15, 23, 42, 0.55)";
    const surfaceBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2a2a2a" : "1px solid rgba(148, 163, 184, 0.12)";
    const surfaceShadow = isLight
        ? "0 4px 24px rgba(15, 23, 42, 0.06)"
        : "0 8px 32px rgba(0, 0, 0, 0.35)";

    const heroGradient = isLight
        ? "linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.04))"
        : isGray
          ? "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(55, 65, 81, 0.2))"
          : "linear-gradient(135deg, rgba(79, 124, 255, 0.18), rgba(124, 77, 255, 0.1))";

    const chipColors: ChipColors = {
        activeBg: accentSolid,
        activeColor: "#fff",
        idleBg: isLight ? "rgba(15, 23, 42, 0.04)" : "rgba(255, 255, 255, 0.05)",
        idleColor: subTextColor,
        border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.08)",
        activeShadow: isLight
            ? "0 4px 14px rgba(79, 70, 229, 0.25)"
            : "0 4px 14px rgba(79, 124, 255, 0.35)",
    };

    const btnBorder = isLight ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.1)";
    const btnGhostBg = isLight ? "#fff" : isGray ? "#252525" : "rgba(30, 41, 59, 0.6)";
    const inputBg = isLight ? "#f8fafc" : isGray ? "#252525" : "rgba(15, 23, 42, 0.8)";
    const activeRowBg = isLight ? "rgba(79, 70, 229, 0.1)" : "rgba(79, 124, 255, 0.15)";

    const sortedCountries = useMemo(
        () => [...countries].sort((a, b) => a.name_ru.localeCompare(b.name_ru, "ru")),
        [countries]
    );

    const baseCardBg = isLight ? "#ffffff" : isGray ? "#1c1c1c" : "rgba(30, 41, 59, 0.4)";
    const baseCardBorder = isLight ? "1px solid #e2e8f0" : isGray ? "1px solid #2d2d2d" : "1px solid rgba(255, 255, 255, 0.06)";

    const contestTagColor = isLight ? "#1f2937" : isGray ? "#9ca3af" : "#7aa2ff";
    const artistColor = isLight ? "#0f172a" : "#e2e8f0";

    const scoreBoxBg = isLight ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 209, 102, 0.1)";
    const scoreBoxBorder = isLight ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(255, 209, 102, 0.2)";
    const scoreValColor = isLight ? "#d97706" : "#ffd166";

    const commentBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(122, 162, 255, 0.08)";
    const commentBorder = isLight ? "4px solid #374151" : isGray ? "4px solid #6b7280" : "4px solid #4f7cff";
    const commentTextColor = isLight ? "#374151" : isGray ? "#e5e7eb" : "#7aa2ff";

    const placeWords: Record<number, string> = {
        1: "Первое место",
        2: "Второе место",
        3: "Третье место",
    };

    const displayUsername = profileUsername ?? data?.[0]?.Username;
    const displayAvatar = isOwnProfile ? profileAvatar ?? myAvatarUrl : profileAvatar;

    async function handleAvatarConfirm(blob: Blob) {
        setAvatarUploading(true);
        try {
            const url = await uploadAvatar(blob);
            setStoredAvatarUrl(url);
            setProfileAvatar(url);
        } finally {
            setAvatarUploading(false);
        }
    }

    async function handleAvatarDelete() {
        if (!displayAvatar) return;
        if (!window.confirm("Удалить аватар?")) return;
        setAvatarDeleting(true);
        try {
            await deleteAvatar();
            setProfileAvatar(null);
        } finally {
            setAvatarDeleting(false);
        }
    }

    const profileActionBtn: CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        borderRadius: 12,
        border: btnBorder,
        background: btnGhostBg,
        color: textColor,
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
    };

    return (
        <div style={{ ...styles.page, background: pageBg, color: textColor }}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setCropFile(file);
                    setCropOpen(true);
                }}
            />

            <AvatarCropModal
                open={cropOpen}
                file={cropFile}
                theme={theme}
                onClose={() => {
                    setCropOpen(false);
                    setCropFile(null);
                }}
                onConfirm={handleAvatarConfirm}
            />

            <div style={styles.container}>
                {/* Profile hero */}
                <section
                    style={{
                        marginBottom: 28,
                        padding: isDesktop ? "28px 32px" : "24px 20px",
                        borderRadius: 24,
                        backgroundColor: isLight ? "#fff" : isGray ? "#1a1a1a" : "rgba(15, 23, 42, 0.55)",
                        backgroundImage: heroGradient,
                        border: surfaceBorder,
                        boxShadow: surfaceShadow,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: isDesktop ? "row" : "column",
                            alignItems: isDesktop ? "center" : "center",
                            gap: isDesktop ? 28 : 20,
                        }}
                    >
                        <div style={{ position: "relative", flexShrink: 0 }}>
                            <div
                                style={{
                                    padding: 4,
                                    borderRadius: "50%",
                                    background: isLight
                                        ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                                        : "linear-gradient(135deg, #4f7cff, #7c4dff)",
                                    boxShadow: isLight
                                        ? "0 8px 24px rgba(79, 70, 229, 0.25)"
                                        : "0 8px 28px rgba(79, 124, 255, 0.35)",
                                }}
                            >
                                <UserAvatar
                                    username={displayUsername}
                                    avatarUrl={displayAvatar}
                                    size={isDesktop ? 104 : 88}
                                    theme={theme}
                                    style={{
                                        borderRadius: "50%",
                                        width: isDesktop ? 104 : 88,
                                        height: isDesktop ? 104 : 88,
                                        boxShadow: "none",
                                    }}
                                />
                            </div>
                            {isOwnProfile && (
                                <button
                                    type="button"
                                    title="Сменить аватар"
                                    disabled={avatarUploading || avatarDeleting}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        position: "absolute",
                                        right: 0,
                                        bottom: 0,
                                        width: 36,
                                        height: 36,
                                        borderRadius: "50%",
                                        border: "2px solid " + (isLight ? "#fff" : isGray ? "#1a1a1a" : "#0f172a"),
                                        background: accentSolid,
                                        color: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: avatarUploading ? "wait" : "pointer",
                                        opacity: avatarUploading ? 0.7 : 1,
                                    }}
                                >
                                    <Camera size={16} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        <div style={{ flex: 1, textAlign: isDesktop ? "left" : "center", minWidth: 0 }}>
                            {isOwnProfile && (
                                <span
                                    style={{
                                        display: "inline-block",
                                        marginBottom: 8,
                                        padding: "4px 10px",
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        background: isLight ? "rgba(79, 70, 229, 0.12)" : "rgba(79, 124, 255, 0.2)",
                                        color: accent,
                                    }}
                                >
                                    Мой профиль
                                </span>
                            )}
                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: isDesktop ? "2rem" : "1.65rem",
                                    fontWeight: 900,
                                    letterSpacing: "-0.03em",
                                    lineHeight: 1.15,
                                    wordBreak: "break-word",
                                }}
                            >
                                {displayUsername || "Пользователь"}
                            </h1>
                            <p style={{ margin: "8px 0 0", color: subTextColor, fontSize: 15, fontWeight: 500 }}>
                                Оценки на Eurovision Voting
                            </p>

                            {participationYears.length > 0 && (
                                <div
                                    style={{
                                        marginTop: 16,
                                        textAlign: isDesktop ? "left" : "center",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 800,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.08em",
                                            color: subTextColor,
                                            marginBottom: 8,
                                        }}
                                    >
                                        Годы участия
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 8,
                                            justifyContent: isDesktop ? "flex-start" : "center",
                                        }}
                                    >
                                        {participationYears.map((year) => {
                                            const yearStr = String(year);
                                            const active = selectedYear === yearStr;
                                            return (
                                                <button
                                                    key={year}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedYear(active ? "" : yearStr)
                                                    }
                                                    style={{
                                                        padding: "6px 14px",
                                                        borderRadius: 999,
                                                        border: active ? "none" : chipColors.border,
                                                        background: active
                                                            ? chipColors.activeBg
                                                            : chipColors.idleBg,
                                                        color: active
                                                            ? chipColors.activeColor
                                                            : chipColors.idleColor,
                                                        fontSize: 14,
                                                        fontWeight: 800,
                                                        cursor: "pointer",
                                                        boxShadow: active
                                                            ? chipColors.activeShadow
                                                            : "none",
                                                    }}
                                                >
                                                    {year}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 12,
                                    marginTop: 20,
                                    justifyContent: isDesktop ? "flex-start" : "center",
                                }}
                            >
                                <StatCard
                                    label="Средняя оценка"
                                    value={`${formatAvg(avgScore)} ★`}
                                    cardBg={isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.2)"}
                                    cardBorder={surfaceBorder}
                                    labelColor={subTextColor}
                                    accent={scoreValColor}
                                />
                                <StatCard
                                    label="В выборке"
                                    value={String(filteredData.length)}
                                    sub={pluralRatings(filteredData.length)}
                                    cardBg={isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.2)"}
                                    cardBorder={surfaceBorder}
                                    labelColor={subTextColor}
                                    accent={accent}
                                />
                            </div>

                            {isOwnProfile && (
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 10,
                                        marginTop: 16,
                                        justifyContent: isDesktop ? "flex-start" : "center",
                                    }}
                                >
                                    <button
                                        type="button"
                                        disabled={avatarUploading || avatarDeleting}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            ...profileActionBtn,
                                            background: accentSolid,
                                            color: "#fff",
                                            border: "none",
                                            opacity: avatarUploading ? 0.7 : 1,
                                            cursor: avatarUploading ? "wait" : "pointer",
                                        }}
                                    >
                                        <Camera size={16} />
                                        {avatarUploading ? "Загрузка…" : "Сменить аватар"}
                                    </button>
                                    {displayAvatar && (
                                        <button
                                            type="button"
                                            disabled={avatarUploading || avatarDeleting}
                                            onClick={() => void handleAvatarDelete()}
                                            style={{
                                                ...profileActionBtn,
                                                color: isLight ? "#b91c1c" : "#f87171",
                                                opacity: avatarDeleting ? 0.7 : 1,
                                                cursor: avatarDeleting ? "wait" : "pointer",
                                            }}
                                        >
                                            <Trash2 size={16} />
                                            {avatarDeleting ? "Удаление…" : "Удалить"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: isDesktop ? "minmax(260px, 300px) 1fr" : "1fr",
                        gap: isDesktop ? 28 : 20,
                        alignItems: "start",
                    }}
                >
                    {/* Filters sidebar */}
                    <aside
                        style={{
                            position: isDesktop ? "sticky" : "static",
                            top: isDesktop ? 88 : undefined,
                            padding: "20px 18px",
                            borderRadius: 20,
                            background: surfaceBg,
                            border: surfaceBorder,
                            boxShadow: surfaceShadow,
                        }}
                    >
                        <h2
                            style={{
                                margin: "0 0 18px",
                                fontSize: 13,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: subTextColor,
                            }}
                        >
                            Фильтры
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <div>
                                <div style={{ ...styles.filterLabel, color: subTextColor }}>Страна</div>
                                <CountryPicker
                                    countries={sortedCountries}
                                    value={selectedCountry}
                                    onChange={setSelectedCountry}
                                    supportsEmoji={supportsEmoji}
                                    inputBg={inputBg}
                                    panelBg={surfaceBg}
                                    textColor={textColor}
                                    subTextColor={subTextColor}
                                    border={surfaceBorder}
                                    accentSolid={accentSolid}
                                    activeRowBg={activeRowBg}
                                />
                            </div>

                            <div>
                                <div style={{ ...styles.filterLabel, color: subTextColor }}>Этап</div>
                                <div style={styles.chipRow}>
                                    <FilterChip
                                        active={filterType === ""}
                                        onClick={() => {
                                            setFilterType("");
                                            setQualifiedFilter("");
                                            if (sort === "place") setSort("score");
                                        }}
                                        colors={chipColors}
                                    >
                                        Все
                                    </FilterChip>
                                    <FilterChip
                                        active={filterType === "final"}
                                        onClick={() => {
                                            setFilterType("final");
                                            setQualifiedFilter("");
                                        }}
                                        colors={chipColors}
                                    >
                                        Финал
                                    </FilterChip>
                                    <FilterChip
                                        active={filterType === "semifinal"}
                                        onClick={() => {
                                            setFilterType("semifinal");
                                            if (sort === "place") setSort("score");
                                        }}
                                        colors={chipColors}
                                    >
                                        Полуфинал
                                    </FilterChip>
                                </div>
                            </div>

                            {filterType === "semifinal" && (
                                <div>
                                    <div style={{ ...styles.filterLabel, color: subTextColor }}>Квалификация</div>
                                    <div style={styles.chipRow}>
                                        <FilterChip active={qualifiedFilter === ""} onClick={() => setQualifiedFilter("")} colors={chipColors}>
                                            Все
                                        </FilterChip>
                                        <FilterChip active={qualifiedFilter === "qualified"} onClick={() => setQualifiedFilter("qualified")} colors={chipColors}>
                                            В финале
                                        </FilterChip>
                                        <FilterChip active={qualifiedFilter === "not-qualified"} onClick={() => setQualifiedFilter("not-qualified")} colors={chipColors}>
                                            Не прошла
                                        </FilterChip>
                                    </div>
                                </div>
                            )}

                            <div>
                                <div style={{ ...styles.filterLabel, color: subTextColor }}>Сортировка</div>
                                <div style={styles.chipRow}>
                                    <FilterChip active={sort === "time"} onClick={() => setSort("time")} colors={chipColors}>
                                        Новые
                                    </FilterChip>
                                    <FilterChip active={sort === "score"} onClick={() => setSort("score")} colors={chipColors}>
                                        По баллу
                                    </FilterChip>
                                    {filterType === "final" && (
                                        <FilterChip active={sort === "place"} onClick={() => setSort("place")} colors={chipColors}>
                                            По месту
                                        </FilterChip>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main content */}
                    <main>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 16,
                                flexWrap: "wrap",
                            }}
                        >
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>
                                Оценки
                            </h2>
                            {loading && (
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: accent,
                                    }}
                                >
                                    <Loader2 size={16} className="ev-spin" />
                                    Обновление…
                                </span>
                            )}
                        </div>

                        {!loading && filteredData.length === 0 && (
                            <div
                                style={{
                                    padding: "48px 24px",
                                    textAlign: "center",
                                    borderRadius: 20,
                                    background: surfaceBg,
                                    border: surfaceBorder,
                                }}
                            >
                                <Star size={40} strokeWidth={1.5} color={subTextColor} style={{ marginBottom: 12, opacity: 0.5 }} />
                                <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Пока нет оценок</p>
                                <p style={{ margin: "8px 0 0", color: subTextColor, fontSize: 14 }}>
                                    Измените фильтры или дождитесь, пока пользователь поставит баллы
                                </p>
                            </div>
                        )}

                        <div
                            style={{
                                ...styles.list,
                                gridTemplateColumns: `repeat(auto-fill, minmax(${isDesktop ? "320px" : "min(100%, 280px)"}, 1fr))`,
                            }}
                        >
                    {filteredData.map((item, i) => {
                        const youtubeId = item.YoutubeLink ? getYouTubeId(item.YoutubeLink) : null;
                        const country = countries.find((c) => c.name_ru === item.CountryName);

                        const isSemifinal = item.ContestType?.includes("semifinal");
                        const hasPlace = item.Place !== undefined && item.Place !== null && item.Place != 0;
                        const isQualified = item.Qualified === true;

                        let itemCardBg = baseCardBg;
                        let itemCardBorder = baseCardBorder;

                        if (hasPlace && item.Place! <= 3) {
                            if (item.Place === 1) {
                                itemCardBg = isLight ? "rgba(250, 204, 21, 0.15)" : "rgba(250, 204, 21, 0.12)";
                                itemCardBorder = "1px solid rgba(250, 204, 21, 0.4)";
                            } else if (item.Place === 2) {
                                itemCardBg = isLight ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.12)";
                                itemCardBorder = "1px solid rgba(148, 163, 184, 0.4)";
                            } else {
                                itemCardBg = isLight ? "rgba(217, 119, 6, 0.15)" : "rgba(217, 119, 6, 0.12)";
                                itemCardBorder = "1px solid rgba(217, 119, 6, 0.4)";
                            }
                        } else if (isSemifinal) {
                            if (isQualified) {
                                itemCardBg = isLight ? "rgba(34, 197, 94, 0.08)" : "rgba(34, 197, 94, 0.12)";
                                itemCardBorder = "1px solid rgba(34, 197, 94, 0.3)";
                            } else {
                                itemCardBg = isLight ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.12)";
                                itemCardBorder = "1px solid rgba(239, 68, 68, 0.3)";
                            }
                        }

                        return (
                            <div key={i} style={{ ...styles.card, background: itemCardBg, border: itemCardBorder }}>
                                <div style={styles.cardMain}>
                                    <div style={styles.meta}>
                                        <div style={{ ...styles.contestTag, color: contestTagColor }}>
                                            {item.ContestYear} • {formatContestType(item.ContestType)}
                                        </div>
                                        <div style={styles.countryRow}>
                                            {supportsEmoji && country?.flag_emoji && (
                                                <span style={styles.flagLarge}>{country.flag_emoji}</span>
                                            )}
                                            <div style={{ ...styles.countryName, color: textColor, wordBreak: "break-word" }}>{item.CountryName}</div>
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

                                {/* Подписи статуса (Qualified / Place) */}
                                {(hasPlace || isSemifinal) && (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto", paddingTop: 12, borderTop: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)" }}>
                                        {hasPlace && (
                                            <span style={{
                                                padding: "4px 12px",
                                                borderRadius: 10,
                                                fontSize: 13,
                                                fontWeight: 800,
                                                textTransform: "uppercase",
                                                ...(item.Place! === 1 ? { background: "#facc15", color: "#000" } :
                                                    item.Place! === 2 ? { background: "#94a3b8", color: "#fff" } :
                                                    item.Place! === 3 ? { background: "#d97706", color: "#fff" } :
                                                    { background: isLight ? "#1f2937" : isGray ? "#374151" : "#4f7cff", color: "#fff" })
                                            }}>
                                                {item.Place! <= 3 ? placeWords[item.Place!] : `${item.Place} место`}
                                            </span>
                                        )}

                                        {isSemifinal && (
                                            <span style={{
                                                padding: "4px 12px",
                                                borderRadius: 10,
                                                fontSize: 13,
                                                fontWeight: 800,
                                                textTransform: "uppercase",
                                                ...(isQualified 
                                                    ? { background: "rgba(34, 197, 94, 0.15)", color: isLight ? "#166534" : "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" } 
                                                    : { background: "rgba(239, 68, 68, 0.15)", color: isLight ? "#991b1b" : "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" })
                                            }}>
                                                {isQualified ? "В финале" : "Не прошла"}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        padding: "24px 16px 48px",
        minHeight: "100%",
        fontFamily: "'Inter', system-ui, sans-serif",
    },

    container: {
        maxWidth: 1280,
        margin: "0 auto",
    },

    filterLabel: {
        fontWeight: 800,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 10,
    },

    chipRow: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
    },

    list: {
        display: "grid",
        gap: 16,
    },

    card: {
        padding: "20px",
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
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
        minWidth: 0,
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
        flexShrink: 0,
    },

    countryName: {
        fontSize: 20,
        fontWeight: 900,
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
    },

    artistInfo: {
        fontSize: 15,
        fontWeight: 600,
        lineHeight: "1.4",
    },

    artist: {
        fontWeight: 700,
    },

    song: {
        fontStyle: "italic",
    },

    scoreContainer: {
        textAlign: "center",
        padding: "10px 16px",
        borderRadius: "18px",
        flexShrink: 0,
    },

    scoreBig: {
        fontSize: 36,
        fontWeight: 900,
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