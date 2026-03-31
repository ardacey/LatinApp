export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-10 text-center">
        <div className="h-8 w-40 bg-stone-200 rounded mx-auto mb-3" />
        <div className="h-4 w-64 bg-stone-100 rounded mx-auto" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-stone-200 bg-white rounded-2xl p-6">
            <div className="w-10 h-10 bg-stone-200 rounded-xl mb-4" />
            <div className="h-4 w-28 bg-stone-200 rounded mb-2" />
            <div className="h-3 w-full bg-stone-100 rounded mb-1" />
            <div className="h-3 w-3/4 bg-stone-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
