"use client";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, Layers, CreditCard, MessageSquare, Volume2, RefreshCw, ChevronLeft, Flame, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

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

// ─── Shared Quiz Header ───────────────────────────────────────────────────────
function QuizHeader({
  onBack,
  score,
  streak,
}: {
  onBack: () => void;
  score: { right: number; wrong: number };
  streak?: number;
}) {
  const total = score.right + score.wrong;
  const pct = total > 0 ? Math.round((score.right / total) * 100) : null;

  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Geri
      </button>

      <div className="flex items-center gap-3">
        {streak !== undefined && streak >= 3 && (
          <span className="flex items-center gap-1 text-orange-500 text-sm font-semibold">
            <Flame className="w-4 h-4" />
            {streak} seri
          </span>
        )}
        <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-sm">
          <span className="text-green-600 font-semibold">{score.right}</span>
          <span className="text-stone-300">/</span>
          <span className="text-red-500 font-semibold">{score.wrong}</span>
          {pct !== null && (
            <span className="text-stone-400 text-xs ml-1">({pct}%)</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared Option Grid ───────────────────────────────────────────────────────
function OptionGrid<T extends string>({
  options,
  selected,
  correct,
  onPick,
  mono = false,
}: {
  options: T[];
  selected: T | null;
  correct: T;
  onPick: (v: T) => void;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const isCorrect = opt === correct;
        const isSelected = selected === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            disabled={!!selected}
            className={cn(
              "border-2 rounded-xl px-4 py-4 text-center font-semibold text-sm transition-all duration-150",
              mono && "font-mono",
              !selected && "border-stone-200 bg-white hover:border-stone-800 hover:shadow-sm text-stone-800 cursor-pointer",
              selected && isCorrect && "border-green-500 bg-green-50 text-green-800",
              selected && isSelected && !isCorrect && "border-red-400 bg-red-50 text-red-700",
              selected && !isCorrect && !isSelected && "border-stone-100 bg-stone-50 text-stone-400 cursor-default"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Shared Answer Feedback ───────────────────────────────────────────────────
function Feedback({
  correct,
  onNext,
  wrongAnswer,
  correctDisplay,
}: {
  correct: boolean;
  onNext: () => void;
  wrongAnswer?: boolean;
  correctDisplay?: string;
}) {
  return (
    <div className="mt-6 text-center">
      {correct ? (
        <div className="flex items-center justify-center gap-2 text-green-700 font-semibold text-lg mb-4">
          <Check className="w-5 h-5" />
          Doğru!
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2 text-red-600 font-semibold text-lg mb-1">
            <X className="w-5 h-5" />
            Yanlış
          </div>
          {wrongAnswer && correctDisplay && (
            <p className="text-stone-500 text-sm">
              Doğru yanıt:{" "}
              <strong className="text-stone-800 font-mono">{correctDisplay}</strong>
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onNext}
        className="bg-stone-800 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-700 transition-colors"
      >
        Sonraki →
      </button>
    </div>
  );
}

// ─── Kelime Testi ─────────────────────────────────────────────────────────────
function VocabQuiz({ onBack }: { onBack: () => void }) {
  const [correct, setCorrect] = useState<QuizWord | null>(null);
  const [options, setOptions] = useState<string[]>([]);
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
    const pool = shuffle((data ?? []) as QuizWord[]).filter((w) => w.turkish?.trim());
    if (pool.length < 4) { setLoading(false); return; }
    setCorrect(pool[0]);
    setOptions(shuffle([pool[0].latin, pool[1].latin, pool[2].latin, pool[3].latin]));
    setLoading(false);
  }, []);

  useEffect(() => { next(); }, [next]);

  const pick = (latin: string) => {
    if (selected) return;
    setSelected(latin);
    if (latin === correct?.latin) {
      setScore((s) => ({ ...s, right: s.right + 1 }));
      setStreak((s) => s + 1);
    } else {
      setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
      setStreak(0);
    }
  };

  return (
    <div>
      <QuizHeader onBack={onBack} score={score} streak={streak} />
      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
      ) : !correct ? (
        <p className="text-center text-stone-400 py-16">Soru yüklenemedi.</p>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-10 mb-6 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">Bu kelimenin Latincesi nedir?</p>
            <p className="text-3xl font-bold text-stone-800 mb-2">{correct.turkish}</p>
            {correct.english && <p className="text-sm text-stone-400 italic">({correct.english})</p>}
          </div>
          <OptionGrid
            options={options}
            selected={selected}
            correct={correct.latin}
            onPick={pick}
          />
          {selected && (
            <Feedback
              correct={selected === correct.latin}
              wrongAnswer={selected !== correct.latin}
              correctDisplay={correct.latin}
              onNext={next}
            />
          )}
          {selected && correct.genitive && selected === correct.latin && (
            <p className="text-center text-xs text-stone-400 mt-2">Gen: {correct.genitive}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Çekim Testi ──────────────────────────────────────────────────────────────
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

  return (
    <div>
      <QuizHeader onBack={onBack} score={score} />
      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
      ) : !correct ? (
        <p className="text-center text-stone-400 py-16">Soru yüklenemedi.</p>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-10 mb-6 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Kasus Sorusu</p>
            <p className="text-xs text-stone-400 mb-4">
              Bu ismin <span className="font-semibold text-stone-600">genetivus</span> hali nedir?
            </p>
            <p className="text-3xl font-bold text-stone-800 font-serif mb-2">{correct.latin}</p>
            {correct.turkish && <p className="text-sm text-stone-500 italic">{correct.turkish}</p>}
          </div>
          <OptionGrid
            options={options}
            selected={selected}
            correct={correct.genitive!}
            onPick={pick}
            mono
          />
          {selected && (
            <Feedback
              correct={selected === correct.genitive}
              wrongAnswer={selected !== correct.genitive}
              correctDisplay={correct.genitive ?? undefined}
              onNext={next}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fiil Çekimi ──────────────────────────────────────────────────────────────
const TENSE_LABELS: Record<string, string> = {
  pres: "Praesens", imperf: "Imperfectum", fut: "Futurum",
  perf: "Perfectum", plup: "Plusquamperfectum",
};
const PERSON_LABELS: Record<string, string> = {
  "1-sg": "1. tekil", "2-sg": "2. tekil", "3-sg": "3. tekil",
  "1-pl": "1. çoğul", "2-pl": "2. çoğul", "3-pl": "3. çoğul",
};

type VerbFormRow = {
  id: string; word_id: string; form: string;
  tense: string; mood: string; voice: string;
  person: number | null; number: string | null;
};

function ConjugationQuiz({ onBack }: { onBack: () => void }) {
  const [question, setQuestion] = useState<{
    verb: string; turkish: string; tense: string; person: number; number: string; correct: string;
  } | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);

  const next = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    const offset = Math.floor(Math.random() * 5000);
    const { data: words } = await supabase
      .from("words").select("id, latin, turkish")
      .eq("part_of_speech", "verb").not("present_1sg", "is", null)
      .range(offset, offset + 4);
    if (!words?.length) { setLoading(false); return; }
    const word = words[Math.floor(Math.random() * words.length)] as { id: string; latin: string; turkish: string | null };
    const { data: forms } = await supabase
      .from("verb_forms").select("id, word_id, form, tense, mood, voice, person, number")
      .eq("word_id", word.id).eq("mood", "indicative").eq("voice", "active")
      .in("tense", ["pres", "imperf", "fut", "perf"]);
    if (!forms || forms.length < 4) { setLoading(false); return; }
    const target = forms[Math.floor(Math.random() * forms.length)] as VerbFormRow;
    if (!target.person || !target.number) { setLoading(false); return; }
    const distractors = shuffle((forms as VerbFormRow[]).filter((f) => f.form !== target.form).map((f) => f.form)).slice(0, 3);
    if (distractors.length < 3) { setLoading(false); return; }
    setQuestion({ verb: word.latin, turkish: word.turkish ?? "", tense: target.tense, person: target.person, number: target.number, correct: target.form });
    setOptions(shuffle([target.form, ...distractors]));
    setLoading(false);
  }, []);

  useEffect(() => { next(); }, [next]);

  const pick = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    if (opt === question?.correct) setScore((s) => ({ ...s, right: s.right + 1 }));
    else setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
  };

  return (
    <div>
      <QuizHeader onBack={onBack} score={score} />
      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
      ) : !question ? (
        <p className="text-center text-stone-400 py-16">Soru yüklenemedi.</p>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-10 mb-6 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">Fiil Çekimi</p>
            <p className="text-3xl font-bold text-stone-800 font-serif mb-2">{question.verb}</p>
            {question.turkish && <p className="text-sm text-stone-500 italic mb-4">{question.turkish}</p>}
            <p className="text-stone-600 text-sm">
              <span className="font-semibold text-stone-800">{TENSE_LABELS[question.tense]}</span>
              {" — "}
              <span className="font-semibold text-stone-800">{PERSON_LABELS[`${question.person}-${question.number}`]}</span>
              {" — etken"}
            </p>
          </div>
          <OptionGrid options={options} selected={selected} correct={question.correct} onPick={pick} mono />
          {selected && (
            <Feedback
              correct={selected === question.correct}
              wrongAnswer={selected !== question.correct}
              correctDisplay={question.correct}
              onNext={next}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Flashcard Modu ───────────────────────────────────────────────────────────
function FlashcardMode({ onBack }: { onBack: () => void }) {
  const [card, setCard] = useState<QuizWord | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);

  const next = useCallback(async (knew?: boolean) => {
    if (knew !== undefined) {
      setScore((s) => (knew ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1 }));
    }
    setLoading(true);
    setFlipped(false);
    const offset = Math.floor(Math.random() * 30000);
    const { data } = await supabase
      .from("words").select("id, latin, turkish, english, part_of_speech, genitive")
      .not("turkish", "is", null).range(offset, offset).single();
    if (data) setCard(data as QuizWord);
    setLoading(false);
  }, []);

  useEffect(() => { next(); }, [next]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowRight" && flipped) next(true);
      if (e.key === "ArrowLeft" && flipped) next(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, next]);

  return (
    <div>
      <QuizHeader onBack={onBack} score={score} />
      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
      ) : !card ? (
        <p className="text-center text-stone-400 py-16">Kart yüklenemedi.</p>
      ) : (
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="w-full min-h-56 bg-white border-2 border-stone-200 rounded-2xl shadow-sm p-10 text-center hover:border-stone-400 transition-all cursor-pointer overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {!flipped ? (
                <motion.div key="front" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
                  <p className="text-xs text-stone-400 uppercase tracking-widest mb-6">Türkçesi nedir?</p>
                  <p className="text-4xl font-bold font-serif text-stone-800 mb-3">{card.latin}</p>
                  {card.genitive && <p className="text-stone-400 text-sm">{card.genitive}</p>}
                  <p className="text-stone-300 text-xs mt-6">Boşluk tuşuna bas veya kartı tıkla</p>
                </motion.div>
              ) : (
                <motion.div key="back" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
                  <p className="text-xs text-stone-400 uppercase tracking-widest mb-6">Cevap</p>
                  <p className="text-3xl font-bold text-stone-800 mb-2">{card.turkish}</p>
                  {card.english && <p className="text-stone-500 text-sm italic">{card.english}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {flipped && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
                className="flex gap-3 mt-4"
              >
                <button type="button" onClick={() => next(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors">
                  <X className="w-4 h-4" /> Bilmedim
                </button>
                <button type="button" onClick={() => next(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-green-200 bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors">
                  <Check className="w-4 h-4" /> Bildim
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-stone-300 mt-4">
            {flipped ? "← Bilmedim · Bildim →" : "Boşluk: çevir"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Menü ─────────────────────────────────────────────────────────────────────
type Mode = "menu" | "vocab" | "declension" | "conjugation" | "flashcard";

const EXERCISE_CARDS = [
  {
    id: "vocab" as Mode,
    icon: BookOpen,
    label: "Kelime Testi",
    desc: "Türkçe anlamı verilen kelimenin Latincesini 4 seçenek arasından bul",
    active: true,
    color: "text-amber-700",
    iconBg: "bg-amber-50",
  },
  {
    id: "declension" as Mode,
    icon: Layers,
    label: "Çekim Testi",
    desc: "Latince ismin genetivus halini 4 seçenek arasından bul",
    active: true,
    color: "text-sky-700",
    iconBg: "bg-sky-50",
  },
  {
    id: "conjugation" as Mode,
    icon: GraduationCap,
    label: "Fiil Çekimi",
    desc: "Verilen zaman ve şahıs için fiilin doğru çekimini bul",
    active: true,
    color: "text-red-700",
    iconBg: "bg-red-50",
  },
  {
    id: "flashcard" as Mode,
    icon: CreditCard,
    label: "Flashcard",
    desc: "Kelimeyi gör, Türkçesini tahmin et — boşluk tuşuyla çevir",
    active: true,
    color: "text-purple-700",
    iconBg: "bg-purple-50",
  },
  {
    id: "menu" as Mode,
    icon: MessageSquare,
    label: "Cümle Tamamlama",
    desc: "Latince cümlelerdeki boşlukları doğru kelimeyle doldur",
    active: false,
  },
  {
    id: "menu" as Mode,
    icon: Volume2,
    label: "Telaffuz",
    desc: "Latince kelimelerin doğru okunuşunu öğren",
    active: false,
  },
  {
    id: "menu" as Mode,
    icon: RefreshCw,
    label: "Tekrar Sistemi",
    desc: "Spaced repetition ile kişisel kelime listenizi çalış",
    active: false,
  },
];

export default function ExercisesPage() {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "vocab") return <VocabQuiz onBack={() => setMode("menu")} />;
  if (mode === "declension") return <DeclensionQuiz onBack={() => setMode("menu")} />;
  if (mode === "conjugation") return <ConjugationQuiz onBack={() => setMode("menu")} />;
  if (mode === "flashcard") return <FlashcardMode onBack={() => setMode("menu")} />;

  return (
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Alıştırmalar</h1>
        <p className="text-stone-500 text-sm">
          Latince kelime haznenizi ve dilbilgisi bilginizi pekiştirin
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {EXERCISE_CARDS.map((card, i) => {
          const Icon = card.icon;
          if (card.active) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => setMode(card.id)}
                className="w-full text-left border border-stone-200 bg-white rounded-2xl p-6 hover:border-stone-300 hover:shadow-md transition-all group"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", card.iconBg)}>
                  <Icon className={cn("w-5 h-5", card.color)} strokeWidth={2} />
                </div>
                <h2 className="font-semibold text-stone-800 mb-1 group-hover:text-stone-900">
                  {card.label}
                </h2>
                <p className="text-xs text-stone-500 leading-relaxed">{card.desc}</p>
                <div className="mt-4">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Aktif
                  </span>
                </div>
              </button>
            );
          }
          return (
            <div
              key={i}
              className="border border-dashed border-stone-200 bg-stone-50/50 rounded-2xl p-6 opacity-60"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-stone-100">
                <Icon className="w-5 h-5 text-stone-400" strokeWidth={2} />
              </div>
              <h2 className="font-semibold text-stone-500 mb-1">{card.label}</h2>
              <p className="text-xs text-stone-400 leading-relaxed">{card.desc}</p>
              <div className="mt-4">
                <span className="text-xs bg-stone-200 text-stone-500 px-2 py-0.5 rounded-full font-medium">
                  Yakında
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
