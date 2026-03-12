"use client";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type QuizWord = {
  id: string;
  latin: string;
  turkish: string | null;
  english: string | null;
  part_of_speech: string;
  genitive: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Kelime Testi: Türkçe → Latince ──────────────────────────────────────────
function VocabQuiz({ onBack }: { onBack: () => void }) {
  const [correct, setCorrect] = useState<QuizWord | null>(null);
  const [options, setOptions] = useState<QuizWord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  const next = useCallback(async () => {
    setLoading(true);
    setSelected(null);

    const offset = Math.floor(Math.random() * 28000);
    const { data } = await supabase
      .from("words")
      .select("id, latin, turkish, english, part_of_speech, genitive")
      .not("turkish", "is", null)
      .not("latin", "is", null)
      .range(offset, offset + 19);

    const pool = shuffle((data ?? []) as QuizWord[]).filter(
      (w) => w.turkish && w.turkish.trim().length > 0
    );
    if (pool.length < 4) { setLoading(false); return; }

    setCorrect(pool[0]);
    setOptions(shuffle([pool[0], pool[1], pool[2], pool[3]]));
    setLoading(false);
  }, []);

  useEffect(() => { next(); }, [next]);

  const pick = (id: string) => {
    if (selected) return;
    setSelected(id);
    if (id === correct?.id) {
      setScore((s) => ({ ...s, right: s.right + 1 }));
      setStreak((s) => s + 1);
    } else {
      setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
      setStreak(0);
    }
  };

  const total = score.right + score.wrong;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1">
          ← Geri
        </button>
        <div className="flex items-center gap-4">
          {streak >= 3 && (
            <span className="text-orange-500 text-sm font-medium">🔥 {streak} seri!</span>
          )}
          <span className="text-sm text-stone-500">
            <span className="text-green-600 font-semibold">{score.right}</span>
            <span className="text-stone-300 mx-1">/</span>
            <span className="text-red-500 font-semibold">{score.wrong}</span>
            {total > 0 && (
              <span className="text-stone-400 ml-2">({Math.round((score.right / total) * 100)}%)</span>
            )}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
        </div>
      ) : !correct ? (
        <p className="text-center text-stone-400 py-16">Soru yüklenemedi, tekrar deneyin.</p>
      ) : (
        <div className="max-w-lg mx-auto">
          {/* Soru kartı */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-10 mb-6 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">
              Bu kelimenin Latincesi nedir?
            </p>
            <p className="text-3xl font-bold text-stone-800 mb-2">{correct.turkish}</p>
            {correct.english && (
              <p className="text-sm text-stone-400 italic">({correct.english})</p>
            )}
          </div>

          {/* Seçenekler */}
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const isCorrect = opt.id === correct.id;
              const isSelected = selected === opt.id;
              let cls =
                "border-2 rounded-xl px-4 py-4 text-center font-semibold text-sm transition-all duration-150 ";
              if (!selected)
                cls += "border-stone-200 bg-white hover:border-stone-800 hover:shadow-sm text-stone-800 cursor-pointer";
              else if (isCorrect)
                cls += "border-green-500 bg-green-50 text-green-800";
              else if (isSelected)
                cls += "border-red-400 bg-red-50 text-red-700";
              else
                cls += "border-stone-100 bg-stone-50 text-stone-400 cursor-default";

              return (
                <button key={opt.id} onClick={() => pick(opt.id)} className={cls}>
                  {opt.latin}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-6 text-center animate-fade-in">
              {selected === correct.id ? (
                <div className="mb-4">
                  <p className="text-green-700 font-semibold text-lg">✓ Doğru!</p>
                  {correct.genitive && (
                    <p className="text-xs text-stone-400 mt-1">Gen: {correct.genitive}</p>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-red-600 font-semibold text-lg">✗ Yanlış</p>
                  <p className="text-stone-600 text-sm mt-1">
                    Doğru yanıt: <strong className="text-stone-800">{correct.latin}</strong>
                  </p>
                </div>
              )}
              <button
                onClick={next}
                className="bg-stone-800 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                Sonraki Soru →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Çekim Testi: Nominativus → Genitivus ─────────────────────────────────────
function DeclensionQuiz({ onBack }: { onBack: () => void }) {
  const [correct, setCorrect] = useState<QuizWord | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);

  const next = useCallback(async () => {
    setLoading(true);
    setSelected(null);

    const offset = Math.floor(Math.random() * 12000);
    const { data } = await supabase
      .from("words")
      .select("id, latin, turkish, english, part_of_speech, genitive")
      .eq("part_of_speech", "noun")
      .not("genitive", "is", null)
      .not("latin", "is", null)
      .range(offset, offset + 9);

    const pool = shuffle((data ?? []) as QuizWord[]).filter((w) => w.genitive);
    if (pool.length < 4) { setLoading(false); return; }

    setCorrect(pool[0]);
    setOptions(shuffle([pool[0].genitive!, pool[1].genitive!, pool[2].genitive!, pool[3].genitive!]));
    setLoading(false);
  }, []);

  useEffect(() => { next(); }, [next]);

  const pick = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    if (opt === correct?.genitive) setScore((s) => ({ ...s, right: s.right + 1 }));
    else setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
  };

  const total = score.right + score.wrong;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800">
          ← Geri
        </button>
        <span className="text-sm text-stone-500">
          <span className="text-green-600 font-semibold">{score.right}</span>
          <span className="text-stone-300 mx-1">/</span>
          <span className="text-red-500 font-semibold">{score.wrong}</span>
          {total > 0 && (
            <span className="text-stone-400 ml-2">({Math.round((score.right / total) * 100)}%)</span>
          )}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
        </div>
      ) : !correct ? (
        <p className="text-center text-stone-400 py-16">Soru yüklenemedi, tekrar deneyin.</p>
      ) : (
        <div className="max-w-lg mx-auto">
          {/* Soru kartı */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-10 mb-6 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">
              Kasus Sorusu
            </p>
            <p className="text-xs text-stone-400 mb-4">
              Bu ismin <span className="font-semibold text-stone-600">genetivus</span> hali nedir?
            </p>
            <p className="text-3xl font-bold text-stone-800 mb-2">{correct.latin}</p>
            {correct.turkish && (
              <p className="text-sm text-stone-500 italic">{correct.turkish}</p>
            )}
          </div>

          {/* Seçenekler */}
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const isCorrect = opt === correct.genitive;
              const isSelected = selected === opt;
              let cls =
                "border-2 rounded-xl px-4 py-4 text-center font-semibold text-sm transition-all duration-150 ";
              if (!selected)
                cls += "border-stone-200 bg-white hover:border-stone-800 hover:shadow-sm text-stone-800 cursor-pointer";
              else if (isCorrect)
                cls += "border-green-500 bg-green-50 text-green-800";
              else if (isSelected)
                cls += "border-red-400 bg-red-50 text-red-700";
              else
                cls += "border-stone-100 bg-stone-50 text-stone-400 cursor-default";

              return (
                <button key={opt} onClick={() => pick(opt)} className={cls}>
                  {opt}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-6 text-center">
              {selected === correct.genitive ? (
                <p className="text-green-700 font-semibold text-lg mb-4">✓ Doğru!</p>
              ) : (
                <div className="mb-4">
                  <p className="text-red-600 font-semibold text-lg">✗ Yanlış</p>
                  <p className="text-stone-600 text-sm mt-1">
                    Doğru yanıt: <strong className="text-stone-800">{correct.genitive}</strong>
                  </p>
                </div>
              )}
              <button
                onClick={next}
                className="bg-stone-800 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                Sonraki Soru →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Menü ─────────────────────────────────────────────────────────────────────
type Mode = "menu" | "vocab" | "declension";

const EXERCISE_CARDS = [
  {
    id: "vocab" as Mode,
    icon: "📝",
    label: "Kelime Testi",
    desc: "Türkçe anlamı verilen kelimenin Latincesini 4 seçenek arasından bul",
    active: true,
  },
  {
    id: "declension" as Mode,
    icon: "🏛️",
    label: "Çekim Testi",
    desc: "Latince ismin genetivus halini 4 seçenek arasından bul",
    active: true,
  },
  {
    id: "menu" as Mode,
    icon: "📖",
    label: "Cümle Tamamlama",
    desc: "Latince cümlelerdeki boşlukları doğru kelimeyle doldur",
    active: false,
    soon: true,
  },
  {
    id: "menu" as Mode,
    icon: "🔤",
    label: "Yazım Alıştırması",
    desc: "Türkçe anlamı verilen kelimenin Latince yazımını yaz",
    active: false,
    soon: true,
  },
  {
    id: "menu" as Mode,
    icon: "🗣️",
    label: "Telaffuz",
    desc: "Latince kelimelerin doğru okunuşunu öğren (sesli)",
    active: false,
    soon: true,
  },
  {
    id: "menu" as Mode,
    icon: "📅",
    label: "Tekrar Sistemi",
    desc: "Spaced repetition algoritmasıyla kişisel kelime listenizi çalış",
    active: false,
    soon: true,
  },
];

export default function ExercisesPage() {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "vocab") return <VocabQuiz onBack={() => setMode("menu")} />;
  if (mode === "declension") return <DeclensionQuiz onBack={() => setMode("menu")} />;

  return (
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Alıştırmalar</h1>
        <p className="text-stone-500 text-sm">
          Latince kelime haznenizi ve dilbilgisi bilginizi pekiştirin
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {EXERCISE_CARDS.map((card, i) => (
          <div key={i} className="relative">
            {card.active ? (
              <button
                onClick={() => setMode(card.id)}
                className="w-full text-left border border-stone-200 bg-white rounded-2xl p-6 hover:border-stone-400 hover:shadow-md transition-all group"
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h2 className="font-semibold text-stone-800 mb-1 group-hover:text-stone-900">
                  {card.label}
                </h2>
                <p className="text-xs text-stone-500 leading-relaxed">{card.desc}</p>
                <div className="mt-3">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Aktif
                  </span>
                </div>
              </button>
            ) : (
              <div className="w-full text-left border border-dashed border-stone-200 bg-stone-50/50 rounded-2xl p-6 opacity-70">
                <div className="text-3xl mb-3 grayscale">{card.icon}</div>
                <h2 className="font-semibold text-stone-600 mb-1">{card.label}</h2>
                <p className="text-xs text-stone-400 leading-relaxed">{card.desc}</p>
                <div className="mt-3">
                  <span className="text-xs bg-stone-200 text-stone-500 px-2 py-0.5 rounded-full font-medium">
                    Yakında
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>💡 Hedef:</strong> Her kelime öğrenildiğinde adaptif tekrar sistemi devreye girecek — yanlış yanıtlanan kelimeler daha sık sorulacak ve öğrenci ilerlemesi kişisel profilde izlenecek.
      </div>
    </div>
  );
}
