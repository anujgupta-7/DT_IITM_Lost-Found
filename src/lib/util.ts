import { CATEGORIES, LOCATIONS, locOf } from "./data";

export const ROLL_RE = /^[A-Z]{2}\d{2}[A-Z]\d{3}$/;

export function normRoll(s: string) {
  const r = s.trim().toUpperCase().replace(/\s+/g, "");
  return ROLL_RE.test(r) ? r : "";
}

export const maskRoll = (r: string) => r.slice(0, 5) + "•••";

export function todayIST() {
  return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
}

export function fmtDay(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  if (!y) return d;
  const today = todayIST();
  if (d === today) return "today";
  const diff = Math.round((Date.parse(today) - Date.parse(d)) / 864e5);
  if (diff === 1) return "yesterday";
  const s = new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  return "on " + s;
}

export function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export function ago(ms: number) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
  const d = Math.round(h / 24);
  if (d < 14) return d + (d === 1 ? " day ago" : " days ago");
  return fmtDate(ms);
}

const STOP = new Set(["the", "and", "with", "for", "near", "from", "colour", "color", "lost", "found", "item", "my", "one", "has", "have", "was", "some", "small", "big"]);

export function tokens(s: string) {
  return Array.from(new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t))));
}

export function matchScore(
  a: { loc: string; text: string },
  b: { loc: string; text: string },
) {
  let s = 0;
  if (a.loc === b.loc && a.loc !== "other") s += 2;
  else if (locOf(a.loc)?.group === locOf(b.loc)?.group && locOf(a.loc)?.group === "Hostels") s += 0;
  const tb = new Set(tokens(b.text));
  for (const t of tokens(a.text)) if (tb.has(t)) s += 1;
  return s;
}

export function searchHints(qs: string) {
  const t = qs.toLowerCase().trim();
  const locs = LOCATIONS.filter((l) => t.length >= 2 && (l.label.toLowerCase().includes(t) || l.alt?.toLowerCase().includes(t))).map((l) => l.id);
  const cats = CATEGORIES.filter((c) => t.length >= 3 && (c.label.toLowerCase().includes(t) || c.hint.toLowerCase().includes(t))).map((c) => c.id);
  return { locs, cats };
}

export const clip = (s: FormDataEntryValue | null, n: number) => String(s ?? "").trim().slice(0, n);
export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
