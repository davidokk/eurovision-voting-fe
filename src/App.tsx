import { useEffect, useState } from "react";
import { AdminPage } from "./components/AdminPage";
import { UserStatsPage } from "./components/UserStatsPage";

import { getContest, getContests } from "./api/contest";

import type {
  ContestView,
  ContestsByYear,
} from "./types/contest";

import { Topbar } from "./components/Topbar";
import { ContestView as ContestViewComponent } from "./components/ContestView";
import { SidebarLeaderboard } from "./components/SidebarLeaderboard";

export default function App() {
  const [contests, setContests] = useState<ContestsByYear>({});
  const [selectedContest, setSelectedContest] = useState<ContestView | null>(null);

  // Состояние для управления видимостью лидерборда
  const [leaderboardOpen, setLeaderboardOpen] = useState(true);
  
  // Проверка мобилки для адаптивности
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Следим за ресайзом окна
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAdmin = window.location.pathname === "/admin";
  const isUserPage = window.location.pathname.startsWith("/user/");
  const userId = isUserPage ? window.location.pathname.split("/user/")[1] : null;

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

  async function handleSelectContest(id: string) {
    const data = await getContest(id);
    setSelectedContest(data);
    localStorage.setItem("selectedContestId", id);
  }

  if (isAdmin) return <AdminPage initialContest={selectedContest} />;
  if (isUserPage && userId) return <UserStatsPage userId={userId} />;

  return (
    <div style={styles.app}>
      {/* Обертка для Topbar с высоким z-index */}
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
            borderRight: leaderboardOpen ? "1px solid #24324f" : "none",
            zIndex: isMobile ? 1500 : 100, // На мобилках выше контента, но ниже топбара
          }}
        >
          {leaderboardOpen && selectedContest && (
            <SidebarLeaderboard
              performances={selectedContest.performances}
            />
          )}
        </div>

        {/* КНОПКА ПЕРЕКЛЮЧЕНИЯ ЛИДЕРБОРДА */}
        <button
          onClick={() => setLeaderboardOpen(!leaderboardOpen)}
          style={{
            ...styles.toggleBtn,
            left: leaderboardOpen ? (isMobile ? "calc(100% - 60px)" : 315) : 15,
            opacity: isMobile && leaderboardOpen ? 0.8 : 1,
          }}
        >
          {leaderboardOpen ? "✕" : "🏆"}
        </button>

        {/* ОСНОВНОЙ КОНТЕНТ (CONTEST VIEW) */}
        <div 
          style={styles.content}
          onClick={() => isMobile && leaderboardOpen && setLeaderboardOpen(false)}
        >
          <ContestViewComponent contest={selectedContest} />
        </div>
      </div>
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
    zIndex: 2000, // Гарантирует, что выпадающие списки будут ПОВЕРХ всего
    flexShrink: 0,
  },

  layout: {
    display: "flex",
    flex: 1, // Занимает всё оставшееся место под Topbar
    position: "relative",
    overflow: "hidden",
  },

  sidebarContainer: {
    height: "100%",
    background: "#0f172a",
    transition: "width 0.25s ease, left 0.25s ease",
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
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#4f7cff",
    color: "#fff",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
    transition: "all 0.25s ease",
    zIndex: 1600, // Должен быть выше сайдбара, чтобы его можно было закрыть
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};