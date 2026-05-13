import type { LeaderboardEntry, MatchSnapshot, MatchStatus, ShotEvent, Team } from "./types";

export type ArenaPhase = "idle" | "opening" | "live" | "clutch" | "settlement";

export interface ArenaCallout {
  id: string;
  tone: Team | "gold" | "neutral";
  title: string;
  body: string;
}

export interface SettlementStats {
  totalShots: number;
  likeShots: number;
  giftShots: number;
  bestStreakLabel: string;
}

const OPENING_DURATION_MS = 3500;
const CLUTCH_DURATION_MS = 30_000;

export function getArenaPhase(status?: MatchStatus, startedAt?: string, durationSeconds = 300, now = Date.now()): ArenaPhase {
  if (status === "finished") {
    return "settlement";
  }
  if (status !== "running" || !startedAt) {
    return "idle";
  }

  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) {
    return "live";
  }

  const elapsedMs = Math.max(0, now - startedMs);
  if (elapsedMs < OPENING_DURATION_MS) {
    return "opening";
  }

  const remainingMs = durationSeconds * 1000 - elapsedMs;
  return remainingMs <= CLUTCH_DURATION_MS ? "clutch" : "live";
}

export function buildArenaCallout(
  previous: MatchSnapshot | undefined,
  current: MatchSnapshot | undefined,
  recentShots: ShotEvent[]
): ArenaCallout | undefined {
  if (!current) {
    return undefined;
  }

  const comebackTeam = getComebackTeam(previous, current);
  if (comebackTeam) {
    const teamName = getTeamName(current, comebackTeam);
    return {
      id: `comeback-${comebackTeam}-${current.scores[comebackTeam]}`,
      tone: comebackTeam,
      title: `${teamName}反超`,
      body: "比分翻转，直播间应援能量拉满"
    };
  }

  const streak = getTrailingHitStreak(recentShots);
  if (streak.count >= 3 && streak.team) {
    const teamName = getTeamName(current, streak.team);
    return {
      id: `streak-${streak.team}-${streak.count}-${recentShots.at(-1)?.id ?? "latest"}`,
      tone: streak.team,
      title: `${teamName}连中 ${streak.count} 球`,
      body: "连续命中触发球馆欢呼"
    };
  }

  if (previous?.mvp?.userId && current.mvp?.userId && previous.mvp.userId !== current.mvp.userId) {
    return {
      id: `mvp-${current.mvp.userId}-${current.mvp.score}`,
      tone: "gold",
      title: "本场 MVP 更新",
      body: `${current.mvp.nickname} 暂列全场第一`
    };
  }

  return undefined;
}

export function formatArenaTopPlayer(entry?: LeaderboardEntry): string {
  return entry ? `${entry.nickname} ${entry.score}分` : "等待上榜";
}

export function getSettlementStats(snapshot: MatchSnapshot): SettlementStats {
  const totalShots = snapshot.leaderboard.reduce((sum, entry) => sum + entry.shots, 0);
  const likeShots = snapshot.recentEvents.filter((event) => event.eventType === "like").length;
  const giftShots = snapshot.recentEvents.filter((event) => event.eventType === "gift").length;

  return {
    totalShots,
    likeShots,
    giftShots,
    bestStreakLabel: formatBestStreak(snapshot.recentEvents)
  };
}

function getComebackTeam(previous: MatchSnapshot | undefined, current: MatchSnapshot): Team | undefined {
  if (!previous) {
    return undefined;
  }
  const previousDiff = previous.scores.red - previous.scores.blue;
  const currentDiff = current.scores.red - current.scores.blue;
  if (currentDiff === 0 || Math.sign(previousDiff) === Math.sign(currentDiff)) {
    return undefined;
  }
  return currentDiff > 0 ? "red" : "blue";
}

function getTrailingHitStreak(events: ShotEvent[]): { team?: Team; count: number } {
  let team: Team | undefined;
  let count = 0;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event.hit) {
      break;
    }
    if (!team) {
      team = event.team;
    }
    if (event.team !== team) {
      break;
    }
    count += 1;
  }

  return { team, count };
}

function formatBestStreak(events: ShotEvent[]): string {
  let bestTeam: Team | undefined;
  let bestCount = 0;
  let currentTeam: Team | undefined;
  let currentCount = 0;

  for (const event of events) {
    if (!event.hit) {
      currentTeam = undefined;
      currentCount = 0;
      continue;
    }

    if (event.team === currentTeam) {
      currentCount += 1;
    } else {
      currentTeam = event.team;
      currentCount = 1;
    }

    if (currentCount > bestCount) {
      bestCount = currentCount;
      bestTeam = currentTeam;
    }
  }

  if (!bestTeam || bestCount < 2) {
    return "暂无连中";
  }

  return `${bestTeam === "red" ? "红队" : "蓝队"} ${bestCount} 连中`;
}

function getTeamName(snapshot: MatchSnapshot, team: Team): string {
  return team === "red" ? snapshot.redTeamName : snapshot.blueTeamName;
}
