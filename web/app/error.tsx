"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <AlertTriangle className="w-12 h-12 text-red-300 mb-4" strokeWidth={1.5} />
      <h2 className="text-2xl font-bold text-stone-800 mb-2">Bir şeyler ters gitti</h2>
      <p className="text-stone-500 mb-6 max-w-sm text-sm">
        Sayfa yüklenirken beklenmedik bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Tekrar Dene
      </button>
    </div>
  );
}
