export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="h-4 w-24 bg-stone-200 rounded mb-6" />
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
        <div className="h-10 w-48 bg-stone-200 rounded mb-4" />
        <div className="h-4 w-32 bg-stone-100 rounded mb-6" />
        <div className="h-4 w-64 bg-stone-100 rounded mb-2" />
        <div className="h-4 w-48 bg-stone-100 rounded" />
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
        <div className="h-5 w-32 bg-stone-200 rounded mb-4" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-stone-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
