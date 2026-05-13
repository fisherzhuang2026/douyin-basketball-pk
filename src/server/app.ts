import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { WebSocketServer, type WebSocket } from "ws";
import {
  finishMatch,
  getLeaderboard,
  getMvp,
  getTeamLeaderboards,
  joinTeamByComment,
  processGift,
  processLike,
  settleExpiredMatch,
  startMatch,
  type MatchState
} from "../shared/domain";
import type { PostgresRepository } from "./repository";

interface BuildAppOptions {
  repository: PostgresRepository;
  now?: () => Date;
}

interface MatchParams {
  id: string;
}

interface CreateMatchBody {
  durationSeconds: number;
  roomId?: string;
  redTeamName?: string;
  blueTeamName?: string;
  redKeyword?: string;
  blueKeyword?: string;
}

interface CommentBody {
  matchId: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  content: string;
}

interface LikeBody {
  matchId: string;
  userId: string;
  randomValue?: number;
}

interface GiftBody {
  matchId: string;
  userId: string;
  giftKey: string;
}

interface FollowBody {
  matchId: string;
  userId: string;
  nickname: string;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const clients = new Set<WebSocket>();
  const wss = new WebSocketServer({ server: app.server, path: "/ws" });
  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
  });

  function broadcast(type: string, payload: unknown) {
    const message = JSON.stringify({ type, payload });
    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  }

  function broadcastSnapshot(match: MatchState) {
    broadcast("match.snapshot", toSnapshot(match));
  }

  async function settleMatch(match: MatchState): Promise<MatchState> {
    const settled = settleExpiredMatch(match, options.now?.() ?? new Date());
    if (settled.status === "finished" && match.status !== "finished") {
      await options.repository.saveMatch(settled);
      broadcast("match.finished", toSnapshot(settled));
      broadcastSnapshot(settled);
    }
    return settled;
  }

  async function getSettledMatch(matchId: string): Promise<MatchState | undefined> {
    const match = await options.repository.getMatch(matchId);
    return match ? settleMatch(match) : undefined;
  }

  app.get("/api/health", async () => ({ ok: true }));

  app.post<{ Body: CreateMatchBody }>("/api/matches", async (request) => {
    const match = await options.repository.createMatch(request.body);
    broadcastSnapshot(match);
    return toSnapshot(match);
  });

  app.get<{ Params: MatchParams }>("/api/matches/:id", async (request, reply) => {
    const match = await getSettledMatch(request.params.id);
    if (!match) {
      return reply.status(404).send({ error: "match_not_found" });
    }
    return toSnapshot(match);
  });

  app.post<{ Params: MatchParams }>("/api/matches/:id/start", async (request, reply) => {
    const match = await options.repository.getMatch(request.params.id);
    if (!match) {
      return reply.status(404).send({ error: "match_not_found" });
    }
    const started = startMatch(match, options.now?.() ?? new Date());
    await options.repository.saveMatch(started);
    broadcast("match.started", toSnapshot(started));
    broadcastSnapshot(started);
    return started;
  });

  app.post<{ Params: MatchParams }>("/api/matches/:id/finish", async (request, reply) => {
    const match = await getSettledMatch(request.params.id);
    if (!match) {
      return reply.status(404).send({ error: "match_not_found" });
    }
    const finished = finishMatch(match, options.now?.() ?? new Date());
    await options.repository.saveMatch(finished);
    broadcast("match.finished", toSnapshot(finished));
    broadcastSnapshot(finished);
    return finished;
  });

  app.get<{ Params: MatchParams }>("/api/matches/:id/leaderboard", async (request) => {
    await getSettledMatch(request.params.id);
    return options.repository.getLeaderboard(request.params.id);
  });

  app.post<{ Body: CommentBody }>("/api/simulate/comment", async (request, reply) => {
    const match = await getSettledMatch(request.body.matchId);
    if (!match) {
      return reply.status(404).send({ error: "match_not_found" });
    }
    const result = joinTeamByComment(match, {
      userId: request.body.userId,
      nickname: request.body.nickname,
      avatarUrl: request.body.avatarUrl,
      content: request.body.content
    });
    await options.repository.saveMatch(result.match);
    if (result.joined) {
      broadcast("member.joined", result.member);
    }
    broadcastSnapshot(result.match);
    return result;
  });

  app.post<{ Body: LikeBody }>("/api/simulate/like", async (request, reply) => {
    const match = await getSettledMatch(request.body.matchId);
    if (!match) {
      return reply.status(404).send({ error: "match_not_found" });
    }
    const result = processLike(match, {
      userId: request.body.userId,
      randomValue: request.body.randomValue ?? Math.random(),
      now: options.now?.() ?? new Date()
    });
    await options.repository.saveMatch(result.match);
    if (result.event) {
      broadcast("shot.result", result.event);
    }
    broadcastSnapshot(result.match);
    return result;
  });

  app.post<{ Body: GiftBody }>("/api/simulate/gift", async (request, reply) => {
    const match = await getSettledMatch(request.body.matchId);
    if (!match) {
      return reply.status(404).send({ error: "match_not_found" });
    }
    const result = processGift(match, {
      userId: request.body.userId,
      giftKey: request.body.giftKey,
      now: options.now?.() ?? new Date()
    });
    await options.repository.saveMatch(result.match);
    if (result.event) {
      broadcast("shot.result", result.event);
    }
    broadcastSnapshot(result.match);
    return result;
  });

  app.post<{ Body: FollowBody }>("/api/simulate/follow", async (request) => {
    const payload = {
      matchId: request.body.matchId,
      userId: request.body.userId,
      nickname: request.body.nickname,
      message: "关注不参与核心计分，可提示用户发送红队/蓝队口令加入比赛。"
    };
    broadcast("follow.received", payload);
    return { accepted: true, payload };
  });

  app.addHook("onClose", async () => {
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  return app;
}

function toSnapshot(match: MatchState) {
  const leaderboard = getLeaderboard(match).slice(0, 10);
  const teamLeaderboards = getTeamLeaderboards(match, 5);
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
    memberCount: {
      red: Object.values(match.members).filter((member) => member.team === "red").length,
      blue: Object.values(match.members).filter((member) => member.team === "blue").length
    },
    leaderboard,
    teamLeaderboards,
    mvp: getMvp(match),
    recentEvents: match.events.slice(-8),
    winner: match.winner
  };
}
