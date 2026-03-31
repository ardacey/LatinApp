"""
morphology.py
=============
Latince morfoloji motoru. Hiçbir dış bağımlılığı yok.

Kapsam:
  - 5 isim deklinasyonu (4 cins varyantıyla)
  - 4 fiil konjugasyonu (geniş, geçmiş-sürerli, gelecek zaman)
  - 2-1-2 sıfat deklinasyonu

Kullanım:
    from pipeline.morphology import MorphologyEngine

    m = MorphologyEngine()
    forms = m.decline_noun("puella", "puellae", declension=1, gender="f")
    forms = m.conjugate_verb("porto", conjugation=1)
    forms = m.decline_adjective("bonus", "bona", "bonum")
"""

from typing import Optional


# ══════════════════════════════════════════════════════════
# İsim çekim ekleri
# ══════════════════════════════════════════════════════════

DECL1 = {
    "nom_sg": "a",   "gen_sg": "ae",   "dat_sg": "ae",   "acc_sg": "am",
    "abl_sg": "ā",   "voc_sg": "a",
    "nom_pl": "ae",  "gen_pl": "ārum", "dat_pl": "īs",   "acc_pl": "ās",
    "abl_pl": "īs",  "voc_pl": "ae",
}

DECL2_M = {
    "nom_sg": "us",  "gen_sg": "ī",    "dat_sg": "ō",    "acc_sg": "um",
    "abl_sg": "ō",   "voc_sg": "e",
    "nom_pl": "ī",   "gen_pl": "ōrum", "dat_pl": "īs",   "acc_pl": "ōs",
    "abl_pl": "īs",  "voc_pl": "ī",
}

DECL2_N = {
    "nom_sg": "um",  "gen_sg": "ī",    "dat_sg": "ō",    "acc_sg": "um",
    "abl_sg": "ō",   "voc_sg": "um",
    "nom_pl": "a",   "gen_pl": "ōrum", "dat_pl": "īs",   "acc_pl": "a",
    "abl_pl": "īs",  "voc_pl": "a",
}

DECL2_ER = {
    "nom_sg": "",    "gen_sg": "ī",    "dat_sg": "ō",    "acc_sg": "um",
    "abl_sg": "ō",   "voc_sg": "",
    "nom_pl": "ī",   "gen_pl": "ōrum", "dat_pl": "īs",   "acc_pl": "ōs",
    "abl_pl": "īs",  "voc_pl": "ī",
}

DECL3_MF = {
    "nom_sg": None,  "gen_sg": "is",   "dat_sg": "ī",    "acc_sg": "em",
    "abl_sg": "e",   "voc_sg": None,
    "nom_pl": "ēs",  "gen_pl": "um",   "dat_pl": "ibus", "acc_pl": "ēs",
    "abl_pl": "ibus","voc_pl": "ēs",
}

DECL3_N = {
    "nom_sg": None,  "gen_sg": "is",   "dat_sg": "ī",    "acc_sg": None,
    "abl_sg": "e",   "voc_sg": None,
    "nom_pl": "a",   "gen_pl": "um",   "dat_pl": "ibus", "acc_pl": "a",
    "abl_pl": "ibus","voc_pl": "a",
}

DECL3I_MF = {
    "nom_sg": None,  "gen_sg": "is",   "dat_sg": "ī",    "acc_sg": "em",
    "abl_sg": "ī",   "voc_sg": None,
    "nom_pl": "ēs",  "gen_pl": "ium",  "dat_pl": "ibus", "acc_pl": "ēs",
    "abl_pl": "ibus","voc_pl": "ēs",
}

DECL3I_N = {
    "nom_sg": None,  "gen_sg": "is",   "dat_sg": "ī",    "acc_sg": None,
    "abl_sg": "ī",   "voc_sg": None,
    "nom_pl": "ia",  "gen_pl": "ium",  "dat_pl": "ibus", "acc_pl": "ia",
    "abl_pl": "ibus","voc_pl": "ia",
}

DECL4_MF = {
    "nom_sg": "us",  "gen_sg": "ūs",   "dat_sg": "uī",   "acc_sg": "um",
    "abl_sg": "ū",   "voc_sg": "us",
    "nom_pl": "ūs",  "gen_pl": "uum",  "dat_pl": "ibus", "acc_pl": "ūs",
    "abl_pl": "ibus","voc_pl": "ūs",
}

