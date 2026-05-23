import { useEffect, useState } from "react";
import { AdminPage } from "./components/AdminPage";
import { UserStatsPage } from "./components/UserStatsPage";
import { CountryStatsPage } from "./components/CountryStatsPage";
import { getContest, getContests } from "./api/contest";
import type { ContestView, ContestsByYear, Theme } from "./types/contest";
import { Topbar } from "./components/Topbar";
import { AppShell } from "./components/AppShell";
import { ContestView as ContestViewComponent } from "./components/ContestView";
import { SidebarLeaderboard } from "./components/SidebarLeaderboard";
import { fetchMe, setStoredAvatarUrl } from "./api/user";
import { EmailVerifyGate } from "./components/EmailVerifyGate";
import { applyAuthSession } from "./utils/jwt";

const API_URL = (import.meta as any).env?.VITE_API_URL || "";
const CHAT_OPEN_KEY = "ev_chat_open";

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "dark-blue";
  });

  const [contests, setContests] = useState<ContestsByYear>({});
  const [selectedContest, setSelectedContest] = useState<ContestView | null>(null);

  // Состояния интерфейса
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(
    () => localStorage.getItem(CHAT_OPEN_KEY) === "1"
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    localStorage.setItem(CHAT_OPEN_KEY, chatOpen ? "1" : "0");
  }, [chatOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAdmin = window.location.pathname === "/admin";
  const isUserPage = window.location.pathname.startsWith("/user/");
  const userId = isUserPage ? window.location.pathname.split("/user/")[1] : null;
  const isCountryPage = window.location.pathname.startsWith("/country/");
  const countryId = isCountryPage ? window.location.pathname.split("/country/")[1] : null;

  useEffect(() => {
    getContests().then(setContests);
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem("selectedContestId");
    if (!savedId) return;
    getContest(savedId).then((data) => {
      setSelectedContest(data);
    });
  }, []);

  // Валидация токена при заходе на сайт
  useEffect(() => {
    const authToken = localStorage.getItem("token");
    if (!authToken) return;

    async function validateToken(token: string) {
      try {
        if (!API_URL) return;
        const res = await fetch(`${API_URL}/v1/auth/validate`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          const savedTheme = localStorage.getItem("theme");
          localStorage.clear();
          if (savedTheme) localStorage.setItem("theme", savedTheme);
          window.location.reload();
          return;
        }
        const me = await fetchMe(token);
        applyAuthSession(token, {
          email_verified: me.email_verified,
          avatar_url: me.avatar_url,
        });
        setStoredAvatarUrl(me.avatar_url ?? null);
      } catch (err) {
        console.error("Token validation failed", err);
      }
    }

    validateToken(authToken);
  }, []);

  // Обновление глобальных стилей скроллбара и фона body при смене темы
  useEffect(() => {
    localStorage.setItem("theme", theme);

    const isLight = theme === "light";
    const isGray = theme === "dark-gray";

    const bgColor = isLight ? "#f8fafc" : isGray ? "#121212" : "#0b1220";
    const trackColor = isLight ? "#f1f5f9" : isGray ? "#181818" : "#0b1220";
    const thumbColor = isLight ? "#cbd5e1" : isGray ? "#374151" : "#334155";
    const thumbHoverColor = isLight ? "#94a3b8" : isGray ? "#4b5563" : "#4f7cff";

    document.body.style.background = bgColor;
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.fontFamily = "system-ui, -apple-system, sans-serif";

    const styleId = "eurovision-dynamic-styles";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: ${trackColor}; }
      ::-webkit-scrollbar-thumb { background-color: ${thumbColor}; border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background-color: ${thumbHoverColor}; }
      * { scrollbar-width: thin; scrollbar-color: ${thumbColor} ${trackColor}; box-sizing: border-box; }
    `;
  }, [theme]);

  async function handleSelectContest(id: string) {
    const data = await getContest(id);
    setSelectedContest(data);
    localStorage.setItem("selectedContestId", id);
  }

  function handleSelectTheme(newTheme: Theme) {
    setTheme(newTheme);
  }

  if (isAdmin) {
    return (
      <>
        <EmailVerifyGate theme={theme} />
        <AdminPage initialContest={selectedContest} />
      </>
    );
  }
  if (isUserPage && userId) {
    return (
      <>
        <EmailVerifyGate theme={theme} />
        <AppShell
          theme={theme}
          onSelectTheme={handleSelectTheme}
          contests={contests}
          onSelectContest={handleSelectContest}
          navigateHomeOnContest
        >
          <UserStatsPage userId={userId} theme={theme} />
        </AppShell>
      </>
    );
  }
  if (isCountryPage && countryId) {
    return (
      <>
        <EmailVerifyGate theme={theme} />
        <CountryStatsPage countryId={countryId} theme={theme} />
      </>
    );
  }

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";

  const appBg = isLight ? "#f8fafc" : isGray ? "#121212" : "#0b1220";
  const sidebarBg = isLight ? "rgba(255, 255, 255, 0.95)" : isGray ? "rgba(28, 28, 28, 0.95)" : "rgba(15, 23, 42, 0.95)";
  const borderColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
  const toggleBtnBg = isLight ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)" : isGray ? "linear-gradient(135deg, #6b7280 0%, #374151 100%)" : "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)";
  const toggleBtnShadow = isLight ? "0 10px 30px rgba(0,0,0,0.15)" : "0 10px 30px rgba(79, 124, 255, 0.35), inset 0 1px rgba(255, 255, 255, 0.15)";

  return (
    <>
    <EmailVerifyGate theme={theme} />
    <div style={{
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      background: appBg,
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      <div style={{ position: "relative", zIndex: 3000, flexShrink: 0 }}>
        <Topbar
          contests={contests}
          onSelectContest={handleSelectContest}
          theme={theme}
          onSelectTheme={handleSelectTheme}
        />
      </div>

      <div style={{ display: "flex", flex: 1, position: "relative", overflow: "hidden" }}>
        {/* ЛЕВАЯ ПАНЕЛЬ (ЛИДЕРБОРД) */}
        <div
          style={{
            height: "100%",
            background: sidebarBg,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            width: leaderboardOpen ? (isMobile ? "100%" : 320) : 0,
            position: isMobile && leaderboardOpen ? "absolute" : "relative",
            borderRight: leaderboardOpen ? `1px solid ${borderColor}` : "none",
            zIndex: isMobile ? 1500 : 100,
          }}
        >
          {leaderboardOpen && selectedContest && (
            <SidebarLeaderboard
              theme={theme}
              performances={selectedContest.performances}
              contestType={selectedContest.contest?.type || (selectedContest as any).type}
              onClose={() => setLeaderboardOpen(false)}
            />
          )}
        </div>

        {/* ОСНОВНОЙ КОНТЕНТ (CONTEST VIEW) */}
        <div
          style={{ flex: 1, height: "100%", overflow: "hidden", position: "relative", zIndex: 1 }}
          onClick={() => isMobile && leaderboardOpen && setLeaderboardOpen(false)}
        >
          <ContestViewComponent
            theme={theme}
            contest={selectedContest}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
            onRefreshContest={async () => {
              if (selectedContest) {
                const data = await getContest(selectedContest.contest.id);
                setSelectedContest(data);
              }
            }}
          />
        </div>
      </div>

      {/* КНОПКА ПЕРЕКЛЮЧЕНИЯ ЛИДЕРБОРДА — вне layout, выше всех stacking context */}
      {selectedContest && (
        <button
          onClick={() => setLeaderboardOpen(!leaderboardOpen)}
          style={{
            position: "fixed",
            bottom: 30,
            width: 68,
            height: 68,
            borderRadius: "24px",
            background: toggleBtnBg,
            color: "#fff",
            border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.12)",
            fontSize: 18,
            cursor: "pointer",
            zIndex: 2100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: toggleBtnShadow,
            transition: "all 0.25s ease",
            left: leaderboardOpen ? (isMobile ? 15 : 335) : 15,
            transform: (isMobile && (chatOpen || leaderboardOpen)) ? "scale(0)" : "scale(1)",
            opacity: (isMobile && (chatOpen || leaderboardOpen)) ? 0 : 1,
            pointerEvents: (isMobile && (chatOpen || leaderboardOpen)) ? "none" : "auto",
          }}
        >
          <span style={{ fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {leaderboardOpen ? "✕" : "🏆"}
          </span>
        </button>
      )}
    </div>
    </>
  );
}
