import { supabase } from "@/lib/supabase";
import type { Word, NounForm, VerbForm, AdjectiveForm, Example } from "@/types/database";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 86400; // 24 saat cache

const POS_LABELS: Record<string, string> = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf",
  preposition: "Edat", conjunction: "Bağlaç", pronoun: "Zamir",
  numeral: "Sayı", interjection: "Ünlem", particle: "Parçacık",
};

const CASES = ["nom", "gen", "dat", "acc", "abl", "voc"];
const CASE_LABELS: Record<string, string> = {
  nom: "Nominativus", gen: "Genitivus", dat: "Dativus",
  acc: "Accusativus", abl: "Ablativus", voc: "Vocativus",
};
const TENSES = ["pres", "imperf", "fut", "perf", "plup", "futperf"];
const TENSE_LABELS: Record<string, string> = {
  pres: "Praesens", imperf: "Imperfectum", fut: "Futurum",
  perf: "Perfectum", plup: "Plusquamperfectum", futperf: "Futurum Exactum",
};
const MOODS = ["indicative", "subjunctive", "imperative", "infinitive", "participle"];
const MOOD_LABELS: Record<string, string> = {
  indicative: "İndicativus", subjunctive: "Coniunctivus",
  imperative: "Imperativus", infinitive: "İnfinitivus", participle: "Participium",
};

