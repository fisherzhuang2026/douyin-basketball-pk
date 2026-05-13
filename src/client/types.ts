export type Team = "red" | "blue";
export type MatchStatus = "draft" | "running" | "finished";

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  team: Team;
  score: number;
  shots: number;
  hits: number;
}

export interface ShotEvent {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  team: Team;
  eventType: "like" | "gift";
  giftKey?: string;
  score: number;
  hit: boolean;
  hitRateSnapshot?: number;
  createdAt: string;
}

export interface JoinedMemberEvent {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  team: Team;
}

export interface MatchSnapshot {
  id: string;
  roomId: string;
  status: MatchStatus;
  durationSeconds: number;
  startedAt?: string;
  endedAt?: string;
  redTeamName: string;
  blueTeamName: string;
  redKeyword: string;
  blueKeyword: string;
  scores: Record<Team, number>;
  memberCount: Record<Team, number>;
  leaderboard: LeaderboardEntry[];
  teamLeaderboards: Record<Team, LeaderboardEntry[]>;
  mvp?: LeaderboardEntry;
  recentEvents: ShotEvent[];
  winner?: Team | "draw";
}

export interface MatchState extends MatchSnapshot {
  members?: Record<string, unknown>;
  events?: ShotEvent[];
}

export interface SocketMessage {
  type: string;
  payload: unknown;
}
