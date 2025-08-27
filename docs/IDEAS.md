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
- [ ] **MCG-001** — Hide weekends / work-week view (Priority: M)
- [ ] **MCG-002** — Partial-day grid (slot_min_time → slot_max_time) (Priority: H)

## In progress
- [ ] *(add items when you start coding them)*

## Backlog
| ID       | Title                                 | Priority | Notes |
|----------|----------------------------------------|----------|-------|
| MCG-003  | Event action handlers (tap/hold/double)| M        | Open URL, call service, more-info, etc. |
| MCG-004  | i18n: German strings                   | L        | Auto default from HA locale |
| MCG-005  | “Jump to now” button                   | L        | Scroll to current time in current week |
| MCG-006  | GUI editor (ha-form)                   | M        | Basic fields first; advanced later |

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
