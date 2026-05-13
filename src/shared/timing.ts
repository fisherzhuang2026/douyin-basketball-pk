export const OPENING_COUNTDOWN_MS = 3500;

export function getPlayableElapsedMs(startedAtMs: number, nowMs: number, openingCountdownMs = OPENING_COUNTDOWN_MS): number {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) {
    return 0;
  }

  return Math.max(0, nowMs - startedAtMs - openingCountdownMs);
}

export function isMatchDurationExpired(durationSeconds: number, startedAtMs: number, nowMs: number, openingCountdownMs = OPENING_COUNTDOWN_MS): boolean {
  return getPlayableElapsedMs(startedAtMs, nowMs, openingCountdownMs) >= durationSeconds * 1000;
}
