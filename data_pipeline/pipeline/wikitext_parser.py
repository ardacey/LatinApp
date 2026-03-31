"""
wikitext_parser.py
==================
İngilizce Wiktionary WikiText'ten Latince morfoloji verisi çıkarır.
"""

import re
from typing import Optional


# ── POS eşlemesi ──────────────────────────────────────────
POS_MAP = {
    "Noun":        "noun",
    "Verb":        "verb",
    "Adjective":   "adjective",
    "Adverb":      "adverb",
    "Preposition": "preposition",
    "Conjunction": "conjunction",
    "Pronoun":     "pronoun",
    "Numeral":     "numeral",
    "Interjection":"interjection",
    "Participle":  "participle",
    "Determiner":  "determiner",
}

# ── Deklinasyon için cinsiyet varsayılanları ───────────────
DECL_GENDER = {1: "f", 2: "m", 3: "m", 4: "m", 5: "f"}

# ── Makronlu → ASCII (lemma arama için) ───────────────────
MACRON_TABLE = str.maketrans("āēīōūĀĒĪŌŪ", "aeiouAEIOU")


# ══════════════════════════════════════════════════════════
# WikiText ayrıştırıcı
# ══════════════════════════════════════════════════════════

class _Parser:
    """İngilizce Wiktionary WikiText'ten Latince veri çıkarır."""

    _LINK = re.compile(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]")
    _TMPL = re.compile(r"\{\{[^{}]*\}\}")   # bir kat template
    _BOLD = re.compile(r"'''?")
    _JUNK = re.compile(                      # çeviri için işe yaramaz kalıplar
        r"^\s*[;,.()\[\]{}'\"]+\s*$"        # sadece noktalama
        r"|of\s+or\s+(?:from|pertaining\s+to)\s+the\s*[,.]?\s*$"  # "of or from the ."
        r"|^(?:in|of|from|to|at)\s+[,;.]"  # "in , ," kalıpları
    )

    @classmethod
    def _strip_wiki(cls, text: str) -> str:
        """
        WikiText markup'ını temizler:
        - İç içe template'leri ({{ }}) güvenli şekilde kaldırır
        - [[link]] → görünen metin
        - '''bold''' kaldırır
        - Orphan {{ veya }} kalıntılarını temizler
        """
        # İç içe template'leri dıştan içe doğru soy: 5 geçiş yeterli
        prev = None
        for _ in range(6):
            text = cls._TMPL.sub("", text)
            if text == prev:
                break
            prev = text
        # Link dönüşümü
        text = cls._LINK.sub(r"\1", text)
        # Bold kaldır
        text = cls._BOLD.sub("", text)
        # Orphan {{ veya }} kalıntıları
        text = re.sub(r"\{\{|\}\}", "", text)
        # Beyaz boşluk normalize
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def parse(self, title: str, wikitext: str) -> Optional[dict]:
        """
        WikiText'ten yapılandırılmış kelime kaydı üretir.
        None döndürürse kelime Latince lemma değil (form sayfası veya başka dil).
        """
        latin = self._latin_block(wikitext)
        if not latin:
            return None

        pos = self._pos(latin)
        if not pos:
            return None

        entry = {
            "latin":          title,
            "part_of_speech": pos,
            "english":        self._meanings(latin),
            "declension":     None,
            "conjugation":    None,
            "gender":         None,
            "genitive":       None,
            "present_1sg":    None,
            "examples":       self._examples(latin),
        }

        if pos == "noun":
            self._parse_noun(title, latin, entry)
        elif pos == "verb":
            self._parse_verb(latin, entry)
        elif pos == "adjective":
            self._parse_adj(latin, entry)

        return entry

    # ── Latin bölümü ──────────────────────────────────────

    def _latin_block(self, wt: str) -> Optional[str]:
        m = re.search(r"==Latin==\n(.*?)(?:\n==[^=]|\Z)", wt, re.DOTALL)
        return m.group(1) if m else None

    # ── POS ───────────────────────────────────────────────

    def _pos(self, block: str) -> Optional[str]:
        """Metinde en erken görünen POS bölümünü döndürür."""
        best_pos, best_start = None, len(block)
        for section, pos in POS_MAP.items():
            m = re.search(rf"====?{section}====?", block)
            if m and m.start() < best_start:
                best_start = m.start()
                best_pos   = pos
        return best_pos

    # ── Anlamlar (#/## satırlar) ──────────────────────────

    # Wikitext'te doğrudan İngilizce kelime gösteren kalıplar
    _L_EN  = re.compile(r"\{\{l\|en\|([^|}\n]+)")       # {{l|en|word}}
    _T_EQ  = re.compile(r"\|t2?=([^|}\n]+)")            # |t=... veya |t2=...
    _LBONLY = re.compile(r"^\{\{(?:lb|label|tlb)\|")    # Sadece etiket satırı

    def _meanings(self, block: str) -> Optional[str]:
        """
        Anlam satırlarını çıkarır:
        - # ve ## seviyelerini destekler (##: abduco gibi etiket+alt-anlam yapısı)
        - {{l|en|word}} ve |t= parametrelerinden anlam kurtarır
        """
        # # ve ## satırlarını düzgün ayır: ^#{1,2}\s*(.+)$
        lines = re.findall(r"^#{1,2}\s*(.+)$", block, re.MULTILINE)
        cleaned = []
        for line in lines:
            # Silmeden önce {{l|en|}} ve t= değerlerini kaydet
            l_en = self._L_EN.search(line)
            t_eq = self._T_EQ.search(line)

            stripped = self._strip_wiki(line)

            # strip_wiki sonrası anlamlı içerik kalmadıysa kurtarma dene
            # (örn: ":" veya "()" kaldıysa, veya tamamen boşsa)
            _meaningful = stripped.strip(":;,. ()[]")
            if not _meaningful:
                if t_eq:
                    stripped = t_eq.group(1).strip()
                elif l_en:
                    stripped = l_en.group(1).strip()
                else:
                    continue

            if not stripped or stripped.startswith(("#", "*", ":")):
                continue
            stripped = re.sub(r"\(\s*[,;.]*\s*\)", "", stripped).strip()
            stripped = stripped.strip(";,. ")
            if not stripped or len(stripped) < 2:
                continue
            if self._JUNK.search(stripped):
                continue
            cleaned.append(stripped)

        # Tekrar eden anlamları kaldır (sıra korunarak)
        seen: set = set()
        deduped = []
        for c in cleaned:
            key = c.lower()
            if key not in seen:
                seen.add(key)
                deduped.append(c)

        return "; ".join(deduped[:4]) if deduped else None


    # ── Örnek cümleler ────────────────────────────────────

    def _examples(self, block: str) -> list[dict]:
        """{{ux|la|Latince cümle|Çeviri}} kalıplarını çıkarır."""
        matches = re.findall(
            r"\{\{ux?\|la\|([^|}\n]+)\|([^|}\n]+)", block
        )
        result = []
        for lat, eng in matches:
            lat = self._strip_wiki(lat)
            eng = self._strip_wiki(eng)
            if lat:
                result.append({"latin": lat, "english": eng or None, "turkish": None})
        return result

    # ── İsim bilgisi ──────────────────────────────────────

    def _parse_noun(self, title: str, block: str, entry: dict) -> None:
        m = re.search(r"\{\{la-noun\|[^<}]*<(\d)(?:\.([^>}]*))?", block)
        if not m:
            return

        decl   = int(m.group(1))
        suffix = (m.group(2) or "").upper()
        entry["declension"] = decl

        if "N" in suffix.split(".") or title.endswith(("um", "ium", "on")):
            entry["gender"] = "n"
        else:
            entry["gender"] = DECL_GENDER.get(decl, "m")

        # Açık g= parametresi her zaman kazanır
        gm = re.search(r"\{\{la-noun\|[^}]*\|g=([mfn])", block)
        if gm:
            entry["gender"] = gm.group(1)
        # Genitif: açık gen= parametresi: {{la-noun|...|gen=rēgis}}
        gen_m = re.search(r"\{\{la-noun\|[^}]*?\bgen=([^|}<\n]+)", block)
        if gen_m:
            entry["genitive"] = gen_m.group(1).strip().translate(MACRON_TABLE)
        else:
            # nom/stem<N> notasyonu: {{la-noun|rēx/rēg<3>}} → stem = rēg
            stem_m = re.search(r"\{\{la-noun\|[^/|}]+/([^<|}<\n]+)<(\d)", block)
            if stem_m:
                stem = stem_m.group(1).strip().translate(MACRON_TABLE)
                stem_decl = int(stem_m.group(2))
                if stem_decl == 3:
                    entry["genitive"] = stem + "is"
                elif stem_decl == 4:
                    entry["genitive"] = stem + "us"
    # ── Fiil bilgisi ──────────────────────────────────────

    # Latince fiil form karakter sınıfı (makronlu ve ligature dahil)
    _VERB_1SG_OLD = re.compile(
        r"\{\{la-verb\|[^|}\n]+\|([a-zāēīōūæœ]+(?:ō|or|ior))\b"
    )
    _VERB_1SG_NEW = re.compile(
        r"\{\{la-verb\|([a-zāēīōūæœ]+(?:ō|or|ior))(?:<|[|}])"
    )

    def _parse_verb(self, block: str, entry: dict) -> None:
        # ── Konjugasyon numarası ──────────────────────
        # Eski format: {{la-verb|N|...}} N=1/2/3/4 (ile başlar)
        m = re.search(r"\{\{la-verb\|(\d)", block)
        if m:
            entry["conjugation"] = int(m.group(1))
        else:
            # Yeni format: {{la-verb|lemmaō<N>}}
            m2 = re.search(r"\{\{la-verb\|[^<|}\n]+<(\d)", block)
            if m2:
                entry["conjugation"] = int(m2.group(1))
        # Not: {{la-verb|irreg|...}} → conjugation=None kalır (düzensiz fiil)

        # ── Present 1. tekil ─────────────────────────
        # Önce eski format: ikinci parametre -ō/-or/-ior
        p = self._VERB_1SG_OLD.search(block)
        if p:
            entry["present_1sg"] = p.group(1).translate(MACRON_TABLE)
        else:
            # Yeni format: ilk parametre
            p2 = self._VERB_1SG_NEW.search(block)
            if p2:
                entry["present_1sg"] = p2.group(1).translate(MACRON_TABLE)

    # ── Sıfat bilgisi ─────────────────────────────────────

    def _parse_adj(self, block: str, entry: dict) -> None:
        m = re.search(r"\{\{la-adj\|([^|}\n]+)", block)
        if m:
            entry["adj_stem"] = m.group(1).strip()


# ══════════════════════════════════════════════════════════
# Form sayfası dedektörü
# ══════════════════════════════════════════════════════════

def _extract_lemma_from_form(wikitext: str) -> Optional[str]:
    """
    Bir form sayfasından (portare, puellam...) lemma'yı çıkarır.
    {{inflection of|la|portō||pres|actv|inf}} → "porto"
    """
    patterns = [
        r"\{\{inflection of\|la\|([^|}\n]+)",
        r"\{\{la-verb-form-of\|([^|}\n]+)",
        r"\{\{form of\|la\|([^|}\n]+)",
    ]
    for pat in patterns:
        m = re.search(pat, wikitext)
        if m:
            raw = m.group(1).strip().rstrip("|")
            return raw.translate(MACRON_TABLE)
    return None
