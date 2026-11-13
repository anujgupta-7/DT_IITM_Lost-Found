"use client";

import { useState, useTransition } from "react";
import { Building2, ChevronDown, Hand, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { createFound, createLost } from "@/app/actions";
import { locLabel } from "@/lib/data";
import { todayIST } from "@/lib/util";
import { CategoryPicker, LocationPicker, PhotoInput } from "./pickers";

type HubLite = { id: string; name: string; loc: string; place: string };

function Step({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-paper p-4 sm:p-5">
      <h2 className="flex items-baseline gap-2 text-lg font-bold">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marigold text-sm font-bold text-banyan-deep">{n}</span>
        {title}
      </h2>
      {hint && <p className="mb-3 mt-1 text-sm text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return msg ? <p role="alert" className="rounded-xl bg-coral-soft px-4 py-3 text-[15px] font-semibold text-coral">{msg}</p> : null;
}

export function FoundForm({
  hubs, deskHub, initLoc, initDetail, lost,
}: {
  hubs: HubLite[]; deskHub: HubLite | null; initLoc: string; initDetail: string;
  lost: { id: string; title: string; category: string } | null;
}) {
  const [cat, setCat] = useState(lost?.category ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loc, setLoc] = useState(deskHub ? deskHub.loc : initLoc);
  const nearby = hubs.filter((h) => h.loc === loc);
  const [holding, setHolding] = useState<string>("");
  const [hubId, setHubId] = useState("");
  const [more, setMore] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const isId = cat === "id";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("category", cat);
    if (photo && !isId) fd.set("photo", photo);
    if (deskHub) fd.set("as_hub", "1");
    else { fd.set("holding", holding); fd.set("hub_id", hubId || nearby[0]?.id || hubs[0]?.id || ""); }
    setErr("");
    start(async () => {
      const r = await createFound(fd);
      if (r && "error" in r) { setErr(r.error); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }
    });
  }

  const opt = (v: string) =>
    `flex w-full items-start gap-3 rounded-xl border-[1.5px] p-3.5 text-left transition-colors ${holding === v ? "border-banyan bg-leaf-soft/50" : "border-line bg-paper hover:border-banyan"}`;

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />
      {lost && <input type="hidden" name="lost" value={lost.id} />}
      {lost && (
        <p className="rounded-xl bg-coral-soft px-4 py-3 text-[15px] text-ink">
          You&rsquo;re answering a lost report: <b>{lost.title}</b>. The owner gets an email as soon as you post.
        </p>
      )}

      <Step n={1} title="What did you find?">
        <CategoryPicker value={cat} onChange={setCat} />
      </Step>

      {cat && (
        <>
          {isId ? (
            <Step n={2} title="Roll number on the card" hint="Don't photograph ID cards. Type the roll number and we email the owner straight away.">
              <input name="roll" className="field uppercase" placeholder="MS25A012" autoCapitalize="characters" autoComplete="off" maxLength={10} />
              <p className="mt-2 text-sm text-muted">Only the first few characters show on the site. Not a student card? Leave this empty and describe it below.</p>
              <input name="title" className="field mt-3" placeholder="Other card? Describe it (optional)" maxLength={80} />
            </Step>
          ) : (
            <Step n={2} title="Show it">
              <PhotoInput onChange={setPhoto} />
              <input name="title" className="field mt-3" placeholder="Short description, like Black Milton bottle" maxLength={80} />
              {cat === "wallet" && <p className="mt-2 text-sm text-muted">Photograph only the outside. Keep cards and cash out of the picture.</p>}
            </Step>
          )}

          <Step n={3} title="Where did you find it?">
            <LocationPicker name="found_loc" value={loc} onChange={setLoc} placeholder="Pick the building or area" />
            <input name="found_detail" defaultValue={initDetail} className="field mt-2" placeholder="Exact spot, like Room 253 or the bus stop bench (optional)" maxLength={120} />
          </Step>

          {deskHub ? (
            <section className="flex items-center gap-3 rounded-2xl bg-marigold-soft p-4">
              <Building2 className="h-6 w-6 shrink-0 text-banyan" />
              <p className="text-[15px]">It will be listed as kept at <b>{deskHub.name}</b>.</p>
            </section>
          ) : (
            <Step n={4} title="Where is it now?" hint="This is what the owner needs most.">
              <div className="space-y-2" role="radiogroup">
                {hubs.length > 0 && (
                  <div>
                    <button type="button" role="radio" aria-checked={holding === "hub"} className={opt("hub")} onClick={() => { setHolding("hub"); if (!hubId) setHubId(nearby[0]?.id ?? hubs[0].id); }}>
                      <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-banyan" />
                      <span><b className="block">I handed it to a desk</b><span className="text-sm text-muted">{nearby[0] ? `Nearest: ${nearby[0].name}${nearby[0].place ? `, ${nearby[0].place}` : ""}` : "Security or an office that keeps found items"}</span></span>
                    </button>
                    {holding === "hub" && (
                      <select value={hubId} onChange={(e) => setHubId(e.target.value)} className="field mt-2" aria-label="Which desk">
                        {hubs.map((h) => <option key={h.id} value={h.id}>{h.name} ({locLabel(h.loc)})</option>)}
                      </select>
                    )}
                  </div>
                )}
                <div>
                  <button type="button" role="radio" aria-checked={holding === "left"} className={opt("left")} onClick={() => setHolding("left")}>
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-banyan" />
                    <span><b className="block">I left it where I found it</b><span className="text-sm text-muted">The owner will go back there for it</span></span>
                  </button>
                  {holding === "left" && <input name="left_note" className="field mt-2" placeholder="Where exactly? Like on the window ledge" maxLength={160} />}
                </div>
                <div>
                  <button type="button" role="radio" aria-checked={holding === "finder"} className={opt("finder")} onClick={() => { setHolding("finder"); setMore(true); }}>
                    <Hand className="mt-0.5 h-5 w-5 shrink-0 text-banyan" />
                    <span><b className="block">It&rsquo;s with me</b><span className="text-sm text-muted">The owner will message you through this site</span></span>
                  </button>
                </div>
              </div>
            </Step>
          )}

          <section className="rounded-2xl bg-paper">
            <button type="button" onClick={() => setMore(!more)} className="flex w-full items-center justify-between p-4 text-left font-bold" aria-expanded={more}>
              <span>Add more detail <span className="font-normal text-muted">(optional)</span></span>
              <ChevronDown className={`h-5 w-5 transition-transform ${more ? "rotate-180" : ""}`} />
            </button>
            <div className={`space-y-3 px-4 pb-4 ${more ? "" : "hidden"}`}>
              {!deskHub && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Your email {holding === "finder" ? "(needed so the owner can reach you)" : ""}</span>
                  <input name="finder_email" type="email" inputMode="email" className="field" placeholder="you@smail.iitm.ac.in" />
                  <span className="mt-1 block text-sm text-muted">Never shown on the site. We tell you when it reaches its owner.</span>
                </label>
              )}
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-banyan" /> A detail only the owner would know</span>
                <input name="hidden_detail" className="field" placeholder="Like the wallpaper, a sticker, what's inside" maxLength={160} />
                <span className="mt-1 block text-sm text-muted">Kept hidden. Whoever hands it over asks for this first.</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Anything else</span>
                <textarea name="details" className="field" rows={2} placeholder="Brand, colour, marks" maxLength={400} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Found on</span>
                <input name="found_on" type="date" defaultValue={todayIST()} max={todayIST()} className="field" />
              </label>
            </div>
          </section>

          <ErrorBox msg={err} />
          <button className="btn btn-primary w-full !py-4 text-lg" disabled={pending}>
            {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Posting</> : "Post found item"}
          </button>
        </>
      )}
    </form>
  );
}

