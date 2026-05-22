export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-10 animate-pulse rounded bg-gray-200 w-1/3" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 p-4 border rounded animate-pulse">
            <div className="h-6 rounded bg-gray-200" />
            <div className="h-8 rounded bg-gray-200 w-1/2" />
          </div>
        ))}
      </div>
      <div className="h-80 animate-pulse rounded bg-gray-200" />
    </div>
  );
}
