"""
morphology.py
=============
Latince morfoloji motoru. Hicbir dis bagimliligi yok.

Kapsam:
  - 5 isim deklinasyonu (4 cins varyantiyla)
  - 4 fiil konjugasyonu
      * indicative: pres / impf / fut / perf (active)
      * subjunctive: pres / impf (active)
      * present infinitive + imperative
  - 2-1-2 sifat deklinasyonu
  - 3. deklinasyon sifat (2-termination ve 1-termination)
"""

from typing import Optional


# ======================================================================
# Isim cekim ekleri
# ======================================================================

DECL1 = {
    "nom_sg": "a",    "gen_sg": "ae",    "dat_sg": "ae",    "acc_sg": "am",
    "abl_sg": "ā",    "voc_sg": "a",
    "nom_pl": "ae",   "gen_pl": "ārum",  "dat_pl": "īs",    "acc_pl": "ās",
    "abl_pl": "īs",   "voc_pl": "ae",
}

DECL2_M = {
    "nom_sg": "us",   "gen_sg": "ī",     "dat_sg": "ō",     "acc_sg": "um",
    "abl_sg": "ō",    "voc_sg": "e",
    "nom_pl": "ī",    "gen_pl": "ōrum",  "dat_pl": "īs",    "acc_pl": "ōs",
    "abl_pl": "īs",   "voc_pl": "ī",
}

DECL2_N = {
    "nom_sg": "um",   "gen_sg": "ī",     "dat_sg": "ō",     "acc_sg": "um",
    "abl_sg": "ō",    "voc_sg": "um",
    "nom_pl": "a",    "gen_pl": "ōrum",  "dat_pl": "īs",    "acc_pl": "a",
    "abl_pl": "īs",   "voc_pl": "a",
}

DECL2_ER = {
    "nom_sg": "",     "gen_sg": "ī",     "dat_sg": "ō",     "acc_sg": "um",
    "abl_sg": "ō",    "voc_sg": "",
    "nom_pl": "ī",    "gen_pl": "ōrum",  "dat_pl": "īs",    "acc_pl": "ōs",
    "abl_pl": "īs",   "voc_pl": "ī",
}

DECL3_MF = {
    "nom_sg": None,   "gen_sg": "is",    "dat_sg": "ī",     "acc_sg": "em",
    "abl_sg": "e",    "voc_sg": None,
    "nom_pl": "ēs",   "gen_pl": "um",    "dat_pl": "ibus",   "acc_pl": "ēs",
    "abl_pl": "ibus", "voc_pl": "ēs",
}

DECL3_N = {
    "nom_sg": None,   "gen_sg": "is",    "dat_sg": "ī",     "acc_sg": None,
    "abl_sg": "e",    "voc_sg": None,
    "nom_pl": "a",    "gen_pl": "um",    "dat_pl": "ibus",   "acc_pl": "a",
    "abl_pl": "ibus", "voc_pl": "a",
}

DECL3I_MF = {
    "nom_sg": None,   "gen_sg": "is",    "dat_sg": "ī",     "acc_sg": "em",
    "abl_sg": "ī",    "voc_sg": None,
    "nom_pl": "ēs",   "gen_pl": "ium",   "dat_pl": "ibus",   "acc_pl": "ēs",
    "abl_pl": "ibus", "voc_pl": "ēs",
}

DECL3I_N = {
    "nom_sg": None,   "gen_sg": "is",    "dat_sg": "ī",     "acc_sg": None,
    "abl_sg": "ī",    "voc_sg": None,
    "nom_pl": "ia",   "gen_pl": "ium",   "dat_pl": "ibus",   "acc_pl": "ia",
    "abl_pl": "ibus", "voc_pl": "ia",
}

DECL4_MF = {
    "nom_sg": "us",   "gen_sg": "ūs",   "dat_sg": "uī",    "acc_sg": "um",
    "abl_sg": "ū",    "voc_sg": "us",
    "nom_pl": "ūs",   "gen_pl": "uum",   "dat_pl": "ibus",   "acc_pl": "ūs",
    "abl_pl": "ibus", "voc_pl": "ūs",
}

