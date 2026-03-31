"""
http_client.py
==============
Wiktionary API'sine retry-enabled GET istekleri gönderen HTTP istemcisi.
"""

import logging
import time
from typing import Optional

import requests

log = logging.getLogger(__name__)

EN_WIKI    = "https://en.wiktionary.org/w/api.php"
TR_WIKI    = "https://tr.wiktionary.org/w/api.php"
USER_AGENT = "LatinLearningApp/1.0 (educational; github.com/yourusername/latin-app)"


class _HTTP:
    """Tekrar denemeli basit GET istemcisi (rate limiting dahil)."""

    def __init__(self, base: str, delay: float = 0.5):
        self._base  = base
        self._delay = delay
        self._s     = requests.Session()
        self._s.headers["User-Agent"] = USER_AGENT

    def get(self, params: dict) -> dict:
        for attempt in range(3):
            try:
                r = self._s.get(self._base, params=params, timeout=15)
                r.raise_for_status()
                time.sleep(self._delay)
                return r.json()
            except Exception as exc:
                wait = 2 ** attempt
                log.warning(
                    "HTTP hata (deneme %d): %s — %ds bekleniyor",
                    attempt + 1, exc, wait,
                )
                time.sleep(wait)
        return {}

    def wikitext(self, title: str) -> Optional[str]:
        """Sayfanın ham WikiText içeriğini döndürür."""
        result = self.wikitext_batch([title])
        return result.get(title)

    def wikitext_batch(self, titles: list[str]) -> dict[str, str]:
        """
        Birden fazla sayfayı tek API çağrısıyla çeker.
        Wiktionary en fazla 50 sayfa destekler; otomatik olarak parçalara böler.
        Döndürür: {title: wikitext}
        """
        result: dict[str, str] = {}
        for i in range(0, len(titles), 50):
            chunk = titles[i : i + 50]
            data  = self.get({
                "action":        "query",
                "prop":          "revisions",
                "rvprop":        "content",
                "rvslots":       "main",
                "titles":        "|".join(chunk),
                "format":        "json",
                "formatversion": "2",
            })
            for page in data.get("query", {}).get("pages", []):
                if "missing" in page:
                    continue
                try:
                    title_key = page["title"]
                    content   = page["revisions"][0]["slots"]["main"]["content"]
                    result[title_key] = content
                except (KeyError, IndexError):
                    pass
        return result

    def category_members(self, category: str) -> list[str]:
        """Bir kategorideki tüm sayfa başlıklarını döndürür."""
        titles, params = [], {
            "action":  "query",
            "list":    "categorymembers",
            "cmtitle": category,
            "cmlimit": "500",
            "cmtype":  "page",
            "format":  "json",
        }
        while True:
            data    = self.get(params)
            members = data.get("query", {}).get("categorymembers", [])
            titles.extend(m["title"] for m in members)
            cont = data.get("continue")
            if not cont:
                break
            params.update(cont)
            log.info("  %d kelime listelendi...", len(titles))
        return titles
