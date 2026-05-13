import { describe, expect, it } from "vitest";
import { buildJoinPresentation } from "./joinPresentation";
import type { JoinedMemberEvent } from "./types";

function member(overrides: Partial<JoinedMemberEvent>): JoinedMemberEvent {
  return {
    userId: overrides.userId ?? "u1",
    nickname: overrides.nickname ?? "阿强",
    team: overrides.team ?? "red",
    avatarUrl: overrides.avatarUrl
  };
}

describe("join presentation", () => {
  it("builds red team join copy and visual metadata", () => {
    expect(buildJoinPresentation(member({ team: "red", nickname: "阿强" }))).toEqual({
      headline: "阿强 加入红队",
      teamLabel: "红队新援",
      side: "left",
      accentHex: "#ff5a6b",
      accentColor: 0xff5a6b
    });
  });

  it("builds blue team join copy and visual metadata", () => {
    expect(buildJoinPresentation(member({ team: "blue", nickname: "小鱼" }))).toEqual({
      headline: "小鱼 加入蓝队",
      teamLabel: "蓝队新援",
      side: "right",
      accentHex: "#4eb5ff",
      accentColor: 0x4eb5ff
    });
  });
});
