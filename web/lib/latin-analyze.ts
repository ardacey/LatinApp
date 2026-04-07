// ─── Paylaşılan Latince analiz mantığı ───────────────────────────────────────
// analyze/page.tsx ve reader sayfası tarafından ortak kullanılır

export const CASE_LABELS: Record<string, string> = {
  nom: "Nominativus", gen: "Genitivus", dat: "Dativus",
  acc: "Accusativus", abl: "Ablativus", voc: "Vocativus",
};
export const TENSE_LABELS: Record<string, string> = {
  pres: "Praesens", imperf: "Imperfectum", fut: "Futurum",
  perf: "Perfectum", plup: "Plusquamperfectum", futperf: "Fut. Exactum",
};
export const MOOD_LABELS: Record<string, string> = {
  indicative: "İndicativus", subjunctive: "Coniunctivus",
  imperative: "Imperativus", infinitive: "İnfinitivus", participle: "Participium",
};
export const VOICE_LABELS: Record<string, string> = { active: "Etken", passive: "Edilgen" };
export const NUMBER_LABELS: Record<string, string> = { sg: "Tekil", pl: "Çoğul" };
export const GENDER_LABELS: Record<string, string> = { m: "Eril", f: "Dişil", n: "Nötr" };

export const PRIORITY = ["sıfat formu", "fiil formu", "isim formu", "sözlük"];

// ─── Tipler ──────────────────────────────────────────────────────────────────
export type WordInfo = {
  latin: string;
  turkish: string | null;
  english: string | null;
  part_of_speech: string;
  via: string;
  word_id: string;
  form_case: string | null;
  form_number: string | null;
  form_tense: string | null;
  form_mood: string | null;
  form_voice: string | null;
  form_person: number | null;
  form_gender: string | null;
};

export type Token = { text: string; isWord: boolean; info?: WordInfo };

type RpcRow = {
  normalized_form: string;
  latin: string;
  turkish: string | null;
  english: string | null;
  part_of_speech: string;
  via: string;
  word_id: string;
  form_case: string | null;
  form_number: string | null;
  form_tense: string | null;
  form_mood: string | null;
  form_voice: string | null;
  form_person: number | null;
  form_gender: string | null;
};

// ─── Yardımcı fonksiyonlar ───────────────────────────────────────────────────
const MACRON_STRIP: Record<string, string> = {
  ā: "a", ē: "e", ī: "i", ō: "o", ū: "u",
  Ā: "a", Ē: "e", Ī: "i", Ō: "o", Ū: "u",
};

export function normKey(s: string): string {
  return s.toLowerCase().replace(/[āēīōūĀĒĪŌŪ]/g, (c) => MACRON_STRIP[c] ?? c);
}

export function stripEnclitic(norm: string): string | null {
  if (norm.length > 4 && norm.endsWith("que")) return norm.slice(0, -3);
  if (norm.length > 3 && norm.endsWith("ne"))  return norm.slice(0, -2);
  if (norm.length > 3 && norm.endsWith("ve"))  return norm.slice(0, -2);
  return null;
}

export function tokenize(raw: string): Token[] {
  const parts = raw.match(/[A-Za-zāēīōūĀĒĪŌŪ]+|[^A-Za-zāēīōūĀĒĪŌŪ]+/g) ?? [];
  return parts.map((p) => ({ text: p, isWord: /[A-Za-zāēīōūĀĒĪŌŪ]/.test(p) }));
}

export function formatMorphology(info: WordInfo): string | null {
  if (info.via === "sözlük" || info.via === "yaklaşık") return null;
  const parts: string[] = [];
  if (info.form_tense)  parts.push(TENSE_LABELS[info.form_tense]  ?? info.form_tense);
  if (info.form_mood)   parts.push(MOOD_LABELS[info.form_mood]    ?? info.form_mood);
  if (info.form_voice)  parts.push(VOICE_LABELS[info.form_voice]  ?? info.form_voice);
  if (info.form_person && info.form_number)
    parts.push(`${info.form_person}. ${NUMBER_LABELS[info.form_number] ?? info.form_number}`);
  if (info.form_case)   parts.push(CASE_LABELS[info.form_case]    ?? info.form_case);
  if (info.form_number && !info.form_tense)
    parts.push(NUMBER_LABELS[info.form_number] ?? info.form_number);
  if (info.form_gender) parts.push(GENDER_LABELS[info.form_gender] ?? info.form_gender);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// ─── RPC çağrısı ─────────────────────────────────────────────────────────────
export async function analyzeText(
  text: string
): Promise<{ tokens: Token[]; error?: string }> {
  const tokens = tokenize(text);
  const encliticOf = new Map<string, string>();
  const uniqueSet = new Set<string>();

  for (const t of tokens) {
    if (!t.isWord) continue;
    const norm = normKey(t.text);
    uniqueSet.add(norm);
    const stripped = stripEnclitic(norm);
    if (stripped) { uniqueSet.add(stripped); encliticOf.set(norm, stripped); }
  }

  const unique = [...uniqueSet];
  if (unique.length === 0) return { tokens };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const BATCH = 20;
  let rows: RpcRow[] = [];
  try {
    const batches: string[][] = [];
    for (let i = 0; i < unique.length; i += BATCH) batches.push(unique.slice(i, i + BATCH));

    const results = await Promise.all(
      batches.map((batch) =>
        fetch(`${supabaseUrl}/rest/v1/rpc/search_latin_words`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey!,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ input_words: batch }),
        }).then(async (res) => {
          if (!res.ok) throw new Error(`RPC hatası ${res.status}: ${await res.text()}`);
          return res.json() as Promise<RpcRow[]>;
        })
      )
    );
    rows = results.flat();
  } catch (e) {
    return { tokens, error: String(e) };
  }

  const map = new Map<string, WordInfo>();
  for (const row of rows) {
    const existing = map.get(row.normalized_form);
    if (!existing || PRIORITY.indexOf(row.via) > PRIORITY.indexOf(existing.via)) {
      map.set(row.normalized_form, {
        latin: row.latin, turkish: row.turkish, english: row.english,
        part_of_speech: row.part_of_speech, via: row.via, word_id: row.word_id,
        form_case: row.form_case, form_number: row.form_number,
        form_tense: row.form_tense, form_mood: row.form_mood, form_voice: row.form_voice,
        form_person: row.form_person, form_gender: row.form_gender,
      });
    }
  }

  return {
    tokens: tokens.map((t) => {
      if (!t.isWord) return t;
      const norm = normKey(t.text);
      const info = map.get(norm) ?? (encliticOf.get(norm) ? map.get(encliticOf.get(norm)!) : undefined);
      return { ...t, info };
    }),
  };
}
