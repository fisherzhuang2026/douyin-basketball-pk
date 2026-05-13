import type { LeaderboardEntry, MatchSnapshot, MatchState, ShotEvent, Team } from "./types";

export interface CreateMatchPayload {
  durationSeconds: number;
  redTeamName: string;
  blueTeamName: string;
  redKeyword: string;
  blueKeyword: string;
}

export interface InteractionResult {
  accepted: boolean;
  match: MatchState;
  event?: ShotEvent;
  reason?: string;
}

export interface CommentResult extends InteractionResult {
  joined?: boolean;
  member?: unknown;
}

export async function createMatch(payload: CreateMatchPayload): Promise<MatchState> {
  return request<MatchState>("/api/matches", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getMatch(matchId: string): Promise<MatchState> {
  return request<MatchState>(`/api/matches/${matchId}`);
}

export async function startMatch(matchId: string): Promise<MatchState> {
  return request<MatchState>(`/api/matches/${matchId}/start`, { method: "POST" });
}

export async function finishMatch(matchId: string): Promise<MatchState> {
  return request<MatchState>(`/api/matches/${matchId}/finish`, { method: "POST" });
}

export async function getLeaderboard(matchId: string): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>(`/api/matches/${matchId}/leaderboard`);
}

export async function simulateComment(payload: {
  matchId: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  content: string;
}): Promise<CommentResult> {
  return request<CommentResult>("/api/simulate/comment", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function simulateLike(payload: {
  matchId: string;
  userId: string;
  randomValue?: number;
}): Promise<InteractionResult> {
  return request<InteractionResult>("/api/simulate/like", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function simulateGift(payload: {
  matchId: string;
  userId: string;
  giftKey: string;
}): Promise<InteractionResult> {
  return request<InteractionResult>("/api/simulate/gift", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function toSnapshot(match: MatchState): MatchSnapshot {
  const members = Object.values(match.members ?? {}) as Array<{
    userId?: string;
    nickname?: string;
    avatarUrl?: string;
    team?: Team;
    score?: number;
    shots?: number;
    hits?: number;
  }>;
  const computedLeaderboard = members
    .filter((member): member is Required<Pick<(typeof members)[number], "userId" | "nickname" | "team">> & (typeof members)[number] => Boolean(member.userId && member.nickname && member.team))
    .map((member) => ({
      userId: member.userId,
      nickname: member.nickname,
      avatarUrl: member.avatarUrl,
      team: member.team,
      score: member.score ?? 0,
      shots: member.shots ?? 0,
      hits: member.hits ?? 0
    }))
    .sort((left, right) => right.score - left.score || right.hits - left.hits || left.nickname.localeCompare(right.nickname, "zh-CN"));
  const leaderboard = match.leaderboard?.length ? match.leaderboard : computedLeaderboard;
  const teamLeaderboards = match.teamLeaderboards ?? {
    red: leaderboard.filter((entry) => entry.team === "red").slice(0, 5),
    blue: leaderboard.filter((entry) => entry.team === "blue").slice(0, 5)
  };
  return {
    id: match.id,
    roomId: match.roomId,
    status: match.status,
    durationSeconds: match.durationSeconds,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    redTeamName: match.redTeamName,
    blueTeamName: match.blueTeamName,
    redKeyword: match.redKeyword,
    blueKeyword: match.blueKeyword,
    scores: match.scores,
    memberCount: match.memberCount ?? {
      red: members.filter((member) => member.team === "red").length,
      blue: members.filter((member) => member.team === "blue").length
    },
    leaderboard,
    teamLeaderboards,
    mvp: match.mvp ?? leaderboard[0],
    recentEvents: match.recentEvents ?? match.events?.slice(-8) ?? [],
    winner: match.winner
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers: Object.fromEntries(headers.entries())
  });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}
