/** Ширина одной карточки в прежней сетке: (1200 − 2×24) / 3. */
export const CONTEST_CARD_WIDTH = 384;

export const CONTEST_GRID_GAP = 24;

export const CONTEST_MAX_COLUMNS = 5;

/** Пять карточек той же ширины и четыре зазора между ними. */
export const CONTEST_CONTENT_MAX_WIDTH =
  CONTEST_CARD_WIDTH * CONTEST_MAX_COLUMNS + CONTEST_GRID_GAP * (CONTEST_MAX_COLUMNS - 1);