// ─── Noun Table ───────────────────────────────────────────────────────────────
function NounTable({ forms }: { forms: NounForm[] }) {
  const byCase = (c: string, n: string) =>
    forms.find((f) => f.case === c && f.number === n)?.form ?? "—";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-stone-100">
            <th className="px-4 py-2 text-left font-semibold text-stone-600 border border-stone-200">Hal</th>
            <th className="px-4 py-2 text-center font-semibold text-stone-600 border border-stone-200">Tekil</th>
            <th className="px-4 py-2 text-center font-semibold text-stone-600 border border-stone-200">Çoğul</th>
          </tr>
        </thead>
        <tbody>
          {CASES.map((c) => (
            <tr key={c} className="even:bg-stone-50">
              <td className="px-4 py-2 font-medium text-stone-600 border border-stone-200">{CASE_LABELS[c]}</td>
              <td className="px-4 py-2 text-center font-mono text-stone-800 border border-stone-200">{byCase(c, "sg")}</td>
              <td className="px-4 py-2 text-center font-mono text-stone-800 border border-stone-200">{byCase(c, "pl")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Verb Table ───────────────────────────────────────────────────────────────
function VerbTable({ forms, mood, voice }: { forms: VerbForm[]; mood: string; voice: string }) {
  const filtered = forms.filter((f) => f.mood === mood && f.voice === voice);
  if (!filtered.length) return <p className="text-stone-400 text-sm py-2">Form bulunamadı.</p>;

  const byTensePerson = (t: string, p: number, n: string) =>
    filtered.find((f) => f.tense === t && f.person === p && f.number === n)?.form ?? "—";

  const activeTenses = TENSES.filter((t) => filtered.some((f) => f.tense === t));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-stone-100">
            <th className="px-3 py-2 text-left font-semibold text-stone-600 border border-stone-200">Zaman</th>
            {["1sg","2sg","3sg","1pl","2pl","3pl"].map(k => (
              <th key={k} className="px-3 py-2 text-center font-semibold text-stone-600 border border-stone-200">{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeTenses.map((t) => (
            <tr key={t} className="even:bg-stone-50">
              <td className="px-3 py-2 font-medium text-stone-600 border border-stone-200 whitespace-nowrap">{TENSE_LABELS[t]}</td>
              {[1,2,3].flatMap(p => ["sg","pl"].map(n => (
                <td key={`${p}${n}`} className="px-3 py-2 text-center font-mono text-stone-800 border border-stone-200">
                  {byTensePerson(t, p, n)}
                </td>
              )))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Adjective Table ──────────────────────────────────────────────────────────
function AdjectiveTable({ forms }: { forms: AdjectiveForm[] }) {
  const byAll = (c: string, n: string, g: string) =>
    forms.find((f) => f.case === c && f.number === n && f.gender === g)?.form ?? "—";
  const genders = ["m", "f", "n"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-stone-100">
            <th className="px-3 py-2 text-left font-semibold text-stone-600 border border-stone-200">Hal</th>
            {genders.flatMap(g => ["sg","pl"].map(n => (
              <th key={`${g}${n}`} className="px-3 py-2 text-center font-semibold text-stone-600 border border-stone-200">
                {g.toUpperCase()} {n === "sg" ? "Tek" : "Çoğ"}
              </th>
            )))}
          </tr>
        </thead>
        <tbody>
          {CASES.map((c) => (
            <tr key={c} className="even:bg-stone-50">
              <td className="px-3 py-2 font-medium text-stone-600 border border-stone-200">{CASE_LABELS[c]}</td>
              {genders.flatMap(g => ["sg","pl"].map(n => (
                <td key={`${g}${n}`} className="px-3 py-2 text-center font-mono text-stone-800 border border-stone-200">
                  {byAll(c, n, g)}
                </td>
              )))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default async function WordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: word }, { data: nounForms }, { data: verbForms }, { data: adjForms }, { data: examples }] =
    await Promise.all([
      supabase.from("words").select("*").eq("id", id).single(),
      supabase.from("noun_forms").select("*").eq("word_id", id),
      supabase.from("verb_forms").select("*").eq("word_id", id),
      supabase.from("adjective_forms").select("*").eq("word_id", id),
      supabase.from("examples").select("*").eq("word_id", id),
    ]);

  if (!word) notFound();
  const w = word as Word;

  // Benzer kelimeler: aynı deklinasyon/konjugasyon grubundan, farklı kelimeler
  let similarWords: Word[] = [];
  if (w.part_of_speech === "noun" && w.declension) {
    const { data } = await supabase
      .from("words")
      .select("id, latin, turkish, part_of_speech, declension, gender, genitive")
      .eq("part_of_speech", "noun")
      .eq("declension", w.declension)
      .neq("id", id)
      .not("turkish", "is", null)
      .limit(6);
    similarWords = (data ?? []) as Word[];
  } else if (w.part_of_speech === "verb" && w.conjugation) {
    const { data } = await supabase
      .from("words")
      .select("id, latin, turkish, part_of_speech, conjugation, present_1sg")
      .eq("part_of_speech", "verb")
      .eq("conjugation", w.conjugation)
      .neq("id", id)
      .not("turkish", "is", null)
      .limit(6);
    similarWords = (data ?? []) as Word[];
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Geri */}
      <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 mb-6 inline-block">
        ← Sözlüğe Dön
      </Link>

      {/* Başlık */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-stone-800 font-serif">{w.latin}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {w.genitive && <span className="text-stone-500">{w.genitive}</span>}
              {w.present_1sg && <span className="text-stone-500">{w.present_1sg}</span>}
              {w.infinitive && <span className="text-stone-500">{w.infinitive}</span>}
              {w.perfect && <span className="text-stone-500">{w.perfect}</span>}
              {w.supine && <span className="text-stone-500">{w.supine}</span>}
              {w.gender && <span className="text-stone-500 italic">{w.gender}.</span>}
              {w.declension && <span className="text-stone-400 text-sm">{w.declension}. deklinasyon</span>}
              {w.conjugation && <span className="text-stone-400 text-sm">{w.conjugation}. konjugasyon</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full font-medium">
              {POS_LABELS[w.part_of_speech] ?? w.part_of_speech}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-stone-100 pt-5">
          {w.turkish && (
            <div>
              <p className="text-xs text-stone-400 mb-1 uppercase tracking-wide">Türkçe</p>
              <p className="text-stone-800 font-medium">{w.turkish}</p>
            </div>
          )}
          {w.english && (
            <div>
              <p className="text-xs text-stone-400 mb-1 uppercase tracking-wide">İngilizce</p>
              <p className="text-stone-600 text-sm">{w.english}</p>
            </div>
          )}
        </div>
      </div>

      {/* Çekim Tabloları */}
      {(nounForms?.length ?? 0) > 0 && (
        <Section title="İsim Çekimi">
          <NounTable forms={nounForms as NounForm[]} />
        </Section>
      )}

      {(verbForms?.length ?? 0) > 0 && (
        <Section title="Fiil Çekimi">
          <div className="space-y-6">
            {MOODS.map((mood) =>
              ["active","passive"].map((voice) => {
                const has = (verbForms as VerbForm[]).some(f => f.mood === mood && f.voice === voice);
                if (!has) return null;
                return (
                  <div key={`${mood}-${voice}`}>
                    <h4 className="text-sm font-semibold text-stone-500 mb-2">
                      {MOOD_LABELS[mood]} — {voice === "active" ? "Etken" : "Edilgen"}
                    </h4>
                    <VerbTable forms={verbForms as VerbForm[]} mood={mood} voice={voice} />
                  </div>
                );
              })
            )}
          </div>
        </Section>
      )}

      {(adjForms?.length ?? 0) > 0 && (
        <Section title="Sıfat Çekimi">
          <AdjectiveTable forms={adjForms as AdjectiveForm[]} />
        </Section>
      )}

      {/* Örnek Cümleler */}
      {(examples?.length ?? 0) > 0 && (
        <Section title="Örnek Cümleler">
          <div className="space-y-4">
            {(examples as Example[]).map((ex) => (
              <div key={ex.id} className="border-l-2 border-stone-300 pl-4">
                <p className="font-serif text-stone-800 italic">{ex.latin}</p>
                {ex.turkish && <p className="text-stone-600 text-sm mt-1">{ex.turkish}</p>}
                {ex.english && <p className="text-stone-400 text-xs mt-0.5">{ex.english}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Benzer Kelimeler */}
      {similarWords.length > 0 && (
        <Section title={
          w.part_of_speech === "noun"
            ? `${w.declension}. Deklinasyon — Diğer Kelimeler`
            : `${w.conjugation}. Konjugasyon — Diğer Kelimeler`
        }>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {similarWords.map((sw) => (
              <Link
                key={sw.id}
                href={`/word/${sw.id}`}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 hover:border-stone-400 hover:bg-white transition-all"
              >
                <p className="font-semibold text-stone-800 text-sm">{sw.latin}</p>
                {sw.genitive && <p className="text-stone-400 text-xs">{sw.genitive}</p>}
                {sw.present_1sg && <p className="text-stone-400 text-xs">{sw.present_1sg}</p>}
                <p className="text-stone-500 text-xs mt-0.5 truncate">{sw.turkish}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-stone-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}
