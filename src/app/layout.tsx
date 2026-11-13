import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "http://localhost:3000"),
  title: { default: "InstiFound, lost and found for IIT Madras", template: "%s | InstiFound" },
  description: "See every found item on campus and exactly where to collect it.",
};

export const viewport: Viewport = { themeColor: "#16402f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <header className="no-print bg-banyan text-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="display flex items-center gap-2 text-xl font-extrabold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-marigold"><Tag className="h-[18px] w-[18px] text-banyan-deep" strokeWidth={2.5} /></span>
              InstiFound
            </Link>
            <nav className="flex items-center gap-1 text-[15px] font-semibold">
              <Link href="/desks" className="rounded-lg px-3 py-2 hover:bg-white/10">Desks</Link>
              <Link href="/impact" className="rounded-lg px-3 py-2 hover:bg-white/10">Impact</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
