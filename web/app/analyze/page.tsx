"use client";
import { useState } from "react";

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const EXAMPLES = [
  {
    label: "Caesar — De Bello Gallico",
    text: "Gallia est omnis divisa in partes tres quarum unam incolunt Belgae aliam Aquitani tertiam qui ipsorum lingua Celtae nostra Galli appellantur",
  },
  {
    label: "Cicero — De Re Publica",
    text: "Salus populi suprema lex esto",
  },
  {
    label: "Vergilius — Aeneis I.1",
    text: "Arma virumque cano Troiae qui primus ab oris Italiam fato profugus Laviniaque venit litora",
  },
  {
    label: "Plinius Maior — Naturalis Historia",
    text: "In vino veritas",
  },
];

const POS_TR: Record<string, string> = {
  noun: "İsim",
  verb: "Fiil",
  adjective: "Sıfat",
  adverb: "Zarf",
  preposition: "Edat",
  conjunction: "Bağlaç",
  pronoun: "Zamir",
  numeral: "Sayı",
  interjection: "Ünlem",
  particle: "Parçacık",
};

const POS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  noun:        { bg: "bg-amber-100",  text: "text-amber-900",  border: "border-amber-300" },
  verb:        { bg: "bg-red-100",    text: "text-red-900",    border: "border-red-300" },
  adjective:   { bg: "bg-blue-100",   text: "text-blue-900",   border: "border-blue-300" },
  adverb:      { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300" },
  preposition: { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300" },
  conjunction: { bg: "bg-pink-100",   text: "text-pink-900",   border: "border-pink-300" },
  pronoun:     { bg: "bg-teal-100",   text: "text-teal-900",   border: "border-teal-300" },
  numeral:     { bg: "bg-green-100",  text: "text-green-900",  border: "border-green-300" },
};

// ─── Tipler ───────────────────────────────────────────────────────────────────
type WordInfo = {
  latin: string;
  turkish: string | null;
  english: string | null;
  part_of_speech: string;
  via: string;
};

type Token = {
  text: string;
  isWord: boolean;
  info?: WordInfo;
};

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
const MACRON_STRIP: Record<string, string> = {
  ā: "a", ē: "e", ī: "i", ō: "o", ū: "u",
  Ā: "a", Ē: "e", Ī: "i", Ō: "o", Ū: "u",
};

/** Makronları siler ve küçük harfe çevirir → sözlük arama anahtarı */
function normKey(s: string): string {
  return s.toLowerCase().replace(/[āēīōūĀĒĪŌŪ]/g, (c) => MACRON_STRIP[c] ?? c);
}

/**
 * Latince enklitikleri soyar: -que (ve), -ne (soru), -ve (veya)
 * Örn: "virumque" → "virum", "Laviniaque" → "Lavinia"
 * Çok kısa sonuçları atla (min 2 harf kalmalı)
 */
function stripEnclitic(norm: string): string | null {
  if (norm.length > 4 && norm.endsWith("que")) return norm.slice(0, -3);
  if (norm.length > 3 && norm.endsWith("ne"))  return norm.slice(0, -2);
  if (norm.length > 3 && norm.endsWith("ve"))  return norm.slice(0, -2);
  return null;
}

function tokenize(raw: string): Token[] {
  // Latince metni kelimelere ve ayraçlara böl (makron harflerini de koru)
  const parts = raw.match(/[A-Za-zāēīōūĀĒĪŌŪ]+|[^A-Za-zāēīōūĀĒĪŌŪ]+/g) ?? [];
  return parts.map((p) => ({
    text: p,
    isWord: /[A-Za-zāēīōūĀĒĪŌŪ]/.test(p),
  }));
}

type RpcRow = {
  normalized_form: string;
  latin: string;
  turkish: string | null;
  english: string | null;
  part_of_speech: string;
  via: string;
};

// Öncelik (düşükten yükseğe): sıfat formu < fiil formu < isim formu < sözlük
const PRIORITY = ["sıfat formu", "fiil formu", "isim formu", "sözlük"];

async function analyze(text: string): Promise<{ tokens: Token[]; error?: string }> {
  const tokens = tokenize(text);

  // Enklitik haritası: orijinal norm → enklitik soyulmuş norm
  const encliticOf = new Map<string, string>();
  const uniqueSet = new Set<string>();
  for (const t of tokens) {
    if (!t.isWord) continue;
    const norm = normKey(t.text);
    uniqueSet.add(norm);
    const stripped = stripEnclitic(norm);
    if (stripped) {
      uniqueSet.add(stripped);
      encliticOf.set(norm, stripped);
    }
  }
  const unique = [...uniqueSet];

  if (unique.length === 0) return { tokens };

  // Supabase RPC — doğrudan fetch kullanıyoruz (supabase-js tip uyumsuzluğunu atlamak için)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let rows: RpcRow[] = [];
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/search_latin_words`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey!,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ input_words: unique }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { tokens, error: `RPC hatası ${res.status}: ${errBody}` };
    }

    const json = await res.json();
    if (Array.isArray(json)) {
      rows = json as RpcRow[];
    } else if (json?.message) {
      return { tokens, error: json.message };
    }
  } catch (e) {
    return { tokens, error: String(e) };
  }

  const map = new Map<string, WordInfo>();
  for (const row of rows) {
    const existing = map.get(row.normalized_form);
    if (!existing || PRIORITY.indexOf(row.via) > PRIORITY.indexOf(existing.via)) {
      map.set(row.normalized_form, {
        latin: row.latin,
        turkish: row.turkish,
        english: row.english,
        part_of_speech: row.part_of_speech,
        via: row.via,
      });
    }
  }

  return {
    tokens: tokens.map((t) => {
      if (!t.isWord) return t;
      const norm = normKey(t.text);
      // Önce doğrudan ara, bulamazsan enklitik soyulmuş forma bak
      const info = map.get(norm) ?? (encliticOf.get(norm) ? map.get(encliticOf.get(norm)!) : undefined);
      return { ...t, info };
    }),
  };
}

// ─── Kelime Tooltip Bileşeni ───────────────────────────────────────────────────
function WordToken({ token }: { token: Token }) {
  const [open, setOpen] = useState(false);

  if (!token.isWord) {
    return <span className="whitespace-pre-wrap">{token.text}</span>;
  }

  if (!token.info) {
    return (
      <span className="text-stone-400 italic" title="Sözlükte bulunamadı">
        {token.text}
      </span>
    );
  }

  const isApprox = token.info.via === "yaklaşık";
  const c = isApprox
    ? { bg: "bg-stone-100", text: "text-stone-500", border: "border-stone-300" }
    : (POS_COLORS[token.info.part_of_speech] ?? {
        bg: "bg-stone-100",
        text: "text-stone-700",
        border: "border-stone-300",
      });

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-block rounded px-0.5 py-0 border ${
          isApprox
            ? "border-dashed border-stone-300 bg-stone-50 text-stone-400"
            : `${c.bg} ${c.text} ${c.border}`
        } font-medium cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {token.text}
      </button>
      {open && (
        <span
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-56 rounded-xl border shadow-lg p-3 text-xs ${c.bg} ${c.border} ${c.text}`}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-1.5 right-2 opacity-50 hover:opacity-100 text-xs"
          >
            ✕
          </button>
          {isApprox && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-2 text-[10px] text-amber-700">
              ⚠️ Yaklaşık eşleşme — doğruluğu sınırlı
            </div>
          )}
          <div className="font-bold text-sm mb-1">{token.info.latin}</div>
          {token.info.turkish && <div className="mb-0.5">🇹🇷 {token.info.turkish}</div>}
          {token.info.english && (
            <div className="opacity-70 mb-1">🇬🇧 {token.info.english}</div>
          )}
          <div className="flex gap-1 flex-wrap mt-1">
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${c.border}`}>
              {POS_TR[token.info.part_of_speech] ?? token.info.part_of_speech}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] border font-medium ${
              isApprox
                ? "border-amber-300 text-amber-700 bg-amber-50"
                : "border-stone-300 text-stone-500 bg-white"
            }`}>
              {token.info.via}
            </span>
          </div>
          <a
            href={`/admin?q=${encodeURIComponent(token.info.latin)}`}
            className="mt-2 block text-[10px] text-stone-400 hover:text-stone-600 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Çeviriyi düzenle →
          </a>
        </span>
      )}
    </span>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const [input, setInput] = useState("");
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setTokens(null);
    setRpcError(null);
    const result = await analyze(input);
    setTokens(result.tokens);
    if (result.error) setRpcError(result.error);
    setLoading(false);
  };

  const wordTokens = tokens?.filter((t) => t.isWord) ?? [];
  const found = wordTokens.filter((t) => t.info).length;
  const total = wordTokens.length;

  const byPos: Record<string, number> = {};
  for (const t of wordTokens) {
    if (t.info) byPos[t.info.part_of_speech] = (byPos[t.info.part_of_speech] ?? 0) + 1;
  }

  return (
    <div>
      {/* Başlık */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Metin Analizi</h1>
        <p className="text-stone-500 text-sm">
          Latince metni yapıştırın — her kelime sözlükte anında aranır
        </p>
      </div>

      {/* Giriş Alanı */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setInput(ex.text)}
              className="text-xs border border-stone-200 rounded-full px-3 py-1 text-stone-600 hover:border-stone-500 hover:text-stone-800 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Latince metni buraya yapıştırın…"
          rows={4}
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={run}
            disabled={loading || !input.trim()}
            className="bg-stone-800 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? "Analiz ediliyor…" : "Analiz Et"}
          </button>
        </div>
      </div>

      {/* Renk Açıklaması */}
      <div className="flex flex-wrap gap-2 mb-6 text-xs">
        {Object.entries(POS_TR).map(([pos, tr]) => {
          const c = POS_COLORS[pos];
          if (!c) return null;
          return (
            <span
              key={pos}
              className={`px-2 py-0.5 rounded-full border font-medium ${c.bg} ${c.text} ${c.border}`}
            >
              {tr}
            </span>
          );
        })}
        <span className="px-2 py-0.5 rounded-full border border-stone-200 text-stone-400 italic">
          Bulunamayan
        </span>
      </div>

      {/* RPC Hata Mesajı */}
      {rpcError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <strong>Sunucu hatası:</strong> {rpcError}
        </div>
      )}

      {/* Sonuçlar */}
      {tokens && (
        <div>
          {/* İstatistikler */}
          <div className="flex flex-wrap gap-4 mb-5 text-sm">
            <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="font-bold text-stone-800">{total}</span>
              <span className="text-stone-500">kelime</span>
            </div>
            <div className="bg-white border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="font-bold text-green-700">{found}</span>
              <span className="text-stone-500">
                sözlükte bulundu ({total > 0 ? Math.round((found / total) * 100) : 0}%)
              </span>
            </div>
            {Object.entries(byPos).map(([pos, cnt]) => {
              const c = POS_COLORS[pos];
              return (
                <div
                  key={pos}
                  className={`rounded-xl px-4 py-3 flex items-center gap-2 border ${c?.bg ?? "bg-stone-50"} ${c?.border ?? "border-stone-200"}`}
                >
                  <span className={`font-bold ${c?.text ?? "text-stone-800"}`}>{cnt}</span>
                  <span className={`text-xs ${c?.text ?? "text-stone-500"}`}>
                    {POS_TR[pos] ?? pos}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Annotated Metin */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 mb-6 leading-8 text-base text-stone-800">
            {tokens.map((tok, i) => (
              <WordToken key={i} token={tok} />
            ))}
          </div>

          {/* Kelime Tablosu */}
          {wordTokens.filter((t) => t.info).length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100">
                <h2 className="font-semibold text-stone-700 text-sm">Bulunan Kelimeler</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                      <th className="px-5 py-2 font-medium">Metindeki form</th>
                      <th className="px-5 py-2 font-medium">Sözlük</th>
                      <th className="px-5 py-2 font-medium">Türkçe</th>
                      <th className="px-5 py-2 font-medium">Tür</th>
                      <th className="px-5 py-2 font-medium">Kaynak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wordTokens
                      .filter((t) => t.info)
                      .filter(
                        (t, i, arr) =>
                          arr.findIndex((x) => x.text.toLowerCase() === t.text.toLowerCase()) === i
                      )
                      .map((t, i) => {
                        const c = POS_COLORS[t.info!.part_of_speech];
                        return (
                          <tr key={i} className="border-b border-stone-50 hover:bg-stone-50">
                            <td className="px-5 py-2 font-mono italic text-stone-600">{t.text}</td>
                            <td className="px-5 py-2 font-semibold text-stone-800">{t.info!.latin}</td>
                            <td className="px-5 py-2 text-stone-600">{t.info!.turkish ?? "—"}</td>
                            <td className="px-5 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${c?.bg ?? ""} ${c?.text ?? "text-stone-700"} ${c?.border ?? "border-stone-200"}`}
                              >
                                {POS_TR[t.info!.part_of_speech] ?? t.info!.part_of_speech}
                              </span>
                            </td>
                            <td className="px-5 py-2 text-stone-400 text-xs">{t.info!.via}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
