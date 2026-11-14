import Link from "next/link";
import { q } from "@/lib/db";
import { LOCATIONS, LOC_GROUPS, locLabel } from "@/lib/data";
import { listHubs, visitorStats } from "@/lib/repo";
import { adminConfigured, isAdmin, siteUrl } from "@/lib/server";
import { mailConfigured } from "@/lib/mail";
import { ago } from "@/lib/util";
import type { Hub, Item, Lost } from "@/lib/types";
import { CopyButton } from "@/components/client";
import { adminCloseLost, resetPilotData, saveHub, setItemHidden, toggleHub } from "@/app/actions";
import { ActionForm, AdminLogin } from "@/components/chrome";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

function HubFields({ h }: { h?: Hub }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {h && <input type="hidden" name="id" value={h.id} />}
      <input name="name" defaultValue={h?.name} required className="field" placeholder="Desk name, like DoMS Office" maxLength={60} />
      <select name="loc" defaultValue={h?.loc ?? ""} required className="field" aria-label="Building">
        <option value="" disabled>Building it serves</option>
        {LOC_GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {LOCATIONS.filter((l) => l.group === g).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </optgroup>
        ))}
      </select>
      <input name="place" defaultValue={h?.place} className="field" placeholder="Where exactly, like Ground floor, next to the lift" maxLength={160} />
      <input name="hours" defaultValue={h?.hours} className="field" placeholder="Hours, like 9 am to 5:30 pm, Mon to Fri" maxLength={80} />
      <input name="ask" defaultValue={h?.ask} className="field" placeholder="Who to ask, like Ask at the front desk" maxLength={100} />
      <input name="hold_days" defaultValue={h?.hold_days ?? ""} type="number" min={1} max={365} className="field" placeholder="Days items are kept (optional)" />
    </div>
  );
}

