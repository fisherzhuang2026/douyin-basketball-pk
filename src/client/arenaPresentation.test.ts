import { describe, expect, it } from "vitest";
import { buildArenaCallout, formatArenaTopPlayer, getArenaPhase, getSettlementStats } from "./arenaPresentation";
import type { LeaderboardEntry, MatchSnapshot, ShotEvent } from "./types";

const NOW = new Date("2026-05-13T08:00:00.000Z").getTime();

function shot(overrides: Partial<ShotEvent>): ShotEvent {
  return {
    id: overrides.id ?? "shot-1",
    userId: overrides.userId ?? "u1",
    nickname: overrides.nickname ?? "阿强",
    team: overrides.team ?? "red",
    eventType: overrides.eventType ?? "like",
    score: overrides.score ?? 1,
    hit: overrides.hit ?? true,
    createdAt: overrides.createdAt ?? new Date(NOW).toISOString(),
    ...overrides
  };
}

function entry(overrides: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    userId: overrides.userId ?? "u1",
    nickname: overrides.nickname ?? "阿强",
    team: overrides.team ?? "red",
    score: overrides.score ?? 0,
    shots: overrides.shots ?? 0,
    hits: overrides.hits ?? 0,
    avatarUrl: overrides.avatarUrl,
    ...overrides
  };
}

function snapshot(overrides: Partial<MatchSnapshot>): MatchSnapshot {
  const redTop = entry({ userId: "r1", nickname: "阿强", team: "red", score: overrides.scores?.red ?? 0, shots: 2, hits: 1 });
  const blueTop = entry({ userId: "b1", nickname: "小鱼", team: "blue", score: overrides.scores?.blue ?? 0, shots: 2, hits: 1 });
  return {
    id: "match-1",
    roomId: "demo-room",
    status: "running",
    durationSeconds: 300,
    startedAt: new Date(NOW - 10_000).toISOString(),
    redTeamName: "红队",
    blueTeamName: "蓝队",
    redKeyword: "红队",
    blueKeyword: "蓝队",
    scores: { red: 0, blue: 0 },
    memberCount: { red: 1, blue: 1 },
    leaderboard: [redTop, blueTop],
    teamLeaderboards: { red: [redTop], blue: [blueTop] },
    mvp: redTop,
    recentEvents: [],
    ...overrides
  };
}

describe("arena presentation helpers", () => {
  it("maps match status and time into reviewable arena phases", () => {
    expect(getArenaPhase(undefined, undefined, undefined, NOW)).toBe("idle");
    expect(getArenaPhase("running", new Date(NOW - 1000).toISOString(), 300, NOW)).toBe("opening");
    expect(getArenaPhase("running", new Date(NOW - 5000).toISOString(), 300, NOW)).toBe("live");
    expect(getArenaPhase("running", new Date(NOW - 275_000).toISOString(), 300, NOW)).toBe("clutch");
    expect(getArenaPhase("finished", new Date(NOW).toISOString(), 300, NOW)).toBe("settlement");
  });

  it("announces a comeback when the leading team changes", () => {
    const previous = snapshot({ scores: { red: 4, blue: 2 } });
    const current = snapshot({ scores: { red: 4, blue: 5 } });

    expect(buildArenaCallout(previous, current, [])).toMatchObject({
      tone: "blue",
      title: "蓝队反超"
    });
  });

  it("announces a team streak after three consecutive made shots", () => {
    const current = snapshot({ scores: { red: 6, blue: 2 } });
    const recentShots = [
      shot({ id: "s1", team: "blue", hit: true }),
      shot({ id: "s2", team: "red", hit: true }),
      shot({ id: "s3", team: "red", hit: true }),
      shot({ id: "s4", team: "red", hit: true })
    ];

    expect(buildArenaCallout(undefined, current, recentShots)).toMatchObject({
      tone: "red",
      title: "红队连中 3 球"
    });
  });

  it("formats empty and occupied top player slots without stretching the UI", () => {
    expect(formatArenaTopPlayer()).toBe("等待上榜");
    expect(formatArenaTopPlayer(entry({ nickname: "超长昵称球王一号", score: 12 }))).toBe("超长昵称球王一号 12分");
  });

  it("builds settlement stats from snapshot leaders and visible events", () => {
    const current = snapshot({
      leaderboard: [
        entry({ userId: "r1", team: "red", score: 8, shots: 4, hits: 3 }),
        entry({ userId: "b1", team: "blue", score: 5, shots: 3, hits: 2 })
      ],
      recentEvents: [
        shot({ id: "s1", team: "red", eventType: "like", hit: true }),
        shot({ id: "s2", team: "red", eventType: "gift", hit: true, score: 2 }),
        shot({ id: "s3", team: "blue", eventType: "gift", hit: true, score: 3 })
      ]
    });

    expect(getSettlementStats(current)).toEqual({
      totalShots: 7,
      likeShots: 1,
      giftShots: 2,
      bestStreakLabel: "红队 2 连中"
    });
  });
});
