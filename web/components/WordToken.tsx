"use client";
import { useState, useContext, createContext, useRef, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn, POS_LABELS, POS_COLOR_PARTS } from "@/lib/utils";
import { type Token, formatMorphology } from "@/lib/latin-analyze";

type GroupCtx = { openKey: string | null; setOpenKey: (k: string | null) => void };
const TokenGroupContext = createContext<GroupCtx | null>(null);

export function TokenGroup({ children }: { children: React.ReactNode }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <TokenGroupContext.Provider value={{ openKey, setOpenKey }}>
      {children}
    </TokenGroupContext.Provider>
  );
}

export function WordToken({ token, tokenKey }: { token: Token; tokenKey?: string }) {
  const group = useContext(TokenGroupContext);
  const [localOpen, setLocalOpen] = useState(false);
  const [showBelow, setShowBelow] = useState(false);
  const [hAlign, setHAlign] = useState<"center" | "left" | "right">("center");
  const containerRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const open = group && tokenKey != null ? group.openKey === tokenKey : localOpen;

  const setOpen = (val: boolean) => {
    if (val && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const TOOLTIP_H = 200;
      const TOOLTIP_W = 240;

      // Yukarı mı aşağı mı?
      setShowBelow(rect.top < TOOLTIP_H + 16);

      // Yatay taşma kontrolü
      const centerX = rect.left + rect.width / 2;
      const overflowRight = centerX + TOOLTIP_W / 2 - window.innerWidth;
      const overflowLeft = -(centerX - TOOLTIP_W / 2);

      if (overflowRight > 0) setHAlign("right");
      else if (overflowLeft > 0) setHAlign("left");
      else setHAlign("center");
    }

    if (group && tokenKey != null) {
      group.setOpenKey(val ? tokenKey : null);
    } else {
      setLocalOpen(val);
    }
  };

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Escape tuşuyla kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (!token.isWord) return <span className="whitespace-pre-wrap">{token.text}</span>;

  if (!token.info) {
    return <span className="text-stone-400 italic">{token.text}</span>;
  }

  const isApprox = token.info.via === "yaklaşık";
  const c = isApprox
    ? { bg: "bg-stone-100", text: "text-stone-500", border: "border-stone-300" }
    : (POS_COLOR_PARTS[token.info.part_of_speech] ?? {
        bg: "bg-stone-100",
        text: "text-stone-700",
        border: "border-stone-300",
      });

  const morphology = formatMorphology(token.info);

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-block rounded px-0.5 border font-medium cursor-pointer hover:opacity-80 transition-opacity",
          isApprox
            ? "border-dashed border-stone-300 bg-stone-50 text-stone-400"
            : `${c.bg} ${c.text} ${c.border}`
        )}
      >
        {token.text}
      </button>

      {open && (
        <span
          className={cn(
            "absolute z-20 w-56 max-w-[calc(100vw-2rem)] rounded-xl border shadow-lg p-3 text-xs",
            showBelow ? "top-full mt-2" : "bottom-full mb-2",
            hAlign === "center" && "left-1/2 -translate-x-1/2",
            hAlign === "left"   && "left-0",
            hAlign === "right"  && "right-0",
            c.bg, c.border, c.text
          )}
        >
          <button
            type="button"
            aria-label="Kapat"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="absolute top-1.5 right-2 opacity-50 hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>

          {isApprox && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-2 text-[10px] text-amber-700">
              Yaklaşık eşleşme — doğruluğu sınırlı
            </div>
          )}

          <div className="font-bold text-sm mb-0.5">{token.info.latin}</div>
          {token.info.turkish && <div className="mb-0.5">🇹🇷 {token.info.turkish}</div>}
          {token.info.english && <div className="opacity-70 mb-2">🇬🇧 {token.info.english}</div>}

          {morphology && (
            <div className="bg-white/60 border border-current/10 rounded-lg px-2 py-1.5 mb-2">
              <p className="text-[9px] uppercase tracking-widest opacity-60 mb-0.5">Gramer</p>
              <p className="font-semibold text-[11px] leading-relaxed">{morphology}</p>
            </div>
          )}

          <div className="flex gap-1 flex-wrap">
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium border", c.border)}>
              {POS_LABELS[token.info.part_of_speech] ?? token.info.part_of_speech}
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
