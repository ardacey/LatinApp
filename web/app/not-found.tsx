import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <BookOpen className="w-12 h-12 text-stone-300 mb-4" strokeWidth={1.5} />
      <h1 className="text-4xl font-bold text-stone-800 mb-2">404</h1>
      <p className="text-stone-500 mb-6">Aradığınız sayfa bulunamadı.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Sözlüğe Dön
      </Link>
    </div>
  );
}
