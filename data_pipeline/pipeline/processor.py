"""
processor.py
============
Ham Wiktionary verilerini alır, morfoloji ekler, doğrular ve dışa aktarır.

Akış:
    raw.json (fetcher çıktısı)
        → DataEnricher  → enriched.json
        → DataMerger    → manual_words.json birleştir
        → DataValidator → geçerli kayıtlar
        → JsonExporter  → export/sb_*.json

Kullanım:
    from pipeline.processor import run_processing

    entries = run_processing(
        raw_file    = "output/raw.json",
        manual_file = "manual_words.json",
        output_dir  = "export",
    )
"""

import json
import logging
import re
import uuid
from collections import Counter
from pathlib import Path
from typing import Optional

from .morphology import MorphologyEngine

log = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════
# Zenginleştirici (ham veri + morfoloji → tam kayıt)
# ══════════════════════════════════════════════════════════

class DataEnricher:
    """
    fetcher çıktısına morfoloji formlarını ekler.
    Her entry'ye 'noun_forms', 'verb_forms' veya 'adjective_forms' listesi eklenir.
    """

    def __init__(self):
        self._m = MorphologyEngine()

    def enrich(self, entries: list[dict]) -> list[dict]:
        out = []
        for entry in entries:
            try:
                out.append(self._enrich_one(entry))
            except Exception as exc:
                log.warning("Zenginleştirme hatası [%s]: %s",
                            entry.get("latin", "?"), exc)
                out.append(entry)
        return out

    def _enrich_one(self, e: dict) -> dict:
        pos = e.get("part_of_speech")

        if e.get("noun_forms") or e.get("verb_forms") or e.get("adjective_forms"):
            return e  # zaten zenginleştirilmiş, atla

        if pos == "noun":
            decl   = e.get("declension")
            gender = e.get("gender", "m")
            nom    = e.get("latin", "")
            gen    = self._guess_genitive(e)
            if gen:
                e["genitive"] = gen   # ← tahmini genitifi kaydet
            e["noun_forms"] = (
                self._m.decline_noun(nom, gen, decl, gender)
                if decl and gen else []
            )

        elif pos == "verb":
            conj  = e.get("conjugation")
            pres1 = self._resolve_present_1sg(e)
            is_io = self._detect_io(e)
            e["verb_forms"] = (
                self._m.conjugate_verb(pres1, conj, is_io=is_io)
                if conj and pres1 else []
            )

        elif pos == "adjective":
            masc = e.get("latin") or ""
            fem  = re.sub(r"us$", "a",  masc) if masc.endswith("us") else masc + "a"
            neut = re.sub(r"us$", "um", masc) if masc.endswith("us") else masc + "um"
            e["adjective_forms"] = self._m.decline_adjective(masc, fem, neut)

        return e

    # ── Genitif tahmini ───────────────────────────────────

    @staticmethod
    def _guess_genitive(e: dict) -> Optional[str]:
        gen = e.get("genitive")
        if gen:
            return gen
        nom  = e.get("latin") or ""
        decl = e.get("declension")
        gen_map = {
            1: nom[:-1] + "ae" if nom.endswith("a")  else nom + "ae",
            2: nom[:-2] + "ī"  if nom.endswith("us") else nom[:-2] + "ī",
            4: nom[:-2] + "ūs" if nom.endswith("us") else nom + "ūs",
            5: nom[:-2] + "eī" if nom.endswith("ēs") else nom + "eī",
        }
        return gen_map.get(decl)

    @staticmethod
    def _resolve_present_1sg(e: dict) -> str:
        """Fiil için 1. tekil geniş zaman formunu bulur."""
        if e.get("present_1sg"):
            return e["present_1sg"]
        if e.get("lemma_form"):
            return e["lemma_form"]
        word = e.get("latin") or ""
        conj = e.get("conjugation") or 0
        if conj == 1 and word.endswith("are"): return word[:-3] + "o"
        if conj == 2 and word.endswith("ere"): return word[:-3] + "eo"
        if conj == 3 and word.endswith("ere"): return word[:-3] + "o"
        if conj == 4 and word.endswith("ire"):  return word[:-3] + "io"
        return word

    @staticmethod
    def _detect_io(e: dict) -> bool:
        """3. io çekimi tespiti: pres_1sg 'io' ile bitiyorsa."""
        return (e.get("present_1sg") or "").endswith("io")


