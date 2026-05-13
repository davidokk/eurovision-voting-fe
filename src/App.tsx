import { useEffect, useState } from "react";
import { AdminPage } from "./components/AdminPage";
import { UserStatsPage } from "./components/UserStatsPage";
import { CountryStatsPage } from "./components/CountryStatsPage";

import { getContest, getContests } from "./api/contest";

import type {
  ContestView,
  ContestsByYear,
} from "./types/contest";

import { Topbar } from "./components/Topbar";
import { ContestView as ContestViewComponent } from "./components/ContestView";
import { SidebarLeaderboard } from "./components/SidebarLeaderboard";

const API_URL = import.meta.env.VITE_API_URL || "";

// Глобальные стили для скроллбара
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0b1220; }
    ::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background-color: #4f7cff; }
    * { scrollbar-width: thin; scrollbar-color: #334155 #0b1220; }
  `;
  document.head.appendChild(style);
}

export default function App() {
  const [contests, setContests] = useState<ContestsByYear>({});
  const [selectedContest, setSelectedContest] = useState<ContestView | null>(null);

  // Состояния интерфейса
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

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
    const token = localStorage.getItem("token");
    if (!token) return;

    async function validateToken() {
      try {
        const res = await fetch(`${API_URL}/v1/auth/validate`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          // Токен невалидный — очищаем всё, кроме выбранного конкурса
          const savedContestId = localStorage.getItem("selectedContestId");
          localStorage.clear();
          if (savedContestId) {
            localStorage.setItem("selectedContestId", savedContestId);
          }
          window.location.reload();
        }
      } catch (err) {
        console.error("Token validation failed", err);
      }
    }

    validateToken();
  }, []);

  async function handleSelectContest(id: string) {
    const data = await getContest(id);
    setSelectedContest(data);
    localStorage.setItem("selectedContestId", id);
  }

  if (isAdmin) return <AdminPage initialContest={selectedContest} />;
  if (isUserPage && userId) return <UserStatsPage userId={userId} />;
  if (isCountryPage && countryId) return <CountryStatsPage countryId={countryId} />;
  if (isCountryPage && countryId) return <CountryStatsPage countryId={countryId} />;

  return (
    <div style={styles.app}>
      <div style={styles.topbarWrapper}>
        <Topbar
          contests={contests}
          onSelectContest={handleSelectContest}
        />
      </div>

      <div style={styles.layout}>
        {/* ЛЕВАЯ ПАНЕЛЬ (ЛИДЕРБОРД) */}
        <div
          style={{
            ...styles.sidebarContainer,
            width: leaderboardOpen ? (isMobile ? "100%" : 300) : 0,
            position: isMobile && leaderboardOpen ? "absolute" : "relative",
            borderRight: leaderboardOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
            zIndex: isMobile ? 1500 : 100,
          }}
        >
          {leaderboardOpen && selectedContest && (
            <SidebarLeaderboard
              performances={selectedContest.performances}
              onClose={() => setLeaderboardOpen(false)}
            />
          )}
        </div>

        {/* ОСНОВНОЙ КОНТЕНТ (CONTEST VIEW) */}
        <div
          style={styles.content}
          onClick={() => isMobile && leaderboardOpen && setLeaderboardOpen(false)}
        >
          <ContestViewComponent
            contest={selectedContest}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
          />
        </div>
      </div>

      {/* КНОПКА ПЕРЕКЛЮЧЕНИЯ ЛИДЕРБОРДА — вне layout, выше всех stacking context */}
      {selectedContest && (<button
        onClick={() => setLeaderboardOpen(!leaderboardOpen)}
        style={{
          ...styles.toggleBtn,
          left: leaderboardOpen ? (isMobile ? 15 : 315) : 15,
          transform: (isMobile && (chatOpen || leaderboardOpen)) ? "scale(0)" : "scale(1)",
          opacity: (isMobile && (chatOpen || leaderboardOpen)) ? 0 : 1,
          pointerEvents: (isMobile && (chatOpen || leaderboardOpen)) ? "none" : "auto",
        }}
      >
        <span style={{ fontSize: 24 }}>
          {leaderboardOpen ? "✕" : "🏆"}
        </span>
      </button>)}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "#0b1220",
    display: "flex",
    flexDirection: "column",
  },
  topbarWrapper: {
    position: "relative",
    zIndex: 3000,
    flexShrink: 0,
  },
  layout: {
    display: "flex",
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  sidebarContainer: {
    height: "100%",
    background: "rgba(15, 23, 42, 0.95)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
    position: "relative",
    zIndex: 1,
  },
  toggleBtn: {
    position: "fixed",
    bottom: 30,
    width: 68,
    height: 68,
    borderRadius: "24px",
    background: "linear-gradient(135deg, #4f7cff 0%, #7c4dff 100%)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 18,
    cursor: "pointer",
    zIndex: 2100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `
      0 10px 30px rgba(79, 124, 255, 0.35),
      inset 0 1px rgba(255, 255, 255, 0.15)
    `,
    transition: "all 0.25s ease",
  },
};
