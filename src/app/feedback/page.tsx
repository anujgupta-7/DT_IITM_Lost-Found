import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FeedbackForm } from "@/components/chrome";

export const metadata = { title: "Give feedback" };

export default function Page() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-4">
      <Link href="/" className="backlink"><ArrowLeft className="h-4 w-4" /> Home</Link>
      <h1 className="mt-1 text-3xl font-extrabold">Tell us what to fix</h1>
      <p className="mb-4 mt-1 text-muted">InstiFound is a student pilot at IIT Madras. Your notes decide what we build next. Takes 20 seconds.</p>
      <section className="rounded-2xl bg-paper p-4 sm:p-5">
        <FeedbackForm ctx="page" />
      </section>
    </main>
  );
}