function dur(ms: number | null) {
  if (!ms || ms < 1000) return "Under 1 sec";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} sec` : `${Math.floor(s / 60)} min ${s % 60} sec`;
}

const PAGE_NAMES: Record<string, string> = {
  "/": "Home", "/item/[id]": "A found item", "/lost/[id]": "A lost report", "/found/new": "Post found form", "/lost/new": "Post lost form",
  "/desks": "Desks list", "/desk": "Desk dashboard", "/impact": "Impact", "/feedback": "Feedback page", "/go": "QR landing", "/poster": "Poster maker",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ wrong?: string; reset?: string }> }) {
  const sp = await searchParams;
  if (!adminConfigured()) {
    return <main className="mx-auto max-w-xl px-4 py-10"><h1 className="text-2xl font-extrabold">Admin is not set up</h1><p className="mt-2 text-muted">Add an environment variable named ADMIN_KEY in Vercel, then redeploy.</p></main>;
  }
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-sm px-4 py-10">
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <AdminLogin />
      </main>
    );
  }
  const [hubs, items, feedback, mails, lost, vs] = await Promise.all([
    listHubs(true),
    q<Item>("select * from items order by created_at desc limit 60"),
    q<{ id: string; helped: boolean; note: string; ctx: string; created_at: number; rating: number | null; goal: string; contact: string }>("select * from feedback order by created_at desc limit 100"),
    q<{ n: number; ok: number }>("select count(*)::int as n, count(*) filter (where ok)::int as ok from mail_log"),
    q<Lost>("select * from lost where status = 'open' order by created_at desc limit 60"),
    visitorStats(),
  ]);
  const maxDay = Math.max(1, ...vs.days.map((d) => d.visitors));
  const maxPage = Math.max(1, ...vs.top.map((p) => p.n));
  const rated = feedback.filter((f) => f.rating);
  const avgRating = rated.length ? rated.reduce((a, f) => a + (f.rating ?? 0), 0) / rated.length : null;
  const tiles: [string, string, string][] = [
    ["Visitors", String(vs.visitors), `${vs.today} today, ${vs.week} in the last 7 days`],
    ["Visits", String(vs.sessions), `${vs.returning} ${vs.returning === 1 ? "person" : "people"} came back after a break`],
    ["Time per visit", dur(vs.avg_ms), vs.med_ms && vs.med_ms >= 1000 ? `Average. Half of visits last under ${dur(vs.med_ms)}` : "Average. Most visits so far were very short"],
    ["Pages per visit", vs.sessions ? (vs.pageviews / vs.sessions).toFixed(1) : "0", `${vs.pageviews} page views in total`],
  ];
  const base = siteUrl();
  const pill = (ok: boolean, yes: string, no: string) => <span className={`rounded-full px-3 py-1 text-sm font-bold ${ok ? "bg-leaf-soft text-leaf" : "bg-coral-soft text-coral"}`}>{ok ? yes : no}</span>;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <h1 className="text-3xl font-extrabold">Admin</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {pill(!!(process.env.DATABASE_URL || process.env.POSTGRES_URL), "Database connected", "Database: local test mode")}
        {pill(!!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID), "Photo storage connected", "Photo storage not connected")}
        {pill(mailConfigured(), `Email on, ${mails[0]?.ok ?? 0} of ${mails[0]?.n ?? 0} sent`, "Email off: add GMAIL_USER and GMAIL_APP_PASSWORD")}
      </div>

      {sp.reset === "done" && <p className="mt-4 rounded-xl bg-leaf-soft px-4 py-3 font-semibold text-leaf">Test data cleared. Desks were kept.</p>}
      {sp.reset === "typo" && <p className="mt-4 rounded-xl bg-coral-soft px-4 py-3 font-semibold text-coral">Nothing was deleted. Type CLEAR to confirm.</p>}

      <h2 className="mt-8 text-xl font-bold">Who is using it</h2>
      <p className="text-sm text-muted">
        A visitor is one browser on one device. A visit ends after 30 minutes with nothing opened, so coming back later counts as a new visit.
        Bots and link previews are ignored, and so are visits from any browser signed in to admin.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2.5">
        {tiles.map(([k, v, sub]) => (
          <div key={k} className="rounded-2xl bg-paper p-4">
            <dt className="text-sm font-semibold text-muted">{k}</dt>
            <dd className="display mt-0.5 text-[26px] font-extrabold leading-tight text-banyan">{v}</dd>
            <dd className="mt-1 text-[13px] leading-snug text-muted">{sub}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <section className="rounded-2xl bg-paper p-4">
          <h3 className="font-bold">What visitors did</h3>
          <ul className="mt-2 space-y-2 text-[15px]">
            {([["Opened InstiFound", vs.visitors], ["Opened a found item", vs.funnel.saw], ["Posted a found item or lost report", vs.funnel.posted]] as [string, number][]).map(([k, n]) => (
              <li key={k}>
                <div className="flex justify-between gap-3"><span>{k}</span><b>{n}{vs.visitors ? ` (${Math.round((n / vs.visitors) * 100)}%)` : ""}</b></div>
                <div className="mt-1 h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-banyan" style={{ width: `${vs.visitors ? (n / vs.visitors) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[15px] text-muted">{vs.devices.length ? vs.devices.map((d) => `${d.n} on a ${d.device}`).join(", ") : "No visits yet"}</p>
        </section>
        <section className="rounded-2xl bg-paper p-4">
          <h3 className="font-bold">Visitors by day</h3>
          {vs.days.length === 0 && <p className="mt-2 text-[15px] text-muted">No visits yet.</p>}
          <ul className="mt-2 space-y-1.5 text-[15px]">
            {vs.days.map((d) => (
              <li key={d.day} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-muted">{d.day.slice(8)}/{d.day.slice(5, 7)}</span>
                <span className="h-4 rounded bg-marigold" style={{ width: `${(d.visitors / maxDay) * 65}%`, minWidth: 4 }} />
                <b>{d.visitors}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="mt-2.5 rounded-2xl bg-paper p-4">
        <h3 className="font-bold">Most opened pages</h3>
        {vs.top.length === 0 && <p className="mt-2 text-[15px] text-muted">No page views yet.</p>}
        <ul className="mt-2 space-y-1.5 text-[15px]">
          {vs.top.map((p) => (
            <li key={p.path} className="flex items-center gap-2">
              <span className="w-36 shrink-0 truncate">{PAGE_NAMES[p.path] ?? p.path}</span>
              <span className="h-4 rounded bg-banyan" style={{ width: `${(p.n / maxPage) * 50}%`, minWidth: 4 }} />
              <b>{p.n}</b>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="mt-10 text-xl font-bold">Desks</h2>
      <p className="text-sm text-muted">Each desk has a private link. Send it to the staff there and ask them to open it once on the desk phone.</p>
      <ul className="mt-3 space-y-3">
        {hubs.map((h) => (
          <li key={h.id} className={`rounded-2xl bg-paper p-4 ${h.active ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-words font-bold">{h.name} <span className="font-normal text-muted">({locLabel(h.loc)})</span></p>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={`${base}/h/${h.token}`} label="Copy private link" />
                <Link href={`/poster?hub=${h.id}`} className="btn btn-ghost">Poster</Link>
              </div>
            </div>
            <p className="mt-2 break-all rounded-lg bg-mist px-3 py-2 font-mono text-[13px]" data-desk-link>{base}/h/{h.token}</p>
            <details className="mt-2">
              <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-banyan">Edit details</summary>
              <ActionForm action={saveHub} okUrl="/admin" className="mt-3 [&>div]:space-y-2"><HubFields h={h} /><button className="btn btn-primary">Save</button></ActionForm>
              <ActionForm action={toggleHub} className="mt-2"><input type="hidden" name="id" value={h.id} /><button className="min-h-11 text-[15px] text-muted underline">{h.active ? "Remove from the public list" : "Put back on the public list"}</button></ActionForm>
            </details>
          </li>
        ))}
      </ul>
      <ActionForm action={saveHub} okUrl="/admin" className="mt-4 rounded-2xl border-2 border-dashed border-line p-4 [&>div]:space-y-2">
        <p className="font-bold">Add a desk</p>
        <HubFields />
        <button className="btn btn-primary">Add desk</button>
      </ActionForm>

      <h2 className="mt-10 text-xl font-bold">Recent found posts</h2>
      <ul className="mt-2 divide-y divide-line rounded-2xl bg-paper px-4">
        {items.map((i) => (
          <li key={i.id} className="flex min-h-12 items-center justify-between gap-3 py-1.5 text-[15px]">
            <Link href={`/item/${i.id}`} className="min-w-0 flex-1 truncate py-3"><b>{i.title}</b> <span className="text-muted">{i.status}, {ago(i.created_at)}</span></Link>
            {i.status !== "returned" && (
              <ActionForm action={setItemHidden}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="hide" value={i.status === "hidden" ? "0" : "1"} /><button className="min-h-11 px-2 text-[15px] font-semibold text-coral underline">{i.status === "hidden" ? "Unhide" : "Hide"}</button></ActionForm>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-muted">None yet.</li>}
      </ul>

      <h2 className="mt-10 text-xl font-bold">Open lost reports</h2>
      <ul className="mt-2 divide-y divide-line rounded-2xl bg-paper px-4">
        {lost.map((l) => (
          <li key={l.id} className="flex min-h-12 items-center justify-between gap-3 py-1.5 text-[15px]">
            <Link href={`/lost/${l.id}`} className="min-w-0 flex-1 truncate py-3"><b>{l.title}</b> <span className="text-muted">{ago(l.created_at)}</span></Link>
            <ActionForm action={adminCloseLost}><input type="hidden" name="id" value={l.id} /><button className="min-h-11 px-2 text-[15px] font-semibold text-coral underline">Close</button></ActionForm>
          </li>
        ))}
        {lost.length === 0 && <li className="py-3 text-muted">None open.</li>}
      </ul>

      <h2 className="mt-10 text-xl font-bold">Feedback {avgRating ? <span className="font-normal text-muted">{avgRating.toFixed(1)} of 5 from {rated.length}</span> : null}</h2>
      <ul className="mt-2 divide-y divide-line rounded-2xl bg-paper px-4">
        {feedback.map((f) => (
          <li key={f.id} className="flex gap-3 py-3 text-[15px]">
            <span className={`display flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold ${f.rating ? (f.rating >= 4 ? "bg-leaf-soft text-leaf" : f.rating === 3 ? "bg-marigold-soft text-banyan-deep" : "bg-coral-soft text-coral") : "bg-mist text-muted"}`}>{f.rating ?? (f.helped ? "+" : "-")}</span>
            <div className="min-w-0">
              <p className="break-words">{f.note || <span className="text-muted">No note</span>}</p>
              <p className="mt-0.5 break-words text-[13px] text-muted">{[f.goal, f.contact && `Contact: ${f.contact}`, f.ctx, ago(f.created_at)].filter(Boolean).join(", ")}</p>
            </div>
          </li>
        ))}
        {feedback.length === 0 && <li className="py-3 text-muted">None yet.</li>}
      </ul>

      <h2 className="mt-10 text-xl font-bold">Clear test data</h2>
      <ActionForm action={resetPilotData} okUrl="/admin?reset=done" failUrl="/admin?reset=typo" className="mt-2 rounded-2xl border-2 border-coral/40 bg-paper p-4">
        <p className="text-[15px]">Deletes every found post, lost report, claim, photo, feedback note and visitor stat. Desks and their private links are kept. This can&rsquo;t be undone.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input name="confirm" className="field max-w-[12rem]" placeholder="Type CLEAR" autoComplete="off" autoCapitalize="characters" />
          <button className="btn bg-coral text-white">Clear everything</button>
        </div>
      </ActionForm>
    </main>
  );
}
