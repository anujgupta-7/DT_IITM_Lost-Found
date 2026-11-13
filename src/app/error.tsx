"use client";

import { Recover } from "@/components/recover";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <Recover error={error} reset={reset} />;
}
