import { supabase } from "@/lib/supabase";
import type { Word, NounForm, VerbForm, AdjectiveForm, Example } from "@/types/database";
import { POS_LABELS, posBadgeClass, cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import CopyButton from "./CopyButton";

export const revalidate = 86400;

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase.from("words").select("latin, turkish").eq("id", id).single();
  const w = data as { latin: string; turkish: string | null } | null;
  if (!w) return { title: "Kelime Bulunamadı" };
  return {
    title: w.latin,
    description: w.turkish ?? undefined,
  };
}

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

// ─── Tables ───────────────────────────────────────────────────────────────────
function NounTable({ forms }: { forms: NounForm[] }) {
  const byCase = (c: string, n: string) =>
    forms.find((f) => f.case === c && f.number === n)?.form ?? "—";

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-stone-50">
            <th className="px-4 py-2.5 text-left font-medium text-stone-500 border border-stone-200 text-xs uppercase tracking-wide">Hal</th>
            <th className="px-4 py-2.5 text-center font-medium text-stone-500 border border-stone-200 text-xs uppercase tracking-wide">Tekil</th>
            <th className="px-4 py-2.5 text-center font-medium text-stone-500 border border-stone-200 text-xs uppercase tracking-wide">Çoğul</th>
          </tr>
        </thead>
        <tbody>
          {CASES.map((c) => (
            <tr key={c} className="hover:bg-stone-50 transition-colors">
              <td className="px-4 py-2.5 font-medium text-stone-500 border border-stone-200 text-sm">{CASE_LABELS[c]}</td>
              <td className="px-4 py-2.5 text-center font-mono text-stone-800 border border-stone-200">{byCase(c, "sg")}</td>
              <td className="px-4 py-2.5 text-center font-mono text-stone-800 border border-stone-200">{byCase(c, "pl")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerbTable({ forms, mood, voice }: { forms: VerbForm[]; mood: string; voice: string }) {
  const filtered = forms.filter((f) => f.mood === mood && f.voice === voice);
  if (!filtered.length) return null;

  const byTensePerson = (t: string, p: number, n: string) =>
    filtered.find((f) => f.tense === t && f.person === p && f.number === n)?.form ?? "—";

  const activeTenses = TENSES.filter((t) => filtered.some((f) => f.tense === t));

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-stone-50">
            <th className="px-3 py-2.5 text-left font-medium text-stone-500 border border-stone-200 text-xs uppercase tracking-wide">Zaman</th>
            {["1sg","2sg","3sg","1pl","2pl","3pl"].map((k) => (
              <th key={k} className="px-3 py-2.5 text-center font-medium text-stone-500 border border-stone-200 text-xs uppercase tracking-wide">{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeTenses.map((t) => (
            <tr key={t} className="hover:bg-stone-50 transition-colors">
              <td className="px-3 py-2.5 font-medium text-stone-500 border border-stone-200 whitespace-nowrap text-sm">{TENSE_LABELS[t]}</td>
              {[1, 2, 3].flatMap((p) =>
                ["sg", "pl"].map((n) => (
                  <td key={`${p}${n}`} className="px-3 py-2.5 text-center font-mono text-stone-800 border border-stone-200">
                    {byTensePerson(t, p, n)}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdjectiveTable({ forms }: { forms: AdjectiveForm[] }) {
  const byAll = (c: string, n: string, g: string) =>
    forms.find((f) => f.case === c && f.number === n && f.gender === g)?.form ?? "—";
  const genders = ["m", "f", "n"];

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-stone-50">
            <th className="px-3 py-2.5 text-left font-medium text-stone-500 border border-stone-200 text-xs uppercase tracking-wide">Hal</th>
            {genders.flatMap((g) =>
              ["sg", "pl"].map((n) => (
                <th key={`${g}${n}`} className="px-3 py-2.5 text-center font-medium text-stone-500 border border-stone-200 text-xs uppercase tracking-wide">
                  {g.toUpperCase()} {n === "sg" ? "Tek" : "Çoğ"}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {CASES.map((c) => (
            <tr key={c} className="hover:bg-stone-50 transition-colors">
              <td className="px-3 py-2.5 font-medium text-stone-500 border border-stone-200 text-sm">{CASE_LABELS[c]}</td>
              {genders.flatMap((g) =>
                ["sg", "pl"].map((n) => (
                  <td key={`${g}${n}`} className="px-3 py-2.5 text-center font-mono text-stone-800 border border-stone-200">
                    {byAll(c, n, g)}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-5">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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

  // Benzer kelimeler
  let similarWords: Word[] = [];
  if (w.part_of_speech === "noun" && w.declension) {
    const { data } = await supabase
      .from("words").select("id, latin, turkish, part_of_speech, declension, gender, genitive")
      .eq("part_of_speech", "noun").eq("declension", w.declension)
      .neq("id", id).not("turkish", "is", null).limit(6);
    similarWords = (data ?? []) as Word[];
  } else if (w.part_of_speech === "verb" && w.conjugation) {
    const { data } = await supabase
      .from("words").select("id, latin, turkish, part_of_speech, conjugation, present_1sg")
      .eq("part_of_speech", "verb").eq("conjugation", w.conjugation)
      .neq("id", id).not("turkish", "is", null).limit(6);
    similarWords = (data ?? []) as Word[];
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 mb-5 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Sözlük
      </Link>

      {/* Başlık Kartı */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-bold text-stone-800 font-serif">{w.latin}</h1>
              <CopyButton text={w.latin} />
            </div>
            <div className="flex items-center gap-2.5 mt-2 flex-wrap text-stone-500">
              {w.genitive && <span>{w.genitive}</span>}
              {w.present_1sg && <span>{w.present_1sg}</span>}
              {w.infinitive && <span>{w.infinitive}</span>}
              {w.perfect && <span>{w.perfect}</span>}
              {w.supine && <span>{w.supine}</span>}
              {w.gender && <span className="italic">{w.gender}.</span>}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-stone-400">
              {w.declension && <span className="bg-stone-100 px-2 py-0.5 rounded-full">{w.declension}. deklinasyon</span>}
              {w.conjugation && <span className="bg-stone-100 px-2 py-0.5 rounded-full">{w.conjugation}. konjugasyon</span>}
            </div>
          </div>
          <span className={cn(posBadgeClass(w.part_of_speech), "shrink-0 text-sm px-3 py-1")}>
            {POS_LABELS[w.part_of_speech] ?? w.part_of_speech}
          </span>
        </div>

        <div className="mt-5 pt-5 border-t border-stone-100 space-y-3">
          {w.turkish && (
            <div>
              <p className="text-[11px] text-stone-400 uppercase tracking-widest font-medium mb-1">Türkçe</p>
              <p className="text-stone-800 font-medium">{w.turkish}</p>
            </div>
          )}
          {w.english && (
            <div>
              <p className="text-[11px] text-stone-400 uppercase tracking-widest font-medium mb-1">İngilizce</p>
              <p className="text-stone-500 text-sm italic">{w.english}</p>
            </div>
          )}
        </div>
      </div>

      {/* İsim Çekimi */}
      {(nounForms?.length ?? 0) > 0 && (
        <Section title="İsim Çekimi">
          <NounTable forms={nounForms as NounForm[]} />
        </Section>
      )}

      {/* Fiil Çekimi */}
      {(verbForms?.length ?? 0) > 0 && (
        <Section title="Fiil Çekimi">
          <div className="space-y-6">
            {MOODS.flatMap((mood) =>
              ["active", "passive"].map((voice) => {
                const has = (verbForms as VerbForm[]).some((f) => f.mood === mood && f.voice === voice);
                if (!has) return null;
                return (
                  <div key={`${mood}-${voice}`}>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                      {MOOD_LABELS[mood]} — {voice === "active" ? "Etken" : "Edilgen"}
                    </p>
                    <VerbTable forms={verbForms as VerbForm[]} mood={mood} voice={voice} />
                  </div>
                );
              })
            )}
          </div>
        </Section>
      )}

      {/* Sıfat Çekimi */}
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
              <div key={ex.id} className="border-l-2 border-stone-200 pl-4">
                <p className="font-serif text-stone-800 italic leading-relaxed">{ex.latin}</p>
                {ex.turkish && <p className="text-stone-600 text-sm mt-1">{ex.turkish}</p>}
                {ex.english && <p className="text-stone-400 text-xs mt-0.5">{ex.english}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Benzer Kelimeler */}
      {similarWords.length > 0 && (
        <Section
          title={
            w.part_of_speech === "noun"
              ? `${w.declension}. Deklinasyon — Diğer Kelimeler`
              : `${w.conjugation}. Konjugasyon — Diğer Kelimeler`
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {similarWords.map((sw) => (
              <Link
                key={sw.id}
                href={`/word/${sw.id}`}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 hover:border-stone-300 hover:bg-white transition-all"
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
