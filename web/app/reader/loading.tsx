export default function ReaderListLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 text-center">
        <div className="h-8 w-48 bg-stone-200 rounded mx-auto mb-2" />
        <div className="h-4 w-64 bg-stone-100 rounded mx-auto" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="h-3 w-32 bg-stone-100 rounded mb-1" />
            <div className="h-5 w-48 bg-stone-200 rounded mb-3" />
            <div className="h-3 w-full bg-stone-100 rounded mb-1" />
            <div className="h-3 w-3/4 bg-stone-100 rounded mb-4" />
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-stone-100 rounded" />
              <div className="h-3 w-4 bg-stone-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
