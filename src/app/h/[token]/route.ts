import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = await q("select id from hubs where token = $1 and active", [token]);
  const url = new URL(req.url);
  if (!rows.length) return NextResponse.redirect(new URL("/?desk=invalid", url.origin));
  const res = NextResponse.redirect(new URL("/desk", url.origin));
  res.cookies.set("if_hub", token, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
}
