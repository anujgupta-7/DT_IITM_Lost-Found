import QRCode from "qrcode";
import { Tag } from "lucide-react";
import { LOCATIONS, LOC_GROUPS, locOf } from "@/lib/data";
import { getHub } from "@/lib/repo";
import { siteUrl } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "QR poster" };

export default async function Page({ searchParams }: { searchParams: Promise<{ hub?: string; loc?: string; d?: string }> }) {
  const sp = await searchParams;
  const hub = await getHub(sp.hub ?? null);
  const loc = locOf(hub ? hub.loc : sp.loc);
  const d = hub ? "" : (sp.d ?? "").slice(0, 60);
  const target = hub
    ? `${siteUrl()}/go?loc=${hub.loc}`
    : loc ? `${siteUrl()}/go?loc=${loc.id}${d ? `&d=${encodeURIComponent(d)}` : ""}` : siteUrl();
  const svg = await QRCode.toString(target, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0d2a1f", light: "#ffffff" } });

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">
      <form className="no-print mb-6 rounded-2xl bg-paper p-4" method="get">
        <h1 className="text-xl font-bold">Make a QR poster</h1>
        <p className="mt-1 text-sm text-muted">Pick the place it will hang. Scanning it opens InstiFound already knowing the location.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select name="loc" defaultValue={loc?.id ?? ""} className="field" aria-label="Place">
            <option value="">Whole campus</option>
            {LOC_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {LOCATIONS.filter((l) => l.group === g).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </optgroup>
            ))}
          </select>
          <input name="d" defaultValue={d} className="field" placeholder="Room or spot (optional)" maxLength={60} />
          <button className="btn btn-primary">Make poster</button>
        </div>
        <p className="mt-3 text-sm text-muted">Then print this page. Use your browser&rsquo;s print option.</p>
      </form>

      <section className="overflow-hidden rounded-3xl border-4 border-banyan bg-white print:rounded-none print:border-[6px]">
        <div className="bg-banyan px-8 py-7 text-white">
          <p className="display flex items-center gap-3 text-2xl font-extrabold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marigold"><Tag className="h-6 w-6 text-banyan-deep" strokeWidth={2.5} /></span>
            InstiFound
          </p>
          <h2 className="mt-5 text-[40px] font-extrabold leading-[1.05] sm:text-5xl">
            {hub ? "Found items for this building are kept here" : "Lost or found something here?"}
          </h2>
        </div>
        <div className="grid items-center gap-8 px-8 py-8 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto w-56 rounded-2xl border-[10px] border-marigold p-3" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="text-[19px] leading-snug">
            <p className="display text-2xl font-extrabold">Scan with your phone camera</p>
            <ul className="mt-3 space-y-2">
              <li><b>Found something?</b> Post it in 30 seconds{hub ? ", then hand it in at this desk." : "."}</li>
              <li><b>Lost something?</b> See what has been found and where to collect it.</li>
            </ul>
            <p className="mt-4 text-base text-muted">No app. No sign in.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 bg-marigold-soft px-8 py-4 text-lg font-bold text-banyan-deep">
          <span>{hub ? hub.name : loc ? `${loc.label}${d ? `, ${d}` : ""}` : "IIT Madras"}</span>
          <span className="text-sm font-semibold">{siteUrl().replace(/^https?:\/\//, "")}</span>
        </div>
      </section>
    </main>
  );
}
