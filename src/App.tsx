import { useEffect, useState } from "react";

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

    // const style = document.createElement("style");

    // style.innerHTML = `
    //   @font-face {
    //     font-family: "Twemoji";
    //     src: url("/fonts/twemoji.ttf") format("truetype");
    //     unicode-range: U+1F300-1FAFF;
    //   }
    // `;
    // document.head.appendChild(style);

  }, []);

  async function handleSelectContest(id: string) {
    const data = await getContest(id);

    setSelectedContest(data);

    // сохраняем выбор в localStorage
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