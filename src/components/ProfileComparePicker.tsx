import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { fetchUserList, type UserPublic } from "../api/user";
import { UserAvatar } from "./UserAvatar";

type Props = {
    excludeUserId: string;
    selected: UserPublic | null;
    onSelect: (user: UserPublic | null) => void;
    panelBg: string;
    textColor: string;
    subTextColor: string;
    border: string;
    accentSolid: string;
    activeRowBg: string;
    chipBg: string;
};

export function ProfileComparePicker({
    excludeUserId,
    selected,
    onSelect,
    panelBg,
    textColor,
    subTextColor,
    border,
    accentSolid,
    activeRowBg,
    chipBg,
}: Props) {
    const [users, setUsers] = useState<UserPublic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(false);
        fetchUserList(excludeUserId)
            .then(setUsers)
            .catch(() => {
                setUsers([]);
                setError(true);
            })
            .finally(() => setLoading(false));
    }, [excludeUserId]);

    if (selected) {
        return (
            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 10px 6px 6px",
                    borderRadius: 999,
                    background: chipBg,
                    border,
                }}
            >
                <UserAvatar
                    username={selected.username}
                    avatarUrl={selected.avatar_url}
                    size={28}
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>
                    {selected.username}
                </span>
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    aria-label="Убрать сравнение"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "none",
                        background: "transparent",
                        color: subTextColor,
                        cursor: "pointer",
                    }}
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                flex: "1 1 100%",
                minWidth: 0,
                borderRadius: 14,
                border,
                background: panelBg,
                overflow: "hidden",
            }}
        >
            {loading ? (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: 20,
                        color: subTextColor,
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    <Loader2 size={18} className="ev-spin" color={accentSolid} />
                    Загрузка пользователей…
                </div>
            ) : error ? (
                <div style={{ padding: 16, color: subTextColor, fontSize: 13 }}>
                    Не удалось загрузить список
                </div>
            ) : users.length === 0 ? (
                <div style={{ padding: 16, color: subTextColor, fontSize: 13 }}>
                    Нет других пользователей
                </div>
            ) : (
                <ul
                    style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 6,
                        maxHeight: 220,
                        overflowY: "auto",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                        gap: 4,
                    }}
                >
                    {users.map((u) => (
                        <li key={u.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(u)}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    textAlign: "left",
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: "transparent",
                                    color: textColor,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = activeRowBg;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <UserAvatar
                                    username={u.username}
                                    avatarUrl={u.avatar_url}
                                    size={28}
                                />
                                <span
                                    style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {u.username}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
