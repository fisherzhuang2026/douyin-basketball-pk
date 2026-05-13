import { getSettlementStats } from "./arenaPresentation";
import type { LeaderboardEntry, MatchSnapshot, Team } from "./types";

export type SettlementTone = Team | "draw";

export interface SettlementPodiumSlot {
  label: string;
  player: LeaderboardEntry;
  team: Team;
}

export interface SettlementBoardRow {
  rank: number;
  player: LeaderboardEntry;
}

export interface SettlementBoard {
  title: string;
  team: Team;
  rows: SettlementBoardRow[];
}

export interface SettlementStatChip {
  label: string;
  value: string;
}

export interface SettlementCeremony {
  title: string;
  scoreline: string;
  winnerTone: SettlementTone;
  winnerName: string;
  podium: {
    center?: SettlementPodiumSlot;
    left?: SettlementPodiumSlot;
    right?: SettlementPodiumSlot;
  };
  boards: Record<Team, SettlementBoard>;
  statChips: SettlementStatChip[];
}

export function buildSettlementCeremony(snapshot: MatchSnapshot): SettlementCeremony {
  const winnerTone = snapshot.winner ?? "draw";
  const winnerName = winnerTone === "draw" ? "双方平局" : getTeamName(snapshot, winnerTone);
  const mvp = snapshot.mvp ?? snapshot.leaderboard[0];
  const redTop = snapshot.teamLeaderboards.red[0];
  const blueTop = snapshot.teamLeaderboards.blue[0];
  const stats = getSettlementStats(snapshot);

  return {
    title: winnerTone === "draw" ? "巅峰平局" : `${winnerName}夺冠`,
    scoreline: `${snapshot.scores.red} : ${snapshot.scores.blue}`,
    winnerTone,
    winnerName,
    podium: {
      center: mvp ? { label: "MVP", player: mvp, team: mvp.team } : undefined,
      left: redTop ? { label: "红队王牌", player: redTop, team: "red" } : undefined,
      right: blueTop ? { label: "蓝队王牌", player: blueTop, team: "blue" } : undefined
    },
    boards: {
      red: buildBoard(snapshot.redTeamName, "red", snapshot.teamLeaderboards.red),
      blue: buildBoard(snapshot.blueTeamName, "blue", snapshot.teamLeaderboards.blue)
    },
    statChips: [
      { label: "总投篮", value: `${stats.totalShots}次` },
      { label: "点赞投篮", value: `${stats.likeShots}次` },
      { label: "礼物助攻", value: `${stats.giftShots}次` },
      { label: "最高连中", value: stats.bestStreakLabel }
    ]
  };
}

function buildBoard(title: string, team: Team, rows: LeaderboardEntry[]): SettlementBoard {
  return {
    title: `${title} TOP5`,
    team,
    rows: rows.slice(0, 5).map((player, index) => ({
      rank: index + 1,
      player
    }))
  };
}

function getTeamName(snapshot: MatchSnapshot, team: Team): string {
  return team === "red" ? snapshot.redTeamName : snapshot.blueTeamName;
}
