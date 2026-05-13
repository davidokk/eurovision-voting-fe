import { useEffect, useState } from "react";
import type { ContestsByYear, Theme } from "../types/contest";
import { ContestDropdown } from "./ContestDropdown";
import { AuthModal } from "./AuthModal";
import { Palette, LogOut, User as UserIcon } from "lucide-react";

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

export function Topbar({ contests, onSelectContest, theme, onSelectTheme }: Props) {
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileLogoutOpen, setMobileLogoutOpen] = useState(false);
  const [desktopThemeOpen, setDesktopThemeOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const userId = localStorage.getItem("user_id");

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setUsername(localStorage.getItem("username"));
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleLogin(token: string) {
    localStorage.setItem("token", token);
    setToken(token);
    const savedUsername = localStorage.getItem("username");
    setUsername(savedUsername);
    window.location.reload();
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
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
  const dropdownBg = isLight ? "rgba(255, 255, 255, 0.98)" : isGray ? "rgba(28, 28, 28, 0.98)" : "rgba(15, 23, 42, 0.95)";

  const getThemeLabel = (t: Theme) => {
    if (t === "light") return "☀️ Светлая";
    if (t === "dark-gray") return "🌑 Темная (серая)";
    return "🌌 Темная (синяя)";
  };

  return (
    <>
      <div style={{
        height: 68,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        background: topbarBg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${borderColor}`,
        color: textColor,
        boxShadow: isLight ? "0 4px 20px rgba(0,0,0,0.05)" : "0 4px 30px rgba(0, 0, 0, 0.3)",
        position: "relative",
        zIndex: 3000,
      }}>
        {/* Логотип / название */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 24 }}>
          <img
            src="https://www.eurovision.com/static/images/70-heart-sm@2x.c3d0a545227c.webp"
            alt="Eurovision"
            style={{ width: 28, height: 28, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(79, 124, 255, 0.3))" }}
          />
          <span style={{ fontSize: 16, fontWeight: 1000, letterSpacing: "0.12em", background: isLight ? "linear-gradient(135deg, #1f2937, #4b5563)" : "linear-gradient(135deg, #4f7cff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            EUROVISION
          </span>
        </div>

        {/* Гамбургер-кнопка (мобильная) */}
        {isMobile && (
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                width: 40, height: 40, gap: 5, border: `1px solid ${borderColor}`, borderRadius: 12,
                background: btnBg, cursor: "pointer", padding: 0
              }}
            >
              <span style={{ display: "block", width: 18, height: 2, background: textColor, borderRadius: 2, transition: "all 0.3s ease", transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
              <span style={{ display: "block", width: 18, height: 2, background: textColor, borderRadius: 2, transition: "all 0.3s ease", opacity: mobileMenuOpen ? 0 : 1 }} />
              <span style={{ display: "block", width: 18, height: 2, background: textColor, borderRadius: 2, transition: "all 0.3s ease", transform: mobileMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
            </button>
          </div>
        )}

        {/* Навигация по годам (десктоп) */}
        {!isMobile && (
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, alignItems: "center" }}>
            {Object.entries(contests).map(([year, items]) => (
              <div key={year} style={{ position: "relative" }}>
                <button
                  onClick={() => setOpenYear(openYear === year ? null : year)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 14,
                    border: `1px solid ${openYear === year ? activeColor : borderColor}`,
                    background: openYear === year ? btnHoverBg : btnBg,
                    color: openYear === year ? activeColor : subTextColor,
                    cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all 0.2s ease"
                  }}
                >
                  {year}
                  <span style={{ fontSize: 10, opacity: 0.5, transform: openYear === year ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                </button>

                {openYear === year && (
                  <ContestDropdown
                    theme={theme}
                    contests={items.map((c) => ({ ...c, type: translateContestType(c.type) }))}
                    onSelect={(id) => {
                      onSelectContest(id);
                      localStorage.setItem("selectedContestId", id);
                      setOpenYear(null);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Правая часть: авторизация и выбор темы */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Десктопный выбор темы */}
          {!isMobile && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDesktopThemeOpen(!desktopThemeOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 14,
                  border: `1px solid ${borderColor}`, background: btnBg, color: subTextColor,
                  cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all 0.2s ease"
                }}
              >
                <Palette size={16} />
                <span>{getThemeLabel(theme)}</span>
              </button>

              {desktopThemeOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 180,
                  background: dropdownBg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                  border: `1px solid ${borderColor}`, borderRadius: 14, padding: 6, zIndex: 3500,
                  boxShadow: isLight ? "0 10px 30px rgba(0,0,0,0.1)" : "0 20px 60px rgba(0,0,0,0.5)",
                  display: "flex", flexDirection: "column", gap: 4
                }}>
                  {(["light", "dark-gray", "dark-blue"] as Theme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        onSelectTheme(t);
                        setDesktopThemeOpen(false);
                      }}
                      style={{
                        width: "100%", padding: "10px 14px", border: "none", borderRadius: 10,
                        background: theme === t ? btnHoverBg : "transparent",
                        color: theme === t ? activeColor : textColor,
                        cursor: "pointer", fontSize: 14, fontWeight: 600, textAlign: "left",
                      }}
                    >
                      {getThemeLabel(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!token ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isMobile && (
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setMobileLogoutOpen(!mobileLogoutOpen)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12,
                      border: `1px solid ${borderColor}`, background: btnBg, color: textColor, cursor: "pointer"
                    }}
                  >
                    <Palette size={16} />
                    <span>▾</span>
                  </button>
                </div>
              )}

              <button
                style={{
                  padding: isMobile ? "8px 16px" : "10px 24px",
                  borderRadius: 14, border: "none",
                  background: isGray ? "linear-gradient(135deg, #6b7280 0%, #374151 100%)" : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
                  color: "#fff", cursor: "pointer", fontSize: isMobile ? 12 : 14, fontWeight: 800,
                  boxShadow: "0 6px 20px rgba(79, 124, 255, 0.3)"
                }}
                onClick={() => setAuthMode("signin")}
              >
                Войти
              </button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Десктоп: полный блок */}
              {!isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "6px 6px 6px 14px", borderRadius: 14, border: `1px solid ${borderColor}`, background: btnBg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <a
                      href={userId ? `/user/${userId}` : "#"}
                      style={{
                        width: 32, height: 32, borderRadius: 12,
                        background: isLight ? "linear-gradient(135deg, #4b5563, #1f2937)" : isGray ? "linear-gradient(135deg, #6b7280, #374151)" : "linear-gradient(135deg, #4f7cff, #7c4dff)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 900, color: "#fff", textDecoration: "none"
                      }}
                    >
                      {username?.charAt(0).toUpperCase()}
                    </a>
                    <span style={{ color: textColor, fontWeight: 700, fontSize: 14 }}>{username}</span>
                  </div>

                  <button
                    onClick={logout}
                    style={{ padding: "8px 14px", borderRadius: 12, border: `1px solid ${borderColor}`, background: "transparent", color: subTextColor, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    Выйти
                  </button>
                </div>
              )}

              {/* Мобилка: аватарка для открытия меню (включает выход, профиль и ТЕМЫ!) */}
              {isMobile && (
                <div
                  onClick={() => setMobileLogoutOpen(!mobileLogoutOpen)}
                  style={{ cursor: "pointer", padding: 4 }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: isLight ? "linear-gradient(135deg, #4b5563, #1f2937)" : isGray ? "linear-gradient(135deg, #6b7280, #374151)" : "linear-gradient(135deg, #4f7cff, #7c4dff)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 900, color: "#fff", boxShadow: isLight ? "0 4px 14px rgba(31, 41, 55, 0.2)" : "0 4px 14px rgba(79, 124, 255, 0.3)"
                  }}>
                    {username?.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Мобильный выпадающий список (содержит темы, профиль, выход) */}
          {isMobile && mobileLogoutOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 24, minWidth: 220,
              background: dropdownBg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
              border: `1px solid ${borderColor}`, borderRadius: 16, padding: 12, zIndex: 4000,
              boxShadow: isLight ? "0 10px 40px rgba(0,0,0,0.15)" : "0 20px 60px rgba(0, 0, 0, 0.6)",
              display: "flex", flexDirection: "column", gap: 12
            }}>
              {/* Секция выбора темы в мобильном меню */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: subTextColor, textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 4 }}>
                  Внешний вид
                </span>
                {(["light", "dark-gray", "dark-blue"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      onSelectTheme(t);
                      setMobileLogoutOpen(false);
                    }}
                    style={{
                      width: "100%", padding: "10px 12px", border: "none", borderRadius: 10,
                      background: theme === t ? btnHoverBg : "transparent",
                      color: theme === t ? activeColor : textColor,
                      cursor: "pointer", fontSize: 14, fontWeight: 600, textAlign: "left",
                      display: "flex", alignItems: "center", gap: 8
                    }}
                  >
                    {getThemeLabel(t)}
                  </button>
                ))}
              </div>

              {token && (
                <>
                  <div style={{ height: 1, background: borderColor, margin: "2px 0" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <button
                      onClick={() => {
                        if (userId) window.open(`/user/${userId}`, "_blank");
                        setMobileLogoutOpen(false);
                      }}
                      style={{
                        width: "100%", padding: "12px 14px", border: "none", borderRadius: 10,
                        background: btnHoverBg, color: activeColor, cursor: "pointer", fontSize: 14, fontWeight: 700,
                        textAlign: "left", display: "flex", alignItems: "center", gap: 8
                      }}
                    >
                      <UserIcon size={16} />
                      <span>Мой профиль</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setMobileLogoutOpen(false);
                      }}
                      style={{
                        width: "100%", padding: "12px 14px", border: "none", borderRadius: 10,
                        background: "rgba(255, 107, 107, 0.1)", color: "#ff6b6b", cursor: "pointer", fontSize: 14, fontWeight: 700,
                        textAlign: "left", display: "flex", alignItems: "center", gap: 8
                      }}
                    >
                      <LogOut size={16} />
                      <span>Выйти</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Мобильное меню по годам */}
      {isMobile && (
        <>
          <div style={{
            position: "fixed", top: 68, left: 0, bottom: 0, width: 280,
            background: dropdownBg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            borderRight: `1px solid ${borderColor}`, zIndex: 2200,
            display: "flex", flexDirection: "column",
            transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: mobileMenuOpen ? "auto" : "none",
            boxShadow: mobileMenuOpen ? "10px 0 40px rgba(0, 0, 0, 0.4)" : "none",
            overflowY: "auto", color: textColor
          }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${borderColor}` }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: subTextColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Годы и конкурсы
              </span>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.entries(contests).map(([year, items]) => (
                <div key={year} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: activeColor, letterSpacing: "0.05em", marginBottom: 4 }}>
                    {year}
                  </div>
                  {items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectContest(c.id);
                        localStorage.setItem("selectedContestId", c.id);
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        padding: "12px 16px", border: `1px solid ${borderColor}`, borderRadius: 14,
                        background: btnBg, color: textColor, cursor: "pointer", fontSize: 14, fontWeight: 600, textAlign: "left"
                      }}
                    >
                      {translateContestType(c.type)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Оверлей для мобильного меню */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed", top: 68, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
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
          onClose={() => setAuthMode(null)}
          onSuccess={(token) => {
            handleLogin(token);
            setAuthMode(null);
          }}
        />
      )}
    </>
  );
}
