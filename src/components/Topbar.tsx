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

  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setUsername(localStorage.getItem("username"));
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
        <div style={styles.left}>
          {Object.entries(contests).map(([year, items]) => (
            <div key={year} style={{ position: "relative" }}>
              <button
                style={styles.button}
                onClick={() =>
                  setOpenYear(openYear === year ? null : year)
                }
              >
                {year} 
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

        <div style={styles.right}>
          {!token ? (
            <button
              style={styles.button}
              onClick={() => setAuthMode("signin")}
            >
              Войти
            </button>
          ) : (
            <div style={styles.userBlock}>
              {username && (
                <span style={styles.username}>
                  👤 {username}
                </span>
              )}

              <button style={styles.button} onClick={logout}>
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>

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
    height: 70,              // 🔥 БЫЛО 72 → стало крупнее
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 28px",       // 🔥 больше воздуха
    background: "#111a2e",
    borderBottom: "1px solid #24324f",
    color: "#e6edf7",
  },

  left: {
    display: "flex",
    gap: 14,
  },

  right: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },

  button: {
    padding: "14px 18px",     // 🔥 крупнее кнопки
    borderRadius: 12,
    border: "1px solid #24324f",
    background: "#16213a",
    color: "#e6edf7",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
  },

  userBlock: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  username: {
    color: "#e6edf7",
    fontWeight: 700,
    fontSize: 15,
  },
};