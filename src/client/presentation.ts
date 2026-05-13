import { getOfficialGift, type GiftAnimationType, type GiftEffectKind, type GiftTier } from "../shared/gifts";
import { getGiftIconAsset } from "./giftIconAssets";
import type { ShotEvent } from "./types";

export const PLAY_TITLE = "斗篮机：篮球投篮机双队PK";
export const PLAY_SUBTITLE = "DY-BA 直播互动玩法";

export interface GiftEffectPresentation {
  giftKey: string;
  giftName: string;
  animationType: GiftAnimationType;
  effectKind: GiftEffectKind;
  motionLabel: string;
  effectLabel: string;
  particleLabel: string;
  primaryColor: number;
  secondaryColor: number;
  glyph: string;
  tier: GiftTier;
  effectDurationMs: number;
  iconAssetUrl?: string;
  iconTextureKey?: string;
}

export function getGiftEffectPresentation(giftKey?: string): GiftEffectPresentation {
  const gift = getOfficialGift(giftKey);
  const iconAsset = getGiftIconAsset(gift?.giftKey ?? giftKey);
  if (gift) {
    return {
      giftKey: gift.giftKey,
      giftName: gift.giftName,
      animationType: gift.animationType,
      effectKind: gift.effectKind,
      motionLabel: gift.motionLabel,
      effectLabel: gift.effectLabel,
      particleLabel: gift.particleLabel,
      primaryColor: gift.primaryColor,
      secondaryColor: gift.secondaryColor,
      glyph: gift.glyph,
      tier: gift.tier,
      effectDurationMs: getGiftEffectDurationMs(gift.tier),
      iconAssetUrl: iconAsset?.url,
      iconTextureKey: iconAsset?.textureKey
    };
  }

  return {
    giftKey: giftKey ?? "configured",
    giftName: "配置礼物",
    animationType: "energy",
    effectKind: "boost",
    motionLabel: "强化投篮",
    effectLabel: "强化礼物投篮",
    particleLabel: "礼物光束粒子",
    primaryColor: 0x8b5cf6,
    secondaryColor: 0x38bdf8,
    glyph: "◆",
    tier: "mid",
    effectDurationMs: getGiftEffectDurationMs("mid"),
    iconAssetUrl: iconAsset?.url,
    iconTextureKey: iconAsset?.textureKey
  };
}

function getGiftEffectDurationMs(tier: GiftTier) {
  if (tier === "high") {
    return 5000;
  }
  if (tier === "mid") {
    return 3500;
  }
  return 1600;
}

export function formatShotStatus(event: ShotEvent): string {
  if (event.eventType === "gift") {
    const effect = getGiftEffectPresentation(event.giftKey);
    return `${event.nickname} 送出${effect.giftName}：${effect.effectLabel}`;
  }

  return `${event.nickname} 点赞投篮`;
}
