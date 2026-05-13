import type { Contest } from "../types/contest";

type Props = {
  contests: Contest[];
  onSelect: (id: string) => void;
};

export function ContestDropdown({ contests, onSelect }: Props) {
  return (
    <div style={styles.dropdown}>
      {contests.map((c) => (
        <button
          key={c.id}
          style={styles.item}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(79, 124, 255, 0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
          onClick={() => onSelect(c.id)}
        >
          <span style={styles.type}>{c.type}</span>
          <span style={styles.year}>{c.year}</span>
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    minWidth: 220,
    background: "rgba(15, 23, 42, 0.92)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 6,
    zIndex: 3000,
    boxShadow: `
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 0 40px rgba(79, 124, 255, 0.08),
      inset 0 1px rgba(255, 255, 255, 0.06)
    `,
  },

  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    color: "#e6edf7",
    cursor: "pointer",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    transition: "background 0.2s ease",
  },

  type: {
    letterSpacing: "0.01em",
    flex: 1,
    textAlign: "left" as const,
  },

  year: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
    background: "rgba(79, 124, 255, 0.1)",
    padding: "3px 10px",
    borderRadius: 8,
    border: "1px solid rgba(79, 124, 255, 0.15)",
    flexShrink: 0,
    marginLeft: 12,
  },
};
