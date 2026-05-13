import { beforeAll, describe, expect, it } from "vitest";
import { joinTeamByComment, processGift, processLike, startMatch } from "../shared/domain";
import { createPool, ensureDatabase, initializeSchema, resetSchema } from "./db";
import { PostgresRepository } from "./repository";

describe("PostgresRepository", () => {
  let repository: PostgresRepository;

  beforeAll(async () => {
    await ensureDatabase();
    const pool = createPool();
    await initializeSchema(pool);
    await resetSchema(pool);
    repository = new PostgresRepository(pool);
  });

  it("creates and reloads a default match with configured duration", async () => {
    const match = await repository.createMatch({
      durationSeconds: 300,
      redTeamName: "烈焰队",
      blueTeamName: "海浪队"
    });

    const reloaded = await repository.getMatch(match.id);

    expect(reloaded?.durationSeconds).toBe(300);
    expect(reloaded?.redTeamName).toBe("烈焰队");
    expect(reloaded?.blueTeamName).toBe("海浪队");
    expect(reloaded?.scores).toEqual({ red: 0, blue: 0 });
  });

  it("persists members, shot events, and scores", async () => {
    const created = await repository.createMatch({ durationSeconds: 300 });
    const running = startMatch(created, new Date("2026-05-08T12:00:00.000Z"));
    const joined = joinTeamByComment(running, {
      userId: "u1",
      nickname: "阿强",
      content: "红队",
      now: new Date("2026-05-08T12:00:01.000Z")
    }).match;
    const gifted = processGift(joined, {
      userId: "u1",
      giftKey: "love_blast",
      now: new Date("2026-05-08T12:00:02.000Z")
    }).match;
    const liked = processLike(gifted, {
      userId: "u1",
      randomValue: 0.1,
      now: new Date("2026-05-08T12:00:03.000Z")
    }).match;

    await repository.saveMatch(liked);
    const reloaded = await repository.getMatch(created.id);
    const leaderboard = await repository.getLeaderboard(created.id);

    expect(reloaded?.status).toBe("running");
    expect(reloaded?.scores.red).toBe(4);
    expect(reloaded?.events).toHaveLength(2);
    expect(leaderboard[0]).toMatchObject({
      userId: "u1",
      nickname: "阿强",
      team: "red",
      score: 4,
      hits: 2
    });
  });
});
