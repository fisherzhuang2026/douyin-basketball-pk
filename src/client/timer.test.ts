import { describe, expect, it } from "vitest";
import { formatSeconds, getRemainingSeconds, hasCountdownExpired } from "./timer";

describe("match timer", () => {
  it("counts down from startedAt using the current clock", () => {
    const startedAt = "2026-05-08T10:00:00.000Z";

    expect(getRemainingSeconds(180, startedAt, Date.parse("2026-05-08T10:00:00.000Z"))).toBe(180);
    expect(getRemainingSeconds(180, startedAt, Date.parse("2026-05-08T10:00:01.200Z"))).toBe(179);
    expect(getRemainingSeconds(180, startedAt, Date.parse("2026-05-08T10:03:05.000Z"))).toBe(0);
  });

  it("formats seconds as mm:ss", () => {
    expect(formatSeconds(180)).toBe("03:00");
    expect(formatSeconds(179)).toBe("02:59");
  });

  it("detects when a running countdown reaches zero", () => {
    const startedAt = "2026-05-08T10:00:00.000Z";

    expect(hasCountdownExpired(180, startedAt, Date.parse("2026-05-08T10:02:59.000Z"))).toBe(false);
    expect(hasCountdownExpired(180, startedAt, Date.parse("2026-05-08T10:03:00.000Z"))).toBe(true);
  });
});
