"""
fetcher.py
==========
Wiktionary'den Latince veri çeken ana orkestratör sınıfı.

Kaynaklar:
  - en.wiktionary.org  → morfoloji, İngilizce anlamlar, örnek cümleler
  - tr.wiktionary.org  → Türkçe anlamlar (bulunursa)
  - Google Translate    → tr.wiktionary'de yoksa İngilizce anlamı çevirir

Kullanım:
    from pipeline import WikiFetcher

    fetcher = WikiFetcher()
    word    = fetcher.fetch("puella")
    words   = fetcher.fetch_list(["puella", "amare", "bonus"])
    words   = fetcher.fetch_category(limit=500)

Hız optimizasyonları:
  - en.wiktionary: 50 sayfa / API isteği (batch) → istek sayısı ~50x azalır
  - tr.wiktionary: ThreadPoolExecutor ile paralel çekim
  - Resume: önceden çekilmiş kelimeler atlanır
"""

import json
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

from .http_client     import _HTTP, EN_WIKI
from .wikitext_parser import _Parser, _extract_lemma_from_form
from .turkish         import _TurkishFetcher
from .translator      import TranslationService

log = logging.getLogger(__name__)

_OVERRIDES_FILE = Path(__file__).parent.parent / "turkish_fallback.json"


class WikiFetcher:
    """
    Wiktionary'den Latince veri çeken tek giriş noktası.

    Türkçe anlam arama önceliği:
      1. turkish_fallback.json["_overrides"]  — çekimli form düzeltmeleri
      2. tr.wiktionary Latince bölümü
      3. Google Translate (en.wiktionary İngilizcesi üzerinden)
    """

    def __init__(self, delay: float = 0.3, tr_workers: int = 3):
        """
        Args:
            delay:      Wiktionary batch istekleri arası bekleme (saniye)
            tr_workers: tr.wiktionary için paralel iş parçacığı sayısı (max 3 önerilir)
        """
        self._en         = _HTTP(EN_WIKI, delay=delay)
        self._tr         = _TurkishFetcher()
        self._p          = _Parser()
        self._translator = TranslationService()
        self._tr_workers = tr_workers
        self._tr_sem     = threading.Semaphore(tr_workers)  # 429 throttle koruması
        self._wt_cache: dict[str, str] = {}  # batch prefetch cache'i

        self._tr_overrides: dict = {}
        if _OVERRIDES_FILE.exists():
            try:
                raw = json.loads(_OVERRIDES_FILE.read_text(encoding="utf-8-sig"))
                self._tr_overrides = {
                    k.lower(): v
                    for k, v in raw.get("_overrides", {}).items()
                }
                log.debug("TR override: %d kelime", len(self._tr_overrides))
            except Exception as exc:
                log.warning("turkish_fallback.json okunamadı: %s", exc)

    # ── Tek kelime ────────────────────────────────────────

    def fetch(self, word: str) -> Optional[dict]:
        """
        Kelimeyi Wiktionary'den çeker.
        Eğer kelime bir form sayfasıysa (portare, puellam...)
        otomatik olarak lemma sayfasını bulur.
        """
        wt = self._get_wikitext(word)
        if not wt:
            return None

        entry = self._p.parse(word, wt)

        if entry is None or self._is_form_page(entry):
            lemma = _extract_lemma_from_form(wt)
            if lemma and lemma.lower() != word.lower():
                log.debug("  %s → lemma: %s", word, lemma)
                lemma_wt = self._get_wikitext(lemma)
                if lemma_wt:
                    lemma_entry = self._p.parse(lemma, lemma_wt)
                    if lemma_entry:
                        lemma_entry["latin"]      = word
                        lemma_entry["lemma_form"] = lemma
                        entry = lemma_entry

        if not entry:
            return None

        entry["turkish"] = self._lookup_turkish(word, entry)
        return entry

    # ── Kelime listesi (hızlı, batch + paralel) ───────────

    def fetch_list(
        self,
        words: list[str],
        resume_from: Optional[list[dict]] = None,
        use_tr_wiki: bool = True,
        checkpoint_path: Optional[str] = None,
        checkpoint_every: int = 1000,
    ) -> list[dict]:
        """
        Kelime listesini toplu (batch) ve paralel olarak çeker.

        Args:
            words:            Çekilecek kelime listesi
            resume_from:      Önceden çekilmiş kayıtlar (resume desteği).
                              Bu kelimeler tekrar çekilmez, sonuçlara eklenir.
            use_tr_wiki:      False ise tr.wiktionary atlanır, direkt Google Translate kullanılır.
                              Büyük toplu çekimlerde (>500 kelime) 429 hatalarını önler.
            checkpoint_path:  Belirtilirse her checkpoint_every kelimede bir ara sonuç kaydedilir.
            checkpoint_every: Kaç kelimede bir checkpoint alınacağı (varsayılan: 1000).
        """
        # Resume: zaten çekilmiş kelimeleri çıkar
        already: list[dict] = []
        if resume_from:
            done_keys = {e["latin"].lower() for e in resume_from}
            skipped   = [w for w in words if w.lower() in done_keys]
            words     = [w for w in words if w.lower() not in done_keys]
            already   = list(resume_from)
            if skipped:
                log.info("Resume: %d kelime atlandı, %d kaldı.", len(skipped), len(words))

        if not words:
            return already

        # ── Aşama 1: en.wiktionary toplu prefetch ────────
        log.info("en.wiktionary toplu çekiliyor: %d kelime → ~%d istek...",
                 len(words), (len(words) + 49) // 50)
        self._wt_cache = self._en.wikitext_batch(words)
        log.info("  → %d / %d sayfa bulundu.", len(self._wt_cache), len(words))

        # ── Aşama 2: Parse + lemma tespiti ───────────────
        # (word, entry | None, lemma_name | None)
        stage2: list[tuple[str, Optional[dict], Optional[str]]] = []
        extra_lemmas: set[str] = set()

        for word in words:
            wt = self._wt_cache.get(word)
            if not wt:
                stage2.append((word, None, None))
                continue
            entry = self._p.parse(word, wt)
            if entry is None or self._is_form_page(entry):
                lemma = _extract_lemma_from_form(wt)
                if lemma and lemma.lower() != word.lower():
                    extra_lemmas.add(lemma)
                    stage2.append((word, None, lemma))
                    continue
            stage2.append((word, entry, None))

        # ── Aşama 3: Eksik lemma sayfalarını toplu çek ───
        if extra_lemmas:
            missing = [l for l in extra_lemmas if l not in self._wt_cache]
            if missing:
                log.info("Lemma sayfaları çekiliyor: %d adet...", len(missing))
                self._wt_cache.update(self._en.wikitext_batch(missing))

        # Lemma parse işlemini tamamla
        resolved: list[tuple[str, Optional[dict]]] = []
        for word, entry, lemma in stage2:
            if entry is not None:
                resolved.append((word, entry))
            elif lemma and lemma in self._wt_cache:
                lemma_wt  = self._wt_cache[lemma]
                lemma_ent = self._p.parse(lemma, lemma_wt)
                if lemma_ent:
                    lemma_ent["latin"]      = word
                    lemma_ent["lemma_form"] = lemma
                resolved.append((word, lemma_ent))
            else:
                log.warning("  → bulunamadı: %s", word)
                resolved.append((word, None))

        valid = [(w, e) for w, e in resolved if e is not None]

        # ── Aşama 4: tr.wiktionary paralel çekim ─────────
        if use_tr_wiki:
            log.info("tr.wiktionary: %d kelime, %d iş parçacığıyla çekiliyor...",
                     len(valid), self._tr_workers)
        else:
            log.info("tr.wiktionary atlandı (use_tr_wiki=False) — direkt Google Translate.")
        tr_results: dict[str, Optional[str]] = {}

        def _fetch_tr(item: tuple[str, dict]) -> tuple[str, Optional[str]]:
            w, e = item
            lookup = [w.lower()]
            if e.get("lemma_form"):
                lookup.append(e["lemma_form"].lower())
            # Override kontrolü
            tr = next((self._tr_overrides[lw] for lw in lookup
                        if lw in self._tr_overrides), None)
            # tr.wiktionary — semaphore ile throttle (yalnızca use_tr_wiki=True ise)
            if not tr and use_tr_wiki:
                with self._tr_sem:
                    time.sleep(0.5)  # istek başına min. bekleme (429 önlemi)
                    tr = self._tr.fetch(w)
                    if not tr and e.get("lemma_form"):
                        time.sleep(0.5)
                        tr = self._tr.fetch(e["lemma_form"])
            return w, tr

        done = 0
        with ThreadPoolExecutor(max_workers=self._tr_workers) as pool:
            futures = {pool.submit(_fetch_tr, item): item[0] for item in valid}
            for fut in as_completed(futures):
                w, tr = fut.result()
                tr_results[w] = tr
                done += 1
                if done % 50 == 0 or done == len(futures):
                    log.info("  tr.wiktionary: %d / %d tamamlandı", done, len(futures))

        # ── Aşama 5+6: Google Translate + birleştir (checkpoint destekli) ─
        need_gt_set: set[str] = set()
        for w, e in valid:
            has_override = next(
                (self._tr_overrides[lw]
                 for lw in ([w.lower()] + ([e.get("lemma_form", "").lower()]
                             if e.get("lemma_form") else []))
                 if lw in self._tr_overrides),
                None,
            )
            if not tr_results.get(w) and not has_override:
                need_gt_set.add(w)

        if need_gt_set:
            log.info("Google Translate (batch): %d kelime çevriliyor...", len(need_gt_set))

        # Kelime → İngilizce anlam haritası (batch için)
        gt_en_map: dict[str, str] = {}  # word → english
        for w, e in valid:
            if w in need_gt_set:
                english = e.get("english")
                if english:
                    gt_en_map[w] = english

        # Tüm benzersiz İngilizce anlamları tek batch çevirisinde çevir
        if gt_en_map:
            unique_en = list(set(gt_en_map.values()))
            log.info("  → %d benzersiz İngilizce anlam → batch çevirisi...", len(unique_en))
            en_to_tr = self._translator.translate_batch(unique_en)
            self._translator.save_cache()
        else:
            en_to_tr = {}

        results = list(already)
        ckpt_counter = 0
        for i, (word, entry) in enumerate(valid, 1):
            # GT sonucunu uygula
            if word in gt_en_map:
                tr_results[word] = en_to_tr.get(gt_en_map[word])

            entry["turkish"] = tr_results.get(word)
            results.append(entry)
            ckpt_counter += 1

            # Checkpoint: belirtilen aralıkta ara kayıt
            if checkpoint_path and ckpt_counter % checkpoint_every == 0:
                WikiFetcher.save(results, checkpoint_path)
                log.info("Checkpoint: %d kayıt → %s", len(results), checkpoint_path)
                self._translator.save_cache()

            if i % 500 == 0 or i == len(valid):
                log.info("İşlem: %d / %d", i, len(valid))

        self._translator.save_cache()
        log.info("Tamamlandı: %d kayıt", len(results))
        return results

    # ── Wiktionary kategorisi ─────────────────────────────

    # ── Kategori (filtrelenmiş) ───────────────────────────

    # Öğrenme uygulaması için faydasız kategoriler
    _SKIP_RE = re.compile(
        r"^Reconstruction:"    # Proto-Latince yeniden yapılandırmalar
        r"|^Appendix:"         # Ek sayfaları
        r"|[: ]"              # Boşluk veya namespace içerenler ("Abalites sinus")
        r"|^-"                # Ön ek (-abilis)
        r"|-$"                # Son ek (ab-)
        r"|\."                # Nokta içerenler (a.d., etc.)
    )

    @classmethod
    def _is_worthwhile(cls, title: str) -> bool:
        """
        Wiktionary kategori üyesinin öğrenme verisi için faydalı olup olmadığını kontrol eder.
        """
        if not title or not title[0].isalpha():
            return False  # =, 1st, ... gibi rakam/noktalama ile başlayanlar
        if cls._SKIP_RE.search(title):
            return False
        # Büyük harfle başlıyorsa özel isim — atla
        if title[0].isupper():
            return False
        return True

    def fetch_category(
        self,
        limit: int = 0,
        resume_from: Optional[list[dict]] = None,
    ) -> list[dict]:
        """
        Wiktionary'deki tüm Latince lemmaları çeker.
        limit=0 → tümü (~32.000 kelime)
        resume_from → önceden çekilmiş kayıtlar (--resume).
        """
        log.info("Category:Latin lemmas listeleniyor...")
        titles = self._en.category_members("Category:Latin lemmas")
        log.info("Toplam %d lemma bulundu.", len(titles))

        # Öğrenme için faydasız başlıkları filtrele
        filtered = [t for t in titles if self._is_worthwhile(t)]
        log.info("Filtre sonrası: %d lemma (%d atlandı).",
                 len(filtered), len(titles) - len(filtered))

        if limit:
            filtered = filtered[:limit]
        # Kategori modunda tr.wiktionary'i atla:
        # ~32K kelime için tr.wiktionary kapsamı %1-2 civarındadır,
        # 429 rate-limit hataları süreci yavaşlatır. Google Translate daha hızlı.
        ckpt = str(Path(__file__).parent.parent / "output" / "raw.json")
        return self.fetch_list(
            filtered,
            resume_from=resume_from,
            use_tr_wiki=False,
            checkpoint_path=ckpt,
            checkpoint_every=1000,
        )

    # ── Kaydet / Yükle ────────────────────────────────────

    @staticmethod
    def save(data: list[dict], path: str) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info("Kaydedildi: %s (%d kelime)", p, len(data))

    @staticmethod
    def load(path: str) -> list[dict]:
        return json.loads(Path(path).read_text(encoding="utf-8"))

    # ── Yardımcılar ───────────────────────────────────────

    def _get_wikitext(self, title: str) -> Optional[str]:
        """Cache'den veya API'den WikiText döndürür."""
        if title in self._wt_cache:
            return self._wt_cache[title]
        result = self._en.wikitext_batch([title])
        self._wt_cache.update(result)
        return result.get(title)

    def _lookup_turkish(self, word: str, entry: dict) -> Optional[str]:
        """Tek kelime için 3-katmanlı Türkçe arama (fetch() için)."""
        lookup = [word.lower()]
        if entry.get("lemma_form"):
            lookup.append(entry["lemma_form"].lower())
        tr = next((self._tr_overrides[lw] for lw in lookup
                   if lw in self._tr_overrides), None)
        if not tr:
            tr = self._tr.fetch(word)
            if not tr and entry.get("lemma_form"):
                tr = self._tr.fetch(entry["lemma_form"])
        if not tr:
            english = entry.get("english")
            if english:
                tr = self._translator.translate(english)
                self._translator.save_cache()
        return tr

    @staticmethod
    def _is_form_page(entry: dict) -> bool:
        pos = entry.get("part_of_speech")
        return pos == "verb" and not entry.get("conjugation")
