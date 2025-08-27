# Multi-Calendar Grid Card — Ideas & Roadmap

Keep this file simple and human-edited. Use it to collect ideas, pick a small “Next” batch, and mark what shipped in each release.

**Status legend:**  
- **Backlog** = parked idea  
- **Next** = shortlisted for the next release  
- **In progress** = currently being implemented  
- **Done** = shipped (keep the version link)

**Priority:** H / M / L (High, Medium, Low)

---

## Next (shortlist)
| ID       | Title                                 | Priority | Notes |
|----------|----------------------------------------|----------|-------|
| MCG-001  | GUI editor (ha-form)                   | M        | Basic fields first; advanced later |

## In progress
- [ ] *(add items when you start coding them)*

## Backlog
| ID       | Title                                 | Priority | Notes |
|----------|----------------------------------------|----------|-------|
| MCG-002  | i18n: German strings                   | L        | Auto default from HA locale |
|MCG-003|include daily weather|M|see details below|

### MCG-003 — include daily weather
- **Status:** Backlog
- **Priority:** M
- **Why:** (added value and compared to existing market solution like skylight an existing feature
- **Proposal:** Display high and low temperature for the 7 day forecast based on the HA weather integration. implementation first with an existing global weather integration as PoC and in a later step have it an optional attribut for different users to select their best local integration

## Done
- [x] **MCG-000** — Lit + TS migration + persistence + dialog — **v0.7.0**

---

## Idea card template
Copy this block below the list when an idea needs detail. Keep it short.

### MCG-XXX — (Title)
- **Status:** Backlog | Next | In progress | Done (vX.Y.Z)
- **Priority:** H / M / L
- **Why:** (user need / problem)
- **Proposal:** (1–3 bullet points for UX/behavior)
- **Example YAML (optional):**
  ```yaml
  type: custom:multi-calendar-grid-card
  # …
