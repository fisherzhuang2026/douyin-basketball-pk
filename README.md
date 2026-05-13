# Dou-BA 斗篮机

直播互动篮球投篮机双队 PK Demo。观众加入红队或蓝队后，通过点赞和官方弹幕小玩法礼物触发投篮，系统实时计分并在结算页展示 MVP 与贡献榜。

## 功能概览

- 观众选择红队或蓝队，入队后不可换队。
- 点赞固定 30% 命中率，命中 +1 分。
- 低价礼物命中 +1 分，中价礼物命中 +2 分，高价礼物命中 +3 分。
- 主播可设置对局时长、队伍名称、队伍口令。
- Phaser 街机球馆舞台，包含开场倒计时、礼物技能特效、实时榜单、赛后颁奖台。
- PostgreSQL 持久化，Fastify API，Vue 3 前端。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev:server
npm run dev -- --host 0.0.0.0
```

前端默认地址：`http://localhost:5173`

服务健康检查：`http://localhost:3001/api/health`

## 环境变量

复制 `.env.example` 为 `.env` 后配置：

```env
DATABASE_URL=postgres://postgres:CHANGE_ME@192.168.0.101:35432/douyin_basketball_pk
PORT=3001
```

`.env` 不应提交到 Git。

## 常用命令

```bash
npm test
npm run build
npm run dev:server
npm run dev -- --host 0.0.0.0
```

## 提案素材

提案设计规格和实施计划位于：

- `docs/superpowers/specs/2026-05-13-arcade-arena-redesign-design.md`
- `docs/superpowers/plans/2026-05-13-arcade-arena-redesign.md`
