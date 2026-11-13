import Link from "next/link";
import { q } from "@/lib/db";
import { LOCATIONS, LOC_GROUPS, locLabel } from "@/lib/data";
import { listHubs } from "@/lib/repo";
import { adminConfigured, isAdmin, siteUrl } from "@/lib/server";
import { mailConfigured } from "@/lib/mail";
import { ago } from "@/lib/util";
import type { Hub, Item, Lost } from "@/lib/types";
import { CopyButton } from "@/components/client";
import { adminCloseLost, adminLogin, saveHub, setItemHidden, toggleHub } from "@/app/actions";

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

export default async function Page({ searchParams }: { searchParams: Promise<{ wrong?: string }> }) {
  const sp = await searchParams;
  if (!adminConfigured()) {
    return <main className="mx-auto max-w-xl px-4 py-10"><h1 className="text-2xl font-extrabold">Admin is not set up</h1><p className="mt-2 text-muted">Add an environment variable named ADMIN_KEY in Vercel, then redeploy.</p></main>;
  }
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-sm px-4 py-10">
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <form action={adminLogin} className="mt-4 space-y-2">
          <input name="key" type="password" className="field" placeholder="Admin key" autoFocus />
          {sp.wrong && <p className="font-semibold text-coral">That key is not right.</p>}
          <button className="btn btn-primary w-full">Open admin</button>
        </form>
      </main>
    );
  }
  const [hubs, items, feedback, mails, lost] = await Promise.all([
    listHubs(true),
    q<Item>("select * from items order by created_at desc limit 60"),
    q<{ id: string; helped: boolean; note: string; ctx: string; created_at: number }>("select * from feedback order by created_at desc limit 60"),
    q<{ n: number; ok: number }>("select count(*)::int as n, count(*) filter (where ok)::int as ok from mail_log"),
    q<Lost>("select * from lost where status = 'open' order by created_at desc limit 60"),
  ]);
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

      <h2 className="mt-8 text-xl font-bold">Desks</h2>
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
              <form action={saveHub} className="mt-3 space-y-2"><HubFields h={h} /><button className="btn btn-primary">Save</button></form>
              <form action={toggleHub} className="mt-2"><input type="hidden" name="id" value={h.id} /><button className="min-h-11 text-[15px] text-muted underline">{h.active ? "Remove from the public list" : "Put back on the public list"}</button></form>
            </details>
          </li>
        ))}
      </ul>
      <form action={saveHub} className="mt-4 space-y-2 rounded-2xl border-2 border-dashed border-line p-4">
        <p className="font-bold">Add a desk</p>
        <HubFields />
        <button className="btn btn-primary">Add desk</button>
      </form>

      <h2 className="mt-10 text-xl font-bold">Recent found posts</h2>
      <ul className="mt-2 divide-y divide-line rounded-2xl bg-paper px-4">
        {items.map((i) => (
          <li key={i.id} className="flex min-h-12 items-center justify-between gap-3 py-1.5 text-[15px]">
            <Link href={`/item/${i.id}`} className="min-w-0 flex-1 truncate py-3"><b>{i.title}</b> <span className="text-muted">{i.status}, {ago(i.created_at)}</span></Link>
            {i.status !== "returned" && (
              <form action={setItemHidden}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="hide" value={i.status === "hidden" ? "0" : "1"} /><button className="min-h-11 px-2 text-[15px] font-semibold text-coral underline">{i.status === "hidden" ? "Unhide" : "Hide"}</button></form>
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
            <form action={adminCloseLost}><input type="hidden" name="id" value={l.id} /><button className="min-h-11 px-2 text-[15px] font-semibold text-coral underline">Close</button></form>
          </li>
        ))}
        {lost.length === 0 && <li className="py-3 text-muted">None open.</li>}
      </ul>

      <h2 className="mt-10 text-xl font-bold">Feedback</h2>
      <ul className="mt-2 divide-y divide-line rounded-2xl bg-paper px-4">
        {feedback.map((f) => (
          <li key={f.id} className="py-2.5 text-[15px]"><b className={f.helped ? "text-leaf" : "text-coral"}>{f.helped ? "Yes" : "No"}</b> {f.note || <span className="text-muted">No note</span>} <span className="text-sm text-muted">({f.ctx}, {ago(f.created_at)})</span></li>
        ))}
        {feedback.length === 0 && <li className="py-3 text-muted">None yet.</li>}
      </ul>
    </main>
  );
}
