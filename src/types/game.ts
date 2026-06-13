export type GameCatalogItem = {
  performance_id: string;
  artist: string;
  song: string;
  country_name: string;
  flag_emoji: string;
  year: number;
  contest_type: string;
  youtube_link: string;
};

export type GamePlayer = {
  user_id: string;
  username: string;
  score: number;
};

export type GameRoundView = {
  index: number;
  performance_id: string;
  youtube_link: string;
  mode: "audio" | "video";
  artist?: string;
  song?: string;
  country_name?: string;
  flag_emoji?: string;
  year?: number;
  contest_type?: string;
  reveal_until?: string;
};

export type GameJudgement = {
  correct: boolean;
  username: string;
  points: number;
  delta: number;
};

export type GameRoomView = {
  code: string;
  host_user_id: string;
  host_username: string;
  state: "lobby" | "round_playing" | "round_buzzed" | "round_reveal" | "finished";
  paused: boolean;
  points_per_correct: number;
  players: GamePlayer[];
  playlist_ids?: string[];
  current_round: number;
  total_rounds: number;
  buzzed_user_id?: string;
  buzzed_username?: string;
  round?: GameRoundView;
  last_judgement?: GameJudgement;
};

export type GameEvent = {
  type: string;
  room?: GameRoomView;
  message?: string;
};
