import Link from "next/link";
import {
  IdCard, KeyRound, Smartphone, Laptop, Headphones, Wallet, CupSoda, Umbrella, Shirt, Backpack, BookOpen,
  Glasses, Watch, Calculator, Package, MapPin, Check, Hand, Building2,
} from "lucide-react";
import { catLabel, locLabel } from "@/lib/data";
import { ago, fmtDay, maskRoll } from "@/lib/util";
import type { Item, Lost } from "@/lib/types";

const ICONS: Record<string, typeof Package> = {
  id: IdCard, keys: KeyRound, phone: Smartphone, laptop: Laptop, audio: Headphones, wallet: Wallet, bottle: CupSoda,
  umbrella: Umbrella, clothing: Shirt, bag: Backpack, books: BookOpen, glasses: Glasses, watch: Watch,
  stationery: Calculator, other: Package,
};

export function CatIcon({ id, className }: { id: string; className?: string }) {
  const I = ICONS[id] ?? Package;
  return <I className={className} strokeWidth={1.75} aria-hidden />;
}

export const itemTitle = (i: Item) => (i.category === "id" && i.roll ? `ID card, roll ${maskRoll(i.roll)}` : i.title);

export function whereNowShort(i: Item) {
  if (i.holding === "hub") return i.hub_name ?? "A desk";
  if (i.holding === "left") return "Left where it was found";
  return "With the finder";
}

export function ItemCard({ i }: { i: Item }) {
  const returned = i.status === "returned";
  return (
    <Link href={`/item/${i.id}`} className="tag group">
      <div className={`relative aspect-[4/3] ${i.photo_url ? "bg-mist" : "bg-banyan/[0.06]"} flex items-center justify-center`}>
        {i.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={i.photo_url} alt="" loading="lazy" className={`h-full w-full object-cover ${returned ? "opacity-60 grayscale" : ""}`} />
        ) : (
          <CatIcon id={i.category} className="h-12 w-12 text-banyan/50" />
        )}
        {returned && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-leaf px-2.5 py-1 text-xs font-bold text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Returned
          </span>
        )}
      </div>
      <div className="px-3 pb-3 pt-2.5 sm:px-3.5 sm:pt-3">
        <p className="display text-[16px] font-bold leading-snug text-ink line-clamp-2 break-words sm:text-[17px]">{itemTitle(i)}</p>
        <p className="mt-1 text-[13px] leading-snug text-muted line-clamp-2">
          Found at {locLabel(i.found_loc)} {fmtDay(i.found_on)}
        </p>
      </div>
      <div className={`tag-stub ${returned ? "bg-leaf-soft" : "bg-marigold-soft"}`}>
        <p className="text-xs font-semibold text-muted">{returned ? "Back with its owner" : "Where it is now"}</p>
        <p className="mt-0.5 flex items-start gap-1.5 text-sm font-bold leading-tight text-banyan-deep">
          {returned ? <Check className="mt-px h-4 w-4 shrink-0" /> : i.holding === "finder" ? <Hand className="mt-px h-4 w-4 shrink-0" /> : i.holding === "hub" ? <Building2 className="mt-px h-4 w-4 shrink-0" /> : <MapPin className="mt-px h-4 w-4 shrink-0" />}
          <span className="line-clamp-2">{returned ? "Returned " + ago(i.returned_at ?? i.created_at) : whereNowShort(i)}</span>
        </p>
      </div>
    </Link>
  );
}

export function LostCard({ l }: { l: Lost }) {
  return (
    <Link href={`/lost/${l.id}`} className="tag">
      <div className="flex items-start gap-3 px-3.5 pb-3 pt-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral-soft">
          <CatIcon id={l.category} className="h-6 w-6 text-coral" />
        </span>
        <div className="min-w-0">
          <p className="display text-[17px] font-bold leading-snug line-clamp-2">{l.title}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">
            {catLabel(l.category)}, lost near {locLabel(l.lost_loc)} {fmtDay(l.lost_on)}
          </p>
        </div>
      </div>
      <div className="tag-stub bg-coral-soft">
        <p className="text-sm font-bold text-coral">Seen it? Tell the owner</p>
      </div>
    </Link>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-paper/60 px-5 py-10 text-center">
      <p className="display text-xl font-bold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-sm text-[15px] text-muted">{children}</div>}
    </div>
  );
}
