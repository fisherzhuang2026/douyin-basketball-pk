<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  createMatch,
  finishMatch,
  getMatch,
  simulateComment,
  simulateGift,
  simulateLike,
  startMatch,
  toSnapshot,
  type CreateMatchPayload
} from "./client/api";
import GameCanvas from "./client/GameCanvas.vue";
import HostPanel from "./client/HostPanel.vue";
import SimulatorPanel from "./client/SimulatorPanel.vue";
import { buildArenaCallout, getArenaPhase } from "./client/arenaPresentation";
import { createDemoAvatarUrl } from "./client/demoAvatars";
import { formatInteractionFeedback } from "./client/feedback";
import { PLAY_SUBTITLE, PLAY_TITLE } from "./client/presentation";
import { hasCountdownExpired } from "./client/timer";
import type { JoinedMemberEvent, MatchSnapshot, ShotEvent, SocketMessage } from "./client/types";

const config = ref<CreateMatchPayload>({
  durationSeconds: 300,
  redTeamName: "红队",
  blueTeamName: "蓝队",
  redKeyword: "红队",
  blueKeyword: "蓝队"
});

const matchId = ref("");
const snapshot = ref<MatchSnapshot>();
const previousSnapshot = ref<MatchSnapshot>();
const lastShot = ref<ShotEvent>();
const lastJoinedMember = ref<JoinedMemberEvent>();
const recentShots = ref<ShotEvent[]>([]);
const activity = ref<string[]>(["等待创建对局"]);
const loading = ref(false);
const error = ref("");
let socket: WebSocket | undefined;
let autoSettleTimer: number | undefined;

const disabled = computed(() => loading.value || !matchId.value);
const statusLabel = computed(() => {
  const status = snapshot.value?.status ?? "draft";
  return status === "draft" ? "未开始" : status === "running" ? "进行中" : "已结算";
});
const pageTitle = computed(() => (snapshot.value?.status === "finished" ? "本局结算" : PLAY_TITLE));
const arenaPhase = computed(() => getArenaPhase(snapshot.value?.status, snapshot.value?.startedAt, snapshot.value?.durationSeconds));
const arenaCallout = computed(() => buildArenaCallout(previousSnapshot.value, snapshot.value, recentShots.value));

onMounted(() => {
  connectSocket();
  autoSettleTimer = window.setInterval(() => {
    void settleExpiredMatchIfNeeded();
  }, 500);
});

onBeforeUnmount(() => {
  socket?.close();
  if (autoSettleTimer) {
    window.clearInterval(autoSettleTimer);
  }
});

async function handleCreate() {
  await run(async () => {
    const match = await createMatch({ ...config.value });
    matchId.value = match.id;
    recentShots.value = [];
    applySnapshot(toSnapshot(match));
    activity.value.unshift("已创建对局");
  });
}

async function handleStart() {
  if (!matchId.value) return;
  await run(async () => {
    const match = await startMatch(matchId.value);
    applySnapshot(toSnapshot(match));
    activity.value.unshift("对局开始，进入开场倒计时");
  });
}

async function handleFinish() {
  if (!matchId.value) return;
  await run(async () => {
    const match = await finishMatch(matchId.value);
    applySnapshot(toSnapshot(match));
    activity.value.unshift("进入结算颁奖");
  });
}

async function handleComment(payload: { userId: string; nickname: string; avatarUrl?: string; content: string }) {
  if (!matchId.value) return;
  await run(async () => {
    await simulateComment({ matchId: matchId.value, ...payload });
    await refreshMatch();
  });
}

async function handleLike(payload: { userId: string }) {
  if (!matchId.value) return;
  await run(async () => {
    const result = await simulateLike({ matchId: matchId.value, userId: payload.userId });
    if (result.event) {
      recordShot(result.event);
    } else {
      showFeedback(formatInteractionFeedback(result, "like"));
    }
    await refreshMatch();
  });
}

async function handleGift(payload: { userId: string; giftKey: string }) {
  if (!matchId.value) return;
  await run(async () => {
    const result = await simulateGift({ matchId: matchId.value, userId: payload.userId, giftKey: payload.giftKey });
    if (result.event) {
      recordShot(result.event);
    } else {
      showFeedback(formatInteractionFeedback(result, "gift"));
    }
    await refreshMatch();
  });
}

