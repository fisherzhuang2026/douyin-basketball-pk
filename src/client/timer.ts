export function getRemainingSeconds(durationSeconds: number, startedAt: string, nowMs = Date.now()): number {
  const startedAtMs = Date.parse(startedAt);
  if (Number.isNaN(startedAtMs)) {
    return durationSeconds;
  }

  const elapsedSeconds = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.max(0, durationSeconds - elapsedSeconds);
}

export function hasCountdownExpired(durationSeconds: number, startedAt: string, nowMs = Date.now()): boolean {
  return getRemainingSeconds(durationSeconds, startedAt, nowMs) <= 0;
}

export function formatSeconds(seconds: number): string {
  const normalized = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(normalized / 60).toString().padStart(2, "0");
  const rest = (normalized % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}
