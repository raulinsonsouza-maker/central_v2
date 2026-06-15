---
name: CRM per-lead media attribution limits
description: Which channels can show real per-lead campaign/keyword in the CRM lead detail, and why Google cannot.
---

# Per-lead media attribution: what is real vs impossible

When asked to show "which campaign / adset / ad (Meta) and campaign / keyword (Google) a CRM lead came from", the constraint is the **data source**, not the UI.

- **Meta (Facebook/Instagram Ads): REAL and available.** Lead Ads form submissions are synced into `MetaLeadIndividual` (campaign/adset/ad/form + email/phone), then matched to `LeadCrm` by email→phone in `metaCrmMatcher`, writing `dadosMarketing.metaCampaignName/metaAdsetName/metaAdName/metaFormName`. The drawer shows these with a "✓ confirmado" badge.
- **Google: NOT available per-lead.** Confirmed against the CVCRM CVDW `leads` API docs (https://desenvolvedor.cvcrm.com.br/reference/leads-20.md) — it exposes only `origem/origem_nome/origem_ultimo`, `midia_original/midia_ultimo`, `conversao_original/conversao_ultimo`. There is **no gclid, no UTM, no keyword, no campaign** field. Google leads in practice are mostly organic ("Busca Orgânica"). There is no Google equivalent of `MetaLeadIndividual`, and Google Ads API cannot tie an individual person/lead to a keyword. `keyword_view`/`fetchKeywordMetrics` is **aggregate** keyword performance only (lives in the Criativos tab).
- **RD Station Marketing enrichment** (`lib/rdMarketing/enrich.ts`) does NOT fill campaign/keyword either — `normalizeEnrichment` extracts business-profile custom fields (faturamento, setor, cargo), not UTM/traffic. For the one CVCRM client it was also unconfigured (no token, 0/653 leads had `rdContactId`).

**Why this matters:** Do NOT fabricate Google per-lead campaign/keyword — the user explicitly requires real data. The honest UI is: show Meta confirmed data, and for channels without ad-level attribution show a note that per-lead campaign/keyword isn't tracked (only origem/mídia/conversão), pointing to the Criativos tab for Google keyword aggregates.

**How to apply:** If a future request asks to "bring Google campaign/keyword into the lead detail", the only way to make it real is to first capture gclid/UTM at lead-capture time and persist it into `LeadCrm.dadosCv` (CVCRM doesn't carry it today) — otherwise it's impossible.
