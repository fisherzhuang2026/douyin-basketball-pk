import type { Team } from "./types";
import type { GiftEffectKind, GiftTier } from "../shared/gifts";

export interface ShotPoint {
  x: number;
  y: number;
  t: number;
  alpha: number;
  orbitOffset: number;
  sparkScale: number;
}

export interface NetWeaveLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface RimGlintSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface ShotTrailLayer {
  name: "outerGlow" | "ribbon" | "core" | "spark" | "highlight";
  color: number;
  width: number;
  alpha: number;
}

export interface GiftBallSkin {
  name: string;
  baseColor: number;
  darkColor: number;
  seamColor: number;
  accentColor: number;
  glowColor: number;
  icon?: string;
}

export interface ShotVisualStyle {
  trailLayers: ShotTrailLayer[];
  ball: {
    radius: number;
    glowRadius: number;
    seamWidth: number;
    highlightRadius: number;
    shadowOffsetY: number;
    specularCount: number;
  };
  hoop: {
    backboardWidth: number;
    backboardHeight: number;
    rimWidth: number;
    rimHeight: number;
    rimThickness: number;
    netLineCount: number;
    ledSegmentCount: number;
    glassReflectionCount: number;
    cornerBracketCount: number;
    sideRailCount: number;
    rimBeamSegmentCount: number;
    rimBeamCenterGap: number;
    depthOffset: number;
    supportArmCount: number;
    rimExtrusionLayers: number;
  };
  hitEffect: {
    ringDuration: number;
    glowDuration: number;
    scoreDuration: number;
    shakeDuration: number;
  };
}

export interface GiftEffectTiming {
  totalDuration: number;
  launchDuration: number;
  iconHoldDuration: number;
  particleDuration: number;
  particleDelayStep: number;
  atmosphereRings: number;
}

export interface CourtOverlayLayout {
  titleWatermark: {
    x: number;
    y: number;
    fontSize: number;
    alpha: number;
  };
  status: {
    x: number;
    y: number;
    maxWidth: number;
  };
  centerRing: {
    x: number;
    y: number;
    radius: number;
    innerRadius: number;
    arcStartDeg: number;
    arcEndDeg: number;
  };
}

export interface CourtDepthStyle {
  vanishPoint: {
    x: number;
    y: number;
  };
  floor: {
    centerX: number;
    topY: number;
    bottomY: number;
    topWidth: number;
    bottomWidth: number;
    depthBandCount: number;
    laneGlowCount: number;
    sideRailWidth: number;
    shadowAlpha: number;
  };
  horizonLightCount: number;
}

interface TrailInput {
  start: { x: number; y: number };
  control: { x: number; y: number };
  end: { x: number; y: number };
  progress: number;
  segments?: number;
}

interface NetWeaveInput {
  centerX: number;
  topY: number;
  bottomY: number;
  topWidth: number;
  bottomWidth: number;
  lineCount?: number;
}

interface RimGlintInput {
  centerX: number;
  rimY: number;
  rimWidth: number;
  rimHeight: number;
}

export function getShotVisualStyle(team: Team): ShotVisualStyle {
  const teamColor = team === "red" ? 0xff5a6b : 0x4eb5ff;

  return {
    trailLayers: [
      { name: "outerGlow", color: teamColor, width: 28, alpha: 0.12 },
      { name: "ribbon", color: teamColor, width: 11, alpha: 0.34 },
      { name: "core", color: teamColor, width: 6, alpha: 0.72 },
      { name: "spark", color: 0xffffff, width: 5, alpha: 0.72 },
      { name: "highlight", color: 0xffffff, width: 2, alpha: 0.9 }
    ],
    ball: {
      radius: 32,
      glowRadius: 50,
      seamWidth: 3,
      highlightRadius: 11,
      shadowOffsetY: 12,
      specularCount: 3
    },
    hoop: {
      backboardWidth: 216,
      backboardHeight: 104,
      rimWidth: 116,
      rimHeight: 28,
      rimThickness: 8,
      netLineCount: 11,
      ledSegmentCount: 14,
      glassReflectionCount: 5,
      cornerBracketCount: 4,
      sideRailCount: 2,
      rimBeamSegmentCount: 10,
      rimBeamCenterGap: 38,
      depthOffset: 16,
      supportArmCount: 2,
      rimExtrusionLayers: 4
    },
    hitEffect: {
      ringDuration: 1180,
      glowDuration: 1320,
      scoreDuration: 1240,
      shakeDuration: 260
    }
  };
}

