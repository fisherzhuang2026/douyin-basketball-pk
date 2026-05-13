import Phaser from "phaser";
import { getArenaPhase, type ArenaCallout, type ArenaPhase } from "./arenaPresentation";
import type { JoinedMemberEvent, LeaderboardEntry, MatchSnapshot, ShotEvent, Team } from "./types";
import {
  getBallRotation,
  getCourtOverlayLayout,
  getGiftBallSkin,
  getGiftEffectTiming,
  getShotVisualStyle,
  sampleRimGlintSegments,
  sampleNetWeaveLines,
  sampleShotTrail,
  type GiftBallSkin,
  type ShotPoint,
  type ShotTrailLayer
} from "./courtStyle";
import { getAllGiftIconAssets } from "./giftIconAssets";
import { buildJoinPresentation } from "./joinPresentation";
import { PLAY_TITLE, formatShotStatus, getGiftEffectPresentation, type GiftEffectPresentation } from "./presentation";
import { buildSettlementCeremony, type SettlementBoard, type SettlementCeremony, type SettlementPodiumSlot, type SettlementStatChip } from "./settlementPresentation";
import { formatSeconds, getRemainingSeconds } from "./timer";
import { OPENING_COUNTDOWN_MS } from "../shared/timing";

const FONT_STACK = '"Microsoft YaHei", "PingFang SC", sans-serif';
const HOOP_BASE_Y = 160;
const HOOP_RIM_Y = HOOP_BASE_Y + 10;

interface MarqueeConfig {
  x: number;
  width: number;
  align: "left" | "center";
}

interface RailTextSet {
  member: Phaser.GameObjects.Text;
  keyword: Phaser.GameObjects.Text;
  top: Phaser.GameObjects.Text;
}

export class BasketballScene extends Phaser.Scene {
  private snapshot?: MatchSnapshot;
  private redScore?: Phaser.GameObjects.Text;
  private blueScore?: Phaser.GameObjects.Text;
  private timer?: Phaser.GameObjects.Text;
  private redTeamLabel?: Phaser.GameObjects.Text;
  private blueTeamLabel?: Phaser.GameObjects.Text;
  private redRail?: RailTextSet;
  private blueRail?: RailTextSet;
  private feed?: Phaser.GameObjects.Text;
  private leaderboard?: Phaser.GameObjects.Text;
  private mvpLine?: Phaser.GameObjects.Text;
  private status?: Phaser.GameObjects.Text;
  private ball?: Phaser.GameObjects.Container;
  private lastCountdownTick = 0;
  private settlementObjects: Phaser.GameObjects.GameObject[] = [];
  private arenaPresentationObjects: Phaser.GameObjects.GameObject[] = [];
  private activeShotObjects: Phaser.GameObjects.GameObject[] = [];
  private joinEffectObjects: Phaser.GameObjects.GameObject[] = [];
  private loadingAvatarKeys = new Set<string>();
  private marqueeConfigs = new Map<Phaser.GameObjects.Text, MarqueeConfig>();
  private shotRunId = 0;
  private arenaPhase: ArenaPhase = "idle";
  private arenaCallout?: ArenaCallout;

  constructor() {
    super("BasketballScene");
  }

  preload() {
    for (const asset of getAllGiftIconAssets()) {
      if (!this.textures.exists(asset.textureKey)) {
        this.load.image(asset.textureKey, asset.url);
      }
    }
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#08111f");

    this.drawArcadeStage(width, height);
    this.drawScoreboard(width);
    this.drawTeamRail("red", 28, 116, 176, 250);
    this.drawTeamRail("blue", width - 204, 116, 176, 250);
    this.drawHoop(width / 2, HOOP_BASE_Y);
    this.drawTicker(width, height);

    this.redScore = this.add.text(width / 2 - 176, 30, "红队 0", scoreText("#ff5a6b")).setOrigin(0.5, 0).setDepth(6);
    this.timer = this.add.text(width / 2, 18, "05:00", timerText()).setOrigin(0.5, 0).setDepth(6);
    this.blueScore = this.add.text(width / 2 + 176, 30, "0 蓝队", scoreText("#4eb5ff")).setOrigin(0.5, 0).setDepth(6);

    this.redRail = this.createRailTextSet(58, 188, 116, "#ffd7dd");
    this.blueRail = this.createRailTextSet(width - 174, 188, 116, "#d6efff");

    const overlayLayout = getCourtOverlayLayout(width, height);
    this.status = this.add.text(overlayLayout.status.x, overlayLayout.status.y, "等待投篮", statusText()).setOrigin(0.5).setDepth(8);
    this.ball = this.createBasketball(width / 2, height - 122);

    this.feed = this.createMarqueeText(70, height - 50, 250, tickerText(), 6, 24, "left");
    this.leaderboard = this.createMarqueeText(370, height - 50, 250, tickerText(), 6, 24, "left");
    this.mvpLine = this.createMarqueeText(width - 284, height - 50, 224, tickerText(), 6, 24, "left");

    this.renderSnapshot();
  }

  update(time: number) {
    if (!this.snapshot || this.snapshot.status !== "running" || !this.snapshot.startedAt) {
      return;
    }
    if (time - this.lastCountdownTick < 300) {
      return;
    }
    this.lastCountdownTick = time;
    this.tickCountdown();
  }

  tickCountdown(nowMs = Date.now()) {
    this.renderTimer(nowMs);
    this.renderArenaPresentation(nowMs);
  }

  updateSnapshot(snapshot: MatchSnapshot) {
    this.snapshot = snapshot;
    this.primeAvatarTextures(snapshot);
    if (this.scene?.isActive()) {
      this.renderSnapshot();
    }
  }

  updateArenaPresentation(phase: ArenaPhase, callout?: ArenaCallout) {
    this.arenaPhase = phase;
    this.arenaCallout = callout;
    if (this.scene?.isActive()) {
      this.renderArenaPresentation();
    }
  }

  playShot(event: ShotEvent) {
    if (!this.ball || !this.status) {
      return;
    }

    const runId = ++this.shotRunId;
    this.tweens.killTweensOf(this.ball);
    this.clearShotObjects();

    const { width, height } = this.scale;
    const teamSide = event.team === "red" ? -1 : 1;
    const startX = event.team === "red" ? 126 : width - 126;
    const startY = 352;
    const gatherX = width / 2 - teamSide * 76;
    const gatherY = height - 142;
    const hoopX = width / 2;
    const hoopY = HOOP_RIM_Y;
    const controlX = width / 2 + teamSide * 46;
    const controlY = 68;
    const visualStyle = getShotVisualStyle(event.team);
    const giftEffect = event.eventType === "gift" ? getGiftEffectPresentation(event.giftKey) : undefined;
    const trailLayers = giftEffect
      ? visualStyle.trailLayers.map((layer, index) => ({
          ...layer,
          color: layer.name === "highlight" || layer.name === "spark" ? giftEffect.secondaryColor : index % 2 === 0 ? giftEffect.primaryColor : giftEffect.secondaryColor,
          alpha: Math.min(0.94, layer.alpha + 0.08)
        }))
      : visualStyle.trailLayers;

    const shooter = this.createShooterBadge(event, startX, startY);
    const trail = this.add.graphics().setDepth(3);
    this.activeShotObjects.push(trail);

    this.tweens.killTweensOf(this.ball);
    this.ball.destroy(true);
    this.ball = this.createBasketball(gatherX, gatherY, getGiftBallSkin(giftEffect?.effectKind));
    this.ball.setScale(1.08).setAlpha(1).setAngle(0);
    this.status.setText(formatShotStatus(event)).setAlpha(1);

    if (event.eventType === "gift") {
      this.playGiftLaunchEffect(event, gatherX, gatherY);
    }

    this.tweens.add({
      targets: shooter,
      x: gatherX,
      y: gatherY + 8,
      alpha: 1,
      scale: 1,
      duration: 280,
      ease: "Back.easeOut"
    });

    const arc = { t: 0 };
    this.tweens.add({
      targets: arc,
      t: 1,
      delay: 120,
      duration: 780,
      ease: "Cubic.easeInOut",
      onUpdate: () => {
        const t = arc.t;
        const x = quadratic(gatherX, controlX, hoopX, t);
        const y = quadratic(gatherY, controlY, hoopY, t);
        this.ball?.setPosition(x, y).setScale(1.12 - t * 0.42).setAngle(getBallRotation(t, event.team));
        const trailPoints = sampleShotTrail({
          start: { x: gatherX, y: gatherY },
          control: { x: controlX, y: controlY },
          end: { x: hoopX, y: hoopY },
          progress: t
        });
        this.drawShotTrail(trail, trailPoints, trailLayers);
      },
      onComplete: () => {
        if (runId !== this.shotRunId) {
          return;
        }
        if (event.hit) {
          this.playHitEffects(event, hoopX, hoopY);
        } else {
          this.playMissEffects(event, hoopX, hoopY);
        }
        this.tweens.add({
          targets: this.ball,
          x: width / 2,
          y: height - 122,
          scale: 1,
          alpha: 1,
          duration: 340,
          delay: 180,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: shooter,
          x: startX,
          y: startY + 18,
          alpha: 0,
          scale: 0.78,
          duration: 300,
          delay: 320,
          onComplete: () => {
            if (runId === this.shotRunId) {
              this.status?.setText("等待投篮").setAlpha(1);
            }
          }
        });
        this.time.delayedCall(giftEffect ? giftEffect.effectDurationMs + 420 : event.hit ? 1520 : 760, () => {
          if (runId === this.shotRunId) {
            this.clearShotObjects();
          }
        });
      }
    });
  }

