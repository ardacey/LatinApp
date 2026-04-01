"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Kopyala"
      className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 border border-stone-200 hover:border-stone-300 px-2 py-1 rounded-lg transition-colors"
    >
      {copied ? (
        <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Kopyalandı</span></>
      ) : (
        <><Copy className="w-3.5 h-3.5" /><span>Kopyala</span></>
      )}
    </button>
  );
}
