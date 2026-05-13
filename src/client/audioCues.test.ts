import { describe, expect, it } from "vitest";
import { getJoinCueId, getSettlementCueId, getShotCueId, getSoundCue } from "./audioCues";
import type { JoinedMemberEvent, MatchSnapshot, ShotEvent } from "./types";

function shot(overrides: Partial<ShotEvent>): ShotEvent {
  return {
    id: overrides.id ?? "s1",
    userId: overrides.userId ?? "u1",
    nickname: overrides.nickname ?? "阿强",
    team: overrides.team ?? "red",
    eventType: overrides.eventType ?? "like",
    giftKey: overrides.giftKey,
    score: overrides.score ?? 1,
    hit: overrides.hit ?? true,
    createdAt: "2026-05-13T08:00:00.000Z"
  };
}

function join(overrides: Partial<JoinedMemberEvent>): JoinedMemberEvent {
  return {
    userId: overrides.userId ?? "u1",
    nickname: overrides.nickname ?? "阿强",
    team: overrides.team ?? "red",
    avatarUrl: overrides.avatarUrl
  };
}

function snapshot(winner: MatchSnapshot["winner"]): MatchSnapshot {
  return {
    id: "m1",
    roomId: "demo",
    status: "finished",
    durationSeconds: 300,
    redTeamName: "红队",
    blueTeamName: "蓝队",
    redKeyword: "红队",
    blueKeyword: "蓝队",
    scores: { red: 1, blue: 0 },
    memberCount: { red: 1, blue: 1 },
    leaderboard: [],
    teamLeaderboards: { red: [], blue: [] },
    recentEvents: [],
    winner
  };
}

describe("audio cues", () => {
  it("maps team joins to separate rising cues", () => {
    expect(getJoinCueId(join({ team: "red" }))).toBe("join-red");
    expect(getJoinCueId(join({ team: "blue" }))).toBe("join-blue");
  });

  it("maps like shot results to launch, score, and miss cues", () => {
    expect(getShotCueId(shot({ eventType: "like", hit: true }))).toBe("score-like");
    expect(getShotCueId(shot({ eventType: "like", hit: false }))).toBe("miss");
  });

  it("maps gift shot cues by official gift tier", () => {
    expect(getShotCueId(shot({ eventType: "gift", giftKey: "fairy_stick", hit: true }))).toBe("gift-low-score");
    expect(getShotCueId(shot({ eventType: "gift", giftKey: "energy_pill", hit: true }))).toBe("gift-mid-score");
    expect(getShotCueId(shot({ eventType: "gift", giftKey: "super_jet", hit: true }))).toBe("gift-high-score");
  });

  it("maps settlement cues for winner and draw", () => {
    expect(getSettlementCueId(snapshot("red"))).toBe("settlement-win");
    expect(getSettlementCueId(snapshot("blue"))).toBe("settlement-win");
    expect(getSettlementCueId(snapshot("draw"))).toBe("settlement-draw");
  });

  it("keeps high gift cues audibly richer than low gift cues", () => {
    expect(getSoundCue("gift-high-score").tones.length).toBeGreaterThan(getSoundCue("gift-low-score").tones.length);
    expect(getSoundCue("gift-high-score").durationMs).toBeGreaterThan(getSoundCue("gift-low-score").durationMs);
  });
});
