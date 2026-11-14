export function PageSkeleton({ cards = false }: { cards?: boolean }) {
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-5" aria-busy="true" aria-label="Loading">
      <div className="skel h-4 w-24" />
      <div className="skel mt-4 h-9 w-3/4" />
      <div className="skel mt-2 h-4 w-1/2" />
      {cards ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="skel h-40" /><div className="skel h-40" />
        </div>
      ) : (
        <>
          <div className="skel mt-5 h-44 w-full" />
          <div className="skel mt-3 h-28 w-full" />
        </>
      )}
    </main>
  );
}
