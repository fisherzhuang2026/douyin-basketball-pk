<script setup lang="ts">
import Phaser from "phaser";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ArenaCallout, ArenaPhase } from "./arenaPresentation";
import { BasketballScene } from "./gameScene";
import type { JoinedMemberEvent, MatchSnapshot, ShotEvent } from "./types";

const props = defineProps<{
  snapshot?: MatchSnapshot;
  lastShot?: ShotEvent;
  lastJoinedMember?: JoinedMemberEvent;
  phase?: ArenaPhase;
  callout?: ArenaCallout;
}>();

const host = ref<HTMLDivElement>();
let game: Phaser.Game | undefined;
let scene: BasketballScene | undefined;
let countdownTimer: number | undefined;

onMounted(() => {
  scene = new BasketballScene();
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.value,
    width: 960,
    height: 540,
    backgroundColor: "#08111f",
    scene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  });
  if (props.snapshot) {
    scene.updateSnapshot(props.snapshot);
  }
  scene.updateArenaPresentation(props.phase ?? "idle", props.callout);
  countdownTimer = window.setInterval(() => {
    scene?.tickCountdown();
  }, 250);
});

watch(
  () => props.snapshot,
  (snapshot) => {
    if (snapshot) {
      scene?.updateSnapshot(snapshot);
    }
  },
  { deep: true }
);

watch(
  () => [props.phase, props.callout] as const,
  ([phase, callout]) => {
    scene?.updateArenaPresentation(phase ?? "idle", callout);
  },
  { deep: true }
);

watch(
  () => props.lastShot,
  (event) => {
    if (event) {
      scene?.playShot(event);
    }
  }
);

watch(
  () => props.lastJoinedMember,
  (member) => {
    if (member) {
      scene?.playJoinEffect(member);
    }
  }
);

onBeforeUnmount(() => {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }
  game?.destroy(true);
});
</script>

<template>
  <div ref="host" class="game-canvas" />
</template>
