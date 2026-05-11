import type { ContestItem } from "../types/contest";

type Props = {
  contests: ContestItem[];
  onSelect: (id: string) => void;
};

export function ContestDropdown({
  contests,
  onSelect,
}: Props) {
  return (
    <div style={styles.dropdown}>
      {contests.map((contest) => (
        <div
          key={contest.id}
          style={styles.item}
          onClick={() => onSelect(contest.id)}
        >
          {contest.type}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dropdown: {
    position: "absolute",
    top: 42,

    background: "#111a2e",
    border: "1px solid #24324f",

    borderRadius: 10,

    minWidth: 220,
    overflow: "hidden",
    zIndex: 100,
  },

  item: {
    padding: 12,

    cursor: "pointer",

    borderBottom: "1px solid #24324f",

    color: "#e6edf7",
  },
};