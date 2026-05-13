export type GiftTier = "low" | "mid" | "high";
export type GiftAnimationType = "standard" | "energy" | "highlight";
export type GiftEffectKind =
  | "star"
  | "boost"
  | "mirror"
  | "donut"
  | "battery"
  | "love"
  | "airdrop"
  | "jet"
  | "sound"
  | "dessert"
  | "potion"
  | "chest"
  | "cube";

export interface GiftRuleDefinition {
  giftKey: string;
  giftName: string;
  score: number;
  animationType: GiftAnimationType;
  enabled: boolean;
}

export interface OfficialGiftCatalogItem extends GiftRuleDefinition {
  giftId: number;
  douyinCoin: number;
  tier: GiftTier;
  effectKind: GiftEffectKind;
  motionLabel: string;
  effectLabel: string;
  particleLabel: string;
  primaryColor: number;
  secondaryColor: number;
  glyph: string;
  enabledByDefault: boolean;
}

export const OFFICIAL_GIFT_CATALOG: OfficialGiftCatalogItem[] = [
  {
    giftKey: "fairy_stick",
    giftId: 9709,
    giftName: "仙女棒",
    douyinCoin: 1,
    tier: "low",
    effectKind: "star",
    motionLabel: "星光快投",
    score: 1,
    animationType: "standard",
    effectLabel: "快投进球",
    particleLabel: "星光快投粒子",
    primaryColor: 0xffd166,
    secondaryColor: 0xffffff,
    glyph: "★",
    enabled: true,
    enabledByDefault: true
  },
  {
    giftKey: "yellow_fairy_stick",
    giftId: 9710,
    giftName: "黄色仙女棒",
    douyinCoin: 1,
    tier: "low",
    effectKind: "star",
    motionLabel: "黄色快投",
    score: 1,
    animationType: "standard",
    effectLabel: "快投进球",
    particleLabel: "黄色星光粒子",
    primaryColor: 0xfacc15,
    secondaryColor: 0xfef3c7,
    glyph: "★",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "blue_fairy_stick",
    giftId: 9712,
    giftName: "蓝色仙女棒",
    douyinCoin: 1,
    tier: "low",
    effectKind: "star",
    motionLabel: "蓝光快投",
    score: 1,
    animationType: "standard",
    effectLabel: "快投进球",
    particleLabel: "蓝色星光粒子",
    primaryColor: 0x38bdf8,
    secondaryColor: 0xdbeafe,
    glyph: "★",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "green_fairy_stick",
    giftId: 9711,
    giftName: "绿色仙女棒",
    douyinCoin: 1,
    tier: "low",
    effectKind: "star",
    motionLabel: "绿光快投",
    score: 1,
    animationType: "standard",
    effectLabel: "快投进球",
    particleLabel: "绿色星光粒子",
    primaryColor: 0x22c55e,
    secondaryColor: 0xdcfce7,
    glyph: "★",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "purple_fairy_stick",
    giftId: 9713,
    giftName: "紫色仙女棒",
    douyinCoin: 1,
    tier: "low",
    effectKind: "star",
    motionLabel: "紫光快投",
    score: 1,
    animationType: "standard",
    effectLabel: "快投进球",
    particleLabel: "紫色星光粒子",
    primaryColor: 0xa78bfa,
    secondaryColor: 0xede9fe,
    glyph: "★",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "energy_pill",
    giftId: 9714,
    giftName: "能力药丸",
    douyinCoin: 10,
    tier: "mid",
    effectKind: "boost",
    motionLabel: "体能爆发",
    score: 2,
    animationType: "energy",
    effectLabel: "能量进球",
    particleLabel: "能量轨迹与篮筐震动",
    primaryColor: 0x34d399,
    secondaryColor: 0xfbbf24,
    glyph: "◆",
    enabled: true,
    enabledByDefault: true
  },
  {
    giftKey: "magic_mirror",
    giftId: 9715,
    giftName: "魔法镜",
    douyinCoin: 19,
    tier: "mid",
    effectKind: "mirror",
    motionLabel: "镜面反弹",
    score: 2,
    animationType: "energy",
    effectLabel: "反弹进球",
    particleLabel: "镜面反弹光束",
    primaryColor: 0x93c5fd,
    secondaryColor: 0xc4b5fd,
    glyph: "◇",
    enabled: true,
    enabledByDefault: true
  },
  {
    giftKey: "donut",
    giftId: 9716,
    giftName: "甜甜圈",
    douyinCoin: 52,
    tier: "mid",
    effectKind: "donut",
    motionLabel: "糖果弧线",
    score: 2,
    animationType: "energy",
    effectLabel: "弧线进球",
    particleLabel: "彩糖弧线粒子",
    primaryColor: 0xfb7185,
    secondaryColor: 0xfde68a,
    glyph: "◎",
    enabled: true,
    enabledByDefault: true
  },
  {
    giftKey: "energy_battery",
    giftId: 9717,
    giftName: "能量电池",
    douyinCoin: 99,
    tier: "mid",
    effectKind: "battery",
    motionLabel: "充能暴投",
    score: 2,
    animationType: "energy",
    effectLabel: "充能进球",
    particleLabel: "电流充能轨迹",
    primaryColor: 0x22d3ee,
    secondaryColor: 0xfacc15,
    glyph: "⚡",
    enabled: true,
    enabledByDefault: true
  },
  {
    giftKey: "love_blast",
    giftId: 9718,
    giftName: "爱的爆炸",
    douyinCoin: 199,
    tier: "high",
    effectKind: "love",
    motionLabel: "爱心爆扣",
    score: 3,
    animationType: "highlight",
    effectLabel: "高光暴扣",
    particleLabel: "全屏爆灯与队伍欢呼",
    primaryColor: 0xff4d6d,
    secondaryColor: 0xfacc15,
    glyph: "✦",
    enabled: true,
    enabledByDefault: true
  },
  {
    giftKey: "party_mic",
    giftId: 9719,
    giftName: "派对话筒",
    douyinCoin: 299,
    tier: "high",
    effectKind: "sound",
    motionLabel: "声浪欢呼",
    score: 3,
    animationType: "highlight",
    effectLabel: "全场欢呼",
    particleLabel: "声浪与聚光灯",
    primaryColor: 0xf97316,
    secondaryColor: 0x38bdf8,
    glyph: "♪",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "mystery_airdrop",
    giftId: 9720,
    giftName: "神秘空投",
    douyinCoin: 520,
    tier: "high",
    effectKind: "airdrop",
    motionLabel: "空投砸筐",
    score: 3,
    animationType: "highlight",
    effectLabel: "空投暴扣",
    particleLabel: "空投光柱与慢动作",
    primaryColor: 0xf59e0b,
    secondaryColor: 0x60a5fa,
    glyph: "✦",
    enabled: true,
    enabledByDefault: true
  },
  {
    giftKey: "strawberry_dessert",
    giftId: 9721,
    giftName: "草莓甜点",
    douyinCoin: 666,
    tier: "high",
    effectKind: "dessert",
    motionLabel: "甜点暴扣",
    score: 3,
    animationType: "highlight",
    effectLabel: "甜点暴扣",
    particleLabel: "草莓烟花与篮筐爆闪",
    primaryColor: 0xf43f5e,
    secondaryColor: 0xfecdd3,
    glyph: "✦",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "super_airdrop",
    giftId: 9722,
    giftName: "超级空投",
    douyinCoin: 888,
    tier: "high",
    effectKind: "airdrop",
    motionLabel: "超级空投",
    score: 3,
    animationType: "highlight",
    effectLabel: "超级空投",
    particleLabel: "全屏空投爆闪",
    primaryColor: 0xfbbf24,
    secondaryColor: 0x7dd3fc,
    glyph: "✦",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "life_potion",
    giftId: 9723,
    giftName: "生命药水",
    douyinCoin: 999,
    tier: "high",
    effectKind: "potion",
    motionLabel: "药水暴扣",
    score: 3,
    animationType: "highlight",
    effectLabel: "药水暴扣",
    particleLabel: "药水光环与队伍回血感",
    primaryColor: 0x2dd4bf,
    secondaryColor: 0xf0fdfa,
    glyph: "✦",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "super_jet",
    giftId: 9724,
    giftName: "超能喷射",
    douyinCoin: 1200,
    tier: "high",
    effectKind: "jet",
    motionLabel: "火箭喷射",
    score: 3,
    animationType: "highlight",
    effectLabel: "喷射暴扣",
    particleLabel: "火箭喷射与镜头震动",
    primaryColor: 0xef4444,
    secondaryColor: 0xf97316,
    glyph: "✦",
    enabled: true,
    enabledByDefault: true
  },
  {
    giftKey: "rare_chest",
    giftId: 9725,
    giftName: "稀有宝箱",
    douyinCoin: 3000,
    tier: "high",
    effectKind: "chest",
    motionLabel: "宝箱绝杀",
    score: 3,
    animationType: "highlight",
    effectLabel: "宝箱绝杀",
    particleLabel: "宝箱金光与终场高光",
    primaryColor: 0xfacc15,
    secondaryColor: 0xffffff,
    glyph: "✦",
    enabled: false,
    enabledByDefault: false
  },
  {
    giftKey: "lucky_cube",
    giftId: 9733,
    giftName: "幸运魔方",
    douyinCoin: 1,
    tier: "low",
    effectKind: "cube",
    motionLabel: "魔方快投",
    score: 1,
    animationType: "standard",
    effectLabel: "魔方快投",
    particleLabel: "魔方变色粒子",
    primaryColor: 0x8b5cf6,
    secondaryColor: 0x38bdf8,
    glyph: "◇",
    enabled: false,
    enabledByDefault: false
  }
];

export const DEFAULT_ENABLED_GIFT_KEYS = OFFICIAL_GIFT_CATALOG.filter((gift) => gift.enabledByDefault).map(
  (gift) => gift.giftKey
);

export const DEFAULT_GIFT_RULES: Record<string, GiftRuleDefinition> = Object.fromEntries(
  OFFICIAL_GIFT_CATALOG.filter((gift) => gift.enabledByDefault).map((gift) => [
    gift.giftKey,
    {
      giftKey: gift.giftKey,
      giftName: gift.giftName,
      score: gift.score,
      animationType: gift.animationType,
      enabled: true
    }
  ])
);

export function getOfficialGift(giftKey?: string): OfficialGiftCatalogItem | undefined {
  return OFFICIAL_GIFT_CATALOG.find((gift) => gift.giftKey === giftKey);
}

export function getDefaultEnabledGifts(): OfficialGiftCatalogItem[] {
  return OFFICIAL_GIFT_CATALOG.filter((gift) => gift.enabledByDefault);
}
