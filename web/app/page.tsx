"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Word } from "@/types/database";
import { useDebounce } from "use-debounce";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight } from "lucide-react";
import { POS_LABELS, POS_COLORS, cn, posBadgeClass } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

// ─── Günün Kelimesi ───────────────────────────────────────────────────────────
function WordOfTheDay() {
  const [word, setWord] = useState<Word | null>(null);

  useEffect(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % 32000;
    supabase
      .from("words")
      .select("*")
      .not("turkish", "is", null)
      .range(dayIndex, dayIndex)
      .single()
      .then(({ data }) => { if (data) setWord(data as Word); });
  }, []);

  if (!word) return null;

  return (
    <Link
      href={`/word/${word.id}`}
      className="block bg-stone-800 text-white rounded-2xl px-6 py-5 mb-6 hover:bg-stone-700 transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">Günün Kelimesi</p>
        <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 transition-colors" />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-bold font-serif tracking-wide">{word.latin}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {word.genitive && <span className="text-stone-400 text-sm">{word.genitive}</span>}
            {word.present_1sg && <span className="text-stone-400 text-sm">{word.present_1sg}</span>}
            {word.gender && <span className="text-stone-400 text-sm italic">{word.gender}.</span>}
          </div>
          <p className="text-stone-200 mt-2 font-medium">{word.turkish}</p>
          {word.english && <p className="text-stone-500 text-sm mt-0.5 italic">{word.english}</p>}
        </div>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium border shrink-0",
          POS_COLORS[word.part_of_speech] ?? "bg-stone-100 text-stone-700 border-stone-200"
        )}>
          {POS_LABELS[word.part_of_speech] ?? word.part_of_speech}
        </span>
      </div>
    </Link>
  );
}

// ─── Form Arama ───────────────────────────────────────────────────────────────
type NounRow = { form: string; case: string | null; number: string; word_id: string };
type VerbRow = { form: string; tense: string; mood: string; voice: string; person: number | null; number: string | null; word_id: string };
type AdjRow  = { form: string; case: string | null; number: string; gender: string | null; word_id: string };

type FormResult = { form: string; word: Word; info: string };

