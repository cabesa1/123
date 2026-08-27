# Numeric ranking model

Rank content using verified numbers rather than intuition alone. Compare content within the same platform, similar format, niche, region when relevant, and publication-age window. Do not compare raw TikTok views directly with Instagram views.

## Required calculations

- `views_per_hour = views / hours_since_publication`
- `engagement_rate = (likes + comments + shares + saves) / views`
- `share_rate = shares / views`
- `save_rate = saves / views`
- `completion_rate = completed_views / video_starts`, only when available
- `growth_rate = (current_metric - previous_metric) / previous_metric`, only when two timestamps exist

Never treat a missing value as zero. Mark it unavailable.

## Normalize

Convert each available metric to a percentile from 0 to 100 against the comparable candidate set. Require at least five comparable items; otherwise mark the ranking `amostra insuficiente` and lower confidence.

## Potential score

Use these default weights:

- 30% velocity percentile: views per hour or verified growth rate
- 25% engagement-rate percentile
- 15% share-rate percentile
- 10% save-rate percentile
- 10% completion or retention percentile
- 10% numeric niche relevance, scored against explicit audience and objective criteria

When platform APIs do not expose a metric, redistribute its weight proportionally across the other verified performance metrics. Do not redistribute missing social metrics to niche relevance.

`potential_score = weighted mean of available verified percentiles`

Round to one decimal. Return a maximum of five items ordered by this score. Apply no quota by difficulty.

## Coverage and confidence

- `coverage = verified performance weight / 90%` because niche relevance is not a platform performance metric.
- `Alta`: coverage at least 80%, at least 20 comparable items, and metrics captured within the same age window.
- `Media`: coverage at least 55% and at least 10 comparable items.
- `Baixa`: anything below those thresholds.

Never label a low-confidence item as a confirmed trend. Call it a promising reference.

## Evidence table

For every selected item, show:

| Field | Value |
|---|---|
| Platform and URL | Verified source |
| Published | Timestamp or unavailable |
| Views | Raw number or unavailable |
| Likes | Raw number or unavailable |
| Comments | Raw number or unavailable |
| Shares | Raw number or unavailable |
| Saves | Raw number or unavailable |
| Views per hour | Calculated value |
| Engagement rate | Calculated percentage |
| Potential score | 0-100 |
| Coverage | Percentage |
| Confidence | Alta, Media, or Baixa |

If the source exposes only public views and publication time, calculate velocity but report low coverage. Never fill unavailable fields with estimates unless the user explicitly asks for a labeled estimate.
