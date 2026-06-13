import type { Theme } from "../../types/contest";
import type { GamePlayer } from "../../types/game";
import { UserAvatar } from "../UserAvatar";

type Props = {
  players: GamePlayer[];
  hostUserId: string;
  theme: Theme;
  textColor: string;
  subColor: string;
  cardBg: string;
  border: string;
  avatarUrl: (userId: string, avatarUrl?: string | null) => string | null;
};

export function GameLobbyPlayers({
  players,
  hostUserId,
  theme,
  textColor,
  subColor,
  cardBg,
  border,
  avatarUrl,
}: Props) {
  const guests = players.filter((p) => p.user_id !== hostUserId);
  const readyHint =
    guests.length === 0
      ? "Пока только вы — отправьте код комнаты друзьям"
      : guests.length === 1
        ? "1 игрок готов — можно начинать"
        : `${guests.length} игроков готовы — можно начинать`;

  return (
    <aside className="gts-lobby-players" style={{ background: cardBg, border }}>
      <div className="gts-lobby-players__head">
        <h3 className="gts-lobby-players__title" style={{ color: subColor }}>
          В комнате
        </h3>
        <span className="gts-lobby-players__count" style={{ color: textColor }}>
          {players.length}
        </span>
      </div>
      <p className="gts-lobby-players__hint" style={{ color: subColor }}>
        {readyHint}
      </p>
      <div className="gts-lobby-players__list">
        {players.map((p) => {
          const isHost = p.user_id === hostUserId;
          return (
            <div
              key={p.user_id}
              className={`gts-lobby-players__row ${isHost ? "gts-lobby-players__row--host" : ""}`}
              style={{ color: textColor }}
            >
              <UserAvatar
                username={p.username}
                avatarUrl={avatarUrl(p.user_id, p.avatar_url)}
                size={32}
                theme={theme}
              />
              <div className="gts-lobby-players__meta">
                <span className="gts-lobby-players__name">{p.username}</span>
                {isHost && (
                  <span className="gts-lobby-players__badge" style={{ color: subColor }}>
                    ведущий
                  </span>
                )}
              </div>
              <span className="gts-lobby-players__status" style={{ color: isHost ? subColor : "#22c55e" }}>
                {isHost ? "—" : "● онлайн"}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
