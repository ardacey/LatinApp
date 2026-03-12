import { supabase } from "@/lib/supabase";

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

  const { data: rawWords } = await supabase.from("words").select("part_of_speech") as {
    data: { part_of_speech: string }[] | null;
  };

  const posCountMap: Record<string, number> = {};
  (rawWords ?? []).forEach((w) => {
    posCountMap[w.part_of_speech] = (posCountMap[w.part_of_speech] ?? 0) + 1;
  });

  const posDist = Object.entries(posCountMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return { totalWords, totalNounForms, totalVerbForms, totalAdjForms, totalExamples, posDist };
}

const POS_LABELS: Record<string, string> = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf",
  preposition: "Edat", conjunction: "Bağlaç", pronoun: "Zamir",
  numeral: "Sayı", interjection: "Ünlem", particle: "Parçacık",
};

export default async function StatsPage() {
  const { totalWords, totalNounForms, totalVerbForms, totalAdjForms, totalExamples, posDist } =
    await getStats();

  const totalForms = (totalNounForms ?? 0) + (totalVerbForms ?? 0) + (totalAdjForms ?? 0);
  const maxPos = Math.max(...(posDist ?? []).map(([, v]) => v));

  const statCards = [
    { label: "Toplam Kelime", value: (totalWords ?? 0).toLocaleString("tr"), color: "text-stone-800" },
    { label: "İsim Formu", value: (totalNounForms ?? 0).toLocaleString("tr"), color: "text-amber-700" },
    { label: "Fiil Formu", value: (totalVerbForms ?? 0).toLocaleString("tr"), color: "text-red-700" },
    { label: "Sıfat Formu", value: (totalAdjForms ?? 0).toLocaleString("tr"), color: "text-sky-700" },
    { label: "Toplam Form", value: totalForms.toLocaleString("tr"), color: "text-stone-800" },
    { label: "Örnek Cümle", value: (totalExamples ?? 0).toLocaleString("tr"), color: "text-emerald-700" },
  ];

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-1">Veritabanı İstatistikleri</h1>
        <p className="text-stone-500 text-sm">Wiktionary'den derlenen Latince veri seti</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-stone-500 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-1 gap-6">
        {/* Sözcük Türü Dağılımı */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-stone-700 mb-4">Sözcük Türü Dağılımı</h2>
          <div className="space-y-3">
            {(posDist ?? []).map(([pos, count]) => (
              <div key={pos}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">{POS_LABELS[pos] ?? pos}</span>
                  <span className="text-stone-500 font-mono">{count.toLocaleString("tr")}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-700 rounded-full"
                    style={{ width: `${(count / maxPos) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Özellikler */}
      <div className="mt-6 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-stone-700 mb-4">Planlanan Özellikler</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ["🃏", "Flashcard (SRS)", "SM-2 algoritmasıyla akıllı tekrar sistemi"],
            ["📝", "Quiz Modu", "Anlam, form tanıma ve çekim quizleri"],
            ["📖", "Metin Okuyucu", "Caesar, Cicero metinleriyle okuma pratiği"],
            ["📊", "İlerleme Takibi", "Öğrenilen kelime sayısı ve günlük seri"],
            ["🔍", "Form Analizi", "Herhangi bir formu lemma'ya çevir"],
            ["🔔", "Akıllı Hatırlatmalar", "Günlük tekrar bildirimleri"],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3 p-3 rounded-lg bg-stone-50">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-medium text-stone-700 text-sm">{title}</p>
                <p className="text-stone-500 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
