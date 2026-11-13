import "server-only";
import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { q } from "./db";
import type { Hub } from "./types";

const ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
export function rid(n = 8) {
  const b = randomBytes(n);
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHA[b[i] % ALPHA.length];
  return s;
}

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return "http://localhost:3000";
}

const adminKey = () => process.env.ADMIN_KEY || (process.env.NODE_ENV === "production" ? "" : "dev");
export const adminHash = (k: string) => createHash("sha256").update("instifound:" + k).digest("hex");
export const adminConfigured = () => adminKey() !== "";
export const adminKeyOk = (k: string) => adminKey() !== "" && k === adminKey();

export async function isAdmin() {
  const c = (await cookies()).get("if_admin")?.value;
  return !!c && adminKey() !== "" && c === adminHash(adminKey());
}

export async function currentHub(): Promise<Hub | null> {
  const t = (await cookies()).get("if_hub")?.value;
  if (!t) return null;
  const rows = await q<Hub>("select * from hubs where token = $1 and active", [t]);
  return rows[0] ?? null;
}

export async function storePhoto(file: File | null, id: string): Promise<string | null> {
  if (!file || file.size === 0 || file.size > 4_000_000 || !file.type.startsWith("image/")) return null;
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const { put } = await import("@vercel/blob");
    const path = `items/${id}.jpg`;
    try {
      const r = await put(path, file, { access: "private", addRandomSuffix: true, contentType: file.type });
      return `/photo/${r.pathname}`;
    } catch (e) {
      if (!String(e).includes("private access on a public store")) { console.error("photo upload failed", e); return null; }
    }
    try {
      const r = await put(path, file, { access: "public", addRandomSuffix: true, contentType: file.type });
      return r.url;
    } catch (e) {
      console.error("photo upload failed", e);
      return null;
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const buf = Buffer.from(await file.arrayBuffer());
    return `data:${file.type};base64,${buf.toString("base64")}`;
  }
  return null;
}
