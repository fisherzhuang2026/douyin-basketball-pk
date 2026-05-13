# Dou-BA Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the proposal review feedback by improving the app name, live play visual quality, gift UI effects, and proposal document completeness.

**Architecture:** Keep the existing Vue3 + Phaser + Fastify + PostgreSQL demo architecture. Add a small tested presentation metadata module for Chinese naming and gift effect copy, then use it from the Phaser scene and Vue shell. Regenerate the DOCX proposal with richer screenshots, animated gift-effect evidence, and a feedback remediation checklist.

**Tech Stack:** Vue3, Phaser 3, TypeScript, Vitest, Python `python-docx`, PIL, artifact-tool DOCX renderer.

---

### Task 1: Presentation Metadata And Tests

**Files:**
- Create: `src/client/presentation.ts`
- Create: `src/client/presentation.test.ts`
- Modify: `src/client/gameScene.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: Write failing tests for Chinese naming and gift effect metadata**

Create tests asserting that the primary display name is not pure English and that `heart`, `rose`, and unknown configured gifts have distinct UI effect labels.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- src/client/presentation.test.ts`
Expected: FAIL because `presentation.ts` does not exist yet.

- [ ] **Step 3: Implement presentation metadata**

Export `PLAY_TITLE`, `PLAY_SUBTITLE`, `getGiftEffectPresentation()`, and `formatShotStatus()`.

- [ ] **Step 4: Wire app copy to Chinese primary name**

Use `PLAY_TITLE` and `PLAY_SUBTITLE` in `App.vue` and `gameScene.ts`.

- [ ] **Step 5: Re-run the focused test**

Run: `npm test -- src/client/presentation.test.ts`
Expected: PASS.

### Task 2: Gift Effects And Stronger Arcade Visuals

**Files:**
- Modify: `src/client/gameScene.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Add gift effect overlays in Phaser**

For gift shots, show a themed badge, color ring, and particles. `heart` uses heart bubbles/pink glow, `rose` uses petals/gold flourish, unknown configured gifts use a special purple-blue burst.

- [ ] **Step 2: Upgrade hit feedback**

Make scoring text include the gift name when applicable, add stronger flash/shake, and keep non-gift like shots as a smaller effect.

- [ ] **Step 3: Upgrade stage shell**

Improve host/stage visual copy and panel styling so screenshots look like a review-ready live play rather than a bare demo.

- [ ] **Step 4: Run project tests and build**

Run: `npm test`
Run: `npm run build`
Expected: both exit 0.

### Task 3: Proposal Document Remediation

**Files:**
- Modify: `E:/codexSpace/fill_basketball_proposal.py`
- Modify output: `C:/Users/Admin/Downloads/【提案评估】DY-BA篮球投篮机双队PK-可提交版.docx`

- [ ] **Step 1: Backup the current DOCX**

Copy the existing document to a timestamped `.bak.docx` file in Downloads.

- [ ] **Step 2: Rename the proposal**

Use Chinese primary name `斗篮机：篮球投篮机双队PK（DY-BA）`.

- [ ] **Step 3: Add review remediation checklist**

Add a table that directly responds to each review issue: no pure-English name, complete content, richer main UI, main gameplay interaction draft included, and gift UI effect GIF/storyboard included.

- [ ] **Step 4: Add richer visual assets**

Generate main UI screenshot, settlement screenshot, gift effect storyboard/GIF evidence, and system flow diagram with clear Chinese text.

- [ ] **Step 5: Regenerate and render the DOCX**

Run the Python filler script, then render with `render_docx.py --renderer artifact-tool`.

- [ ] **Step 6: Visually inspect every rendered page**

Open all `page-*.png` outputs and fix any overflow, clipping, title/image separation, or empty figure cells.

### Task 4: Final Verification

**Files:**
- Read/verify generated DOCX and build artifacts.

- [ ] **Step 1: Check file timestamp and size**

Run a `Get-Item` check for the final DOCX.

- [ ] **Step 2: Report concise outcome**

Report the final DOCX path, project tests/build status, and any required manual upload note for GIF/video.
