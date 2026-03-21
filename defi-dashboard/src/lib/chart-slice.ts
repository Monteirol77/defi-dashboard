/** Filtra pontos dos últimos `days` dias (a partir de agora). */
export function sliceLastDays<T extends { timestamp: number }>(points: T[], days: number): T[] {
  const ms = days * 24 * 60 * 60 * 1000;
  const from = Date.now() - ms;
  return points.filter((p) => p.timestamp >= from);
}
