import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, "assets", "live-recording");
const framesDir = path.join(outputRoot, "frames");
const rawVideoPath = path.join(outputRoot, "douba-live-demo-raw.mp4");
const concatListPath = path.join(outputRoot, "frames.txt");
const frameMetaPath = path.join(outputRoot, "frames.json");
const finalVideoPath = path.join(projectRoot, "renders", "douba-live-demo-full-recording.mp4");
const downloadsVideoPath = path.join(process.env.USERPROFILE ?? "", "Downloads", "斗篮机提案素材-最新", "douba-live-demo-full-recording.mp4");
const chromePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const ffmpegPath = path.join(projectRoot, "node_modules", "ffmpeg-static", "ffmpeg.exe");
const userDataDir = path.join(projectRoot, ".tmp", `live-record-profile-${Date.now()}`);
const debugPort = 9844;
const captureWidth = 1600;
const captureHeight = 900;
const targetDurationMs = 58_000;

const users = [
  { userId: "live-u1", nickname: "阿强", content: "红队", avatarUrl: avatarDataUrl("阿", "#ff5a6b", "#7f1d2d") },
  { userId: "live-u2", nickname: "小鱼", content: "蓝队", avatarUrl: avatarDataUrl("鱼", "#38bdf8", "#0f3d5f") },
  { userId: "live-u3", nickname: "柠檬", content: "红队", avatarUrl: avatarDataUrl("柠", "#facc15", "#7c4a03") },
  { userId: "live-u4", nickname: "球王", content: "蓝队", avatarUrl: avatarDataUrl("王", "#22c55e", "#064e3b") }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function avatarDataUrl(text, fill, stroke) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <radialGradient id="g" cx="35%" cy="28%" r="70%">
          <stop offset="0%" stop-color="#fff7ed"/>
          <stop offset="45%" stop-color="${fill}"/>
          <stop offset="100%" stop-color="${stroke}"/>
        </radialGradient>
      </defs>
      <circle cx="48" cy="48" r="43" fill="url(#g)" stroke="#ffffff" stroke-width="5"/>
      <circle cx="48" cy="48" r="35" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="3"/>
      <text x="48" y="59" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="34" font-weight="900" fill="#ffffff">${text}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function requestJson(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: debugPort, path: pathname, method: "GET" }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from Chrome: ${data.slice(0, 240)}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForPageWebSocket() {
  for (let index = 0; index < 80; index += 1) {
    try {
      const tabs = await requestJson("/json/list");
      const page = tabs.find((tab) => tab.type === "page" && tab.webSocketDebuggerUrl);
      if (page) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      await sleep(200);
    }
    await sleep(200);
  }
  throw new Error("Unable to find page websocket");
}

async function api(pathname, body) {
  const response = await fetch(`http://localhost:3001${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(path.dirname(finalVideoPath), { recursive: true });
  fs.mkdirSync(path.dirname(downloadsVideoPath), { recursive: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      `--window-size=${captureWidth},${captureHeight}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );

  let socket;
  try {
    socket = new WebSocket(await waitForPageWebSocket());
    let id = 0;
    const callbacks = new Map();
    const screencast = {
      active: false,
      startedAt: 0,
      frames: []
    };

    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      if (message.method === "Page.screencastFrame") {
        id += 1;
        socket.send(JSON.stringify({ id, method: "Page.screencastFrameAck", params: { sessionId: message.params.sessionId } }));
        if (screencast.active) {
          const frameNumber = screencast.frames.length + 1;
          const name = `frame-${String(frameNumber).padStart(5, "0")}.jpg`;
          const output = path.join(framesDir, name);
          fs.writeFileSync(output, Buffer.from(message.params.data, "base64"));
          screencast.frames.push({
            name,
            time: (Date.now() - screencast.startedAt) / 1000
          });
        }
        return;
      }
      const callback = callbacks.get(message.id);
      if (callback) {
        callbacks.delete(message.id);
        callback(message);
      }
    });
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        id += 1;
        callbacks.set(id, (message) => {
          if (message.error) {
            reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
          } else {
            resolve(message.result);
          }
        });
        socket.send(JSON.stringify({ id, method, params }));
      });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: captureWidth,
      height: captureHeight,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send("Page.navigate", { url: `http://localhost:5173/?liveRecording=${Date.now()}` });
    await sleep(2500);

    const recordPromise = recordScreencast(send, screencast);
    const scenarioPromise = runScenario();
    const [{ frameCount, elapsedSeconds }] = await Promise.all([recordPromise, scenarioPromise]);
    await encodeRawVideo(elapsedSeconds);
    fs.copyFileSync(rawVideoPath, finalVideoPath);
    fs.copyFileSync(finalVideoPath, downloadsVideoPath);
    console.log(JSON.stringify({ frameCount, elapsedSeconds, rawVideoPath, finalVideoPath, downloadsVideoPath }, null, 2));
  } finally {
    socket?.close();
    chrome.kill();
    await sleep(500);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Chrome may keep profile databases locked for a moment after shutdown; the temp folder is safe to leave.
    }
  }
}