export function LostForm({ initCat }: { initCat: string }) {
  const [cat, setCat] = useState(initCat);
  const [loc, setLoc] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("category", cat);
    setErr("");
    start(async () => {
      const r = await createLost(fd);
      if (r && "error" in r) setErr(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />
      <Step n={1} title="What did you lose?">
        <CategoryPicker value={cat} onChange={setCat} />
      </Step>
      {cat && (
        <>
          <Step n={2} title="Describe it">
            <input name="title" className="field" placeholder={cat === "id" ? "Like Institute ID card, MS25A012" : "Short description, like Blue Wildcraft backpack"} maxLength={80} />
            <textarea name="details" className="field mt-2" rows={2} placeholder="Anything that sets it apart (optional)" maxLength={400} />
          </Step>
          <Step n={3} title="Where and when?">
            <LocationPicker name="lost_loc" value={loc} onChange={setLoc} placeholder="Where you think you lost it" />
            <input name="lost_detail" className="field mt-2" placeholder="Exact spot, if you remember (optional)" maxLength={120} />
            <label className="mt-2 block">
              <span className="mb-1 block text-sm font-semibold">Lost on</span>
              <input name="lost_on" type="date" defaultValue={todayIST()} max={todayIST()} className="field" />
            </label>
          </Step>
          <Step n={4} title="Get told when it turns up" hint="We email you the moment a matching item is posted. Your email is never shown.">
            <input name="email" type="email" inputMode="email" className="field" placeholder="you@smail.iitm.ac.in" />
          </Step>
          <ErrorBox msg={err} />
          <button className="btn btn-primary w-full !py-4 text-lg" disabled={pending}>
            {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving</> : "Post lost report"}
          </button>
        </>
      )}
    </form>
  );
}
