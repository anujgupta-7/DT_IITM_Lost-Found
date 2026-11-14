import Link from "next/link";
import { Building2, Clock, MapPin, UserRound } from "lucide-react";
import { q } from "@/lib/db";
import { locLabel } from "@/lib/data";
import { listHubs } from "@/lib/repo";
import { Empty } from "@/components/bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Where found things are kept" };

export default async function Page() {
  const hubs = await listHubs();
  const counts = await q<{ hub_id: string; n: number }>("select hub_id, count(*)::int as n from items where status = 'open' and hub_id is not null group by hub_id");
  const contact = process.env.GMAIL_USER;
  const n = (id: string) => counts.find((c) => c.hub_id === id)?.n ?? 0;
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Where found things are kept</h1>
      <p className="mt-2 max-w-xl text-[17px] text-muted">
        Staff at these desks keep things found in their building. Lost something nearby? Check here, then collect it from the desk.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {hubs.map((h) => (
          <article key={h.id} className="tag">
            <div className="p-4 sm:p-5">
              <p className="text-sm font-semibold text-muted">{locLabel(h.loc)}</p>
              <h2 className="flex items-center gap-2 text-xl font-extrabold"><Building2 className="h-5 w-5 shrink-0 text-banyan" /> {h.name}</h2>
              <ul className="mt-3 space-y-1.5 text-[15px]">
                {h.place && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-banyan" /> {h.place}</li>}
                {h.hours && <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-banyan" /> {h.hours}</li>}
                {h.ask && <li className="flex gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-banyan" /> {h.ask}</li>}
              </ul>
            </div>
            <Link href={`/?hub=${h.id}`} className="tag-stub flex min-h-12 items-center bg-marigold-soft text-[15px] font-bold text-banyan-deep">
              {n(h.id) ? `See ${n(h.id)} item${n(h.id) === 1 ? "" : "s"} kept here` : "Nothing listed here right now"}
            </Link>
          </article>
        ))}
      </div>
      {hubs.length === 0 && <Empty title="No desks listed yet"><p>Desks are being added as buildings join the pilot.</p></Empty>}
      <p className="mt-8 max-w-xl text-[15px] text-muted">
        Does your office or security desk keep found items?{contact ? <> Email <a className="font-semibold text-banyan underline" href={`mailto:${contact}`}>{contact}</a> and we&rsquo;ll add it to this list.</> : " Tell the InstiFound team and we\u2019ll add it to this list."}
      </p>
    </main>
  );
}
