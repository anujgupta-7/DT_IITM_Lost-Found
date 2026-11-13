import "server-only";
import { q } from "./db";
import { rid, siteUrl } from "./server";
import { catLabel, locLabel } from "./data";
import type { Claim, Hub, Item, Lost } from "./types";

export const mailConfigured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function send(kind: string, to: string, subject: string, lines: string[], cta?: { label: string; url: string }) {
  if (!mailConfigured() || !to) return false;
  let ok = false;
  try {
    const sent = await q<{ n: number }>("select count(*)::int as n from mail_log where created_at > $1", [Date.now() - 864e5]);
    if ((sent[0]?.n ?? 0) >= 200) return false;
    const nodemailer = (await import("nodemailer")).default;
    const t = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
    const html =
      `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.5;color:#17251f;max-width:520px">` +
      lines.map((l) => `<p style="margin:0 0 14px">${esc(l)}</p>`).join("") +
      (cta ? `<p style="margin:22px 0"><a href="${cta.url}" style="background:#16402f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>` : "") +
      `<p style="margin:26px 0 0;font-size:13px;color:#5d6b64">InstiFound is a student-run lost and found pilot at IIT Madras. If this wasn't meant for you, you can ignore it.</p></div>`;
    const text = lines.join("\n\n") + (cta ? `\n\n${cta.label}: ${cta.url}` : "");
    await t.sendMail({ from: `InstiFound <${process.env.GMAIL_USER}>`, to, subject, text, html });
    ok = true;
  } catch (e) {
    console.error("mail failed", kind, e);
  }
  try {
    await q("insert into mail_log (id, to_addr, kind, ok, created_at) values ($1,$2,$3,$4,$5)", [rid(10), to, kind, ok, Date.now()]);
  } catch {}
  return ok;
}

const itemUrl = (i: Item) => `${siteUrl()}/item/${i.id}`;

function whereNow(i: Item, hub?: Hub | null) {
  if (i.holding === "hub" && hub) return `It is being kept at ${hub.name}${hub.place ? ` (${hub.place})` : ""}.${hub.hours ? ` Hours: ${hub.hours}.` : ""}`;
  if (i.holding === "left") return `The finder left it where it was found: ${locLabel(i.found_loc)}${i.left_note ? `, ${i.left_note}` : ""}.`;
  return "The person who found it is keeping it safe for you.";
}

export function mailIdOwner(roll: string, i: Item, hub?: Hub | null) {
  return send("id-owner", `${roll.toLowerCase()}@smail.iitm.ac.in`, "Your ID card has been found", [
    `Someone found an ID card with roll number ${roll} at ${locLabel(i.found_loc)}.`,
    whereNow(i, hub),
    "Open the link below for collection details. If you already have your card back, please mark it there so the listing closes.",
  ], { label: "See where to collect it", url: itemUrl(i) });
}

export function mailLostMatch(l: Lost, i: Item, hub?: Hub | null, direct = false) {
  return send("lost-match", l.email, direct ? "Someone thinks they found your " + l.title : "Possible match for your lost " + catLabel(l.category).toLowerCase(), [
    direct
      ? `Someone saw your lost report for "${l.title}" and posted a found item for it.`
      : `A found item was just posted that could be the "${l.title}" you reported lost.`,
    `Found: ${i.title}, at ${locLabel(i.found_loc)}.`,
    whereNow(i, hub),
  ], { label: "Check if it's yours", url: itemUrl(i) });
}

export function mailLostConfirm(l: Lost) {
  return send("lost-confirm", l.email, "We're watching for your " + l.title, [
    `Your lost report for "${l.title}" is saved. You'll get an email the moment a matching item is posted on InstiFound.`,
    "Keep this link to see matches or close the report once you have it back.",
  ], { label: "Open your report", url: `${siteUrl()}/lost/${l.id}?k=${l.manage_token}` });
}

export function mailFinderPosted(i: Item) {
  return send("finder-posted", i.finder_email, "Your found post is live: " + i.title, [
    `Thanks for posting the ${i.title} you found. We'll email you if someone claims it, and again when it reaches its owner.`,
    "Use this private link to manage the post or mark it as returned.",
  ], { label: "Manage your post", url: `${siteUrl()}/item/${i.id}?k=${i.manage_token}` });
}

export function mailFinderClaim(i: Item, c: Claim) {
  return send("claim", i.finder_email, "Someone says this is theirs: " + i.title, [
    `${c.name} says the ${i.title} you found belongs to them.`,
    c.proof ? `How they describe it: "${c.proof}"` : "They did not add a description.",
    `Reply to them at ${c.email} to arrange the handover. Once it's back with them, mark the post as returned.`,
  ], { label: "Open your post", url: `${siteUrl()}/item/${i.id}?k=${i.manage_token}` });
}

export function mailFinderReturned(i: Item) {
  return send("returned", i.finder_email, "It reached its owner: " + i.title, [
    `Good news. The ${i.title} you found is back with its owner.`,
    "Thank you for taking the trouble.",
  ]);
}

export function mailThanks(i: Item, note: string) {
  return send("thanks", i.finder_email, "A thank you for the " + i.title + " you found", [
    "The owner of the item you found sent you a note:",
    `"${note}"`,
  ]);
}
