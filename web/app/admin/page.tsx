"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Word } from "@/types/database";

const POS_TR: Record<string, string> = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf",
  preposition: "Edat", conjunction: "Bağlaç", pronoun: "Zamir",
  numeral: "Sayı", interjection: "Ünlem", particle: "Parçacık",
};

type EditState = {
  turkish: string;
  english: string;
};

export default function AdminPage() {
  const [query, setQuery] = useState("");
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // URL'den ?q= parametresi varsa otomatik doldur
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
  }, []);

  // Query her değiştiğinde ara (debounce)
  useEffect(() => {
    if (!query.trim()) { setWords([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("words")
        .select("*")
        .or(
          `latin.ilike.%${query.trim()}%,turkish.ilike.%${query.trim()}%,english.ilike.%${query.trim()}%`
        )
        .order("frequency", { ascending: true })
        .limit(30)
        .returns<Word[]>();
      setWords(data ?? []);
      // Edit state'ini başlat
      const init: Record<string, EditState> = {};
      for (const w of (data ?? []) as Word[]) {
        init[w.id] = { turkish: w.turkish ?? "", english: w.english ?? "" };
      }
      setEdits(init);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const save = async (word: Word) => {
    const edit = edits[word.id];
    if (!edit) return;
    setSaving((s) => ({ ...s, [word.id]: true }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("words")
      .update({
        turkish: edit.turkish.trim() || null,
        english: edit.english.trim() || null,
      })
      .eq("id", word.id);
    setSaving((s) => ({ ...s, [word.id]: false }));
    if (!error) {
      setSaved((s) => ({ ...s, [word.id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [word.id]: false })), 2500);
    } else {
      alert("Kaydetme hatası: " + error.message + "\n\nNot: Supabase SQL Editor'de önce analyze_search_function.sql dosyasını çalıştırın (BÖLÜM 3: admin güncelleme izni).");
    }
  };

  const hasChanged = (word: Word) => {
    const edit = edits[word.id];
    if (!edit) return false;
    return edit.turkish !== (word.turkish ?? "") || edit.english !== (word.english ?? "");
  };

  return (
    <div>
      {/* Başlık */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-800 mb-1">Kelime Editörü</h1>
            <p className="text-stone-500 text-sm">Yanlış veya eksik çevirileri düzenleyin</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-w-xs text-xs text-amber-800">
            <strong>⚠️ Ön koşul:</strong> Supabase SQL Editor&apos;de{" "}
            <code className="bg-amber-100 px-1 rounded">analyze_search_function.sql</code>{" "}
            dosyasını çalıştırın (güncelleme izni için).
          </div>
        </div>
      </div>

      {/* Arama */}
      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Latin, Türkçe veya İngilizce ile ara…"
          autoFocus
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        {query && !loading && (
          <p className="text-xs text-stone-400 mt-1.5 ml-1">
            {words.length} sonuç{words.length === 30 ? " (ilk 30 gösteriliyor)" : ""}
          </p>
        )}
      </div>

      {/* Yükleniyor */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Boş arama */}
      {!query && !loading && (
        <div className="text-center py-20 text-stone-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">Düzenlemek istediğiniz kelimeyi arayın</p>
          <p className="text-xs mt-1 text-stone-300">Örnek: &quot;Gallia&quot;, &quot;galyum&quot;, &quot;caesar&quot;</p>
        </div>
      )}

      {/* Sonuç yok */}
      {query && !loading && words.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <div className="text-3xl mb-2">🤷</div>
          <p className="text-sm">Kelime bulunamadı</p>
        </div>
      )}

      {/* Sonuç Tablosu */}
      {words.length > 0 && !loading && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-stone-800 text-white text-xs">
                  <th className="px-4 py-3 text-left font-medium w-36">Latince</th>
                  <th className="px-4 py-3 text-left font-medium w-24">Tür</th>
                  <th className="px-4 py-3 text-left font-medium">🇹🇷 Türkçe</th>
                  <th className="px-4 py-3 text-left font-medium">🇬🇧 İngilizce</th>
                  <th className="px-4 py-3 text-left font-medium w-24">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {words.map((word) => {
                  const edit = edits[word.id];
                  const changed = hasChanged(word);
                  const isSaving = saving[word.id];
                  const isSaved = saved[word.id];

                  return (
                    <tr
                      key={word.id}
                      className={`transition-colors ${
                        isSaved
                          ? "bg-green-50"
                          : changed
                          ? "bg-amber-50/60"
                          : "hover:bg-stone-50"
                      }`}
                    >
                      {/* Latin */}
                      <td className="px-4 py-3">
                        <a
                          href={`/word/${word.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-stone-800 hover:underline"
                        >
                          {word.latin}
                        </a>
                        {word.genitive && (
                          <span className="text-stone-400 text-xs ml-1">{word.genitive}</span>
                        )}
                        <div className="text-[10px] text-stone-400 mt-0.5 font-mono">
                          {word.id.slice(0, 8)}…
                        </div>
                      </td>

                      {/* Tür */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                          {POS_TR[word.part_of_speech] ?? word.part_of_speech}
                        </span>
                        {word.declension && (
                          <div className="text-[10px] text-stone-400 mt-1">Decl. {word.declension}</div>
                        )}
                        {word.conjugation && (
                          <div className="text-[10px] text-stone-400 mt-1">Conj. {word.conjugation}</div>
                        )}
                      </td>

                      {/* Türkçe — düzenlenebilir */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={edit?.turkish ?? ""}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [word.id]: { ...prev[word.id], turkish: e.target.value },
                            }))
                          }
                          placeholder="Türkçe çeviri ekle…"
                          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 ${
                            changed
                              ? "border-amber-300 bg-amber-50"
                              : "border-stone-200 bg-white"
                          }`}
                        />
                      </td>

                      {/* İngilizce — düzenlenebilir */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={edit?.english ?? ""}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [word.id]: { ...prev[word.id], english: e.target.value },
                            }))
                          }
                          placeholder="English translation…"
                          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 ${
                            changed
                              ? "border-amber-300 bg-amber-50"
                              : "border-stone-200 bg-white"
                          }`}
                        />
                      </td>

                      {/* Kaydet */}
                      <td className="px-4 py-3">
                        {isSaved ? (
                          <span className="text-green-600 font-semibold text-xs flex items-center gap-1">
                            ✓ Kaydedildi
                          </span>
                        ) : (
                          <button
                            onClick={() => save(word)}
                            disabled={!changed || isSaving}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              changed
                                ? "bg-stone-800 text-white hover:bg-stone-700"
                                : "bg-stone-100 text-stone-400 cursor-not-allowed"
                            }`}
                          >
                            {isSaving ? (
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                …
                              </span>
                            ) : (
                              "Kaydet"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alt Bilgi */}
      <div className="mt-8 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-500 space-y-1">
        <p>
          <strong>Toplu düzeltme:</strong> Birden fazla hatalı çeviriyi doğrudan Supabase SQL Editor&apos;de düzeltebilirsiniz:
        </p>
        <code className="block bg-white border border-stone-200 rounded px-3 py-2 text-stone-700 mt-2 font-mono">
          UPDATE words SET turkish = &apos;Galya&apos;, english = &apos;Gaul&apos; WHERE latin = &apos;Gallia&apos;;
        </code>
      </div>
    </div>
  );
}
