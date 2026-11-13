import "server-only";
import { q } from "./db";
import { LOCATIONS } from "./data";
import { matchScore, normRoll, searchHints } from "./util";
import type { Claim, Hub, Item, Lost } from "./types";

const ITEM_SEL = `select i.*, h.name as hub_name, h.place as hub_place, h.hours as hub_hours, h.ask as hub_ask, h.hold_days as hub_hold_days
  from items i left join hubs h on h.id = i.hub_id`;

export async function listItems(f: { q?: string; cat?: string; group?: string; hub?: string }) {
  const where: string[] = ["(i.status = 'open' or (i.status = 'returned' and i.returned_at > $1))"];
  const p: unknown[] = [Date.now() - 14 * 864e5];
  if (f.cat) { p.push(f.cat); where.push(`i.category = $${p.length}`); }
  if (f.hub) { p.push(f.hub); where.push(`i.hub_id = $${p.length}`); }
  if (f.group) {
    p.push(LOCATIONS.filter((l) => l.group === f.group).map((l) => l.id));
    where.push(`i.found_loc = any($${p.length})`);
  }
  const term = (f.q ?? "").trim().slice(0, 60);
  if (term) {
    const { locs, cats } = searchHints(term);
    const roll = normRoll(term);
    const ors: string[] = [];
    for (const w of term.split(/\s+/).filter((w) => w.length >= 2).slice(0, 5)) {
      p.push("%" + w.replace(/[%_]/g, "") + "%");
      ors.push(`(i.title ilike $${p.length} or i.details ilike $${p.length} or i.found_detail ilike $${p.length})`);
    }
    if (locs.length) { p.push(locs); ors.push(`i.found_loc = any($${p.length})`); }
    if (cats.length) { p.push(cats); ors.push(`i.category = any($${p.length})`); }
    if (roll) { p.push(roll); ors.push(`i.roll = $${p.length}`); }
    where.push(ors.length ? `(${ors.join(" or ")})` : "false");
  }
  return q<Item>(`${ITEM_SEL} where ${where.join(" and ")} order by (i.status = 'open') desc, i.created_at desc limit 120`, p);
}

export async function getItem(id: string) {
  return (await q<Item>(`${ITEM_SEL} where i.id = $1`, [id]))[0] ?? null;
}

export async function listLost(f: { q?: string; cat?: string }) {
  const where = ["status = 'open'"];
  const p: unknown[] = [];
  if (f.cat) { p.push(f.cat); where.push(`category = $${p.length}`); }
  const term = (f.q ?? "").trim().slice(0, 60);
  if (term) {
    const { locs, cats } = searchHints(term);
    const ors: string[] = [];
    for (const w of term.split(/\s+/).filter((w) => w.length >= 2).slice(0, 5)) {
      p.push("%" + w.replace(/[%_]/g, "") + "%");
      ors.push(`(title ilike $${p.length} or details ilike $${p.length} or lost_detail ilike $${p.length})`);
    }
    if (locs.length) { p.push(locs); ors.push(`lost_loc = any($${p.length})`); }
    if (cats.length) { p.push(cats); ors.push(`category = any($${p.length})`); }
    where.push(ors.length ? `(${ors.join(" or ")})` : "false");
  }
  return q<Lost>(`select * from lost where ${where.join(" and ")} order by created_at desc limit 120`, p);
}

export async function getLost(id: string) {
  return (await q<Lost>("select * from lost where id = $1", [id]))[0] ?? null;
}

export const listHubs = (all = false) =>
  q<Hub>(`select * from hubs ${all ? "" : "where active"} order by name`);

export async function getHub(id: string | null) {
  if (!id) return null;
  return (await q<Hub>("select * from hubs where id = $1", [id]))[0] ?? null;
}

export const listClaims = (itemId: string) =>
  q<Claim>("select * from claims where item_id = $1 order by created_at desc", [itemId]);

export async function itemsMatchingLost(l: Lost) {
  const rows = await q<Item>(
    `${ITEM_SEL} where i.status = 'open' and i.category = $1 and i.found_on >= $2 order by i.created_at desc limit 60`,
    [l.category, shiftDay(l.lost_on, -1)],
  );
  return rows
    .map((i) => ({ i, s: matchScore({ loc: l.lost_loc, text: `${l.title} ${l.details}` }, { loc: i.found_loc, text: `${i.title} ${i.details}` }) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map((x) => x.i);
}

export async function lostMatchingItem(i: Item) {
  const rows = await q<Lost>(
    "select * from lost where status = 'open' and category = $1 and lost_on <= $2 and created_at > $3 order by created_at desc limit 60",
    [i.category, shiftDay(i.found_on, 1), Date.now() - 45 * 864e5],
  );
  return rows
    .map((l) => ({ l, s: matchScore({ loc: l.lost_loc, text: `${l.title} ${l.details}` }, { loc: i.found_loc, text: `${i.title} ${i.details}` }) }))
    .filter((x) => x.s >= 1)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => x.l);
}

function shiftDay(d: string, n: number) {
  const t = Date.parse(d);
  return isNaN(t) ? d : new Date(t + n * 864e5).toISOString().slice(0, 10);
}

export async function stats() {
  const [a] = await q<{ logged: number; returned: number; open: number }>(
    `select count(*) filter (where status <> 'hidden')::int as logged,
            count(*) filter (where status = 'returned')::int as returned,
            count(*) filter (where status = 'open')::int as open from items`,
  );
  const times = await q<{ created_at: number; returned_at: number }>(
    "select created_at, returned_at from items where status = 'returned' and returned_at is not null",
  );
  const hrs = times.map((t) => (t.returned_at - t.created_at) / 36e5).sort((x, y) => x - y);
  const median = hrs.length ? hrs[Math.floor((hrs.length - 1) / 2)] : null;
  const [l] = await q<{ total: number; closed: number }>(
    "select count(*)::int as total, count(*) filter (where status = 'closed')::int as closed from lost",
  );
  const [h] = await q<{ n: number }>("select count(*)::int as n from hubs where active");
  const [f] = await q<{ total: number; yes: number }>(
    "select count(*)::int as total, count(*) filter (where helped)::int as yes from feedback",
  );
  const byCat = await q<{ category: string; n: number }>(
    "select category, count(*)::int as n from items where status <> 'hidden' group by category order by n desc",
  );
  const [v] = await q<{ n: number }>("select coalesce(sum(views),0)::int as n from items");
  return { ...a, median, lost: l, hubs: h.n, feedback: f, byCat, views: v.n };
}