DECL4_N = {
    "nom_sg": "ū",   "gen_sg": "ūs",   "dat_sg": "ū",    "acc_sg": "ū",
    "abl_sg": "ū",   "voc_sg": "ū",
    "nom_pl": "ua",  "gen_pl": "uum",  "dat_pl": "ibus", "acc_pl": "ua",
    "abl_pl": "ibus","voc_pl": "ua",
}

DECL5 = {
    "nom_sg": "ēs",  "gen_sg": "eī",   "dat_sg": "eī",   "acc_sg": "em",
    "abl_sg": "ē",   "voc_sg": "ēs",
    "nom_pl": "ēs",  "gen_pl": "ērum", "dat_pl": "ēbus", "acc_pl": "ēs",
    "abl_pl": "ēbus","voc_pl": "ēs",
}

# ══════════════════════════════════════════════════════════
# Fiil çekim ekleri
# ══════════════════════════════════════════════════════════

CONJ1 = {
    "pres_1sg": "ō",     "pres_2sg": "ās",    "pres_3sg": "at",
    "pres_1pl": "āmus",  "pres_2pl": "ātis",  "pres_3pl": "ant",
    "impf_1sg": "ābam",  "impf_2sg": "ābās",  "impf_3sg": "ābat",
    "impf_1pl": "ābāmus","impf_2pl": "ābātis","impf_3pl": "ābant",
    "fut_1sg":  "ābō",   "fut_2sg":  "ābis",  "fut_3sg":  "ābit",
    "fut_1pl":  "ābimus","fut_2pl":  "ābitis","fut_3pl":  "ābunt",
    "inf_pres": "āre",
    "imp_sg":   "ā",     "imp_pl":   "āte",
}

CONJ2 = {
    "pres_1sg": "eō",    "pres_2sg": "ēs",    "pres_3sg": "et",
    "pres_1pl": "ēmus",  "pres_2pl": "ētis",  "pres_3pl": "ent",
    "impf_1sg": "ēbam",  "impf_2sg": "ēbās",  "impf_3sg": "ēbat",
    "impf_1pl": "ēbāmus","impf_2pl": "ēbātis","impf_3pl": "ēbant",
    "fut_1sg":  "ēbō",   "fut_2sg":  "ēbis",  "fut_3sg":  "ēbit",
    "fut_1pl":  "ēbimus","fut_2pl":  "ēbitis","fut_3pl":  "ēbunt",
    "inf_pres": "ēre",
    "imp_sg":   "ē",     "imp_pl":   "ēte",
}

CONJ3 = {
    "pres_1sg": "ō",     "pres_2sg": "is",    "pres_3sg": "it",
    "pres_1pl": "imus",  "pres_2pl": "itis",  "pres_3pl": "unt",
    "impf_1sg": "ēbam",  "impf_2sg": "ēbās",  "impf_3sg": "ēbat",
    "impf_1pl": "ēbāmus","impf_2pl": "ēbātis","impf_3pl": "ēbant",
    "fut_1sg":  "am",    "fut_2sg":  "ēs",    "fut_3sg":  "et",
    "fut_1pl":  "ēmus",  "fut_2pl":  "ētis",  "fut_3pl":  "ent",
    "inf_pres": "ere",
    "imp_sg":   "e",     "imp_pl":   "ite",
}

CONJ3I = {  # 3. io çekimi: capiō, capere
    "pres_1sg": "iō",    "pres_2sg": "is",    "pres_3sg": "it",
    "pres_1pl": "imus",  "pres_2pl": "itis",  "pres_3pl": "iunt",
    "impf_1sg": "iēbam", "impf_2sg": "iēbās", "impf_3sg": "iēbat",
    "impf_1pl": "iēbāmus","impf_2pl":"iēbātis","impf_3pl": "iēbant",
    "fut_1sg":  "iam",   "fut_2sg":  "iēs",   "fut_3sg":  "iet",
    "fut_1pl":  "iēmus", "fut_2pl":  "iētis", "fut_3pl":  "ient",
    "inf_pres": "ere",
    "imp_sg":   "e",     "imp_pl":   "ite",
}

