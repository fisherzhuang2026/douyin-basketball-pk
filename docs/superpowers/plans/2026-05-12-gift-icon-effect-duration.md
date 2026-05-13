# Gift Icon Effect Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Dou-BA gift effects use official gift icons and keep mid-tier effects visible for about 3 seconds and high-tier effects visible for about 4 seconds.

**Architecture:** Keep gift business rules in `src/shared/gifts.ts`, add icon URL mapping in `src/client/giftIconAssets.ts`, expose display metadata through `src/client/presentation.ts`, and render duration-aware Phaser effects in `src/client/gameScene.ts`.

**Tech Stack:** Vue 3, Phaser 3, TypeScript, Vitest, Vite.

---

### Task 1: Add Tests For Icon And Duration Metadata

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/presentation.test.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/courtStyle.test.ts`

- [ ] Add a test that `getGiftEffectPresentation("energy_pill")` has `tier: "mid"` and `effectDurationMs: 3000`.
- [ ] Add a test that `getGiftEffectPresentation("mystery_airdrop")` has `tier: "high"` and `effectDurationMs: 4000`.
- [ ] Add a test that every default enabled gift has an `iconAssetUrl` and `iconTextureKey`.
- [ ] Run `npm test -- src/client/presentation.test.ts src/client/courtStyle.test.ts` and confirm the new assertions fail before implementation.

### Task 2: Add Icon Assets And Metadata

**Files:**
- Create: `E:/codexSpace/douyin-basketball-pk/src/client/assets/gifts/*.png`
- Create: `E:/codexSpace/douyin-basketball-pk/src/client/giftIconAssets.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/env.d.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/presentation.ts`

- [ ] Extract `C:/Users/Admin/Downloads/礼物icon.zip` into ASCII filenames.
- [ ] Map existing gift keys to icon URLs and Phaser texture keys.
- [ ] Add PNG module typing.
- [ ] Add `tier`, `effectDurationMs`, `iconAssetUrl`, and `iconTextureKey` to presentation metadata.
- [ ] Run metadata tests and confirm they pass.

### Task 3: Render Duration-Aware Phaser Effects

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/gameScene.ts`

- [ ] Add `preload()` to load mapped icon assets.
- [ ] Render gift icon badges during gift launch and hit moments.
- [ ] Use `effectDurationMs` for launch tag, particles, rim glow, and cleanup delay.
- [ ] Add stronger mid/high tier effects without changing scoring or match state.
- [ ] Run `npm run build`.

### Task 4: Final Verification

**Commands:**
- `npm test`
- `npm run build`

- [ ] Confirm tests pass.
- [ ] Confirm build exits successfully.