  playJoinEffect(member: JoinedMemberEvent) {
    if (!this.scene?.isActive()) {
      return;
    }

    const presentation = buildJoinPresentation(member);
    const { width } = this.scale;
    const rail = getJoinRailLayout(member.team, width);
    const startX = presentation.side === "left" ? -24 : width + 24;
    const startY = 344;
    const targetX = rail.x + rail.width / 2;
    const targetY = rail.y + 46;

    const flash = this.add.graphics().setDepth(9).setAlpha(1);
    flash.fillStyle(presentation.accentColor, 0.12);
    flash.fillRoundedRect(rail.x - 10, rail.y - 10, rail.width + 20, rail.height + 20, 28);
    flash.lineStyle(5, presentation.accentColor, 0.82);
    flash.strokeRoundedRect(rail.x - 10, rail.y - 10, rail.width + 20, rail.height + 20, 28);
    this.trackJoinObject(flash);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 1100,
      ease: "Sine.easeOut",
      onComplete: () => this.destroyJoinObject(flash)
    });

    const beam = this.add.graphics().setDepth(10);
    beam.lineStyle(6, presentation.accentColor, 0.16);
    beam.lineBetween(startX, startY, targetX, targetY);
    beam.lineStyle(2, 0xffffff, 0.28);
    beam.lineBetween(startX, startY, targetX, targetY);
    this.trackJoinObject(beam);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 780,
      delay: 260,
      ease: "Sine.easeOut",
      onComplete: () => this.destroyJoinObject(beam)
    });

    const badge = this.createStaticAvatarBadge(startX, startY, member.nickname, member.team, 23, member.avatarUrl).setDepth(12).setAlpha(0).setScale(0.78);
    const nameTag = this.add
      .text(startX, startY + 32, member.nickname, {
        fontFamily: FONT_STACK,
        fontSize: "14px",
        fontStyle: "900",
        color: "#ffffff",
        backgroundColor: member.team === "red" ? "rgba(127, 29, 29, 0.9)" : "rgba(12, 74, 110, 0.9)",
        padding: { x: 8, y: 4 },
        stroke: "#020617",
        strokeThickness: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(12)
      .setAlpha(0);
    this.trackJoinObject(badge);
    this.trackJoinObject(nameTag);
    this.tweens.add({
      targets: [badge, nameTag],
      x: targetX,
      y: (target: Phaser.GameObjects.GameObject) => (target === nameTag ? targetY + 32 : targetY),
      alpha: 1,
      scale: 1,
      duration: 520,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: [badge, nameTag],
          alpha: 0,
          scale: 0.72,
          delay: 520,
          duration: 360,
          ease: "Sine.easeIn",
          onComplete: () => {
            this.destroyJoinObject(badge);
            this.destroyJoinObject(nameTag);
          }
        });
      }
    });

    const callout = this.createJoinCallout(presentation.headline, presentation.teamLabel, presentation.accentColor, presentation.accentHex);
    this.trackJoinObject(callout);
    this.tweens.add({
      targets: callout,
      y: callout.y - 14,
      alpha: 1,
      scale: 1,
      duration: 420,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: callout,
          y: callout.y - 18,
          alpha: 0,
          delay: 620,
          duration: 360,
          ease: "Sine.easeIn",
          onComplete: () => this.destroyJoinObject(callout)
        });
      }
    });

    this.pulseJoinedRail(member.team);
    this.spawnJoinParticles(targetX, targetY, presentation.accentColor);
  }

  private drawArcadeStage(width: number, height: number) {
    const overlayLayout = getCourtOverlayLayout(width, height);
    const g = this.add.graphics();
    g.fillStyle(0x08111f, 1);
    g.fillRect(0, 0, width, height);

    for (let index = 0; index < 9; index += 1) {
      const x = 80 + index * 96;
      g.lineStyle(1, index % 2 === 0 ? 0x17345a : 0x271f3f, 0.38);
      g.lineBetween(x, 0, x - 120, height);
    }

    g.fillStyle(0x0ea5e9, 0.1);
    g.fillCircle(width * 0.18, 92, 118);
    g.fillStyle(0xff3d55, 0.1);
    g.fillCircle(width * 0.82, 92, 118);
    g.fillStyle(0xfacc15, 0.08);
    g.fillCircle(width / 2, height - 48, 190);

    g.lineStyle(3, 0x38bdf8, 0.36);
    g.strokeRoundedRect(14, 14, width - 28, height - 28, 26);
    g.lineStyle(1, 0xfacc15, 0.5);
    g.lineBetween(28, 28, width - 28, 28);
    g.lineStyle(1, 0xff5a6b, 0.36);
    g.lineBetween(42, height - 28, width / 2 - 30, height - 28);
    g.lineStyle(1, 0x4eb5ff, 0.36);
    g.lineBetween(width / 2 + 30, height - 28, width - 42, height - 28);

    for (let row = 0; row < 3; row += 1) {
      for (let index = 0; index < 28; index += 1) {
        const leftX = 56 + index * 9;
        const rightX = width - 56 - index * 9;
        const y = 70 + row * 13;
        const color = index % 3 === 0 ? 0xfacc15 : index % 3 === 1 ? 0xff5a6b : 0x4eb5ff;
        g.fillStyle(color, 0.32 - row * 0.05);
        g.fillCircle(leftX, y, 2.2);
        g.fillCircle(rightX, y, 2.2);
      }
    }

    for (let index = 0; index < 6; index += 1) {
      const y = 150 + index * 42;
      g.lineStyle(10, 0xff5a6b, 0.07);
      g.lineBetween(32, y, 190, y - 28);
      g.lineStyle(10, 0x4eb5ff, 0.07);
      g.lineBetween(width - 32, y, width - 190, y - 28);
    }

    g.fillStyle(0x0f172a, 0.88);
    g.fillRoundedRect(206, 92, 548, 346, 28);
    g.lineStyle(3, 0x38bdf8, 0.26);
    g.strokeRoundedRect(206, 92, 548, 346, 28);

    g.fillStyle(0x2b1d24, 1);
    g.fillRoundedRect(242, 124, 476, 282, 18);
    g.fillStyle(0x442a20, 0.9);
    g.fillRoundedRect(264, 148, 432, 236, 16);
    for (let index = 0; index < 10; index += 1) {
      g.fillStyle(index % 2 === 0 ? 0x6d3b24 : 0x56301f, 0.24);
      g.fillRect(264 + index * 43, 148, 23, 236);
    }

    g.lineStyle(3, 0xf8fafc, 0.58);
    g.strokeRoundedRect(284, 170, 392, 194, 10);
    g.lineBetween(width / 2, 170, width / 2, 364);
    g.beginPath();
    g.arc(
      overlayLayout.centerRing.x,
      overlayLayout.centerRing.y,
      overlayLayout.centerRing.radius,
      Phaser.Math.DegToRad(overlayLayout.centerRing.arcStartDeg),
      Phaser.Math.DegToRad(overlayLayout.centerRing.arcEndDeg),
      false
    );
    g.strokePath();
    g.strokeCircle(overlayLayout.centerRing.x, overlayLayout.centerRing.y, overlayLayout.centerRing.innerRadius);

    g.setDepth(0);

    this.add
      .text(overlayLayout.titleWatermark.x, overlayLayout.titleWatermark.y, PLAY_TITLE, {
        fontFamily: FONT_STACK,
        fontSize: `${overlayLayout.titleWatermark.fontSize}px`,
        fontStyle: "900",
        color: "#dbeafe",
        stroke: "#020617",
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setAlpha(overlayLayout.titleWatermark.alpha)
      .setDepth(1);
  }

  private drawScoreboard(width: number) {
    const g = this.add.graphics();
    g.fillStyle(0x020617, 0.94);
    g.fillRoundedRect(width / 2 - 282, 10, 564, 78, 14);
    g.lineStyle(2, 0x64748b, 0.55);
    g.strokeRoundedRect(width / 2 - 282, 10, 564, 78, 14);

    g.fillStyle(0x111827, 0.96);
    g.fillRoundedRect(width / 2 - 86, 17, 172, 64, 10);
    g.lineStyle(1, 0x334155, 1);
    g.lineBetween(width / 2 - 104, 24, width / 2 - 104, 74);
    g.lineBetween(width / 2 + 104, 24, width / 2 + 104, 74);

    g.fillStyle(0xff5a6b, 0.14);
    g.fillRoundedRect(width / 2 - 260, 24, 154, 48, 10);
    g.fillStyle(0x4eb5ff, 0.14);
    g.fillRoundedRect(width / 2 + 106, 24, 154, 48, 10);
    g.setDepth(4);
  }

  private drawTeamRail(team: Team, x: number, y: number, width: number, height: number) {
    const color = team === "red" ? 0xff5a6b : 0x4eb5ff;
    const deep = team === "red" ? 0x2a111a : 0x0b1d34;
    const g = this.add.graphics();
    g.fillStyle(0x020617, 0.72);
    g.fillRoundedRect(x, y, width, height, 24);
    g.lineStyle(2, color, 0.78);
    g.strokeRoundedRect(x, y, width, height, 24);
    g.fillStyle(deep, 0.76);
    g.fillRoundedRect(x + 12, y + 16, width - 24, 42, 20);
    g.fillStyle(color, 0.88);
    g.fillCircle(team === "red" ? x + 26 : x + width - 26, y + 38, 7);
    g.lineStyle(5, color, 0.24);
    g.lineBetween(team === "red" ? x + 22 : x + width - 22, y + 76, team === "red" ? x + 22 : x + width - 22, y + height - 22);
    g.setDepth(2);

    const label = this.createMarqueeText(
      team === "red" ? x + 44 : x + 18,
      y + 25,
      width - 62,
      railTitleText(team === "red" ? "#ffd7dd" : "#d6efff"),
      5,
      28,
      "center",
      team === "red" ? "红队" : "蓝队"
    );
    if (team === "red") {
      this.redTeamLabel = label;
    } else {
      this.blueTeamLabel = label;
    }
  }

  private drawHoop(x: number, y: number) {
    const { hoop } = getShotVisualStyle("red");
    const rimY = y + 10;
    const back = this.add.graphics().setDepth(3);
    const net = this.add.graphics().setDepth(6);
    const front = this.add.graphics().setDepth(7);
    const boardX = x - hoop.backboardWidth / 2;
    const boardY = y - 68;

    back.lineStyle(16, 0x38bdf8, 0.08);
    back.strokeRoundedRect(boardX - 4, boardY - 4, hoop.backboardWidth + 8, hoop.backboardHeight + 8, 24);
    back.fillStyle(0x07111f, 0.58);
    back.fillRoundedRect(boardX, boardY, hoop.backboardWidth, hoop.backboardHeight, 22);
    back.fillStyle(0x0ea5e9, 0.08);
    back.fillRoundedRect(boardX + 8, boardY + 8, hoop.backboardWidth - 16, hoop.backboardHeight - 16, 18);
    back.lineStyle(2, 0x38bdf8, 0.74);
    back.strokeRoundedRect(boardX, boardY, hoop.backboardWidth, hoop.backboardHeight, 22);
    back.lineStyle(1, 0xe0f2fe, 0.24);
    back.lineBetween(boardX + 22, boardY + 14, boardX + hoop.backboardWidth - 40, boardY + 14);
    back.lineBetween(boardX + 36, boardY + hoop.backboardHeight - 14, boardX + hoop.backboardWidth - 22, boardY + hoop.backboardHeight - 14);

    const ledY = boardY + 20;
    const ledGap = 4;
    const ledWidth = (hoop.backboardWidth - 54 - ledGap * (hoop.ledSegmentCount - 1)) / hoop.ledSegmentCount;
    for (let index = 0; index < hoop.ledSegmentCount; index += 1) {
      const ledX = boardX + 27 + index * (ledWidth + ledGap);
      const isHot = index % 5 === 1 || index % 5 === 2;
      back.fillStyle(isHot ? 0xff3d55 : index % 2 === 0 ? 0x38bdf8 : 0xfacc15, isHot ? 0.88 : 0.58);
      back.fillRoundedRect(ledX, ledY, ledWidth, 5, 3);
      back.fillStyle(0xffffff, isHot ? 0.2 : 0.1);
      back.fillRoundedRect(ledX + 1, ledY + 1, Math.max(2, ledWidth - 2), 1, 1);
    }

    const railInset = 15;
    for (let index = 0; index < hoop.sideRailCount; index += 1) {
      const railX = index === 0 ? boardX + railInset : boardX + hoop.backboardWidth - railInset;
      back.lineStyle(10, index === 0 ? 0x38bdf8 : 0xff3d55, 0.16);
      back.lineBetween(railX, boardY + 25, railX, boardY + hoop.backboardHeight - 20);
      back.lineStyle(3, index === 0 ? 0x67e8f9 : 0xff8aa0, 0.76);
      back.lineBetween(railX, boardY + 29, railX, boardY + hoop.backboardHeight - 24);
      back.fillStyle(0xffffff, 0.65);
      back.fillCircle(railX, boardY + 27, 2.4);
      back.fillCircle(railX, boardY + hoop.backboardHeight - 22, 2.4);
    }

    const bracketLength = 24;
    const bracketOffset = 12;
    for (let index = 0; index < hoop.cornerBracketCount; index += 1) {
      const left = index % 2 === 0;
      const top = index < 2;
      const bx = left ? boardX + bracketOffset : boardX + hoop.backboardWidth - bracketOffset;
      const by = top ? boardY + bracketOffset : boardY + hoop.backboardHeight - bracketOffset;
      const sx = left ? 1 : -1;
      const sy = top ? 1 : -1;
      back.lineStyle(4, top ? 0x67e8f9 : 0xff3d55, 0.78);
      back.lineBetween(bx, by, bx + sx * bracketLength, by);
      back.lineBetween(bx, by, bx, by + sy * bracketLength);
      back.lineStyle(10, top ? 0x38bdf8 : 0xff3d55, 0.09);
      back.lineBetween(bx, by, bx + sx * (bracketLength + 10), by);
      back.lineBetween(bx, by, bx, by + sy * (bracketLength + 10));
    }

    for (let index = 0; index < hoop.glassReflectionCount; index += 1) {
      const reflectionX = boardX + 32 + index * 34;
      back.lineStyle(index % 2 === 0 ? 2 : 1, 0xe0f2fe, 0.12);
      back.lineBetween(reflectionX, boardY + 36, reflectionX + 46, boardY + 18);
      back.lineStyle(1, 0x67e8f9, 0.08);
      back.lineBetween(reflectionX + 8, boardY + 78, reflectionX + 58, boardY + 50);
    }

    back.fillStyle(0x020617, 0.56);
    back.fillRoundedRect(x - 80, y - 42, 160, 62, 14);
    back.lineStyle(2, 0xf8fafc, 0.44);
    back.strokeRoundedRect(x - 80, y - 42, 160, 62, 14);
    back.lineStyle(3, 0x67e8f9, 0.28);
    back.strokeRoundedRect(x - 64, y - 28, 128, 36, 10);

    for (let index = 0; index < 5; index += 1) {
      const dotX = boardX + 22 + index * ((hoop.backboardWidth - 44) / 4);
      back.fillStyle(index % 2 === 0 ? 0x38bdf8 : 0xff3d55, 0.62);
      back.fillCircle(dotX, boardY + 12, 2.5);
      back.fillStyle(0xffffff, 0.18);
      back.fillCircle(dotX, boardY + hoop.backboardHeight - 12, 1.8);
    }

    back.lineStyle(10, 0xff3d55, 0.1);
    back.strokeEllipse(x, rimY + 3, hoop.rimWidth + 32, hoop.rimHeight + 18);

    net.lineStyle(2, 0xe0f2fe, 0.52);
    for (let index = 0; index < hoop.netLineCount; index += 1) {
      const offset = -58 + index * (116 / (hoop.netLineCount - 1));
      net.lineBetween(x + offset, rimY + 10, x + offset * 0.42, rimY + 66);
    }
    net.lineStyle(1.5, 0x67e8f9, 0.22);
    const weaveLines = sampleNetWeaveLines({
      centerX: x,
      topY: rimY + 18,
      bottomY: rimY + 66,
      topWidth: hoop.rimWidth - 18,
      bottomWidth: hoop.rimWidth * 0.36,
      lineCount: 5
    });
    for (const line of weaveLines) {
      net.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
    }

    const beamY = rimY - 30;
    const beamTotalWidth = 188;
    const beamStartX = x - beamTotalWidth / 2;
    const beamGap = 5;
    const beamSegmentWidth = (beamTotalWidth - hoop.rimBeamCenterGap - beamGap * (hoop.rimBeamSegmentCount - 2)) / hoop.rimBeamSegmentCount;
    front.fillStyle(0x020617, 0.68);
    front.fillRoundedRect(x - 100, beamY - 5, 200, 20, 10);
    front.lineStyle(1, 0x67e8f9, 0.32);
    front.strokeRoundedRect(x - 100, beamY - 5, 200, 20, 10);
    for (let index = 0; index < hoop.rimBeamSegmentCount; index += 1) {
      const side = index < hoop.rimBeamSegmentCount / 2 ? -1 : 1;
      const localIndex = side === -1 ? index : index - hoop.rimBeamSegmentCount / 2;
      const segmentX =
        side === -1
          ? beamStartX + localIndex * (beamSegmentWidth + beamGap)
          : x + hoop.rimBeamCenterGap / 2 + localIndex * (beamSegmentWidth + beamGap);
      const color = index % 3 === 0 ? 0x67e8f9 : index % 3 === 1 ? 0xfacc15 : 0xff6b7e;
      front.fillStyle(color, index % 2 === 0 ? 0.9 : 0.68);
      front.fillRoundedRect(segmentX, beamY, beamSegmentWidth, 8, 4);
      front.fillStyle(0xffffff, 0.2);
      front.fillRoundedRect(segmentX + 2, beamY + 1, Math.max(2, beamSegmentWidth - 4), 2, 1);
    }
    front.fillStyle(0x38bdf8, 0.9);
    front.fillCircle(x - hoop.rimBeamCenterGap / 2 - 8, beamY + 4, 3.5);
    front.fillCircle(x + hoop.rimBeamCenterGap / 2 + 8, beamY + 4, 3.5);
    front.lineStyle(2, 0xe0f2fe, 0.44);
    front.lineBetween(x - hoop.rimBeamCenterGap / 2 + 2, beamY + 4, x + hoop.rimBeamCenterGap / 2 - 2, beamY + 4);
    front.lineStyle(5, 0x38bdf8, 0.13);
    front.lineBetween(x - 92, beamY + 4, x - hoop.rimBeamCenterGap / 2 - 13, beamY + 4);
    front.lineBetween(x + hoop.rimBeamCenterGap / 2 + 13, beamY + 4, x + 92, beamY + 4);

    front.lineStyle(hoop.rimThickness + 14, 0xff5a6b, 0.12);
    front.strokeEllipse(x, rimY, hoop.rimWidth + 18, hoop.rimHeight + 12);
    front.lineStyle(hoop.rimThickness + 6, 0xff3d55, 0.28);
    front.strokeEllipse(x, rimY, hoop.rimWidth + 8, hoop.rimHeight + 6);
    front.lineStyle(hoop.rimThickness, 0xff3048, 0.98);
    front.strokeEllipse(x, rimY, hoop.rimWidth, hoop.rimHeight);
    front.lineStyle(3, 0xffd1d8, 0.92);
    for (const segment of sampleRimGlintSegments({ centerX: x, rimY, rimWidth: hoop.rimWidth, rimHeight: hoop.rimHeight })) {
      front.lineBetween(segment.start.x, segment.start.y, segment.end.x, segment.end.y);
    }
  }

  private createBasketball(x: number, y: number, skin: GiftBallSkin = getGiftBallSkin()) {
    const { ball } = getShotVisualStyle("red");
    const glow = this.add.circle(0, 3, ball.glowRadius, skin.glowColor, 0.22);
    const shadow = this.add.circle(5, 7, ball.radius + 4, skin.darkColor, 0.5);
    const body = this.add.circle(0, 0, ball.radius, skin.baseColor).setStrokeStyle(4, skin.seamColor, 0.95);
    const bodyShade = this.add.ellipse(8, 10, ball.radius * 1.32, ball.radius * 0.92, skin.darkColor, 0.16).setAngle(-26);
    const warmPatch = this.add.ellipse(-7, -6, ball.radius * 1.18, ball.radius * 0.76, skin.accentColor, 0.16).setAngle(-24);
    const seams = this.add.graphics();
    seams.lineStyle(ball.seamWidth, skin.seamColor, 0.72);
    seams.lineBetween(-ball.radius + 5, -9, ball.radius - 5, -9);
    seams.lineBetween(-ball.radius + 5, 8, ball.radius - 5, 8);
    seams.beginPath();
    seams.arc(-11, -1, 22, Phaser.Math.DegToRad(-74), Phaser.Math.DegToRad(74), false);
    seams.strokePath();
    seams.beginPath();
    seams.arc(11, -1, 22, Phaser.Math.DegToRad(106), Phaser.Math.DegToRad(254), false);
    seams.strokePath();
    seams.lineStyle(1, skin.accentColor, 0.18);
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      seams.fillStyle(index % 2 === 0 ? skin.accentColor : skin.darkColor, 0.16);
      seams.fillCircle(Math.cos(angle) * 15, Math.sin(angle) * 12, 1.6);
    }
    const highlight = this.add.circle(-9, -10, ball.highlightRadius, skin.accentColor, 0.72);
    const smallHighlight = this.add.circle(-15, -17, 3, 0xffffff, 0.48);
    const objects: Phaser.GameObjects.GameObject[] = [glow, shadow, body, bodyShade, warmPatch, seams, highlight, smallHighlight];

    if (skin.icon) {
      const iconGlow = this.add.circle(9, -8, 13, skin.accentColor, 0.22);
      const icon = this.add
        .text(9, -10, skin.icon, {
          fontFamily: FONT_STACK,
          fontSize: "18px",
          fontStyle: "900",
          color: "#ffffff",
          stroke: `#${skin.seamColor.toString(16).padStart(6, "0")}`,
          strokeThickness: 4
        })
        .setOrigin(0.5);
      objects.push(iconGlow, icon);
    }

    return this.add.container(x, y, objects).setDepth(5);
  }

  private drawShotTrail(trail: Phaser.GameObjects.Graphics, points: ShotPoint[], layers: ShotTrailLayer[]) {
    trail.clear();
    if (points.length < 2) {
      return;
    }

    for (const layer of layers) {
      if (layer.name === "spark") {
        for (let index = 2; index < points.length; index += 3) {
          const point = points[index];
          const size = layer.width * point.sparkScale;
          trail.fillStyle(layer.color, layer.alpha * point.alpha);
          trail.fillCircle(point.x, point.y + point.orbitOffset * 0.4, size);
          trail.fillStyle(0xfacc15, 0.28 * point.alpha);
          trail.fillCircle(point.x - point.orbitOffset, point.y - point.orbitOffset, size * 0.62);
        }
        continue;
      }

      const offsets = layer.name === "ribbon" ? [-1, 1] : [0];
      for (const offsetSign of offsets) {
        for (let index = 1; index < points.length; index += 1) {
          const previous = points[index - 1];
          const current = points[index];
          const segmentProgress = index / (points.length - 1);
          const width = Math.max(1, layer.width - segmentProgress * 3.2);
          const alpha = layer.alpha * current.alpha * (layer.name === "highlight" ? segmentProgress : 1);
          trail.lineStyle(width, layer.color, alpha);
          trail.lineBetween(
            previous.x,
            previous.y + previous.orbitOffset * offsetSign,
            current.x,
            current.y + current.orbitOffset * offsetSign
          );
        }
      }
    }
  }

  private drawTicker(width: number, height: number) {
    const y = height - 82;
    const g = this.add.graphics();
    g.fillStyle(0x020617, 0.82);
    g.fillRoundedRect(42, y, width - 84, 62, 16);
    g.lineStyle(1, 0x475569, 0.82);
    g.strokeRoundedRect(42, y, width - 84, 62, 16);
    g.lineBetween(342, y + 12, 342, y + 50);
    g.lineBetween(width - 306, y + 12, width - 306, y + 50);
    g.setDepth(4);

    this.add.text(70, y + 9, "最近进球", tickerLabel("#fecaca")).setDepth(6);
    this.add.text(370, y + 9, "贡献榜前三", tickerLabel("#fde68a")).setDepth(6);
    this.add.text(width - 284, y + 9, "本场 MVP", tickerLabel("#bfdbfe")).setDepth(6);
  }

  private renderSnapshot() {
    if (!this.snapshot || !this.redScore || !this.blueScore || !this.redRail || !this.blueRail || !this.feed || !this.leaderboard || !this.mvpLine) {
      return;
    }

    const snapshot = this.snapshot;
    this.redScore.setText(`${snapshot.redTeamName} ${snapshot.scores.red}`);
    this.blueScore.setText(`${snapshot.scores.blue} ${snapshot.blueTeamName}`);
    if (this.redTeamLabel) {
      this.setMarqueeText(this.redTeamLabel, snapshot.redTeamName);
    }
    if (this.blueTeamLabel) {
      this.setMarqueeText(this.blueTeamLabel, snapshot.blueTeamName);
    }
    this.renderRail(snapshot, "red", this.redRail);
    this.renderRail(snapshot, "blue", this.blueRail);
    this.setMarqueeText(this.feed, formatRecentEvents(snapshot.recentEvents));
    this.setMarqueeText(this.leaderboard, formatLeaderboard(snapshot.leaderboard));
    this.setMarqueeText(this.mvpLine, formatMvp(snapshot.mvp));
    this.renderTimer();
    this.renderArenaPresentation();

    if (snapshot.status === "finished" && this.status) {
      const winnerName = snapshot.winner === "draw" ? "双方平局" : snapshot.winner === "red" ? snapshot.redTeamName : snapshot.blueTeamName;
      this.status.setText(snapshot.winner === "draw" ? "本局平局" : `${winnerName} 获胜`);
      this.clearJoinObjects();
      this.renderAwardSettlement(snapshot);
    } else {
      this.clearSettlement();
    }
  }

  private renderTimer(nowMs = Date.now()) {
    if (!this.timer || !this.snapshot) {
      return;
    }
    if (this.snapshot.status !== "running" || !this.snapshot.startedAt) {
      this.timer.setText(formatSeconds(this.snapshot.durationSeconds));
      this.timer.setColor("#ffffff");
      return;
    }
    this.timer.setText(formatSeconds(getRemainingSeconds(this.snapshot.durationSeconds, this.snapshot.startedAt, nowMs)));
    const livePhase = getArenaPhase(this.snapshot.status, this.snapshot.startedAt, this.snapshot.durationSeconds, nowMs);
    this.timer.setColor(livePhase === "clutch" ? "#fb923c" : "#ffffff");
  }

  private renderArenaPresentation(nowMs = Date.now()) {
    this.clearArenaPresentation();
    if (!this.snapshot || !this.status) {
      return;
    }

    const phase = getArenaPhase(this.snapshot.status, this.snapshot.startedAt, this.snapshot.durationSeconds, nowMs);
    this.arenaPhase = phase;

    if (phase === "settlement") {
      this.status.setText("赛后颁奖");
      return;
    }

    if (phase === "opening") {
      this.status.setText("开场倒计时");
      this.renderOpeningCeremony(nowMs);
      return;
    }

    if (phase === "clutch") {
      this.status.setText("最后 30 秒");
      this.renderClutchOverlay();
    } else {
      this.status.setText("等待投篮");
    }

    if (this.arenaCallout) {
      this.renderCallout(this.arenaCallout);
    }
  }

  private renderOpeningCeremony(nowMs: number) {
    if (!this.snapshot?.startedAt) {
      return;
    }
    const { width, height } = this.scale;
    const elapsed = Math.max(0, nowMs - Date.parse(this.snapshot.startedAt));
    const remaining = Math.ceil(Math.max(0, OPENING_COUNTDOWN_MS - elapsed) / 1000);
    const label = remaining > 0 ? `${remaining}` : "GO";

    const wash = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.48).setDepth(14);
    const ring = this.add.circle(width / 2, height / 2 + 8, 92).setStrokeStyle(8, 0xfacc15, 0.72).setDepth(15);
    const redBeam = this.add.rectangle(width / 2 - 238, height / 2, 258, 10, 0xff5a6b, 0.72).setDepth(15);
    const blueBeam = this.add.rectangle(width / 2 + 238, height / 2, 258, 10, 0x4eb5ff, 0.72).setDepth(15);
    const title = this.add
      .text(width / 2, height / 2 - 88, "斗篮机开赛", ceremonyText("#ffffff", "34px"))
      .setOrigin(0.5)
      .setDepth(16);
    const countdown = this.add
      .text(width / 2, height / 2 + 6, label, ceremonyText(label === "GO" ? "#86efac" : "#facc15", "86px"))
      .setOrigin(0.5)
      .setDepth(16);
    const subtitle = this.add
      .text(width / 2, height / 2 + 92, `${this.snapshot.redTeamName} VS ${this.snapshot.blueTeamName}`, ceremonyText("#bfdbfe", "24px"))
      .setOrigin(0.5)
      .setDepth(16);

    this.tweens.add({ targets: ring, scale: 1.24, alpha: 0.14, duration: 520, ease: "Sine.easeOut" });
    this.tweens.add({ targets: [redBeam, blueBeam], scaleX: 1.18, alpha: 0.24, duration: 520, ease: "Sine.easeOut" });
    this.arenaPresentationObjects.push(wash, ring, redBeam, blueBeam, title, countdown, subtitle);
  }

  private renderClutchOverlay() {
    const { width, height } = this.scale;
    const pulse = this.add.graphics().setDepth(13);
    pulse.lineStyle(5, 0xfb923c, 0.78);
    pulse.strokeRoundedRect(24, 22, width - 48, height - 44, 22);
    pulse.lineStyle(1, 0xfacc15, 0.5);
    pulse.strokeRoundedRect(34, 32, width - 68, height - 64, 18);

    const label = this.add
      .text(width / 2, 106, "最后 30 秒 · 决胜时刻", ceremonyText("#fed7aa", "20px"))
      .setOrigin(0.5)
      .setDepth(14);
    this.tweens.add({ targets: label, alpha: 0.45, duration: 420, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
    this.arenaPresentationObjects.push(pulse, label);
  }

  private renderCallout(callout: ArenaCallout) {
    const { width } = this.scale;
    const color = callout.tone === "red" ? 0xff5a6b : callout.tone === "blue" ? 0x4eb5ff : callout.tone === "gold" ? 0xfacc15 : 0x94a3b8;
    const y = this.arenaPhase === "clutch" ? 140 : 102;
    const card = this.add.graphics().setDepth(14);
    card.fillStyle(0x020617, 0.86);
    card.fillRoundedRect(width / 2 - 192, y, 384, 58, 16);
    card.lineStyle(2, color, 0.82);
    card.strokeRoundedRect(width / 2 - 192, y, 384, 58, 16);
    card.fillStyle(color, 0.18);
    card.fillRoundedRect(width / 2 - 180, y + 10, 86, 38, 16);

    const title = this.add
      .text(width / 2 - 74, y + 10, callout.title, ceremonyText("#ffffff", "18px"))
      .setDepth(15);
    const body = this.add
      .text(width / 2 - 74, y + 34, callout.body, ceremonyText("#cbd5e1", "13px"))
      .setDepth(15);
    const badge = this.add
      .text(width / 2 - 137, y + 19, callout.tone === "gold" ? "MVP" : "PK", ceremonyText(`#${color.toString(16).padStart(6, "0")}`, "16px"))
      .setOrigin(0.5)
      .setDepth(15);

    this.arenaPresentationObjects.push(card, title, body, badge);
  }

  private clearArenaPresentation() {
    for (const object of this.arenaPresentationObjects) {
      object.destroy();
    }
    this.arenaPresentationObjects = [];
  }

  private renderRail(snapshot: MatchSnapshot, team: Team, rail: RailTextSet) {
    const keyword = team === "red" ? snapshot.redKeyword : snapshot.blueKeyword;
    const top = snapshot.teamLeaderboards[team][0];
    this.setMarqueeText(rail.member, `${snapshot.memberCount[team]} 人在线`);
    this.setMarqueeText(rail.keyword, `口令 #${keyword}`);
    this.setMarqueeText(rail.top, top ? `TOP ${top.nickname} ${top.score}分` : "等待上榜");
  }

  private createRailTextSet(x: number, y: number, width: number, color: string): RailTextSet {
    return {
      member: this.createMarqueeText(x, y, width, railText(color), 5, 26, "center"),
      keyword: this.createMarqueeText(x, y + 52, width, railText(color), 5, 26, "center"),
      top: this.createMarqueeText(x, y + 104, width, railText(color), 5, 26, "center")
    };
  }

  private createMarqueeText(
    x: number,
    y: number,
    width: number,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    depth: number,
    height: number,
    align: "left" | "center",
    initialText = ""
  ) {
    const maskGraphics = this.add.graphics().setVisible(false);
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(x, y, width, height);
    const text = this.add.text(x, y, initialText, style).setDepth(depth);
    text.setMask(maskGraphics.createGeometryMask());
    this.marqueeConfigs.set(text, { x, width, align });
    this.setMarqueeText(text, initialText);
    return text;
  }

  private setMarqueeText(text: Phaser.GameObjects.Text, content: string) {
    const config = this.marqueeConfigs.get(text);
    if (!config) {
      text.setText(content);
      return;
    }

    this.tweens.killTweensOf(text);
    text.setText(content);
    const overflow = text.width - config.width;
    if (overflow <= 0) {
      text.setX(config.align === "center" ? config.x + (config.width - text.width) / 2 : config.x);
      return;
    }

    const padding = 26;
    text.setX(config.x);
    this.tweens.add({
      targets: text,
      x: config.x - overflow - padding,
      delay: 520,
      duration: Math.max(2400, (overflow + padding) * 48),
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
      repeatDelay: 520
    });
  }

  private renderAwardSettlement(snapshot: MatchSnapshot) {
    this.clearSettlement();
    const { width, height } = this.scale;
    const ceremony = buildSettlementCeremony(snapshot);
    const accentHex = settlementToneHex(ceremony.winnerTone);
    const accentColor = Phaser.Display.Color.HexStringToColor(accentHex).color;

    const dim = this.trackSettlementObject(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.86).setDepth(20));
    dim.setAlpha(0.9);

    const leftLight = this.trackSettlementObject(this.add.triangle(width / 2 - 250, 68, 0, 0, -150, 430, 220, 430, accentColor, 0.08).setDepth(20), 40, 0);
    const rightLight = this.trackSettlementObject(this.add.triangle(width / 2 + 250, 68, 0, 0, -220, 430, 150, 430, accentColor, 0.06).setDepth(20), 60, 0);
    const halo = this.trackSettlementObject(this.add.ellipse(width / 2, 174, 690, 220, accentColor, 0.12).setDepth(20), 80, 0);

    const frame = this.add.graphics().setDepth(21);
    frame.fillStyle(0x0b1224, 0.98);
    frame.fillRoundedRect(42, 24, width - 84, height - 48, 28);
    frame.lineStyle(3, accentColor, 0.7);
    frame.strokeRoundedRect(42, 24, width - 84, height - 48, 28);
    frame.lineStyle(1, 0xfacc15, 0.32);
    frame.strokeRoundedRect(62, 44, width - 124, height - 88, 22);
    this.trackSettlementObject(frame, 90, 10);

    const title = this.add
      .text(width / 2, 38, ceremony.title, {
        fontFamily: FONT_STACK,
        fontSize: "40px",
        fontStyle: "900",
        color: accentHex,
        stroke: "#020617",
        strokeThickness: 8
      })
      .setOrigin(0.5, 0)
      .setDepth(24);
    this.trackSettlementObject(title, 130, -20);

    const scoreline = this.add
      .text(width / 2, 84, `终场比分  ${ceremony.scoreline}`, settlementText("#f8fafc", "22px", "900"))
      .setOrigin(0.5, 0)
      .setDepth(24);
    this.trackSettlementObject(scoreline, 180, -8);

    this.drawAwardScorePill(214, 102, snapshot.redTeamName, snapshot.scores.red, "#ff7a89", 220);
    this.drawAwardScorePill(width - 214, 102, snapshot.blueTeamName, snapshot.scores.blue, "#67c6ff", 250);
    this.drawPodiumStage(ceremony, width, 280);
    this.drawContributionBoard(ceremony.boards.red, 78, 338, 382, 118, 540);
    this.drawContributionBoard(ceremony.boards.blue, width - 460, 338, 382, 118, 570);
    this.drawStatChips(ceremony.statChips, width, height - 92, 700);

    this.addSettlementConfetti(ceremony, width);
    this.tweens.add({
      targets: [leftLight, rightLight, halo],
      alpha: { from: 0.06, to: 0.16 },
      duration: 1400,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
  }

  private drawAwardScorePill(x: number, y: number, teamName: string, score: number, color: string, delay: number) {
    const numericColor = Phaser.Display.Color.HexStringToColor(color).color;
    const container = this.add.container(x, y).setDepth(23);
    const card = this.add.graphics();
    card.fillStyle(0x020617, 0.88);
    card.lineStyle(2, numericColor, 0.78);
    card.fillRoundedRect(-132, 0, 264, 66, 18);
    card.strokeRoundedRect(-132, 0, 264, 66, 18);
    card.fillStyle(numericColor, 0.18);
    card.fillRoundedRect(-114, 10, 228, 18, 9);
    const title = this.add.text(0, 8, teamName, settlementText(color, "17px", "900")).setOrigin(0.5, 0);
    const scoreTextObject = this.add.text(0, 31, `${score} 分`, settlementText("#ffffff", "25px", "900")).setOrigin(0.5, 0);
    container.add([card, title, scoreTextObject]);
    this.trackSettlementObject(container, delay, -12);
  }

  private drawPodiumStage(ceremony: SettlementCeremony, width: number, delay: number) {
    const baseY = 316;
    const rail = this.add.graphics().setDepth(22);
    rail.lineStyle(2, 0x334155, 0.75);
    rail.lineBetween(242, baseY + 4, width - 242, baseY + 4);
    rail.lineStyle(6, 0xfacc15, 0.16);
    rail.lineBetween(298, baseY + 12, width - 298, baseY + 12);
    this.trackSettlementObject(rail, delay, 18);

    this.drawPodiumBlock(width / 2, 218, 176, 98, ceremony.winnerTone === "draw" ? "#f8fafc" : settlementTeamHex(ceremony.podium.center?.team ?? "red"), "1", delay + 40);
    this.drawPodiumBlock(width / 2 - 176, 250, 150, 66, "#ff7a89", "2", delay + 70);
    this.drawPodiumBlock(width / 2 + 176, 250, 150, 66, "#67c6ff", "3", delay + 100);
    this.drawPodiumPlayer(ceremony.podium.center, width / 2, 218, true, delay + 180);
    this.drawPodiumPlayer(ceremony.podium.left, width / 2 - 176, 250, false, delay + 230);
    this.drawPodiumPlayer(ceremony.podium.right, width / 2 + 176, 250, false, delay + 260);
  }

  private drawPodiumBlock(x: number, top: number, width: number, height: number, color: string, place: string, delay: number) {
    const numericColor = Phaser.Display.Color.HexStringToColor(color).color;
    const block = this.add.graphics().setDepth(22);
    block.fillStyle(0x111827, 0.96);
    block.fillRoundedRect(x - width / 2, top, width, height, 16);
    block.lineStyle(3, numericColor, 0.8);
    block.strokeRoundedRect(x - width / 2, top, width, height, 16);
    block.fillStyle(numericColor, 0.18);
    block.fillRoundedRect(x - width / 2 + 12, top + 10, width - 24, 18, 9);
    this.trackSettlementObject(block, delay, 26);

    const placeText = this.add
      .text(x, top + height - 38, place, {
        fontFamily: FONT_STACK,
        fontSize: height > 80 ? "46px" : "34px",
        fontStyle: "900",
        color: color
      })
      .setOrigin(0.5)
      .setDepth(22)
      .setAlpha(0.22);
    this.settlementObjects.push(placeText);
  }

  private drawPodiumPlayer(slot: SettlementPodiumSlot | undefined, x: number, blockTop: number, isCenter: boolean, delay: number) {
    if (!slot) {
      const emptyText = this.add.text(x, blockTop + 20, "等待上榜", settlementText("#94a3b8", "14px", "800")).setOrigin(0.5).setDepth(24);
      this.trackSettlementObject(emptyText, delay, 12);
      return;
    }

    const accent = settlementTeamHex(slot.team);
    const avatarY = blockTop - (isCenter ? 30 : 24);
    const label = this.add
      .text(x, blockTop - (isCenter ? 78 : 62), slot.label, settlementText(isCenter ? "#fef3c7" : accent, isCenter ? "19px" : "15px", "900"))
      .setOrigin(0.5, 0)
      .setDepth(24);
    const badge = this.createStaticAvatarBadge(x, avatarY, slot.player.nickname, slot.team, isCenter ? 25 : 18, slot.player.avatarUrl).setDepth(24);
    const name = this.add.text(x, blockTop + 12, compactPlayerName(slot.player.nickname, isCenter ? 5 : 4), settlementText("#ffffff", isCenter ? "20px" : "16px", "900")).setOrigin(0.5, 0).setDepth(24);
    const stats = this.add
      .text(x, blockTop + (isCenter ? 44 : 36), `${slot.player.score}分  命中${slot.player.hits}/${slot.player.shots}`, settlementText("#cbd5e1", isCenter ? "14px" : "12px", "800"))
      .setOrigin(0.5, 0)
      .setDepth(24);

    this.trackSettlementObject(label, delay, 10);
    this.trackSettlementObject(badge, delay + 40, 16, 0.72);
    this.trackSettlementObject(name, delay + 70, 12);
    this.trackSettlementObject(stats, delay + 90, 12);
  }

  private drawContributionBoard(board: SettlementBoard, x: number, y: number, width: number, height: number, delay: number) {
    const accent = settlementTeamHex(board.team);
    const accentColor = Phaser.Display.Color.HexStringToColor(accent).color;
    const panel = this.add.graphics().setDepth(23);
    panel.fillStyle(0x08111f, 0.94);
    panel.fillRoundedRect(x, y, width, height, 18);
    panel.lineStyle(2, accentColor, 0.56);
    panel.strokeRoundedRect(x, y, width, height, 18);
    panel.fillStyle(accentColor, 0.14);
    panel.fillRoundedRect(x + 14, y + 12, width - 28, 22, 11);
    this.trackSettlementObject(panel, delay, 20);

    const title = this.add.text(x + 24, y + 13, board.title, settlementText(accent, "15px", "900")).setOrigin(0, 0).setDepth(24);
    this.trackSettlementObject(title, delay + 30, 14);

    if (!board.rows.length) {
      const empty = this.add.text(x + width / 2, y + 64, "等待贡献上榜", settlementText("#94a3b8", "15px", "800")).setOrigin(0.5).setDepth(24);
      this.trackSettlementObject(empty, delay + 60, 12);
      return;
    }

    board.rows.forEach((row, index) => {
      const rowY = y + 43 + index * 14;
      const rowDelay = delay + 70 + index * 36;
      const rankColor = index === 0 ? 0xfacc15 : index === 1 ? 0xcbd5e1 : index === 2 ? 0xf59e0b : accentColor;
      const rank = this.add.circle(x + 24, rowY + 6, 7, rankColor, 0.92).setDepth(24);
      const rankText = this.add
        .text(x + 24, rowY + 6, String(row.rank), {
          fontFamily: FONT_STACK,
          fontSize: "10px",
          fontStyle: "900",
          color: "#020617"
        })
        .setOrigin(0.5)
        .setDepth(25);
      const avatar = this.createStaticAvatarBadge(x + 48, rowY + 6, row.player.nickname, row.player.team, 7, row.player.avatarUrl).setDepth(24);
      const name = this.add.text(x + 64, rowY - 1, compactPlayerName(row.player.nickname, 5), settlementText("#f8fafc", "12px", "900")).setOrigin(0, 0).setDepth(24);
      const score = this.add.text(x + width - 122, rowY - 1, `${row.player.score}分`, settlementText("#fef3c7", "12px", "900")).setOrigin(0, 0).setDepth(24);
      const hit = this.add.text(x + width - 66, rowY - 1, `命中${row.player.hits}`, settlementText("#cbd5e1", "12px", "800")).setOrigin(0, 0).setDepth(24);
      [rank, rankText, avatar, name, score, hit].forEach((object, offset) => this.trackSettlementObject(object, rowDelay + offset * 8, 8, object === avatar ? 0.82 : undefined));
    });
  }

  private drawStatChips(chips: SettlementStatChip[], width: number, y: number, delay: number) {
    const chipWidth = 160;
    const gap = 16;
    const startX = (width - chipWidth * chips.length - gap * (chips.length - 1)) / 2;
    chips.forEach((chip, index) => {
      const x = startX + index * (chipWidth + gap);
      const container = this.add.container(x, y).setDepth(24);
      const bg = this.add.graphics();
      bg.fillStyle(0x020617, 0.88);
      bg.lineStyle(1, 0x334155, 0.9);
      bg.fillRoundedRect(0, 0, chipWidth, 44, 15);
      bg.strokeRoundedRect(0, 0, chipWidth, 44, 15);
      const label = this.add.text(18, 7, chip.label, settlementText("#94a3b8", "12px", "800")).setOrigin(0, 0);
      const value = this.add.text(18, 21, chip.value, settlementText("#ffffff", "16px", "900")).setOrigin(0, 0);
      container.add([bg, label, value]);
      this.trackSettlementObject(container, delay + index * 45, 12);
    });
  }

  private addSettlementConfetti(ceremony: SettlementCeremony, width: number) {
    const accent = Phaser.Display.Color.HexStringToColor(settlementToneHex(ceremony.winnerTone)).color;
    const colors = [accent, 0xfacc15, 0x38bdf8, 0xff7a89, 0xf8fafc];
    for (let index = 0; index < 26; index += 1) {
      const x = 84 + ((index * 71) % (width - 168));
      const y = 42 + ((index * 37) % 118);
      const confetti = this.add
        .rectangle(x, y, 4 + (index % 3) * 2, 10 + (index % 2) * 4, colors[index % colors.length], 0.78)
        .setDepth(26)
        .setAngle((index * 23) % 180);
      this.trackSettlementObject(confetti, 260 + index * 14, -18, 0.4);
      this.tweens.add({
        targets: confetti,
        y: y + 26 + (index % 4) * 6,
        angle: confetti.angle + 88,
        alpha: { from: 0.32, to: 0.88 },
        duration: 1700 + index * 18,
        delay: 500 + index * 28,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1
      });
    }
  }

  private trackSettlementObject<T extends Phaser.GameObjects.GameObject>(object: T, delay?: number, yOffset = 14, scaleFrom?: number) {
    this.settlementObjects.push(object);
    if (delay !== undefined) {
      this.animateSettlementObject(object, delay, yOffset, scaleFrom);
    }
    return object;
  }

  private animateSettlementObject(object: Phaser.GameObjects.GameObject, delay: number, yOffset: number, scaleFrom?: number) {
    const target = object as Phaser.GameObjects.GameObject & {
      alpha?: number;
      y?: number;
      scale?: number;
      setAlpha?: (alpha: number) => unknown;
      setY?: (y: number) => unknown;
      setScale?: (scale: number) => unknown;
    };
    const baseY = typeof target.y === "number" ? target.y : undefined;
    const baseScale = typeof target.scale === "number" ? target.scale : 1;
    target.setAlpha?.(0);
    if (baseY !== undefined) {
      target.setY?.(baseY + yOffset);
    }
    if (scaleFrom !== undefined) {
      target.setScale?.(scaleFrom);
    }

    const tweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
      targets: object,
      alpha: 1,
      delay,
      duration: 520,
      ease: "Cubic.easeOut"
    };
    if (baseY !== undefined) {
      tweenConfig.y = baseY;
    }
    if (scaleFrom !== undefined) {
      tweenConfig.scale = baseScale;
    }
    this.tweens.add(tweenConfig);
  }

  private clearSettlement() {
    for (const object of this.settlementObjects) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.settlementObjects = [];
  }

  private createShooterBadge(event: ShotEvent, x: number, y: number) {
    const badge = this.createStaticAvatarBadge(0, 0, event.nickname, event.team, 28, event.avatarUrl);
    const label = this.add
      .text(0, 38, event.nickname, {
        fontFamily: FONT_STACK,
        fontSize: "15px",
        fontStyle: "900",
        color: "#ffffff",
        backgroundColor: event.team === "red" ? "rgba(127, 29, 29, 0.86)" : "rgba(12, 74, 110, 0.86)",
        padding: { x: 9, y: 4 }
      })
      .setOrigin(0.5, 0);
    const container = this.add.container(x, y, [badge, label]).setAlpha(0).setScale(0.76).setDepth(8);
    this.activeShotObjects.push(container);
    return container;
  }

  private createStaticAvatarBadge(x: number, y: number, nickname: string, team: Team, radius: number, avatarUrl?: string) {
    const teamColor = team === "red" ? 0xff5a6b : 0x4eb5ff;
    const glowColor = team === "red" ? 0x7f1d1d : 0x0c4a6e;
    const glow = this.add.circle(0, 0, radius + 8, glowColor, 0.52);
    const base = this.add.circle(0, 0, radius, teamColor, 1).setStrokeStyle(4, 0xffffff, 0.96);
    const initial = this.add
      .text(0, -1, nickname.slice(0, 1), {
        fontFamily: FONT_STACK,
        fontSize: `${Math.max(18, radius)}px`,
        fontStyle: "900",
        color: "#ffffff"
      })
      .setOrigin(0.5);
    const rim = this.add.circle(0, 0, radius + 4).setStrokeStyle(3, teamColor, 0.8);
    const container = this.add.container(x, y, [glow, base, initial, rim]);

    if (avatarUrl) {
      this.attachAvatarImage(container, initial, avatarUrl, radius);
    }

    return container;
  }

  private attachAvatarImage(container: Phaser.GameObjects.Container, fallbackText: Phaser.GameObjects.Text, avatarUrl: string, radius: number) {
    const key = this.avatarKey(avatarUrl);
    const addImage = () => {
      if (!container.active || !this.textures.exists(key)) {
        return;
      }
      const image = this.add.image(0, 0, key).setDisplaySize(radius * 2, radius * 2);
      container.addAt(image, 2);
      fallbackText.setVisible(false);
    };

    if (this.textures.exists(key)) {
      addImage();
      return;
    }
    if (this.loadingAvatarKeys.has(key)) {
      return;
    }

    this.loadingAvatarKeys.add(key);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!this.textures.exists(key)) {
        this.textures.addImage(key, image);
      }
      addImage();
    };
    image.onerror = () => {
      this.loadingAvatarKeys.delete(key);
    };
    image.src = avatarUrl;
  }

  private primeAvatarTextures(snapshot: MatchSnapshot) {
    const avatars = [
      ...snapshot.leaderboard,
      ...snapshot.teamLeaderboards.red,
      ...snapshot.teamLeaderboards.blue,
      ...snapshot.recentEvents
    ]
      .map((entry) => entry.avatarUrl)
      .filter((avatarUrl): avatarUrl is string => Boolean(avatarUrl));

    for (const avatarUrl of avatars) {
      const key = this.avatarKey(avatarUrl);
      if (this.textures.exists(key) || this.loadingAvatarKeys.has(key)) {
        continue;
      }
      this.loadingAvatarKeys.add(key);
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        if (!this.textures.exists(key)) {
          this.textures.addImage(key, image);
        }
      };
      image.onerror = () => this.loadingAvatarKeys.delete(key);
      image.src = avatarUrl;
    }
  }

  private avatarKey(avatarUrl: string) {
    let hash = 0;
    for (let index = 0; index < avatarUrl.length; index += 1) {
      hash = (hash * 31 + avatarUrl.charCodeAt(index)) >>> 0;
    }
    return `avatar-${hash}`;
  }

  private playHitEffects(event: ShotEvent, x: number, y: number) {
    const giftEffect = event.eventType === "gift" ? getGiftEffectPresentation(event.giftKey) : undefined;
    const visualStyle = getShotVisualStyle(event.team);
    const timing = giftEffect ? getGiftEffectTiming(giftEffect.tier) : undefined;
    const color = giftEffect?.primaryColor ?? (event.team === "red" ? 0xff5a6b : 0x4eb5ff);
    const secondaryColor = giftEffect?.secondaryColor ?? color;
    const ring = this.add.circle(x, y, 30).setStrokeStyle(8, color, 1).setDepth(9);
    const glow = this.add.circle(x, y, 18, secondaryColor, 0.36).setDepth(8);
    const rimPulse = this.add.ellipse(x, y + 10, 118, 28).setStrokeStyle(8, color, 0.96).setDepth(11);
    const netWave = this.add.graphics().setDepth(10);
    netWave.lineStyle(3, secondaryColor, 0.82);
    for (let index = -4; index <= 4; index += 1) {
      netWave.lineBetween(x + index * 11, y + 22, x + index * 6, y + 72);
    }
    const score = this.add
      .text(x, y - 78, giftEffect ? `${giftEffect.giftName} 命中 +${event.score}` : `命中 +${event.score}`, {
        fontFamily: FONT_STACK,
        fontSize: "34px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: event.team === "red" ? "#991b1b" : "#075985",
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.activeShotObjects.push(ring, glow, rimPulse, netWave, score);
    if (giftEffect && timing) {
      const hitBadge = this.createGiftIconBadge(giftEffect, x, y - 44, giftEffect.tier === "high" ? 72 : 60, 12);
      hitBadge.setScale(0.44).setAlpha(0);
      this.activeShotObjects.push(hitBadge);
      this.tweens.add({
        targets: hitBadge,
        y: y - 98,
        scale: giftEffect.tier === "high" ? 1.14 : 1,
        alpha: 1,
        duration: 360,
        ease: "Back.easeOut"
      });
      this.tweens.add({
        targets: hitBadge,
        y: y - 142,
        alpha: 0,
        angle: giftEffect.effectKind === "jet" ? 18 : 0,
        duration: Math.max(900, timing.iconHoldDuration - 360),
        delay: 360,
        ease: "Sine.easeOut"
      });
    }
    this.flashWithColor(color, giftEffect ? Math.min(520, Math.round((timing?.totalDuration ?? 1600) * 0.16)) : 240);
    this.cameras.main.shake(giftEffect ? visualStyle.hitEffect.shakeDuration : 160, giftEffect ? (giftEffect.tier === "high" ? 0.014 : 0.01) : 0.006);
    this.tweens.add({
      targets: ring,
      radius: giftEffect ? (giftEffect.tier === "high" ? 184 : 142) : 110,
      alpha: 0,
      duration: giftEffect ? Math.max(visualStyle.hitEffect.ringDuration, Math.round((timing?.totalDuration ?? 1600) * 0.48)) : visualStyle.hitEffect.ringDuration,
      ease: "Cubic.easeOut"
    });
    this.tweens.add({
      targets: glow,
      radius: giftEffect ? (giftEffect.tier === "high" ? 230 : 184) : 146,
      alpha: 0,
      duration: giftEffect ? Math.max(visualStyle.hitEffect.glowDuration, Math.round((timing?.totalDuration ?? 1600) * 0.56)) : visualStyle.hitEffect.glowDuration,
      ease: "Cubic.easeOut"
    });
    this.tweens.add({
      targets: rimPulse,
      scaleX: giftEffect?.tier === "high" ? 1.75 : 1.3,
      scaleY: giftEffect?.tier === "high" ? 2.15 : 1.75,
      alpha: 0,
      duration: giftEffect ? Math.max(visualStyle.hitEffect.ringDuration, Math.round((timing?.totalDuration ?? 1600) * 0.5)) : visualStyle.hitEffect.ringDuration,
      ease: "Sine.easeOut"
    });
    this.tweens.add({
      targets: netWave,
      y: giftEffect?.tier === "high" ? 34 : 18,
      alpha: 0,
      duration: giftEffect ? Math.max(visualStyle.hitEffect.glowDuration, Math.round((timing?.totalDuration ?? 1600) * 0.58)) : visualStyle.hitEffect.glowDuration,
      ease: "Sine.easeOut"
    });
    this.tweens.add({
      targets: score,
      y: giftEffect?.tier === "high" ? y - 162 : y - 136,
      alpha: 0,
      scale: giftEffect?.tier === "high" ? 1.42 : 1.22,
      duration: giftEffect ? Math.max(visualStyle.hitEffect.scoreDuration, Math.round((timing?.totalDuration ?? 1600) * 0.42)) : visualStyle.hitEffect.scoreDuration,
      ease: "Back.easeOut"
    });
    this.spawnSparks(x, y, color);
    if (giftEffect) {
      this.spawnGiftParticles(event, x, y, giftEffect.primaryColor, giftEffect.secondaryColor);
    }
  }

  private playGiftLaunchEffect(event: ShotEvent, x: number, y: number) {
    const effect = getGiftEffectPresentation(event.giftKey);
    const timing = getGiftEffectTiming(effect.tier);
    const halo = this.add.circle(x, y, 38).setStrokeStyle(4, effect.primaryColor, 0.88).setDepth(7);
    const iconBadge = this.createGiftIconBadge(effect, x, y - 22, effect.tier === "high" ? 76 : effect.tier === "mid" ? 64 : 50, 10);
    iconBadge.setAlpha(0).setScale(0.42);
    const tag = this.add
      .text(x, y + 48, `${effect.motionLabel} · ${effect.giftName}`, {
        fontFamily: FONT_STACK,
        fontSize: "16px",
        fontStyle: "900",
        color: "#ffffff",
        backgroundColor: "rgba(2, 6, 23, 0.74)",
        padding: { x: 10, y: 5 },
        stroke: "#020617",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(8);
    this.activeShotObjects.push(halo, iconBadge, tag);
    this.tweens.add({ targets: halo, radius: effect.tier === "high" ? 148 : 104, alpha: 0, duration: timing.launchDuration, ease: "Cubic.easeOut" });
    this.tweens.add({
      targets: iconBadge,
      y: y - 92,
      alpha: 1,
      scale: 1,
      duration: 420,
      ease: "Back.easeOut"
    });
    this.tweens.add({
      targets: iconBadge,
      y: y - (effect.tier === "high" ? 158 : 126),
      alpha: 0,
      scale: effect.tier === "high" ? 1.18 : 1.08,
      angle: effect.effectKind === "donut" ? 360 : effect.effectKind === "jet" ? 22 : 0,
      duration: Math.max(760, timing.iconHoldDuration - 420),
      delay: 420,
      ease: "Sine.easeOut"
    });
    this.tweens.add({ targets: tag, y: y + 18, alpha: 0, duration: timing.launchDuration, ease: "Sine.easeOut" });
    this.playTierAtmosphere(effect, x, y);
    this.playGiftIconEchoes(effect, x, y);
    this.playGiftSignatureLaunch(effect, x, y);
    this.spawnGiftParticles(event, x, y, effect.primaryColor, effect.secondaryColor);
  }

  private createGiftIconBadge(effect: GiftEffectPresentation, x: number, y: number, size: number, depth: number) {
    const ring = this.add.circle(0, 0, size * 0.58, effect.primaryColor, 0.18).setStrokeStyle(3, effect.secondaryColor, 0.78);
    const back = this.add.circle(0, 0, size * 0.5, 0x020617, 0.78).setStrokeStyle(2, effect.primaryColor, 0.92);
    const shine = this.add.circle(-size * 0.18, -size * 0.2, size * 0.14, 0xffffff, 0.35);
    const objects: Phaser.GameObjects.GameObject[] = [ring, back, shine];

    if (effect.iconTextureKey && this.textures.exists(effect.iconTextureKey)) {
      const icon = this.add.image(0, 0, effect.iconTextureKey).setDisplaySize(size * 0.82, size * 0.82);
      objects.push(icon);
    } else {
      const glyph = this.add
        .text(0, -1, effect.glyph, particleText(effect.secondaryColor, `${Math.round(size * 0.46)}px`))
        .setOrigin(0.5);
      objects.push(glyph);
    }

    return this.add.container(x, y, objects).setDepth(depth);
  }

  private playTierAtmosphere(effect: GiftEffectPresentation, x: number, y: number) {
    const timing = getGiftEffectTiming(effect.tier);
    const { width, height } = this.scale;

    if (effect.tier === "high") {
      const wash = this.add.rectangle(width / 2, height / 2, width, height, effect.primaryColor, 0.1).setDepth(6);
      const sweep = this.add.rectangle(-width * 0.18, height / 2, width * 0.42, height * 1.3, effect.secondaryColor, 0.16).setAngle(-18).setDepth(7);
      const leftBeam = this.add.triangle(118, height - 22, 0, 0, 62, -330, 142, 0, effect.primaryColor, 0.13).setDepth(6);
      const rightBeam = this.add.triangle(width - 118, height - 22, 0, 0, -62, -330, -142, 0, effect.secondaryColor, 0.13).setDepth(6);
      const highlight = this.add
        .text(width / 2, 114, "高光时刻", ceremonyText("#fef3c7", "24px"))
        .setOrigin(0.5)
        .setDepth(12)
        .setAlpha(0);
      this.activeShotObjects.push(wash, sweep, leftBeam, rightBeam, highlight);
      this.tweens.add({ targets: wash, alpha: 0, duration: timing.totalDuration, ease: "Sine.easeOut" });
      this.tweens.add({ targets: sweep, x: width * 1.22, alpha: 0, duration: Math.max(2200, timing.totalDuration * 0.58), ease: "Cubic.easeInOut" });
      this.tweens.add({ targets: [leftBeam, rightBeam], alpha: 0, scaleY: 1.18, duration: timing.totalDuration, ease: "Sine.easeOut" });
      this.tweens.add({ targets: highlight, alpha: 1, y: 96, duration: 360, ease: "Back.easeOut" });
      this.tweens.add({ targets: highlight, alpha: 0, y: 70, duration: Math.max(1200, timing.iconHoldDuration - 360), delay: 520, ease: "Sine.easeOut" });
    }

    if (effect.tier === "mid") {
      const field = this.add.ellipse(x, y - 8, 152, 54, effect.secondaryColor, 0.12).setStrokeStyle(3, effect.primaryColor, 0.54).setDepth(6);
      const charge = this.add.rectangle(x, y + 4, 168, 8, effect.primaryColor, 0.42).setDepth(7);
      this.activeShotObjects.push(field, charge);
      this.tweens.add({ targets: field, scaleX: 1.7, scaleY: 1.45, alpha: 0, duration: timing.launchDuration, ease: "Cubic.easeOut" });
      this.tweens.add({ targets: charge, scaleX: 0.16, alpha: 0, duration: timing.iconHoldDuration, ease: "Sine.easeOut" });
    }

    for (let index = 0; index < timing.atmosphereRings; index += 1) {
      const color = index % 2 === 0 ? effect.primaryColor : effect.secondaryColor;
      const ring = this.add.circle(x, y, 44 + index * 12).setStrokeStyle(3, color, 0.62).setDepth(7);
      this.activeShotObjects.push(ring);
      this.tweens.add({
        targets: ring,
        radius: effect.tier === "high" ? 198 + index * 22 : 132 + index * 16,
        alpha: 0,
        duration: timing.launchDuration + index * 160,
        delay: index * 120,
        ease: "Cubic.easeOut"
      });
    }
  }

  private playGiftIconEchoes(effect: GiftEffectPresentation, x: number, y: number) {
    const timing = getGiftEffectTiming(effect.tier);
    const echoCount = effect.tier === "high" ? 4 : effect.tier === "mid" ? 3 : 0;

    for (let index = 0; index < echoCount; index += 1) {
      const echo = this.createGiftIconBadge(effect, x, y - 24, effect.tier === "high" ? 38 : 30, 9);
      echo.setAlpha(0).setScale(0.52);
      this.activeShotObjects.push(echo);

      const target = this.getGiftEchoTarget(effect, x, y, index, echoCount);
      const delay = 260 + index * timing.particleDelayStep * 2;
      this.tweens.add({
        targets: echo,
        x: target.x,
        y: target.y,
        alpha: 0.86,
        scale: effect.tier === "high" ? 1 : 0.88,
        angle: target.angle,
        duration: 420,
        delay,
        ease: "Back.easeOut"
      });
      this.tweens.add({
        targets: echo,
        x: target.x + target.driftX,
        y: target.y + target.driftY,
        alpha: 0,
        scale: 0.38,
        duration: Math.max(720, timing.iconHoldDuration - delay * 0.25),
        delay: delay + 420,
        ease: "Sine.easeOut"
      });
    }
  }

  private getGiftEchoTarget(effect: GiftEffectPresentation, x: number, y: number, index: number, count: number) {
    const centeredIndex = index - (count - 1) / 2;
    if (effect.effectKind === "mirror") {
      return { x: x + centeredIndex * 54, y: y - 96 - Math.abs(centeredIndex) * 10, driftX: centeredIndex * 18, driftY: -28, angle: centeredIndex * 18 };
    }
    if (effect.effectKind === "donut") {
      const angle = (Math.PI * 2 * index) / Math.max(1, count);
      return { x: x + Math.cos(angle) * 76, y: y - 70 + Math.sin(angle) * 42, driftX: Math.cos(angle) * 30, driftY: Math.sin(angle) * 18, angle: 180 };
    }
    if (effect.effectKind === "battery" || effect.effectKind === "boost") {
      return { x: x + centeredIndex * 42, y: y - 78 - index * 18, driftX: 0, driftY: -46, angle: 0 };
    }
    if (effect.effectKind === "airdrop") {
      return { x: x + centeredIndex * 48, y: y - 142 + index * 14, driftX: centeredIndex * 10, driftY: 70, angle: centeredIndex * 10 };
    }
    if (effect.effectKind === "jet") {
      return { x: x - 82 - index * 32, y: y + 18 - index * 24, driftX: -86, driftY: -22, angle: -18 };
    }
    return { x: x + centeredIndex * 58, y: y - 82 - (index % 2) * 26, driftX: centeredIndex * 24, driftY: -34, angle: centeredIndex * 16 };
  }

  private playGiftSignatureLaunch(effect: GiftEffectPresentation, x: number, y: number) {
    switch (effect.effectKind) {
      case "mirror":
        this.playMirrorPortal(x, y, effect.primaryColor, effect.secondaryColor);
        break;
      case "donut":
        this.playDonutOrbit(x, y, effect.primaryColor, effect.secondaryColor);
        break;
      case "battery":
        this.playBatteryCharge(x, y, effect.primaryColor, effect.secondaryColor);
        break;
      case "love":
        this.playLovePulse(x, y, effect.primaryColor, effect.secondaryColor);
        break;
      case "airdrop":
        this.playAirdropDrop(x, y, effect.primaryColor, effect.secondaryColor);
        break;
      case "jet":
        this.playJetBoost(x, y, effect.primaryColor, effect.secondaryColor);
        break;
      case "boost":
        this.playBoostAura(x, y, effect.primaryColor, effect.secondaryColor);
        break;
      default:
        this.playStarArc(x, y, effect.primaryColor, effect.secondaryColor, effect.glyph);
        break;
    }
  }

  private playStarArc(x: number, y: number, primaryColor: number, secondaryColor: number, glyph: string) {
    for (let index = 0; index < 12; index += 1) {
      const offset = (index - 5.5) * 18;
      const star = this.add
        .text(x + offset, y - 18 - Math.abs(offset) * 0.18, glyph, particleText(primaryColor, index % 3 === 0 ? "24px" : "18px"))
        .setOrigin(0.5)
        .setDepth(9);
      star.setTint(index % 2 === 0 ? primaryColor : secondaryColor);
      this.activeShotObjects.push(star);
      this.tweens.add({
        targets: star,
        y: star.y - 74 - (index % 3) * 14,
        x: star.x + (index % 2 === 0 ? -16 : 16),
        alpha: 0,
        scale: 0.25,
        angle: index % 2 === 0 ? 120 : -120,
        duration: 760,
        ease: "Cubic.easeOut"
      });
    }
  }

  private playBoostAura(x: number, y: number, primaryColor: number, secondaryColor: number) {
    for (let index = 0; index < 4; index += 1) {
      const ring = this.add.circle(x, y, 28 + index * 10).setStrokeStyle(3, index % 2 === 0 ? primaryColor : secondaryColor, 0.82).setDepth(8);
      this.activeShotObjects.push(ring);
      this.tweens.add({
        targets: ring,
        radius: 92 + index * 12,
        alpha: 0,
        duration: 620 + index * 90,
        ease: "Cubic.easeOut"
      });
    }
    this.spawnSpeedLines(x, y, primaryColor, 10, -1);
  }

  private playMirrorPortal(x: number, y: number, primaryColor: number, secondaryColor: number) {
    const leftPortal = this.add.ellipse(x - 70, y - 34, 38, 104).setStrokeStyle(5, primaryColor, 0.92).setDepth(8);
    const rightPortal = this.add.ellipse(x + 70, y - 34, 38, 104).setStrokeStyle(5, secondaryColor, 0.82).setDepth(8);
    const beam = this.add.graphics().setDepth(7);
    beam.lineStyle(4, secondaryColor, 0.58);
    beam.lineBetween(x - 50, y - 34, x + 50, y - 34);
    this.activeShotObjects.push(leftPortal, rightPortal, beam);
    this.tweens.add({ targets: [leftPortal, rightPortal], scaleX: 1.4, scaleY: 1.08, alpha: 0, duration: 820, ease: "Sine.easeOut" });
    this.tweens.add({ targets: beam, alpha: 0, duration: 760, ease: "Sine.easeOut" });
  }

  private playDonutOrbit(x: number, y: number, primaryColor: number, secondaryColor: number) {
    const orbit = this.add.circle(x, y - 18, 56).setStrokeStyle(5, primaryColor, 0.84).setDepth(8);
    this.activeShotObjects.push(orbit);
    this.tweens.add({ targets: orbit, angle: 360, scale: 1.35, alpha: 0, duration: 880, ease: "Sine.easeOut" });
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      const candy = this.add.circle(x + Math.cos(angle) * 54, y - 18 + Math.sin(angle) * 32, 5, index % 2 === 0 ? primaryColor : secondaryColor, 0.95).setDepth(9);
      this.activeShotObjects.push(candy);
      this.tweens.add({ targets: candy, angle: 180, alpha: 0, scale: 0.2, duration: 760 + index * 20, ease: "Back.easeOut" });
    }
  }

  private playBatteryCharge(x: number, y: number, primaryColor: number, secondaryColor: number) {
    const bar = this.add.rectangle(x, y - 76, 130, 14, primaryColor, 0.78).setStrokeStyle(2, secondaryColor, 0.9).setDepth(8);
    const cap = this.add.rectangle(x + 72, y - 76, 10, 22, secondaryColor, 0.9).setDepth(8);
    this.activeShotObjects.push(bar, cap);
    this.tweens.add({ targets: [bar, cap], scaleX: 1.26, alpha: 0, duration: 850, ease: "Cubic.easeOut" });
    for (let index = 0; index < 7; index += 1) {
      const bolt = this.add
        .text(x - 72 + index * 24, y - 54 - (index % 2) * 16, "⚡", particleText(index % 2 === 0 ? primaryColor : secondaryColor, "24px"))
        .setOrigin(0.5)
        .setDepth(9);
      this.activeShotObjects.push(bolt);
      this.tweens.add({ targets: bolt, y: bolt.y - 58, alpha: 0, angle: 18, duration: 740, ease: "Cubic.easeOut" });
    }
  }

  private playLovePulse(x: number, y: number, primaryColor: number, secondaryColor: number) {
    const pulse = this.add.circle(x, y, 46).setStrokeStyle(5, primaryColor, 0.9).setDepth(8);
    this.activeShotObjects.push(pulse);
    this.tweens.add({ targets: pulse, radius: 122, alpha: 0, duration: 720, ease: "Cubic.easeOut" });
    for (let index = 0; index < 14; index += 1) {
      const heart = this.add.text(x, y, "♥", particleText(index % 2 === 0 ? primaryColor : secondaryColor, "24px")).setOrigin(0.5).setDepth(9);
      const angle = (Math.PI * 2 * index) / 14;
      this.activeShotObjects.push(heart);
      this.tweens.add({
        targets: heart,
        x: x + Math.cos(angle) * (68 + (index % 3) * 18),
        y: y + Math.sin(angle) * 52 - 44,
        alpha: 0,
        scale: 0.25,
        duration: 820,
        ease: "Back.easeOut"
      });
    }
  }

  private playAirdropDrop(x: number, y: number, primaryColor: number, secondaryColor: number) {
    const crate = this.add.rectangle(x, y - 136, 54, 42, primaryColor, 0.94).setStrokeStyle(4, secondaryColor, 0.9).setDepth(9);
    const parachute = this.add.graphics().setDepth(8);
    parachute.lineStyle(4, secondaryColor, 0.86);
    parachute.arc(x, y - 168, 52, Math.PI, Math.PI * 2);
    parachute.lineBetween(x - 34, y - 168, x - 22, y - 116);
    parachute.lineBetween(x + 34, y - 168, x + 22, y - 116);
    this.activeShotObjects.push(crate, parachute);
    this.tweens.add({ targets: crate, y: y - 38, angle: 10, alpha: 0, duration: 940, ease: "Bounce.easeOut" });
    this.tweens.add({ targets: parachute, y: 58, alpha: 0, duration: 940, ease: "Sine.easeOut" });
  }

  private playJetBoost(x: number, y: number, primaryColor: number, secondaryColor: number) {
    this.spawnSpeedLines(x, y, secondaryColor, 16, 1);
    for (let index = 0; index < 8; index += 1) {
      const flame = this.add.triangle(x - 10 + index * 5, y + 18 + (index % 2) * 8, 0, 0, 16, 24, -16, 24, index % 2 === 0 ? primaryColor : secondaryColor, 0.88).setDepth(8);
      this.activeShotObjects.push(flame);
      this.tweens.add({
        targets: flame,
        y: y + 72 + index * 5,
        alpha: 0,
        scaleY: 0.2,
        duration: 520 + index * 35,
        ease: "Cubic.easeOut"
      });
    }
  }

  private spawnSpeedLines(x: number, y: number, color: number, count: number, direction: -1 | 1) {
    for (let index = 0; index < count; index += 1) {
      const line = this.add.rectangle(x - direction * (44 + index * 10), y + 32 - index * 6, 42, 4, color, 0.72).setDepth(7);
      line.setAngle(-18 * direction);
      this.activeShotObjects.push(line);
      this.tweens.add({
        targets: line,
        x: line.x - direction * 78,
        alpha: 0,
        duration: 500 + index * 25,
        ease: "Cubic.easeOut"
      });
    }
  }

  private spawnGiftParticles(event: ShotEvent, x: number, y: number, primaryColor: number, secondaryColor: number) {
    const effect = getGiftEffectPresentation(event.giftKey);
    const timing = getGiftEffectTiming(effect.tier);
    const particleCount = effect.animationType === "highlight" ? 28 : effect.animationType === "energy" ? 20 : 14;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = -Math.PI / 2 + (index - (particleCount - 1) / 2) * 0.22;
      const distance =
        effect.effectKind === "jet"
          ? 92 + (index % 6) * 20
          : effect.effectKind === "love" || effect.effectKind === "airdrop"
            ? 68 + (index % 6) * 18
            : effect.animationType === "highlight"
              ? 60 + (index % 6) * 18
              : 42 + (index % 5) * 14;
      const color = index % 2 === 0 ? primaryColor : secondaryColor;
      const particle = this.createGiftParticle(effect.effectKind, x, y, color, effect.glyph, index);
      this.activeShotObjects.push(particle);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance + (effect.effectKind === "jet" ? 42 : 0),
        y: y + Math.sin(angle) * distance - 36 - (effect.effectKind === "airdrop" ? index * 2 : 0),
        alpha: 0,
        angle: effect.effectKind === "donut" ? 360 : index % 2 === 0 ? 26 : -26,
        scale: 0.25,
        duration: timing.particleDuration + (index % 5) * 90,
        delay: index * timing.particleDelayStep,
        ease: "Cubic.easeOut"
      });
    }
  }

  private createGiftParticle(
    effectKind: GiftEffectPresentation["effectKind"],
    x: number,
    y: number,
    color: number,
    glyph: string,
    index: number
  ) {
    if (effectKind === "love") {
      return this.add.text(x, y, "♥", particleText(color, "23px")).setOrigin(0.5).setDepth(10);
    }
    if (effectKind === "battery" || effectKind === "jet") {
      return this.add.text(x, y, "⚡", particleText(color, "22px")).setOrigin(0.5).setDepth(10);
    }
    if (effectKind === "airdrop") {
      return this.add.rectangle(x, y, 14 + (index % 2) * 6, 12 + (index % 3) * 4, color, 0.9).setDepth(10);
    }
    if (effectKind === "donut") {
      return this.add.circle(x, y, 5 + (index % 3), color, 0.95).setDepth(10);
    }
    if (effectKind === "mirror") {
      return this.add.rectangle(x, y, 11, 17, color, 0.9).setAngle(45).setDepth(10);
    }
    if (effectKind === "boost") {
      return this.add.triangle(x, y, 0, -11, 10, 10, -10, 10, color, 0.92).setDepth(10);
    }
    return this.add.text(x, y, glyph, particleText(color, "20px")).setOrigin(0.5).setDepth(10);
  }

  private flashWithColor(color: number, duration: number) {
    const rgb = Phaser.Display.Color.IntegerToRGB(color);
    this.cameras.main.flash(duration, rgb.r, rgb.g, rgb.b);
  }

  private playMissEffects(event: ShotEvent, x: number, y: number) {
    const text = this.add
      .text(x, y - 52, "打铁", {
        fontFamily: FONT_STACK,
        fontSize: "30px",
        fontStyle: "900",
        color: "#cbd5e1",
        stroke: "#020617",
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.activeShotObjects.push(text);
    this.cameras.main.shake(90, 0.003);
    this.tweens.add({ targets: text, y: y - 92, alpha: 0, duration: 620, ease: "Sine.easeOut" });
  }

  private spawnSparks(x: number, y: number, color: number) {
    for (let index = 0; index < 22; index += 1) {
      const angle = (Math.PI * 2 * index) / 22;
      const distance = 48 + (index % 4) * 18;
      const spark = this.add.circle(x, y, 3 + (index % 2), color, 0.96).setDepth(10);
      this.activeShotObjects.push(spark);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.18,
        duration: 650,
        ease: "Cubic.easeOut"
      });
    }
  }

  private createJoinCallout(headline: string, teamLabel: string, accentColor: number, accentHex: string) {
    const { width } = this.scale;
    const container = this.add.container(width / 2, 240).setDepth(13).setAlpha(0).setScale(0.84);
    const bg = this.add.graphics();
    bg.fillStyle(0x020617, 0.88);
    bg.fillRoundedRect(-178, -34, 356, 68, 18);
    bg.lineStyle(2, accentColor, 0.72);
    bg.strokeRoundedRect(-178, -34, 356, 68, 18);
    bg.fillStyle(accentColor, 0.2);
    bg.fillRoundedRect(-158, -23, 86, 22, 11);
    const label = this.add.text(-115, -22, teamLabel, settlementText(accentHex, "13px", "900")).setOrigin(0.5, 0);
    const title = this.add
      .text(0, 3, headline, {
        fontFamily: FONT_STACK,
        fontSize: "24px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#020617",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    container.add([bg, label, title]);
    return container;
  }

  private pulseJoinedRail(team: Team) {
    const rail = team === "red" ? this.redRail : this.blueRail;
    const label = team === "red" ? this.redTeamLabel : this.blueTeamLabel;
    const targets = [rail?.member, rail?.keyword, rail?.top, label].filter((object): object is Phaser.GameObjects.Text => Boolean(object));
    this.tweens.add({
      targets,
      scale: 1.12,
      duration: 180,
      ease: "Sine.easeOut",
      yoyo: true,
      onComplete: () => targets.forEach((target) => target.setScale(1))
    });
  }

  private spawnJoinParticles(x: number, y: number, color: number) {
    for (let index = 0; index < 18; index += 1) {
      const angle = -Math.PI / 2 + (index - 8.5) * 0.18;
      const distance = 38 + (index % 5) * 12;
      const particle = this.add.circle(x, y, 2.6 + (index % 3) * 0.8, color, 0.92).setDepth(11);
      this.trackJoinObject(particle);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 760 + (index % 4) * 70,
        ease: "Cubic.easeOut",
        onComplete: () => this.destroyJoinObject(particle)
      });
    }

    for (let index = 0; index < 5; index += 1) {
      const ribbon = this.add.rectangle(x, y + 6, 28, 4, color, 0.72).setDepth(11).setAngle(index * 18 - 36);
      this.trackJoinObject(ribbon);
      this.tweens.add({
        targets: ribbon,
        x: x + (index - 2) * 34,
        y: y + 28 + index * 6,
        alpha: 0,
        duration: 820,
        ease: "Sine.easeOut",
        onComplete: () => this.destroyJoinObject(ribbon)
      });
    }
  }

  private trackJoinObject<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.joinEffectObjects.push(object);
    return object;
  }

  private destroyJoinObject(object: Phaser.GameObjects.GameObject) {
    this.tweens.killTweensOf(object);
    object.destroy();
    this.joinEffectObjects = this.joinEffectObjects.filter((current) => current !== object);
  }

  private clearJoinObjects() {
    for (const object of this.joinEffectObjects) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.joinEffectObjects = [];
  }

  private clearShotObjects() {
    for (const object of this.activeShotObjects) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.activeShotObjects = [];
  }
}

