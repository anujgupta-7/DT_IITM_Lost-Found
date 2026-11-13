import Link from "next/link";
import { Plus } from "lucide-react";
import { locOf } from "@/lib/data";
import { q } from "@/lib/db";
import { listHubs } from "@/lib/repo";
import type { Item } from "@/lib/types";
import { ItemCard } from "@/components/bits";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ loc?: string; d?: string }> }) {
  const sp = await searchParams;
  const loc = locOf(sp.loc);
  const d = (sp.d ?? "").slice(0, 120);
  const qs = loc ? `?loc=${loc.id}${d ? `&d=${encodeURIComponent(d)}` : ""}` : "";
  const items = loc
    ? await q<Item>(`select i.*, h.name as hub_name from items i left join hubs h on h.id = i.hub_id where i.status = 'open' and i.found_loc = $1 order by i.created_at desc limit 8`, [loc.id])
    : [];
  const desk = loc ? (await listHubs()).find((h) => h.loc === loc.id) : null;
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <p className="text-sm font-semibold text-muted">You&rsquo;re at</p>
      <h1 className="text-3xl font-extrabold">{loc ? loc.label : "IIT Madras"}{d ? `, ${d}` : ""}</h1>
      <div className="mt-5 grid gap-3">
        <Link href={`/found/new${qs}`} className="btn btn-gold !py-5 text-xl"><Plus className="h-6 w-6" /> I found something here</Link>
        <Link href="/lost/new" className="btn btn-primary !py-5 text-xl">I lost something here</Link>
      </div>
      {desk && (
        <p className="mt-5 rounded-2xl bg-marigold-soft p-4 text-[15px]">
          Found items in this building are kept at <b>{desk.name}</b>{desk.place ? `, ${desk.place}` : ""}.{desk.hours ? ` Hours: ${desk.hours}.` : ""}
        </p>
      )}
      {items.length > 0 && (
        <>
          <h2 className="mt-7 text-xl font-bold">Found here recently</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">{items.map((i) => <ItemCard key={i.id} i={i} />)}</div>
        </>
      )}
      <p className="mt-6 text-center"><Link href="/" className="font-semibold text-banyan underline">See everything found on campus</Link></p>
    </main>
  );
}
