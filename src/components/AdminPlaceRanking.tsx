import { useEffect, useMemo, useState } from "react";
import type { PerformanceWithScores } from "../types/contest";

type Item = PerformanceWithScores & { performance_id: string };

type Props = {
  items: Item[];
  onSave: (rankedIds: string[]) => Promise<void>;
  saving: boolean;
};

function label(p: Item) {
  return `${p.country?.flag_emoji ?? ""} ${p.country?.name_ru ?? ""} — ${p.artist}`;
}

export function AdminPlaceRanking({ items, onSave, saving }: Props) {
  const rankedSeed = useMemo(() => {
    const withPlace = items
      .filter((p) => p.place != null && p.place > 0)
      .sort((a, b) => (a.place ?? 0) - (b.place ?? 0));
    return withPlace.map((p) => p.performance_id);
  }, [items]);

  const unranked = useMemo(
    () => items.filter((p) => p.place == null || p.place <= 0),
    [items]
  );

  const [order, setOrder] = useState<string[]>(rankedSeed);
  const [dragId, setDragId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setOrder(rankedSeed);
  }, [rankedSeed.join(",")]);

  const byId = useMemo(() => {
    const m = new Map<string, Item>();
    for (const p of items) m.set(p.performance_id, p);
    return m;
  }, [items]);

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    setOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx = next.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      return next;
    });
  }

  function addToRanking(id: string) {
    setOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function removeFromRanking(id: string) {
    setOrder((prev) => prev.filter((x) => x !== id));
  }

  async function handleSave() {
    setMessage(null);
    try {
      await onSave(order);
      setMessage("Места сохранены");
    } catch {
      setMessage("Не удалось сохранить");
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Расстановка мест</h3>
          <p style={styles.hint}>Перетащите строки, чтобы задать 1, 2, 3… место. Сохраните изменения.</p>
        </div>
        <button type="button" style={styles.saveBtn} disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Сохранение…" : "Сохранить места"}
        </button>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.list}>
        {order.length === 0 && (
          <div style={styles.empty}>Перетащите участников сюда или нажмите «+» в списке ниже</div>
        )}
        {order.map((id, index) => {
          const p = byId.get(id);
          if (!p) return null;
          return (
            <div
              key={id}
              draggable
              onDragStart={() => setDragId(id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId && dragId !== id) reorder(dragId, id);
              }}
              style={{
                ...styles.row,
                opacity: dragId === id ? 0.5 : 1,
                borderColor: dragId === id ? "#4f7cff" : "#24324f",
              }}
            >
              <span style={styles.placeBadge}>{index + 1}</span>
              <span style={styles.dragHandle} title="Перетащить">
                ⠿
              </span>
              <span style={styles.rowLabel}>{label(p)}</span>
              <button type="button" style={styles.removeBtn} onClick={() => removeFromRanking(id)}>
                Убрать
              </button>
            </div>
          );
        })}
      </div>

      {unranked.length > 0 && (
        <div style={styles.pool}>
          <div style={styles.poolTitle}>Без места</div>
          <div style={styles.poolGrid}>
            {unranked.map((p) => (
              <button
                key={p.performance_id}
                type="button"
                style={styles.poolItem}
                onClick={() => addToRanking(p.performance_id)}
              >
                <span style={styles.poolPlus}>+</span>
                <span>{label(p)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: 18, fontWeight: 800, color: "#e6edf7" },
  hint: { margin: "6px 0 0", fontSize: 13, color: "#9fb0d0", maxWidth: 420 },
  saveBtn: {
    padding: "10px 18px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  message: { fontSize: 13, color: "#4ade80", fontWeight: 600 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  empty: {
    padding: 24,
    textAlign: "center",
    color: "#9fb0d0",
    border: "1px dashed #24324f",
    borderRadius: 14,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: "#111a2e",
    borderRadius: 14,
    border: "1px solid #24324f",
    cursor: "grab",
  },
  placeBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    background: "linear-gradient(135deg, #4f7cff, #7c4dff)",
    color: "#fff",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
  dragHandle: { color: "#64748b", fontSize: 18, userSelect: "none" },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: 600, color: "#e6edf7" },
  removeBtn: {
    border: "none",
    background: "rgba(255,255,255,0.06)",
    color: "#9fb0d0",
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
  },
  pool: { marginTop: 8 },
  poolTitle: { fontSize: 13, fontWeight: 700, color: "#9fb0d0", marginBottom: 8 },
  poolGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  poolItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #24324f",
    background: "#0b1220",
    color: "#e6edf7",
    fontSize: 13,
    cursor: "pointer",
  },
  poolPlus: {
    width: 22,
    height: 22,
    borderRadius: 8,
    background: "rgba(79, 124, 255, 0.2)",
    color: "#7aa2ff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
};
