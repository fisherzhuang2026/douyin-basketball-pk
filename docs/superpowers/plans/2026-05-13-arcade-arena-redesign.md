# Arcade Arena Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the current Dou-BA demo from a simple shooting panel into a complete neon arcade basketball arena flow that shows opening ceremony, team participation, like shots, tiered gift skills, live interaction feedback, and award-style settlement.

**Architecture:** Keep scoring and compliance rules in `src/shared` and `src/server`; add presentation-only arena state helpers in `src/client`; upgrade `src/client/gameScene.ts` to render the arena, ceremony, clutch state, live callouts, and award ceremony without changing match scoring. Use Vitest to lock gift duration, arena stage, and leaderboard formatting behavior, then verify with `npm test` and `npm run build`.

**Tech Stack:** Vue 3, Phaser 3, TypeScript, Fastify, PostgreSQL, Vitest, Vite.

---

### Task 1: Lock Updated Gift Duration Rules

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/presentation.test.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/courtStyle.test.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/presentation.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/courtStyle.ts`

- [ ] **Step 1: Update duration tests**

Change the mid-tier expectations from `3000` to `3500` and high-tier expectations from `4000` to `5000`.

Expected assertions:

```ts
expect(getGiftEffectPresentation("energy_pill")).toMatchObject({
  tier: "mid",
  effectDurationMs: 3500
});
expect(getGiftEffectPresentation("mystery_airdrop")).toMatchObject({
  tier: "high",
  effectDurationMs: 5000
});
expect(getGiftEffectTiming("mid")).toMatchObject({
  totalDuration: 3500,
  iconHoldDuration: 2850,
  atmosphereRings: 4
});
expect(getGiftEffectTiming("high")).toMatchObject({
  totalDuration: 5000,
  iconHoldDuration: 4300,
  atmosphereRings: 7
});
```

- [ ] **Step 2: Run focused tests and confirm failure before implementation**

Run: `npm test -- src/client/presentation.test.ts src/client/courtStyle.test.ts`

Expected: tests fail on the old `3000` and `4000` duration values.

- [ ] **Step 3: Update duration implementation**

Set `getGiftEffectDurationMs("mid")` to `3500`, `getGiftEffectDurationMs("high")` to `5000`, and update `getGiftEffectTiming()` to return the tested timing values.

- [ ] **Step 4: Run focused tests and confirm pass**

Run: `npm test -- src/client/presentation.test.ts src/client/courtStyle.test.ts`

Expected: all tests in both files pass.

### Task 2: Add Arena Presentation Helpers

**Files:**
- Create: `E:/codexSpace/douyin-basketball-pk/src/client/arenaPresentation.ts`
- Create: `E:/codexSpace/douyin-basketball-pk/src/client/arenaPresentation.test.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/types.ts`

- [ ] **Step 1: Add tests for arena phase and callouts**

Create tests that cover:

```ts
expect(getArenaPhase(undefined, undefined)).toBe("idle");
expect(getArenaPhase("running", new Date(Date.now() - 1000).toISOString(), 300)).toBe("opening");
expect(getArenaPhase("running", new Date(Date.now() - 5000).toISOString(), 300)).toBe("live");
expect(getArenaPhase("running", new Date(Date.now() - 275000).toISOString(), 300)).toBe("clutch");
expect(getArenaPhase("finished", new Date().toISOString(), 300)).toBe("settlement");
```

Also test that a score flip returns a comeback callout and three consecutive hits by one team returns a streak callout.

- [ ] **Step 2: Implement helper types**

Add exported types:

```ts
export type ArenaPhase = "idle" | "opening" | "live" | "clutch" | "settlement";
export interface ArenaCallout {
  id: string;
  tone: "red" | "blue" | "gold" | "neutral";
  title: string;
  body: string;
}
```

- [ ] **Step 3: Implement helpers**

Implement:

```ts
export function getArenaPhase(status?: MatchSnapshot["status"], startedAt?: string, durationSeconds = 300, now = Date.now()): ArenaPhase;
export function buildArenaCallout(previous: MatchSnapshot | undefined, current: MatchSnapshot | undefined, recentShots: ShotEvent[]): ArenaCallout | undefined;
export function formatArenaTopPlayer(entry?: LeaderboardEntry): string;
export function getSettlementStats(snapshot: MatchSnapshot): { totalShots: number; likeShots: number; giftShots: number; bestStreakLabel: string };
```

The helpers must only derive display state from existing match data and shot events. They must not alter score or member state.

- [ ] **Step 4: Run helper tests**

Run: `npm test -- src/client/arenaPresentation.test.ts`

Expected: all helper tests pass.

### Task 3: Upgrade Vue Shell And Host Copy

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/App.vue`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/HostPanel.vue`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/SimulatorPanel.vue`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/style.css`

- [ ] **Step 1: Pass arena phase and callout props**

Compute `arenaPhase`, maintain a bounded `recentShots` array, and pass them to `GameCanvas`.

- [ ] **Step 2: Add review-safe rule copy**

Ensure the host panel says:

```text
点赞固定 30% 命中，命中 +1 分；官方弹幕小玩法礼物按低/中/高三档固定命中，分别 +1/+2/+3 分。
```

Do not add any text that implies betting, reward exchange, cashback, prize draw, or configurable probability.

- [ ] **Step 3: Separate stage and control panel scrolling**

Make `.stage` and `.side` independent scroll containers with fixed viewport height so live流水 cannot stretch the audience-stage layout.

- [ ] **Step 4: Build shell**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

### Task 4: Redesign Phaser Arena Stage

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/GameCanvas.vue`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/gameScene.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/courtStyle.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/courtStyle.test.ts`

- [ ] **Step 1: Add `phase` and `callout` props to `GameCanvas`**

The component should forward `phase` and `callout` into Phaser scene data whenever props change.

- [ ] **Step 2: Add arena layers**

In `GameScene`, split drawing into stable layers:

```ts
private backgroundLayer?: Phaser.GameObjects.Container;
private scoreboardLayer?: Phaser.GameObjects.Container;
private teamLayer?: Phaser.GameObjects.Container;
private ceremonyLayer?: Phaser.GameObjects.Container;
private calloutLayer?: Phaser.GameObjects.Container;
private settlementLayer?: Phaser.GameObjects.Container;
```

- [ ] **Step 3: Render neon arcade court**

Replace the flat court look with a dark neon arena: LED scoreboard, red/blue supporter bays, central arcade hoop, backboard glow, court title on center circle, and bottom ticker that never overlaps the ball path.

- [ ] **Step 4: Render opening ceremony**

When phase is `opening`, render a 3-second countdown overlay with team lights and `READY / GO` treatment.

- [ ] **Step 5: Render clutch state**

When phase is `clutch`, make countdown and rim lighting pulse faster and display `最后 30 秒` callout.

- [ ] **Step 6: Run visual style tests**

Run: `npm test -- src/client/courtStyle.test.ts`

Expected: updated style tests pass.

### Task 5: Strengthen Interaction And Gift Skill Effects

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/gameScene.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/presentation.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/presentation.test.ts`

