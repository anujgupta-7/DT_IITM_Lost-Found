import Link from "next/link";
import { Check, Plus, Printer } from "lucide-react";
import { q } from "@/lib/db";
import { locLabel } from "@/lib/data";
import { listItems } from "@/lib/repo";
import { currentHub } from "@/lib/server";
import { ago } from "@/lib/util";
import type { Lost } from "@/lib/types";
import { CatIcon, Empty, itemTitle, LostCard } from "@/components/bits";
import { hubLogout } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your desk" };

export default async function Page() {
  const hub = await currentHub();
  if (!hub) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <Empty title="This page is for desks that keep found items">
          <p>Open the private desk link you were given, on this phone, and it will remember you.</p>
          <Link href="/" className="btn btn-primary mt-4">Go to the home page</Link>
        </Empty>
      </main>
    );
  }
  const all = await listItems({ hub: hub.id });
  const open = all.filter((i) => i.status === "open");
  const done = all.filter((i) => i.status === "returned");
  const looking = await q<Lost>("select * from lost where status = 'open' and lost_loc = $1 order by created_at desc limit 12", [hub.loc]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">
      <p className="text-sm font-semibold text-muted">{locLabel(hub.loc)}</p>
      <h1 className="text-3xl font-extrabold">{hub.name}</h1>
      <Link href="/found/new" className="btn btn-gold mt-4 w-full !py-5 text-xl"><Plus className="h-6 w-6" /> Log a found item</Link>

      <h2 className="mt-7 text-xl font-bold">With you now <span className="text-muted">{open.length}</span></h2>
      {open.length === 0 && <p className="mt-1 text-muted">Nothing listed. When someone hands in an item, log it with the yellow button.</p>}
      <ul className="mt-2 space-y-2">
        {open.map((i) => (
          <li key={i.id}>
            <Link href={`/item/${i.id}`} className="flex items-center gap-3 rounded-2xl bg-paper p-2.5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist">
                {i.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.photo_url} alt="" className="h-full w-full object-cover" />
                ) : <CatIcon id={i.category} className="h-7 w-7 text-banyan/60" />}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate">{itemTitle(i)}</b>
                <span className="text-sm text-muted">Logged {ago(i.created_at)}</span>
              </span>
              <span className="btn btn-primary shrink-0 !px-3 !py-2 text-sm"><Check className="h-4 w-4" /> Hand over</span>
            </Link>
          </li>
        ))}
      </ul>

      {looking.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-bold">People are looking for these near {locLabel(hub.loc)}</h2>
          <p className="mt-1 text-muted">If one of these is in your cupboard, tap it and post it as found.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{looking.map((l) => <LostCard key={l.id} l={l} />)}</div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-bold">Returned recently <span className="text-muted">{done.length}</span></h2>
          <ul className="mt-2 divide-y divide-line rounded-2xl bg-paper px-4">
            {done.map((i) => (
              <li key={i.id}><Link href={`/item/${i.id}`} className="flex justify-between gap-3 py-3 text-[15px]"><span className="truncate font-semibold">{itemTitle(i)}</span><span className="shrink-0 text-leaf">{ago(i.returned_at ?? i.created_at)}</span></Link></li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/poster?hub=${hub.id}`} className="btn btn-ghost !py-2"><Printer className="h-4 w-4" /> Print the desk poster</Link>
        <form action={hubLogout}><button className="text-muted underline">Sign this phone out of the desk</button></form>
      </div>
    </main>
  );
}
