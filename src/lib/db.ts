import "server-only";

type Row = Record<string, unknown>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

const g = globalThis as unknown as { __ifRunner?: Promise<Runner>; __ifMigrated?: Promise<void> };

const SCHEMA = [
  `create table if not exists hubs (
    id text primary key, token text unique not null, name text not null, loc text not null,
    place text not null default '', hours text not null default '', ask text not null default '',
    hold_days int, active boolean not null default true, created_at bigint not null)`,
  `create table if not exists items (
    id text primary key, category text not null, title text not null, details text not null default '',
    found_loc text not null, found_detail text not null default '', found_on text not null,
    holding text not null, hub_id text, left_note text not null default '', photo_url text,
    roll text, hidden_detail text not null default '', finder_name text not null default '',
    finder_email text not null default '', manage_token text not null, status text not null default 'open',
    returned_at bigint, returned_to text not null default '', thanks text not null default '',
    lost_id text, views int not null default 0, created_at bigint not null)`,
  `create table if not exists lost (
    id text primary key, category text not null, title text not null, details text not null default '',
    lost_loc text not null, lost_detail text not null default '', lost_on text not null,
    name text not null default '', email text not null default '', manage_token text not null,
    status text not null default 'open', item_id text, closed_at bigint, created_at bigint not null)`,
  `create table if not exists claims (
    id text primary key, item_id text not null, name text not null, email text not null,
    proof text not null default '', created_at bigint not null)`,
  `create table if not exists feedback (
    id text primary key, helped boolean not null, note text not null default '',
    ctx text not null default '', created_at bigint not null)`,
  `create table if not exists mail_log (
    id text primary key, to_addr text not null, kind text not null, ok boolean not null, created_at bigint not null)`,
  `create table if not exists sessions (
    id text primary key, visitor text not null, started_at bigint not null, last_at bigint not null,
    pages int not null default 0, entry text not null default '', device text not null default '',
    saw_item boolean not null default false, posted boolean not null default false)`,
  `create table if not exists pageviews (day text not null, path text not null, n int not null default 0, primary key (day, path))`,
  `alter table feedback add column if not exists rating int`,
  `alter table feedback add column if not exists goal text not null default ''`,
  `alter table feedback add column if not exists contact text not null default ''`,
  `alter table items add column if not exists thumb_url text`,
  `create index if not exists sessions_started on sessions (started_at desc)`,
  `create index if not exists items_created on items (created_at desc)`,
  `create index if not exists lost_created on lost (created_at desc)`,
];

function clean(rows: Row[]): Row[] {
  for (const r of rows) for (const k in r) if (typeof r[k] === "bigint") r[k] = Number(r[k]);
  return rows;
}

async function make(): Promise<Runner> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return async (text, params = []) => clean((await sql.query(text, params)) as Row[]);
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(process.env.PGLITE_DIR || undefined);
  return async (text, params = []) => clean((await db.query(text, params)).rows as Row[]);
}

async function migrate(run: Runner) {
  for (const s of SCHEMA) await run(s);
}

export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!g.__ifRunner) g.__ifRunner = make().catch((e) => { g.__ifRunner = undefined; throw e; });
  const run = await g.__ifRunner;
  let rows: Row[];
  try {
    rows = await run(text, params);
  } catch (e) {
    if (!/does not exist/i.test(String((e as Error)?.message ?? e))) throw e;
    if (!g.__ifMigrated) g.__ifMigrated = migrate(run).catch((err) => { g.__ifMigrated = undefined; throw err; });
    await g.__ifMigrated;
    rows = await run(text, params);
  }
  for (const r of rows) for (const k of ["created_at", "returned_at", "closed_at", "started_at", "last_at"]) if (typeof r[k] === "string") r[k] = Number(r[k]);
  return rows as T[];
}
