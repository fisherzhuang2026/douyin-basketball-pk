import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

const ROOT = "E:\\codexSpace";
const PROJECT = path.join(ROOT, "douyin-basketball-pk");
const APP_URL = "http://localhost:5173/";
const API_URL = "http://localhost:3001";
const OUT_DIR = path.join(ROOT, "douba_live_recording");
const FRAMES_DIR = path.join(OUT_DIR, "frames");
const DOWNLOADS = path.join(os.homedir(), "Downloads");
const SILENT_MP4 = path.join(OUT_DIR, "Dou-BA-live-page-demo-silent.mp4");
const NARRATION_TXT = path.join(OUT_DIR, "Dou-BA-live-page-demo-narration.txt");
const NARRATION_WAV = path.join(OUT_DIR, "Dou-BA-live-page-demo-narration.wav");
const FINAL_MP4 = path.join(DOWNLOADS, "Dou-BA-live-page-demo-with-narration.mp4");
const FINAL_MP4_CN = path.join(DOWNLOADS, "斗篮机-Dou-BA真实页面录制demo_带语音讲解.mp4");
const CONTACT_SHEET = path.join(OUT_DIR, "Dou-BA-live-page-demo-preview.png");
const LOG_PATH = path.join(OUT_DIR, "record-live-page-demo.log");
const FFMPEG = path.join(ROOT, ".video_deps", "imageio_ffmpeg", "binaries", "ffmpeg-win-x86_64-v7.1.exe");

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 12;
const MIN_DURATION_SECONDS = 72;
const REMOTE_DEBUGGING_PORT = 9444;

const NARRATION = `这条视频直接录制当前部署好的 Dou-BA 页面。
主播配置时长、队伍口令和点赞命中率后创建并开始对局。
观众发送红队或蓝队口令加入阵营，入队后本局不能换队。
点赞可以触发普通投篮；官方小玩法礼物固定命中，低价一分、中价两分、高价三分。
真实画面会展示头像、篮球动作、礼物皮肤、投篮轨迹、比分、最近进球、贡献榜前三和本场 MVP。
结束后进入结算页，展示胜负、MVP 和每队前五贡献者。
玩法只做体育互动娱乐展示，不抽奖、不兑奖，也不兑换现金或实物权益。`;

const users = [
  { userId: "u1", nickname: "阿强", team: "red", keyword: "红队", avatarColor: "#ff5c7c", initial: "阿" },
  { userId: "u2", nickname: "小鱼", team: "blue", keyword: "蓝队", avatarColor: "#5ecbff", initial: "鱼" },
  { userId: "u3", nickname: "柠檬", team: "red", keyword: "红队", avatarColor: "#facc15", initial: "柠" },
  { userId: "u4", nickname: "球王", team: "blue", keyword: "蓝队", avatarColor: "#5ff2b2", initial: "王" }
];

const timeline = [
  { at: 1.1, label: "set duration to 3 minutes", run: async (ctx) => setSelect(ctx, 0, "180") },
  { at: 2.0, label: "click create match", run: async (ctx) => clickButton(ctx, 0) },
  { at: 4.4, label: "start match", run: async (ctx) => postJson(`/api/matches/${ctx.matchId}/start`) },
  { at: 6.8, label: "u1 joins red", run: async (ctx) => join(ctx, users[0]) },
  { at: 9.0, label: "u2 joins blue", run: async (ctx) => join(ctx, users[1]) },
  { at: 11.2, label: "u3 joins red", run: async (ctx) => join(ctx, users[2]) },
  { at: 13.4, label: "u4 joins blue", run: async (ctx) => join(ctx, users[3]) },
  { at: 16.0, label: "like shot", run: async (ctx) => like(ctx, "u1") },
  { at: 20.0, label: "fairy stick shot", run: async (ctx) => gift(ctx, "u2", "fairy_stick") },
  { at: 24.0, label: "energy pill shot", run: async (ctx) => gift(ctx, "u3", "energy_pill") },
  { at: 28.0, label: "magic mirror shot", run: async (ctx) => gift(ctx, "u4", "magic_mirror") },
  { at: 32.0, label: "donut shot", run: async (ctx) => gift(ctx, "u1", "donut") },
  { at: 36.0, label: "energy battery shot", run: async (ctx) => gift(ctx, "u2", "energy_battery") },
  { at: 40.0, label: "love blast shot", run: async (ctx) => gift(ctx, "u3", "love_blast") },
  { at: 44.0, label: "mystery airdrop shot", run: async (ctx) => gift(ctx, "u4", "mystery_airdrop") },
  { at: 48.0, label: "super jet shot", run: async (ctx) => gift(ctx, "u1", "super_jet") },
  { at: 55.0, label: "finish match", run: async (ctx) => postJson(`/api/matches/${ctx.matchId}/finish`) }
];

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_PATH, `${line}\n`, "utf8");
}

function resetOutput() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.writeFileSync(LOG_PATH, "", "utf8");
}

