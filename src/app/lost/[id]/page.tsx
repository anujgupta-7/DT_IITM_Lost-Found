import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, MapPin, MessageCircle, PartyPopper } from "lucide-react";
import { catLabel, locLabel } from "@/lib/data";
import { getItem, getLost, itemsMatchingLost } from "@/lib/repo";
import { isAdmin, siteUrl } from "@/lib/server";
import { mailConfigured } from "@/lib/mail";
import { ago, fmtDay } from "@/lib/util";
import { CatIcon, ItemCard } from "@/components/bits";
import { CopyButton, Feedback, SavePost } from "@/components/client";
import { closeLost } from "@/app/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const l = await getLost((await params).id);
  return { title: l ? `Lost: ${l.title}` : "Lost report" };
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string; new?: string; done?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const l = await getLost(id);
  if (!l) notFound();
  const mine = (!!sp.k && sp.k === l.manage_token) || (await isAdmin());
  const open = l.status === "open";
  const matches = mine && open ? await itemsMatchingLost(l) : [];
  const linked = l.item_id ? await getItem(l.item_id) : null;
  const url = `${siteUrl()}/lost/${l.id}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`Lost near ${locLabel(l.lost_loc)}: ${l.title}.\nIf you've seen or found it, tell me here: ${url}`)}`;

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-4">
      <Link href="/?tab=lost" className="backlink"><ArrowLeft className="h-4 w-4" /> Lost reports</Link>

      {sp.new && mine && (
        <section className="pop-in mt-3 rounded-2xl bg-banyan p-5 text-white">
          <SavePost post={{ t: "lost", id: l.id, k: l.manage_token, title: l.title }} />
          <p className="display flex items-center gap-2 text-2xl font-extrabold"><Check className="h-7 w-7" strokeWidth={3} /> We&rsquo;re watching for it</p>
          <p className="mt-1 text-white/90">
            {l.email && mailConfigured() ? `You'll get an email at ${l.email} when a matching item is posted.` : "Check back here for matches. This phone remembers your report."}
          </p>
        </section>
      )}
      {sp.done && !open && (
        <section className="pop-in mt-3 flex items-center gap-3 rounded-2xl bg-leaf p-5 text-white">
          <PartyPopper className="h-8 w-8 shrink-0" />
          <div><p className="display text-xl font-extrabold">Glad you got it back</p><p className="text-white/90">Your report is closed.</p></div>
        </section>
      )}

      <article className="tag mt-3">
        <div className="flex items-start gap-4 p-4 sm:p-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-soft"><CatIcon id={l.category} className="h-8 w-8 text-coral" /></span>
          <div>
            <p className="text-sm font-semibold text-coral">{open ? "Someone is looking for this" : "Closed"}</p>
            <h1 className="break-words text-[24px] font-extrabold leading-tight sm:text-[26px]">{l.title}</h1>
            <p className="mt-1 flex items-start gap-2 text-[15px] text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{catLabel(l.category)}, lost near {locLabel(l.lost_loc)}{l.lost_detail ? `, ${l.lost_detail}` : ""} {fmtDay(l.lost_on)}. Posted {ago(l.created_at)}.</span>
            </p>
            {l.details && <p className="mt-3 whitespace-pre-line">{l.details}</p>}
          </div>
        </div>
        {open && !mine && (
          <div className="tag-stub bg-coral-soft !p-5">
            <p className="font-bold">Have you found it, or know where it is?</p>
            <p className="mt-1 text-[15px] text-muted">Post it as found. The owner gets an email straight away.</p>
            <Link href={`/found/new?lost=${l.id}`} className="btn btn-primary mt-3 w-full">I found this</Link>
          </div>
        )}
        {!open && (
          <div className="tag-stub bg-leaf-soft !p-5">
            <p className="display flex items-center gap-2 text-xl font-extrabold text-leaf"><Check className="h-6 w-6" strokeWidth={3} /> Back with its owner</p>
            {linked && <Link href={`/item/${linked.id}`} className="mt-1 block text-[15px] underline">See the found post</Link>}
          </div>
        )}
      </article>

      {mine && open && (
        <>
          <section className="mt-5">
            <h2 className="text-xl font-bold">{matches.length ? "Could one of these be yours?" : "Nothing matching has been found yet"}</h2>
            {matches.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2.5">{matches.map((i) => <ItemCard key={i.id} i={i} />)}</div>
            ) : (
              <p className="mt-1 text-muted">
                That&rsquo;s normal in the first day or two. Meanwhile, <Link href="/desks" className="font-semibold text-banyan underline">check where found things are kept</Link> near where you lost it.
              </p>
            )}
          </section>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={wa} target="_blank" rel="noopener" className="btn btn-wa flex-1 whitespace-nowrap"><MessageCircle className="h-5 w-5" /> Share on WhatsApp</a>
            <CopyButton text={url} label="Copy" />
          </div>
          <form action={closeLost} className="mt-3">
            <input type="hidden" name="id" value={l.id} /><input type="hidden" name="k" value={sp.k ?? ""} />
            <button className="btn btn-ghost w-full"><Check className="h-5 w-5" /> I got it back, close this report</button>
          </form>
        </>
      )}

      <div className="mt-6"><Feedback ctx={`lost:${l.id}`} /></div>
    </main>
  );
}
