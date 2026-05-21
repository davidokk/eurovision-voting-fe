import { useMemo } from "react";
import type { PerformanceWithScores, ScoreView } from "../../types/contest";

export type MatrixUser = { user_id: string; username: string };

export type MatrixRow = {
  performance: PerformanceWithScores;
  cells: (ScoreView | undefined)[];
  avg: number | null;
};

export function useScoresMatrix(performances: PerformanceWithScores[]) {
  const users = useMemo(() => {
    const map = new Map<string, MatrixUser>();
    for (const p of performances) {
      for (const s of p.scores) {
        if (!map.has(s.user_id)) {
          map.set(s.user_id, { user_id: s.user_id, username: s.username });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.username.localeCompare(b.username, "ru")
    );
  }, [performances]);

  const rows: MatrixRow[] = useMemo(() => {
    return performances.map((p) => {
      const byUser = new Map(p.scores.map((s) => [s.user_id, s]));
      const cells = users.map((u) => byUser.get(u.user_id));
      const nums = cells.filter((c): c is ScoreView => !!c).map((c) => c.score);
      const avg =
        nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      return { performance: p, cells, avg };
    });
  }, [performances, users]);

  return { users, rows };
}
