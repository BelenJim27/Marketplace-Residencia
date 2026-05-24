export default function Loading() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 animate-pulse">
              <div className="h-48 rounded bg-gray-200" />
              <div className="h-4 rounded bg-gray-200 w-3/4" />
              <div className="h-4 rounded bg-gray-200 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
