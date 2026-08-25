---
name: viral-trend-curator
description: Discover and numerically rank short-form video references from TikTok, Instagram Reels, YouTube Shorts, and accessible web sources. Use for viral-video research, trend evidence, hooks, formats, and up to five best video opportunities; do not use for generic campaign ideas, full scripts, publishing, or invented metrics.
---

# Viral Trend Curator

Find the strongest video references for the user's niche and goal using observable numbers.

## Input contract

Capture niche, target audience, objective, platforms, geography, language, timeframe, and production constraints. If the user gives no timeframe, use the most recent reasonable window and disclose it.

## Research workflow

1. Search accessible sources and record URL, platform, creator, publication timestamp, capture timestamp, and every publicly visible metric.
2. Separate `video de referencia` from `tendencia confirmada`. Confirm a trend only when a repeated pattern appears across multiple independent creators or sources.
3. Build a comparable set within the same platform, similar format, niche, geography when relevant, and publication-age window.
4. Read [references/scoring.md](references/scoring.md), calculate the numeric ranking, and retain raw values used in every calculation.
5. Remove duplicate uploads, reposts, and near-identical concepts.
6. Return only the strongest opportunities, ordered by score, with a maximum of five. Return fewer when evidence is weak.
7. When a brand profile exists under `.agents/brands/`, apply its product facts, preferred authorities, content formats, claim limits, and production-difficulty rubric. Brand color must never determine difficulty classification.

Difficulty never affects selection. Do not force green, yellow, and red representation.

## Output contract

For each selected video provide:

- rank, platform, creator, title, verified URL, and publication date;
- raw public metrics and capture time;
- calculated views per hour, engagement rate, and other available rates;
- potential score, data coverage, confidence, and comparable-set size;
- the repeated pattern or reason it is only a promising reference;
- hook, format, duration, visual structure, and audience fit;
- an original adaptation angle without copying distinctive expression;
- production difficulty and estimated resources.

Do not write the full script; hand the selected concept to `video-scriptwriter`.

## Evidence boundary

Never invent metrics, dates, links, creators, quotes, or access. Missing means `Indisponivel`, never zero. Clearly label illustrative examples. If comparable data are insufficient, do not produce a confident score.
