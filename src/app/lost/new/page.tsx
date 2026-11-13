import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import { LostForm } from "@/components/forms";

export const metadata = { title: "Post a lost report" };

export default async function Page({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="mt-2 text-3xl font-extrabold">You lost something</h1>
      <p className="mb-4 mt-1 text-muted">Tell us once. We check it against everything found, now and later.</p>
      <LostForm initCat={CATEGORIES.some((c) => c.id === sp.cat) ? sp.cat! : ""} />
    </main>
  );
}
