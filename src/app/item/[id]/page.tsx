import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Check, Clock, Hand, IdCard, MapPin, MessageCircle, PartyPopper, ShieldCheck, UserRound } from "lucide-react";
import { q } from "@/lib/db";
import { catLabel, locLabel } from "@/lib/data";
import { getItem, listClaims } from "@/lib/repo";
import { currentHub, isAdmin, siteUrl } from "@/lib/server";
import { mailConfigured } from "@/lib/mail";
import { ago, fmtDate, fmtDay } from "@/lib/util";
import { CatIcon, itemTitle } from "@/components/bits";
import { ClaimForm, CopyButton, Feedback, SavePost } from "@/components/client";
import { markReturned, reopenItem, sendThanks } from "@/app/actions";

export const dynamic = "force-dynamic";

type SP = { k?: string; new?: string; done?: string; claimed?: string; thanked?: string };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const i = await getItem((await params).id);
  if (!i) return { title: "Item" };
  const title = `Found: ${itemTitle(i)}`;
  const description = `Found at ${locLabel(i.found_loc)}. ${i.holding === "hub" ? `Kept at ${i.hub_name}` : i.holding === "left" ? "Left where it was found" : "With the person who found it"}. See how to collect it.`;
  return { title, description, openGraph: { title, description, images: i.photo_url && !i.photo_url.startsWith("data:") ? [i.photo_url] : [] } };
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const i = await getItem(id);
  if (!i) notFound();
  const [admin, desk] = await Promise.all([isAdmin(), currentHub()]);
  const owner = !!sp.k && sp.k === i.manage_token;
  const atDesk = !!desk && desk.id === i.hub_id;
  const manager = owner || admin || atDesk;
  if (i.status === "hidden" && !manager) notFound();
  if (!manager) await q("update items set views = views + 1 where id = $1", [i.id]);
  const claims = manager ? await listClaims(i.id) : [];

  const title = itemTitle(i);
  const url = `${siteUrl()}/item/${i.id}`;
  const returned = i.status === "returned";
  const nowLine = i.holding === "hub" ? `Kept at ${i.hub_name}${i.hub_hours ? ` (${i.hub_hours})` : ""}` : i.holding === "left" ? `Left where it was found${i.left_note ? `: ${i.left_note}` : ""}` : "With the person who found it";
  const wa = `https://wa.me/?text=${encodeURIComponent(`Found at ${locLabel(i.found_loc)}: ${title}.\n${nowLine}.\nPhoto and how to collect: ${url}`)}`;
  const heldUntil = i.holding === "hub" && i.hub_hold_days ? fmtDate(i.created_at + i.hub_hold_days * 864e5) : null;

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-4">
      <Link href={atDesk ? "/desk" : "/"} className="backlink"><ArrowLeft className="h-4 w-4" /> {atDesk ? "Back to your desk" : "All found items"}</Link>

      {sp.new && manager && (
        <section className="pop-in mt-3 rounded-2xl bg-leaf p-5 text-white">
          <SavePost post={{ t: "found", id: i.id, k: i.manage_token, title }} />
          <p className="display flex items-center gap-2 text-2xl font-extrabold"><Check className="h-7 w-7" strokeWidth={3} /> Posted</p>
          <p className="mt-1 text-white/90">
            {i.roll && mailConfigured() ? "We emailed the card's owner. " : ""}
            The owner can now see where it is. Sharing it once in a WhatsApp group gets it home faster.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={wa} target="_blank" rel="noopener" className="btn bg-white text-leaf"><MessageCircle className="h-5 w-5" /> Share on WhatsApp</a>
            {atDesk && <Link href="/found/new" className="btn bg-white/15 text-white ring-1 ring-white/40">Log another</Link>}
          </div>
          {!atDesk && <p className="mt-3 text-sm text-white/85">This phone remembers your post. You&rsquo;ll find it on the home page under &ldquo;Your posts&rdquo;.</p>}
        </section>
      )}
      {sp.done && returned && (
        <section className="pop-in mt-3 flex items-center gap-3 rounded-2xl bg-leaf p-5 text-white">
          <PartyPopper className="h-8 w-8 shrink-0" />
          <div><p className="display text-xl font-extrabold">Marked as returned</p><p className="text-white/90">One more thing back where it belongs.</p></div>
        </section>
      )}
      {sp.claimed && <p className="pop-in mt-3 rounded-2xl bg-leaf-soft p-4 font-semibold text-leaf">Sent. The finder has your message and will reply to your email.</p>}
      {sp.thanked && <p className="pop-in mt-3 rounded-2xl bg-leaf-soft p-4 font-semibold text-leaf">Your thanks is on its way to the finder.</p>}

      <article className="tag mt-3">
        <div className={`relative flex items-center justify-center ${i.photo_url ? "bg-ink" : "aspect-[3/1] bg-banyan/[0.06] sm:aspect-[16/9]"}`}>
          {i.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={i.photo_url} alt={title} className={`max-h-[55vh] w-full object-contain ${returned ? "opacity-70 grayscale" : ""}`} />
          ) : (
            <CatIcon id={i.category} className="h-14 w-14 text-banyan/40 sm:h-20 sm:w-20" />
          )}
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-muted">{catLabel(i.category)}</p>
          <h1 className="break-words text-[26px] font-extrabold leading-tight sm:text-[28px]">{title}</h1>
          <p className="mt-2 flex items-start gap-2 text-[15px] text-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Found at {locLabel(i.found_loc)}{i.found_detail ? `, ${i.found_detail}` : ""} {fmtDay(i.found_on)}. Posted {ago(i.created_at)}.</span>
          </p>
          {i.details && <p className="mt-3 whitespace-pre-line text-[16px]">{i.details}</p>}
          {i.category === "id" && !i.roll && <p className="mt-3 flex items-center gap-2 text-sm text-muted"><IdCard className="h-4 w-4" /> Card details are kept off the site for privacy.</p>}
        </div>

        {returned ? (
          <div className="tag-stub bg-leaf-soft !p-5">
            <p className="display flex items-center gap-2 text-xl font-extrabold text-leaf"><Check className="h-6 w-6" strokeWidth={3} /> Back with its owner</p>
            <p className="mt-1 text-[15px] text-muted">Returned {ago(i.returned_at ?? i.created_at)}.</p>
            {i.thanks && <p className="mt-3 rounded-xl bg-paper p-3 text-[15px] italic">&ldquo;{i.thanks}&rdquo;</p>}
          </div>
        ) : (
          <div className="tag-stub bg-marigold-soft !p-5">
            <p className="text-sm font-bold text-muted">Where it is now</p>
            {i.holding === "hub" && (
              <>
                <p className="display mt-0.5 flex items-start gap-2 text-2xl font-extrabold leading-tight text-banyan-deep"><Building2 className="mt-0.5 h-6 w-6 shrink-0" /> {i.hub_name}</p>
                <ul className="mt-3 space-y-2 text-[16px]">
                  {i.hub_place && <li className="flex gap-2"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-banyan" /> {i.hub_place}</li>}
                  {i.hub_hours && <li className="flex gap-2"><Clock className="mt-0.5 h-5 w-5 shrink-0 text-banyan" /> {i.hub_hours}</li>}
                  {i.hub_ask && <li className="flex gap-2"><UserRound className="mt-0.5 h-5 w-5 shrink-0 text-banyan" /> {i.hub_ask}</li>}
                  <li className="flex gap-2"><IdCard className="mt-0.5 h-5 w-5 shrink-0 text-banyan" /> {i.category === "id" ? "Be ready to confirm your name and roll number." : "Carry your ID card."}</li>
                  {i.hidden_detail && <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-banyan" /> They will ask you one thing only the owner would know.</li>}
                </ul>
                {heldUntil && <p className="mt-3 text-sm font-semibold text-muted">Kept here until {heldUntil}.</p>}
              </>
            )}
            {i.holding === "left" && (
              <>
                <p className="display mt-0.5 flex items-start gap-2 text-2xl font-extrabold leading-tight text-banyan-deep"><MapPin className="mt-0.5 h-6 w-6 shrink-0" /> Left where it was found</p>
                <p className="mt-2 text-[16px]">{locLabel(i.found_loc)}{i.found_detail ? `, ${i.found_detail}` : ""}{i.left_note ? `. ${i.left_note}` : ""}</p>
                <form action={markReturned} className="mt-4">
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="k" value={sp.k ?? ""} />
                  <button className="btn btn-primary w-full"><Check className="h-5 w-5" /> It&rsquo;s mine and I&rsquo;ve picked it up</button>
                </form>
              </>
            )}
            {i.holding === "finder" && (
              <>
                <p className="display mt-0.5 flex items-start gap-2 text-2xl font-extrabold leading-tight text-banyan-deep"><Hand className="mt-0.5 h-6 w-6 shrink-0" /> With the person who found it</p>
                {!owner && (
                  <details className="mt-3" open={false}>
                    <summary className="btn btn-primary w-full cursor-pointer list-none">This is mine</summary>
                    <p className="mt-3 text-[15px] text-muted">Your message goes to the finder by email. They reply to you directly.{i.hidden_detail ? " They will ask for a detail only the owner would know." : ""}</p>
                    <ClaimForm id={i.id} askProof={true} />
                  </details>
                )}
              </>
            )}
          </div>
        )}
      </article>

      {manager && (
        <section className="mt-4 rounded-2xl border-2 border-banyan bg-paper p-4 sm:p-5">
          <h2 className="text-lg font-bold">{atDesk ? `For ${desk!.name}` : owner ? "You posted this" : "Admin"}</h2>
          {i.hidden_detail && (
            <p className="mt-2 flex gap-2 rounded-xl bg-marigold-soft p-3 text-[15px]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-banyan" /> <span><b>Ask before handing over:</b> {i.hidden_detail}</span></p>
          )}
          {i.roll && <p className="mt-2 text-[15px]">Roll number on the card: <b>{i.roll}</b></p>}
          {claims.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-bold text-muted">People who say it&rsquo;s theirs</p>
              <ul className="mt-1 divide-y divide-line">
                {claims.map((c) => (
                  <li key={c.id} className="py-2 text-[15px]">
                    <b>{c.name}</b>, <a className="text-banyan underline" href={`mailto:${c.email}`}>{c.email}</a>
                    {c.proof && <span className="block text-muted">&ldquo;{c.proof}&rdquo;</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {returned ? (
            <form action={reopenItem} className="mt-3">
              <input type="hidden" name="id" value={i.id} /><input type="hidden" name="k" value={sp.k ?? ""} />
              <p className="text-[15px] text-muted">{i.returned_to ? `Collected by ${i.returned_to}. ` : ""}Marked by mistake?</p>
              <button className="btn btn-ghost mt-2">Reopen this item</button>
            </form>
          ) : (
            <form action={markReturned} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={i.id} /><input type="hidden" name="k" value={sp.k ?? ""} />
              <input name="returned_to" className="field" placeholder="Collected by (optional)" maxLength={80} />
              <button className="btn btn-primary w-full"><Check className="h-5 w-5" /> Mark as returned</button>
            </form>
          )}
        </section>
      )}

      {returned && !i.thanks && i.finder_email && !manager && (
        <section className="mt-4 rounded-2xl bg-paper p-4 sm:p-5">
          <h2 className="text-lg font-bold">Was this yours? Thank the finder</h2>
          <form action={sendThanks} className="mt-2 space-y-2">
            <input type="hidden" name="id" value={i.id} />
            <textarea name="note" required rows={2} maxLength={300} className="field" placeholder="A line of thanks goes a long way" />
            <button className="btn btn-primary">Send thanks</button>
          </form>
        </section>
      )}

      {!returned && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={wa} target="_blank" rel="noopener" className="btn btn-wa flex-1 whitespace-nowrap"><MessageCircle className="h-5 w-5" /> Share on WhatsApp</a>
          <CopyButton text={url} label="Copy" />
        </div>
      )}

      <div className="mt-6"><Feedback ctx={`item:${i.id}`} /></div>
      <p className="mt-4 text-center text-[15px] leading-relaxed text-muted">
        Not yours? <Link href="/" className="underline">See everything found</Link> or <Link href={`/lost/new?cat=${i.category}`} className="underline">post a lost report</Link>.
      </p>
    </main>
  );
}
