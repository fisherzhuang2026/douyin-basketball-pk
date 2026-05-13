import type { JoinedMemberEvent } from "./types";

export interface JoinPresentation {
  headline: string;
  teamLabel: string;
  side: "left" | "right";
  accentHex: string;
  accentColor: number;
}

export function buildJoinPresentation(member: JoinedMemberEvent): JoinPresentation {
  if (member.team === "red") {
    return {
      headline: `${member.nickname} 加入红队`,
      teamLabel: "红队新援",
      side: "left",
      accentHex: "#ff5a6b",
      accentColor: 0xff5a6b
    };
  }

  return {
    headline: `${member.nickname} 加入蓝队`,
    teamLabel: "蓝队新援",
    side: "right",
    accentHex: "#4eb5ff",
    accentColor: 0x4eb5ff
  };
}
