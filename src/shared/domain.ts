import { DEFAULT_GIFT_RULES, type GiftAnimationType } from "./gifts";

export type Team = "red" | "blue";
export type MatchStatus = "draft" | "running" | "finished";
export type EventType = "like" | "gift";

export const ALLOWED_DURATIONS_SECONDS = [180, 300, 600, 900, 1200, 1500, 1800] as const;
export const FIXED_LIKE_HIT_RATE = 0.3;
export const FIXED_LIKE_SCORE = 1;

export interface GiftRule {
  giftKey: string;
  giftName: string;
  score: number;
  animationType: GiftAnimationType;
  enabled: boolean;
}

export interface MatchMember {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  team: Team;
  joinedAt: Date;
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
  eventType: EventType;
  giftKey?: string;
  score: number;
  hit: boolean;
  hitRateSnapshot?: number;
  createdAt: Date;
}

export interface MatchState {
  id: string;
  roomId: string;
  status: MatchStatus;
  durationSeconds: number;
  startedAt?: Date;
  endedAt?: Date;
  redTeamName: string;
  blueTeamName: string;
  redKeyword: string;
  blueKeyword: string;
  likeHitRate: number;
  likeScore: number;
  giftRules: Record<string, GiftRule>;
  members: Record<string, MatchMember>;
  scores: Record<Team, number>;
  events: ShotEvent[];
  winner?: Team | "draw";
}

export interface CommentInput {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  content: string;
  now?: Date;
}

export interface LikeInput {
  userId: string;
  randomValue: number;
  now?: Date;
}

export interface GiftInput {
  userId: string;
  giftKey: string;
  now?: Date;
}

export interface JoinResult {
  match: MatchState;
  joined: boolean;
  member?: MatchMember;
  reason?: "already_joined" | "keyword_not_matched";
}

export interface ShotResult {
  match: MatchState;
  accepted: boolean;
  event?: ShotEvent;
  reason?: "not_running" | "not_joined" | "gift_not_configured";
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  team: Team;
  score: number;
  shots: number;
  hits: number;
}

let generatedId = 0;

export function validateDurationSeconds(durationSeconds: number): boolean {
  return ALLOWED_DURATIONS_SECONDS.includes(durationSeconds as (typeof ALLOWED_DURATIONS_SECONDS)[number]);
}

export function createDefaultMatch(options: {
  id?: string;
  roomId?: string;
  durationSeconds: number;
}): MatchState {
  if (!validateDurationSeconds(options.durationSeconds)) {
    throw new Error(`Unsupported durationSeconds: ${options.durationSeconds}`);
  }

  return {
    id: options.id ?? `match-${++generatedId}`,
    roomId: options.roomId ?? "demo-room",
    status: "draft",
    durationSeconds: options.durationSeconds,
    redTeamName: "红队",
    blueTeamName: "蓝队",
    redKeyword: "红队",
    blueKeyword: "蓝队",
    likeHitRate: FIXED_LIKE_HIT_RATE,
    likeScore: FIXED_LIKE_SCORE,
    giftRules: cloneDefaultGiftRules(),
    members: {},
    scores: { red: 0, blue: 0 },
    events: []
  };
}

function cloneDefaultGiftRules(): Record<string, GiftRule> {
  return Object.fromEntries(Object.entries(DEFAULT_GIFT_RULES).map(([key, rule]) => [key, { ...rule }]));
}

export function startMatch(match: MatchState, now = new Date()): MatchState {
  return {
    ...cloneMatch(match),
    status: "running",
    startedAt: now,
    endedAt: undefined,
    winner: undefined
  };
}

export function finishMatch(match: MatchState, now = new Date()): MatchState {
  const next = cloneMatch(match);
  const winner = next.scores.red === next.scores.blue ? "draw" : next.scores.red > next.scores.blue ? "red" : "blue";

  return {
    ...next,
    status: "finished",
    endedAt: now,
    winner
  };
}

export function settleExpiredMatch(match: MatchState, now = new Date()): MatchState {
  const next = cloneMatch(match);
  if (next.status !== "running" || !next.startedAt) {
    return next;
  }

  const elapsedMs = now.getTime() - next.startedAt.getTime();
  if (elapsedMs < next.durationSeconds * 1000) {
    return next;
  }

  return finishMatch(next, now);
}

