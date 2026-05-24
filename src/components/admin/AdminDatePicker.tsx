import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
const MONTHS = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
] as const;

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function parseYmd(value: string): { y: number; m: number; d: number } | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(y, mo, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
    return { y, m: mo, d };
}

function toYmd(y: number, m: number, d: number) {
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function formatDateLabel(value: string) {
    const p = parseYmd(value);
    if (!p) return "";
    const dt = new Date(p.y, p.m, p.d);
    return dt.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function calendarCells(viewYear: number, viewMonth: number) {
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startPad = (first.getDay() + 6) % 7;
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < startPad; i++) {
        cells.push({ day: null, key: `e-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, key: `d-${d}` });
    }
    return cells;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, onClose, enabled]);
}

type Props = {
    value: string;
    onChange: (ymd: string) => void;
    placeholder?: string;
};

export function AdminDatePicker({ value, onChange, placeholder = "Выберите дату" }: Props) {
    const parsed = parseYmd(value);
    const today = new Date();
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.getMonth());
    const wrapRef = useRef<HTMLDivElement>(null);

    useClickOutside(wrapRef, () => setOpen(false), open);

    useEffect(() => {
        if (!open) return;
        const p = parseYmd(value);
        if (p) {
            setViewYear(p.y);
            setViewMonth(p.m);
        }
    }, [open, value]);

    const cells = useMemo(() => calendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

    const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());

    function pickDay(day: number) {
        onChange(toYmd(viewYear, viewMonth, day));
        setOpen(false);
    }

    function shiftMonth(delta: number) {
        let m = viewMonth + delta;
        let y = viewYear;
        while (m < 0) {
            m += 12;
            y -= 1;
        }
        while (m > 11) {
            m -= 12;
            y += 1;
        }
        setViewMonth(m);
        setViewYear(y);
    }

    const yearOptions = useMemo(() => {
        const cur = today.getFullYear();
        const years: number[] = [];
        for (let y = cur - 2; y <= cur + 3; y++) years.push(y);
        return years;
    }, [today]);

    return (
        <div ref={wrapRef} style={s.wrap}>
            <button type="button" style={s.trigger} onClick={() => setOpen((v) => !v)}>
                <span style={value ? s.triggerText : s.triggerPlaceholder}>
                    {value ? formatDateLabel(value) : placeholder}
                </span>
                <span style={s.triggerIcon}>📅</span>
            </button>

            {open && (
                <div style={s.popover} role="dialog" aria-label="Выбор даты">
                    <div style={s.header}>
                        <button type="button" style={s.navBtn} onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
                            ‹
                        </button>
                        <div style={s.headerCenter}>
                            <select
                                style={s.monthSelect}
                                value={viewMonth}
                                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                            >
                                {MONTHS.map((name, i) => (
                                    <option key={name} value={i}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            <select
                                style={s.yearSelect}
                                value={viewYear}
                                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                            >
                                {yearOptions.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button type="button" style={s.navBtn} onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
                            ›
                        </button>
                    </div>

                    <div style={s.weekRow}>
                        {WEEKDAYS.map((wd) => (
                            <div key={wd} style={s.weekCell}>
                                {wd}
                            </div>
                        ))}
                    </div>

                    <div style={s.grid}>
                        {cells.map(({ day, key }) => {
                            if (day === null) {
                                return <div key={key} style={s.emptyCell} />;
                            }
                            const ymd = toYmd(viewYear, viewMonth, day);
                            const selected = value === ymd;
                            const isToday = todayYmd === ymd;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    style={{
                                        ...s.dayCell,
                                        ...(selected ? s.daySelected : {}),
                                        ...(isToday && !selected ? s.dayToday : {}),
                                    }}
                                    onClick={() => pickDay(day)}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    <div style={s.footer}>
                        <button
                            type="button"
                            style={s.footerBtn}
                            onClick={() => {
                                onChange(todayYmd);
                                setViewYear(today.getFullYear());
                                setViewMonth(today.getMonth());
                                setOpen(false);
                            }}
                        >
                            Сегодня
                        </button>
                        {value && (
                            <button
                                type="button"
                                style={s.footerBtnMuted}
                                onClick={() => {
                                    onChange("");
                                    setOpen(false);
                                }}
                            >
                                Сбросить
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    wrap: { position: "relative", width: "100%" },
    trigger: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "11px 14px",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(8, 14, 28, 0.85)",
        color: "#f8fafc",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        textAlign: "left",
    },
    triggerText: { flex: 1 },
    triggerPlaceholder: { flex: 1, color: "#64748b", fontWeight: 500 },
    triggerIcon: { fontSize: 18, opacity: 0.85 },
    popover: {
        position: "absolute",
        zIndex: 80,
        top: "calc(100% + 8px)",
        left: 0,
        width: 320,
        maxWidth: "min(320px, 92vw)",
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(79, 124, 255, 0.3)",
        background: "#0f172a",
        boxShadow: "0 20px 56px rgba(0, 0, 0, 0.55)",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 12,
    },
    headerCenter: { display: "flex", flex: 1, gap: 6, minWidth: 0 },
    monthSelect: {
        flex: 1.4,
        minWidth: 0,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(148, 163, 184, 0.2)",
        background: "#0b1220",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
    },
    yearSelect: {
        flex: 0.8,
        minWidth: 0,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(148, 163, 184, 0.2)",
        background: "#0b1220",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
    },
    navBtn: {
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 10,
        border: "1px solid rgba(148, 163, 184, 0.15)",
        background: "rgba(255,255,255,0.04)",
        color: "#e2e8f0",
        fontSize: 22,
        lineHeight: 1,
        cursor: "pointer",
    },
    weekRow: {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
        marginBottom: 6,
    },
    weekCell: {
        textAlign: "center",
        fontSize: 11,
        fontWeight: 800,
        color: "#64748b",
        padding: "4px 0",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
    },
    emptyCell: { aspectRatio: "1", minHeight: 40 },
    dayCell: {
        aspectRatio: "1",
        minHeight: 40,
        borderRadius: 10,
        border: "1px solid transparent",
        background: "rgba(255,255,255,0.03)",
        color: "#e2e8f0",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        transition: "background 0.12s, border-color 0.12s",
    },
    daySelected: {
        background: "linear-gradient(135deg, #4f7cff, #7c4dff)",
        borderColor: "rgba(79, 124, 255, 0.6)",
        color: "#fff",
        boxShadow: "0 4px 14px rgba(79, 124, 255, 0.35)",
    },
    dayToday: {
        borderColor: "rgba(34, 197, 94, 0.5)",
        color: "#4ade80",
    },
    footer: {
        display: "flex",
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid rgba(148, 163, 184, 0.12)",
    },
    footerBtn: {
        flex: 1,
        padding: "9px 12px",
        borderRadius: 10,
        border: "none",
        background: "rgba(79, 124, 255, 0.2)",
        color: "#93c5fd",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
    },
    footerBtnMuted: {
        padding: "9px 12px",
        borderRadius: 10,
        border: "1px solid rgba(148, 163, 184, 0.15)",
        background: "transparent",
        color: "#94a3b8",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
    },
};