# ══════════════════════════════════════════════════════════
# Birleştirici (Wiktionary + el ile girilmiş)
# ══════════════════════════════════════════════════════════

class DataMerger:
    """manual_words.json içindeki veriler daima Wiktionary üzerine yazar."""

    def merge(self, wikidata: list[dict], manual_file: str) -> list[dict]:
        manual_path = Path(manual_file)
        if not manual_path.exists():
            return wikidata

        manual       = json.loads(manual_path.read_text(encoding="utf-8"))
        manual_index = {m["latin"].lower(): m for m in manual}

        merged, seen = [], set()

        for entry in wikidata:
            key = entry.get("latin", "").lower()
            merged.append(manual_index.get(key, entry))
            seen.add(key)

        for key, m in manual_index.items():
            if key not in seen:
                merged.append(m)

        log.info("Birleştirme: %d wiktionary + %d elle girilmiş = %d toplam",
                 len(wikidata), len(manual), len(merged))
        return merged


# ══════════════════════════════════════════════════════════
# Doğrulayıcı
# ══════════════════════════════════════════════════════════

VALID_POS = {
    "noun", "verb", "adjective", "adverb", "preposition",
    "conjunction", "pronoun", "numeral", "interjection",
    "participle", "determiner",
}


class DataValidator:

    def validate(self, entries: list[dict]) -> list[dict]:
        ok, skip = [], []
        for e in entries:
            reason = self._check(e)
            if reason:
                skip.append((e.get("latin", "?"), reason))
            else:
                ok.append(e)

        if skip:
            log.warning("Atlanan kelimeler (%d):", len(skip))
            for word, reason in skip[:20]:
                log.warning("  %-20s → %s", word, reason)
            if len(skip) > 20:
                log.warning("  ... ve %d daha", len(skip) - 20)

        log.info("Geçerli: %d / %d", len(ok), len(entries))
        return ok

    @staticmethod
    def _check(e: dict) -> Optional[str]:
        if not e.get("latin"):
            return "latin eksik"
        pos = e.get("part_of_speech")
        if not pos:
            return "part_of_speech eksik"
        if pos not in VALID_POS:
            return f"bilinmeyen pos: {pos}"
        return None


# ══════════════════════════════════════════════════════════
# JSON dışa aktarıcı
# ══════════════════════════════════════════════════════════