DECL4_N = {
    "nom_sg": "ū",    "gen_sg": "ūs",   "dat_sg": "ū",     "acc_sg": "ū",
    "abl_sg": "ū",    "voc_sg": "ū",
    "nom_pl": "ua",   "gen_pl": "uum",   "dat_pl": "ibus",   "acc_pl": "ua",
    "abl_pl": "ibus", "voc_pl": "ua",
}

DECL5 = {
    "nom_sg": "ēs",   "gen_sg": "eī",   "dat_sg": "eī",   "acc_sg": "em",
    "abl_sg": "ē",    "voc_sg": "ēs",
    "nom_pl": "ēs",   "gen_pl": "ērum",  "dat_pl": "ēbus",  "acc_pl": "ēs",
    "abl_pl": "ēbus", "voc_pl": "ēs",
}


# ======================================================================
# Fiil cekim ekleri
# ======================================================================

CONJ1 = {
    "pres_1sg": "ō",      "pres_2sg": "ās",     "pres_3sg": "at",
    "pres_1pl": "āmus",   "pres_2pl": "ātis",   "pres_3pl": "ant",
    "impf_1sg": "ābam",   "impf_2sg": "ābās",   "impf_3sg": "ābat",
    "impf_1pl": "ābāmus", "impf_2pl": "ābātis", "impf_3pl": "ābant",
    "fut_1sg":  "ābō",    "fut_2sg":  "ābis",   "fut_3sg":  "ābit",
    "fut_1pl":  "ābimus",  "fut_2pl":  "ābitis", "fut_3pl":  "ābunt",
    "psubj_1sg": "em",    "psubj_2sg": "ēs",   "psubj_3sg": "et",
    "psubj_1pl": "ēmus",  "psubj_2pl": "ētis",  "psubj_3pl": "ent",
    "inf_pres": "āre",
    "imp_sg":   "ā",      "imp_pl":   "āte",
}

CONJ2 = {
    "pres_1sg": "eō",     "pres_2sg": "ēs",     "pres_3sg": "et",
    "pres_1pl": "ēmus",   "pres_2pl": "ētis",   "pres_3pl": "ent",
    "impf_1sg": "ēbam",   "impf_2sg": "ēbās",   "impf_3sg": "ēbat",
    "impf_1pl": "ēbāmus", "impf_2pl": "ēbātis", "impf_3pl": "ēbant",
    "fut_1sg":  "ēbō",    "fut_2sg":  "ēbis",   "fut_3sg":  "ēbit",
    "fut_1pl":  "ēbimus",  "fut_2pl":  "ēbitis", "fut_3pl":  "ēbunt",
    "psubj_1sg": "eam",   "psubj_2sg": "eās",  "psubj_3sg": "eat",
    "psubj_1pl": "eāmus", "psubj_2pl": "eātis", "psubj_3pl": "eant",
    "inf_pres": "ēre",
    "imp_sg":   "ē",      "imp_pl":   "ēte",
}

CONJ3 = {
    "pres_1sg": "ō",      "pres_2sg": "is",     "pres_3sg": "it",
    "pres_1pl": "imus",   "pres_2pl": "itis",   "pres_3pl": "unt",
    "impf_1sg": "ēbam",   "impf_2sg": "ēbās",   "impf_3sg": "ēbat",
    "impf_1pl": "ēbāmus", "impf_2pl": "ēbātis", "impf_3pl": "ēbant",
    "fut_1sg":  "am",     "fut_2sg":  "ēs",     "fut_3sg":  "et",
    "fut_1pl":  "ēmus",   "fut_2pl":  "ētis",   "fut_3pl":  "ent",
    "psubj_1sg": "am",    "psubj_2sg": "ās",   "psubj_3sg": "at",
    "psubj_1pl": "āmus",  "psubj_2pl": "ātis",  "psubj_3pl": "ant",
    "inf_pres": "ere",
    "imp_sg":   "e",      "imp_pl":   "ite",
}