function FormSearch() {
  const [formQuery, setFormQuery] = useState("");
  const [results, setResults] = useState<FormResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);

    const [nounRes, verbRes, adjRes] = await Promise.all([
      supabase.from("noun_forms").select(`form, "case", number, word_id`).ilike("form", q.trim()).limit(10),
      supabase.from("verb_forms").select(`form, tense, mood, voice, person, number, word_id`).ilike("form", q.trim()).limit(10),
      supabase.from("adjective_forms").select(`form, "case", number, gender, word_id`).ilike("form", q.trim()).limit(10),
    ]);

    const nounRows = (nounRes.data ?? []) as unknown as NounRow[];
    const verbRows = (verbRes.data ?? []) as unknown as VerbRow[];
    const adjRows  = (adjRes.data  ?? []) as unknown as AdjRow[];

    const wordIds = new Set<string>();
    [...nounRows, ...verbRows, ...adjRows].forEach((r) => wordIds.add(r.word_id));

    if (wordIds.size === 0) { setResults([]); setLoading(false); return; }

    const { data: wordsData } = await supabase.from("words").select("*").in("id", [...wordIds]);
    const wordList = (wordsData ?? []) as unknown as Word[];
    const wordMap = new Map(wordList.map((w) => [w.id, w]));

    const out: FormResult[] = [];
    for (const r of nounRows) {
      const w = wordMap.get(r.word_id);
      if (w) out.push({ form: r.form, word: w, info: `İsim · ${r.case?.toUpperCase()} ${r.number === "sg" ? "tekil" : "çoğul"}` });
    }
    for (const r of verbRows) {
      const w = wordMap.get(r.word_id);
      if (w) {
        const person = r.person && r.number ? `${r.person}. ${r.number === "sg" ? "tekil" : "çoğul"}` : "";
        out.push({ form: r.form, word: w, info: `Fiil · ${r.tense} ${r.mood} ${r.voice}${person ? " · " + person : ""}` });
      }
    }
    for (const r of adjRows) {
      const w = wordMap.get(r.word_id);
      if (w) out.push({ form: r.form, word: w, info: `Sıfat · ${r.case?.toUpperCase()} ${r.number === "sg" ? "tekil" : "çoğul"} ${r.gender ?? ""}` });
    }

    const seen = new Set<string>();
    setResults(out.filter((r) => {
      const key = `${r.word.id}|${r.form}|${r.info}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }));
    setLoading(false);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 mb-6">
      <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3">Form Arama</p>
      <div className="flex gap-2">
        <input
          type="search"
          value={formQuery}
          onChange={(e) => setFormQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(formQuery)}
          placeholder="Çekimli form yaz (örn. puellam, amat)…"
          className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-colors"
        />
        <button
          type="button"
          onClick={() => search(formQuery)}
          disabled={loading}
          className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          Ara
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 mt-3">
          <Spinner className="w-4 h-4" />
          <span className="text-stone-400 text-sm">Aranıyor…</span>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <p className="text-stone-400 text-sm mt-3">Form bulunamadı.</p>
      )}

      {results.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {results.map((r, i) => (
            <Link
              key={i}
              href={`/word/${r.word.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 hover:border-stone-300 hover:bg-white transition-all"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-stone-800 text-sm">{r.word.latin}</span>
                  <span className="text-stone-400 text-xs">→</span>
                  <span className="font-mono text-stone-600 text-sm">{r.form}</span>
                </div>
                <p className="text-stone-400 text-xs mt-0.5">{r.info}</p>
              </div>
              <p className="text-stone-600 text-sm shrink-0 text-right">{r.word.turkish}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState("");
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [debouncedQuery] = useDebounce(query, 300);
  const [debouncedPos] = useDebounce(pos, 300);

  // Keyboard shortcut: / to focus, Esc to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "/") { e.preventDefault(); searchInputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(
    async (p = 0, append = false) => {
      if (loading && append) return;
      setLoading(true);

      if (debouncedQuery.trim()) {
        const q2 = debouncedQuery.trim();
        const [latinStart, latinContain, turkishRes, englishRes] = await Promise.all([
          supabase.from("words").select("*", { count: "exact" }).ilike("latin", `${q2}%`).order("latin").range(0, 499),
          supabase.from("words").select("*", { count: "exact" }).ilike("latin", `%${q2}%`).not("latin", "ilike", `${q2}%`).order("latin").range(0, 499),
          supabase.from("words").select("*", { count: "exact" }).ilike("turkish", `%${q2}%`).order("latin").range(0, 499),
          supabase.from("words").select("*", { count: "exact" }).ilike("english", `%${q2}%`).order("latin").range(0, 499),
        ]);
        const seen = new Set<string>();
        const merged: Word[] = [];
        for (const row of [
          ...((latinStart.data ?? []) as Word[]),
          ...((latinContain.data ?? []) as Word[]),
          ...((turkishRes.data ?? []) as Word[]),
          ...((englishRes.data ?? []) as Word[]),
        ]) {
          if (!seen.has(row.id)) { seen.add(row.id); merged.push(row); }
        }
        setWords(merged);
        setTotal(merged.length);
        setHasMore(false);
        setPage(0);
        setLoading(false);
        return;
      }

      let q = supabase
        .from("words")
        .select("*", { count: "exact" })
        .order("latin", { ascending: true })
        .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);

      if (debouncedPos) q = q.eq("part_of_speech", debouncedPos);

      const { data, count } = await q;
      const newWords = (data ?? []) as Word[];
      setWords((prev) => (append ? [...prev, ...newWords] : newWords));
      setTotal(count ?? 0);
      setPage(p);
      setHasMore(newWords.length === PAGE_SIZE);
      setLoading(false);
    },
    [debouncedQuery, debouncedPos]
  );

  useEffect(() => { search(0, false); }, [search]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) search(page + 1, true);
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, page, search]);

  return (
    <div>
      {/* Hero */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-1">Latince Sözlük</h1>
        <p className="text-stone-500 text-sm">32.000+ kelime · çekim tabloları · Türkçe çeviriler</p>
      </div>

      <WordOfTheDay />
      <FormSearch />

      {/* Arama & Filtreler */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Latin, Türkçe veya İngilizce ara…"
            className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 placeholder:text-stone-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Aramayı temizle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          aria-label="Sözcük türü filtresi"
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-300 transition-colors sm:w-40"
        >
          <option value="">Tüm Türler</option>
          {Object.entries(POS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Sonuç sayısı */}
      <div className="mb-3 flex items-center gap-2 text-sm text-stone-400 h-5">
        {loading && words.length === 0 ? (
          <><Spinner className="w-3.5 h-3.5" /><span>Yükleniyor…</span></>
        ) : total !== null ? (
          <span>{total.toLocaleString("tr")} sonuç{query && ` — "${query}"`}</span>
        ) : null}
        {!loading && query && (
          <span className="text-xs text-stone-300 ml-auto hidden sm:inline">
            <kbd className="bg-stone-100 border border-stone-200 px-1 py-0.5 rounded text-stone-400 font-mono">/</kbd> odaklan ·{" "}
            <kbd className="bg-stone-100 border border-stone-200 px-1 py-0.5 rounded text-stone-400 font-mono">Esc</kbd> temizle
          </span>
        )}
      </div>

      {/* Kelime Listesi */}
      <div className="space-y-1.5">
        {words.map((w, i) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: Math.min(i, 10) * 0.03 }}
          >
            <Link
              href={`/word/${w.id}`}
              className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-3.5 shadow-sm hover:shadow-md hover:border-stone-300 transition-all"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-stone-800 text-[15px]">{w.latin}</span>
                  {w.genitive && <span className="text-stone-400 text-sm">{w.genitive}</span>}
                  {w.present_1sg && <span className="text-stone-400 text-sm">{w.present_1sg}</span>}
                  {w.gender && <span className="text-stone-400 text-xs italic">{w.gender}.</span>}
                </div>
                <p className="text-stone-600 text-sm mt-0.5 truncate">{w.turkish ?? "—"}</p>
                {w.english && <p className="text-stone-400 text-xs mt-0.5 truncate italic">{w.english}</p>}
              </div>
              <span className={cn(posBadgeClass(w.part_of_speech), "shrink-0 mt-0.5")}>
                {POS_LABELS[w.part_of_speech] ?? w.part_of_speech}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {!loading && words.length === 0 && total === 0 && (
        <div className="text-center py-16 text-stone-400">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Sonuç bulunamadı</p>
          <p className="text-sm mt-1">Farklı bir kelime veya tür deneyin.</p>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-8 mt-3" />
      <AnimatePresence>
        {loading && words.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-4"
          >
            <Spinner />
          </motion.div>
        )}
      </AnimatePresence>
      {!hasMore && words.length > 0 && !debouncedQuery && (
        <p className="text-center text-stone-300 text-sm py-4">— Son —</p>
      )}
    </div>
  );
}
