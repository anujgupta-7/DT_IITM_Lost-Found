import "server-only";

type Row = Record<string, unknown>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

const g = globalThis as unknown as { __ifRunner?: Promise<Runner> };

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
  `create index if not exists items_created on items (created_at desc)`,
  `create index if not exists lost_created on lost (created_at desc)`,
];

function clean(rows: Row[]): Row[] {
  for (const r of rows) for (const k in r) if (typeof r[k] === "bigint") r[k] = Number(r[k]);
  return rows;
}

async function make(): Promise<Runner> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let run: Runner;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    run = async (text, params = []) => clean((await sql.query(text, params)) as Row[]);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite(process.env.PGLITE_DIR || undefined);
    run = async (text, params = []) => clean((await db.query(text, params)).rows as Row[]);
  }
  for (const s of SCHEMA) await run(s);
  return run;
}

export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!g.__ifRunner) g.__ifRunner = make().catch((e) => { g.__ifRunner = undefined; throw e; });
  const run = await g.__ifRunner;
  const rows = await run(text, params);
  for (const r of rows) for (const k of ["created_at", "returned_at", "closed_at"]) if (typeof r[k] === "string") r[k] = Number(r[k]);
  return rows as T[];
}
