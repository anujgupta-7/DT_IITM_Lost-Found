import { q } from "@/lib/db";

const ok = (s: string) => /^[a-z0-9]{6,12}$/.test(s);

export async function GET(req: Request) {
  const u = new URL(req.url);
  const f = (u.searchParams.get("f") ?? "").split(",").filter(ok).slice(0, 20);
  const l = (u.searchParams.get("l") ?? "").split(",").filter(ok).slice(0, 20);
  const [items, lost] = await Promise.all([
    f.length ? q<{ id: string }>("select id from items where id = any($1) and status <> 'hidden'", [f]) : [],
    l.length ? q<{ id: string }>("select id from lost where id = any($1)", [l]) : [],
  ]);
  return Response.json({ f: items.map((r) => r.id), l: lost.map((r) => r.id) }, { headers: { "cache-control": "no-store" } });
}
