# Audio Feedback Design

## Goal

Add lightweight audio feedback to key live interactions so the demo feels less flat while staying suitable for livestream review and deployment.

## Confirmed Design

- Join team: short rising cue at low volume.
- Like shot: short launch cue, followed by score or miss result cue.
- Gift shot: tiered cue. Low gifts are crisp, mid gifts have an energy rise, and high gifts add a heavier impact tail.
- Settlement: short victory fanfare for winner or neutral fanfare for draw.
- Add a sound toggle and volume slider. Default is enabled at a conservative volume.
- Use Web Audio synthesis instead of audio files to avoid asset licensing, loading, and deployment concerns.
- Audio unlocks after user interaction. If the browser blocks audio before a user gesture, the app should fail silently and continue visual play.

## Implementation Notes

- `audioCues.ts` owns testable event-to-cue mapping.
- `audioEngine.ts` owns browser Web Audio playback and local enable/volume state.
- `App.vue` is the event bridge because it already receives WebSocket events and simulator button actions.
- The sound layer must never affect scoring, timers, or animation state.
