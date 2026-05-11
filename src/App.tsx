import { useEffect, useState } from "react";
import { AdminPage } from "./components/AdminPage";

import {
  getContest,
  getContests,
} from "./api/contest";

import type {
  ContestView,
  ContestsByYear,
} from "./types/contest";

import { Topbar } from "./components/Topbar";
import { ContestView as ContestViewComponent } from "./components/ContestView";
import { SidebarLeaderboard } from "./components/SidebarLeaderboard";

export default function App() {
  const [contests, setContests] =
    useState<ContestsByYear>({});

  const [selectedContest, setSelectedContest] =
    useState<ContestView | null>(null);

  const isAdmin = window.location.pathname === "/admin";

  if (isAdmin) {
    return <AdminPage initialContest={selectedContest} />;
  }

  // загружаем список конкурсов
  useEffect(() => {
    getContests().then(setContests);
  }, []);

  // восстанавливаем выбранный contest после обновления страницы
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

  return (
    <div style={styles.app}>
      <Topbar
        contests={contests}
        onSelectContest={handleSelectContest}
      />

      <div style={styles.layout}>
        {selectedContest && (
          <SidebarLeaderboard
            performances={selectedContest.performances}
          />
        )}

        <ContestViewComponent contest={selectedContest} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    height: "100vh",
    overflow: "hidden",
    background: "#0b1220",
  },

  layout: {
    display: "flex",
    height: "calc(100vh - 72px)",
  },
};

// 💥 СТИЛИ АДМИНКИ
const adminStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#0b1220",
    color: "#e6edf7",
    gap: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: 800,
  },

  text: {
    color: "#9fb0d0",
  },

  card: {
    padding: 20,
    border: "1px solid #24324f",
    borderRadius: 12,
    background: "#111a2e",
  },
};