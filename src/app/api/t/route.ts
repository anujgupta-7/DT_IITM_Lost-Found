import { cookies } from "next/headers";
import { q } from "@/lib/db";
import { todayIST } from "@/lib/util";

const ID = /^[a-z0-9]{10,24}$/;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|screenshot|vercel|facebookexternalhit|whatsapp|telegram|curl|wget|python|node-fetch|axios|puppeteer|playwright|phantom/i;

function norm(p: string) {
  const path = p.split("?")[0].slice(0, 60);
  if (/^\/item\//.test(path)) return "/item/[id]";
  if (/^\/lost\/(?!new)/.test(path)) return "/lost/[id]";
  if (/^\/h\//.test(path)) return "/desk";
  return path || "/";
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const s = String(b.s ?? ""), raw = String(b.p ?? "/");
    const ua = req.headers.get("user-agent") ?? "";
    const jar = await cookies();
    const saved = jar.get("if_vid")?.value ?? "";
    const v = ID.test(saved) ? saved : String(b.v ?? "");
    if (!ID.test(v) || !ID.test(s) || !raw.startsWith("/")) return new Response(null, { status: 204 });
    if (process.env.TRACK_AUTOMATION !== "1" && (!ua || BOT.test(ua) || b.wd)) return new Response(null, { status: 204 });
    if (process.env.TRACK_AUTOMATION === "1" && /TestBot/.test(ua)) return new Response(null, { status: 204 });
    if (jar.get("if_admin") || raw.startsWith("/admin")) return new Response(null, { status: 204 });
    if (saved !== v) jar.set("if_vid", v, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 400, path: "/" });
    const page = b.n ? 1 : 0;
    const path = norm(raw);
    const now = Date.now();
    const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "phone" : "computer";
    const sawItem = path === "/item/[id]";
    const posted = b.a === "post";
    await Promise.all([
      q(
        `insert into sessions (id, visitor, started_at, last_at, pages, entry, device, saw_item, posted)
         values ($1,$2,$3,$3,$4,$5,$6,$7,$8)
         on conflict (id) do update set last_at = greatest(sessions.last_at, excluded.last_at), pages = sessions.pages + $4,
           saw_item = sessions.saw_item or $7, posted = sessions.posted or $8`,
        [s, v, now, page, path, device, sawItem, posted],
      ),
      page ? q(
        "insert into pageviews (day, path, n) values ($1,$2,1) on conflict (day, path) do update set n = pageviews.n + 1",
        [todayIST(), path],
      ) : null,
    ]);
  } catch (e) {
    console.error("track failed", e);
  }
  return new Response(null, { status: 204 });
}
