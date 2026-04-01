"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ClipboardPaste, X } from "lucide-react";
import { POS_LABELS, POS_COLOR_PARTS, cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { WordToken, TokenGroup } from "@/components/WordToken";
import { analyzeText, formatMorphology, type Token } from "@/lib/latin-analyze";

const EXAMPLES = [
  { label: "Caesar — De Bello Gallico", text: "Gallia est omnis divisa in partes tres quarum unam incolunt Belgae aliam Aquitani tertiam qui ipsorum lingua Celtae nostra Galli appellantur" },
  { label: "Cicero — In Catilinam", text: "O tempora o mores Quousque tandem abutere Catilina patientia nostra" },
  { label: "Vergilius — Aeneis I.1", text: "Arma virumque cano Troiae qui primus ab oris Italiam fato profugus Laviniaque venit litora" },
  { label: "Plinius Maior", text: "In vino veritas" },
];

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
    const result = await analyzeText(input);
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

      {rpcError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <strong>Sunucu hatası:</strong> {rpcError}
        </div>
      )}

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
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 mb-6 leading-9 text-base text-stone-800">
            <TokenGroup>
              {tokens.map((tok, i) => <WordToken key={i} token={tok} tokenKey={String(i)} />)}
            </TokenGroup>
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
                      <th className="px-5 py-2.5 font-medium">Form</th>
                      <th className="px-5 py-2.5 font-medium">Sözlük</th>
                      <th className="px-5 py-2.5 font-medium">Türkçe</th>
                      <th className="px-5 py-2.5 font-medium">Gramer</th>
                      <th className="px-5 py-2.5 font-medium">Tür</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wordTokens
                      .filter((t) => t.info)
                      .filter((t, i, arr) => arr.findIndex((x) => x.text.toLowerCase() === t.text.toLowerCase()) === i)
                      .map((t, i) => {
                        const c = POS_COLOR_PARTS[t.info!.part_of_speech];
                        const morph = formatMorphology(t.info!);
                        return (
                          <tr key={i} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                            <td className="px-5 py-2.5 font-mono italic text-stone-500 text-xs">{t.text}</td>
                            <td className="px-5 py-2.5">
                              <Link href={`/word/${t.info!.word_id}`} className="font-semibold text-stone-800 hover:underline">
                                {t.info!.latin}
                              </Link>
                            </td>
                            <td className="px-5 py-2.5 text-stone-600">{t.info!.turkish ?? "—"}</td>
                            <td className="px-5 py-2.5 text-stone-400 text-xs">
                              {morph ?? <span className="text-stone-300">—</span>}
                            </td>
                            <td className="px-5 py-2.5">
                              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", c?.bg ?? "", c?.text ?? "text-stone-700", c?.border ?? "border-stone-200")}>
                                {POS_LABELS[t.info!.part_of_speech] ?? t.info!.part_of_speech}
                              </span>
                            </td>
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
