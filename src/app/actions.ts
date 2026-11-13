"use server";

import { after } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { CATEGORIES, locOf } from "@/lib/data";
import { clip, normRoll, todayIST, validEmail } from "@/lib/util";
import { adminHash, adminKeyOk, currentHub, isAdmin, rid, storePhoto } from "@/lib/server";
import { getHub, getItem, getLost, lostMatchingItem } from "@/lib/repo";
import { mailFinderClaim, mailFinderPosted, mailFinderReturned, mailIdOwner, mailLostConfirm, mailLostMatch, mailThanks } from "@/lib/mail";
import type { Item } from "@/lib/types";

type Result = { error: string } | void;

const meaningful = (s: string) => (s.match(/[a-z0-9]/gi) ?? []).length >= 3;

const validDay = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) && s <= todayIST() ? s : todayIST());

export async function createFound(fd: FormData): Promise<Result> {
  if (clip(fd.get("website"), 10)) return;
  const category = clip(fd.get("category"), 20);
  if (!CATEGORIES.some((c) => c.id === category)) return { error: "Pick what kind of item it is." };
  const roll = category === "id" ? normRoll(clip(fd.get("roll"), 12)) : "";
  if (category === "id" && clip(fd.get("roll"), 12) && !roll) return { error: "That roll number doesn't look right. It should look like MS25A012." };
  let title = clip(fd.get("title"), 80);
  if (category === "id" && !title) title = "ID card";
  if (!meaningful(title)) return { error: "Add a short description, like \"Black Milton bottle\"." };
  const found_loc = clip(fd.get("found_loc"), 30);
  if (!locOf(found_loc)) return { error: "Pick where you found it." };

  const hub = await currentHub();
  let holding = clip(fd.get("holding"), 10);
  let hub_id: string | null = clip(fd.get("hub_id"), 20) || null;
  if (hub && fd.get("as_hub") === "1") { holding = "hub"; hub_id = hub.id; }
  if (!["hub", "left", "finder"].includes(holding)) return { error: "Tell us where the item is now." };
  if (holding === "hub") {
    if (!(await getHub(hub_id))) return { error: "Pick the desk you handed it to." };
  } else hub_id = null;
  const finder_email = clip(fd.get("finder_email"), 120).toLowerCase();
  if (finder_email && !validEmail(finder_email)) return { error: "That email doesn't look right." };
  if (holding === "finder" && !finder_email) return { error: "Add your email so the owner can reach you. It is never shown publicly." };

  const id = rid(8);
  const token = rid(16);
  const photo = category === "id" ? null : await storePhoto(fd.get("photo") as File | null, id);
  const lostId = clip(fd.get("lost"), 20);
  const lost = lostId ? await getLost(lostId) : null;

  await q(
    `insert into items (id, category, title, details, found_loc, found_detail, found_on, holding, hub_id, left_note, photo_url,
      roll, hidden_detail, finder_name, finder_email, manage_token, lost_id, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [id, category, title, clip(fd.get("details"), 400), found_loc, clip(fd.get("found_detail"), 120), validDay(clip(fd.get("found_on"), 10)),
      holding, hub_id, clip(fd.get("left_note"), 160), photo, roll || null, clip(fd.get("hidden_detail"), 160),
      clip(fd.get("finder_name"), 60), finder_email, token, lost?.id ?? null, Date.now()],
  );

  after(async () => {
    const item = (await getItem(id)) as Item;
    const h = await getHub(hub_id);
    if (roll) await mailIdOwner(roll, item, h);
    if (finder_email) await mailFinderPosted(item);
    if (lost?.email && lost.status === "open") await mailLostMatch(lost, item, h, true);
    for (const l of await lostMatchingItem(item)) if (l.email && l.id !== lost?.id) await mailLostMatch(l, item, h);
  });

  revalidatePath("/");
  redirect(`/item/${id}?k=${token}&new=1`);
}

export async function createLost(fd: FormData): Promise<Result> {
  if (clip(fd.get("website"), 10)) return;
  const category = clip(fd.get("category"), 20);
  if (!CATEGORIES.some((c) => c.id === category)) return { error: "Pick what kind of item it is." };
  const title = clip(fd.get("title"), 80);
  if (!meaningful(title)) return { error: "Add a short description, like \"Blue Wildcraft backpack\"." };
  const lost_loc = clip(fd.get("lost_loc"), 30);
  if (!locOf(lost_loc)) return { error: "Pick where you think you lost it." };
  const email = clip(fd.get("email"), 120).toLowerCase();
  if (email && !validEmail(email)) return { error: "That email doesn't look right." };
  const id = rid(8);
  const token = rid(16);
  await q(
    `insert into lost (id, category, title, details, lost_loc, lost_detail, lost_on, name, email, manage_token, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, category, title, clip(fd.get("details"), 400), lost_loc, clip(fd.get("lost_detail"), 120),
      validDay(clip(fd.get("lost_on"), 10)), clip(fd.get("name"), 60), email, token, Date.now()],
  );
  if (email) after(async () => { const l = await getLost(id); if (l) await mailLostConfirm(l); });
  revalidatePath("/");
  redirect(`/lost/${id}?k=${token}&new=1`);
}

async function canManage(item: Item, k: string) {
  if (k && k === item.manage_token) return true;
  if (await isAdmin()) return true;
  const hub = await currentHub();
  return !!hub && hub.id === item.hub_id;
}