- [ ] **Step 1: Keep like shot lightweight**

Like shots use the standard orange ball, short neon arc, small rim spark, fixed 30% hit rule, and no gift icon.

- [ ] **Step 2: Make low-tier gifts quick-shot effects**

Low-tier gifts hold about `1600ms`, use gift icon badges, star particles, and +1 score label.

- [ ] **Step 3: Make mid-tier gifts 3.5-second skill effects**

Mid-tier gifts hold about `3500ms`, use gift-specific ball skins, thicker energy trails, icon orbit, and a slower rim glow.

- [ ] **Step 4: Make high-tier gifts 5-second highlight effects**

High-tier gifts hold about `5000ms`, use full-screen light sweep, stronger camera shake, larger gift icon entrance, slower hoop explosion, and +3 highlight label.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test -- src/client/presentation.test.ts src/client/courtStyle.test.ts`

Expected: tests pass.

Run: `npm run build`

Expected: build succeeds.

### Task 6: Upgrade Settlement To Award Ceremony

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/gameScene.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/arenaPresentation.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/arenaPresentation.test.ts`

- [ ] **Step 1: Add settlement stats tests**

Test that `getSettlementStats()` counts total shots, like shots, gift shots, and best streak label from existing snapshot leaderboards and recent events.

- [ ] **Step 2: Render award-stage settlement**

Settlement should show:

```text
本局结束：红队获胜 / 蓝队获胜 / 双方平局
红队最终分
蓝队最终分
MVP 头像 + 昵称 + 得分 + 命中次数
红队贡献榜前五
蓝队贡献榜前五
总投篮 / 点赞触发 / 礼物触发 / 最高连中
```

- [ ] **Step 3: Verify no overlap**

Extract a screenshot or run the live demo and confirm MVP row, contribution lists, and footer are visually separated.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/client/arenaPresentation.test.ts`

Expected: tests pass.

### Task 7: Final Verification And Review Assets

**Files:**
- Modify if needed: `E:/codexSpace/douyin-basketball-pk/hyperframes/douba-evaluation-video/scripts/record-live-demo.mjs`
- Output: `C:/Users/Admin/Downloads/斗篮机提案素材-最新/斗篮机-demo-完整实机录屏-带配音.mp4`

- [ ] **Step 1: Run full automated verification**

Run: `npm test`

Expected: all Vitest suites pass.

Run: `npm run build`

Expected: TypeScript and Vite build succeed.

- [ ] **Step 2: Run local app**

Run server: `npm run dev:server`

Run web app: `npm run dev -- --host 0.0.0.0`

Health check: `Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3001/api/health`

Expected: response contains `"ok":true`.

- [ ] **Step 3: Record updated live demo**

Use the existing live-recording script after updating the scripted interactions if necessary.

Expected video contents:

```text
Opening ceremony
Audience joins both teams
Like shot
Low-tier gift shot
Mid-tier 3.5s gift skill
High-tier 5s gift highlight
Live contribution and MVP updates
Award-style settlement
```

- [ ] **Step 4: Verify final video**

Run `ffprobe` on the output MP4.

Expected: one H.264 video stream, one AAC audio stream, 1920x1080 resolution, full flow visible.

---

## Self-Review Notes

- Spec coverage: opening ceremony, arena stage, like shots, low/mid/high gift effects, callouts, clutch time, award settlement, video verification are each mapped to a task.
- Scope: this is one cohesive visual and interaction redesign of the existing demo; no backend scoring change is required.
- Compliance guardrails: no probability configuration, no gambling wording, no reward exchange, no team switching.
- Placeholder scan: this plan contains no unresolved marker words or unspecified implementation placeholders.