function browserPath() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("No Edge/Chrome executable found.");
  }
  return found;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const page = await fetch(APP_URL);
      const api = await fetch(`${API_URL}/api/health`);
      if (page.ok && api.ok) {
        return;
      }
    } catch {
      // Retry while local dev servers finish booting.
    }
    await sleep(500);
  }
  throw new Error("Local app or API is not reachable.");
}

async function waitForJson(url, options = {}, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (!message.id || !this.pending.has(message.id)) {
        if (message.method && this.handlers.has(message.method)) {
          for (const handler of this.handlers.get(message.method)) {
            handler(message.params ?? {});
          }
        }
        return;
      }
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        reject(new Error(`${message.error.message}: ${JSON.stringify(message.error.data ?? "")}`));
      } else {
        resolve(message.result ?? {});
      }
    });
    await new Promise((resolve, reject) => {
      this.ws.once("open", resolve);
      this.ws.once("error", reject);
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) ?? [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  close() {
    this.ws?.close();
  }
}

async function openPage(browser) {
  const target = await waitForJson(
    `http://127.0.0.1:${REMOTE_DEBUGGING_PORT}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" }
  ).catch(() =>
    waitForJson(`http://127.0.0.1:${REMOTE_DEBUGGING_PORT}/json/new?${encodeURIComponent("about:blank")}`)
  );
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Page.navigate", { url: APP_URL });
  await waitForPage(cdp);
  return cdp;
}

async function waitForPage(cdp) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const result = await evalJs(cdp, "Boolean(document.querySelector('canvas') && document.querySelectorAll('button').length >= 8)");
    if (result === true) {
      return;
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for the Dou-BA page to render.");
}

async function evalJs(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result?.value;
}

async function injectFetchObserver(cdp) {
  await evalJs(
    cdp,
    `(() => {
      if (window.__doubaFetchObserved) return true;
      window.__doubaFetchObserved = true;
      window.__doubaMatchId = "";
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        try {
          const url = String(args[0]);
          const init = args[1] || {};
          const method = String(init.method || "GET").toUpperCase();
          if (url.includes("/api/matches") && method === "POST" && !url.includes("/start") && !url.includes("/finish")) {
            response.clone().json().then((payload) => {
              if (payload && payload.id) window.__doubaMatchId = payload.id;
            });
          }
        } catch (error) {
          window.__doubaFetchObserverError = String(error);
        }
        return response;
      };
      return true;
    })()`
  );
}

async function clickButton(ctx, index) {
  await evalJs(
    ctx.cdp,
    `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const button = buttons[${index}];
      if (!button) throw new Error("button ${index} not found");
      button.click();
      return button.textContent;
    })()`
  );
}

async function setSelect(ctx, index, value) {
  await evalJs(
    ctx.cdp,
    `(() => {
      const selects = Array.from(document.querySelectorAll("select"));
      const select = selects[${index}];
      if (!select) throw new Error("select ${index} not found");
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return select.value;
    })()`
  );
}

async function waitForMatchId(cdp) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const matchId = await evalJs(cdp, "window.__doubaMatchId || ''");
    if (matchId) {
      return matchId;
    }
    await sleep(250);
  }
  throw new Error("Created match id was not captured from the real page.");
}

async function postJson(pathname, body) {
  const response = await fetch(`${API_URL}${pathname}`, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error(`POST ${pathname} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function avatarDataUrl(user) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs><radialGradient id="g" cx="28%" cy="22%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".34" stop-color="${user.avatarColor}" stop-opacity=".9"/><stop offset="1" stop-color="#111827"/></radialGradient></defs>
    <rect width="96" height="96" rx="48" fill="url(#g)"/>
    <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="4"/>
    <text x="48" y="57" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="34" font-weight="900" fill="#fff">${user.initial}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function join(ctx, user) {
  await postJson("/api/simulate/comment", {
    matchId: ctx.matchId,
    userId: user.userId,
    nickname: user.nickname,
    avatarUrl: avatarDataUrl(user),
    content: user.keyword
  });
}

async function like(ctx, userId) {
  await postJson("/api/simulate/like", {
    matchId: ctx.matchId,
    userId,
    randomValue: 0.1
  });
}

async function gift(ctx, userId, giftKey) {
  await postJson("/api/simulate/gift", {
    matchId: ctx.matchId,
    userId,
    giftKey
  });
}

function makeVoiceover() {
  fs.writeFileSync(NARRATION_TXT, NARRATION, "utf8");
  const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $speaker.SelectVoice('Microsoft Huihui Desktop') } catch { }
$speaker.Rate = 1
$speaker.Volume = 100
$text = Get-Content -LiteralPath '${NARRATION_TXT.replaceAll("'", "''")}' -Raw -Encoding UTF8
$speaker.SetOutputToWaveFile('${NARRATION_WAV.replaceAll("'", "''")}')
$speaker.Speak($text)
$speaker.Dispose()
`;
  const encoded = Buffer.from(ps, "utf16le").toString("base64");
  execFileSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    encoded
  ]);
}

