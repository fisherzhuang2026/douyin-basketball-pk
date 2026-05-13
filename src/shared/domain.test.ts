import { describe, expect, it } from "vitest";
import {
  createDefaultMatch,
  finishMatch,
  getLeaderboard,
  getMvp,
  getTeamLeaderboards,
  joinTeamByComment,
  processGift,
  processLike,
  settleExpiredMatch,
  startMatch,
  validateDurationSeconds
} from "./domain";

describe("domain rules", () => {
  it("accepts only configured match durations up to 30 minutes", () => {
    expect(validateDurationSeconds(180)).toBe(true);
    expect(validateDurationSeconds(300)).toBe(true);
    expect(validateDurationSeconds(1800)).toBe(true);
    expect(validateDurationSeconds(60)).toBe(false);
    expect(validateDurationSeconds(1810)).toBe(false);
  });

  it("joins a user by comment keyword and locks the team for the match", () => {
    const match = createDefaultMatch({ durationSeconds: 300 });

    const first = joinTeamByComment(match, {
      userId: "u1",
      nickname: "阿强",
      content: "红队"
    });
    const second = joinTeamByComment(first.match, {
      userId: "u1",
      nickname: "阿强",
      content: "蓝队"
    });

    expect(first.joined).toBe(true);
    expect(first.member?.team).toBe("red");
    expect(second.joined).toBe(false);
    expect(second.reason).toBe("already_joined");
    expect(second.match.members.u1.team).toBe("red");
  });

  it("processes like shots only for joined users", () => {
    const match = startMatch(
      joinTeamByComment(createDefaultMatch({ durationSeconds: 300 }), {
        userId: "u1",
        nickname: "阿强",
        content: "蓝队"
      }).match,
      new Date("2026-05-08T12:00:00.000Z")
    );

    const hit = processLike(match, {
      userId: "u1",
      randomValue: 0.1,
      now: new Date("2026-05-08T12:00:01.000Z")
    });
    const ignored = processLike(hit.match, {
      userId: "unknown",
      randomValue: 0,
      now: new Date("2026-05-08T12:00:02.000Z")
    });

    expect(hit.accepted).toBe(true);
    expect(hit.event?.hit).toBe(true);
    expect(hit.match.scores.blue).toBe(1);
    expect(ignored.accepted).toBe(false);
    expect(ignored.reason).toBe("not_joined");
  });

  it("keeps like shots fixed at 30 percent and plus one score", () => {
    const match = startMatch(
      joinTeamByComment(createDefaultMatch({ durationSeconds: 300 }), {
        userId: "u1",
        nickname: "阿强",
        content: "红队"
      }).match,
      new Date("2026-05-08T12:00:00.000Z")
    );
    match.likeHitRate = 1;
    match.likeScore = 9;

    const miss = processLike(match, {
      userId: "u1",
      randomValue: 0.31,
      now: new Date("2026-05-08T12:00:01.000Z")
    });
    const hit = processLike(miss.match, {
      userId: "u1",
      randomValue: 0.29,
      now: new Date("2026-05-08T12:00:02.000Z")
    });

    expect(miss.accepted).toBe(true);
    expect(miss.event).toMatchObject({ hit: false, score: 0, hitRateSnapshot: 0.3 });
    expect(hit.event).toMatchObject({ hit: true, score: 1, hitRateSnapshot: 0.3 });
    expect(hit.match.scores.red).toBe(1);
  });

  it("uses fixed scoring for configured official gift tiers", () => {
    const match = startMatch(
      joinTeamByComment(createDefaultMatch({ durationSeconds: 300 }), {
        userId: "u2",
        nickname: "小鱼",
        avatarUrl: "https://example.com/avatar/u2.png",
        content: "红队"
      }).match,
      new Date("2026-05-08T12:00:00.000Z")
    );

    const result = processGift(match, {
      userId: "u2",
      giftKey: "love_blast",
      now: new Date("2026-05-08T12:00:01.000Z")
    });

    expect(result.accepted).toBe(true);
    expect(result.event?.hit).toBe(true);
    expect(result.event?.score).toBe(3);
    expect(result.event?.avatarUrl).toBe("https://example.com/avatar/u2.png");
    expect(result.match.scores.red).toBe(3);

    const low = processGift(result.match, {
      userId: "u2",
      giftKey: "fairy_stick",
      now: new Date("2026-05-08T12:00:02.000Z")
    });
    const mid = processGift(low.match, {
      userId: "u2",
      giftKey: "energy_pill",
      now: new Date("2026-05-08T12:00:03.000Z")
    });

    expect(low.event).toMatchObject({ hit: true, score: 1 });
    expect(mid.event).toMatchObject({ hit: true, score: 2 });
    expect(mid.match.scores.red).toBe(6);
  });

  it("finishes a match and sorts the leaderboard by contribution", () => {
    const base = createDefaultMatch({ durationSeconds: 300 });
    const withRed = joinTeamByComment(base, { userId: "u1", nickname: "阿强", content: "红队" }).match;
    const withBlue = joinTeamByComment(withRed, { userId: "u2", nickname: "小鱼", content: "蓝队" }).match;
    const running = startMatch(withBlue, new Date("2026-05-08T12:00:00.000Z"));
    const redGift = processGift(running, {
      userId: "u1",
      giftKey: "fairy_stick",
      now: new Date("2026-05-08T12:00:01.000Z")
    }).match;
    const blueGift = processGift(redGift, {
      userId: "u2",
      giftKey: "love_blast",
      now: new Date("2026-05-08T12:00:02.000Z")
    }).match;
    const finished = finishMatch(blueGift, new Date("2026-05-08T12:05:00.000Z"));

    expect(finished.status).toBe("finished");
    expect(finished.winner).toBe("blue");
    expect(getLeaderboard(finished).map((entry) => [entry.nickname, entry.score])).toEqual([
      ["小鱼", 3],
      ["阿强", 1]
    ]);
  });

  it("returns each team top five contributors and the match MVP", () => {
    let match = createDefaultMatch({ durationSeconds: 300 });
    const players = [
      ["r1", "红一", "红队", 10],
      ["r2", "红二", "红队", 8],
      ["r3", "红三", "红队", 7],
      ["r4", "红四", "红队", 6],
      ["r5", "红五", "红队", 5],
      ["r6", "红六", "红队", 4],
      ["b1", "蓝一", "蓝队", 12],
      ["b2", "蓝二", "蓝队", 9],
      ["b3", "蓝三", "蓝队", 6]
    ] as const;

    for (const [userId, nickname, content] of players) {
      match = joinTeamByComment(match, { userId, nickname, content }).match;
    }
    for (const [userId, , , score] of players) {
      match.members[userId].score = score;
      match.members[userId].shots = score;
      match.members[userId].hits = Math.ceil(score / 2);
      match.scores[match.members[userId].team] += score;
    }

    const teamLeaderboards = getTeamLeaderboards(match, 5);

    expect(teamLeaderboards.red.map((entry) => entry.nickname)).toEqual(["红一", "红二", "红三", "红四", "红五"]);
    expect(teamLeaderboards.blue.map((entry) => entry.nickname)).toEqual(["蓝一", "蓝二", "蓝三"]);
    expect(getMvp(match)?.nickname).toBe("蓝一");
  });

  it("settles a running match after its configured duration", () => {
    const running = startMatch(createDefaultMatch({ durationSeconds: 180 }), new Date("2026-05-08T12:00:00.000Z"));

    const stillOpening = settleExpiredMatch(running, new Date("2026-05-08T12:00:03.400Z"));
    const stillRunning = settleExpiredMatch(running, new Date("2026-05-08T12:03:03.499Z"));
    const finished = settleExpiredMatch(running, new Date("2026-05-08T12:03:03.500Z"));

    expect(stillOpening.status).toBe("running");
    expect(stillRunning.status).toBe("running");
    expect(finished.status).toBe("finished");
    expect(finished.endedAt?.toISOString()).toBe("2026-05-08T12:03:03.500Z");
    expect(finished.winner).toBe("draw");
  });
});
