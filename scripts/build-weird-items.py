#!/usr/bin/env python3
"""Build a deterministic source-linked weird-items.json for Uncle Sam's Cart.

The goal is not to judge waste. It is to surface public SAM.gov opportunities whose
plain-language titles read surprisingly specific, funny, or curiosity-provoking.
No LLMs, no fabricated prices, no unsourced examples.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/sam/bulk-opportunities.json"
OUTPUT = ROOT / "public/data/weird-items.json"
MAX_ITEMS = 24

CATEGORY_RULES: dict[str, dict[str, Any]] = {
    "Animal Logistics": {
        "weight": 44,
        "terms": [
            "bear", "bears", "goat", "goats", "horse", "horses", "mule", "mules", "burro", "burros",
            "dog", "dogs", "canine", "kennel", "fish", "fisheries", "wildlife", "bison", "cattle",
            "livestock", "bat", "bats", "bird", "birds", "geese", "goose", "duck", "ducks", "mosquito",
            "mosquitoes", "insect", "insects", "rodent", "rodents", "feral", "beaver", "beavers",
            "elk", "deer", "salmon", "trout", "raven", "eagle", "owl", "bee", "bees", "swine",
        ],
    },
    "Tactical Snack": {
        "weight": 38,
        "terms": [
            "cheese", "coffee", "pizza", "shrimp", "beef", "pork", "chicken", "meat", "milk", "ice cream",
            "snack", "snacks", "ration", "rations", "sandwich", "sandwiches", "burrito", "burritos",
            "candy", "cookie", "cookies", "bakery", "bread", "soda", "juice", "egg", "eggs", "fish food",
        ],
    },
    "Ceremony Department": {
        "weight": 34,
        "terms": [
            "bugle", "bugles", "ceremonial", "ceremony", "memorial", "trophy", "trophies", "plaque", "plaques",
            "medal", "medals", "flag", "flags", "badge", "badges", "uniform", "uniforms", "patch", "patches",
            "band", "honor guard", "chaplain", "funeral", "wreath", "wreaths", "parade",
        ],
    },
    "Oddly Specific Object": {
        "weight": 24,
        "terms": [
            "container", "containers", "cage", "cages", "fence", "fencing", "gate", "gates", "sign", "signs",
            "mattress", "mattresses", "chair", "chairs", "toilet", "toilets", "dumpster", "dumpsters",
            "garbage", "trash", "waste", "laundry", "forklift", "generator", "snowmobile", "boat", "boats",
            "freezer", "freezers", "refrigerator", "refrigerators", "sewer", "latrine", "portable toilet",
        ],
    },
    "Government Vibe": {
        "weight": 18,
        "terms": [
            "vault", "barracks", "commissary", "range", "airfield", "lighthouse", "visitor center", "national park",
            "forest", "cemetery", "border", "detention", "warehouse", "motor pool", "mess hall", "dining facility",
        ],
    },
    "Science Project": {
        "weight": 22,
        "terms": [
            "laser", "radar", "drone", "robot", "robotic", "sensor", "satellite", "microscope", "laboratory",
            "specimen", "specimens", "plasma", "cryogenic", "thermal", "simulator", "simulation", "wind tunnel",
        ],
    },
}

BUREAUCRACY_TERMS = [
    "indefinite delivery", "sole source", "sources sought", "request for information", "combined synopsis",
    "brand name", "or equal", "amendment", "solicitation", "justification", "notice of intent",
]

STOP_AGENCIES = {"GENERAL SERVICES ADMINISTRATION"}


def clean_space(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def short_agency(agency: str) -> str:
    agency = clean_space(agency)
    normalized = agency
    normalized = normalized.replace("DEPT OF ", "").replace("DEPARTMENT OF ", "")
    normalized = normalized.replace(", DEPARTMENT OF THE", "").replace(", DEPARTMENT OF", "")
    normalized = normalized.replace("INTERIOR", "Interior")
    lookup = {
        "DEPT OF DEFENSE": "Defense",
        "DEFENSE": "Defense",
        "INTERIOR, DEPARTMENT OF THE": "Interior",
        "INTERIOR": "Interior",
        "VETERANS AFFAIRS, DEPARTMENT OF": "Veterans Affairs",
        "VETERANS AFFAIRS": "Veterans Affairs",
        "AGRICULTURE, DEPARTMENT OF": "Agriculture",
        "AGRICULTURE": "Agriculture",
        "HOMELAND SECURITY, DEPARTMENT OF": "Homeland Security",
        "HOMELAND SECURITY": "Homeland Security",
        "HEALTH AND HUMAN SERVICES, DEPARTMENT OF": "HHS",
        "HEALTH AND HUMAN SERVICES": "HHS",
    }
    if agency in lookup:
        return lookup[agency]
    return normalized.title() if normalized.isupper() else normalized


def clean_title(title: str) -> str:
    title = clean_space(title)
    title = re.sub(r"^\d{1,3}--", "", title)
    title = re.sub(r"^(Sources Sought Notice|Sources Sought|Combined Synopsis/Solicitation|Pre-Solicitation Notice)\s*-\s*", "", title, flags=re.I)
    return clean_space(title)


def term_regex(term: str) -> re.Pattern[str]:
    return re.compile(r"(?<![a-z0-9])" + re.escape(term.lower()) + r"(?![a-z0-9])")


COMPILED = {
    category: [(term, term_regex(term)) for term in cfg["terms"]]
    for category, cfg in CATEGORY_RULES.items()
}
BUREAUCRACY_COMPILED = [(term, term_regex(term)) for term in BUREAUCRACY_TERMS]


def score_item(item: dict[str, Any]) -> dict[str, Any] | None:
    raw_title = clean_space(item.get("title"))
    title = clean_title(raw_title)
    if not title or len(title) < 8:
        return None

    agency = clean_space(item.get("agency"))
    if agency in STOP_AGENCIES:
        return None

    description = clean_space(item.get("description"))
    office = clean_space(item.get("office"))
    hay_title = title.lower()
    hay_all = f"{title} {description} {office} {agency}".lower()

    score = 0
    badges: list[str] = []
    reasons: list[str] = []
    matched_terms: list[str] = []
    category_scores: Counter[str] = Counter()

    for category, terms in COMPILED.items():
        cat_hits = []
        for term, rx in terms:
            if rx.search(hay_title):
                cat_hits.append(term)
                score += CATEGORY_RULES[category]["weight"] + 16
            elif rx.search(hay_all):
                cat_hits.append(term)
                score += CATEGORY_RULES[category]["weight"]
        if cat_hits:
            unique_hits = list(dict.fromkeys(cat_hits))[:3]
            category_scores[category] += len(unique_hits)
            badges.append(category)
            matched_terms.extend(unique_hits)
            reasons.append(f"{category.lower()} signal: {', '.join(unique_hits)}")

    bureaucracy_hits = [term for term, rx in BUREAUCRACY_COMPILED if rx.search(hay_all)]
    if bureaucracy_hits and badges:
        score += min(24, 6 * len(bureaucracy_hits))
        reasons.append(f"federal procurement language around a surprisingly concrete object")

    # Reward headline curiosity: long/specific titles, quantities, parentheticals, title-case object strings.
    if re.search(r"\b\d+[,.]?\d*\b", title):
        score += 9
        reasons.append("specific quantity or model number in the title")
    if "(" in title and ")" in title:
        score += 5
    word_count = len(title.split())
    if word_count >= 10:
        score += min(18, word_count - 8)
        if not any("specific title" in r for r in reasons):
            reasons.append("very specific public-record title")

    # Penalize generic technical parts unless there is a strong curiosity signal.
    generic_part_terms = ["valve", "washer", "adapter", "tee", "gasket", "bearing", "assembly", "circuit", "module"]
    if any(term_regex(t).search(hay_title) for t in generic_part_terms) and not badges:
        score -= 30
    if item.get("url", "") == "https://sam.gov":
        score -= 40

    if score < 42 or not badges:
        return None

    primary_category = category_scores.most_common(1)[0][0] if category_scores else badges[0]
    reasons = list(dict.fromkeys(reasons))[:3]
    badges = list(dict.fromkeys(badges))[:4]
    matched_terms = list(dict.fromkeys(matched_terms))[:8]

    plain = f"It reads like {primary_category.lower()} inside a federal procurement record. It may be perfectly reasonable — the weird part is seeing it as an official line item."

    return {
        "id": clean_space(item.get("id")) or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-"),
        "title": title,
        "agency": short_agency(agency),
        "agencyFull": agency,
        "office": office,
        "noticeType": clean_space(item.get("noticeType")),
        "postedDate": clean_space(item.get("postedDate")),
        "responseDeadline": clean_space(item.get("responseDeadline")),
        "placeOfPerformance": clean_space(item.get("placeOfPerformance")),
        "source": "SAM.gov",
        "url": clean_space(item.get("url")) or "https://sam.gov",
        "category": primary_category,
        "weirdnessScore": score,
        "absurdityBadges": badges,
        "matchedTerms": matched_terms,
        "weirdnessReasons": reasons,
        "plainEnglish": plain,
    }


def main() -> None:
    payload = json.loads(INPUT.read_text())
    opportunities = payload.get("opportunities", payload if isinstance(payload, list) else [])
    scored = []
    seen_titles = set()
    for item in opportunities:
        out = score_item(item)
        if not out:
            continue
        title_key = re.sub(r"[^a-z0-9]+", " ", out["title"].lower()).strip()
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        scored.append(out)

    scored.sort(key=lambda it: (-it["weirdnessScore"], it["agency"], it["title"]))

    # Keep variety: no one agency should dominate the receipt.
    selected = []
    agency_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    for item in scored:
        if agency_counts[item["agency"]] >= 7:
            continue
        if category_counts[item["category"]] >= 9:
            continue
        selected.append(item)
        agency_counts[item["agency"]] += 1
        category_counts[item["category"]] += 1
        if len(selected) >= MAX_ITEMS:
            break

    output = {
        "source": "sam.gov-bulk-csv",
        "generatedAt": payload.get("generatedAt"),
        "totalRows": payload.get("totalRows"),
        "activeRows": payload.get("activeRows", len(opportunities)),
        "method": "deterministic-keyword-scoring-no-llm-no-prices",
        "items": selected,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({
        "input": str(INPUT),
        "output": str(OUTPUT),
        "candidates": len(scored),
        "selected": len(selected),
        "top": [{"title": x["title"], "agency": x["agency"], "score": x["weirdnessScore"], "category": x["category"]} for x in selected[:8]],
    }, indent=2))


if __name__ == "__main__":
    main()