export function getCourtDepthStyle(width: number, height: number): CourtDepthStyle {
  return {
    vanishPoint: {
      x: width / 2,
      y: 62
    },
    floor: {
      centerX: width / 2,
      topY: 116,
      bottomY: height - 92,
      topWidth: width * 0.43,
      bottomWidth: width * 0.72,
      depthBandCount: 7,
      laneGlowCount: 6,
      sideRailWidth: 34,
      shadowAlpha: 0.34
    },
    horizonLightCount: 9
  };
}

export function getGiftBallSkin(effectKind?: GiftEffectKind): GiftBallSkin {
  const skins: Partial<Record<GiftEffectKind, GiftBallSkin>> = {
    star: {
      name: "星光快投球",
      baseColor: 0xfacc15,
      darkColor: 0x92400e,
      seamColor: 0x78350f,
      accentColor: 0xfff7ad,
      glowColor: 0xfde68a,
      icon: "★"
    },
    boost: {
      name: "体能爆发球",
      baseColor: 0x34d399,
      darkColor: 0x047857,
      seamColor: 0x064e3b,
      accentColor: 0xbef264,
      glowColor: 0x6ee7b7,
      icon: "▲"
    },
    mirror: {
      name: "镜面反弹球",
      baseColor: 0x7dd3fc,
      darkColor: 0x075985,
      seamColor: 0x0c4a6e,
      accentColor: 0xe0f2fe,
      glowColor: 0xbae6fd,
      icon: "◇"
    },
    donut: {
      name: "糖果弧线球",
      baseColor: 0xfb7185,
      darkColor: 0xbe123c,
      seamColor: 0x881337,
      accentColor: 0xfbbf24,
      glowColor: 0xf9a8d4,
      icon: "○"
    },
    battery: {
      name: "充能暴投球",
      baseColor: 0xa3e635,
      darkColor: 0x4d7c0f,
      seamColor: 0x365314,
      accentColor: 0xfacc15,
      glowColor: 0xd9f99d,
      icon: "⚡"
    },
    love: {
      name: "爱心爆扣球",
      baseColor: 0xff4d6d,
      darkColor: 0x9f1239,
      seamColor: 0x881337,
      accentColor: 0xffd1dc,
      glowColor: 0xfb7185,
      icon: "♥"
    },
    airdrop: {
      name: "空投砸筐球",
      baseColor: 0x60a5fa,
      darkColor: 0x1d4ed8,
      seamColor: 0x1e3a8a,
      accentColor: 0xfbbf24,
      glowColor: 0xbfdbfe,
      icon: "▣"
    },
    jet: {
      name: "火箭喷射球",
      baseColor: 0x38bdf8,
      darkColor: 0x0369a1,
      seamColor: 0x0c4a6e,
      accentColor: 0xfb923c,
      glowColor: 0x7dd3fc,
      icon: "▲"
    }
  };

  return (
    (effectKind ? skins[effectKind] : undefined) ?? {
      name: "经典仿真篮球",
      baseColor: 0xe87916,
      darkColor: 0x9a3412,
      seamColor: 0x431407,
      accentColor: 0xffd38a,
      glowColor: 0xff9f1c,
      icon: undefined
    }
  );
}

