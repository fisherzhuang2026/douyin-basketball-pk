<script setup lang="ts">
import { computed, ref } from "vue";
import { getDefaultEnabledGifts, type GiftTier } from "../shared/gifts";
import { createDemoAvatarUrl } from "./demoAvatars";
import { getGiftEffectPresentation } from "./presentation";

const props = defineProps<{
  disabled?: boolean;
  redKeyword: string;
  blueKeyword: string;
}>();

const emit = defineEmits<{
  comment: [payload: { userId: string; nickname: string; avatarUrl?: string; content: string }];
  like: [payload: { userId: string }];
  gift: [payload: { userId: string; giftKey: string }];
  burst: [];
}>();

const users = [
  { userId: "u1", nickname: "阿强", avatarUrl: createDemoAvatarUrl("阿强", 0) },
  { userId: "u2", nickname: "小鱼", avatarUrl: createDemoAvatarUrl("小鱼", 1) },
  { userId: "u3", nickname: "柠檬", avatarUrl: createDemoAvatarUrl("柠檬", 2) },
  { userId: "u4", nickname: "球王", avatarUrl: createDemoAvatarUrl("球王", 3) }
];

const selectedUserId = ref(users[0].userId);
const giftOptions = getDefaultEnabledGifts().map((gift) => ({
  key: gift.giftKey,
  score: gift.score,
  douyinCoin: gift.douyinCoin,
  tier: gift.tier,
  presentation: getGiftEffectPresentation(gift.giftKey)
}));
const selectedGift = ref(giftOptions[0]?.key ?? "fairy_stick");

const selectedUser = computed(() => users.find((user) => user.userId === selectedUserId.value) ?? users[0]);
const selectedGiftEffect = computed(() => getGiftEffectPresentation(selectedGift.value));

function sendComment(content: string) {
  emit("comment", {
    userId: selectedUser.value.userId,
    nickname: selectedUser.value.nickname,
    avatarUrl: selectedUser.value.avatarUrl,
    content
  });
}

function tierLabel(tier: GiftTier) {
  return tier === "low" ? "低价快投" : tier === "mid" ? "中价技能球" : "高价高光球";
}
</script>

<template>
  <section class="panel simulator-panel">
    <div class="panel-header">
      <h2>事件模拟器</h2>
      <span class="status-pill">Demo</span>
    </div>

    <label>
      观众
      <select v-model="selectedUserId">
        <option v-for="user in users" :key="user.userId" :value="user.userId">
          {{ user.nickname }}
        </option>
      </select>
    </label>

    <div class="viewer-card">
      <img :src="selectedUser.avatarUrl" :alt="selectedUser.nickname" />
      <span>{{ selectedUser.nickname }} 的头像会跟随投篮动作出场；换人后需先加入红队或蓝队。</span>
    </div>

    <div class="actions two">
      <button type="button" :disabled="disabled" @click="sendComment(props.redKeyword)">加入红队</button>
      <button type="button" :disabled="disabled" @click="sendComment(props.blueKeyword)">加入蓝队</button>
    </div>

    <div class="actions two">
      <button type="button" :disabled="disabled" @click="emit('like', { userId: selectedUser.userId })">点赞投篮</button>
      <button type="button" :disabled="disabled" @click="emit('burst')">批量热场</button>
    </div>

    <label>
      礼物
      <select v-model="selectedGift">
        <option v-for="gift in giftOptions" :key="gift.key" :value="gift.key">
          {{ gift.presentation.giftName }} · {{ gift.douyinCoin }} 抖币 · +{{ gift.score }} · {{ tierLabel(gift.tier) }}
        </option>
      </select>
    </label>

    <div class="effect-card">
      <strong>{{ selectedGiftEffect.effectLabel }} · {{ selectedGiftEffect.effectDurationMs / 1000 }} 秒</strong>
      <span>{{ selectedGiftEffect.particleLabel }}，命中后触发比分跳字、篮筐慢速爆光和贡献榜刷新。</span>
    </div>

    <button type="button" :disabled="disabled" class="wide" @click="emit('gift', { userId: selectedUser.userId, giftKey: selectedGift })">
      送礼投篮
    </button>
  </section>
</template>
