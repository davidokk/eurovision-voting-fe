import { useEffect, useState, useMemo } from "react";
import { Play, Star } from "lucide-react";
import { getDoesBrowserSupportFlagEmojis } from "../utils/emojiSupport";
import type { Theme } from "../types/contest";
import { GifPreview } from "./GifPreview";

type ScoreFiltered = {
  Username: string;
  CountryName: string;
  ContestYear: number;
  ContestType: string;
  Score: number;
  Comment: string | null;
  YoutubeLink: string;
  GifURL: string | null;
  Song: string;
  Artist: string;
  Qualified?: boolean;
  Place?: number;
};

type SortType = "time" | "score";

type Country = {
  id: string;
  name_ru: string;
  flag_emoji: string;
};

type ContestMap = Record<
  string,
  {
    id: string;
    type: string;
    year: number;
    starts: string;
    ends: string;
  }[]
>;

type Props = {
  countryId: string;
  theme?: Theme;
};

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com.*v=)([^&?/]+)/i);
  return match?.[1] || null;
}

function formatContestType(type: string) {
  switch (type) {
    case "final":
      return "Финал";
    case "first-semifinal":
      return "Первый полуфинал";
    case "second-semifinal":
      return "Второй полуфинал";
    default:
      return type;
  }
}

function formatAvg(value: number) {
  if (!value || Number.isNaN(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function CountryStatsPage({ countryId, theme = "dark-blue" }: Props) {
  const API_URL = (import.meta as any).env?.VITE_API_URL || "";

  const [data, setData] = useState<ScoreFiltered[]>([]);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [contests, setContests] = useState<ContestMap>({});
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const supportsEmoji = getDoesBrowserSupportFlagEmojis();
  const [sort] = useState<SortType>("score");

  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/v1/countries`)
      .then((r) => r.json())
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/v1/contest`)
      .then((r) => r.json())
      .then(setContests)
      .catch(() => setContests({}));
  }, []);

  useEffect(() => {
    load();
  }, [countryId, selectedYear, sort]);

  async function load() {
    setLoading(true);
    try {
      if (!API_URL) {
        setData([]);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      params.append("country_id", countryId);
      if (selectedYear) params.append("year", selectedYear);
      params.append("sort", sort);

      const res = await fetch(`${API_URL}/v1/scores?${params.toString()}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredData = useMemo(() => {
    if (!filterType) return data;
    return data.filter((item) => item.ContestType === filterType);
  }, [data, filterType]);

  const avgScore =
    filteredData.length > 0
      ? filteredData.reduce((sum, i) => sum + (i.Score || 0), 0) / filteredData.length
      : 0;

  const country = countries.find((c) => c.id === countryId);

  const performances = useMemo(() => {
    const groups: Record<
      string,
      {
        info: ScoreFiltered;
        scores: { Username: string; Score: number; Comment: string | null; GifURL: string | null }[];
        avg: number;
      }
    > = {};

    filteredData.forEach((item) => {
      const key = `${item.ContestYear}-${item.ContestType}-${item.Artist}-${item.Song}`;
      if (!groups[key]) {
        groups[key] = { info: item, scores: [], avg: 0 };
      }
      groups[key].scores.push({
        Username: item.Username,
        Score: item.Score,
        Comment: item.Comment,
        GifURL: item.GifURL,
      });
    });

    return Object.values(groups)
      .map((g) => ({
        ...g,
        avg: g.scores.reduce((s, sc) => s + sc.Score, 0) / g.scores.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [filteredData]);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const text = isLight ? "#0f1a2a" : "#eef2f7";
  const muted = isLight ? "#5a6b80" : "#8fa0b8";
  const accent = isLight ? "#0d7377" : "#e8b931";
  const cardBg = isLight
    ? "rgba(255,255,255,0.92)"
    : isGray
      ? "rgba(28,28,28,0.95)"
      : "rgba(15,23,42,0.78)";
  const border = isLight ? "1px solid #c5d0de" : "1px solid rgba(255,255,255,0.1)";
  const soft = isLight ? "rgba(15,26,42,0.04)" : "rgba(255,255,255,0.04)";
  const activeBg = isLight ? "rgba(13,115,119,0.12)" : "rgba(232,185,49,0.14)";

  const placeWords: Record<number, string> = {
    1: "Первое место",
    2: "Второе место",
    3: "Третье место",
  };

  function chipStyle(active: boolean): React.CSSProperties {
    return {
      padding: "8px 12px",
      borderRadius: 10,
      border: active ? `1px solid ${accent}` : border,
      background: active ? activeBg : soft,
      color: active ? accent : muted,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
    };
  }

  return (
    <div
      style={{
        padding: "28px 20px 64px",
        color: text,
        fontFamily: '"DM Sans", system-ui, sans-serif',
        minHeight: "100%",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: muted,
              marginBottom: 8,
            }}
          >
            Страна
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: '"Syne", sans-serif',
              fontSize: "clamp(1.9rem, 4vw, 2.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {supportsEmoji && country?.flag_emoji && (
              <span style={{ fontSize: "1.1em", lineHeight: 1 }}>{country.flag_emoji}</span>
            )}
            {country?.name_ru || countryId}
          </h1>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 220px) minmax(0, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}
          className="country-stats-top"
        >
          <div
            style={{
              background: cardBg,
              border,
              borderRadius: 18,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              Средний балл
            </div>
            <div
              style={{
                fontFamily: '"Syne", sans-serif',
                fontSize: 40,
                fontWeight: 800,
                color: accent,
                letterSpacing: "-0.04em",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {formatAvg(avgScore)}
              <Star size={20} fill="currentColor" />
            </div>
          </div>

          <div
            style={{
              background: cardBg,
              border,
              borderRadius: 18,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: muted,
                  marginBottom: 8,
                }}
              >
                Этап
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { id: "", label: "Все" },
                  { id: "final", label: "Финал" },
                  { id: "first-semifinal", label: "1-й полуфинал" },
                  { id: "second-semifinal", label: "2-й полуфинал" },
                ].map((opt) => (
                  <button
                    key={opt.id || "all"}
                    type="button"
                    onClick={() => setFilterType(opt.id)}
                    style={chipStyle(filterType === opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: muted,
                  marginBottom: 8,
                }}
              >
                Год
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" onClick={() => setSelectedYear("")} style={chipStyle(selectedYear === "")}>
                  Все
                </button>
                {Object.keys(contests)
                  .sort((a, b) => Number(b) - Number(a))
                  .map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedYear(year)}
                      style={chipStyle(selectedYear === year)}
                    >
                      {year}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 720px) {
            .country-stats-top { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {loading && (
          <div style={{ color: muted, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            Обновление данных...
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {performances.map((perf, i) => {
            const item = perf.info;
            const youtubeId = item.YoutubeLink ? getYouTubeId(item.YoutubeLink) : null;
            const isSemifinal = item.ContestType?.includes("semifinal");
            const hasPlace = item.Place !== undefined && item.Place !== null;

            return (
              <article
                key={i}
                style={{
                  background: cardBg,
                  border,
                  borderRadius: 18,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {youtubeId && (
                  <a
                    href={item.YoutubeLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                      position: "relative",
                      aspectRatio: "16 / 9",
                      background: "#000",
                    }}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.92)",
                          color: "#0b1528",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Play size={16} fill="currentColor" />
                      </span>
                    </span>
                  </a>
                )}

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: accent,
                          marginBottom: 4,
                        }}
                      >
                        {item.ContestYear} · {formatContestType(item.ContestType)}
                      </div>
                      <div
                        style={{
                          fontFamily: '"Syne", sans-serif',
                          fontSize: 17,
                          fontWeight: 800,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.Artist}
                      </div>
                      <div style={{ fontSize: 13, color: muted, fontStyle: "italic", marginTop: 2 }}>
                        {item.Song}
                      </div>
                    </div>
                    <div
                      style={{
                        flexShrink: 0,
                        textAlign: "right",
                        padding: "6px 10px",
                        borderRadius: 12,
                        background: soft,
                        border,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: muted,
                        }}
                      >
                        Средний
                      </div>
                      <div
                        style={{
                          fontFamily: '"Syne", sans-serif',
                          fontSize: 22,
                          fontWeight: 800,
                          color: accent,
                          lineHeight: 1.1,
                        }}
                      >
                        {formatAvg(perf.avg)}
                      </div>
                    </div>
                  </div>

                  {(hasPlace || isSemifinal) && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {hasPlace && (
                        <span
                          style={{
                            padding: "4px 9px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            ...(item.Place! === 1
                              ? { background: "#facc15", color: "#000" }
                              : item.Place! === 2
                                ? { background: "#94a3b8", color: "#fff" }
                                : item.Place! === 3
                                  ? { background: "#d97706", color: "#fff" }
                                  : {
                                      background: isLight ? "#0f1a2a" : accent,
                                      color: isLight ? "#fff" : "#0b1528",
                                    }),
                          }}
                        >
                          {item.Place! <= 3 ? placeWords[item.Place!] : `${item.Place} место`}
                        </span>
                      )}
                      {isSemifinal && (
                        <span
                          style={{
                            padding: "4px 9px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            ...(item.Qualified
                              ? {
                                  background: "rgba(34,197,94,0.15)",
                                  color: isLight ? "#166534" : "#4ade80",
                                  border: "1px solid rgba(34,197,94,0.3)",
                                }
                              : {
                                  background: "rgba(239,68,68,0.15)",
                                  color: isLight ? "#991b1b" : "#f87171",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                }),
                          }}
                        >
                          {item.Qualified ? "В финале" : "Не прошла"}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: "auto",
                      padding: 10,
                      borderRadius: 12,
                      background: soft,
                      border,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: muted,
                      }}
                    >
                      Оценки
                    </div>
                    {perf.scores.map((s, idx) => (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{s.Username}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: accent }}>{s.Score}</span>
                        </div>
                        {s.Comment && (
                          <div style={{ fontSize: 12, color: muted, fontStyle: "italic" }}>
                            «{s.Comment}»
                          </div>
                        )}
                        {s.GifURL && (
                          <GifPreview src={s.GifURL} maxWidth={96} maxHeight={72} style={{ borderRadius: 8 }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