class JsonExporter:
    """Supabase-uyumlu JSON dosyaları üretir."""

    def __init__(self, output_dir: str = "export"):
        self._dir = Path(output_dir)
        self._dir.mkdir(parents=True, exist_ok=True)

    def export(self, entries: list[dict]) -> dict[str, int]:
        words, noun_forms, verb_forms, adj_forms, examples = [], [], [], [], []

        for e in entries:
            word_id = str(uuid.uuid4())
            pos     = e.get("part_of_speech", "")

            words.append({
                "id":             word_id,
                "latin":          e.get("latin"),
                "part_of_speech": pos,
                "declension":     e.get("declension"),
                "conjugation":    e.get("conjugation"),
                "gender":         e.get("gender"),
                "genitive":       e.get("genitive"),
                "present_1sg":    e.get("present_1sg"),
                "english":        e.get("english"),
                "turkish":        e.get("turkish"),
                "frequency":      e.get("frequency", 1),
                "cefr_level":     e.get("cefr_level", "A1"),
            })

            for f in e.get("noun_forms", []):
                noun_forms.append({"id": str(uuid.uuid4()), "word_id": word_id, **f})

            for f in e.get("verb_forms", []):
                verb_forms.append({"id": str(uuid.uuid4()), "word_id": word_id, **f})

            for f in e.get("adjective_forms", []):
                adj_forms.append({"id": str(uuid.uuid4()), "word_id": word_id, **f})

            for ex in e.get("examples", []):
                if not isinstance(ex, dict):
                    continue
                examples.append({
                    "id":      str(uuid.uuid4()),
                    "word_id": word_id,
                    "latin":   ex.get("latin"),
                    "english": ex.get("english"),
                    "turkish": ex.get("turkish"),
                })

        self._save("sb_words.json",           words)
        self._save("sb_noun_forms.json",      noun_forms)
        self._save("sb_verb_forms.json",      verb_forms)
        self._save("sb_adjective_forms.json", adj_forms)
        self._save("sb_examples.json",        examples)

        return {
            "words":           len(words),
            "noun_forms":      len(noun_forms),
            "verb_forms":      len(verb_forms),
            "adjective_forms": len(adj_forms),
            "examples":        len(examples),
        }

    def _save(self, name: str, data: list) -> None:
        p = self._dir / name
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info("  → %s (%d kayıt)", p, len(data))


# ══════════════════════════════════════════════════════════
# İstatistik raporu
# ══════════════════════════════════════════════════════════

def print_stats(entries: list[dict]) -> None:
    pos_c    = Counter(e.get("part_of_speech") for e in entries)
    decl_c   = Counter(e.get("declension") for e in entries
                       if e.get("part_of_speech") == "noun")
    conj_c   = Counter(e.get("conjugation") for e in entries
                       if e.get("part_of_speech") == "verb")
    gender_c = Counter(e.get("gender") for e in entries if e.get("gender"))
    has_tr   = sum(1 for e in entries if e.get("turkish"))

    print("\n── İstatistikler ─────────────────────────────")
    print(f"  Toplam kelime    : {len(entries)}")
    print(f"  Türkçe anlamı var: {has_tr}")
    print("\n  Kelime türleri:")
    for pos, cnt in pos_c.most_common():
        print(f"    {pos or '?':15} {cnt:4}")
    print("\n  Deklinasyon (isimler):")
    for d, cnt in sorted(decl_c.items(), key=lambda x: (x[0] is None, x[0])):
        print(f"    {d}. dekl  {cnt:4}")
    print("\n  Konjugasyon (fiiller):")
    for c, cnt in sorted(conj_c.items(), key=lambda x: (x[0] is None, x[0])):
        print(f"    {c}. konj  {cnt:4}")
    print("\n  Cins:")
    for g, cnt in gender_c.most_common():
        print(f"    {g or '?':3}  {cnt:4}")
    print()


# ══════════════════════════════════════════════════════════
# Tek giriş noktası
# ══════════════════════════════════════════════════════════

def run_processing(
    raw_file:    str = "output/raw.json",
    manual_file: str = "manual_words.json",
    output_dir:  str = "export",
) -> list[dict]:
    """Ham verileri işleyip dışa aktarır. Geçerli kayıtların listesini döndürür."""
    raw = json.loads(Path(raw_file).read_text(encoding="utf-8"))
    log.info("Ham kayıt sayısı: %d", len(raw))

    enricher = DataEnricher()
    enriched = enricher.enrich(raw)
    merged   = DataMerger().merge(enriched, manual_file)
    merged   = enricher.enrich(merged)   # manual'ı da zenginleştir (idempotent)
    valid    = DataValidator().validate(merged)

    print_stats(valid)
    counts = JsonExporter(output_dir).export(valid)

    print("\n── Dışa Aktarılan Tablolar ──────────────────")
    for table, cnt in counts.items():
        print(f"  {table:20} {cnt:6} kayıt")

    return valid
