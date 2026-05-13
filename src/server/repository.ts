import { randomUUID } from "node:crypto";
import {
  createDefaultMatch,
  FIXED_LIKE_HIT_RATE,
  FIXED_LIKE_SCORE,
  getLeaderboard,
  type GiftRule,
  type LeaderboardEntry,
  type MatchMember,
  type MatchState,
  type MatchStatus,
  type ShotEvent,
  type Team
} from "../shared/domain";
import type { PgPool } from "./db";

export interface CreateMatchInput {
  durationSeconds: number;
  roomId?: string;
  redTeamName?: string;
  blueTeamName?: string;
  redKeyword?: string;
  blueKeyword?: string;
  giftRules?: GiftRule[];
}

export class PostgresRepository {
  constructor(private readonly pool: PgPool) {}

  async createMatch(input: CreateMatchInput): Promise<MatchState> {
    const match = {
      ...createDefaultMatch({
        id: randomUUID(),
        roomId: input.roomId ?? "demo-room",
        durationSeconds: input.durationSeconds
      }),
      redTeamName: input.redTeamName ?? "红队",
      blueTeamName: input.blueTeamName ?? "蓝队",
      redKeyword: input.redKeyword ?? "红队",
      blueKeyword: input.blueKeyword ?? "蓝队",
      likeHitRate: FIXED_LIKE_HIT_RATE,
      likeScore: FIXED_LIKE_SCORE
    };

    if (input.giftRules) {
      match.giftRules = Object.fromEntries(input.giftRules.map((rule) => [rule.giftKey, rule]));
    }

    await this.saveMatch(match);
    return match;
  }

  async getMatch(matchId: string): Promise<MatchState | undefined> {
    const matchResult = await this.pool.query(
      `
        select * from matches where id = $1
      `,
      [matchId]
    );
    const row = matchResult.rows[0];
    if (!row) {
      return undefined;
    }

    const [giftRulesResult, membersResult, eventsResult, scoresResult] = await Promise.all([
      this.pool.query("select * from match_gift_rules where match_id = $1 order by gift_key", [matchId]),
      this.pool.query("select * from match_members where match_id = $1 order by joined_at", [matchId]),
      this.pool.query("select * from shot_events where match_id = $1 order by created_at, id", [matchId]),
      this.pool.query("select * from match_scores where match_id = $1", [matchId])
    ]);

    const scores = scoresResult.rows[0] ?? { red_score: 0, blue_score: 0 };
    return {
      id: row.id,
      roomId: row.room_id,
      status: row.status as MatchStatus,
      durationSeconds: Number(row.duration_seconds),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      redTeamName: row.red_team_name,
      blueTeamName: row.blue_team_name,
      redKeyword: row.red_keyword,
      blueKeyword: row.blue_keyword,
      likeHitRate: Number(row.like_hit_rate),
      likeScore: Number(row.like_score),
      winner: row.winner ?? undefined,
      giftRules: Object.fromEntries(giftRulesResult.rows.map((giftRow) => [giftRow.gift_key, mapGiftRule(giftRow)])),
      members: Object.fromEntries(membersResult.rows.map((memberRow) => [memberRow.user_id, mapMember(memberRow)])),
      scores: {
        red: Number(scores.red_score),
        blue: Number(scores.blue_score)
      },
      events: eventsResult.rows.map(mapShotEvent)
    };
  }

