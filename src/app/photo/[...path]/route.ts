import { get } from "@vercel/blob";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const pathname = (await params).path.join("/");
  if (!/^items\/[\w.-]+$/.test(pathname)) return new Response("Not found", { status: 404 });
  try {
    const r = await get(pathname, { access: "private" });
    if (!r) return new Response("Not found", { status: 404 });
    return new Response(r.stream, {
      headers: {
        "content-type": r.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("photo read failed", e);
    return new Response("Not found", { status: 404 });
  }
}
