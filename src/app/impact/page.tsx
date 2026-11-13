import { catLabel } from "@/lib/data";
import { stats } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impact so far" };

function fmtHours(h: number | null) {
  if (h === null) return "No returns yet";
  if (h < 1) return Math.max(1, Math.round(h * 60)) + " min";
  if (h < 48) return Math.round(h) + " hours";
  return Math.round(h / 24) + " days";
}

export default async function Page() {
  const s = await stats();
  const rate = s.logged ? Math.round((s.returned / s.logged) * 100) : 0;
  const rows: [string, string, string][] = [
    ["Found items posted", String(s.logged), `${s.open} waiting to be collected`],
    ["Returned to owners", String(s.returned), s.logged ? `${rate}% of everything posted` : "Nothing posted yet"],
    ["Typical time to return", fmtHours(s.median), "Median, from posting to handover"],
    ["Lost reports", String(s.lost.total), `${s.lost.closed} closed as recovered`],
    ["Desks listing items", String(s.hubs), "Offices and security desks in the pilot"],
    ["Times an item page was opened", String(s.views), "People checking where something is"],
    ["Feedback", s.feedback.total ? `${s.feedback.yes} of ${s.feedback.total}` : "None yet", "said InstiFound made it easier"],
  ];
  const max = Math.max(1, ...s.byCat.map((c) => c.n));
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Impact so far</h1>
      <p className="mt-2 max-w-xl text-[17px] text-muted">Live numbers from the pilot. Nothing here is estimated.</p>
      <dl className="mt-6 divide-y divide-line rounded-2xl bg-paper px-5">
        {rows.map(([k, v, sub]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-4">
            <dt><span className="block font-bold">{k}</span><span className="text-sm text-muted">{sub}</span></dt>
            <dd className="display shrink-0 text-right text-2xl font-extrabold text-banyan">{v}</dd>
          </div>
        ))}
      </dl>
      {s.byCat.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">What gets found</h2>
          <ul className="mt-3 space-y-2">
            {s.byCat.map((c) => (
              <li key={c.category} className="flex items-center gap-3 text-[15px]">
                <span className="w-44 shrink-0 truncate font-semibold">{catLabel(c.category)}</span>
                <span className="h-5 rounded-md bg-banyan" style={{ width: `${(c.n / max) * 60}%`, minWidth: 6 }} />
                <span className="font-bold">{c.n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