  async saveMatch(match: MatchState): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `
          insert into matches (
            id, room_id, status, duration_seconds, started_at, ended_at,
            red_team_name, blue_team_name, red_keyword, blue_keyword,
            like_hit_rate, like_score, winner, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
          on conflict (id) do update set
            room_id = excluded.room_id,
            status = excluded.status,
            duration_seconds = excluded.duration_seconds,
            started_at = excluded.started_at,
            ended_at = excluded.ended_at,
            red_team_name = excluded.red_team_name,
            blue_team_name = excluded.blue_team_name,
            red_keyword = excluded.red_keyword,
            blue_keyword = excluded.blue_keyword,
            like_hit_rate = excluded.like_hit_rate,
            like_score = excluded.like_score,
            winner = excluded.winner,
            updated_at = now()
        `,
        [
          match.id,
          match.roomId,
          match.status,
          match.durationSeconds,
          match.startedAt,
          match.endedAt,
          match.redTeamName,
          match.blueTeamName,
          match.redKeyword,
          match.blueKeyword,
          match.likeHitRate,
          match.likeScore,
          match.winner
        ]
      );

      await client.query("delete from match_gift_rules where match_id = $1", [match.id]);
      for (const rule of Object.values(match.giftRules)) {
        await client.query(
          `
            insert into match_gift_rules (id, match_id, gift_key, gift_name, score, animation_type, enabled)
            values ($1, $2, $3, $4, $5, $6, $7)
          `,
          [randomUUID(), match.id, rule.giftKey, rule.giftName, rule.score, rule.animationType, rule.enabled]
        );
      }

      for (const member of Object.values(match.members)) {
        await client.query(
          `
            insert into match_members (
              id, match_id, user_id, nickname, avatar_url, team, joined_at, score, shots, hits
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            on conflict (match_id, user_id) do update set
              nickname = excluded.nickname,
              avatar_url = excluded.avatar_url,
              team = excluded.team,
              score = excluded.score,
              shots = excluded.shots,
              hits = excluded.hits
          `,
          [
            `${match.id}:${member.userId}`,
            match.id,
            member.userId,
            member.nickname,
            member.avatarUrl,
            member.team,
            member.joinedAt,
            member.score,
            member.shots,
            member.hits
          ]
        );
      }

      for (const event of match.events) {
        await client.query(
          `
            insert into shot_events (
              id, match_id, user_id, nickname, team, event_type, gift_key,
              score, hit, hit_rate_snapshot, created_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            on conflict (id) do nothing
          `,
          [
            event.id,
            match.id,
            event.userId,
            event.nickname,
            event.team,
            event.eventType,
            event.giftKey,
            event.score,
            event.hit,
            event.hitRateSnapshot,
            event.createdAt
          ]
        );
      }

      await client.query(
        `
          insert into match_scores (match_id, red_score, blue_score, updated_at)
          values ($1, $2, $3, now())
          on conflict (match_id) do update set
            red_score = excluded.red_score,
            blue_score = excluded.blue_score,
            updated_at = now()
        `,
        [match.id, match.scores.red, match.scores.blue]
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async getLeaderboard(matchId: string): Promise<LeaderboardEntry[]> {
    const match = await this.getMatch(matchId);
    return match ? getLeaderboard(match) : [];
  }
}

function mapGiftRule(row: Record<string, unknown>): GiftRule {
  return {
    giftKey: String(row.gift_key),
    giftName: String(row.gift_name),
    score: Number(row.score),
    animationType: row.animation_type as GiftRule["animationType"],
    enabled: Boolean(row.enabled)
  };
}

function mapMember(row: Record<string, unknown>): MatchMember {
  return {
    userId: String(row.user_id),
    nickname: String(row.nickname),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    team: row.team as Team,
    joinedAt: new Date(row.joined_at as string),
    score: Number(row.score),
    shots: Number(row.shots),
    hits: Number(row.hits)
  };
}

function mapShotEvent(row: Record<string, unknown>): ShotEvent {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    nickname: String(row.nickname),
    avatarUrl: undefined,
    team: row.team as Team,
    eventType: row.event_type as ShotEvent["eventType"],
    giftKey: row.gift_key ? String(row.gift_key) : undefined,
    score: Number(row.score),
    hit: Boolean(row.hit),
    hitRateSnapshot: row.hit_rate_snapshot === null ? undefined : Number(row.hit_rate_snapshot),
    createdAt: new Date(row.created_at as string)
  };
}
