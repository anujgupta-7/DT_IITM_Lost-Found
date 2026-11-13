import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { locOf } from "@/lib/data";
import { getLost, listHubs } from "@/lib/repo";
import { currentHub } from "@/lib/server";
import { FoundForm } from "@/components/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post a found item" };

export default async function Page({ searchParams }: { searchParams: Promise<{ loc?: string; d?: string; lost?: string }> }) {
  const sp = await searchParams;
  const [hubs, desk, lost] = await Promise.all([listHubs(), currentHub(), sp.lost ? getLost(sp.lost) : null]);
  const lite = hubs.map((h) => ({ id: h.id, name: h.name, loc: h.loc, place: h.place }));
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-4">
      <Link href={desk ? "/desk" : "/"} className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="mt-2 text-3xl font-extrabold">You found something</h1>
      <p className="mb-4 mt-1 text-muted">Takes about 30 seconds. No sign in.</p>
      <FoundForm
        hubs={lite}
        deskHub={desk ? { id: desk.id, name: desk.name, loc: desk.loc, place: desk.place } : null}
        initLoc={locOf(sp.loc) ? sp.loc! : ""}
        initDetail={(sp.d ?? "").slice(0, 120)}
        lost={lost && lost.status === "open" ? { id: lost.id, title: lost.title, category: lost.category } : null}
      />
    </main>
  );
}