export function joinTeamByComment(match: MatchState, input: CommentInput): JoinResult {
  const existing = match.members[input.userId];
  if (existing) {
    return { match: cloneMatch(match), joined: false, member: cloneMember(existing), reason: "already_joined" };
  }

  const content = input.content.trim();
  const team = content === match.redKeyword ? "red" : content === match.blueKeyword ? "blue" : undefined;
  if (!team) {
    return { match: cloneMatch(match), joined: false, reason: "keyword_not_matched" };
  }

  const next = cloneMatch(match);
  const member: MatchMember = {
    userId: input.userId,
    nickname: input.nickname,
    avatarUrl: input.avatarUrl,
    team,
    joinedAt: input.now ?? new Date(),
    score: 0,
    shots: 0,
    hits: 0
  };
  next.members[input.userId] = member;

  return { match: next, joined: true, member: cloneMember(member) };
}

export function processLike(match: MatchState, input: LikeInput): ShotResult {
  const activeMatch = settleExpiredMatch(match, input.now ?? new Date());
  if (activeMatch.status !== "running") {
    return { match: activeMatch, accepted: false, reason: "not_running" };
  }

  const member = activeMatch.members[input.userId];
  if (!member) {
    return { match: activeMatch, accepted: false, reason: "not_joined" };
  }

  const hit = input.randomValue < FIXED_LIKE_HIT_RATE;
  const score = hit ? FIXED_LIKE_SCORE : 0;
  return applyShot(activeMatch, member, {
    eventType: "like",
    score,
    hit,
    hitRateSnapshot: FIXED_LIKE_HIT_RATE,
    createdAt: input.now ?? new Date()
  });
}

export function processGift(match: MatchState, input: GiftInput): ShotResult {
  const activeMatch = settleExpiredMatch(match, input.now ?? new Date());
  if (activeMatch.status !== "running") {
    return { match: activeMatch, accepted: false, reason: "not_running" };
  }

  const member = activeMatch.members[input.userId];
  if (!member) {
    return { match: activeMatch, accepted: false, reason: "not_joined" };
  }

  const rule = activeMatch.giftRules[input.giftKey];
  if (!rule?.enabled) {
    return { match: activeMatch, accepted: false, reason: "gift_not_configured" };
  }

  return applyShot(activeMatch, member, {
    eventType: "gift",
    giftKey: input.giftKey,
    score: rule.score,
    hit: true,
    createdAt: input.now ?? new Date()
  });
}

export function getLeaderboard(match: MatchState): LeaderboardEntry[] {
  return Object.values(match.members)
    .map((member) => ({
      userId: member.userId,
      nickname: member.nickname,
      avatarUrl: member.avatarUrl,
      team: member.team,
      score: member.score,
      shots: member.shots,
      hits: member.hits
    }))
    .sort((left, right) => right.score - left.score || right.hits - left.hits || left.nickname.localeCompare(right.nickname, "zh-CN"));
}

export function getTeamLeaderboards(match: MatchState, limit = 5): Record<Team, LeaderboardEntry[]> {
  const leaderboard = getLeaderboard(match);
  return {
    red: leaderboard.filter((entry) => entry.team === "red").slice(0, limit),
    blue: leaderboard.filter((entry) => entry.team === "blue").slice(0, limit)
  };
}

export function getMvp(match: MatchState): LeaderboardEntry | undefined {
  return getLeaderboard(match)[0];
}

function applyShot(
  match: MatchState,
  member: MatchMember,
  shot: Pick<ShotEvent, "eventType" | "giftKey" | "score" | "hit" | "hitRateSnapshot" | "createdAt">
): ShotResult {
  const next = cloneMatch(match);
  const nextMember = next.members[member.userId];
  nextMember.shots += 1;
  if (shot.hit) {
    nextMember.hits += 1;
  }
  nextMember.score += shot.score;
  next.scores[nextMember.team] += shot.score;

  const event: ShotEvent = {
    id: `shot-${++generatedId}`,
    userId: nextMember.userId,
    nickname: nextMember.nickname,
    avatarUrl: nextMember.avatarUrl,
    team: nextMember.team,
    eventType: shot.eventType,
    giftKey: shot.giftKey,
    score: shot.score,
    hit: shot.hit,
    hitRateSnapshot: shot.hitRateSnapshot,
    createdAt: shot.createdAt
  };
  next.events.push(event);

  return { match: next, accepted: true, event };
}

function cloneMatch(match: MatchState): MatchState {
  return {
    ...match,
    startedAt: match.startedAt ? new Date(match.startedAt) : undefined,
    endedAt: match.endedAt ? new Date(match.endedAt) : undefined,
    giftRules: Object.fromEntries(Object.entries(match.giftRules).map(([key, value]) => [key, { ...value }])),
    members: Object.fromEntries(Object.entries(match.members).map(([key, value]) => [key, cloneMember(value)])),
    scores: { ...match.scores },
    events: match.events.map((event) => ({ ...event, createdAt: new Date(event.createdAt) }))
  };
}

function cloneMember(member: MatchMember): MatchMember {
  return {
    ...member,
    joinedAt: new Date(member.joinedAt)
  };
}
