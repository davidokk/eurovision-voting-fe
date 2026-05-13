import { useEffect, useState } from "react";

import type { ContestsByYear } from "../types/contest";
import { ContestDropdown } from "./ContestDropdown";
import { AuthModal } from "./AuthModal";

type Props = {
  contests: ContestsByYear;
  onSelectContest: (id: string) => void;
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

export function Topbar({ contests, onSelectContest }: Props) {
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [authMode, setAuthMode] =
    useState<"signin" | "signup" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileLogoutOpen, setMobileLogoutOpen] = useState(false);
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

  return (
    <>
      <div style={styles.topbar}>
        {/* Логотип / название */}
        <div style={styles.logo} className="topbar-logo">
          <img
            src="https://www.eurovision.com/static/images/70-heart-sm@2x.c3d0a545227c.webp"
            alt="Eurovision"
            style={styles.logoImage}
          />
          <span style={styles.logoText}>EUROVISION</span>
        </div>

        {/* Гамбургер-кнопка (мобильная) */}
        <button
          className="hamburger-btn"
          style={styles.hamburger}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span style={{
            ...styles.hamburgerLine,
            transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none",
          }} />
          <span style={{
            ...styles.hamburgerLine,
            opacity: mobileMenuOpen ? 0 : 1,
          }} />
          <span style={{
            ...styles.hamburgerLine,
            transform: mobileMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none",
          }} />
        </button>

        {/* Навигация по годам (десктоп) */}
        <div style={styles.left} className="topbar-left">
          {Object.entries(contests).map(([year, items]) => (
            <div key={year} style={{ position: "relative" }}>
              <button
                style={{
                  ...styles.yearButton,
                  ...(openYear === year ? styles.yearButtonActive : {}),
                }}
                onClick={() =>
                  setOpenYear(openYear === year ? null : year)
                }
                onMouseEnter={(e) => {
                  if (openYear !== year) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(79, 124, 255, 0.1)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "rgba(79, 124, 255, 0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (openYear !== year) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255, 255, 255, 0.03)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "rgba(255, 255, 255, 0.06)";
                  }
                }}
              >
                {year}
                <span style={{
                  ...styles.chevron,
                  transform: openYear === year ? "rotate(180deg)" : "rotate(0deg)",
                }}>
                  ▾
                </span>
              </button>

              {openYear === year && (
                <ContestDropdown
                  contests={items.map((c) => ({
                    ...c,
                    type: translateContestType(c.type),
                  }))}
                  onSelect={(id) => {
                    onSelectContest(id);
                    localStorage.setItem("selectedContest", id);
                    setOpenYear(null);
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Правая часть: авторизация */}
        <div style={styles.right}>
          {!token ? (
            <button
              style={{
                ...styles.signInButton,
                padding: isMobile ? "8px 16px" : "10px 24px",
                fontSize: isMobile ? 12 : 14,
              }}
              onClick={() => setAuthMode("signin")}
            >
              Войти
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Десктоп: полный блок */}
              {!isMobile && (
                <div style={{
                  ...styles.userBlock,
                  padding: "6px 6px 6px 14px",
                  gap: 16,
                }}>
                  <div style={styles.userInfo}>
                    <a
                      href={userId ? `/user/${userId}` : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.avatarLink,
                        width: 32,
                        height: 32,
                      }}
                    >
                      {username?.charAt(0).toUpperCase()}
                    </a>
                    {username && (
                      <span style={styles.username}>
                        {username}
                      </span>
                    )}
                  </div>

                  <button style={styles.logoutButton} onClick={logout}>
                    Выйти
                  </button>
                </div>
              )}

              {/* Мобилка: только аватарка */}
              {isMobile && (
                <div
                  style={styles.mobileAvatarBtn}
                  onClick={() => setMobileLogoutOpen(!mobileLogoutOpen)}
                >
                  <div style={{
                    ...styles.avatar,
                    width: 34,
                    height: 34,
                  }}>
                    {username?.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}

              {/* Мобильный dropdown */}
              {isMobile && mobileLogoutOpen && (
                <div style={styles.mobileLogoutDropdown}>
                  <button
                    style={styles.mobileProfileBtn}
                    onClick={() => {
                      if (userId) window.open(`/user/${userId}`, "_blank");
                      setMobileLogoutOpen(false);
                    }}
                  >
                    👤 Мой профиль
                  </button>
                  <button
                    style={styles.mobileLogoutBtn}
                    onClick={() => {
                      logout();
                      setMobileLogoutOpen(false);
                    }}
                  >
                    🚪 Выйти
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Мобильное меню */}
      <div
        className="mobile-menu"
        style={{
          ...styles.mobileMenu,
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div style={styles.mobileMenuHeader}>
          <span style={styles.mobileMenuTitle}>Годы и конкурсы</span>
        </div>
        <div style={styles.mobileMenuContent}>
          {Object.entries(contests).map(([year, items]) => (
            <div key={year} style={styles.mobileYearSection}>
              <div style={styles.mobileYearLabel}>{year}</div>
              {items.map((c) => (
                <button
                  key={c.id}
                  style={styles.mobileContestButton}
                  onClick={() => {
                    onSelectContest(c.id);
                    localStorage.setItem("selectedContest", c.id);
                    setMobileMenuOpen(false);
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
      {mobileMenuOpen && (
        <div
          style={styles.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {authMode && (
        <AuthModal
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

const styles: Record<string, React.CSSProperties> = {
  topbar: {
    height: 68,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    background: `
      linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 17, 33, 0.98) 100%)
    `,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    color: "#e6edf7",
    boxShadow: `
      0 4px 30px rgba(0, 0, 0, 0.3),
      inset 0 -1px rgba(79, 124, 255, 0.05)
    `,
    position: "relative",
    zIndex: 1000,
  },

  hamburger: {
    display: "none",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 40,
    gap: 5,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.04)",
    cursor: "pointer",
    padding: 0,
  },

  hamburgerLine: {
    display: "block",
    width: 18,
    height: 2,
    background: "#e6edf7",
    borderRadius: 2,
    transition: "all 0.3s ease",
  },

  mobileMenu: {
    position: "fixed",
    top: 68,
    left: 0,
    bottom: 0,
    width: 280,
    background: "rgba(10, 17, 33, 0.98)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRight: "1px solid rgba(255, 255, 255, 0.06)",
    zIndex: 2200,
    display: "none",
    flexDirection: "column",
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "10px 0 40px rgba(0, 0, 0, 0.4)",
    overflowY: "auto",
  },

  mobileMenuHeader: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },

  mobileMenuTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
  },

  mobileMenuContent: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  mobileYearSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  mobileYearLabel: {
    fontSize: 20,
    fontWeight: 900,
    color: "#7aa2ff",
    letterSpacing: "0.05em",
    marginBottom: 4,
  },

  mobileContestButton: {
    padding: "12px 16px",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    background: "rgba(255, 255, 255, 0.03)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    textAlign: "left" as const,
    transition: "all 0.2s ease",
  },

  mobileOverlay: {
    position: "fixed",
    top: 68,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    zIndex: 2150,
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginRight: 24,
  },

  logoImage: {
    width: 28,
    height: 28,
    objectFit: "contain" as const,
    filter: "drop-shadow(0 2px 8px rgba(79, 124, 255, 0.3))",
  },

  logoText: {
    fontSize: 16,
    fontWeight: 1000,
    letterSpacing: "0.12em",
    background: "linear-gradient(135deg, #4f7cff, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "none",
  },

  left: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },

  right: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  yearButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255, 255, 255, 0.06)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.04em",
    transition: "all 0.2s ease",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },

  yearButtonActive: {
    background: "rgba(79, 124, 255, 0.15)",
    borderColor: "rgba(79, 124, 255, 0.35)",
    color: "#7aa2ff",
    boxShadow: "0 4px 16px rgba(79, 124, 255, 0.15), inset 0 1px rgba(255,255,255,0.08)",
  },

  chevron: {
    fontSize: 10,
    opacity: 0.5,
    transition: "transform 0.2s ease",
    display: "inline-block",
  },

  signInButton: {
    padding: "10px 22px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "0.02em",
    boxShadow: "0 6px 20px rgba(79, 124, 255, 0.3), inset 0 1px rgba(255,255,255,0.15)",
    transition: "all 0.2s ease",
  },

  userBlock: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    border: "1px solid rgba(255, 255, 255, 0.06)",
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 900,
    color: "#fff",
    boxShadow: "0 4px 14px rgba(79, 124, 255, 0.3)",
    flexShrink: 0,
  },

  avatarLink: {
    borderRadius: 12,
    background: "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 900,
    color: "#fff",
    boxShadow: "0 4px 14px rgba(79, 124, 255, 0.3)",
    flexShrink: 0,
    textDecoration: "none",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  username: {
    color: "#e6edf7",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: "0.01em",
  },

  logoutButton: {
    padding: "8px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255, 255, 255, 0.06)",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.2s ease",
  },

  mobileAvatarBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 4,
  },

  mobileLogoutDropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    minWidth: 160,
    background: "rgba(15, 23, 42, 0.95)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 6,
    zIndex: 3000,
    boxShadow: `
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 0 40px rgba(79, 124, 255, 0.08),
      inset 0 1px rgba(255, 255, 255, 0.06)
    `,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  mobileProfileBtn: {
    width: "100%",
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    background: "rgba(79, 124, 255, 0.1)",
    color: "#7aa2ff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "left" as const,
    transition: "background 0.2s ease",
  },

  mobileLogoutBtn: {
    width: "100%",
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    background: "rgba(255, 107, 107, 0.08)",
    color: "#ff6b6b",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "left" as const,
    transition: "background 0.2s ease",
  },
};
