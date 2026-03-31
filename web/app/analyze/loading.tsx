export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 text-center">
        <div className="h-8 w-40 bg-stone-200 rounded mx-auto mb-3" />
        <div className="h-4 w-72 bg-stone-100 rounded mx-auto" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4">
        <div className="flex gap-2 mb-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-6 w-28 bg-stone-100 rounded-full" />
          ))}
        </div>
        <div className="h-24 bg-stone-100 rounded-xl mb-3" />
        <div className="flex justify-end">
          <div className="h-9 w-28 bg-stone-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
