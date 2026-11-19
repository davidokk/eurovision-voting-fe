import { useEffect, useMemo, useRef, useState } from "react";
import type { ContestsByYear, Theme } from "../types/contest";
import { AuthModal } from "./AuthModal";
import {
  Check,
  Clock,
  Crown,
  Flame,
  LayoutGrid,
  ListOrdered,
  LogOut,
  Moon,
  Music2,
  Sparkles,
  Sun,
  User as UserIcon,
  ChevronDown,
  Table2,
  Trophy,
} from "lucide-react";
import {
  SCORES_VIEW_MODE_OPTIONS,
  readScoresViewMode,
  writeScoresViewMode,
  type ScoresViewMode,
} from "./scores/scoresViewShared";
import { UserAvatar } from "./UserAvatar";
import { useAvatarUrl } from "../hooks/useAvatarUrl";
import { fetchMe, setStoredAvatarUrl } from "../api/user";
import { applyAuthSession } from "../utils/jwt";
import "../styles/topbar.css";

type Props = {
  contests: ContestsByYear;
  onSelectContest: (id: string) => void;
  theme: Theme;
  onSelectTheme: (theme: Theme) => void;
};

const CURRENT_STAGE_PRIORITY = [
  "first-semifinal",
  "second-semifinal",
  "final",
] as const;

function getCurrentContestId(contests: ContestsByYear): string | null {
  const years = Object.keys(contests)
    .map(Number)
    .filter((y) => Number.isFinite(y));
  if (years.length === 0) return null;

  const newestYear = Math.max(...years);
  const stages = contests[String(newestYear)] ?? [];
  if (stages.length === 0) return null;

  for (const type of CURRENT_STAGE_PRIORITY) {
    const found = stages.find((c) => c.type === type);
    if (found) return found.id;
  }
  return stages[0]?.id ?? null;
}

function translateContestType(type: string) {
  switch (type) {
    case "first-semifinal":
      return "Первый полуфинал";
    case "second-semifinal":
      return "Второй полуфинал";
    case "final":
      return "Финал";
    default:
      return type;
  }
}

function shortContestType(type: string) {
  switch (type) {
    case "first-semifinal":
      return "1ПФ";
    case "second-semifinal":
      return "2ПФ";
    case "final":
      return "Финал";
    default:
      return type;
  }
}

function ContestStatusIcons({
  hasScores,
  isCurrent,
  checkSize = 14,
  clockSize = 14,
}: {
  hasScores?: boolean;
  isCurrent?: boolean;
  checkSize?: number;
  clockSize?: number;
}) {
  if (!hasScores && !isCurrent) return null;
  return (
    <>
      {isCurrent && (
        <Clock
          size={clockSize}
          strokeWidth={2.5}
          className="ev-topbar__contest-current-clock"
          aria-label="Текущий этап"
        />
      )}
      {hasScores && (
        <Check
          size={checkSize}
          strokeWidth={3}
          className="ev-topbar__contest-year-check"
          aria-label="Есть оценки"
        />
      )}
    </>
  );
}

const VIEW_ICONS: Record<ScoresViewMode, typeof LayoutGrid> = {
  cards: LayoutGrid,
  "cards-v2": LayoutGrid,
  table: Table2,
  leaderboard: Trophy,
  heatmap: Flame,
  order: ListOrdered,
};

const THEME_OPTIONS: { id: Theme; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Светлая", Icon: Sun },
  { id: "dark-gray", label: "Тёмная серая", Icon: Moon },
  { id: "dark-blue", label: "Тёмная синяя", Icon: Sparkles },
];

type MenuColors = {
  borderColor: string;
  textColor: string;
  subTextColor: string;
  btnBg: string;
  btnHoverBg: string;
  activeColor: string;
  dropdownBg: string;
  isLight: boolean;
  isGray: boolean;
};

