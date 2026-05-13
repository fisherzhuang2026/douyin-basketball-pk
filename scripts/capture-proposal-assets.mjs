import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import WebSocket from "ws";

const outputRoot = path.resolve("logs/proposal-assets-latest");
const stillsDir = path.join(outputRoot, "screenshots");
const gifsDir = path.join(outputRoot, "gifs");
const framesRoot = path.join(outputRoot, "frames");
const chromePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const ffmpegPath = path.resolve("hyperframes/douba-evaluation-video/node_modules/ffmpeg-static/ffmpeg.exe");
const debugPort = 9820;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
          reject(new Error(`Invalid browser JSON: ${data.slice(0, 240)}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForPageWebSocket() {
  for (let index = 0; index < 60; index += 1) {
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

async function post(pathname, body) {
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

async function createBrowser() {
  const userDataDir = path.join(outputRoot, ".tmp", `edge-profile-${Date.now()}`);
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
      "about:blank"
    ],
    { stdio: "ignore" }
  );

  const socket = new WebSocket(await waitForPageWebSocket());
  let id = 0;
  const callbacks = new Map();
  socket.on("message", (data) => {
    const message = JSON.parse(data.toString());
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

  async function close() {
    socket.close();
    chrome.kill();
    await sleep(600);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  return { send, close };
}

async function screenshot(send, filePath) {
  const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
}

async function setupMatch(send) {
  await send("Page.navigate", { url: `http://localhost:5173/?proposalAssets=${Date.now()}` });
  await sleep(2000);
  const match = await post("/api/matches", {
    durationSeconds: 300,
    redTeamName: "红队",
    blueTeamName: "蓝队",
    redKeyword: "红队",
    blueKeyword: "蓝队"
  });
  await sleep(400);
  await post(`/api/matches/${match.id}/start`);
  await sleep(700);
  return match;
}

async function joinDefaultUsers(matchId) {
  await post("/api/simulate/comment", { matchId, userId: "u-red-1", nickname: "阿强", content: "红队" });
  await sleep(180);
  await post("/api/simulate/comment", { matchId, userId: "u-blue-1", nickname: "小鱼", content: "蓝队" });
  await sleep(180);
  await post("/api/simulate/comment", { matchId, userId: "u-red-2", nickname: "柠檬", content: "红队" });
  await sleep(180);
  await post("/api/simulate/comment", { matchId, userId: "u-blue-2", nickname: "球王", content: "蓝队" });
  await sleep(700);
}

async function recordGif(send, name, trigger, durationMs = 3000) {
  const frameDir = path.join(framesRoot, name);
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
  let frame = 1;
  for (let index = 0; index < 3; index += 1) {
    await screenshot(send, path.join(frameDir, `${String(frame).padStart(4, "0")}.png`));
    frame += 1;
    await sleep(120);
  }
  await trigger();
  const targetFrames = Math.max(12, Math.round(durationMs / 125));
  for (let index = 0; index < targetFrames; index += 1) {
    await screenshot(send, path.join(frameDir, `${String(frame).padStart(4, "0")}.png`));
    frame += 1;
    await sleep(40);
  }

  const palettePath = path.join(frameDir, "palette.png");
  const gifPath = path.join(gifsDir, `${name}.gif`);
  const inputPattern = path.join(frameDir, "%04d.png");
  runFfmpeg(["-y", "-framerate", "8", "-i", inputPattern, "-vf", "scale=760:-1:flags=lanczos,palettegen", palettePath]);
  runFfmpeg([
    "-y",
    "-framerate",
    "8",
    "-i",
    inputPattern,
    "-i",
    palettePath,
    "-lavfi",
    "scale=760:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4",
    "-loop",
    "0",
    gifPath
  ]);
  console.log(gifPath);
}

function runFfmpeg(args) {
  const result = spawnSync(ffmpegPath, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr}`);
  }
}

async function main() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(stillsDir, { recursive: true });
  fs.mkdirSync(gifsDir, { recursive: true });

  const browser = await createBrowser();
  const { send } = browser;
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    let match = await setupMatch(send);
    await screenshot(send, path.join(stillsDir, "01-host-config.png"));

    await recordGif(send, "comment-red-join", async () => {
      await post("/api/simulate/comment", { matchId: match.id, userId: "gif-red", nickname: "阿强", content: "红队" });
    }, 2200);

    match = await setupMatch(send);
    await post("/api/simulate/comment", { matchId: match.id, userId: "gif-red-base", nickname: "阿强", content: "红队" });
    await sleep(500);
    await recordGif(send, "comment-blue-join", async () => {
      await post("/api/simulate/comment", { matchId: match.id, userId: "gif-blue", nickname: "小鱼", content: "蓝队" });
    }, 2200);

    match = await setupMatch(send);
    await joinDefaultUsers(match.id);
    await screenshot(send, path.join(stillsDir, "02-main-ui.png"));
    await recordGif(send, "like-shot", async () => {
      await post("/api/simulate/like", { matchId: match.id, userId: "u-red-1", randomValue: 0.05 });
    }, 3000);
    await sleep(900);

    await recordGif(send, "gift-low", async () => {
      await post("/api/simulate/gift", { matchId: match.id, userId: "u-blue-1", giftKey: "fairy_stick" });
    }, 3000);
    await sleep(1000);

    await recordGif(send, "gift-mid", async () => {
      await post("/api/simulate/gift", { matchId: match.id, userId: "u-blue-2", giftKey: "magic_mirror" });
    }, 3600);
    await sleep(1400);

    await recordGif(send, "gift-high", async () => {
      await post("/api/simulate/gift", { matchId: match.id, userId: "u-red-2", giftKey: "super_jet" });
    }, 4600);
    await sleep(1200);
    await screenshot(send, path.join(stillsDir, "03-high-gift.png"));

    await post(`/api/matches/${match.id}/finish`);
    await sleep(1200);
    await screenshot(send, path.join(stillsDir, "04-settlement.png"));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
