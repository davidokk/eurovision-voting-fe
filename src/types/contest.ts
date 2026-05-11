export type ContestItem = {
  id: string;
  type: string;
  year: number;
};

export type ContestsByYear = Record<string, ContestItem[]>;

export type ScoreView = {
  user_id: string;
  username: string;
  score: number;
  comment?: string;
  gif_url?: string;
};

export type PerformanceWithScores = {
  performance_id: string;
  qualified: boolean;
  country: {
    id: string;
    name_ru: string;
    flag_emoji: string;
  };

  artist: string;
  song: string;
  number: number;
  youtube_link: string;

  total_score: number;

  scores: ScoreView[];
};

export type Contest = {
  id: string;
  type: string;
  year: number;

  starts: string;
  ends: string;
};

export type ContestView = {
  contest: Contest;
  performances: PerformanceWithScores[];
};