function wavDurationSeconds(file) {
  const buffer = fs.readFileSync(file);
  const fmt = buffer.indexOf(Buffer.from("fmt "));
  const data = buffer.indexOf(Buffer.from("data"));
  if (fmt < 0 || data < 0) {
    return MIN_DURATION_SECONDS;
  }
  const byteRate = buffer.readUInt32LE(fmt + 16);
  const dataSize = buffer.readUInt32LE(data + 4);
  return dataSize / byteRate;
}

function runFfmpeg(args) {
  execFileSync(FFMPEG, args, { stdio: "inherit" });
}

async function recordFrames(cdp, durationSeconds) {
  const ctx = { cdp, matchId: "" };
  let nextAction = 0;
  const start = Date.now();
  const frameCount = Math.ceil(durationSeconds * FPS);
  let latestFrame;
  let screencastFrames = 0;

  cdp.on("Page.screencastFrame", (params) => {
    latestFrame = Buffer.from(params.data, "base64");
    screencastFrames += 1;
    void cdp.send("Page.screencastFrameAck", { sessionId: params.sessionId }).catch(() => {});
  });

  const firstScreenshot = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 88,
    fromSurface: true,
    captureBeyondViewport: false
  });
  latestFrame = Buffer.from(firstScreenshot.data, "base64");

  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    maxWidth: WIDTH,
    maxHeight: HEIGHT,
    everyNthFrame: 1
  });

  for (let frame = 0; frame < frameCount; frame += 1) {
    const targetMs = Math.round((frame / FPS) * 1000);
    const now = Date.now() - start;
    if (targetMs > now) {
      await sleep(targetMs - now);
    }
    const elapsed = (Date.now() - start) / 1000;
    while (nextAction < timeline.length && elapsed >= timeline[nextAction].at) {
      const action = timeline[nextAction];
      log(`action: ${action.label}`);
      await action.run(ctx);
      if (action.label === "click create match") {
        ctx.matchId = await waitForMatchId(cdp);
        log(`match id: ${ctx.matchId}`);
      }
      nextAction += 1;
      await sleep(250);
    }
    const file = path.join(FRAMES_DIR, `frame_${String(frame + 1).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, latestFrame);
    if ((frame + 1) % (FPS * 10) === 0) {
      log(`captured ${(frame + 1) / FPS}s / ${durationSeconds}s`);
    }
  }
  await cdp.send("Page.stopScreencast").catch(() => {});
  log(`browser screencast frames received: ${screencastFrames}`);
}

function buildVideo() {
  runFfmpeg([
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    path.join(FRAMES_DIR, "frame_%05d.jpg"),
    "-vf",
    `scale=${WIDTH}:${HEIGHT}:in_range=pc:out_range=tv,format=yuv420p`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    SILENT_MP4
  ]);
  runFfmpeg([
    "-y",
    "-i",
    SILENT_MP4,
    "-i",
    NARRATION_WAV,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    FINAL_MP4
  ]);
  fs.copyFileSync(FINAL_MP4, FINAL_MP4_CN);
  runFfmpeg([
    "-y",
    "-i",
    FINAL_MP4,
    "-vf",
    "fps=1/8,scale=384:216,tile=3x3",
    "-frames:v",
    "1",
    "-update",
    "1",
    CONTACT_SHEET
  ]);
}

async function main() {
  resetOutput();
  if (!fs.existsSync(FFMPEG)) {
    throw new Error(`ffmpeg not found: ${FFMPEG}`);
  }
  log("checking local app...");
  await waitForHealth();
  log("generating narration...");
  makeVoiceover();
  const audioDuration = wavDurationSeconds(NARRATION_WAV);
  const duration = Math.ceil(Math.max(MIN_DURATION_SECONDS, audioDuration + 4));
  log(`narration duration: ${audioDuration.toFixed(2)}s, recording duration: ${duration}s`);

  const userDataDir = path.join(os.tmpdir(), `douba-live-recording-${Date.now()}`);
  const browser = spawn(browserPath(), [
    "--headless=new",
    `--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    "--force-device-scale-factor=1",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-extensions",
    "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required",
    "--ignore-gpu-blocklist",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "about:blank"
  ], { stdio: "ignore", windowsHide: true });

  let cdp;
  try {
    log("opening real deployed page in headless browser...");
    cdp = await openPage(browser);
    await injectFetchObserver(cdp);
    log("recording real page frames...");
    await recordFrames(cdp, duration);
  } finally {
    cdp?.close();
    browser.kill();
    await sleep(1000);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (error) {
      log(`temporary browser profile cleanup skipped: ${error.message}`);
    }
  }

  log("building mp4...");
  buildVideo();
  log(`final mp4: ${FINAL_MP4}`);
  log(`final mp4 cn: ${FINAL_MP4_CN}`);
  log(`preview: ${CONTACT_SHEET}`);
}

main().catch((error) => {
  log(`ERROR: ${error.stack || error.message || String(error)}`);
  process.exit(1);
});