export function getGiftEffectTiming(tier: GiftTier): GiftEffectTiming {
  if (tier === "high") {
    return {
      totalDuration: 5000,
      launchDuration: 3000,
      iconHoldDuration: 4300,
      particleDuration: 2300,
      particleDelayStep: 70,
      atmosphereRings: 7
    };
  }

  if (tier === "mid") {
    return {
      totalDuration: 3500,
      launchDuration: 2100,
      iconHoldDuration: 2850,
      particleDuration: 1600,
      particleDelayStep: 45,
      atmosphereRings: 4
    };
  }

  return {
    totalDuration: 1600,
    launchDuration: 900,
    iconHoldDuration: 1100,
    particleDuration: 900,
    particleDelayStep: 22,
    atmosphereRings: 2
  };
}

export function getCourtOverlayLayout(width: number, height: number): CourtOverlayLayout {
  return {
    titleWatermark: {
      x: width / 2,
      y: height / 2,
      fontSize: 24,
      alpha: 0.26
    },
    status: {
      x: width / 2,
      y: 84,
      maxWidth: 244
    },
    centerRing: {
      x: width / 2,
      y: height / 2 - 3,
      radius: 58,
      innerRadius: 12,
      arcStartDeg: 25,
      arcEndDeg: 155
    }
  };
}

export function sampleShotTrail({ start, control, end, progress, segments = 18 }: TrailInput): ShotPoint[] {
  const clampedProgress = clamp(progress, 0, 1);
  const steps = Math.max(2, Math.ceil(segments * clampedProgress));
  const points: ShotPoint[] = [];

  for (let index = 0; index <= steps; index += 1) {
    const localProgress = index / steps;
    const t = clampedProgress * localProgress;
    points.push({
      x: quadratic(start.x, control.x, end.x, t),
      y: quadratic(start.y, control.y, end.y, t),
      t,
      alpha: 0.2 + localProgress * 0.8,
      orbitOffset: Math.sin(localProgress * Math.PI * 5) * (5 + clampedProgress * 8),
      sparkScale: 0.35 + localProgress * 0.9
    });
  }

  return points;
}

export function sampleNetWeaveLines({
  centerX,
  topY,
  bottomY,
  topWidth,
  bottomWidth,
  lineCount = 5
}: NetWeaveInput): NetWeaveLine[] {
  const safeLineCount = Math.max(1, Math.ceil(lineCount));
  const safeTopWidth = Math.max(0, topWidth);
  const safeBottomWidth = Math.max(0, bottomWidth);
  const lines: NetWeaveLine[] = [];

  for (let index = 0; index < safeLineCount; index += 1) {
    const t = (index + 1) / (safeLineCount + 1);
    const topLeftX = centerX - safeTopWidth / 2 + safeTopWidth * t;
    const topRightX = centerX + safeTopWidth / 2 - safeTopWidth * t;
    const bottomLeftX = centerX - safeBottomWidth / 2 + safeBottomWidth * t;
    const bottomRightX = centerX + safeBottomWidth / 2 - safeBottomWidth * t;

    lines.push({ start: { x: topLeftX, y: topY }, end: { x: bottomRightX, y: bottomY } });
    lines.push({ start: { x: topRightX, y: topY }, end: { x: bottomLeftX, y: bottomY } });
  }

  return lines;
}

export function sampleRimGlintSegments({ centerX, rimY, rimWidth, rimHeight }: RimGlintInput): RimGlintSegment[] {
  return [
    {
      start: { x: centerX - rimWidth * 0.44, y: rimY - rimHeight * 0.18 },
      end: { x: centerX - rimWidth * 0.2, y: rimY - rimHeight * 0.3 }
    },
    {
      start: { x: centerX + rimWidth * 0.2, y: rimY - rimHeight * 0.3 },
      end: { x: centerX + rimWidth * 0.44, y: rimY - rimHeight * 0.18 }
    }
  ];
}

export function getBallRotation(progress: number, team: Team): number {
  const direction = team === "red" ? 1 : -1;
  return Math.round(clamp(progress, 0, 1) * 720 * direction);
}

function quadratic(start: number, control: number, end: number, t: number) {
  const reverse = 1 - t;
  return reverse * reverse * start + 2 * reverse * t * control + t * t * end;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
