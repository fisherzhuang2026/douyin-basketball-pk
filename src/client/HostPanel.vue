<script setup lang="ts">
import { computed } from "vue";
import type { CreateMatchPayload } from "./api";

const model = defineModel<CreateMatchPayload>({ required: true });
const audioEnabled = defineModel<boolean>("audioEnabled", { default: true });
const audioVolume = defineModel<number>("audioVolume", { default: 0.36 });

defineProps<{
  disabled?: boolean;
  status?: string;
}>();

const emit = defineEmits<{
  create: [];
  start: [];
  finish: [];
}>();

const durations = [
  { label: "3 分钟", value: 180 },
  { label: "5 分钟", value: 300 },
  { label: "10 分钟", value: 600 },
  { label: "15 分钟", value: 900 },
  { label: "20 分钟", value: 1200 },
  { label: "25 分钟", value: 1500 },
  { label: "30 分钟", value: 1800 }
];

const volumePercent = computed(() => Math.round(audioVolume.value * 100));
</script>

<template>
  <section class="panel host-panel">
    <div class="panel-header">
      <h2>主播配置</h2>
      <span class="status-pill">{{ status ?? "未创建" }}</span>
    </div>
    <p class="panel-note">
      点赞固定 30% 命中，命中 +1 分；官方弹幕小玩法礼物按低/中/高三档固定命中，分别 +1/+2/+3 分。
    </p>

    <label>
      对局时长
      <select v-model.number="model.durationSeconds">
        <option v-for="duration in durations" :key="duration.value" :value="duration.value">
          {{ duration.label }}
        </option>
      </select>
    </label>

    <div class="split">
      <label>
        红队名称
        <input v-model="model.redTeamName" />
      </label>
      <label>
        蓝队名称
        <input v-model="model.blueTeamName" />
      </label>
    </div>

    <div class="split">
      <label>
        红队口令
        <input v-model="model.redKeyword" />
      </label>
      <label>
        蓝队口令
        <input v-model="model.blueKeyword" />
      </label>
    </div>

    <div class="readonly-rule">
      <span>合规说明</span>
      <strong>主播不可配置命中率；礼物只按官方档位触发固定得分投篮。</strong>
    </div>

    <div class="sound-control">
      <div class="sound-control-head">
        <span>现场音效</span>
        <strong>{{ audioEnabled ? "已开启" : "已关闭" }}</strong>
      </div>
      <label class="switch-row">
        <input v-model="audioEnabled" type="checkbox" />
        <span>入队、投篮、进球、结算播放反馈音</span>
      </label>
      <label>
        音量 {{ volumePercent }}%
        <input v-model.number="audioVolume" type="range" min="0" max="1" step="0.05" :disabled="!audioEnabled" />
      </label>
    </div>

    <div class="actions">
      <button type="button" @click="emit('create')">创建对局</button>
      <button type="button" :disabled="disabled" @click="emit('start')">开始</button>
      <button type="button" :disabled="disabled" @click="emit('finish')">结算</button>
    </div>
  </section>
</template>
