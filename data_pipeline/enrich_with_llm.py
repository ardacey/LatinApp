#!/usr/bin/env python3
"""
enrich_with_llm.py
==================
vLLM endpoint (Qwen2.5-72B) kullanarak eksik verileri doldurur:
  1. İsim morfolojisi (genitif, deklinasyon, cinsiyet)
  2. Fiil konjugasyonu (present_1sg)
  3. Fiil 4 ana formu (infinitive, perfect, supine)
  4. Örnek cümleler

Kullanım:
    python enrich_with_llm.py [--input ...] [--output-dir ...]
"""

import argparse
import json
import logging
import re
import sys
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import requests
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
try:
    from pipeline.morphology import MorphologyEngine
except ImportError:
    import importlib.util as _ilu
    _spec = _ilu.spec_from_file_location(
        "morphology",
        Path(__file__).parent / "pipeline" / "morphology.py",
    )
    _mod = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(_mod)
    MorphologyEngine = _mod.MorphologyEngine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("enrich_llm.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

MORPH = MorphologyEngine()


# ═══════════════════════════════════════════════════════════
# LLM İstemcisi
# ═══════════════════════════════════════════════════════════

class LLMClient:
    def __init__(self, endpoint: str, model: str):
        self.url   = endpoint.rstrip("/") + "/chat/completions"
        self.model = model

    def complete(self, messages: list[dict], max_tokens: int = 1024) -> str:
        payload = {
            "model":              self.model,
            "messages":           messages,
            "max_tokens":         max_tokens,
            "temperature":        0.1,
            "repetition_penalty": 1.2,
        }
        for attempt in range(4):
            try:
                r = requests.post(self.url, json=payload, timeout=180)
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            except Exception as e:
                wait = 10 * (attempt + 1)
                log.warning("İstek başarısız (deneme %d/4, %ds bekleniyor): %s", attempt + 1, wait, e)
                time.sleep(wait)
        return ""

    def complete_json(self, messages: list[dict], **kwargs) -> Optional[list | dict]:
        text = self.complete(messages, **kwargs)
        text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Birden fazla ayrı array varsa birleştir
            arrays = re.findall(r"\[.*?\]", text, re.DOTALL)
            if arrays:
                combined = []
                for a in arrays:
                    try:
                        combined.extend(json.loads(a))
                    except Exception:
                        pass
                if combined:
                    return combined
            m = re.search(r"\[.*\]", text, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group())
                except Exception:
                    pass
        log.warning("JSON parse başarısız:\n%s", text[:300])
        return None


# ═══════════════════════════════════════════════════════════
# Prompt şablonları
# ═══════════════════════════════════════════════════════════

NOUN_SYSTEM = (
    "You are a Latin morphology expert. Respond with a JSON array only — no explanation.\n"
    "For each Latin noun given, provide:\n"
    "  - latin: the nominative form (unchanged)\n"
    "  - genitive: GENITIVE SINGULAR (not plural) with macrons (e.g. rosae, regis, manūs, diēī)\n"
    "  - declension: integer 1-5 — MUST match the genitive ending: 1→-ae, 2→-ī, 3→-is, 4→-ūs, 5→-eī\n"
    "  - gender: 'm', 'f', or 'n'\n"
    "IMPORTANT: If a word ends in -or/-tor/-sor, its genitive is -ōris (3rd decl). "
    "If nominative ends in -us but genitive is -ūs, it is 4th decl. "
    "Never give genitive plural — only singular."
)

VERB_SYSTEM = (
    "You are a Latin grammar expert. Respond with a JSON array only — no explanation.\n"
    "For each Latin verb (infinitive form), provide:\n"
    "  - latin: the infinitive (unchanged)\n"
    "  - conjugation: integer 1-4\n"
    "  - present_1sg: 1st person singular present active indicative (e.g. amō, moneō, legō, audiō)\n"
    "Conjugation classes: 1→-āre, 2→-ēre (long), 3→-ere (short), 4→-īre"
)

PRINCIPAL_SYSTEM = (
    "You are a Latin grammar expert. Respond with a JSON array only — no explanation.\n"
    "For each Latin verb (given as 1st person singular present), provide all 4 principal parts:\n"
    "  - latin: the present 1sg (unchanged)\n"
    "  - infinitive: present active infinitive (e.g. amāre, monēre, legere, audīre)\n"
    "  - perfect: perfect active 1sg (e.g. amāvī, monuī, lēgī, audīvī)\n"
    "  - supine: 4th principal part accusative (e.g. amātum, monitum, lēctum, audītum); "
    "use null for defective verbs without a supine.\n"
    "Use macrons (ā ē ī ō ū) for long vowels."
)

EXAMPLE_SYSTEM = (
    "You are a Latin teacher creating simple learning examples.\n"
    "Respond with a JSON array only — no explanation.\n"
    "For each Latin word, write ONE short classical Latin sentence (5-8 words) that clearly shows its use.\n"
    "Format: [{\"latin\": \"headword\", \"sentence_latin\": \"...\", \"sentence_turkish\": \"...\"}]\n"
    "The Turkish translation must be natural, fluent Turkish. Use the headword in the sentence."
)


# ═══════════════════════════════════════════════════════════
# Batch fonksiyonları
# ═══════════════════════════════════════════════════════════

def _batch_nouns(client: LLMClient, nouns: list[dict]) -> dict[str, dict]:
    noun_list = json.dumps([{"latin": n["latin"]} for n in nouns], ensure_ascii=False)
    result = client.complete_json([
        {"role": "system", "content": NOUN_SYSTEM},
        {"role": "user",   "content": f"Nouns:\n{noun_list}"},
    ])
    if not isinstance(result, list):
        return {}
    return {item["latin"]: item for item in result if isinstance(item, dict) and "latin" in item}


def _batch_verbs(client: LLMClient, verbs: list[dict]) -> dict[str, dict]:
    verb_list = json.dumps([{"latin": v["latin"]} for v in verbs], ensure_ascii=False)
    result = client.complete_json([
        {"role": "system", "content": VERB_SYSTEM},
        {"role": "user",   "content": f"Verbs:\n{verb_list}"},
    ])
    if not isinstance(result, list):
        return {}
    return {item["latin"]: item for item in result if isinstance(item, dict) and "latin" in item}


def _batch_principals(client: LLMClient, verbs: list[dict]) -> dict[str, dict]:
    verb_list = json.dumps([{"latin": v["present_1sg"]} for v in verbs], ensure_ascii=False)
    result = client.complete_json([
        {"role": "system", "content": PRINCIPAL_SYSTEM},
        {"role": "user",   "content": f"Verbs:\n{verb_list}"},
    ])
    if not isinstance(result, list):
        return {}
    return {item["latin"]: item for item in result if isinstance(item, dict) and "latin" in item}


def _batch_examples(client: LLMClient, words: list[dict]) -> dict[str, dict]:
    word_list = json.dumps(
        [{"latin": w["latin"], "english": w.get("english", ""), "pos": w.get("part_of_speech", "")}
         for w in words],
        ensure_ascii=False,
    )
    result = client.complete_json([
        {"role": "system", "content": EXAMPLE_SYSTEM},
        {"role": "user",   "content": f"Words:\n{word_list}"},
    ], max_tokens=1024)
    if not isinstance(result, list):
        return {}
    return {
        item["latin"]: {
            "sentence_latin":   item.get("sentence_latin", ""),
            "sentence_turkish": item.get("sentence_turkish", ""),
        }
        for item in result
        if isinstance(item, dict) and "latin" in item and item.get("sentence_latin")
    }


# ═══════════════════════════════════════════════════════════
# Form üretimi
# ═══════════════════════════════════════════════════════════

def _rule_genitive(word: dict) -> Optional[str]:
    nom  = word.get("latin", "")
    decl = word.get("declension")
    mapping = {
        1: nom[:-1] + "ae"  if nom.endswith("a")   else None,
        2: nom[:-2] + "ī"   if nom.endswith("us")  else (nom[:-2] + "ī" if nom.endswith("um") else None),
        4: nom[:-2] + "ūs"  if nom.endswith("us")  else None,
        5: nom[:-2] + "eī"  if nom.endswith("ēs")  else None,
    }
    return mapping.get(decl)


def _regenerate_forms(word: dict) -> tuple[list, list, list]:
    pos        = word.get("part_of_speech")
    noun_forms = []
    verb_forms = []
    adj_forms  = []

    if pos == "noun":
        decl   = word.get("declension")
        gender = word.get("gender") or "m"
        nom    = word.get("latin", "")
        gen    = word.get("genitive") or _rule_genitive(word)
        if decl and gen:
            noun_forms = MORPH.decline_noun(nom, gen, decl, gender)

    elif pos == "verb":
        conj     = word.get("conjugation")
        pres_1sg = word.get("present_1sg")
        if conj and pres_1sg:
            is_io      = pres_1sg.endswith("io")
            verb_forms = MORPH.conjugate_verb(pres_1sg, conj, is_io=is_io)

    elif pos == "adjective":
        masc = word.get("latin", "")
        fem  = re.sub(r"us$", "a",  masc) if masc.endswith("us") else masc
        neut = re.sub(r"us$", "um", masc) if masc.endswith("us") else masc
        adj_forms = MORPH.decline_adjective(masc, fem, neut)

    return noun_forms, verb_forms, adj_forms


# ═══════════════════════════════════════════════════════════
# Tespit fonksiyonları
# ═══════════════════════════════════════════════════════════

def _needs_noun_enrich(w: dict) -> bool:
    return w.get("part_of_speech") == "noun" and (not w.get("genitive") or not w.get("declension"))

def _needs_verb_enrich(w: dict) -> bool:
    return w.get("part_of_speech") == "verb" and not w.get("conjugation")

def _needs_principal_enrich(w: dict) -> bool:
    return w.get("part_of_speech") == "verb" and bool(w.get("present_1sg")) and not w.get("infinitive")


# ═══════════════════════════════════════════════════════════
# Ana fonksiyon
# ═══════════════════════════════════════════════════════════

WORD_OUTPUT_COLS = {
    "id", "latin", "english", "turkish", "part_of_speech",
    "declension", "conjugation", "gender", "genitive",
    "present_1sg", "infinitive", "perfect", "supine",
}


def run(
    input_file:    str,
    output_dir:    str,
    endpoint:      str,
    model:         str,
    batch_size:    int,
    checkpoint:    str,
    ex_checkpoint: str,
) -> None:
    log.info("Yükleniyor: %s", input_file)
    words: list[dict] = json.loads(Path(input_file).read_text(encoding="utf-8"))
    log.info("Toplam kelime: %d", len(words))

    ckpt = Path(checkpoint)
    updates: dict[str, dict] = {}
    if ckpt.exists():
        updates = json.loads(ckpt.read_text(encoding="utf-8"))
        log.info("Checkpoint: %d kelime zaten işlendi", len(updates))

    ex_ckpt = Path(ex_checkpoint)
    new_examples: dict[str, dict] = {}
    if ex_ckpt.exists():
        new_examples = json.loads(ex_ckpt.read_text(encoding="utf-8"))
        log.info("Örnek checkpoint: %d kelime", len(new_examples))

    client = LLMClient(endpoint, model)

    def _upd(w):    return updates.get(w["id"], {})
    def _fld(w, k): return _upd(w).get(k) or w.get(k)

    nouns_todo      = [w for w in words if _needs_noun_enrich(w)      and not (_fld(w,"genitive") and _fld(w,"declension"))]
    verbs_todo      = [w for w in words if _needs_verb_enrich(w)      and not _fld(w,"conjugation")]
    principals_todo = [w for w in words if _needs_principal_enrich(w) and not _fld(w,"infinitive")]
    examples_todo   = [w for w in words if w["id"] not in new_examples]

    log.info("Eksik isim morfolojisi : %d", len(nouns_todo))
    log.info("Eksik fiil konjugasyon : %d", len(verbs_todo))
    log.info("Eksik principal parts  : %d", len(principals_todo))
    log.info("Eksik örnek cümle     : %d", len(examples_todo))

    def save_ckpt():
        ckpt.write_text(json.dumps(updates, ensure_ascii=False), encoding="utf-8")

    def save_ex_ckpt():
        ex_ckpt.write_text(json.dumps(new_examples, ensure_ascii=False), encoding="utf-8")

    # ── İsimler ──────────────────────────────────────────
    if nouns_todo:
        log.info("İsim morfolojisi işleniyor...")
        for i in tqdm(range(0, len(nouns_todo), batch_size), desc="Nouns"):
            batch  = nouns_todo[i:i + batch_size]
            result = _batch_nouns(client, batch)
            for w in batch:
                r = result.get(w["latin"], {})
                updates.setdefault(w["id"], {}).update({
                    "genitive":   r.get("genitive")   or w.get("genitive"),
                    "declension": r.get("declension") or w.get("declension"),
                    "gender":     r.get("gender")     or w.get("gender"),
                })
            save_ckpt()

    # ── Fiiller ──────────────────────────────────────────
    if verbs_todo:
        log.info("Fiil konjugasyonu işleniyor...")
        for i in tqdm(range(0, len(verbs_todo), batch_size), desc="Verbs"):
            batch  = verbs_todo[i:i + batch_size]
            result = _batch_verbs(client, batch)
            for w in batch:
                r = result.get(w["latin"], {})
                updates.setdefault(w["id"], {}).update({
                    "conjugation": r.get("conjugation") or w.get("conjugation"),
                    "present_1sg": r.get("present_1sg") or w.get("present_1sg"),
                })
            save_ckpt()

    # ── Principal parts (paralel) ─────────────────────────
    if principals_todo:
        log.info("Principal parts işleniyor (paralel, 8 worker)...")
        ckpt_lock = threading.Lock()

        def _proc_principals(batch):
            result = _batch_principals(client, batch)
            out = {}
            for w in batch:
                key = w.get("present_1sg", "")
                r   = result.get(key, {})
                out[w["id"]] = {
                    "infinitive": r.get("infinitive") or w.get("infinitive"),
                    "perfect":    r.get("perfect")    or w.get("perfect"),
                    "supine":     r.get("supine")      or w.get("supine"),
                }
            return out

        batches = [principals_todo[i:i + batch_size] for i in range(0, len(principals_todo), batch_size)]
        with ThreadPoolExecutor(max_workers=8) as pool:
            futs = {pool.submit(_proc_principals, b): b for b in batches}
            for fut in tqdm(as_completed(futs), total=len(futs), desc="Principals"):
                with ckpt_lock:
                    for wid, fields in fut.result().items():
                        updates.setdefault(wid, {}).update(fields)
                    save_ckpt()

    # ── Örnek cümleler (paralel) ──────────────────────────
    if examples_todo:
        log.info("Örnek cümleler işleniyor (paralel, 8 worker)...")
        ex_lock = threading.Lock()

        def _proc_examples(batch):
            res = _batch_examples(client, batch)
            return {w["id"]: res[w["latin"]] for w in batch if w["latin"] in res}

        batches = [examples_todo[i:i + batch_size] for i in range(0, len(examples_todo), batch_size)]
        with ThreadPoolExecutor(max_workers=8) as pool:
            futs = {pool.submit(_proc_examples, b): b for b in batches}
            for fut in tqdm(as_completed(futs), total=len(futs), desc="Examples"):
                with ex_lock:
                    new_examples.update(fut.result())
                    save_ex_ckpt()

    # ── Güncelle + formları yeniden üret ─────────────────
    log.info("Formlar yeniden üretiliyor...")
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    updated_words  = []
    all_noun_forms = []
    all_verb_forms = []
    all_adj_forms  = []

    for w in tqdm(words, desc="Regenerating"):
        w = dict(w)
        if w["id"] in updates:
            for k, v in updates[w["id"]].items():
                if v is not None:
                    w[k] = v
        w = {k: v for k, v in w.items() if k in WORD_OUTPUT_COLS}

        nf, vf, af = _regenerate_forms(w)
        wid = w["id"]
        all_noun_forms.extend({"id": str(uuid.uuid4()), "word_id": wid, **f} for f in nf)
        all_verb_forms.extend({"id": str(uuid.uuid4()), "word_id": wid, **f} for f in vf)
        all_adj_forms.extend( {"id": str(uuid.uuid4()), "word_id": wid, **f} for f in af)
        updated_words.append(w)

    # Mevcut örnekler + yeni örnekleri birleştir
    src_ex = Path(input_file).parent / "sb_examples.json"
    existing_examples = json.loads(src_ex.read_bytes()) if src_ex.exists() else []
    existing_ex_wids  = {e["word_id"] for e in existing_examples}
    all_examples = list(existing_examples)
    for wid, ex in new_examples.items():
        if wid not in existing_ex_wids and ex.get("sentence_latin"):
            all_examples.append({
                "id":      str(uuid.uuid4()),
                "word_id": wid,
                "latin":   ex["sentence_latin"],
                "english": None,
                "turkish": ex["sentence_turkish"],
            })

    def save(name: str, data: list) -> None:
        p = out_dir / name
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info("  → %s (%d kayıt)", p, len(data))

    save("sb_words.json",           updated_words)
    save("sb_noun_forms.json",      all_noun_forms)
    save("sb_verb_forms.json",      all_verb_forms)
    save("sb_adjective_forms.json", all_adj_forms)
    save("sb_examples.json",        all_examples)

    log.info("Tamamlandı!")

    nouns_missing = sum(1 for w in updated_words
                        if w.get("part_of_speech") == "noun" and not w.get("genitive"))
    verbs_missing = sum(1 for w in updated_words
                        if w.get("part_of_speech") == "verb" and not w.get("infinitive"))
    log.info("Genitifi hâlâ eksik    : %d isim", nouns_missing)
    log.info("Principal parts eksik  : %d fiil", verbs_missing)


# ═══════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="LLM ile Latin veritabanı zenginleştirme")
    p.add_argument("--input",         default="export/sb_words.json")
    p.add_argument("--output-dir",    default="export_enriched")
    p.add_argument("--endpoint",      default="http://localhost:8000/v1")
    p.add_argument("--model",         default="Qwen/Qwen2.5-72B-Instruct")
    p.add_argument("--batch-size",    type=int, default=25)
    p.add_argument("--checkpoint",    default="enrich_checkpoint.json")
    p.add_argument("--ex-checkpoint", default="examples_checkpoint.json")
    args = p.parse_args()

    run(
        input_file    = args.input,
        output_dir    = args.output_dir,
        endpoint      = args.endpoint,
        model         = args.model,
        batch_size    = args.batch_size,
        checkpoint    = args.checkpoint,
        ex_checkpoint = args.ex_checkpoint,
    )