async function handleBurst() {
  const users = [
    { userId: "u1", nickname: "阿强", avatarUrl: createDemoAvatarUrl("阿强", 0), content: config.value.redKeyword },
    { userId: "u2", nickname: "小鱼", avatarUrl: createDemoAvatarUrl("小鱼", 1), content: config.value.blueKeyword },
    { userId: "u3", nickname: "柠檬", avatarUrl: createDemoAvatarUrl("柠檬", 2), content: config.value.redKeyword },
    { userId: "u4", nickname: "球王", avatarUrl: createDemoAvatarUrl("球王", 3), content: config.value.blueKeyword }
  ];
  await run(async () => {
    for (const user of users) {
      await simulateComment({ matchId: matchId.value, ...user });
    }
    const like = await simulateLike({ matchId: matchId.value, userId: "u1", randomValue: 0.1 });
    const midGift = await simulateGift({ matchId: matchId.value, userId: "u2", giftKey: "energy_pill" });
    const lowGift = await simulateGift({ matchId: matchId.value, userId: "u3", giftKey: "fairy_stick" });
    [like.event, midGift.event, lowGift.event].forEach((event) => {
      if (event) recordShot(event);
    });
    await refreshMatch();
  });
}

async function refreshMatch() {
  if (!matchId.value) return;
  const match = await getMatch(matchId.value);
  applySnapshot(toSnapshot(match));
}

async function settleExpiredMatchIfNeeded() {
  const current = snapshot.value;
  if (!matchId.value || loading.value || current?.status !== "running" || !current.startedAt) {
    return;
  }
  if (!hasCountdownExpired(current.durationSeconds, current.startedAt)) {
    return;
  }

  await refreshMatch();
  if (snapshot.value?.status === "finished") {
    activity.value.unshift("时间到，系统自动结算");
    activity.value = activity.value.slice(0, 8);
  }
}

async function run(action: () => Promise<void>) {
  loading.value = true;
  error.value = "";
  try {
    await action();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    loading.value = false;
  }
}

function showFeedback(message?: string) {
  if (!message) {
    return;
  }
  error.value = message;
  activity.value.unshift(message);
  activity.value = activity.value.slice(0, 8);
}

function applySnapshot(next: MatchSnapshot) {
  previousSnapshot.value = snapshot.value;
  snapshot.value = next;
  if (next.recentEvents.length) {
    recentShots.value = next.recentEvents.slice(-8);
  }
}

function recordShot(shot: ShotEvent) {
  if (recentShots.value.at(-1)?.id !== shot.id) {
    recentShots.value = [...recentShots.value, shot].slice(-8);
  }
  lastShot.value = shot;
}

function connectSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data) as SocketMessage;
    if (message.type === "match.snapshot") {
      applySnapshot(message.payload as MatchSnapshot);
    }
    if (message.type === "shot.result") {
      const shot = message.payload as ShotEvent;
      recordShot(shot);
      activity.value.unshift(`${shot.nickname} ${shot.hit ? `命中 +${shot.score}` : "打铁"}`);
    }
    if (message.type === "member.joined") {
      const member = message.payload as JoinedMemberEvent;
      lastJoinedMember.value = { ...member };
      activity.value.unshift(`${member.nickname} 加入${member.team === "red" ? "红队" : "蓝队"}`);
    }
    activity.value = activity.value.slice(0, 8);
  };
}
</script>

<template>
  <main class="app-shell">
    <section class="stage">
      <div class="stage-header">
        <div>
          <p>{{ PLAY_SUBTITLE }}</p>
          <h1>{{ pageTitle }}</h1>
        </div>
        <strong>{{ statusLabel }}</strong>
      </div>
      <GameCanvas :snapshot="snapshot" :last-shot="lastShot" :last-joined-member="lastJoinedMember" :phase="arenaPhase" :callout="arenaCallout" />
    </section>

    <aside class="side">
      <HostPanel v-model="config" :disabled="loading" :status="statusLabel" @create="handleCreate" @start="handleStart" @finish="handleFinish" />
      <SimulatorPanel
        :disabled="disabled"
        :red-keyword="config.redKeyword"
        :blue-keyword="config.blueKeyword"
        @comment="handleComment"
        @like="handleLike"
        @gift="handleGift"
        @burst="handleBurst"
      />

      <section class="panel compact">
        <div class="panel-header">
          <h2>实时流水</h2>
          <span class="status-pill">{{ snapshot?.scores.red ?? 0 }} : {{ snapshot?.scores.blue ?? 0 }}</span>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <ol>
          <li v-for="item in activity" :key="item">{{ item }}</li>
        </ol>
      </section>
    </aside>
  </main>
</template>
