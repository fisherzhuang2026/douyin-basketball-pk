import { describe, expect, it } from "vitest";
import { formatInteractionFeedback } from "./feedback";

describe("interaction feedback", () => {
  it("explains why a gift did not trigger a shot", () => {
    expect(formatInteractionFeedback({ accepted: false, reason: "not_joined" }, "gift")).toBe("送礼未触发：该观众还没入队，请先发送红队/蓝队口令");
    expect(formatInteractionFeedback({ accepted: false, reason: "not_running" }, "gift")).toBe("送礼未触发：对局还没开始，请先点击开始");
  });
});
