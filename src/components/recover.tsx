"use client";

import { useEffect } from "react";

export function Recover({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    try {
      const last = Number(sessionStorage.getItem("if_reload") || 0);
      if (Date.now() - last > 15000) {
        sessionStorage.setItem("if_reload", String(Date.now()));
        window.location.reload();
      }
    } catch {}
  }, [error]);
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-extrabold">This page didn&rsquo;t load properly</h1>
      <p className="mt-2 text-muted">InstiFound was probably just updated. Reloading usually fixes it.</p>
      <div className="mt-5 flex justify-center gap-2">
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
        <button className="btn btn-ghost" onClick={() => reset()}>Try again</button>
      </div>
    </main>
  );
}
