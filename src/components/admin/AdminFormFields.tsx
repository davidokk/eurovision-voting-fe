import { useEffect, useMemo, useRef, useState } from "react";
import type { Country } from "../../api/admin";
import { AdminDatePicker } from "./AdminDatePicker";

export type ContestFormValues = {
    year: number;
    type: string;
    starts: string;
    ends: string;
};

export const CONTEST_TYPE_OPTIONS = [
    { value: "final", label: "Финал", short: "Финал" },
    { value: "first-semifinal", label: "Первый полуфинал", short: "ПС1" },
    { value: "second-semifinal", label: "Второй полуфинал", short: "ПС2" },
] as const;

export function contestTypeLabel(type: string) {
    return CONTEST_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

export function isoToDatetimeLocal(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultDatetimeLocal(offsetHours: number) {
    const d = new Date(Date.now() + offsetHours * 3600_000);
    return isoToDatetimeLocal(d.toISOString());
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, onClose]);
}

export function AdminField({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label style={ui.field}>
            <span style={ui.fieldLabel}>{label}</span>
            {hint && <span style={ui.fieldHint}>{hint}</span>}
            {children}
        </label>
    );
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} style={{ ...ui.input, ...props.style }} />;
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} style={{ ...ui.select, ...props.style }} />;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function splitDatetimeLocal(local: string) {
    if (!local) {
        return { date: "", hour: "20", minute: "00" };
    }
    const [datePart, timePart = "20:00"] = local.split("T");
    const [h = "20", m = "00"] = timePart.split(":");
    const hour = String(Math.min(23, Math.max(0, parseInt(h, 10) || 0))).padStart(2, "0");
    const minute = String(Math.min(59, Math.max(0, parseInt(m, 10) || 0))).padStart(2, "0");
    return { date: datePart, hour, minute };
}

