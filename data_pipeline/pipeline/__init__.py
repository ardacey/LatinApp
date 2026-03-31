"""
pipeline
========
Latince veri pipeline paketi.

Alt modüller:
    http_client      — Wiktionary API istemcisi
    wikitext_parser  — WikiText → yapılandırılmış veri
    turkish          — tr.wiktionary Türkçe anlam çekici
    translator       — Google Translate servisi
    fetcher          — WikiFetcher ana orkestratör
    morphology       — MorphologyEngine (çekim tabloları)
    processor        — DataEnricher, DataMerger, DataValidator, JsonExporter
"""

from .fetcher   import WikiFetcher
from .processor import (
    DataEnricher,
    DataMerger,
    DataValidator,
    JsonExporter,
    print_stats,
    run_processing,
)
from .morphology import MorphologyEngine

__all__ = [
    "WikiFetcher",
    "MorphologyEngine",
    "DataEnricher",
    "DataMerger",
    "DataValidator",
    "JsonExporter",
    "print_stats",
    "run_processing",
]
