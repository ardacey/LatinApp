export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 text-center">
        <div className="h-8 w-56 bg-stone-200 rounded mx-auto mb-3" />
        <div className="h-4 w-64 bg-stone-100 rounded mx-auto" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
            <div className="h-8 w-20 bg-stone-200 rounded mx-auto mb-2" />
            <div className="h-3 w-16 bg-stone-100 rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="h-5 w-40 bg-stone-200 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <div className="h-3 w-full bg-stone-100 rounded-full mb-1" />
              <div className="h-2 bg-stone-100 rounded-full" style={{ width: `${80 - i * 12}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
