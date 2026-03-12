"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Word } from "@/types/database";

const POS_LABELS: Record<string, string> = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf",
  preposition: "Edat", conjunction: "Bağlaç", pronoun: "Zamir",
  numeral: "Sayı", interjection: "Ünlem", particle: "Parçacık",
};

const POS_COLORS: Record<string, string> = {
  noun:        "bg-amber-50 text-amber-900 border border-amber-200",
  verb:        "bg-red-50 text-red-900 border border-red-200",
  adjective:   "bg-blue-50 text-blue-900 border border-blue-200",
  adverb:      "bg-purple-50 text-purple-900 border border-purple-200",
  preposition: "bg-orange-50 text-orange-900 border border-orange-200",
  conjunction: "bg-pink-50 text-pink-900 border border-pink-200",
  pronoun:     "bg-teal-50 text-teal-900 border border-teal-200",
  numeral:     "bg-green-50 text-green-900 border border-green-200",
  interjection:"bg-yellow-50 text-yellow-900 border border-yellow-200",
  particle:    "bg-slate-50 text-slate-700 border border-slate-200",
};

export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState("");
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const search = useCallback(async (p = 0) => {
    setLoading(true);

    if (query.trim()) {
      const q2 = query.trim();
      // İki sorgu: önce "est%" ile başlayanlar, sonra içinde "est" geçip başlamayanlar
      const [startRes, containRes] = await Promise.all([
        supabase
          .from("words")
          .select("*", { count: "exact" })
          .ilike("latin", `${q2}%`)
          .order("frequency", { ascending: true })
          .range(0, 999),
        supabase
          .from("words")
          .select("*", { count: "exact" })
          .ilike("latin", `%${q2}%`)
          .not("latin", "ilike", `${q2}%`)
          .order("frequency", { ascending: true })
          .range(0, 999),
      ]);
      const startData  = startRes.data  ?? [];
      const containData = containRes.data ?? [];
      const merged = [...startData, ...containData];
      const startCount  = (startRes.count  ?? 0);
      const containCount = (containRes.count ?? 0);
      const pageData = merged.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);
      setWords(pageData);
      setTotal(startCount + containCount);
      setPage(p);
      setLoading(false);
      return;
    }

    let q = supabase
      .from("words")
      .select("*", { count: "exact" })
      .order("frequency", { ascending: true })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);

    if (pos) q = q.eq("part_of_speech", pos);

    const { data, count } = await q;
    setWords(data ?? []);
    setTotal(count ?? 0);
    setPage(p);
    setLoading(false);
  }, [query, pos]);

  useEffect(() => {
    search(0);
  }, [search]);

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-1">Latince Sözlük</h1>
        <p className="text-stone-500 text-sm">32.000+ kelime · çekim tabloları · Türkçe çeviriler</p>
      </div>

      {/* Arama & Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Latin, Türkçe veya İngilizce ara…"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <select
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">Tür Seç</option>
          {Object.entries(POS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

      </div>

      {/* Sonuç sayısı */}
      <div className="mb-4 text-sm text-stone-400">
        {loading ? "Aranıyor…" : total !== null ? `${total.toLocaleString("tr")} sonuç` : ""}
      </div>

      {/* Kelime Listesi */}
      <div className="space-y-2">
        {words.map((w) => (
          <Link
            key={w.id}
            href={`/word/${w.id}`}
            className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm hover:shadow-md hover:border-stone-300 transition-all"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-stone-800 text-lg">{w.latin}</span>
                {w.genitive && <span className="text-stone-400 text-sm">{w.genitive}</span>}
                {w.present_1sg && <span className="text-stone-400 text-sm">{w.present_1sg}</span>}
                {w.gender && <span className="text-stone-400 text-xs italic">{w.gender}.</span>}
              </div>
              <p className="text-stone-600 text-sm mt-0.5 truncate">{w.turkish ?? "—"}</p>
              {w.english && <p className="text-stone-400 text-xs mt-0.5 truncate">{w.english}</p>}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POS_COLORS[w.part_of_speech] ?? "bg-stone-100 text-stone-700 border border-stone-200"}`}>
                {POS_LABELS[w.part_of_speech] ?? w.part_of_speech}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Sayfalama */}
      {total !== null && total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => search(page - 1)}
            disabled={page === 0 || loading}
            className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-sm disabled:opacity-40 hover:bg-stone-50 transition"
          >
            ← Önceki
          </button>
          <span className="text-sm text-stone-500">
            {page + 1} / {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            onClick={() => search(page + 1)}
            disabled={(page + 1) * PAGE_SIZE >= total || loading}
            className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-sm disabled:opacity-40 hover:bg-stone-50 transition"
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}

