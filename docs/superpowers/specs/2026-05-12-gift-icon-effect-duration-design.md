# Gift Icon Effect Duration Design

## Goal

Upgrade Dou-BA gift effects so review videos clearly show gift-specific visuals: mid-tier gifts should sustain roughly 3 seconds of visible effect, and high-tier gifts should sustain roughly 4 seconds of visible effect. Gift visuals should reference the provided official icon package.

## Scope

- Keep match rules unchanged: likes, team joining, scoring, hit decisions, MVP, and settlement logic stay as-is.
- Add local gift icon assets from `C:/Users/Admin/Downloads/礼物icon.zip`.
- Add client-side presentation metadata for icon texture keys, icon asset URLs, and target effect duration.
- Update Phaser launch/hit effects so mid-tier and high-tier gifts stay on screen longer and look more differentiated.

## Design

- Extract icon files into `src/client/assets/gifts` with ASCII filenames for stable Vite builds.
- Add `src/client/giftIconAssets.ts` to map `giftKey` to `{ textureKey, url }`.
- Extend `GiftEffectPresentation` with `tier`, `effectDurationMs`, and optional `iconTextureKey`/`iconAssetUrl`.
- In `BasketballScene.preload`, load all icon assets into Phaser textures.
- During gift launch and hit effects, render the gift icon as a floating badge, add tier-specific screen energy, and use duration helpers:
  - low: about 1.6s
  - mid: about 3.0s
  - high: about 4.0s
- Keep all spawned objects in `activeShotObjects` so overlapping shots can still clean up safely.

## Verification

- Unit tests should prove enabled gifts expose icon assets and tier durations.
- Build should pass with Vite/TypeScript.
