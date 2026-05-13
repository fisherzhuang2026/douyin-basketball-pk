# Dou-BA Gift Effect Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the eight default official gift presentations so each gift has a distinct visual action, particle language, and proposal storyboard while preserving the safe scoring rule of 100% hit with +1/+2/+3 tiers.

**Architecture:** Keep gift identity and effect metadata centralized in `src/shared/gifts.ts`, expose client-friendly presentation via `src/client/presentation.ts`, and let `src/client/gameScene.ts` render different Phaser effects based on an `effectKind`. Regenerate the proposal DOCX storyboard from `E:/codexSpace/scripts/update_proposal_gift_rules.py` so code, proposal text, and review images stay aligned.

**Tech Stack:** Vue 3, Phaser 3, TypeScript, Vitest, Python Pillow, python-docx.

---

### Task 1: Lock Gift Effect Metadata With Tests

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/shared/gifts.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/presentation.test.ts`
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/presentation.ts`

- [ ] **Step 1: Write the failing test**

Add assertions that the default eight gifts expose unique `effectKind` values and clearer motion labels:

```ts
expect(getGiftEffectPresentation("fairy_stick")).toMatchObject({ effectKind: "star", motionLabel: "星光快投" });
expect(getGiftEffectPresentation("magic_mirror")).toMatchObject({ effectKind: "mirror", motionLabel: "镜面反弹" });
expect(getGiftEffectPresentation("donut")).toMatchObject({ effectKind: "donut", motionLabel: "糖果弧线" });
expect(getGiftEffectPresentation("super_jet")).toMatchObject({ effectKind: "jet", motionLabel: "火箭喷射" });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/client/presentation.test.ts`

Expected: FAIL because `effectKind` and `motionLabel` are not implemented.

- [ ] **Step 3: Implement metadata**

Add `GiftEffectKind` and `motionLabel` to the official catalog and presentation mapping. Keep score values unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/client/presentation.test.ts`

Expected: PASS.

### Task 2: Render Different Phaser Effects

**Files:**
- Modify: `E:/codexSpace/douyin-basketball-pk/src/client/gameScene.ts`

- [ ] **Step 1: Reuse effect metadata**

Use `effect.effectKind` to branch the launch/hit particles:

```ts
switch (effect.effectKind) {
  case "mirror":
    this.playMirrorEffect(...);
    break;
  case "airdrop":
    this.playAirdropEffect(...);
    break;
}
```

- [ ] **Step 2: Implement focused helper methods**

Add small helpers for mirror portal, donut orbit, battery lightning, love blast, airdrop box, and jet trails. Helpers should push their display objects into `activeShotObjects` and self-fade with tweens.

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: PASS with only the existing Vite chunk-size warning.

### Task 3: Regenerate Proposal Storyboard

**Files:**
- Modify: `E:/codexSpace/scripts/update_proposal_gift_rules.py`
- Output: `C:/Users/Admin/Downloads/【提案评估】Dou-BA篮球投篮机双队PK-官方礼物规则版.docx`

- [ ] **Step 1: Expand storyboard**

Redraw the gift storyboard as an eight-card grid with unique visuals:

```text
仙女棒 星光快投
能力药丸 体能爆发
魔法镜 镜面反弹
甜甜圈 糖果弧线
能量电池 充能暴投
爱的爆炸 爱心爆扣
神秘空投 空投砸筐
超能喷射 火箭喷射
```

- [ ] **Step 2: Render DOCX**

Run `render_docx.py --renderer artifact-tool` and inspect key pages, especially the gift storyboard page.

- [ ] **Step 3: Final verification**

Run:

```powershell
npm test
npm run build
```

Expected: tests and build pass; DOCX render shows no old gift names, clipping, or text overlap.
