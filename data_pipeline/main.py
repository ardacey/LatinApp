"""
main.py
=======
Latin veri pipeline orkestratörü.

Adımlar:
    fetch    → Wiktionary'den veri çek (output/raw.json)
    enrich   → Morfoloji ekle          (output/enriched.json)
    process  → Doğrula + dışa aktar    (export/sb_*.json)
    all      → Hepsini sırayla çalıştır

Kullanım:
    # Tüm pipeline (kelime listesini kullan)
    python main.py

    # Sadece belirli adım
    python main.py --step fetch   --limit 50
    python main.py --step enrich  --file output/raw.json
    python main.py --step process --file output/enriched.json

    # Tek kelime test et
    python main.py --word puella
    python main.py --word portare

    # Wiktionary kategorisinden çek (çok yavaş, ~20k kelime)
    python main.py --step fetch --source category --limit 500
"""

import argparse
import json
import logging
import sys
from pathlib import Path

# ──────────────────────────────────────────────────────────
log = logging.getLogger(__name__)

OUTPUT_DIR   = Path("output")
EXPORT_DIR   = Path("export")
WORDLIST_TXT = Path("temel_kelimeler.txt")
MANUAL_JSON  = Path("manual_words.json")

# ══════════════════════════════════════════════════════════
# Yardımcı fonksiyonlar
# ══════════════════════════════════════════════════════════

def _setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s  %(levelname)-7s  %(message)s",
        datefmt="%H:%M:%S",
    )


def _load_wordlist(path: Path) -> list[str]:
    """
    temel_kelimeler.txt formatı:
    # yorum satırları
    boş satırlar → atla
    her satır = bir kelime
    """
    words = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            words.append(line)
    return words


