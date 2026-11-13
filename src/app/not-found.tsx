import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-extrabold">That page isn&rsquo;t here</h1>
      <p className="mt-2 text-muted">The post may have been removed. Everything that&rsquo;s been found is on the home page.</p>
      <Link href="/" className="btn btn-primary mt-5">See found items</Link>
    </main>
  );
}
