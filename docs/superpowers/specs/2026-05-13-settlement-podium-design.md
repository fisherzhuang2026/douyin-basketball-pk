# Settlement Podium Redesign

## Goal

Turn the finished-match screen from an information panel into a visible post-match award ceremony that clearly differs from the live match UI.

## Confirmed Design

- The center of the settlement view becomes a three-position podium: MVP on the highest center block, red-team top contributor on the left, blue-team top contributor on the right.
- The winner receives the strongest visual treatment: winner-colored title, arena glow, spotlight, ribbons, and a clear "夺冠" headline. A draw uses a neutral "巅峰平局" headline.
- Team contribution lists stay present, but they become two compact TOP5 boards with rank badges, avatar badges, nickname, score, and hit count.
- Match stats move into four bottom chips: total shots, like shots, gift shots, and best streak.
- Entry animation should make the result feel like a ceremony: title drops in, podium rises, MVP pops in, leaderboards slide in, and confetti falls slowly.

## Implementation Notes

- Extract settlement presentation data into a small helper so the visual contract can be tested without Phaser.
- Keep the drawing inside `src/client/gameScene.ts` because existing runtime state and avatar helpers already live there.
- Remove the old panel-style settlement path once the podium version is stable to avoid drift.
