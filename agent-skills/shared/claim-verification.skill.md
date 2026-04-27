# Claim Verification Skill

## Purpose

Keep researched decks and documents grounded in explicit source-backed claims.

## Inputs

- Research question.
- Source list.
- Extracted claims.
- Recency or source-quality requirements.

## Outputs

- `claim-table.json`
- `accuracy-review.md`
- Unsupported-claim list.
- Deck-ready claim list.

## Procedure

1. Split each claim into observed, inferred, unsupported, or needs-review.
2. Attach a source or provenance note to every claim.
3. Reject unsupported claims from the main artifact.
4. Preserve uncertainty labels in speaker notes and Word appendices.
5. Promote only verified or clearly labeled inferred claims into a deck.
