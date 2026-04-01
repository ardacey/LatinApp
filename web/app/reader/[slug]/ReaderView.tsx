"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { WordToken, TokenGroup } from "@/components/WordToken";
import { analyzeText, type Token } from "@/lib/latin-analyze";
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, type LatinText } from "@/lib/texts";
import { cn } from "@/lib/utils";

type SectionState = { tokens: Token[] | null; loading: boolean; error?: string };

export function ReaderView({ text }: { text: LatinText }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [sections, setSections] = useState<SectionState[]>(
    text.sections.map(() => ({ tokens: null, loading: false }))
  );

  async function loadSection(idx: number) {
    if (sections[idx].tokens || sections[idx].loading) return;

    setSections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], loading: true };
      return next;
    });

    const result = await analyzeText(text.sections[idx].latin);

    setSections((prev) => {
      const next = [...prev];
      next[idx] = { tokens: result.tokens, loading: false, error: result.error };
      return next;
    });
  }

  // Load first section on mount
  useEffect(() => {
    loadSection(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTabClick(idx: number) {
    setActiveIdx(idx);
    loadSection(idx);
  }

  const current = sections[activeIdx];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/reader"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-4"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Metinler
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-stone-400 mb-0.5">{text.author} · {text.century}</p>
            <h1 className="text-2xl font-bold text-stone-800">{text.title}</h1>
            <p className="text-sm text-stone-500 mt-1">{text.description}</p>
          </div>
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border shrink-0", DIFFICULTY_COLORS[text.difficulty])}>
            {DIFFICULTY_LABELS[text.difficulty]}
          </span>
        </div>
      </div>

      {/* Section tabs */}
      {text.sections.length > 1 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {text.sections.map((sec, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleTabClick(idx)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                activeIdx === idx
                  ? "bg-stone-800 text-white border-stone-800"
                  : "bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700"
              )}
            >
              {sec.label}
            </button>
          ))}
        </div>
      )}

      {/* Text display */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 mb-4">
        {text.sections.length === 1 && (
          <p className="text-xs text-stone-400 font-medium mb-3">{text.sections[0].label}</p>
        )}

        {current.loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-stone-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analiz ediliyor…</span>
          </div>
        )}

        {current.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
            <strong>Sunucu hatası:</strong> {current.error}
          </div>
        )}

        {current.tokens && !current.loading && (
          <div className="leading-9 text-base text-stone-800">
            <TokenGroup>
              {current.tokens.map((tok, i) => (
                <WordToken key={i} token={tok} tokenKey={String(i)} />
              ))}
            </TokenGroup>
          </div>
        )}
      </div>

      {/* Usage hint */}
      <p className="text-center text-xs text-stone-400">
        Kelimeye tıklayarak anlam ve gramer bilgisine ulaşabilirsiniz
      </p>
    </div>
  );
}
