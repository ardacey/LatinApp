#!/usr/bin/env python3
"""
fill_principals.py
==================
Claude API kullanarak eksik fiil principal parts'ları doldurur.
Kullanım:
    pip install anthropic tqdm
    python fill_principals.py
"""

import json
import os
import time
from pathlib import Path

import requests
from tqdm import tqdm

WORDS_FILE   = Path(__file__).parent / "export_enriched" / "sb_words.json"
CKPT_FILE    = Path(__file__).parent / "principals_ckpt.json"
BATCH_SIZE   = 20
MAX_RETRIES  = 3

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]

SYSTEM = (
    "You are a Latin grammar expert. Respond with a JSON array only — no explanation.\n"
    "For each Latin verb (given as 1st person singular present), provide all 4 principal parts:\n"
    "  - latin: the present 1sg (unchanged)\n"
    "  - infinitive: present active infinitive (e.g. amāre, monēre, legere, audīre)\n"
    "  - perfect: perfect active 1sg (e.g. amāvī, monuī, lēgī, audīvī)\n"
    "  - supine: 4th principal part accusative (e.g. amātum, monitum, lēctum, audītum); "
    "use null for defective verbs without a supine.\n"
    "Use macrons (ā ē ī ō ū) for long vowels."
)


def batch_principals(verbs: list[dict]) -> dict[str, dict]:
    verb_list = json.dumps([{"latin": v["present_1sg"]} for v in verbs], ensure_ascii=False)
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": SYSTEM + "\n\nVerbs:\n" + verb_list}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
                },
                timeout=60,
            )
            r.raise_for_status()
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            # JSON'u çıkar
            import re
            text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
            data = json.loads(text)
            if isinstance(data, list):
                return {item["latin"]: item for item in data if isinstance(item, dict) and "latin" in item}
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                wait = 10 * (attempt + 1)
            else:
                wait = 5 * (attempt + 1)
            print(f"  Hata (deneme {attempt+1}/{MAX_RETRIES}, {wait}s): {e}")
            time.sleep(wait)
        except Exception as e:
            wait = 5 * (attempt + 1)
            print(f"  Hata (deneme {attempt+1}/{MAX_RETRIES}, {wait}s): {e}")
            time.sleep(wait)
    return {}


def main():
    words = json.loads(WORDS_FILE.read_text(encoding="utf-8"))

    # Eksik principal parts'lı fiiller
    todo = [
        w for w in words
        if w.get("part_of_speech") == "verb"
        and w.get("present_1sg")
        and not w.get("infinitive")
    ]
    print(f"Eksik principal parts: {len(todo)} fiil")

    # Checkpoint yükle
    ckpt: dict[str, dict] = {}
    if CKPT_FILE.exists():
        ckpt = json.loads(CKPT_FILE.read_text(encoding="utf-8"))
        print(f"Checkpoint: {len(ckpt)} zaten işlendi")

    todo = [w for w in todo if w["id"] not in ckpt]
    print(f"İşlenecek: {len(todo)} fiil")

    # Batch işle
    for i in tqdm(range(0, len(todo), BATCH_SIZE), desc="Principals"):
        batch  = todo[i:i + BATCH_SIZE]
        result = batch_principals(batch)
        for w in batch:
            key = w["present_1sg"]
            r   = result.get(key, {})
            ckpt[w["id"]] = {
                "infinitive": r.get("infinitive"),
                "perfect":    r.get("perfect"),
                "supine":     r.get("supine"),
            }
        CKPT_FILE.write_text(json.dumps(ckpt, ensure_ascii=False), encoding="utf-8")
        time.sleep(5)  # Gemini free: 15 RPM → 4s/req

    # Kelimeleri güncelle
    print("Kelimeler güncelleniyor...")
    updated = 0
    for w in words:
        if w["id"] in ckpt:
            r = ckpt[w["id"]]
            if r.get("infinitive") and not w.get("infinitive"):
                w["infinitive"] = r["infinitive"]
                w["perfect"]    = r.get("perfect")
                w["supine"]     = r.get("supine")
                updated += 1

    WORDS_FILE.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Güncellendi: {updated} fiil")

    # Hâlâ eksik olanları raporla
    still_missing = sum(
        1 for w in words
        if w.get("part_of_speech") == "verb"
        and w.get("present_1sg")
        and not w.get("infinitive")
    )
    print(f"Hâlâ eksik: {still_missing} fiil")
    print("Tamamlandı!")


if __name__ == "__main__":
    main()
