"use client";

import "./globals.css";
import { Recover } from "@/components/recover";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <Recover error={error} reset={reset} />
      </body>
    </html>
  );
}
