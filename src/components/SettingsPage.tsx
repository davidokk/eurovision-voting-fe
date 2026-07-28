import { useState } from "react";
import {
  LayoutGrid,
  Table2,
  Trophy,
  Flame,
  ListOrdered,
  Clapperboard,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import type { Theme } from "../types/contest";
import {
  SCORES_VIEW_MODE_OPTIONS,
  readScoresViewMode,
  writeScoresViewMode,
  type ScoresViewMode,
} from "./scores/scoresViewShared";

type Props = {
  theme: Theme;
  onSelectTheme: (theme: Theme) => void;
};

const VIEW_ICONS: Record<ScoresViewMode, typeof LayoutGrid> = {
  cards: LayoutGrid,
  "cards-v2": Clapperboard,
  table: Table2,
  leaderboard: Trophy,
  heatmap: Flame,
  order: ListOrdered,
};

const THEME_OPTIONS: { id: Theme; label: string; hint: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Светлая", hint: "Светлый фон и контрастный текст", Icon: Sun },
  { id: "dark-gray", label: "Тёмная серая", hint: "Нейтральный тёмный интерфейс", Icon: Moon },
  { id: "dark-blue", label: "Тёмная синяя", hint: "Классический Eurovision-look", Icon: Sparkles },
];

export function SettingsPage({ theme, onSelectTheme }: Props) {
  const [viewMode, setViewMode] = useState<ScoresViewMode>(readScoresViewMode);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const text = isLight ? "#0f1a2a" : "#eef2f7";
  const muted = isLight ? "#5a6b80" : "#8fa0b8";
  const cardBg = isLight
    ? "rgba(255,255,255,0.92)"
    : isGray
      ? "rgba(28,28,28,0.95)"
      : "rgba(15,23,42,0.85)";
  const border = isLight ? "1px solid #c5d0de" : "1px solid rgba(255,255,255,0.1)";
  const accent = isLight ? "#0d7377" : "#e8b931";
  const soft = isLight ? "rgba(15,26,42,0.04)" : "rgba(255,255,255,0.04)";
  const activeBg = isLight ? "rgba(13,115,119,0.1)" : "rgba(232,185,49,0.12)";

  function pickView(mode: ScoresViewMode) {
    setViewMode(mode);
    writeScoresViewMode(mode);
  }

  return (
    <div
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "32px 20px 64px",
        color: text,
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <header style={{ marginBottom: 36 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: muted,
            marginBottom: 8,
          }}
        >
          Аккаунт
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: '"Syne", sans-serif',
            fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Настройки
        </h1>
        <p style={{ margin: "10px 0 0", color: muted, fontSize: 15, lineHeight: 1.5 }}>
          Тема оформления и вид отображения оценок на странице конкурса.
        </p>
      </header>

      <section
        style={{
          background: cardBg,
          border,
          borderRadius: 20,
          padding: 22,
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            margin: "0 0 6px",
            fontFamily: '"Syne", sans-serif',
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Тема
        </h2>
        <p style={{ margin: "0 0 16px", color: muted, fontSize: 13 }}>
          Выберите внешний вид интерфейса
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {THEME_OPTIONS.map(({ id, label, hint, Icon }) => {
            const active = theme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTheme(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: active ? `1px solid ${accent}` : border,
                  background: active ? activeBg : soft,
                  color: text,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? accent : soft,
                    color: active ? (isLight ? "#fff" : "#0b1528") : muted,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{label}</span>
                  <span style={{ display: "block", fontSize: 12, color: muted, marginTop: 2 }}>
                    {hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        style={{
          background: cardBg,
          border,
          borderRadius: 20,
          padding: 22,
        }}
      >
        <h2
          style={{
            margin: "0 0 6px",
            fontFamily: '"Syne", sans-serif',
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Отображение оценок
        </h2>
        <p style={{ margin: "0 0 16px", color: muted, fontSize: 13 }}>
          Как показывать выступления на главной странице конкурса
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          {SCORES_VIEW_MODE_OPTIONS.map((opt) => {
            const Icon = VIEW_ICONS[opt.mode];
            const active = viewMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => pickView(opt.mode)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 16,
                  borderRadius: 14,
                  border: active ? `1px solid ${accent}` : border,
                  background: active ? activeBg : soft,
                  color: text,
                  cursor: "pointer",
                  textAlign: "left",
                  minHeight: 110,
                }}
              >
                <Icon size={20} color={active ? accent : muted} />
                <span>
                  <span style={{ display: "block", fontWeight: 800, fontSize: 14 }}>{opt.label}</span>
                  <span style={{ display: "block", fontSize: 12, color: muted, marginTop: 4, lineHeight: 1.35 }}>
                    {opt.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
