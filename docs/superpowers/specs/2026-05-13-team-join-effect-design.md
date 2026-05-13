# Team Join Effect Design

## Goal

Make successful viewer team selection visible in the main arena, so joining a team feels like a live interaction rather than only a side-panel count change.

## Confirmed Design

- When a viewer joins red or blue team, the corresponding team rail flashes in that team's color.
- A compact avatar badge flies from the court edge into the matching team card.
- A short center callout says `<nickname> 加入红队/蓝队`.
- Team particles and ribbon streaks last about 1.2 seconds.
- The effect runs on a separate join-animation layer so it does not interrupt ball shots or gift effects.
- Continuous joins may overlap lightly, but each effect self-cleans after its animation.

## Implementation Notes

- Reuse the existing `member.joined` WebSocket event from the server.
- Add a small presentation helper for team-specific text, color, and target lane metadata.
- Pass the joined member from `App.vue` to `GameCanvas.vue`, then call `BasketballScene.playJoinEffect`.
- Keep the effect purely visual; it must not change match state or scoring.
