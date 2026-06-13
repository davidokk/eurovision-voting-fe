export type GameCatalogItem = {
  performance_id: string;
  artist: string;
  song: string;
  country_name: string;
  flag_emoji: string;
  year: number;
  contest_type: string;
  youtube_link: string;
  custom?: boolean;
};

export type GamePlaylistEntryInput = {
  performance_id: string;
  artist?: string;
  song?: string;
  youtube_link?: string;
};

export type GamePlaylistMode = "manual" | "auto";

export type GamePlayer = {
  user_id: string;
  username: string;
  score: number;
  avatar_url?: string | null;
};

export type GameContestScore = {
  username: string;
  score: number;
  comment?: string;
};

export type GameRoundMode = "audio" | "video" | "video_full" | "silent";

export type GameRoundView = {
  index: number;
  performance_id: string;
  youtube_link: string;
  mode: GameRoundMode;
  video_start_sec?: number;
  artist?: string;
  song?: string;
  country_name?: string;
  flag_emoji?: string;
  year?: number;
  contest_type?: string;
  round_ends_at?: string;
  contest_scores?: GameContestScore[];
};

export type GameRoomState =
  | "lobby"
  | "round_playing"
  | "round_buzzed"
  | "round_waiting_reveal"
  | "round_reveal"
  | "round_clip"
  | "finished";

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
  state: GameRoomState;
  paused: boolean;
  points_per_correct: number;
  round_duration_sec?: number;
  players: GamePlayer[];
  playlist_ids?: string[];
  playlist_preview?: GameCatalogItem[];
  playlist_mode?: GamePlaylistMode;
  auto_count?: number;
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
