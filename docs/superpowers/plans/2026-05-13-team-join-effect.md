# Team Join Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible arena animation when a viewer successfully joins red or blue team.

**Architecture:** A typed joined-member payload flows from WebSocket to Vue props into the Phaser scene. A tiny presentation helper owns team color/copy/rail metadata, while `gameScene.ts` owns drawing and animation.

**Tech Stack:** Vue 3, Phaser, TypeScript, Vitest.

---

### Task 1: Presentation Helper

**Files:**
- Create: `src/client/joinPresentation.ts`
- Create: `src/client/joinPresentation.test.ts`

- [ ] Add tests for red and blue join copy, color, and side metadata.
- [ ] Run the focused test and verify it fails because the helper does not exist.
- [ ] Implement the helper.
- [ ] Re-run the focused test.

### Task 2: Event Wiring

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/App.vue`
- Modify: `src/client/GameCanvas.vue`

- [ ] Add a `JoinedMemberEvent` type.
- [ ] Store the latest joined member in `App.vue`.
- [ ] Pass the payload to `GameCanvas`.
- [ ] Watch the prop and call `scene.playJoinEffect`.

### Task 3: Phaser Effect

**Files:**
- Modify: `src/client/gameScene.ts`

- [ ] Add a join-effect object layer and cleanup helpers.
- [ ] Draw rail flash, avatar fly-in, center callout, and team particles.
- [ ] Ensure the effect does not clear active shot objects.

### Task 4: Verification

**Files:**
- Modify as needed after verification.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Capture a joined-state screenshot if the local app is available.
- [ ] Commit and push.
