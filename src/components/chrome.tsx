"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, Loader2, MessageSquareText, X } from "lucide-react";
import { adminLogin, sendFeedback } from "@/app/actions";

export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOn(false);
    if (timer.current) clearTimeout(timer.current);
  }, [pathname, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setOn(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setOn(false), 8000);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return on ? <div className="nav-progress no-print" role="progressbar" aria-label="Loading" /> : null;
}

const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");

function ids() {
  try {
    let v = localStorage.getItem("if_v");
    if (!v) { v = newId(); localStorage.setItem("if_v", v); }
    const now = Date.now();
    let s: { id: string; t: number } | null = null;
    try { s = JSON.parse(localStorage.getItem("if_s") || "null"); } catch {}
    if (!s || now - s.t > 30 * 60000) s = { id: newId(), t: now };
    s.t = now;
    localStorage.setItem("if_s", JSON.stringify(s));
    return { v, s: s.id };
  } catch {
    return null;
  }
}

function ping(n: 0 | 1, a = "") {
  if (location.pathname.startsWith("/admin")) return;
  const id = ids();
  if (!id) return;
  const body = JSON.stringify({ ...id, p: location.pathname + location.search, n, a });
  try {
    fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {}
}

export function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const isNew = search.get("new") === "1";

  useEffect(() => {
    ping(1, isNew ? "post" : "");
  }, [pathname, isNew]);

  useEffect(() => {
    const beat = setInterval(() => { if (document.visibilityState === "visible") ping(0); }, 30000);
    const onHide = () => { if (document.visibilityState === "hidden") ping(0); };
    document.addEventListener("visibilitychange", onHide);
    return () => { clearInterval(beat); document.removeEventListener("visibilitychange", onHide); };
  }, []);

  return null;
}

export function SubmitButton({ children, className = "btn btn-primary", pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> {pendingText ?? "Working"}</> : children}
    </button>
  );
}

const GOALS = ["Find something I lost", "Post something I found", "Just looking around", "I run a desk"];
const SCALE = ["Very hard", "Hard", "Okay", "Easy", "Very easy"];

export function FeedbackForm({ ctx, compact = false, sticky = false, onDone }: { ctx: string; compact?: boolean; sticky?: boolean; onDone?: () => void }) {
  const [rating, setRating] = useState(0);
  const [goal, setGoal] = useState("");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    const fd = new FormData();
    fd.set("rating", String(rating)); fd.set("goal", goal); fd.set("note", note); fd.set("contact", contact);
    fd.set("ctx", `${ctx} ${location.pathname}`.trim());
    setFailed(false);
    start(async () => {
      try {
        const r = await sendFeedback(fd);
        if (r.ok) { setDone(true); if (onDone) setTimeout(onDone, 1400); } else setFailed(true);
      } catch { setFailed(true); }
    });
  }

  if (done) {
    return (
      <div className="pop-in flex flex-col items-center pb-8 pt-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-white"><Check className="h-7 w-7" strokeWidth={3} /></span>
        <p className="display mt-3 text-xl font-extrabold">Thanks, that helps</p>
        <p className="mt-1 text-[15px] text-muted">We read every note while InstiFound is in its pilot.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-bold">How easy was InstiFound to use?</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="How easy, from 1 to 5">
        {SCALE.map((label, i) => {
          const n = i + 1, on = rating === n;
          return (
            <button key={n} type="button" role="radio" aria-checked={on} aria-label={`${n}, ${label}`} onClick={() => setRating(n)}
              className={`display flex h-14 items-center justify-center rounded-xl border-[1.5px] text-xl font-extrabold transition-colors ${on ? "border-banyan bg-banyan text-white" : "border-line bg-paper text-ink hover:border-banyan"}`}>
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs font-semibold text-muted"><span>Very hard</span><span>{rating ? SCALE[rating - 1] : ""}</span><span>Very easy</span></div>

      {(!compact || rating > 0) && (
        <div className={compact ? "sheet-in" : ""}>
          {!compact && (
            <>
              <p className="mt-5 font-bold">What were you here to do?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(goal === g ? "" : g)}
                    className={`min-h-11 rounded-full border-[1.5px] px-3.5 text-[15px] font-semibold ${goal === g ? "border-banyan bg-leaf-soft text-banyan-deep" : "border-line bg-paper"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </>
          )}
          <label className="mt-5 block">
            <span className="font-bold">{rating && rating <= 3 ? "What got in the way?" : "What should we fix or add?"}</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={600} className="field mt-2" placeholder="Anything confusing, slow, missing or broken" />
          </label>
          {!compact && (
            <label className="mt-4 block">
              <span className="font-bold">Can we ask you more? <span className="font-normal text-muted">(optional)</span></span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} className="field mt-2" placeholder="Phone or email" />
            </label>
          )}
          {failed && <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-4 py-3 text-[15px] font-semibold text-coral">That didn&rsquo;t send. Check your connection and try again.</p>}
          <div className={sticky ? "sticky bottom-0 -mx-5 mt-4 border-t border-line bg-paper px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3" : "mt-4"}>
            <button type="button" onClick={submit} disabled={pending || !rating} className="btn btn-primary w-full">
              {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending</> : rating ? "Send feedback" : "Pick a number first"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  if (pathname.startsWith("/feedback")) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center pl-1.5" aria-haspopup="dialog">
        <span className="flex h-9 items-center gap-1.5 rounded-full bg-marigold px-3 text-[14px] font-bold text-banyan-deep">
          <MessageSquareText className="h-4 w-4" /> Feedback
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-banyan-deep/55 text-ink sm:items-center" onClick={close}>
          <div role="dialog" aria-modal="true" aria-label="Give feedback"
            className="sheet-in max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-paper p-5 pb-0 text-left sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold">Tell us what to fix</h2>
                <p className="mt-0.5 text-[15px] font-normal text-muted">InstiFound is a student pilot. Takes 20 seconds.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-mist"><X className="h-6 w-6" /></button>
            </div>
            <FeedbackForm ctx="button" sticky onDone={close} />
          </div>
        </div>
      )}
    </>
  );
}

export function AdminLogin() {
  const [wrong, setWrong] = useState(false);
  const [pending, start] = useTransition();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setWrong(false);
    start(async () => {
      const r = await adminLogin(fd);
      if (r.ok) window.location.assign("/admin"); else setWrong(true);
    });
  }
  return (
    <form onSubmit={submit} className="mt-4 space-y-2">
      <input name="key" type="password" className="field" placeholder="Admin key" autoFocus autoComplete="current-password" />
      {wrong && <p role="alert" className="font-semibold text-coral">That key is not right.</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Checking</> : "Open admin"}</button>
    </form>
  );
}

type ActionResult = void | { ok: boolean } | { url: string };

export function ActionForm({ action, children, className, okUrl, failUrl }: {
  action: (fd: FormData) => Promise<ActionResult>; children: React.ReactNode; className?: string; okUrl?: string; failUrl?: string;
}) {
  const [pending, start] = useTransition();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await action(fd);
      const url = r && "url" in r ? r.url : r && "ok" in r && !r.ok && failUrl ? failUrl : okUrl;
      if (url) window.location.assign(url); else window.location.reload();
      await new Promise(() => {});
    });
  }
  return (
    <form onSubmit={submit} className={`relative ${className ?? ""} ${pending ? "pointer-events-none" : ""}`} aria-busy={pending}>
      <div className={pending ? "opacity-50" : ""}>{children}</div>
      {pending && <span className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-banyan" /></span>}
    </form>
  );
}