function UserAccountMenu({
  onProfile,
  onLogout,
  colors,
}: {
  onProfile: () => void;
  onLogout: () => void;
  colors: MenuColors;
}) {
  const {
    borderColor,
    btnHoverBg,
    activeColor,
    dropdownBg,
  } = colors;

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        minWidth: 220,
        background: dropdownBg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: 12,
        zIndex: 4000,
        boxShadow: colors.isLight
          ? "0 10px 40px rgba(0,0,0,0.15)"
          : "0 20px 60px rgba(0, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <button
        type="button"
        onClick={onProfile}
        style={{
          width: "100%",
          padding: "12px 14px",
          border: "none",
          borderRadius: 10,
          background: btnHoverBg,
          color: activeColor,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <UserIcon size={16} />
        <span>Мой профиль</span>
      </button>
      <button
        type="button"
        onClick={onLogout}
        style={{
          width: "100%",
          padding: "12px 14px",
          border: "none",
          borderRadius: 10,
          background: "rgba(255, 107, 107, 0.1)",
          color: "#ff6b6b",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <LogOut size={16} />
        <span>Выйти</span>
      </button>
    </div>
  );
}

export function Topbar({ contests, onSelectContest, theme, onSelectTheme }: Props) {
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ScoresViewMode>(readScoresViewMode);
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedContestId, setSelectedContestId] = useState<string | null>(
    () => localStorage.getItem("selectedContestId")
  );

  const userMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const contestPickerRef = useRef<HTMLDivElement>(null);

  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem("user_id"));
  const avatarUrl = useAvatarUrl();

  function syncAuthFromStorage() {
    setToken(localStorage.getItem("token"));
    setUsername(localStorage.getItem("username"));
    setUserId(localStorage.getItem("user_id"));
  }

  useEffect(() => {
    const savedId = localStorage.getItem("selectedContestId");
    setSelectedContestId(savedId);
  }, [contests]);

  useEffect(() => {
    syncAuthFromStorage();
    const t = localStorage.getItem("token");
    if (t) {
      fetchMe(t)
        .then((me) => {
          applyAuthSession(t, {
            avatar_url: me.avatar_url ?? null,
            user_id: me.id,
            username: me.username,
          });
          setStoredAvatarUrl(me.avatar_url ?? null);
          syncAuthFromStorage();
        })
        .catch(() => {
          setStoredAvatarUrl(null);
        });
    }
    const onAuth = () => syncAuthFromStorage();
    window.addEventListener("ev-auth-updated", onAuth);
    return () => window.removeEventListener("ev-auth-updated", onAuth);
  }, []);

  useEffect(() => {
    const sync = () => setViewMode(readScoresViewMode());
    window.addEventListener("ev-scores-view-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ev-scores-view-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!viewMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (viewMenuRef.current && !viewMenuRef.current.contains(target)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [viewMenuOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!openYear) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (contestPickerRef.current && !contestPickerRef.current.contains(target)) {
        setOpenYear(null);
      }
    };

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openYear]);

  useEffect(() => {
    if (!userMenuOpen) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [userMenuOpen]);

  function handleLogin(token: string) {
    applyAuthSession(token, { avatar_url: null });
    setToken(token);
    syncAuthFromStorage();
    fetchMe(token)
      .then((me) => {
        applyAuthSession(token, {
          avatar_url: me.avatar_url ?? null,
          user_id: me.id,
          username: me.username,
        });
        setStoredAvatarUrl(me.avatar_url ?? null);
        syncAuthFromStorage();
      })
      .catch(() => {
        setStoredAvatarUrl(null);
      });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user_id");
    localStorage.removeItem("avatar_url");
    setStoredAvatarUrl(null);
    setToken(null);
    setUsername(null);
    window.location.reload();
  }

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const topbarBg = isLight
    ? "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.98) 100%)"
    : isGray
      ? "linear-gradient(180deg, rgba(28, 28, 28, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%)"
      : "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 17, 33, 0.98) 100%)";

  const borderColor = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
  const textColor = isLight ? "#0f172a" : "#e6edf7";
  const subTextColor = isLight ? "#64748b" : "#cbd5e1";
  const btnBg = isLight ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.03)";
  const btnHoverBg = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(79, 124, 255, 0.15)";
  const activeColor = isLight ? "#1f2937" : "#7aa2ff";
  const dropdownBg = isLight
    ? "rgba(255, 255, 255, 0.98)"
    : isGray
      ? "rgba(28, 28, 28, 0.98)"
      : "rgba(15, 23, 42, 0.95)";

  const menuColors: MenuColors = {
    borderColor,
    textColor,
    subTextColor,
    btnBg,
    btnHoverBg,
    activeColor,
    dropdownBg,
    isLight,
    isGray,
  };

  function selectContest(id: string) {
    onSelectContest(id);
    localStorage.setItem("selectedContestId", id);
    setSelectedContestId(id);
    setOpenYear(null);
  }

  const contestYears = Object.keys(contests).sort((a, b) => Number(a) - Number(b));
  const currentContestId = useMemo(() => getCurrentContestId(contests), [contests]);

  const selectedContest = selectedContestId
    ? contestYears
        .flatMap((year) => contests[year] ?? [])
        .find((c) => c.id === selectedContestId)
    : null;

  const isGamePage = window.location.pathname.startsWith("/game");
  const isTopPage = window.location.pathname === "/top";
  const isProfilePage = window.location.pathname.startsWith("/user/");
  const isCountryPage = window.location.pathname.startsWith("/country/");
  const isContestContext = !isGamePage && !isTopPage && !isProfilePage;
  const isContestPage = isContestContext && !isCountryPage;

  const pickerMain = isGamePage
    ? "Игра"
    : isTopPage
      ? "Топ"
      : isProfilePage
        ? "Профиль"
        : (selectedContest?.year ?? "—");

  const pickerSub = isGamePage
    ? "Угадай песню"
    : isTopPage
      ? "Все годы"
      : isProfilePage
        ? (username ?? "Статистика")
        : selectedContest
          ? translateContestType(selectedContest.type)
          : "Конкурс";

  const currentTheme = THEME_OPTIONS.find((option) => option.id === theme) ?? THEME_OPTIONS[2];
  const CurrentThemeIcon = currentTheme.Icon;

  const viewSwitcher = isContestPage ? (
    <div ref={viewMenuRef} className="ev-topbar__view">
      <button
        type="button"
        className={`ev-topbar__view-btn${viewMenuOpen ? " ev-topbar__view-btn--open" : ""}`}
        aria-expanded={viewMenuOpen}
        aria-label="Вид отображения"
        title={SCORES_VIEW_MODE_OPTIONS.find((o) => o.mode === viewMode)?.label}
        onClick={(e) => {
          e.stopPropagation();
          setUserMenuOpen(false);
          setOpenYear(null);
          setViewMenuOpen((open) => !open);
        }}
      >
        {(() => {
          const Icon = VIEW_ICONS[viewMode];
          return <Icon size={18} />;
        })()}
        {!isMobile && (
          <span className="ev-topbar__view-label">
            {SCORES_VIEW_MODE_OPTIONS.find((o) => o.mode === viewMode)?.label}
          </span>
        )}
        {!isMobile && (
          <ChevronDown
            size={14}
            className="ev-topbar__contest-chevron"
            style={{ transform: viewMenuOpen ? "rotate(180deg)" : "none" }}
          />
        )}
      </button>
      {viewMenuOpen && (
        <div className="ev-topbar__view-menu" role="menu">
          {SCORES_VIEW_MODE_OPTIONS.map((opt) => {
            const Icon = VIEW_ICONS[opt.mode];
            const active = viewMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`ev-topbar__view-item${active ? " ev-topbar__view-item--active" : ""}`}
                onClick={() => {
                  setViewMode(opt.mode);
                  writeScoresViewMode(opt.mode);
                  setViewMenuOpen(false);
                }}
              >
                <Icon size={16} />
                <span>
                  <span className="ev-topbar__view-item-label">{opt.label}</span>
                  <span className="ev-topbar__view-item-hint">{opt.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  const themeSwitcher = (
    <button
      type="button"
      className="ev-topbar__view-btn ev-topbar__theme-btn"
      aria-label={`Тема: ${currentTheme.label}`}
      title={currentTheme.label}
      onClick={() => {
        const index = THEME_OPTIONS.findIndex((option) => option.id === theme);
        const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
        onSelectTheme(next.id);
      }}
    >
      <CurrentThemeIcon size={18} />
    </button>
  );

  return (
    <>
      <div
        className={`ev-topbar${isMobile ? " ev-topbar--mobile" : ""}`}
        style={{
          background: topbarBg,
          borderBottom: `1px solid ${borderColor}`,
          color: textColor,
          boxShadow: isLight ? "0 4px 20px rgba(0,0,0,0.05)" : "0 4px 30px rgba(0, 0, 0, 0.3)",
          // @ts-expect-error css variables
          "--ev-topbar-border": borderColor,
          "--ev-topbar-text": textColor,
          "--ev-topbar-sub": subTextColor,
          "--ev-topbar-chip-bg": btnBg,
          "--ev-topbar-hover": btnHoverBg,
          "--ev-topbar-accent": activeColor,
          "--ev-topbar-accent-border": isLight ? "rgba(79, 70, 229, 0.35)" : "rgba(79, 124, 255, 0.45)",
          "--ev-topbar-menu-bg": dropdownBg,
        }}
      >
        <div className="ev-topbar__start">
          <div className="ev-topbar__brand">
            <img
              src="https://www.eurovision.com/static/images/70-heart-sm@2x.c3d0a545227c.webp"
              alt="Eurovision"
              className="ev-topbar__logo"
            />
            {!isMobile && (
              <span className={`ev-topbar__title${isLight ? " ev-topbar__title--light" : ""}`}>
                EUROVISION
              </span>
            )}
          </div>
          {isMobile && viewSwitcher}
        </div>

        {isMobile && (
          <div className="ev-topbar__menu-slot">
            <button
              type="button"
              className="ev-topbar__menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Меню конкурсов"
            >
              <span
                className={`ev-topbar__menu-line${mobileMenuOpen ? " ev-topbar__menu-line--open-top" : ""}`}
              />
              <span
                className={`ev-topbar__menu-line${mobileMenuOpen ? " ev-topbar__menu-line--open-mid" : ""}`}
              />
              <span
                className={`ev-topbar__menu-line${mobileMenuOpen ? " ev-topbar__menu-line--open-bot" : ""}`}
              />
            </button>
          </div>
        )}

        {!isMobile && contestYears.length > 0 && (
          <div ref={contestPickerRef} className="ev-topbar__picker" aria-label="Выбор конкурса">
            <button
              type="button"
              className={`ev-topbar__contest-btn${openYear ? " ev-topbar__contest-btn--open" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenYear(openYear ? null : "__menu__");
              }}
              aria-expanded={Boolean(openYear)}
            >
              <span
                className={`ev-topbar__contest-year-main${
                  String(pickerMain).length > 4 ? " ev-topbar__contest-year-main--text" : ""
                }`}
              >
                {pickerMain}
              </span>
              <span className="ev-topbar__contest-meta">
                <span className="ev-topbar__contest-stage-label">
                  {pickerSub}
                  {isContestContext &&
                    selectedContestId &&
                    selectedContestId === currentContestId && (
                      <Clock
                        size={13}
                        strokeWidth={2.5}
                        className="ev-topbar__contest-current-clock"
                        aria-label="Текущий этап"
                      />
                    )}
                </span>
                <ChevronDown
                  size={14}
                  className="ev-topbar__contest-chevron"
                  style={{ transform: openYear ? "rotate(180deg)" : "none" }}
                />
              </span>
            </button>

            {openYear && (
              <div className="ev-topbar__contest-menu">
                <div className="ev-topbar__contest-menu-scroll">
                  <div className="ev-topbar__contest-years-grid">
                    {contestYears.map((year) => {
                      const items = contests[year] ?? [];
                      const onlyFinal =
                        items.length === 1 && items[0].type === "final";
                      const yearSelected =
                        isContestContext &&
                        items.some((c) => c.id === selectedContestId);

                      if (onlyFinal) {
                        return (
                          <button
                            key={year}
                            type="button"
                            className={`ev-topbar__contest-cell${
                              isContestContext && selectedContestId === items[0].id
                                ? " ev-topbar__contest-cell--active"
                                : ""
                            }`}
                            onClick={() => selectContest(items[0].id)}
                          >
                            <span className="ev-topbar__contest-cell-year">
                              <span>{year}</span>
                              <ContestStatusIcons
                                hasScores={items[0].has_scores}
                                isCurrent={items[0].id === currentContestId}
                              />
                            </span>
                          </button>
                        );
                      }

                      return (
                        <div
                          key={year}
                          className={`ev-topbar__contest-cell ev-topbar__contest-cell--multi${
                            yearSelected ? " ev-topbar__contest-cell--active" : ""
                          }`}
                        >
                          <div className="ev-topbar__contest-cell-year">{year}</div>
                          <div className="ev-topbar__contest-cell-stages">
                            {items.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className={`ev-topbar__contest-pill${
                                  isContestContext && selectedContestId === c.id
                                    ? " ev-topbar__contest-pill--active"
                                    : ""
                                }`}
                                onClick={() => selectContest(c.id)}
                                title={translateContestType(c.type)}
                              >
                                <span>{shortContestType(c.type)}</span>
                                <ContestStatusIcons
                                  hasScores={c.has_scores}
                                  isCurrent={c.id === currentContestId}
                                  checkSize={12}
                                  clockSize={12}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <a
                  href="/top"
                  className={`ev-topbar__contest-game${
                    isTopPage ? " ev-topbar__contest-game--active" : ""
                  }`}
                  onClick={() => setOpenYear(null)}
                >
                  <Crown size={16} />
                  <span>Топ</span>
                </a>
                <a
                  href="/game"
                  className={`ev-topbar__contest-game${
                    isGamePage ? " ev-topbar__contest-game--active" : ""
                  }`}
                  onClick={() => setOpenYear(null)}
                >
                  <Music2 size={16} />
                  <span>Угадай песню</span>
                </a>
              </div>
            )}
          </div>
        )}

        <div className="ev-topbar__actions">
          {!isMobile && viewSwitcher}
          {themeSwitcher}
          {!token ? (
            <>
              <button
                type="button"
                className="ev-topbar__login"
                style={{
                  padding: isMobile ? "7px 10px" : "10px 24px",
                  borderRadius: 14,
                  border: "none",
                  background: isLight
                    ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)"
                    : isGray
                      ? "linear-gradient(135deg, #6b7280 0%, #374151 100%)"
                      : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: 800,
                  boxShadow: isLight
                    ? "0 6px 20px rgba(31, 41, 55, 0.25)"
                    : "0 6px 20px rgba(79, 124, 255, 0.3)",
                }}
                onClick={() => setAuthMode("signin")}
              >
                Войти
              </button>
            </>
          ) : (
            <div ref={userMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? 0 : 10,
                  padding: isMobile ? 4 : "6px 12px 6px 8px",
                  borderRadius: 14,
                  border: `1px solid ${userMenuOpen ? activeColor : borderColor}`,
                  background: userMenuOpen ? btnHoverBg : btnBg,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <UserAvatar
                  username={username}
                  avatarUrl={avatarUrl}
                  size={isMobile ? 36 : 32}
                  theme={theme}
                  style={{ borderRadius: "50%" }}
                />
                {!isMobile && (
                  <>
                    <span
                      style={{
                        color: textColor,
                        fontWeight: 700,
                        fontSize: 14,
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {username}
                    </span>
                    <ChevronDown
                      size={16}
                      color={subTextColor}
                      style={{
                        flexShrink: 0,
                        transform: userMenuOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </>
                )}
              </button>

              {userMenuOpen && (
                <UserAccountMenu
                  onProfile={() => {
                    if (userId) window.location.href = `/user/${userId}`;
                    setUserMenuOpen(false);
                  }}
                  onLogout={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  colors={menuColors}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <>
          <div
            style={{
              position: "fixed",
              top: 68,
              left: 0,
              bottom: 0,
              width: 280,
              background: dropdownBg,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderRight: `1px solid ${borderColor}`,
              zIndex: 2200,
              display: "flex",
              flexDirection: "column",
              transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: mobileMenuOpen ? "auto" : "none",
              boxShadow: mobileMenuOpen ? "10px 0 40px rgba(0, 0, 0, 0.4)" : "none",
              overflowY: "auto",
              color: textColor,
            }}
          >
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${borderColor}` }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: subTextColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Годы и конкурсы
              </span>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
              <a
                href="/top"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `1px solid ${isTopPage ? activeColor : borderColor}`,
                  background: isTopPage ? btnHoverBg : btnBg,
                  color: isTopPage ? activeColor : textColor,
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                <Crown size={18} />
                Топ
              </a>
              <a
                href="/game"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `1px solid ${borderColor}`,
                  background: btnBg,
                  color: textColor,
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                <Music2 size={18} />
                Угадай песню
              </a>
              {Object.entries(contests)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([year, items]) => (
                <div key={year} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.length === 1 && items[0].type === "final" ? (
                    <button
                      type="button"
                      className="ev-topbar-mobile-drawer__year-btn"
                      onClick={() => {
                        selectContest(items[0].id);
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        borderColor:
                          selectedContestId === items[0].id ? activeColor : borderColor,
                        background:
                          selectedContestId === items[0].id ? btnHoverBg : btnBg,
                        color:
                          selectedContestId === items[0].id ? activeColor : textColor,
                      }}
                    >
                      <span className="ev-topbar-mobile-drawer__year-row">
                        {year}
                        <ContestStatusIcons
                          hasScores={items[0].has_scores}
                          isCurrent={items[0].id === currentContestId}
                          checkSize={16}
                          clockSize={16}
                        />
                      </span>
                    </button>
                  ) : (
                    <>
                      <div className="ev-topbar-mobile-drawer__year">{year}</div>
                      {items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            selectContest(c.id);
                            setMobileMenuOpen(false);
                          }}
                          className="ev-topbar-mobile-drawer__stage"
                          style={{
                            borderColor:
                              selectedContestId === c.id ? activeColor : borderColor,
                            background:
                              selectedContestId === c.id ? btnHoverBg : btnBg,
                            color:
                              selectedContestId === c.id ? activeColor : textColor,
                          }}
                        >
                          <span className="ev-topbar-mobile-drawer__year-row">
                            {translateContestType(c.type)}
                            <ContestStatusIcons
                              hasScores={c.has_scores}
                              isCurrent={c.id === currentContestId}
                              checkSize={14}
                              clockSize={14}
                            />
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed",
              top: 68,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 2150,
              opacity: mobileMenuOpen ? 1 : 0,
              transition: "opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: mobileMenuOpen ? "auto" : "none",
            }}
          />
        </>
      )}

      {authMode && (
        <AuthModal
          theme={theme}
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={(t) => {
            handleLogin(t);
            setAuthMode(null);
          }}
        />
      )}
    </>
  );
}
