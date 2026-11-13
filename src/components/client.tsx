"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Loader2, Search, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { claimItem, sendFeedback } from "@/app/actions";

export function SearchBar({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [v, setV] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function go(next: string) {
    const p = new URLSearchParams(sp.toString());
    if (next) p.set("q", next); else p.delete("q");
    start(() => router.replace(`${path}?${p.toString()}`, { scroll: false }));
  }
  function onChange(next: string) {
    setV(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next.trim()), 280);
  }

  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); go(v.trim()); }} className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-banyan" />
      <input
        value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label="Search" enterKeyHint="search"
        className="w-full rounded-2xl border-2 border-transparent bg-paper py-4 pl-12 pr-12 text-[17px] font-medium text-ink shadow-[0_8px_24px_-14px_rgba(13,42,31,0.7)] placeholder:font-normal placeholder:text-[#8b9a92] focus:border-marigold focus:outline-none"
      />
      {pending ? (
        <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted" />
      ) : v ? (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-mist">
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </form>
  );
}

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button" className="btn btn-ghost"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch {} }}
    >
      {done ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> {label}</>}
    </button>
  );
}

type Post = { t: "found" | "lost"; id: string; k: string; title: string; at: number };

function readPosts(): Post[] {
  try { return JSON.parse(localStorage.getItem("if_posts") || "[]"); } catch { return []; }
}

export function SavePost({ post }: { post: Omit<Post, "at"> }) {
  useEffect(() => {
    try {
      const all = readPosts().filter((p) => p.id !== post.id);
      all.unshift({ ...post, at: Date.now() });
      localStorage.setItem("if_posts", JSON.stringify(all.slice(0, 20)));
    } catch {}
  }, [post]);
  return null;
}

export function MyPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => setPosts(readPosts()), []);
  if (!posts.length) return null;
  return (
    <section className="mb-5 rounded-2xl bg-paper p-4">
      <h2 className="text-base font-bold">Your posts on this phone</h2>
      <ul className="mt-2 divide-y divide-line">
        {posts.slice(0, 5).map((p) => (
          <li key={p.id}>
            <Link href={p.t === "found" ? `/item/${p.id}?k=${p.k}` : `/lost/${p.id}?k=${p.k}`} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
              <span className="truncate font-semibold">{p.title}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${p.t === "found" ? "bg-marigold-soft text-banyan-deep" : "bg-coral-soft text-coral"}`}>
                {p.t === "found" ? "You found" : "You lost"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Feedback({ ctx }: { ctx: string }) {
  const [state, setState] = useState<"ask" | "note" | "done">("ask");
  const [helped, setHelped] = useState(true);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function send(h: boolean, n: string) {
    const fd = new FormData();
    fd.set("helped", h ? "yes" : "no");
    fd.set("note", n);
    fd.set("ctx", ctx);
    start(async () => { await sendFeedback(fd); });
  }

  if (state === "done") return <p className="rounded-2xl bg-paper p-4 text-center text-[15px] font-semibold text-leaf">Thanks. That helps us make this better.</p>;
  return (
    <section className="rounded-2xl bg-paper p-4">
      {state === "ask" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold">Is InstiFound making this easier?</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => { setHelped(true); setState("note"); }}><ThumbsUp className="h-4 w-4" /> Yes</button>
            <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => { setHelped(false); setState("note"); }}><ThumbsDown className="h-4 w-4" /> No</button>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-bold">{helped ? "Good to hear. What worked?" : "What got in the way?"}</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="field mt-2" placeholder="One line is plenty (optional)" maxLength={400} />
          <button type="button" disabled={pending} className="btn btn-primary mt-2 !py-2.5" onClick={() => { send(helped, note); setState("done"); }}>Send feedback</button>
        </div>
      )}
    </section>
  );
}

export function ClaimForm({ id, askProof }: { id: string; askProof: boolean }) {
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr("");
    start(async () => { const r = await claimItem(fd); if (r && "error" in r) setErr(r.error); });
  }
  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />
      <input name="name" className="field" placeholder="Your name" maxLength={60} />
      <input name="email" type="email" inputMode="email" className="field" placeholder="Your email, so the finder can reply" />
      <textarea name="proof" className="field" rows={2} maxLength={300} placeholder={askProof ? "Describe it so the finder knows it's yours" : "Anything that shows it's yours (optional)"} />
      {err && <p role="alert" className="rounded-xl bg-coral-soft px-4 py-3 text-[15px] font-semibold text-coral">{err}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending" : "Send to the finder"}</button>
    </form>
  );
}