CONJ3I = {
    "pres_1sg": "iō",     "pres_2sg": "is",     "pres_3sg": "it",
    "pres_1pl": "imus",   "pres_2pl": "itis",   "pres_3pl": "iunt",
    "impf_1sg": "iēbam",  "impf_2sg": "iēbās",  "impf_3sg": "iēbat",
    "impf_1pl": "iēbāmus", "impf_2pl": "iēbātis", "impf_3pl": "iēbant",
    "fut_1sg":  "iam",    "fut_2sg":  "iēs",    "fut_3sg":  "iet",
    "fut_1pl":  "iēmus",  "fut_2pl":  "iētis",  "fut_3pl":  "ient",
    "psubj_1sg": "iam",   "psubj_2sg": "iās",  "psubj_3sg": "iat",
    "psubj_1pl": "iāmus", "psubj_2pl": "iātis", "psubj_3pl": "iant",
    "inf_pres": "ere",
    "imp_sg":   "e",      "imp_pl":   "ite",
}

CONJ4 = {
    "pres_1sg": "iō",     "pres_2sg": "īs",     "pres_3sg": "it",
    "pres_1pl": "īmus",   "pres_2pl": "ītis",   "pres_3pl": "iunt",
    "impf_1sg": "iēbam",  "impf_2sg": "iēbās",  "impf_3sg": "iēbat",
    "impf_1pl": "iēbāmus", "impf_2pl": "iēbātis", "impf_3pl": "iēbant",
    "fut_1sg":  "iam",    "fut_2sg":  "iēs",    "fut_3sg":  "iet",
    "fut_1pl":  "iēmus",  "fut_2pl":  "iētis",  "fut_3pl":  "ient",
    "psubj_1sg": "iam",   "psubj_2sg": "iās",  "psubj_3sg": "iat",
    "psubj_1pl": "iāmus", "psubj_2pl": "iātis", "psubj_3pl": "iant",
    "inf_pres": "īre",
    "imp_sg":   "ī",      "imp_pl":   "īte",
}

# Imperfect subjunctive: infinitive minus final e + endings
# portāre -> portār + em = portārem
IMPF_SUBJ_ENDINGS = {
    "1sg": "em", "2sg": "ēs", "3sg": "et",
    "1pl": "ēmus", "2pl": "ētis", "3pl": "ent",
}

# Perfect indicative active: perfect stem + endings
PERF_IND_ENDINGS = {
    "1sg": "ī",    "2sg": "istī",  "3sg": "it",
    "1pl": "imus", "2pl": "istis", "3pl": "ērunt",
}

# Passive imperfect subjunctive: infinitive - e + endings
PASS_IMPF_SUBJ_ENDINGS = {
    "1sg": "r", "2sg": "ēris", "3sg": "ētur",
    "1pl": "ēmur", "2pl": "ēminī", "3pl": "entur",
}

