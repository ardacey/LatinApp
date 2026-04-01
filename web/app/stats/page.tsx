import { supabase } from "@/lib/supabase";
import { POS_LABELS, POS_COLORS, cn } from "@/lib/utils";

/** Explicit bar fill colors per POS — avoids fragile string splitting on POS_COLORS */
const POS_BAR_COLORS: Record<string, string> = {
  noun:         "bg-amber-400",
  verb:         "bg-red-400",
  adjective:    "bg-sky-400",
  adverb:       "bg-purple-400",
  preposition:  "bg-orange-400",
  conjunction:  "bg-pink-400",
  pronoun:      "bg-teal-400",
  numeral:      "bg-green-400",
  interjection: "bg-yellow-400",
  particle:     "bg-slate-400",
};
import type { Metadata } from "next";
import { BookText, AlignLeft, Type, Columns, FileText, BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "İstatistikler" };
export const revalidate = 3600;

async function getStats() {
  const [
    { count: totalWords },
    { count: totalNounForms },
    { count: totalVerbForms },
    { count: totalAdjForms },
    { count: totalExamples },
  ] = await Promise.all([
    supabase.from("words").select("*", { count: "exact", head: true }),
    supabase.from("noun_forms").select("*", { count: "exact", head: true }),
    supabase.from("verb_forms").select("*", { count: "exact", head: true }),
    supabase.from("adjective_forms").select("*", { count: "exact", head: true }),
    supabase.from("examples").select("*", { count: "exact", head: true }),
  ]);

  const POS_TYPES = [
    "noun", "verb", "adjective", "adverb", "preposition",
    "conjunction", "pronoun", "numeral", "interjection", "particle",
  ];
  const posCounts = await Promise.all(
    POS_TYPES.map((pos) =>
      supabase
        .from("words")
        .select("*", { count: "exact", head: true })
        .eq("part_of_speech", pos)
        .then(({ count }) => [pos, count ?? 0] as [string, number])
    )
  );
  const posDist = posCounts.filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);

  return { totalWords, totalNounForms, totalVerbForms, totalAdjForms, totalExamples, posDist };
}

export default async function StatsPage() {
  const { totalWords, totalNounForms, totalVerbForms, totalAdjForms, totalExamples, posDist } =
    await getStats();

  const totalForms = (totalNounForms ?? 0) + (totalVerbForms ?? 0) + (totalAdjForms ?? 0);
  const maxPos = Math.max(...(posDist ?? []).map(([, v]) => v));

  const statCards = [
    {
      label: "Toplam Kelime",
      value: (totalWords ?? 0).toLocaleString("tr"),
      icon: BookOpen,
      color: "text-stone-800",
      iconBg: "bg-stone-100",
    },
    {
      label: "İsim Formu",
      value: (totalNounForms ?? 0).toLocaleString("tr"),
      icon: BookText,
      color: "text-amber-700",
      iconBg: "bg-amber-50",
    },
    {
      label: "Fiil Formu",
      value: (totalVerbForms ?? 0).toLocaleString("tr"),
      icon: AlignLeft,
      color: "text-red-700",
      iconBg: "bg-red-50",
    },
    {
      label: "Sıfat Formu",
      value: (totalAdjForms ?? 0).toLocaleString("tr"),
      icon: Type,
      color: "text-sky-700",
      iconBg: "bg-sky-50",
    },
    {
      label: "Toplam Form",
      value: totalForms.toLocaleString("tr"),
      icon: Columns,
      color: "text-stone-800",
      iconBg: "bg-stone-100",
    },
    {
      label: "Örnek Cümle",
      value: (totalExamples ?? 0).toLocaleString("tr"),
      icon: FileText,
      color: "text-emerald-700",
      iconBg: "bg-emerald-50",
    },
  ];

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-1">Veritabanı İstatistikleri</h1>
        <p className="text-stone-500 text-sm">Wiktionary&rsquo;den derlenen Latince veri seti</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col items-center text-center gap-2"
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", s.iconBg)}>
              <s.icon className={cn("w-4 h-4", s.color)} strokeWidth={2} />
            </div>
            <p className={cn("text-3xl font-bold", s.color)}>{s.value}</p>
            <p className="text-stone-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* POS Dağılımı */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-stone-700 mb-5">Sözcük Türü Dağılımı</h2>
        <div className="space-y-3">
          {(posDist ?? []).map(([pos, count]) => {
            const pct = Math.round((count / maxPos) * 100);
            const colorClass = POS_COLORS[pos] ?? "bg-stone-50 text-stone-700 border-stone-200";
            const barColor = POS_BAR_COLORS[pos] ?? "bg-stone-400";
            return (
              <div key={pos}>
                <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium border",
                        colorClass
                      )}
                    >
                      {POS_LABELS[pos] ?? pos}
                    </span>
                  </div>
                  <span className="text-stone-500 font-mono text-xs tabular-nums">
                    {count.toLocaleString("tr")}
                  </span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all bar-fill", barColor)}
                    style={{ "--bar-fill": `${pct}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
