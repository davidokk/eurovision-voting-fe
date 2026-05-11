import { useEffect, useMemo, useState } from "react";

import type {
    ContestView as ContestViewType,
} from "../types/contest";

import { PerformanceCard } from "./PerformanceCard";

type Props = {
    contest: ContestViewType | null;
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

function plural(
    value: number,
    one: string,
    few: string,
    many: string
) {
    const mod10 = value % 10;
    const mod100 = value % 100;

    if (mod10 === 1 && mod100 !== 11) {
        return one;
    }

    if (
        mod10 >= 2 &&
        mod10 <= 4 &&
        (mod100 < 10 || mod100 >= 20)
    ) {
        return few;
    }

    return many;
}

function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];

    if (days > 0) {
        parts.push(
            `${days} ${plural(days, "день", "дня", "дней")}`
        );
    }

    if (hours > 0) {
        parts.push(
            `${hours} ${plural(hours, "час", "часа", "часов")}`
        );
    }

    if (minutes > 0) {
        parts.push(
            `${minutes} ${plural(minutes, "минута", "минуты", "минут")}`
        );
    }

    if (seconds > 0 || parts.length === 0) {
        parts.push(
            `${seconds} ${plural(seconds, "секунда", "секунды", "секунд")}`
        );
    }

    return parts.join(" ");
}

export function ContestView({ contest }: Props) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const timerText = useMemo(() => {
        if (!contest) return null;

        const starts = new Date(contest.contest.starts).getTime();

        const diff = starts - now;

        // ДО НАЧАЛА
        if (diff > 0) {
            return `евравидение черес........ ${formatTime(diff)}`;
        }

        // ПЕРВЫЕ 10 МИНУТ ПОСЛЕ НАЧАЛА
        const tenMinutes = 10 * 60 * 1000;

        if (Math.abs(diff) <= tenMinutes) {
            return "start voting now!!!!!!!!!!!!!";
        }

        return null;
    }, [contest, now]);

    // обновляем страницу когда старт наступил
    useEffect(() => {
        if (!contest) return;

        const starts = new Date(contest.contest.starts).getTime();

        if (Date.now() < starts) {
            const timeout = setTimeout(() => {
                window.location.reload();
            }, starts - Date.now());

            return () => clearTimeout(timeout);
        }
    }, [contest]);

    if (!contest) {
        return (
            <div style={styles.empty}>
                Выберите год
            </div>
        );
    }

    return (
        <div style={styles.wrapper}>
            <h1 style={styles.title}>
                {contest.contest.year}{" | "}
                {translateContestType(contest.contest.type)}
            </h1>

            {timerText && (
                <div style={styles.timer}>
                    {timerText}
                </div>
            )}

            <div style={styles.grid}>
                {contest.performances.map((p) => (
                    <PerformanceCard
                        key={p.performance_id}
                        performance={p}
                        votingStarted={
                            now >= new Date(contest.contest.starts).getTime()
                        }
                        votingEnded={
                            now > new Date(contest.contest.ends).getTime()
                        }
                    />
                ))}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        flex: 1,
        padding: 20,
        height: "calc(100vh - 96px)",
        overflowY: "auto",
        background: "#0b1220",
    },

    empty: {
        padding: 20,
        color: "#9aa7bd",
    },

    title: {
        marginTop: 0,
        marginBottom: 10,
        color: "#e6edf7",
        fontSize: 22,
        fontWeight: 700,
        textAlign: "center",
    },

    timer: {
        textAlign: "center",
        marginBottom: 20,
        color: "#ffd166",
        fontSize: 18,
        fontWeight: 700,
    },

    grid: {
        display: "grid",
        gap: 16,
    },
};