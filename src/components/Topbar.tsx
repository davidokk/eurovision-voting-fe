import { useEffect, useRef, useState } from "react";
import type { ContestsByYear, Theme } from "../types/contest";
import { ContestDropdown } from "./ContestDropdown";
import { AuthModal } from "./AuthModal";
import { Palette, LogOut, User as UserIcon, ChevronDown, Music2 } from "lucide-react";
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

function getThemeLabel(t: Theme) {
  if (t === "light") return "☀️ Светлая";
  if (t === "dark-gray") return "🌑 Темная (серая)";
  return "🌌 Темная (синяя)";
}

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
  theme,
  onSelectTheme,
  onProfile,
  onLogout,
  onClose,
  colors,
  showProfile,
}: {
  theme: Theme;
  onSelectTheme: (t: Theme) => void;
  onProfile: () => void;
  onLogout: () => void;
  onClose: () => void;
  colors: MenuColors;
  showProfile: boolean;
}) {
  const {
    borderColor,
    textColor,
    subTextColor,
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
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: subTextColor,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            paddingLeft: 4,
          }}
        >
          Внешний вид
        </span>
        {(["light", "dark-gray", "dark-blue"] as Theme[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              onSelectTheme(t);
              onClose();
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "none",
              borderRadius: 10,
              background: theme === t ? btnHoverBg : "transparent",
              color: theme === t ? activeColor : textColor,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              textAlign: "left",
            }}
          >
            {getThemeLabel(t)}
          </button>
        ))}
      </div>

      {showProfile && (
        <>
          <div style={{ height: 1, background: borderColor, margin: "2px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
        </>
      )}
    </div>
  );
}

function resolveSelectedYear(contests: ContestsByYear, selectedContestId: string | null) {
  if (!selectedContestId) return null;
  for (const [year, items] of Object.entries(contests)) {
    if (items.some((c) => c.id === selectedContestId)) return year;
  }
  return null;
}

export function Topbar({ contests, onSelectContest, theme, onSelectTheme }: Props) {
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [guestThemeOpen, setGuestThemeOpen] = useState(false);
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedContestId, setSelectedContestId] = useState<string | null>(
    () => localStorage.getItem("selectedContestId")
  );

  const userMenuRef = useRef<HTMLDivElement>(null);
  const guestThemeRef = useRef<HTMLDivElement>(null);
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
    if (!userMenuOpen && !guestThemeOpen) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (guestThemeOpen && guestThemeRef.current && !guestThemeRef.current.contains(target)) {
        setGuestThemeOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [userMenuOpen, guestThemeOpen]);

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

  const selectedYear = resolveSelectedYear(contests, selectedContestId);
  const contestYears = Object.keys(contests).sort((a, b) => Number(a) - Number(b));

  const guestThemeMenu = guestThemeOpen && (
    <UserAccountMenu
      theme={theme}
      onSelectTheme={onSelectTheme}
      onProfile={() => {}}
      onLogout={() => {}}
      onClose={() => setGuestThemeOpen(false)}
      colors={menuColors}
      showProfile={false}
    />
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
        }}
      >
        <div className="ev-topbar__brand">
          <img
            src="https://www.eurovision.com/static/images/70-heart-sm@2x.c3d0a545227c.webp"
            alt="Eurovision"
            className="ev-topbar__logo"
          />
          {!isMobile && (
            <span
              className="ev-topbar__title"
              style={{
                background: isLight
                  ? "linear-gradient(135deg, #1f2937, #4b5563)"
                  : "linear-gradient(135deg, #4f7cff, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              EUROVISION
            </span>
          )}
        </div>

        {isMobile && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
            {contestYears.map((year) => {
              const items = contests[year] ?? [];
              const isOpen = openYear === year;
              const isSelected = selectedYear === year;
              return (
                <div key={year} className={`ev-topbar__year-wrap${isOpen ? " ev-topbar__year-wrap--open" : ""}`}>
                  <button
                    type="button"
                    className={`ev-topbar__year-btn${isOpen ? " ev-topbar__year-btn--open" : ""}${isSelected ? " ev-topbar__year-btn--selected" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenYear(isOpen ? null : year);
                    }}
                    aria-expanded={isOpen}
                  >
                    {year}
                    <span className="ev-topbar__year-chevron" aria-hidden>
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <ContestDropdown
                      theme={theme}
                      selectedContestId={selectedContestId}
                      contests={items.map((c) => ({
                        ...c,
                        type: translateContestType(c.type),
                      }))}
                      onSelect={selectContest}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="ev-topbar__actions">
          <a
            href="/game"
            title="Угадай песню"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: isMobile ? "8px 12px" : "10px 14px",
              borderRadius: 14,
              border: `1px solid ${borderColor}`,
              background: window.location.pathname.startsWith("/game")
                ? btnHoverBg
                : btnBg,
              color: window.location.pathname.startsWith("/game") ? activeColor : subTextColor,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <Music2 size={16} />
            {!isMobile && <span>Игра</span>}
          </a>
          {!token ? (
            <>
              <div ref={guestThemeRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setGuestThemeOpen(!guestThemeOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: isMobile ? "8px 12px" : "10px 16px",
                    borderRadius: 14,
                    border: `1px solid ${borderColor}`,
                    background: btnBg,
                    color: subTextColor,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <Palette size={16} />
                  {!isMobile && <span>{getThemeLabel(theme)}</span>}
                  <ChevronDown
                    size={14}
                    style={{
                      opacity: 0.6,
                      transform: guestThemeOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
                {guestThemeMenu}
              </div>

              <button
                type="button"
                style={{
                  padding: isMobile ? "8px 16px" : "10px 24px",
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
                  theme={theme}
                  onSelectTheme={onSelectTheme}
                  onProfile={() => {
                    if (userId) window.location.href = `/user/${userId}`;
                    setUserMenuOpen(false);
                  }}
                  onLogout={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  onClose={() => setUserMenuOpen(false)}
                  colors={menuColors}
                  showProfile
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
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([year, items]) => (
                <div key={year} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                        borderColor: selectedContestId === c.id ? activeColor : borderColor,
                        background: selectedContestId === c.id ? btnHoverBg : btnBg,
                        color: selectedContestId === c.id ? activeColor : textColor,
                      }}
                    >
                      {translateContestType(c.type)}
                    </button>
                  ))}
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
