import Link from "next/link";
import { Scroll, Clock, ChevronRight } from "lucide-react";
import { TEXTS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "@/lib/texts";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metinler",
  description: "Klasik Latince metinleri kelime kelime okuyun ve analiz edin.",
};

export default function ReaderListPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-1">Latince Metinler</h1>
        <p className="text-stone-500 text-sm">
          Klasik eserleri oku — her kelimeye tıklayarak anlam ve gramer bilgisine ulaş
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TEXTS.map((text) => (
          <Link
            key={text.slug}
            href={`/reader/${text.slug}`}
            className="group bg-white border border-stone-200 rounded-2xl shadow-sm p-5 hover:border-stone-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-400 mb-0.5">{text.author}</p>
                <h2 className="font-semibold text-stone-800 text-sm leading-snug">{text.title}</h2>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", DIFFICULTY_COLORS[text.difficulty])}>
                  {DIFFICULTY_LABELS[text.difficulty]}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed mb-3 line-clamp-2">
              {text.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-stone-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {text.century}
                </span>
                <span className="flex items-center gap-1">
                  <Scroll className="w-3 h-3" />
                  {text.sections.length} bölüm
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
