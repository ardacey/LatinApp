#!/usr/bin/env python3
"""
import_to_supabase.py
====================
export_enriched/ klasöründeki JSON dosyalarını Supabase'e aktarır.
Kullanım:
    pip install supabase python-dotenv
    python import_to_supabase.py
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client
from tqdm import tqdm

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
DATA_DIR     = Path(__file__).parent / "export_enriched"
BATCH_SIZE   = 500

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def upsert_batches(table: str, rows: list[dict], key_col: str = "id") -> None:
    total = len(rows)
    print(f"\n→ {table}: {total} kayıt yükleniyor...")
    for i in tqdm(range(0, total, BATCH_SIZE), desc=table):
        batch = rows[i:i + BATCH_SIZE]
        supabase.table(table).upsert(batch, on_conflict=key_col).execute()


# ── words ────────────────────────────────────────────────────
WORD_COLS = {
    "id", "latin", "english", "turkish", "part_of_speech",
    "declension", "conjugation", "gender", "genitive",
    "present_1sg", "infinitive", "perfect", "supine",
}

def load_words() -> list[dict]:
    raw = json.loads((DATA_DIR / "sb_words.json").read_text(encoding="utf-8"))
    return [{k: v for k, v in w.items() if k in WORD_COLS} for w in raw]


# ── noun_forms ───────────────────────────────────────────────
NOUN_COLS = {"id", "word_id", "form", "case", "number", "declension", "gender"}

def load_noun_forms() -> list[dict]:
    raw = json.loads((DATA_DIR / "sb_noun_forms.json").read_text(encoding="utf-8"))
    return [{k: v for k, v in r.items() if k in NOUN_COLS} for r in raw]


# ── verb_forms ───────────────────────────────────────────────
VERB_COLS = {"id", "word_id", "form", "tense", "mood", "voice", "person", "number", "conjugation"}

def load_verb_forms() -> list[dict]:
    raw = json.loads((DATA_DIR / "sb_verb_forms.json").read_text(encoding="utf-8"))
    return [{k: v for k, v in r.items() if k in VERB_COLS} for r in raw]


# ── adjective_forms ──────────────────────────────────────────
ADJ_COLS = {"id", "word_id", "form", "case", "number", "gender"}

def load_adj_forms() -> list[dict]:
    raw = json.loads((DATA_DIR / "sb_adjective_forms.json").read_text(encoding="utf-8"))
    return [{k: v for k, v in r.items() if k in ADJ_COLS} for r in raw]


# ── examples ─────────────────────────────────────────────────
EX_COLS = {"id", "word_id", "latin", "english", "turkish"}

def load_examples() -> list[dict]:
    raw = json.loads((DATA_DIR / "sb_examples.json").read_text(encoding="utf-8"))
    return [{k: v for k, v in r.items() if k in EX_COLS} for r in raw]


if __name__ == "__main__":
    print(f"Supabase: {SUPABASE_URL}")
    print(f"Veri dizini: {DATA_DIR}")

    upsert_batches("words",           load_words())
    upsert_batches("noun_forms",      load_noun_forms())
    upsert_batches("verb_forms",      load_verb_forms())
    upsert_batches("adjective_forms", load_adj_forms())
    upsert_batches("examples",        load_examples())

    print("\nTamamlandı!")