function scoreText(color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize: "25px",
    fontStyle: "900",
    color,
    stroke: "#020617",
    strokeThickness: 5
  };
}

function timerText(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize: "44px",
    fontStyle: "900",
    color: "#ffffff",
    stroke: "#020617",
    strokeThickness: 5
  };
}

function railText(color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize: "18px",
    fontStyle: "900",
    color,
    lineSpacing: 18,
    align: "center"
  };
}

function railTitleText(color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize: "20px",
    fontStyle: "900",
    color,
    letterSpacing: 1
  };
}

function tickerLabel(color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize: "13px",
    fontStyle: "900",
    color
  };
}

function tickerText(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize: "15px",
    fontStyle: "800",
    color: "#f8fafc",
    lineSpacing: 6
  };
}

function statusText(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize: "15px",
    fontStyle: "900",
    color: "#f8fafc",
    align: "center",
    fixedWidth: 244,
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    padding: { x: 10, y: 5 },
    stroke: "#020617",
    strokeThickness: 3
  };
}

function ceremonyText(color: string, fontSize: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize,
    fontStyle: "900",
    color,
    stroke: "#020617",
    strokeThickness: 5
  };
}

function particleText(color: number, fontSize: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize,
    fontStyle: "900",
    color: `#${color.toString(16).padStart(6, "0")}`,
    stroke: "#020617",
    strokeThickness: 3
  };
}

