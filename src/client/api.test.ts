import { afterEach, describe, expect, it, vi } from "vitest";
import { startMatch } from "./api";

describe("client api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not send a JSON content type when a POST request has no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "match-1",
          roomId: "demo-room",
          status: "running",
          durationSeconds: 180,
          redTeamName: "红队",
          blueTeamName: "蓝队",
          redKeyword: "红队",
          blueKeyword: "蓝队",
          scores: { red: 0, blue: 0 }
        }),
      text: () => Promise.resolve("")
    });
    vi.stubGlobal("fetch", fetchMock);

    await startMatch("match-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/matches/match-1/start",
      expect.objectContaining({
        method: "POST",
        headers: {}
      })
    );
  });
});
