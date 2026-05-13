import { beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { createPool, ensureDatabase, initializeSchema, resetSchema } from "./db";
import { PostgresRepository } from "./repository";

describe("Fastify app", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let repository: PostgresRepository;
  let now = new Date("2026-05-08T12:00:00.000Z");

  beforeAll(async () => {
    await ensureDatabase();
    const pool = createPool();
    await initializeSchema(pool);
    await resetSchema(pool);
    repository = new PostgresRepository(pool);
    app = await buildApp({ repository, now: () => now });
  });

  it("runs the full simulator flow through HTTP APIs", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/matches",
      payload: {
        durationSeconds: 300,
        redTeamName: "烈焰队",
        blueTeamName: "海浪队",
        likeHitRate: 1,
        likeScore: 9
      }
    });
    expect(createResponse.statusCode).toBe(200);
    const created = createResponse.json();

    const startResponse = await app.inject({
      method: "POST",
      url: `/api/matches/${created.id}/start`
    });
    expect(startResponse.statusCode).toBe(200);

    const joinResponse = await app.inject({
      method: "POST",
      url: "/api/simulate/comment",
      payload: {
        matchId: created.id,
        userId: "u1",
        nickname: "阿强",
        content: "红队"
      }
    });
    expect(joinResponse.statusCode).toBe(200);
    expect(joinResponse.json().joined).toBe(true);

    const blueJoinResponse = await app.inject({
      method: "POST",
      url: "/api/simulate/comment",
      payload: {
        matchId: created.id,
        userId: "u2",
        nickname: "小鱼",
        avatarUrl: "https://example.com/u2.png",
        content: "蓝队"
      }
    });
    expect(blueJoinResponse.statusCode).toBe(200);
    expect(blueJoinResponse.json().joined).toBe(true);

    const likeResponse = await app.inject({
      method: "POST",
      url: "/api/simulate/like",
      payload: {
        matchId: created.id,
        userId: "u1",
        randomValue: 0.1
      }
    });
    expect(likeResponse.statusCode).toBe(200);
    expect(likeResponse.json().event.score).toBe(1);

    const missedLikeResponse = await app.inject({
      method: "POST",
      url: "/api/simulate/like",
      payload: {
        matchId: created.id,
        userId: "u1",
        randomValue: 0.31
      }
    });
    expect(missedLikeResponse.statusCode).toBe(200);
    expect(missedLikeResponse.json().event).toMatchObject({
      hit: false,
      score: 0,
      hitRateSnapshot: 0.3
    });

    const giftResponse = await app.inject({
      method: "POST",
      url: "/api/simulate/gift",
      payload: {
        matchId: created.id,
        userId: "u1",
        giftKey: "love_blast"
      }
    });
    expect(giftResponse.statusCode).toBe(200);
    expect(giftResponse.json().event.score).toBe(3);

    const blueGiftResponse = await app.inject({
      method: "POST",
      url: "/api/simulate/gift",
      payload: {
        matchId: created.id,
        userId: "u2",
        giftKey: "energy_pill"
      }
    });
    expect(blueGiftResponse.statusCode).toBe(200);
    expect(blueGiftResponse.json().event).toMatchObject({
      nickname: "小鱼",
      avatarUrl: "https://example.com/u2.png",
      score: 2,
      team: "blue"
    });

    const leaderboardResponse = await app.inject({
      method: "GET",
      url: `/api/matches/${created.id}/leaderboard`
    });
    expect(leaderboardResponse.statusCode).toBe(200);
    expect(leaderboardResponse.json()[0]).toMatchObject({
      nickname: "阿强",
      score: 4,
      hits: 2
    });
    expect(leaderboardResponse.json()[1]).toMatchObject({
      nickname: "小鱼",
      score: 2,
      hits: 1
    });

    const snapshotResponse = await app.inject({
      method: "GET",
      url: `/api/matches/${created.id}`
    });
    expect(snapshotResponse.statusCode).toBe(200);
    expect(snapshotResponse.json()).toMatchObject({
      mvp: {
        nickname: "阿强",
        score: 4
      },
      teamLeaderboards: {
        red: [
          {
            nickname: "阿强",
            score: 4
          }
        ],
        blue: [
          {
            nickname: "小鱼",
            score: 2
          }
        ]
      }
    });
  });

  it("auto-finishes an expired running match when it is read", async () => {
    now = new Date("2026-05-08T13:00:00.000Z");
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/matches",
      payload: {
        durationSeconds: 180,
        redTeamName: "红队",
        blueTeamName: "蓝队"
      }
    });
    const created = createResponse.json();

    const startResponse = await app.inject({
      method: "POST",
      url: `/api/matches/${created.id}/start`
    });
    expect(startResponse.json().status).toBe("running");

    now = new Date("2026-05-08T13:03:00.000Z");
    const beforeOpeningGraceResponse = await app.inject({
      method: "GET",
      url: `/api/matches/${created.id}`
    });

    expect(beforeOpeningGraceResponse.statusCode).toBe(200);
    expect(beforeOpeningGraceResponse.json().status).toBe("running");

    now = new Date("2026-05-08T13:03:03.500Z");
    const readResponse = await app.inject({
      method: "GET",
      url: `/api/matches/${created.id}`
    });

    expect(readResponse.statusCode).toBe(200);
    expect(readResponse.json()).toMatchObject({
      status: "finished",
      winner: "draw"
    });
    expect(readResponse.json().endedAt).toBe("2026-05-08T13:03:03.500Z");
  });
});