function joinDatetimeLocal(date: string, hour: string, minute: string) {
    if (!date) return "";
    return `${date}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function formatDatetimePreview(local: string) {
    if (!local) return "";
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("ru-RU", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function AdminDateTimeField({
    label,
    hint,
    value,
    onChange,
    stacked,
}: {
    label: string;
    hint?: string;
    value: string;
    onChange: (v: string) => void;
    stacked?: boolean;
}) {
    const { date, hour, minute } = splitDatetimeLocal(value);

    function patch(next: Partial<{ date: string; hour: string; minute: string }>) {
        const d = next.date ?? date;
        const h = next.hour ?? hour;
        const m = next.minute ?? minute;
        onChange(joinDatetimeLocal(d, h, m));
    }

    return (
        <AdminField label={label} hint={hint}>
            <div
                style={{
                    ...ui.dateTimeGrid,
                    gridTemplateColumns: stacked ? "1fr" : "1fr 1fr",
                }}
            >
                <div style={ui.dateTimeCol}>
                    <span style={ui.partLabel}>Дата</span>
                    <AdminDatePicker value={date} onChange={(d) => patch({ date: d })} />
                </div>
                <div style={ui.dateTimeCol}>
                    <span style={ui.partLabel}>Время</span>
                    <div style={ui.timeRow}>
                        <AdminSelect
                            value={hour}
                            onChange={(e) => patch({ hour: e.target.value })}
                            aria-label="Часы"
                        >
                            {HOUR_OPTIONS.map((h) => (
                                <option key={h} value={h}>
                                    {h}
                                </option>
                            ))}
                        </AdminSelect>
                        <span style={ui.timeColon}>:</span>
                        <AdminSelect
                            value={minute}
                            onChange={(e) => patch({ minute: e.target.value })}
                            aria-label="Минуты"
                        >
                            {MINUTE_OPTIONS.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </AdminSelect>
                    </div>
                </div>
            </div>
            {value && <div style={ui.datetimePreview}>{formatDatetimePreview(value)}</div>}
        </AdminField>
    );
}

export function AdminTypePicker({
    value,
    onChange,
    compact,
}: {
    value: string;
    onChange: (v: string) => void;
    compact?: boolean;
}) {
    return (
        <div style={{ ...ui.typeRow, flexDirection: compact ? "column" : "row" }}>
            {CONTEST_TYPE_OPTIONS.map((t) => {
                const active = value === t.value;
                return (
                    <button
                        key={t.value}
                        type="button"
                        style={{
                            ...ui.typeBtn,
                            ...(active ? ui.typeBtnActive : {}),
                            flex: compact ? undefined : 1,
                        }}
                        onClick={() => onChange(t.value)}
                    >
                        {compact ? t.short : t.label}
                    </button>
                );
            })}
        </div>
    );
}

export function AdminCountrySelect({
    countries,
    value,
    onChange,
    placeholder = "Выберите страну",
}: {
    countries: Country[];
    value: string;
    onChange: (id: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setOpen(false));

    const selected = countries.find((c) => c.id === value);
    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return countries;
        return countries.filter(
            (c) =>
                c.name_ru.toLowerCase().includes(qq) ||
                c.flag_emoji.includes(qq)
        );
    }, [countries, q]);

    return (
        <div ref={ref} style={ui.selectWrap}>
            <button
                type="button"
                style={ui.selectTrigger}
                onClick={() => setOpen((v) => !v)}
            >
                <span style={ui.selectValue}>
                    {selected ? (
                        <>
                            <span>{selected.flag_emoji}</span>
                            <span>{selected.name_ru}</span>
                        </>
                    ) : (
                        <span style={ui.placeholder}>{placeholder}</span>
                    )}
                </span>
                <span style={ui.chevron}>{open ? "▴" : "▾"}</span>
            </button>
            {open && (
                <div style={ui.dropdown}>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Поиск…"
                        style={ui.dropdownSearch}
                        autoFocus
                    />
                    <div style={ui.dropdownList}>
                        {filtered.length === 0 && (
                            <div style={ui.dropdownEmpty}>Ничего не найдено</div>
                        )}
                        {filtered.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                style={{
                                    ...ui.dropdownItem,
                                    ...(c.id === value ? ui.dropdownItemActive : {}),
                                }}
                                onClick={() => {
                                    onChange(c.id);
                                    setOpen(false);
                                    setQ("");
                                }}
                            >
                                <span style={ui.dropdownFlag}>{c.flag_emoji}</span>
                                <span>{c.name_ru}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function ContestFormFields({
    value,
    onChange,
    compact,
}: {
    value: ContestFormValues;
    onChange: (v: ContestFormValues) => void;
    compact?: boolean;
}) {
    return (
        <div style={ui.formGrid}>
            <AdminField label="Год">
                <AdminInput
                    type="number"
                    min={2000}
                    max={2100}
                    value={value.year}
                    onChange={(e) =>
                        onChange({ ...value, year: parseInt(e.target.value, 10) || value.year })
                    }
                />
            </AdminField>

            <AdminField label="Тип конкурса">
                <AdminTypePicker
                    value={value.type}
                    onChange={(type) => onChange({ ...value, type })}
                    compact={compact}
                />
            </AdminField>

            <AdminDateTimeField
                label="Начало голосования"
                hint="Когда открывается приём оценок"
                value={value.starts}
                onChange={(starts) => onChange({ ...value, starts })}
                stacked={compact}
            />

            <AdminDateTimeField
                label="Конец голосования"
                hint="После этого времени оценки закрыты"
                value={value.ends}
                onChange={(ends) => onChange({ ...value, ends })}
                stacked={compact}
            />
        </div>
    );
}

export function AdminPrimaryButton({
    children,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button type="button" {...props} style={{ ...ui.primaryBtn, ...props.style }}>
            {children}
        </button>
    );
}

export function AdminSecondaryButton({
    children,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button type="button" {...props} style={{ ...ui.secondaryBtn, ...props.style }}>
            {children}
        </button>
    );
}

export const adminFormCardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(79, 124, 255, 0.22)",
    background: "linear-gradient(165deg, rgba(17, 26, 46, 0.98) 0%, rgba(11, 18, 32, 0.98) 100%)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35), inset 0 1px rgba(255,255,255,0.04)",
};

const ui: Record<string, React.CSSProperties> = {
    formGrid: { display: "flex", flexDirection: "column", gap: 12 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: 800, color: "#cbd5e1", letterSpacing: "0.02em" },
    fieldHint: { fontSize: 11, color: "#64748b", marginTop: -2 },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "11px 14px",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(8, 14, 28, 0.85)",
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: 600,
        outline: "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
    },
    select: {
        flex: 1,
        minWidth: 0,
        boxSizing: "border-box",
        padding: "11px 12px",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(8, 14, 28, 0.85)",
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: 600,
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8 0 0h12z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 32,
    },
    dateTimeGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
    },
    dateTimeCol: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
    partLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" },
    timeRow: { display: "flex", alignItems: "center", gap: 6 },
    timeColon: { color: "#64748b", fontWeight: 800, fontSize: 16, flexShrink: 0 },
    datetimePreview: {
        fontSize: 12,
        color: "#7aa2ff",
        fontWeight: 600,
        padding: "8px 10px",
        borderRadius: 10,
        background: "rgba(79, 124, 255, 0.08)",
        border: "1px solid rgba(79, 124, 255, 0.15)",
    },
    typeRow: { display: "flex", gap: 6, flexWrap: "wrap" },
    typeBtn: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.15)",
        background: "rgba(15, 23, 42, 0.8)",
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.15s",
    },
    typeBtnActive: {
        border: "1px solid rgba(79, 124, 255, 0.55)",
        background: "linear-gradient(135deg, rgba(79, 124, 255, 0.28), rgba(124, 77, 255, 0.2))",
        color: "#fff",
        boxShadow: "0 4px 16px rgba(79, 124, 255, 0.25)",
    },
    selectWrap: { position: "relative", width: "100%" },
    selectTrigger: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "11px 14px",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(8, 14, 28, 0.85)",
        color: "#f8fafc",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
    },
    selectValue: { display: "flex", alignItems: "center", gap: 8, overflow: "hidden" },
    placeholder: { color: "#64748b", fontWeight: 500 },
    chevron: { color: "#64748b", fontSize: 11, flexShrink: 0 },
    dropdown: {
        position: "absolute",
        zIndex: 50,
        top: "calc(100% + 6px)",
        left: 0,
        right: 0,
        borderRadius: 14,
        border: "1px solid rgba(79, 124, 255, 0.25)",
        background: "#0f172a",
        boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
        overflow: "hidden",
    },
    dropdownSearch: {
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "none",
        borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
        background: "#0b1220",
        color: "#fff",
        fontSize: 13,
        outline: "none",
    },
    dropdownList: { maxHeight: 220, overflowY: "auto" },
    dropdownEmpty: { padding: 14, color: "#64748b", fontSize: 13, textAlign: "center" },
    dropdownItem: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: "none",
        background: "transparent",
        color: "#e2e8f0",
        cursor: "pointer",
        fontSize: 14,
        textAlign: "left",
    },
    dropdownItemActive: { background: "rgba(79, 124, 255, 0.15)" },
    dropdownFlag: { fontSize: 18, width: 24, textAlign: "center" },
    primaryBtn: {
        padding: "12px 18px",
        borderRadius: 12,
        border: "none",
        background: "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
        color: "#fff",
        fontWeight: 800,
        fontSize: 14,
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(79, 124, 255, 0.3)",
    },
    secondaryBtn: {
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.2)",
        background: "rgba(15, 23, 42, 0.9)",
        color: "#e2e8f0",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
    },
};
