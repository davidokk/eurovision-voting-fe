import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { getTopPerformances } from "../api/contest";
import type { PerformanceWithScores, Theme } from "../types/contest";
import { PerformanceCardV2 } from "./PerformanceCardV2";
import { EvLoader } from "./EvLoader";

type Props = {
  theme: Theme;
};

export function TopPage({ theme }: Props) {
  const [items, setItems] = useState<PerformanceWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTopPerformances()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const titleColor = isLight ? "#0f172a" : "#fff";
  const muted = isLight ? "#64748b" : "#94a3b8";
  const pillBg = isLight
    ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)"
    : isGray
      ? "linear-gradient(135deg, #6b7280 0%, #374151 100%)"
      : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)";

  return (
    <div
      style={{
        height: "calc(100vh - 72px)",
        overflowY: "auto",
        padding: isMobile ? "20px 14px 40px" : "28px 24px 48px",
      }}
    >
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginBottom: 22,
          textAlign: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            color: "#fff",
            background: pillBg,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <Crown size={15} />
          Топ
        </span>
        <h1
          style={{
            margin: "6px 0 0",
            color: titleColor,
            fontSize: isMobile ? 32 : 44,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          Лучшие выступления
        </h1>
        <p style={{ margin: 0, color: muted, fontSize: 15, maxWidth: 520 }}>
          Все годы, по убыванию среднего балла
        </p>
      </header>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 16px", color: muted }}>
          <EvLoader size="lg" label="Считаем баллы" />
        </div>
      ) : items.length === 0 ? (
        <p style={{ textAlign: "center", color: muted, fontWeight: 650 }}>
          Пока нет оценённых выступлений
        </p>
      ) : (
        <div className="ev-top-grid">
          {items.map((p, index) => (
            <div key={p.performance_id} className="ev-top-card" style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  zIndex: 2,
                  top: 10,
                  left: 10,
                  minWidth: 28,
                  height: 28,
                  padding: "0 8px",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(11, 21, 40, 0.78)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {index + 1}
              </span>
              <PerformanceCardV2
                performance={p}
                votingStarted={false}
                votingEnded
                theme={theme}
                contestType={p.contest_type}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
