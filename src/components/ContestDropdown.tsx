import type { ContestItem, Theme } from "../types/contest";

type Props = {
  contests: ContestItem[];
  onSelect: (id: string) => void;
  theme?: Theme;
  selectedContestId?: string | null;
};

export function ContestDropdown({ contests, onSelect, theme = "dark-blue", selectedContestId }: Props) {
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

  const getActiveBg = () => {
    if (theme === "light") return "rgba(79, 70, 229, 0.1)";
    if (theme === "dark-gray") return "rgba(255, 255, 255, 0.08)";
    return "rgba(79, 124, 255, 0.18)";
  };

  const getActiveColor = () => {
    if (theme === "light") return "#4f46e5";
    if (theme === "dark-gray") return "#e5e7eb";
    return "#7aa2ff";
  };

  return (
    <div
      className="ev-contest-dropdown"
      style={{
        background: getBg(),
        border: getBorder(),
        boxShadow:
          theme === "light"
            ? "0 10px 30px rgba(0,0,0,0.1)"
            : "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(79, 124, 255, 0.08), inset 0 1px rgba(255, 255, 255, 0.06)",
      }}
    >
      {contests.map((c) => {
        const isActive = selectedContestId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`ev-contest-dropdown__item${isActive ? " ev-contest-dropdown__item--active" : ""}`}
            style={{
              color: isActive ? getActiveColor() : getTextColor(),
              background: isActive ? getActiveBg() : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = getHoverBg();
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            {c.type}
          </button>
        );
      })}
    </div>
  );
}
