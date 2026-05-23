import type { ReactNode } from "react";
import type { ContestsByYear, Theme } from "../types/contest";
import { Topbar } from "./Topbar";

type Props = {
  children: ReactNode;
  theme: Theme;
  onSelectTheme: (theme: Theme) => void;
  contests: ContestsByYear;
  onSelectContest: (id: string) => void;
  /** На вложенных страницах — переход на главную при выборе конкурса */
  navigateHomeOnContest?: boolean;
};

export function AppShell({
  children,
  theme,
  onSelectTheme,
  contests,
  onSelectContest,
  navigateHomeOnContest = false,
}: Props) {
  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const appBg = isLight ? "#f8fafc" : isGray ? "#121212" : "#0b1220";

  function handleContest(id: string) {
    onSelectContest(id);
    if (navigateHomeOnContest) {
      window.location.href = "/";
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: appBg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative", zIndex: 3000, flexShrink: 0 }}>
        <Topbar
          contests={contests}
          onSelectContest={handleContest}
          theme={theme}
          onSelectTheme={onSelectTheme}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}