# Passive present system: stem + ending
# Keys: conj (1,2,3,"3i",4), tense (pres,impf,fut,psubj), person+number
PASS_ENDINGS = {
    1: {
        "pres": {"1sg": "or",    "2sg": "āris",    "3sg": "ātur",
                 "1pl": "āmur",  "2pl": "āminī",   "3pl": "antur"},
        "impf": {"1sg": "ābar",  "2sg": "ābāris",  "3sg": "ābātur",
                 "1pl": "ābāmur","2pl": "ābāminī", "3pl": "ābantur"},
        "fut":  {"1sg": "ābor",  "2sg": "āberis",  "3sg": "ābitur",
                 "1pl": "ābimur","2pl": "ābiminī", "3pl": "ābuntur"},
        "psubj":{"1sg": "er",    "2sg": "ēris",    "3sg": "ētur",
                 "1pl": "ēmur",  "2pl": "ēminī",   "3pl": "entur"},
        "inf":  "ārī",
    },
    2: {
        "pres": {"1sg": "eor",   "2sg": "ēris",    "3sg": "ētur",
                 "1pl": "ēmur",  "2pl": "ēminī",   "3pl": "entur"},
        "impf": {"1sg": "ēbar",  "2sg": "ēbāris",  "3sg": "ēbātur",
                 "1pl": "ēbāmur","2pl": "ēbāminī", "3pl": "ēbantur"},
        "fut":  {"1sg": "ēbor",  "2sg": "ēberis",  "3sg": "ēbitur",
                 "1pl": "ēbimur","2pl": "ēbiminī", "3pl": "ēbuntur"},
        "psubj":{"1sg": "ear",   "2sg": "eāris",   "3sg": "eātur",
                 "1pl": "eāmur", "2pl": "eāminī",  "3pl": "eantur"},
        "inf":  "ērī",
    },
    3: {
        "pres": {"1sg": "or",    "2sg": "eris",    "3sg": "itur",
                 "1pl": "imur",  "2pl": "iminī",   "3pl": "untur"},
        "impf": {"1sg": "ēbar",  "2sg": "ēbāris",  "3sg": "ēbātur",
                 "1pl": "ēbāmur","2pl": "ēbāminī", "3pl": "ēbantur"},
        "fut":  {"1sg": "ar",    "2sg": "ēris",    "3sg": "ētur",
                 "1pl": "ēmur",  "2pl": "ēminī",   "3pl": "entur"},
        "psubj":{"1sg": "ar",    "2sg": "āris",    "3sg": "ātur",
                 "1pl": "āmur",  "2pl": "āminī",   "3pl": "antur"},
        "inf":  "ī",
    },
    "3i": {
        "pres": {"1sg": "ior",   "2sg": "eris",    "3sg": "itur",
                 "1pl": "imur",  "2pl": "iminī",   "3pl": "iuntur"},
        "impf": {"1sg": "iēbar", "2sg": "iēbāris", "3sg": "iēbātur",
                 "1pl": "iēbāmur","2pl":"iēbāminī","3pl": "iēbantur"},
        "fut":  {"1sg": "iar",   "2sg": "iēris",   "3sg": "iētur",
                 "1pl": "iēmur", "2pl": "iēminī",  "3pl": "ientur"},
        "psubj":{"1sg": "iar",   "2sg": "iāris",   "3sg": "iātur",
                 "1pl": "iāmur", "2pl": "iāminī",  "3pl": "iantur"},
        "inf":  "ī",
    },
    4: {
        "pres": {"1sg": "ior",   "2sg": "īris",    "3sg": "ītur",
                 "1pl": "īmur",  "2pl": "īminī",   "3pl": "iuntur"},
        "impf": {"1sg": "iēbar", "2sg": "iēbāris", "3sg": "iēbātur",
                 "1pl": "iēbāmur","2pl":"iēbāminī","3pl": "iēbantur"},
        "fut":  {"1sg": "iar",   "2sg": "iēris",   "3sg": "iētur",
                 "1pl": "iēmur", "2pl": "iēminī",  "3pl": "ientur"},
        "psubj":{"1sg": "iar",   "2sg": "iāris",   "3sg": "iātur",
                 "1pl": "iāmur", "2pl": "iāminī",  "3pl": "iantur"},
        "inf":  "īrī",
    },
}


# ======================================================================
# Sifat cekim ekleri
# ======================================================================

ADJ_212_M = {
    "nom_sg": "us",   "gen_sg": "ī",     "dat_sg": "ō",     "acc_sg": "um",
    "abl_sg": "ō",    "voc_sg": "e",
    "nom_pl": "ī",    "gen_pl": "ōrum",  "dat_pl": "īs",    "acc_pl": "ōs",
    "abl_pl": "īs",   "voc_pl": "ī",
}

ADJ_212_F = {
    "nom_sg": "a",    "gen_sg": "ae",    "dat_sg": "ae",    "acc_sg": "am",
    "abl_sg": "ā",    "voc_sg": "a",
    "nom_pl": "ae",   "gen_pl": "ārum",  "dat_pl": "īs",    "acc_pl": "ās",
    "abl_pl": "īs",   "voc_pl": "ae",
}

ADJ_212_N = {
    "nom_sg": "um",   "gen_sg": "ī",     "dat_sg": "ō",     "acc_sg": "um",
    "abl_sg": "ō",    "voc_sg": "um",
    "nom_pl": "a",    "gen_pl": "ōrum",  "dat_pl": "īs",    "acc_pl": "a",
    "abl_pl": "īs",   "voc_pl": "a",
}

