# Settlement Podium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old settlement information panel with a post-match award podium.

**Architecture:** Add a testable presentation helper for ceremony structure, then have the Phaser scene render that structure with podium blocks, leaderboard cards, stat chips, and entrance animation.

**Tech Stack:** Vue 3, Phaser, TypeScript, Vitest.

---

### Task 1: Presentation Contract

**Files:**
- Create: `src/client/settlementPresentation.test.ts`
- Create: `src/client/settlementPresentation.ts`

- [ ] Write tests for winner title, podium slots, TOP5 limits, and stat chips.
- [ ] Run `npm test -- src/client/settlementPresentation.test.ts` and verify the missing helper fails.
- [ ] Implement `buildSettlementCeremony(snapshot)`.
- [ ] Re-run the focused test.

### Task 2: Phaser Ceremony Render

**Files:**
- Modify: `src/client/gameScene.ts`

- [ ] Replace `renderAwardSettlement` internals with the new ceremony structure.
- [ ] Add helper drawing functions for podium blocks, podium players, leaderboard cards, stat chips, and confetti.
- [ ] Remove unused old `renderSettlement` path.
- [ ] Run the focused test and full build.

### Task 3: Verification

**Files:**
- Modify as needed after verification.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Capture a settlement screenshot if the local app is available.
- [ ] Commit and push if verification passes.