def _save_json(data, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("Kaydedildi: %s (%d kayıt)", path, len(data))


def _load_json(path: Path) -> list:
    return json.loads(path.read_text(encoding="utf-8"))


# ══════════════════════════════════════════════════════════
# Adımlar
# ══════════════════════════════════════════════════════════

def step_fetch(source: str = "list", limit: int = 0, resume: bool = False) -> list[dict]:
    """
    Wiktionary'den veri çeker.
    source: "list" (temel_kelimeler.txt) | "category" (Wiktionary kategorisi)
    resume: True ise daha önce çekilmiş output/raw.json'u yükleyip kaldığı yerden devam eder
    """
    from pipeline import WikiFetcher

    fetcher = WikiFetcher()

    # Resume: önceki raw.json'u yükle
    resume_data: list[dict] = []
    out = OUTPUT_DIR / "raw.json"
    if resume and out.exists():
        resume_data = _load_json(out)
        log.info("Resume: %s'dan %d kayıt yüklendi.", out, len(resume_data))

    if source == "category":
        log.info("Kaynak: Wiktionary kategorisi (limit=%s)", limit or "tümü")
        results = fetcher.fetch_category(limit=limit, resume_from=resume_data or None)
    else:
        if not WORDLIST_TXT.exists():
            log.error("%s bulunamadı!", WORDLIST_TXT)
            return []
        words = _load_wordlist(WORDLIST_TXT)
        if limit:
            words = words[:limit]
        log.info("Kaynak: %s (%d kelime)", WORDLIST_TXT, len(words))
        results = fetcher.fetch_list(words, resume_from=resume_data or None)

    _save_json(results, out)
    return results


def step_enrich(raw_file: Path = None) -> list[dict]:
    """Ham verilere morfoloji ekler."""
    from pipeline import DataEnricher

    path = raw_file or (OUTPUT_DIR / "raw.json")
    if not path.exists():
        log.error("Ham dosya bulunamadı: %s", path)
        return []

    raw      = _load_json(path)
    enriched = DataEnricher().enrich(raw)

    out = OUTPUT_DIR / "enriched.json"
    _save_json(enriched, out)
    return enriched


def step_process(enriched_file: Path = None) -> list[dict]:
    """Zenginleştirilmiş verileri doğrular ve dışa aktarır."""
    from pipeline import DataEnricher, DataMerger, DataValidator, JsonExporter, print_stats

    path = enriched_file or (OUTPUT_DIR / "enriched.json")
    if not path.exists():
        log.error("Zenginleştirilmiş dosya bulunamadı: %s", path)
        return []

    enricher = DataEnricher()
    enriched = _load_json(path)
    merged   = DataMerger().merge(enriched, str(MANUAL_JSON))
    merged   = enricher.enrich(merged)   # manual kelimelerini de zenginleştir (idempotent)
    valid    = DataValidator().validate(merged)

    print_stats(valid)
    counts = JsonExporter(str(EXPORT_DIR)).export(valid)

    print("\n── Dışa Aktarılan Tablolar ──────────────────")
    for table, cnt in counts.items():
        print(f"  {table:25} {cnt:6} kayıt")

    return valid


def step_all(source: str = "list", limit: int = 0) -> None:
    """Tüm pipeline'ı sırayla çalıştırır."""
    print("═" * 50)
    print("  ADIM 1 / 3  —  Veri Çekme")
    print("═" * 50)
    raw = step_fetch(source=source, limit=limit)
    if not raw:
        log.error("Veri çekme başarısız.")
        return

    print("\n═" * 50)
    print("  ADIM 2 / 3  —  Morfoloji Zenginleştirme")
    print("═" * 50)
    enriched = step_enrich()
    if not enriched:
        log.error("Zenginleştirme başarısız.")
        return

    print("\n═" * 50)
    print("  ADIM 3 / 3  —  İşleme ve Dışa Aktarma")
    print("═" * 50)
    step_process()

    print("\n✓ Pipeline tamamlandı.")


# ══════════════════════════════════════════════════════════
# Tek kelime test
# ══════════════════════════════════════════════════════════

def test_word(word: str) -> None:
    """Tek bir kelimeyi çekip morfoloji ile birlikte ekrana basar."""
    from pipeline import WikiFetcher, DataEnricher

    fetcher  = WikiFetcher()
    enricher = DataEnricher()

    print(f"\n——— '{word}' ———")
    entry = fetcher.fetch(word)
    if not entry:
        print("  Wiktionary'de bulunamadı.")
        return

    entry = enricher._enrich_one(entry)

    fields = ["latin", "part_of_speech", "declension", "conjugation",
              "gender", "genitive", "present_1sg", "english", "turkish"]
    for f in fields:
        v = entry.get(f)
        if v is not None:
            print(f"  {f:15}: {v}")

    noun_forms = entry.get("noun_forms", [])
    verb_forms = entry.get("verb_forms", [])
    adj_forms  = entry.get("adjective_forms", [])

    if noun_forms:
        print(f"\n  {'Durum':6} {'Tek':15} {'Çoğ':15}")
        print(f"  {'─'*6} {'─'*15} {'─'*15}")
        cases = ["nom", "gen", "dat", "acc", "abl", "voc"]
        sg = {f["case"]: f["form"] for f in noun_forms if f["number"] == "sg"}
        pl = {f["case"]: f["form"] for f in noun_forms if f["number"] == "pl"}
        for c in cases:
            print(f"  {c:6} {sg.get(c,'—'):15} {pl.get(c,'—'):15}")

    if verb_forms:
        print("\n  Fiil Çekimi (Geniş Zaman, Etken):")
        for f in verb_forms:
            if f.get("tense") == "pres" and f.get("mood") == "indicative":
                print(f"    {f['person']}.{f['number']:2}  {f['form']}")
        infinitive = next((f for f in verb_forms if f.get("mood") == "infinitive"), None)
        if infinitive:
            print(f"    mastar  {infinitive['form']}")

    if adj_forms:
        print("\n  Sıfat Çekimi (Nominatif):")
        for gen in ("m", "f", "n"):
            forms = [f for f in adj_forms if f.get("gender") == gen and f.get("case") == "nom"]
            for f in forms:
                print(f"    {gen} {f['number']:2}  {f['form']}")

    examples = entry.get("examples", [])
    if examples:
        print(f"\n  Örnekler ({len(examples)}):")
        for ex in examples[:3]:
            print(f"    {ex.get('latin')}")
            if ex.get("english"):
                print(f"    → {ex.get('english')}")

    print()


# ══════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Latince veri pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--step",
        choices=["all", "fetch", "enrich", "process"],
        default="all",
        help="Çalıştırılacak adım (varsayılan: all)",
    )
    parser.add_argument(
        "--source",
        choices=["list", "category"],
        default="list",
        help="Veri kaynağı — 'list'=temel_kelimeler.txt, 'category'=Wiktionary",
    )
    parser.add_argument(
        "--limit", type=int, default=0,
        help="Kelime sayısı sınırı (0=sınırsız)",
    )
    parser.add_argument(
        "--file", type=Path, default=None,
        help="Giriş dosyası (enrich/process adımları için)",
    )
    parser.add_argument(
        "--word",
        help="Tek kelime test et ve ekrana bas",
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="fetch adımını kaldığı yerden devam ettir (output/raw.json'u yükler)",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Ayrıntılı çıktı",
    )
    args = parser.parse_args()

    _setup_logging(args.verbose)

    # Tek kelime testi
    if args.word:
        test_word(args.word)
        return

    # Adım çalıştır
    if args.step == "all":
        step_all(source=args.source, limit=args.limit)
    elif args.step == "fetch":
        step_fetch(source=args.source, limit=args.limit, resume=args.resume)
    elif args.step == "enrich":
        step_enrich(raw_file=args.file)
    elif args.step == "process":
        step_process(enriched_file=args.file)


if __name__ == "__main__":
    main()