# Present active participle paradigm (abl sg -e, gen pl -ium)
PPA_MF = {
    "nom_sg": None,   "gen_sg": "is",    "dat_sg": "ī",     "acc_sg": "em",
    "abl_sg": "e",    "voc_sg": None,
    "nom_pl": "ēs",   "gen_pl": "ium",   "dat_pl": "ibus",   "acc_pl": "ēs",
    "abl_pl": "ibus", "voc_pl": "ēs",
}

PPA_N = {
    "nom_sg": None,   "gen_sg": "is",    "dat_sg": "ī",     "acc_sg": None,
    "abl_sg": "e",    "voc_sg": None,
    "nom_pl": "ia",   "gen_pl": "ium",   "dat_pl": "ibus",   "acc_pl": "ia",
    "abl_pl": "ibus", "voc_pl": "ia",
}

# 3. deklinasyon sifat - m/f
ADJ_3_MF = {
    "nom_sg": None,   "gen_sg": "is",    "dat_sg": "ī",     "acc_sg": "em",
    "abl_sg": "ī",    "voc_sg": None,
    "nom_pl": "ēs",   "gen_pl": "ium",   "dat_pl": "ibus",   "acc_pl": "ēs",
    "abl_pl": "ibus", "voc_pl": "ēs",
}

# 3. deklinasyon sifat - notr
ADJ_3_N = {
    "nom_sg": None,   "gen_sg": "is",    "dat_sg": "ī",     "acc_sg": None,
    "abl_sg": "ī",    "voc_sg": None,
    "nom_pl": "ia",   "gen_pl": "ium",   "dat_pl": "ibus",   "acc_pl": "ia",
    "abl_pl": "ibus", "voc_pl": "ia",
}


# ======================================================================
# Morfoloji motoru
# ======================================================================

