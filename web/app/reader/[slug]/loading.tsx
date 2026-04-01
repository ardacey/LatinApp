export default function ReaderLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-20 bg-stone-100 rounded mb-6" />
      <div className="h-6 w-48 bg-stone-100 rounded mb-1" />
      <div className="h-8 w-80 bg-stone-200 rounded mb-2" />
      <div className="h-4 w-64 bg-stone-100 rounded mb-8" />
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-stone-100 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