async function recordScreencast(send, screencast) {
  screencast.frames = [];
  screencast.startedAt = Date.now();
  screencast.active = true;
  await send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    maxWidth: captureWidth,
    maxHeight: captureHeight,
    everyNthFrame: 1
  });
  await sleep(targetDurationMs);
  await send("Page.stopScreencast");
  screencast.active = false;
  const elapsedSeconds = (Date.now() - screencast.startedAt) / 1000;
  fs.writeFileSync(frameMetaPath, JSON.stringify({ elapsedSeconds, frames: screencast.frames }, null, 2));
  return {
    frameCount: screencast.frames.length,
    elapsedSeconds
  };
}

async function runScenario() {
  await sleep(2500);
  const match = await api("/api/matches", {
    durationSeconds: 300,
    redTeamName: "红队",
    blueTeamName: "蓝队",
    redKeyword: "红队",
    blueKeyword: "蓝队"
  });
  await sleep(1800);

  await api(`/api/matches/${match.id}/start`);
  await sleep(1400);

  for (const user of users) {
    await api("/api/simulate/comment", {
      matchId: match.id,
      userId: user.userId,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      content: user.content
    });
    await sleep(700);
  }

  await sleep(1200);
  await api("/api/simulate/like", { matchId: match.id, userId: users[0].userId, randomValue: 0.08 });
  await sleep(3900);

  await api("/api/simulate/gift", { matchId: match.id, userId: users[1].userId, giftKey: "fairy_stick" });
  await sleep(4200);

  await api("/api/simulate/gift", { matchId: match.id, userId: users[2].userId, giftKey: "magic_mirror" });
  await sleep(5200);

  await api("/api/simulate/gift", { matchId: match.id, userId: users[3].userId, giftKey: "super_jet" });
  await sleep(7000);

  await api("/api/simulate/like", { matchId: match.id, userId: users[2].userId, randomValue: 0.12 });
  await sleep(3500);

  await api(`/api/matches/${match.id}/finish`);
  await sleep(14_000);
}

async function encodeRawVideo(elapsedSeconds) {
  const metadata = JSON.parse(fs.readFileSync(frameMetaPath, "utf8"));
  if (!metadata.frames.length) {
    throw new Error("No screencast frames captured");
  }
  const lines = [];
  for (let index = 0; index < metadata.frames.length; index += 1) {
    const frame = metadata.frames[index];
    const next = metadata.frames[index + 1];
    const duration = next ? next.time - frame.time : Math.max(0.2, elapsedSeconds - frame.time);
    lines.push(`file '${path.join(framesDir, frame.name).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`);
    lines.push(`duration ${Math.min(Math.max(duration, 1 / 30), 1.25).toFixed(4)}`);
  }
  const last = metadata.frames[metadata.frames.length - 1];
  lines.push(`file '${path.join(framesDir, last.name).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`);
  fs.writeFileSync(concatListPath, `${lines.join("\n")}\n`);

  await run(ffmpegPath, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-vf",
    "scale=1920:1080:flags=lanczos,format=yuv420p",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-movflags",
    "+faststart",
    rawVideoPath
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
