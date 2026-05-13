import "dotenv/config";
import pg from "pg";

const { Pool, Client } = pg;

export type PgPool = pg.Pool;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return url;
}

export function createPool(): PgPool {
  return new Pool({
    connectionString: getDatabaseUrl(),
    max: 10
  });
}

export async function ensureDatabase(): Promise<void> {
  const target = new URL(getDatabaseUrl());
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(databaseName)) {
    throw new Error(`Unsupported database name: ${databaseName}`);
  }

  target.pathname = "/postgres";
  const client = new Client({ connectionString: target.toString() });
  await client.connect();
  try {
    const existing = await client.query("select 1 from pg_database where datname = $1", [databaseName]);
    if (existing.rowCount === 0) {
      await client.query(`create database ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await client.end();
  }
}

export async function initializeSchema(pool: PgPool): Promise<void> {
  await pool.query(`
    create table if not exists matches (
      id text primary key,
      room_id text not null,
      status text not null check (status in ('draft', 'running', 'finished')),
      duration_seconds integer not null check (duration_seconds in (180, 300, 600, 900, 1200, 1500, 1800)),
      started_at timestamptz,
      ended_at timestamptz,
      red_team_name text not null,
      blue_team_name text not null,
      red_keyword text not null,
      blue_keyword text not null,
      like_hit_rate numeric not null,
      like_score integer not null,
      winner text check (winner in ('red', 'blue', 'draw')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists match_gift_rules (
      id text primary key,
      match_id text not null references matches(id) on delete cascade,
      gift_key text not null,
      gift_name text not null,
      score integer not null,
      animation_type text not null,
      enabled boolean not null default true,
      unique (match_id, gift_key)
    );

    create table if not exists match_members (
      id text primary key,
      match_id text not null references matches(id) on delete cascade,
      user_id text not null,
      nickname text not null,
      avatar_url text,
      team text not null check (team in ('red', 'blue')),
      joined_at timestamptz not null,
      score integer not null default 0,
      shots integer not null default 0,
      hits integer not null default 0,
      unique (match_id, user_id)
    );

    create table if not exists shot_events (
      id text primary key,
      match_id text not null references matches(id) on delete cascade,
      user_id text not null,
      nickname text not null,
      team text not null check (team in ('red', 'blue')),
      event_type text not null check (event_type in ('like', 'gift')),
      gift_key text,
      score integer not null,
      hit boolean not null,
      hit_rate_snapshot numeric,
      created_at timestamptz not null
    );

    create table if not exists match_scores (
      match_id text primary key references matches(id) on delete cascade,
      red_score integer not null default 0,
      blue_score integer not null default 0,
      updated_at timestamptz not null default now()
    );
  `);
}

export async function resetSchema(pool: PgPool): Promise<void> {
  await pool.query("truncate table shot_events, match_members, match_gift_rules, match_scores, matches cascade");
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
