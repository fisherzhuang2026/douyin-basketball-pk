import { getOfficialGift, type GiftTier } from "../shared/gifts";
import type { JoinedMemberEvent, MatchSnapshot, ShotEvent } from "./types";

export type SoundCueId =
  | "join-red"
  | "join-blue"
  | "score-like"
  | "miss"
  | "gift-low-score"
  | "gift-mid-score"
  | "gift-high-score"
  | "settlement-win"
  | "settlement-draw";

export interface SoundTone {
  startMs: number;
  durationMs: number;
  frequency: number;
  endFrequency?: number;
  gain?: number;
  type?: OscillatorType;
}

export interface SoundNoise {
  startMs: number;
  durationMs: number;
  gain?: number;
  filterFrequency?: number;
}

export interface SoundCue {
  id: SoundCueId;
  label: string;
  durationMs: number;
  tones: SoundTone[];
  noises?: SoundNoise[];
}

const CUES: Record<SoundCueId, SoundCue> = {
  "join-red": {
    id: "join-red",
    label: "红队入场",
    durationMs: 520,
    tones: [
      { startMs: 0, durationMs: 140, frequency: 294, endFrequency: 370, gain: 0.1, type: "triangle" },
      { startMs: 120, durationMs: 180, frequency: 440, endFrequency: 554, gain: 0.09, type: "sine" },
      { startMs: 280, durationMs: 220, frequency: 740, endFrequency: 880, gain: 0.07, type: "square" }
    ]
  },
  "join-blue": {
    id: "join-blue",
    label: "蓝队入场",
    durationMs: 520,
    tones: [
      { startMs: 0, durationMs: 140, frequency: 247, endFrequency: 330, gain: 0.1, type: "triangle" },
      { startMs: 120, durationMs: 180, frequency: 415, endFrequency: 523, gain: 0.09, type: "sine" },
      { startMs: 280, durationMs: 220, frequency: 659, endFrequency: 784, gain: 0.07, type: "square" }
    ]
  },
  "score-like": {
    id: "score-like",
    label: "点赞命中",
    durationMs: 620,
    tones: [
      { startMs: 0, durationMs: 150, frequency: 392, endFrequency: 587, gain: 0.09, type: "triangle" },
      { startMs: 120, durationMs: 180, frequency: 523, endFrequency: 784, gain: 0.08, type: "sine" },
      { startMs: 310, durationMs: 230, frequency: 988, endFrequency: 1175, gain: 0.06, type: "square" }
    ]
  },
  miss: {
    id: "miss",
    label: "投篮打铁",
    durationMs: 500,
    tones: [
      { startMs: 0, durationMs: 120, frequency: 220, endFrequency: 165, gain: 0.08, type: "sawtooth" },
      { startMs: 120, durationMs: 180, frequency: 146, endFrequency: 110, gain: 0.06, type: "triangle" }
    ],
    noises: [{ startMs: 40, durationMs: 180, gain: 0.025, filterFrequency: 1250 }]
  },
  "gift-low-score": {
    id: "gift-low-score",
    label: "低价礼物命中",
    durationMs: 760,
    tones: [
      { startMs: 0, durationMs: 130, frequency: 523, endFrequency: 659, gain: 0.09, type: "triangle" },
      { startMs: 130, durationMs: 160, frequency: 659, endFrequency: 784, gain: 0.08, type: "sine" },
      { startMs: 320, durationMs: 260, frequency: 1047, endFrequency: 1175, gain: 0.06, type: "square" }
    ]
  },
  "gift-mid-score": {
    id: "gift-mid-score",
    label: "中价礼物能量命中",
    durationMs: 1120,
    tones: [
      { startMs: 0, durationMs: 150, frequency: 330, endFrequency: 494, gain: 0.09, type: "sawtooth" },
      { startMs: 110, durationMs: 180, frequency: 494, endFrequency: 740, gain: 0.08, type: "triangle" },
      { startMs: 280, durationMs: 220, frequency: 740, endFrequency: 988, gain: 0.07, type: "sine" },
      { startMs: 520, durationMs: 280, frequency: 988, endFrequency: 1319, gain: 0.06, type: "square" }
    ],
    noises: [{ startMs: 120, durationMs: 320, gain: 0.02, filterFrequency: 1800 }]
  },
  "gift-high-score": {
    id: "gift-high-score",
    label: "高价礼物全场高光",
    durationMs: 1580,
    tones: [
      { startMs: 0, durationMs: 170, frequency: 196, endFrequency: 392, gain: 0.1, type: "sawtooth" },
      { startMs: 130, durationMs: 220, frequency: 392, endFrequency: 587, gain: 0.09, type: "triangle" },
      { startMs: 320, durationMs: 220, frequency: 587, endFrequency: 880, gain: 0.08, type: "sine" },
      { startMs: 540, durationMs: 260, frequency: 880, endFrequency: 1175, gain: 0.07, type: "square" },
      { startMs: 820, durationMs: 380, frequency: 1319, endFrequency: 1760, gain: 0.06, type: "triangle" },
      { startMs: 1120, durationMs: 320, frequency: 1760, endFrequency: 2093, gain: 0.045, type: "sine" }
    ],
    noises: [
      { startMs: 80, durationMs: 380, gain: 0.024, filterFrequency: 2200 },
      { startMs: 700, durationMs: 360, gain: 0.018, filterFrequency: 3200 }
    ]
  },
  "settlement-win": {
    id: "settlement-win",
    label: "赛后胜利结算",
    durationMs: 1620,
    tones: [
      { startMs: 0, durationMs: 170, frequency: 392, endFrequency: 494, gain: 0.08, type: "triangle" },
      { startMs: 170, durationMs: 170, frequency: 494, endFrequency: 659, gain: 0.08, type: "triangle" },
      { startMs: 340, durationMs: 190, frequency: 659, endFrequency: 784, gain: 0.08, type: "triangle" },
      { startMs: 540, durationMs: 280, frequency: 784, endFrequency: 1047, gain: 0.07, type: "sine" },
      { startMs: 860, durationMs: 560, frequency: 1047, endFrequency: 1319, gain: 0.055, type: "square" }
    ]
  },
  "settlement-draw": {
    id: "settlement-draw",
    label: "赛后平局结算",
    durationMs: 980,
    tones: [
      { startMs: 0, durationMs: 220, frequency: 392, endFrequency: 440, gain: 0.07, type: "triangle" },
      { startMs: 220, durationMs: 260, frequency: 440, endFrequency: 392, gain: 0.06, type: "sine" },
      { startMs: 520, durationMs: 320, frequency: 523, endFrequency: 523, gain: 0.05, type: "triangle" }
    ]
  }
};

export function getSoundCue(cueId: SoundCueId): SoundCue {
  return CUES[cueId];
}

export function getJoinCueId(member: JoinedMemberEvent): SoundCueId {
  return member.team === "red" ? "join-red" : "join-blue";
}

export function getShotCueId(shot: ShotEvent): SoundCueId {
  if (!shot.hit) {
    return "miss";
  }
  if (shot.eventType === "gift") {
    const tier = getGiftTier(shot);
    return `gift-${tier}-score`;
  }
  return "score-like";
}

export function getSettlementCueId(snapshot: MatchSnapshot): SoundCueId {
  return snapshot.winner === "draw" ? "settlement-draw" : "settlement-win";
}

function getGiftTier(shot: ShotEvent): GiftTier {
  const officialTier = getOfficialGift(shot.giftKey)?.tier;
  if (officialTier) {
    return officialTier;
  }
  if (shot.score >= 3) {
    return "high";
  }
  if (shot.score >= 2) {
    return "mid";
  }
  return "low";
}
