import { describe, expect, it } from "vitest";
import { getDefaultEnabledGifts } from "../shared/gifts";
import { formatShotStatus, getGiftEffectPresentation, PLAY_TITLE } from "./presentation";
import type { ShotEvent } from "./types";

const baseShot: ShotEvent = {
  id: "shot-1",
  userId: "u1",
  nickname: "阿强",
  team: "red",
  eventType: "gift",
  giftKey: "energy_pill",
  score: 2,
  hit: true,
  createdAt: new Date().toISOString()
};

describe("presentation metadata", () => {
  it("uses a Chinese primary name instead of a pure English name", () => {
    expect(PLAY_TITLE).toBe("斗篮机：篮球投篮机双队PK");
    expect(/[\u4e00-\u9fa5]/.test(PLAY_TITLE)).toBe(true);
  });

  it("describes distinct gift UI effects for review materials", () => {
    expect(getGiftEffectPresentation("fairy_stick")).toMatchObject({
      giftName: "仙女棒",
      effectKind: "star",
      motionLabel: "星光快投",
      effectLabel: "快投进球",
      particleLabel: "星光快投粒子"
    });
    expect(getGiftEffectPresentation("energy_pill")).toMatchObject({
      giftName: "能力药丸",
      effectKind: "boost",
      motionLabel: "体能爆发",
      effectLabel: "能量进球",
      particleLabel: "能量轨迹与篮筐震动"
    });
    expect(getGiftEffectPresentation("love_blast")).toMatchObject({
      giftName: "爱的爆炸",
      effectKind: "love",
      motionLabel: "爱心爆扣",
      effectLabel: "高光暴扣",
      particleLabel: "全屏爆灯与队伍欢呼"
    });
    expect(getGiftEffectPresentation("unknown")).toMatchObject({
      giftName: "配置礼物",
      effectLabel: "强化礼物投篮"
    });
  });

  it("gives each enabled gift a distinct visual language", () => {
    const expected = [
      ["仙女棒", "star", "星光快投"],
      ["能力药丸", "boost", "体能爆发"],
      ["魔法镜", "mirror", "镜面反弹"],
      ["甜甜圈", "donut", "糖果弧线"],
      ["能量电池", "battery", "充能暴投"],
      ["爱的爆炸", "love", "爱心爆扣"],
      ["神秘空投", "airdrop", "空投砸筐"],
      ["超能喷射", "jet", "火箭喷射"]
    ];

    expect(getDefaultEnabledGifts().map((gift) => gift.giftName)).toEqual(expected.map(([giftName]) => giftName));
    expect(getDefaultEnabledGifts().map((gift) => getGiftEffectPresentation(gift.giftKey).effectKind)).toEqual(
      expected.map(([, effectKind]) => effectKind)
    );
    expect(getDefaultEnabledGifts().map((gift) => getGiftEffectPresentation(gift.giftKey).motionLabel)).toEqual(
      expected.map(([, , motionLabel]) => motionLabel)
    );
  });

  it("exposes review-friendly gift icons and tier effect durations", () => {
    expect(getGiftEffectPresentation("energy_pill")).toMatchObject({
      tier: "mid",
      effectDurationMs: 3500
    });
    expect(getGiftEffectPresentation("mystery_airdrop")).toMatchObject({
      tier: "high",
      effectDurationMs: 5000
    });

    for (const gift of getDefaultEnabledGifts()) {
      const effect = getGiftEffectPresentation(gift.giftKey);
      expect(effect, gift.giftKey).toHaveProperty("iconAssetUrl");
      expect(effect, gift.giftKey).toHaveProperty("iconTextureKey");
    }
  });

  it("formats shot status with gift names when a gift triggers the shot", () => {
    expect(formatShotStatus(baseShot)).toBe("阿强 送出能力药丸：能量进球");
    expect(formatShotStatus({ ...baseShot, eventType: "like", giftKey: undefined })).toBe("阿强 点赞投篮");
  });
});