CONJ4 = {
    "pres_1sg": "iō",    "pres_2sg": "īs",    "pres_3sg": "it",
    "pres_1pl": "īmus",  "pres_2pl": "ītis",  "pres_3pl": "iunt",
    "impf_1sg": "iēbam", "impf_2sg": "iēbās", "impf_3sg": "iēbat",
    "impf_1pl": "iēbāmus","impf_2pl":"iēbātis","impf_3pl": "iēbant",
    "fut_1sg":  "iam",   "fut_2sg":  "iēs",   "fut_3sg":  "iet",
    "fut_1pl":  "iēmus", "fut_2pl":  "iētis", "fut_3pl":  "ient",
    "inf_pres": "īre",
    "imp_sg":   "ī",     "imp_pl":   "īte",
}

# ══════════════════════════════════════════════════════════
# Sıfat çekim ekleri (2-1-2)
# ══════════════════════════════════════════════════════════

ADJ_212_M = {
    "nom_sg": "us",  "gen_sg": "ī",    "dat_sg": "ō",    "acc_sg": "um",
    "abl_sg": "ō",   "voc_sg": "e",
    "nom_pl": "ī",   "gen_pl": "ōrum", "dat_pl": "īs",   "acc_pl": "ōs",
    "abl_pl": "īs",  "voc_pl": "ī",
}

ADJ_212_F = {
    "nom_sg": "a",   "gen_sg": "ae",   "dat_sg": "ae",   "acc_sg": "am",
    "abl_sg": "ā",   "voc_sg": "a",
    "nom_pl": "ae",  "gen_pl": "ārum", "dat_pl": "īs",   "acc_pl": "ās",
    "abl_pl": "īs",  "voc_pl": "ae",
}

ADJ_212_N = {
    "nom_sg": "um",  "gen_sg": "ī",    "dat_sg": "ō",    "acc_sg": "um",
    "abl_sg": "ō",   "voc_sg": "um",
    "nom_pl": "a",   "gen_pl": "ōrum", "dat_pl": "īs",   "acc_pl": "a",
    "abl_pl": "īs",  "voc_pl": "a",
}


# ══════════════════════════════════════════════════════════
# Morfoloji motoru
# ══════════════════════════════════════════════════════════