export async function markReturned(fd: FormData) {
  const item = await getItem(clip(fd.get("id"), 20));
  const k = clip(fd.get("k"), 40);
  if (!item || item.status !== "open") return;
  if (!(item.holding === "left" || (await canManage(item, k)))) return;
  await q("update items set status = 'returned', returned_at = $2, returned_to = $3 where id = $1", [item.id, Date.now(), clip(fd.get("returned_to"), 80)]);
  if (item.lost_id) await q("update lost set status = 'closed', closed_at = $2, item_id = $3 where id = $1 and status = 'open'", [item.lost_id, Date.now(), item.id]);
  if (item.finder_email) after(() => mailFinderReturned(item));
  revalidatePath("/");
  redirect(`/item/${item.id}?${k ? `k=${k}&` : ""}done=1`);
}

export async function reopenItem(fd: FormData) {
  const item = await getItem(clip(fd.get("id"), 20));
  const k = clip(fd.get("k"), 40);
  if (!item || item.status !== "returned" || !(await canManage(item, k))) return;
  await q("update items set status = 'open', returned_at = null, returned_to = '' where id = $1", [item.id]);
  revalidatePath("/");
  redirect(`/item/${item.id}${k ? `?k=${k}` : ""}`);
}

export async function claimItem(fd: FormData): Promise<Result> {
  if (clip(fd.get("website"), 10)) return;
  const item = await getItem(clip(fd.get("id"), 20));
  if (!item || item.status !== "open") return { error: "This item is no longer open." };
  const name = clip(fd.get("name"), 60);
  const email = clip(fd.get("email"), 120).toLowerCase();
  if (!meaningful(name)) return { error: "Add your name." };
  if (!validEmail(email)) return { error: "Add an email the finder can reply to." };
  const c = { id: rid(10), item_id: item.id, name, email, proof: clip(fd.get("proof"), 300), created_at: Date.now() };
  await q("insert into claims (id, item_id, name, email, proof, created_at) values ($1,$2,$3,$4,$5,$6)", [c.id, c.item_id, c.name, c.email, c.proof, c.created_at]);
  if (item.finder_email) after(() => mailFinderClaim(item, c));
  redirect(`/item/${item.id}?claimed=1`);
}

export async function sendThanks(fd: FormData) {
  const item = await getItem(clip(fd.get("id"), 20));
  const note = clip(fd.get("note"), 300);
  if (!item || item.status !== "returned" || item.thanks || !note) return;
  await q("update items set thanks = $2 where id = $1", [item.id, note]);
  if (item.finder_email) after(() => mailThanks(item, note));
  redirect(`/item/${item.id}?thanked=1`);
}

export async function closeLost(fd: FormData) {
  const l = await getLost(clip(fd.get("id"), 20));
  const k = clip(fd.get("k"), 40);
  if (!l || l.status !== "open") return;
  if (k !== l.manage_token && !(await isAdmin())) return;
  await q("update lost set status = 'closed', closed_at = $2 where id = $1", [l.id, Date.now()]);
  revalidatePath("/");
  redirect(`/lost/${l.id}?k=${k}&done=1`);
}

export async function sendFeedback(fd: FormData) {
  const helped = fd.get("helped") === "yes";
  await q("insert into feedback (id, helped, note, ctx, created_at) values ($1,$2,$3,$4,$5)", [rid(10), helped, clip(fd.get("note"), 400), clip(fd.get("ctx"), 60), Date.now()]);
}

export async function adminLogin(fd: FormData) {
  const key = clip(fd.get("key"), 100);
  if (adminKeyOk(key)) (await cookies()).set("if_admin", adminHash(key), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 60, path: "/" });
  redirect(adminKeyOk(key) ? "/admin" : "/admin?wrong=1");
}

export async function saveHub(fd: FormData) {
  if (!(await isAdmin())) return;
  const id = clip(fd.get("id"), 20);
  const name = clip(fd.get("name"), 60);
  const loc = clip(fd.get("loc"), 30);
  if (!name || !locOf(loc)) redirect("/admin?err=hub");
  const vals = [name, loc, clip(fd.get("place"), 160), clip(fd.get("hours"), 80), clip(fd.get("ask"), 100), Number(clip(fd.get("hold_days"), 4)) || null];
  if (id) await q("update hubs set name=$2, loc=$3, place=$4, hours=$5, ask=$6, hold_days=$7 where id=$1", [id, ...vals]);
  else await q("insert into hubs (id, token, name, loc, place, hours, ask, hold_days, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [rid(6), rid(14), ...vals, Date.now()]);
  revalidatePath("/");
  redirect("/admin");
}

export async function toggleHub(fd: FormData) {
  if (!(await isAdmin())) return;
  await q("update hubs set active = not active where id = $1", [clip(fd.get("id"), 20)]);
  redirect("/admin");
}

export async function setItemHidden(fd: FormData) {
  if (!(await isAdmin())) return;
  const hide = fd.get("hide") === "1";
  await q("update items set status = $2 where id = $1", [clip(fd.get("id"), 20), hide ? "hidden" : "open"]);
  revalidatePath("/");
  redirect("/admin");
}

export async function hubLogout() {
  (await cookies()).delete("if_hub");
  redirect("/");
}
