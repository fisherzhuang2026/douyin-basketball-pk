import { describe, expect, it } from "vitest";
import { buildSettlementCeremony } from "./settlementPresentation";
import type { LeaderboardEntry, MatchSnapshot, ShotEvent, Team } from "./types";

function entry(userId: string, nickname: string, team: Team, score: number, shots = score, hits = score): LeaderboardEntry {
  return {
    userId,
    nickname,
    team,
    score,
    shots,
    hits,
    avatarUrl: `https://example.com/${userId}.png`
  };
}

function shot(id: string, team: Team, eventType: ShotEvent["eventType"], hit = true): ShotEvent {
  return {
    id,
    userId: `${team}-${id}`,
    nickname: `${team}-${id}`,
    team,
    eventType,
    score: eventType === "gift" ? 2 : 1,
    hit,
    createdAt: "2026-05-13T08:00:00.000Z"
  };
}

function snapshot(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  const redLeaders = [
    entry("r1", "阿强", "red", 18, 10, 8),
    entry("r2", "柠檬", "red", 12, 8, 6),
    entry("r3", "小红", "red", 9, 5, 4),
    entry("r4", "山风", "red", 6, 4, 3),
    entry("r5", "橘子", "red", 4, 3, 2),
    entry("r6", "第六人", "red", 2, 2, 1)
  ];
  const blueLeaders = [
    entry("b1", "小鱼", "blue", 15, 9, 7),
    entry("b2", "球王", "blue", 8, 5, 3)
  ];

  return {
    id: "match-1",
    roomId: "demo-room",
    status: "finished",
    durationSeconds: 300,
    redTeamName: "红队",
    blueTeamName: "蓝队",
    redKeyword: "红队",
    blueKeyword: "蓝队",
    scores: { red: 48, blue: 36 },
    memberCount: { red: 12, blue: 9 },
    leaderboard: [...redLeaders, ...blueLeaders],
    teamLeaderboards: { red: redLeaders, blue: blueLeaders },
    mvp: redLeaders[0],
    recentEvents: [
      shot("s1", "red", "like"),
      shot("s2", "red", "gift"),
      shot("s3", "blue", "gift"),
      shot("s4", "blue", "like", false)
    ],
    winner: "red",
    ...overrides
  };
}

describe("settlement podium presentation", () => {
  it("builds a ceremony headline, scoreline, and three podium slots", () => {
    const ceremony = buildSettlementCeremony(snapshot());

    expect(ceremony.title).toBe("红队夺冠");
    expect(ceremony.scoreline).toBe("48 : 36");
    expect(ceremony.winnerTone).toBe("red");
    expect(ceremony.podium.center?.label).toBe("MVP");
    expect(ceremony.podium.center?.player.nickname).toBe("阿强");
    expect(ceremony.podium.left?.label).toBe("红队王牌");
    expect(ceremony.podium.right?.label).toBe("蓝队王牌");
  });

  it("caps both contribution boards to top five rows", () => {
    const ceremony = buildSettlementCeremony(snapshot());

    expect(ceremony.boards.red.rows).toHaveLength(5);
    expect(ceremony.boards.red.rows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(ceremony.boards.red.rows.map((row) => row.player.nickname)).not.toContain("第六人");
    expect(ceremony.boards.blue.rows).toHaveLength(2);
  });

  it("formats bottom match data as compact stat chips", () => {
    const ceremony = buildSettlementCeremony(snapshot());

    expect(ceremony.statChips).toEqual([
      { label: "总投篮", value: "46次" },
      { label: "点赞投篮", value: "2次" },
      { label: "礼物助攻", value: "2次" },
      { label: "最高连中", value: "红队 2 连中" }
    ]);
  });

  it("uses a neutral award title for tied matches", () => {
    const ceremony = buildSettlementCeremony(snapshot({ winner: "draw", scores: { red: 30, blue: 30 } }));

    expect(ceremony.title).toBe("巅峰平局");
    expect(ceremony.winnerTone).toBe("draw");
    expect(ceremony.scoreline).toBe("30 : 30");
  });
});
