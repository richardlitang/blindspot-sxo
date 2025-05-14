# Quality Score

Last verified: 2026-03-05

## Scoring Scale

- 5: Strong, no known blockers
- 4: Good, minor issues only
- 3: Mixed, notable weaknesses
- 2: Risky, frequent regressions or drift
- 1: Critical, immediate remediation needed

## Domain Scorecard

| Domain | Score (1-5) | Evidence | Gaps | Owner |
|---|---|---|---|---|
| Core product | 3 | Baseline checks and local verification | Needs periodic score updates | Maintainers |

## Architecture Layer Scorecard

| Layer | Score (1-5) | Evidence | Gaps | Owner |
|---|---|---|---|---|
| Application architecture | 3 | Existing code structure and checks | Needs explicit guardrails | Maintainers |

## Top Risks

- Documentation drift over time.
- Policy drift without mechanical checks.

## Weekly KPI

- Docs freshness markers current: track weekly
- Open debt items with owners: track weekly

## Next Review

- Target date: 2026-03-05
- Review owner: Maintainers
