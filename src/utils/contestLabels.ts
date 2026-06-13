const CONTEST_TYPE_LABELS: Record<string, string> = {
  final: "Финал",
  "first-semifinal": "Первый полуфинал",
  "second-semifinal": "Второй полуфинал",
};

export function contestTypeLabel(type: string): string {
  return CONTEST_TYPE_LABELS[type] ?? type;
}
