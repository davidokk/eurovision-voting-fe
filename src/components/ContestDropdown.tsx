import type { ContestItem, Theme } from "../types/contest";

type Props = {
  contests: ContestItem[];
  onSelect: (id: string) => void;
  theme?: Theme;
};

export function ContestDropdown({ contests, onSelect, theme = "dark-blue" }: Props) {
  const getBg = () => {
    if (theme === "light") return "rgba(255, 255, 255, 0.98)";
    if (theme === "dark-gray") return "rgba(28, 28, 28, 0.98)";
    return "rgba(15, 23, 42, 0.95)";
  };

  const getBorder = () => {
    if (theme === "light") return "1px solid rgba(0, 0, 0, 0.1)";
    if (theme === "dark-gray") return "1px solid rgba(255, 255, 255, 0.1)";
    return "1px solid rgba(255, 255, 255, 0.08)";
  };

  const getTextColor = () => {
    if (theme === "light") return "#1e293b";
    if (theme === "dark-gray") return "#e5e7eb";
    return "#e6edf7";
  };

  const getHoverBg = () => {
    if (theme === "light") return "rgba(0, 0, 0, 0.06)";
    if (theme === "dark-gray") return "rgba(255, 255, 255, 0.06)";
    return "rgba(79, 124, 255, 0.15)";
  };

  const getYearPillStyle = () => {
    if (theme === "light") {
      return {
        background: "rgba(0, 0, 0, 0.06)",
        color: "#374151",
        border: "1px solid rgba(0, 0, 0, 0.1)",
      };
    }
    if (theme === "dark-gray") {
      return {
        background: "rgba(255, 255, 255, 0.08)",
        color: "#9ca3af",
        border: "1px solid rgba(255, 255, 255, 0.15)",
      };
    }
    return {
      background: "rgba(79, 124, 255, 0.1)",
      color: "#7aa2ff",
      border: "1px solid rgba(79, 124, 255, 0.15)",
    };
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        minWidth: 220,
        background: getBg(),
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: getBorder(),
        borderRadius: 16,
        padding: 6,
        zIndex: 3500,
        boxShadow: theme === "light" 
          ? "0 10px 30px rgba(0,0,0,0.1)" 
          : "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(79, 124, 255, 0.08), inset 0 1px rgba(255, 255, 255, 0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {contests.map((c) => {
        const pillStyle = getYearPillStyle();
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = getHoverBg();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              padding: "12px 16px",
              border: "none",
              borderRadius: 12,
              background: "transparent",
              color: getTextColor(),
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              transition: "background 0.2s ease",
            }}
          >
            <span style={{ letterSpacing: "0.01em", flex: 1, textAlign: "left" }}>
              {c.type}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 8,
                flexShrink: 0,
                marginLeft: 12,
                ...pillStyle,
              }}
            >
              {c.year}
            </span>
          </button>
        );
      })}
    </div>
  );
}