class MorphologyEngine:

    def decline_noun(self, nominative, genitive, declension, gender, is_i_stem=False):
        paradigm = self._noun_paradigm(declension, gender, is_i_stem)
        stem     = self._noun_stem(nominative, genitive, declension)
        if stem is None:
            return []
        forms = []
        for number in ("sg", "pl"):
            for case in ("nom", "gen", "dat", "acc", "abl", "voc"):
                ending = paradigm.get(f"{case}_{number}")
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
                forms.append({"form": form, "case": case, "number": number,
                               "declension": declension, "gender": gender})
        return forms

    def conjugate_verb(self, present_1sg, conjugation, tenses=None,
                       is_io=False, perfect_1sg=None):
        paradigm      = self._verb_paradigm(conjugation, is_io)
        stem          = self._verb_stem(present_1sg, conjugation)
        active_tenses = tenses if tenses is not None else ["pres", "impf", "fut"]
        forms         = []

        # Indicative active
        for tense in active_tenses:
            for person in (1, 2, 3):
                for number in ("sg", "pl"):
                    ending = paradigm.get(f"{tense}_{person}{number}")
                    if ending is None:
                        continue
                    forms.append({"form": stem + ending, "tense": tense,
                                  "person": person, "number": number,
                                  "mood": "indicative", "voice": "active",
                                  "conjugation": conjugation})

        # Present subjunctive
        for person in (1, 2, 3):
            for number in ("sg", "pl"):
                ending = paradigm.get(f"psubj_{person}{number}")
                if ending is None:
                    continue
                forms.append({"form": stem + ending, "tense": "pres",
                              "person": person, "number": number,
                              "mood": "subjunctive", "voice": "active",
                              "conjugation": conjugation})

        # Imperfect subjunctive (infinitive minus final e + endings)
        inf_ending = paradigm.get("inf_pres", "")
        if inf_ending:
            infinitive = stem + inf_ending
            if infinitive.endswith("e"):
                base = infinitive[:-1]
                for person in (1, 2, 3):
                    for number in ("sg", "pl"):
                        ending = IMPF_SUBJ_ENDINGS.get(f"{person}{number}")
                        if ending is None:
                            continue
                        forms.append({"form": base + ending, "tense": "impf",
                                      "person": person, "number": number,
                                      "mood": "subjunctive", "voice": "active",
                                      "conjugation": conjugation})

        # Present infinitive
        if inf_ending:
            forms.append({"form": stem + inf_ending, "tense": "pres",
                          "person": None, "number": None,
                          "mood": "infinitive", "voice": "active",
                          "conjugation": conjugation})

        # Perfect indicative active
        if perfect_1sg and perfect_1sg.endswith("ī"):
            perf_stem = perfect_1sg[:-1]
            for person in (1, 2, 3):
                for number in ("sg", "pl"):
                    ending = PERF_IND_ENDINGS.get(f"{person}{number}")
                    if ending is None:
                        continue
                    forms.append({"form": perf_stem + ending, "tense": "perf",
                                  "person": person, "number": number,
                                  "mood": "indicative", "voice": "active",
                                  "conjugation": conjugation})

        return forms

    def decline_adjective(self, masc_nom, fem_nom, neut_nom):
        stem  = self._adj_stem_212(masc_nom)
        forms = []
        for gender, paradigm in (("m", ADJ_212_M), ("f", ADJ_212_F), ("n", ADJ_212_N)):
            for number in ("sg", "pl"):
                for case in ("nom", "gen", "dat", "acc", "abl", "voc"):
                    ending = paradigm.get(f"{case}_{number}")
                    if ending is None:
                        continue
                    if case == "nom" and number == "sg":
                        form = {"m": masc_nom, "f": fem_nom, "n": neut_nom}[gender]
                    else:
                        form = stem + ending
                    forms.append({"form": form, "case": case,
                                  "number": number, "gender": gender})
        return forms

    def decline_adjective_3rd(self, nom_mf, nom_n, stem):
        """
        nom_mf : m/f nominatif  (ornek: "gravis", "felix", "memor")
        nom_n  : notr nominatif (ornek: "grave"); 1-termination icin None
        stem   : genitiften turetilen govde (ornek: "gravi", "felic", "memor")
        """
        forms = []
        for gender in ("m", "f", "n"):
            paradigm = ADJ_3_N if gender == "n" else ADJ_3_MF
            nom_this = (nom_n if nom_n else nom_mf) if gender == "n" else nom_mf
            for number in ("sg", "pl"):
                for case in ("nom", "gen", "dat", "acc", "abl", "voc"):
                    ending = paradigm.get(f"{case}_{number}")
                    if ending is None:
                        if number == "sg" and case in ("nom", "voc"):
                            form = nom_this
                        elif number == "sg" and case == "acc" and gender == "n":
                            form = nom_this
                        else:
                            continue
                    else:
                        form = stem + ending
                    forms.append({"form": form, "case": case,
                                  "number": number, "gender": gender})
        return forms

    @staticmethod
    def _noun_paradigm(decl, gender, i_stem):
        if decl == 1: return DECL1
        if decl == 2: return DECL2_N if gender == "n" else DECL2_M
        if decl == 3:
            if gender == "n": return DECL3I_N if i_stem else DECL3_N
            return DECL3I_MF if i_stem else DECL3_MF
        if decl == 4: return DECL4_N if gender == "n" else DECL4_MF
        if decl == 5: return DECL5
        return {}

    @staticmethod
    def _verb_paradigm(conj, is_io):
        if conj == 1: return CONJ1
        if conj == 2: return CONJ2
        if conj == 3: return CONJ3I if is_io else CONJ3
        if conj == 4: return CONJ4
        return {}

    @staticmethod
    def _noun_stem(nom, gen, decl):
        patterns = {1: ("ae", "ārum"), 2: ("ī", "ōrum"),
                    3: ("is", "ium"),      4: ("ūs", "uum"),
                    5: ("eī", "ērum")}
        for end in patterns.get(decl, ()):
            if gen.endswith(end):
                return gen[:-len(end)]
        return gen[:-2] if len(gen) > 2 else None

    @staticmethod
    def _verb_stem(pres_1sg, conj):
        word = pres_1sg.lower()
        if word.endswith("io"):                # 3io/4: capio, audio
            return word[:-2]
        if conj == 2 and word.endswith("eo"):  # 2: moneo -> mon
            return word[:-2]
        if word.endswith("o"):                 # 1/3: porto, duco
            return word[:-1]
        return word

    def conjugate_passive(self, pres_1sg: str, conjugation: int,
                          is_io: bool = False, is_deponent: bool = False) -> list:
        """
        Passive (veya deponent) cekim formlarini uretir.
        is_deponent=True: stem deponent formdan (loquor->loqu) alinir.
        """
        stem = self._passive_stem(pres_1sg, conjugation, is_io, is_deponent)
        conj_key = "3i" if (conjugation == 3 and is_io) else conjugation
        paradigm = PASS_ENDINGS.get(conj_key, {})
        forms = []

        for tense in ("pres", "impf", "fut"):
            endings = paradigm.get(tense, {})
            for person in (1, 2, 3):
                for number in ("sg", "pl"):
                    ending = endings.get(f"{person}{number}")
                    if ending is None:
                        continue
                    forms.append({"form": stem + ending, "tense": tense,
                                  "person": person, "number": number,
                                  "mood": "indicative", "voice": "passive",
                                  "conjugation": conjugation})

        # Present subjunctive passive
        endings = paradigm.get("psubj", {})
        for person in (1, 2, 3):
            for number in ("sg", "pl"):
                ending = endings.get(f"{person}{number}")
                if ending is None:
                    continue
                forms.append({"form": stem + ending, "tense": "pres",
                              "person": person, "number": number,
                              "mood": "subjunctive", "voice": "passive",
                              "conjugation": conjugation})

        # Imperfect subjunctive passive: infinitive - e + r/eris/...
        inf_end = paradigm.get("inf", "")
        if inf_end:
            infinitive = stem + inf_end
            # inf = portari / loqui / etc. -> strip final i to get base
            if infinitive.endswith("rī") or infinitive.endswith("ri"):
                base = infinitive[:-1]  # portār, monēr, loquī, audīr
            else:
                base = infinitive
            for person in (1, 2, 3):
                for number in ("sg", "pl"):
                    ending = PASS_IMPF_SUBJ_ENDINGS.get(f"{person}{number}")
                    if ending is None:
                        continue
                    forms.append({"form": base + ending, "tense": "impf",
                                  "person": person, "number": number,
                                  "mood": "subjunctive", "voice": "passive",
                                  "conjugation": conjugation})

        # Passive infinitive
        if inf_end:
            forms.append({"form": stem + inf_end, "tense": "pres",
                          "person": None, "number": None,
                          "mood": "infinitive", "voice": "passive",
                          "conjugation": conjugation})

        return forms

    def generate_gdv(self, pres_1sg: str, conjugation: int, is_io: bool = False) -> list:
        """Gerundive (future passive participle): portandus/a/um, monendus, ducendus."""
        stem = self._verb_stem(pres_1sg, conjugation)
        if conjugation == 1:
            gdv_stem = stem + "and"
        elif conjugation == 2:
            gdv_stem = stem + "end"
        elif conjugation == 3:
            gdv_stem = stem + ("iend" if is_io else "end")
        elif conjugation == 4:
            gdv_stem = stem + "iend"
        else:
            return []
        return self._decline_fut_participle(gdv_stem, conjugation, "passive")

    def generate_pfa(self, ppp_stem: str, conjugation: int) -> list:
        """Future active participle: portaturus/a/um. ppp_stem = 'portat'."""
        pfa_stem = ppp_stem + "ur"
        return self._decline_fut_participle(pfa_stem, conjugation, "active")

    def _decline_fut_participle(self, stem: str, conj: int, voice: str) -> list:
        """2-1-2 deklinasyonuyla future participle uretir."""
        masc_nom = stem + "us"
        fem_nom  = stem + "a"
        neut_nom = stem + "um"
        forms = []
        for gender, paradigm, nom_form in (
            ("m", ADJ_212_M, masc_nom),
            ("f", ADJ_212_F, fem_nom),
            ("n", ADJ_212_N, neut_nom),
        ):
            for number in ("sg", "pl"):
                for case in ("nom", "gen", "dat", "acc", "abl", "voc"):
                    ending = paradigm.get(f"{case}_{number}")
                    if ending is None:
                        continue
                    if case == "nom" and number == "sg":
                        form = nom_form
                    elif case == "voc" and number == "sg":
                        form = (stem + "e") if gender == "m" else nom_form
                    else:
                        form = stem + ending
                    forms.append({"form": form, "case": case, "number": number,
                                  "gender": gender, "tense": "fut",
                                  "mood": "participle", "voice": voice,
                                  "person": None, "conjugation": conj})
        return forms

    @staticmethod
    def _passive_stem(pres_1sg: str, conj: int, is_io: bool, is_deponent: bool) -> str:
        """Passive/deponent cekim icin stem."""
        word = pres_1sg.lower()
        if is_deponent:
            # Deponent: 1sg = miror/loquor/patior/mentior
            if (is_io or conj == 4) and word.endswith("ior"):
                return word[:-3]
            if conj == 2 and word.endswith("eor"):
                return word[:-3]
            if word.endswith("or"):
                return word[:-2]
            return word
        else:
            # Regular verb: same stem as active
            if word.endswith("io"):
                return word[:-2]
            if conj == 2 and word.endswith("eo"):
                return word[:-2]
            if word.endswith("o"):
                return word[:-1]
            return word

    def generate_ppa(self, pres_1sg: str, conjugation: int, is_io: bool = False) -> list:
        """Present active participle (tum deklinasyonu dahil tum formlar)."""
        stem = self._verb_stem(pres_1sg, conjugation)
        if conjugation == 1:
            part_stem, nom = stem + "ant", stem + "ans"
        elif conjugation == 2:
            part_stem, nom = stem + "ent", stem + "ens"
        elif conjugation == 3:
            if is_io:
                part_stem, nom = stem + "ient", stem + "iens"
            else:
                part_stem, nom = stem + "ent", stem + "ens"
        elif conjugation == 4:
            part_stem, nom = stem + "ient", stem + "iens"
        else:
            return []
        forms = []
        for gender in ("m", "f", "n"):
            paradigm = PPA_N if gender == "n" else PPA_MF
            for number in ("sg", "pl"):
                for case in ("nom", "gen", "dat", "acc", "abl", "voc"):
                    ending = paradigm.get(f"{case}_{number}")
                    if ending is None:
                        if number == "sg" and case in ("nom", "voc"):
                            form = nom
                        elif number == "sg" and case == "acc" and gender == "n":
                            form = nom
                        else:
                            continue
                    else:
                        form = part_stem + ending
                    forms.append({"form": form, "case": case, "number": number,
                                  "gender": gender, "tense": "pres",
                                  "mood": "participle", "voice": "active",
                                  "person": None, "conjugation": conjugation})
        return forms

    def generate_ppp(self, ppp_stem: str, conjugation: int) -> list:
        """Perfect passive participle: ppp_stem ornegin 'portat', 'monit'."""
        masc_nom = ppp_stem + "us"
        fem_nom  = ppp_stem + "a"
        neut_nom = ppp_stem + "um"
        forms = []
        for gender, paradigm, nom_form in (
            ("m", ADJ_212_M, masc_nom),
            ("f", ADJ_212_F, fem_nom),
            ("n", ADJ_212_N, neut_nom),
        ):
            for number in ("sg", "pl"):
                for case in ("nom", "gen", "dat", "acc", "abl", "voc"):
                    ending = paradigm.get(f"{case}_{number}")
                    if ending is None:
                        continue
                    if case == "nom" and number == "sg":
                        form = nom_form
                    elif case == "voc" and number == "sg":
                        form = (ppp_stem + "e") if gender == "m" else nom_form
                    else:
                        form = ppp_stem + ending
                    forms.append({"form": form, "case": case, "number": number,
                                  "gender": gender, "tense": "perf",
                                  "mood": "participle", "voice": "passive",
                                  "person": None, "conjugation": conjugation})
        return forms

    @staticmethod
    def _adj_stem_212(masc_nom):
        word = masc_nom.lower()
        if word.endswith("us"): return word[:-2]
        if word.endswith("er"): return word[:-2]
        return word
