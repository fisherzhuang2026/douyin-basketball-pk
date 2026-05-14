import { describe, expect, it } from "vitest";
import {
  getBallRotation,
  getCourtDepthStyle,
  getCourtOverlayLayout,
  getGiftBallSkin,
  getGiftEffectTiming,
  getShotVisualStyle,
  sampleRimGlintSegments,
  sampleNetWeaveLines,
  sampleShotTrail
} from "./courtStyle";

describe("court visual style", () => {
  it("uses layered arcade polish for the ball, hoop, and shot trail", () => {
    const style = getShotVisualStyle("red");

    expect(style.trailLayers.map((layer) => layer.name)).toEqual(["outerGlow", "ribbon", "core", "spark", "highlight"]);
    expect(style.trailLayers[0].width).toBeGreaterThan(style.trailLayers[1].width);
    expect(style.ball).toMatchObject({
      radius: 32,
      glowRadius: 50,
      seamWidth: 3,
      highlightRadius: 11,
      shadowOffsetY: 12,
      specularCount: 3
    });
    expect(style.hoop.netLineCount).toBeGreaterThanOrEqual(8);
    expect(style.hoop.netLineCount).toBeGreaterThanOrEqual(10);
    expect(style.hoop.rimWidth).toBeLessThanOrEqual(124);
    expect(style.hoop.backboardWidth).toBeGreaterThanOrEqual(212);
    expect(style.hoop.backboardHeight).toBeGreaterThanOrEqual(96);
    expect(style.hoop.rimThickness).toBeGreaterThanOrEqual(8);
    expect(style.hoop.ledSegmentCount).toBeGreaterThanOrEqual(12);
    expect(style.hoop.glassReflectionCount).toBeGreaterThanOrEqual(4);
    expect(style.hoop.cornerBracketCount).toBe(4);
    expect(style.hoop.sideRailCount).toBe(2);
    expect(style.hoop.rimBeamSegmentCount).toBeGreaterThanOrEqual(8);
    expect(style.hoop.rimBeamCenterGap).toBeGreaterThanOrEqual(34);
    expect(style.hoop.depthOffset).toBeGreaterThanOrEqual(14);
    expect(style.hoop.supportArmCount).toBeGreaterThanOrEqual(2);
    expect(style.hoop.rimExtrusionLayers).toBeGreaterThanOrEqual(3);
    expect(style.hitEffect.ringDuration).toBeGreaterThanOrEqual(1100);
  });

  it("uses a 3D arena depth model instead of a flat court slab", () => {
    const depth = getCourtDepthStyle(960, 540);

    expect(depth.vanishPoint.y).toBeLessThan(depth.floor.topY);
    expect(depth.floor.topWidth).toBeLessThan(depth.floor.bottomWidth);
    expect(depth.floor.depthBandCount).toBeGreaterThanOrEqual(5);
    expect(depth.floor.sideRailWidth).toBeGreaterThanOrEqual(28);
    expect(depth.floor.shadowAlpha).toBeGreaterThan(0.25);
    expect(depth.horizonLightCount).toBeGreaterThanOrEqual(7);
  });

  it("samples a smooth fading arc instead of a single flat line", () => {
    const points = sampleShotTrail({
      start: { x: 420, y: 500 },
      control: { x: 520, y: 90 },
      end: { x: 480, y: 156 },
      progress: 0.72
    });

    expect(points.length).toBeGreaterThanOrEqual(12);
    expect(points[0]).toMatchObject({ x: 420, y: 500, t: 0 });
    expect(points.at(-1)?.t).toBeCloseTo(0.72, 2);
    expect(points.at(-1)?.alpha).toBeGreaterThan(points[1].alpha);
    expect(points.some((point) => Math.abs(point.orbitOffset) > 1)).toBe(true);
    expect(points.at(-1)?.sparkScale).toBeGreaterThan(points[1].sparkScale);
  });

  it("samples straight net weave lines instead of curved loop crossbars", () => {
    const lines = sampleNetWeaveLines({
      centerX: 480,
      topY: 180,
      bottomY: 236,
      topWidth: 104,
      bottomWidth: 42,
      lineCount: 5
    });

    expect(lines).toHaveLength(10);
    expect(lines.every((line) => line.start.y === 180 && line.end.y === 236)).toBe(true);
    expect(lines.some((line) => line.start.x < line.end.x)).toBe(true);
    expect(lines.some((line) => line.start.x > line.end.x)).toBe(true);
  });

  it("keeps rim highlights short and above the net area", () => {
    const segments = sampleRimGlintSegments({
      centerX: 480,
      rimY: 170,
      rimWidth: 116,
      rimHeight: 28
    });

    expect(segments).toHaveLength(2);
    expect(segments.every((segment) => Math.abs(segment.end.x - segment.start.x) < 34)).toBe(true);
    expect(segments.every((segment) => segment.start.y < 170 && segment.end.y < 170)).toBe(true);
  });

  it("rotates the ball in opposite directions for each team side", () => {
    expect(getBallRotation(0.5, "red")).toBe(360);
    expect(getBallRotation(0.5, "blue")).toBe(-360);
  });

  it("skins gift balls from the gift visual language", () => {
    expect(getGiftBallSkin("love")).toMatchObject({
      name: "爱心爆扣球",
      baseColor: 0xff4d6d,
      icon: "♥"
    });
    expect(getGiftBallSkin("jet")).toMatchObject({
      name: "火箭喷射球",
      baseColor: 0x38bdf8,
      icon: "▲"
    });
    expect(getGiftBallSkin()).toMatchObject({
      name: "经典仿真篮球",
      baseColor: 0xe87916,
      icon: undefined
    });
  });

  it("keeps mid and high gift effects visible long enough for review", () => {
    expect(getGiftEffectTiming("low")).toMatchObject({
      totalDuration: 1600,
      atmosphereRings: 2
    });
    expect(getGiftEffectTiming("mid")).toMatchObject({
      totalDuration: 3500,
      iconHoldDuration: 2850,
      atmosphereRings: 4
    });
    expect(getGiftEffectTiming("high")).toMatchObject({
      totalDuration: 5000,
      iconHoldDuration: 4300,
      atmosphereRings: 7
    });
  });

  it("moves the title watermark to the center circle instead of behind the hoop", () => {
    const layout = getCourtOverlayLayout(960, 540);

    expect(layout.titleWatermark.x).toBe(480);
    expect(layout.titleWatermark.y).toBeCloseTo(270, 0);
    expect(layout.titleWatermark.alpha).toBeLessThanOrEqual(0.3);
    expect(layout.status.y).toBeLessThan(96);
    expect(layout.status.maxWidth).toBeLessThanOrEqual(260);
    expect(layout.centerRing.arcStartDeg).toBeGreaterThan(0);
    expect(layout.centerRing.arcEndDeg).toBeLessThan(180);
    expect(layout.centerRing.radius).toBeGreaterThanOrEqual(52);
  });
});