class MorphologyEngine:
    """
    İsim çekimi, fiil çekimi ve sıfat çekimi üretir.
    Çıktı: [{"form": "...", "case": "...", "number": "...", ...}]
    """

    # ── İsim çekimi ───────────────────────────────────────

    def decline_noun(
        self,
        nominative: str,
        genitive:   str,
        declension: int,
        gender:     str,
        is_i_stem:  bool = False,
    ) -> list[dict]:
        """
        İsim çekim tablosu üretir.

        Args:
            nominative: nom.sg (ör. "puella")
            genitive:   gen.sg (ör. "puellae")
            declension: 1–5
            gender:     "m", "f", "n"
            is_i_stem:  3. deklinasyon i-gövdeli mi?

        Returns:
            12 elemanlı liste: her biri {form, case, number, declension, gender}
        """
        paradigm = self._noun_paradigm(declension, gender, is_i_stem)
        stem     = self._noun_stem(nominative, genitive, declension)

        if stem is None:
            return []

        forms = []
        cases = ["nom", "gen", "dat", "acc", "abl", "voc"]
        for number in ("sg", "pl"):
            for case in cases:
                key    = f"{case}_{number}"
                ending = paradigm.get(key)

                if ending is None:
                    if case in ("nom", "voc"):
                        form = nominative
                    elif case == "acc" and gender == "n":
                        nom_form = next(
                            (x["form"] for x in forms
                             if x["case"] == "nom" and x["number"] == number),
                            stem,
                        )
                        form = nom_form
                    else:
                        continue
                else:
                    form = stem + ending

                forms.append({
                    "form":       form,
                    "case":       case,
                    "number":     number,
                    "declension": declension,
                    "gender":     gender,
                })

        return forms

    # ── Fiil çekimi ───────────────────────────────────────

    def conjugate_verb(
        self,
        present_1sg: str,
        conjugation: int,
        tenses:      Optional[list[str]] = None,
        is_io:       bool = False,
    ) -> list[dict]:
        """
        Fiil çekim tablosu üretir.

        Args:
            present_1sg: 1. tekil geniş zaman (ör. "porto")
            conjugation: 1–4
            tenses:      ["pres", "impf", "fut"]  (None=hepsi)
            is_io:       3. io çekimi mi?

        Returns:
            Her form için {form, tense, person, number, conjugation}
        """
        paradigm = self._verb_paradigm(conjugation, is_io)
        stem     = self._verb_stem(present_1sg, conjugation)

        if tenses is None:
            tenses = ["pres", "impf", "fut"]

        forms = []
        for tense in tenses:
            for person in (1, 2, 3):
                for number in ("sg", "pl"):
                    key    = f"{tense}_{person}{number}"
                    ending = paradigm.get(key)
                    if ending is None:
                        continue
                    forms.append({
                        "form":        stem + ending,
                        "tense":       tense,
                        "person":      person,
                        "number":      number,
                        "mood":        "indicative",
                        "voice":       "active",
                        "conjugation": conjugation,
                    })

        # Mastar ekle
        inf_ending = paradigm.get("inf_pres")
        if inf_ending:
            forms.append({
                "form":        stem + inf_ending,
                "tense":       "pres",
                "person":      None,
                "number":      None,
                "mood":        "infinitive",
                "voice":       "active",
                "conjugation": conjugation,
            })

        return forms

    # ── Sıfat çekimi ──────────────────────────────────────

    def decline_adjective(
        self,
        masc_nom: str,
        fem_nom:  str,
        neut_nom: str,
    ) -> list[dict]:
        """
        2-1-2 sıfat çekim tablosu üretir.

        Args:
            masc_nom: erkek nominatif (ör. "bonus")
            fem_nom:  dişil nominatif (ör. "bona")
            neut_nom: nötr nominatif  (ör. "bonum")
        """
        stem  = self._adj_stem(masc_nom)
        forms = []

        for gender, paradigm in (
            ("m", ADJ_212_M), ("f", ADJ_212_F), ("n", ADJ_212_N)
        ):
            for number in ("sg", "pl"):
                for case in ("nom", "gen", "dat", "acc", "abl", "voc"):
                    key    = f"{case}_{number}"
                    ending = paradigm.get(key)
                    if ending is None:
                        continue
                    if case == "nom" and number == "sg":
                        form = {"m": masc_nom, "f": fem_nom, "n": neut_nom}[gender]
                    else:
                        form = stem + ending
                    forms.append({
                        "form":   form,
                        "case":   case,
                        "number": number,
                        "gender": gender,
                    })

        return forms

    # ══════════════════════════════════════════════════════
    # Paradigm seçici yardımcılar
    # ══════════════════════════════════════════════════════

    @staticmethod
    def _noun_paradigm(decl: int, gender: str, i_stem: bool) -> dict:
        if decl == 1: return DECL1
        if decl == 2: return DECL2_N if gender == "n" else DECL2_M
        if decl == 3:
            if gender == "n": return DECL3I_N  if i_stem else DECL3_N
            return DECL3I_MF if i_stem else DECL3_MF
        if decl == 4: return DECL4_N  if gender == "n" else DECL4_MF
        if decl == 5: return DECL5
        return {}

    @staticmethod
    def _verb_paradigm(conj: int, is_io: bool) -> dict:
        if conj == 1: return CONJ1
        if conj == 2: return CONJ2
        if conj == 3: return CONJ3I if is_io else CONJ3
        if conj == 4: return CONJ4
        return {}

    # ══════════════════════════════════════════════════════
    # Gövde çıkarıcılar
    # ══════════════════════════════════════════════════════

    @staticmethod
    def _noun_stem(nom: str, gen: str, decl: int) -> Optional[str]:
        """Genetive'den isim gövdesi çıkarır."""
        patterns = {
            1: ("ae",  "ārum"),
            2: ("ī",   "ōrum"),
            3: ("is",  "ium"),
            4: ("ūs",  "uum"),
            5: ("eī",  "ērum"),
        }
        endings = patterns.get(decl, ())
        for end in endings:
            if gen.endswith(end):
                return gen[: -len(end)]
        return gen[:-2] if len(gen) > 2 else None

    @staticmethod
    def _verb_stem(pres_1sg: str, conj: int) -> str:
        """1. tekil geniş zamandan fiil gövdesi çıkarır."""
        word = pres_1sg.lower()
        if word.endswith("io"):
            return word[:-2]
        if word.endswith("o"):
            return word[:-1]
        return word

    @staticmethod
    def _adj_stem(masc_nom: str) -> str:
        """bonus → bon, magnus → magn"""
        word = masc_nom.lower()
        if word.endswith("us"):
            return word[:-2]
        if word.endswith("er"):
            return word[:-2]
        return word
