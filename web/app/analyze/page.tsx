"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ClipboardPaste, X } from "lucide-react";
import { POS_LABELS, POS_COLOR_PARTS, cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

const EXAMPLES = [
  { label: "Caesar — De Bello Gallico", text: "Gallia est omnis divisa in partes tres quarum unam incolunt Belgae aliam Aquitani tertiam qui ipsorum lingua Celtae nostra Galli appellantur" },
  { label: "Cicero — De Re Publica", text: "Salus populi suprema lex esto" },
  { label: "Vergilius — Aeneis I.1", text: "Arma virumque cano Troiae qui primus ab oris Italiam fato profugus Laviniaque venit litora" },
  { label: "Plinius Maior", text: "In vino veritas" },
];

type WordInfo = {
  latin: string;
  turkish: string | null;
  english: string | null;
  part_of_speech: string;
  via: string;
  word_id: string;
};

type Token = { text: string; isWord: boolean; info?: WordInfo };

const MACRON_STRIP: Record<string, string> = {
  ā: "a", ē: "e", ī: "i", ō: "o", ū: "u",
  Ā: "a", Ē: "e", Ī: "i", Ō: "o", Ū: "u",
};

function normKey(s: string): string {
  return s.toLowerCase().replace(/[āēīōūĀĒĪŌŪ]/g, (c) => MACRON_STRIP[c] ?? c);
}

function stripEnclitic(norm: string): string | null {
  if (norm.length > 4 && norm.endsWith("que")) return norm.slice(0, -3);
  if (norm.length > 3 && norm.endsWith("ne")) return norm.slice(0, -2);
  if (norm.length > 3 && norm.endsWith("ve")) return norm.slice(0, -2);
  return null;
}

function tokenize(raw: string): Token[] {
  const parts = raw.match(/[A-Za-zāēīōūĀĒĪŌŪ]+|[^A-Za-zāēīōūĀĒĪŌŪ]+/g) ?? [];
  return parts.map((p) => ({ text: p, isWord: /[A-Za-zāēīōūĀĒĪŌŪ]/.test(p) }));
}

type RpcRow = {
  normalized_form: string;
  latin: string;
  turkish: string | null;
  english: string | null;
  part_of_speech: string;
  via: string;
  word_id: string;
};

const PRIORITY = ["sıfat formu", "fiil formu", "isim formu", "sözlük"];

async function analyze(text: string): Promise<{ tokens: Token[]; error?: string }> {
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

  let rows: RpcRow[] = [];
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/search_latin_words`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey!,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ input_words: unique }),
    });
    if (!res.ok) return { tokens, error: `RPC hatası ${res.status}: ${await res.text()}` };
    const json = await res.json();
    if (Array.isArray(json)) rows = json as RpcRow[];
    else if (json?.message) return { tokens, error: json.message };
  } catch (e) {
    return { tokens, error: String(e) };
  }

  const map = new Map<string, WordInfo>();
  for (const row of rows) {
    const existing = map.get(row.normalized_form);
    if (!existing || PRIORITY.indexOf(row.via) > PRIORITY.indexOf(existing.via)) {
      map.set(row.normalized_form, { latin: row.latin, turkish: row.turkish, english: row.english, part_of_speech: row.part_of_speech, via: row.via, word_id: row.word_id });
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

// ─── Word Token ───────────────────────────────────────────────────────────────
function WordToken({ token }: { token: Token }) {
  const [open, setOpen] = useState(false);

  if (!token.isWord) return <span className="whitespace-pre-wrap">{token.text}</span>;

  if (!token.info) {
    return <span className="text-stone-400 italic">{token.text}</span>;
  }

  const isApprox = token.info.via === "yaklaşık";
  const c = isApprox
    ? { bg: "bg-stone-100", text: "text-stone-500", border: "border-stone-300" }
    : (POS_COLOR_PARTS[token.info.part_of_speech] ?? { bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-300" });

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-block rounded px-0.5 border font-medium cursor-pointer hover:opacity-80 transition-opacity",
          isApprox ? "border-dashed border-stone-300 bg-stone-50 text-stone-400" : `${c.bg} ${c.text} ${c.border}`
        )}
      >
        {token.text}
      </button>
      {open && (
        <span className={cn(
          "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-56 rounded-xl border shadow-lg p-3 text-xs",
          c.bg, c.border, c.text
        )}>
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
            className="absolute top-1.5 right-2 opacity-50 hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
          {isApprox && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-2 text-[10px] text-amber-700">
              Yaklaşık eşleşme — doğruluğu sınırlı
            </div>
          )}
          <div className="font-bold text-sm mb-1">{token.info.latin}</div>
          {token.info.turkish && <div className="mb-0.5">🇹🇷 {token.info.turkish}</div>}
          {token.info.english && <div className="opacity-70 mb-1">🇬🇧 {token.info.english}</div>}
          <div className="flex gap-1 flex-wrap mt-1">
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium border", c.border)}>
              {POS_LABELS[token.info.part_of_speech] ?? token.info.part_of_speech}
            </span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] border border-stone-300 text-stone-500 bg-white font-medium">
              {token.info.via}
            </span>
          </div>
          <Link
            href={`/word/${token.info.word_id}`}
            className="mt-2 block text-[10px] text-stone-400 hover:text-stone-600 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Kelime sayfası →
          </Link>
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
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-1">Metin Analizi</h1>
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
              type="button"
              onClick={() => setInput(ex.text)}
              className="flex items-center gap-1.5 text-xs border border-stone-200 rounded-full px-3 py-1 text-stone-500 hover:border-stone-400 hover:text-stone-800 transition-colors"
            >
              <ClipboardPaste className="w-3 h-3" />
              {ex.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Latince metni buraya yapıştırın…"
            rows={5}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-colors"
          />
          {input && (
            <button
              type="button"
              onClick={() => { setInput(""); setTokens(null); setRpcError(null); }}
              className="absolute top-2.5 right-2.5 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-stone-400">
            {input.length > 0 && `${input.split(/\s+/).filter(Boolean).length} kelime`}
          </span>
          <button
            type="button"
            onClick={run}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 bg-stone-800 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Spinner className="w-4 h-4 border-white/30 border-t-white" /> : <Search className="w-4 h-4" />}
            {loading ? "Analiz ediliyor…" : "Analiz Et"}
          </button>
        </div>
      </div>

      {/* Renk Açıklaması */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {Object.entries(POS_LABELS).map(([pos, tr]) => {
          const c = POS_COLOR_PARTS[pos];
          if (!c) return null;
          return (
            <span key={pos} className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", c.bg, c.text, c.border)}>
              {tr}
            </span>
          );
        })}
        <span className="px-2 py-0.5 rounded-full border border-stone-200 text-stone-400 text-xs italic">
          Bulunamayan
        </span>
      </div>

      {/* Hata */}
      {rpcError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <strong>Sunucu hatası:</strong> {rpcError}
        </div>
      )}

      {/* Sonuçlar */}
      {tokens && (
        <div>
          {/* İstatistikler */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
              <span className="font-bold text-stone-800">{total}</span>
              <span className="text-stone-500">kelime</span>
            </div>
            <div className="bg-white border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
              <span className="font-bold text-green-700">{found}</span>
              <span className="text-stone-500">bulundu</span>
              <span className="text-stone-400 text-xs">
                ({total > 0 ? Math.round((found / total) * 100) : 0}%)
              </span>
            </div>
            {Object.entries(byPos).map(([pos, cnt]) => {
              const c = POS_COLOR_PARTS[pos];
              return (
                <div key={pos} className={cn("rounded-xl px-4 py-2.5 flex items-center gap-2 border text-sm", c?.bg ?? "bg-stone-50", c?.border ?? "border-stone-200")}>
                  <span className={cn("font-bold", c?.text ?? "text-stone-800")}>{cnt}</span>
                  <span className={cn("text-xs", c?.text ?? "text-stone-500")}>
                    {POS_LABELS[pos] ?? pos}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Annotated Metin */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 mb-6 leading-8 text-base text-stone-800">
            {tokens.map((tok, i) => <WordToken key={i} token={tok} />)}
          </div>

          {/* Kelime Tablosu */}
          {found > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100">
                <h2 className="font-semibold text-stone-700 text-sm">Bulunan Kelimeler</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-400 border-b border-stone-100 bg-stone-50">
                      <th className="px-5 py-2.5 font-medium">Metindeki form</th>
                      <th className="px-5 py-2.5 font-medium">Sözlük</th>
                      <th className="px-5 py-2.5 font-medium">Türkçe</th>
                      <th className="px-5 py-2.5 font-medium">Tür</th>
                      <th className="px-5 py-2.5 font-medium">Kaynak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wordTokens
                      .filter((t) => t.info)
                      .filter((t, i, arr) => arr.findIndex((x) => x.text.toLowerCase() === t.text.toLowerCase()) === i)
                      .map((t, i) => {
                        const c = POS_COLOR_PARTS[t.info!.part_of_speech];
                        return (
                          <tr key={i} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                            <td className="px-5 py-2.5 font-mono italic text-stone-500 text-xs">{t.text}</td>
                            <td className="px-5 py-2.5">
                              <Link href={`/word/${t.info!.word_id}`} className="font-semibold text-stone-800 hover:underline">
                                {t.info!.latin}
                              </Link>
                            </td>
                            <td className="px-5 py-2.5 text-stone-600">{t.info!.turkish ?? "—"}</td>
                            <td className="px-5 py-2.5">
                              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", c?.bg ?? "", c?.text ?? "text-stone-700", c?.border ?? "border-stone-200")}>
                                {POS_LABELS[t.info!.part_of_speech] ?? t.info!.part_of_speech}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-stone-400 text-xs">{t.info!.via}</td>
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
