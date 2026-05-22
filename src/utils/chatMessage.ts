/** Системное сообщение об оценке (как на iOS: type system или country+score). */
export function isScoreSystemMessage(m: {
  type?: string;
  country?: string;
  score?: number;
}): boolean {
  if (m.type === "system") return true;
  return m.country != null && m.score != null;
}
