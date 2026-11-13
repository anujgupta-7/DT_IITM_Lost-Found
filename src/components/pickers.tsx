"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronDown, MapPin, RefreshCw, Search, X } from "lucide-react";
import { CATEGORIES, LOCATIONS, LOC_GROUPS, locOf } from "@/lib/data";
import { CatIcon } from "./bits";

export function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="What kind of item">
      {CATEGORIES.map((c) => {
        const on = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(c.id)}
            className={`flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] px-1.5 py-2.5 text-center text-[13px] font-semibold leading-tight transition-colors ${
              on ? "border-banyan bg-banyan text-white" : "border-line bg-paper text-ink hover:border-banyan"
            }`}
          >
            <CatIcon id={c.id} className="h-6 w-6" />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

export function LocationPicker({
  name, value, onChange, placeholder,
}: { name: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sel = locOf(value);

  useEffect(() => {
    if (!open) return;
    setTerm("");
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const groups = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = t ? LOCATIONS.filter((l) => l.label.toLowerCase().includes(t) || l.alt?.toLowerCase().includes(t)) : LOCATIONS;
    return LOC_GROUPS.map((g) => ({ g, items: list.filter((l) => l.group === g) })).filter((x) => x.items.length);
  }, [term]);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <button type="button" onClick={() => setOpen(true)} className="field flex items-center gap-2 text-left" aria-haspopup="dialog">
        <MapPin className="h-5 w-5 shrink-0 text-banyan" />
        <span className={`flex-1 truncate ${sel ? "font-semibold" : "text-[#94a19a]"}`}>{sel ? sel.label : placeholder}</span>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-banyan-deep/50 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog" aria-modal="true" aria-label="Choose a place"
            className="sheet-in flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl bg-paper sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line p-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input ref={inputRef} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Type a place, like Narmada" className="field !pl-10" />
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-mist">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-2 pb-4">
              {groups.length === 0 && <p className="px-3 py-8 text-center text-muted">No place matches that. Pick &ldquo;Somewhere else&rdquo; and describe it.</p>}
              {groups.map(({ g, items }) => (
                <div key={g}>
                  <p className="sticky top-0 bg-paper px-3 pb-1 pt-3 text-xs font-bold text-muted">{g}</p>
                  {items.map((l) => (
                    <button
                      key={l.id} type="button"
                      onClick={() => { onChange(l.id); setOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-[16px] hover:bg-mist ${value === l.id ? "bg-marigold-soft font-bold" : ""}`}
                    >
                      <span className="flex-1">
                        {l.label}
                        {l.alt && <span className="ml-2 text-sm font-normal text-muted">{l.alt}</span>}
                      </span>
                      {value === l.id && <Check className="h-5 w-5 text-banyan" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function PhotoInput({ onChange }: { onChange: (f: File | null) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const small = await shrink(f);
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(small));
    onChange(small);
  }
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} aria-label="Photo of the item" />
      {url ? (
        <div className="relative overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Your photo" className="aspect-[4/3] w-full object-cover" />
          <button type="button" onClick={() => ref.current?.click()} className="btn btn-ghost absolute bottom-3 right-3 !px-3 !py-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Retake
          </button>
        </div>
      ) : (
        <button
          type="button" onClick={() => ref.current?.click()}
          className="flex aspect-[4/3] max-h-64 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-banyan/40 bg-paper text-banyan hover:border-banyan hover:bg-leaf-soft/40"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-marigold"><Camera className="h-7 w-7 text-banyan-deep" /></span>
          <span className="display text-lg font-bold">Take a photo</span>
          <span className="text-sm text-muted">A photo helps the owner spot it fast</span>
        </button>
      )}
    </div>
  );
}
