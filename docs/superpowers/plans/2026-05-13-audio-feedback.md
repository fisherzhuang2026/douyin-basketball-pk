# Audio Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add synthesized sound effects for join, shot, gift, score, miss, and settlement moments.

**Architecture:** Keep sound cue selection pure and tested in `audioCues.ts`; keep Web Audio side effects isolated in `audioEngine.ts`; wire event playback from `App.vue`.

**Tech Stack:** Vue 3, TypeScript, Web Audio API, Vitest.

---

### Task 1: Cue Mapping

**Files:**
- Create: `src/client/audioCues.ts`
- Create: `src/client/audioCues.test.ts`

- [ ] Test join, like shot, miss, low gift, mid gift, high gift, and settlement cues.
- [ ] Run the focused test to verify it fails before implementation.
- [ ] Implement cue mapping and cue recipes.
- [ ] Re-run focused tests.

### Task 2: Runtime Audio Engine

**Files:**
- Create: `src/client/audioEngine.ts`

- [ ] Implement safe Web Audio unlock, enable state, volume state, and cue playback.
- [ ] Do not throw if `AudioContext` is unavailable.
- [ ] Keep default volume conservative.

### Task 3: UI And Event Wiring

**Files:**
- Modify: `src/App.vue`
- Modify: `src/client/HostPanel.vue`
- Modify: `src/style.css`

- [ ] Add sound toggle and volume slider to host panel.
- [ ] Unlock audio on host/simulator user actions.
- [ ] Play join, shot, miss, gift tier, and settlement cues from existing event paths.

### Task 4: Verification

**Files:**
- Modify as needed after verification.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Confirm local UI still loads.
- [ ] Commit and push.