function settlementText(color: string, fontSize = "18px", fontStyle = "800"): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontSize,
    fontStyle,
    color,
    lineSpacing: 8
  };
}

function formatRecentEvents(events: ShotEvent[]) {
  if (!events.length) {
    return "等待观众点赞或送礼";
  }
  return events
    .slice(-2)
    .map((event) => `${event.nickname}${event.hit ? ` +${event.score}` : " 打铁"}`)
    .join(" / ");
}

function formatLeaderboard(entries: LeaderboardEntry[]) {
  if (!entries.length) {
    return "贡献榜暂无数据";
  }
  return entries
    .slice(0, 3)
    .map((entry, index) => `${index + 1}.${compactNickname(entry.nickname)} ${entry.score}分`)
    .join(" / ");
}

function compactNickname(nickname: string) {
  const chars = Array.from(nickname);
  return chars.length > 2 ? `${chars.slice(0, 2).join("")}…` : nickname;
}

function compactPlayerName(nickname: string, maxLength: number) {
  const chars = Array.from(nickname);
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join("")}…` : nickname;
}

function settlementTeamHex(team: Team) {
  return team === "red" ? "#ff7a89" : "#67c6ff";
}

function settlementToneHex(tone: Team | "draw") {
  if (tone === "draw") {
    return "#f8fafc";
  }
  return settlementTeamHex(tone);
}

function getJoinRailLayout(team: Team, sceneWidth: number) {
  if (team === "red") {
    return { x: 28, y: 116, width: 176, height: 250 };
  }

  return { x: sceneWidth - 204, y: 116, width: 176, height: 250 };
}

function formatMvp(entry?: LeaderboardEntry) {
  if (!entry) {
    return "MVP 等待产生";
  }
  return `${entry.nickname} ${entry.score}分 命中${entry.hits}/${entry.shots}`;
}

function formatTeamRows(entries: LeaderboardEntry[]) {
  if (!entries.length) {
    return "暂无贡献";
  }
  return entries.map((entry, index) => `${index + 1}. ${entry.nickname}  ${entry.score}分 / 命中${entry.hits}次`).join("\n");
}

function quadratic(start: number, control: number, end: number, t: number) {
  const reverse = 1 - t;
  return reverse * reverse * start + 2 * reverse * t * control + t * t * end;
}
