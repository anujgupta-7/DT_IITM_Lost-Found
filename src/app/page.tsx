import Link from "next/link";
import { Suspense } from "react";
import { Building2, Plus, SearchX } from "lucide-react";
import { CATEGORIES, LOC_GROUPS } from "@/lib/data";
import { getHub, listItems, listLost } from "@/lib/repo";
import { currentHub } from "@/lib/server";
import { CatIcon, Empty, ItemCard, LostCard } from "@/components/bits";
import { MyPosts, SearchBar } from "@/components/client";

export const dynamic = "force-dynamic";

type SP = { tab?: string; q?: string; cat?: string; area?: string; hub?: string };

function href(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab === "lost" ? "lost" : "found";
  const [items, lost, desk, filterHub] = await Promise.all([
    listItems({ q: sp.q, cat: sp.cat, group: sp.area, hub: sp.hub }),
    listLost({ q: sp.q, cat: sp.cat }),
    currentHub(),
    getHub(sp.hub ?? null),
  ]);
  const filtered = !!(sp.q || sp.cat || sp.area || sp.hub);

  return (
    <>
      <section className="bg-banyan pb-5 pt-1 text-white sm:pb-7 sm:pt-3">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="max-w-xl text-[25px] font-extrabold leading-[1.1] sm:text-[44px] sm:leading-[1.08]">
            Someone on campus is probably keeping it safe.
          </h1>
          <p className="mt-1.5 max-w-lg text-[15px] leading-snug text-white/80 sm:mt-2 sm:text-lg">
            Search what&rsquo;s been found at IIT Madras and see exactly where to collect it.
          </p>
          <div className="mt-4 max-w-2xl sm:mt-5">
            <Suspense>
              <SearchBar placeholder="Bottle, hostel, roll no." />
            </Suspense>
          </div>
          <div className="mt-4 hidden max-w-2xl grid-cols-2 gap-3 sm:grid">
            <Link href="/found/new" className="btn btn-gold"><Plus className="h-5 w-5" /> I found something</Link>
            <Link href="/lost/new" className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20">I lost something</Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 pb-36 pt-4 sm:pb-16 sm:pt-5">
        {desk && (
          <Link href="/desk" className="mb-5 flex items-center gap-3 rounded-2xl bg-marigold px-4 py-3 font-bold text-banyan-deep">
            <Building2 className="h-5 w-5 shrink-0" />
            <span className="flex-1">You&rsquo;re signed in as {desk.name}. Open your desk.</span>
          </Link>
        )}
        <MyPosts />

        <div className="flex items-center gap-2" role="tablist">
          <Link role="tab" aria-selected={tab === "found"} href={href(sp, { tab: undefined })}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-bold ${tab === "found" ? "bg-banyan text-white" : "bg-paper text-ink"}`}>
            Found <span className="opacity-70">{items.filter((i) => i.status === "open").length}</span>
          </Link>
          <Link role="tab" aria-selected={tab === "lost"} href={href(sp, { tab: "lost", area: undefined, hub: undefined })}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-bold ${tab === "lost" ? "bg-coral text-white" : "bg-paper text-ink"}`}>
            <span className="sm:hidden">Looking for</span><span className="hidden sm:inline">People are looking for</span> <span className="opacity-70">{lost.length}</span>
          </Link>
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {CATEGORIES.slice(0, -1).map((c) => {
            const on = sp.cat === c.id;
            return (
              <Link key={c.id} href={href(sp, { cat: on ? undefined : c.id })}
                className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-sm font-semibold ${on ? "border-banyan bg-leaf-soft text-banyan-deep" : "border-line bg-paper text-ink"}`}>
                <CatIcon id={c.id} className="h-4 w-4" /> {c.label}
              </Link>
            );
          })}
        </div>

        {tab === "found" && (
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 text-sm">
            {LOC_GROUPS.slice(0, 4).map((g) => {
              const on = sp.area === g;
              return (
                <Link key={g} href={href(sp, { area: on ? undefined : g })}
                  className={`flex min-h-10 shrink-0 items-center rounded-full px-3 font-semibold ${on ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                  {g}
                </Link>
              );
            })}
            {filterHub && (
              <Link href={href(sp, { hub: undefined })} className="flex min-h-10 shrink-0 items-center rounded-full bg-ink px-3 font-semibold text-white">
                Kept at {filterHub.name} ×
              </Link>
            )}
          </div>
        )}

        <div className="mt-4">
          {tab === "found" ? (
            items.length ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {items.map((i) => <ItemCard key={i.id} i={i} />)}
              </div>
            ) : filtered ? (
              <Empty title="Nothing matching yet">
                <p>It may not have been handed in yet. Leave a lost report and we&rsquo;ll email you when it turns up.</p>
                <Link href={`/lost/new${sp.cat ? `?cat=${sp.cat}` : ""}`} className="btn btn-primary mt-4"><SearchX className="h-5 w-5" /> Post a lost report</Link>
                <p className="mt-4"><Link href="/desks" className="font-semibold text-banyan underline">Or check where found things are kept</Link></p>
              </Empty>
            ) : (
              <Empty title="No found items posted yet">
                <p>Found something? Post it in 30 seconds so its owner can see where it is.</p>
                <Link href="/found/new" className="btn btn-gold mt-4"><Plus className="h-5 w-5" /> I found something</Link>
              </Empty>
            )
          ) : lost.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lost.map((l) => <LostCard key={l.id} l={l} />)}
            </div>
          ) : (
            <Empty title={filtered ? "No lost reports match" : "No open lost reports"}>
              <p>Lost something? Post it once and get an email when it turns up.</p>
              <Link href="/lost/new" className="btn btn-primary mt-4">I lost something</Link>
            </Empty>
          )}
        </div>

        <footer className="mt-10 flex flex-col gap-1 text-[15px] text-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
          <Link href="/desks" className="py-2 underline">Where found things are kept</Link>
          <Link href="/poster" className="py-2 underline">Print a QR poster</Link>
          <Link href="/impact" className="py-2 underline">Impact so far</Link>
          <span className="pt-2 text-sm">A Design Thinking project at DoMS, IIT Madras</span>
        </footer>
      </main>

      <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <Link href="/found/new" className="btn btn-gold min-h-12 whitespace-nowrap !px-1 text-[15px]">I found something</Link>
          <Link href="/lost/new" className="btn btn-primary min-h-12 whitespace-nowrap !px-1 text-[15px]">I lost something</Link>
        </div>
      </div>
    </>
  );
}
