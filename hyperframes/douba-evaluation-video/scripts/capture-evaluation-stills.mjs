import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const screenDir = path.join(projectRoot, "assets", "screens");
const chromePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const userDataDir = path.join(projectRoot, ".tmp", `capture-profile-${Date.now()}`);
const debugPort = 9810;

const viewers = [
  { userId: "eval-u1", nickname: "阿强", content: "红队" },
  { userId: "eval-u2", nickname: "小鱼", content: "蓝队" },
  { userId: "eval-u3", nickname: "柠檬", content: "红队" },
  { userId: "eval-u4", nickname: "球王", content: "蓝队" }
];

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
          reject(new Error(`Invalid JSON from Chrome: ${data.slice(0, 240)}`));
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

async function main() {
  fs.rmSync(screenDir, { recursive: true, force: true });
  fs.mkdirSync(screenDir, { recursive: true });
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

  try {
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

    async function screenshot(name) {
      await sleep(180);
      const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const output = path.join(screenDir, name);
      fs.writeFileSync(output, Buffer.from(result.data, "base64"));
      console.log(output);
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send("Page.navigate", { url: `http://localhost:5173/?evaluationVideo=${Date.now()}` });
    await sleep(2200);
    await screenshot("01-config.png");

    const match = await api("/api/matches", {
      durationSeconds: 300,
      redTeamName: "红队",
      blueTeamName: "蓝队",
      redKeyword: "红队",
      blueKeyword: "蓝队"
    });
    await sleep(900);
    await screenshot("02-created.png");

    await api(`/api/matches/${match.id}/start`);
    await sleep(900);
    await screenshot("03-started.png");

    for (const viewer of viewers) {
      await api("/api/simulate/comment", {
        matchId: match.id,
        userId: viewer.userId,
        nickname: viewer.nickname,
        content: viewer.content
      });
      await sleep(260);
    }
    await sleep(700);
    await screenshot("04-joined.png");

    await api("/api/simulate/like", { matchId: match.id, userId: "eval-u1", randomValue: 0.05 });
    await sleep(760);
    await screenshot("05-like-shot.png");
    await sleep(1000);

    await api("/api/simulate/gift", { matchId: match.id, userId: "eval-u4", giftKey: "fairy_stick" });
    await sleep(760);
    await screenshot("06-low-gift.png");
    await sleep(1200);

    await api("/api/simulate/gift", { matchId: match.id, userId: "eval-u2", giftKey: "magic_mirror" });
    await sleep(920);
    await screenshot("07-mid-gift.png");
    await sleep(2200);

    await api("/api/simulate/gift", { matchId: match.id, userId: "eval-u3", giftKey: "super_jet" });
    await sleep(1050);
    await screenshot("08-high-gift.png");
    await sleep(3600);

    await api(`/api/matches/${match.id}/finish`);
    await sleep(1200);
    await screenshot("09-settlement.png");
    socket.close();
  } finally {
    chrome.kill();
    await sleep(500);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
