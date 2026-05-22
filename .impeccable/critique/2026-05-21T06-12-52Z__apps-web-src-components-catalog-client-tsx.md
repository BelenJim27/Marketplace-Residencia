---
timestamp: 2026-05-21T06-12-52Z
slug: apps-web-src-components-catalog-client-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | No real-time feedback when filters change; URL sync delay leaves users uncertain |
| 2 | Match System / Real World | 3/4 | Colloquial language on-brand, but "¡Listo!" confirmation disappears in 1.5s (too fast) |
| 3 | User Control and Freedom | 3.5/4 | Filters auto-apply on toggle (accidental API calls); mobile modal lacks close-on-apply |
| 4 | Consistency and Standards | 2.5/4 | 6 rotating card colors break grid consistency; mixed typography (serif + sans); custom UI patterns |
| 5 | Error Prevention | 3/4 | Price range allows min > max without validation; no confirmation for clearing all filters |
| 6 | Error Recovery | 4/4 | Retry button on error; clear empty state; solid recovery flows |
| 7 | Flexibility and Efficiency | 2.5/4 | No keyboard navigation; Maestro field is free-text instead of dropdown; sort not persistent |
| 8 | Aesthetic and Minimalist Design | 3.5/4 | Cohesive palette, but cards have 6+ pieces of info + 3 buttons = visual overload |
| 9 | Help and Documentation | 2/4 | No inline help for filter terms (Maguey, Destilación, Molienda are unexplained jargon) |
| 10 | Accessibility | 2/4 | Missing ARIA labels, alt text on images; color-only indicators; emoji instead of icons |
| **Total** | | **26.5/40** | **Mid-range B- design. Visually on-brand, but usability friction and accessibility gaps.** |

## Anti-Patterns Verdict

**AI Slop Assessment**: No, this is hand-crafted. Earth-tone palette tied to mezcal heritage, custom card color cycling, artisanal typography (Georgia serif), and personality-filled microcopy ("Buscando lotes en el palenque...") show deliberate design. The folio system, floating price badge, and filter badge UX are intentional—not generic AI output.

**Deterministic Scan**: Detector bundle unavailable (known fallback). LLM assessment is the primary review.

## Overall Impression

**Well-branded visual design undermined by cognitive overload and accessibility gaps.** The component successfully conveys artisanal mezcal marketplace identity through color, typography, and microcopy. However, it sacrifices clarity for novelty: card color variance looks trendy but harms scanability, mobile experience loses sidebar context, and micro-interactions add polish but friction for power users.

**Grade: B- (26.5/40)**

## What's Working

1. **Brand coherence**: Earth tones, mezcal-specific language ("palenque," "folio"), and unique card design create marketplace identity competitors don't have. This isn't generic e-commerce UI—it's intentional.

2. **Responsive layout**: Desktop sidebar + mobile modal is the right pattern. Grid adapts smoothly from 280px cards on phones to 3-column layout on desktop. Media query thoughtfulness shows (hidden lg:, xs: utilities).

3. **Token refresh architecture**: The singleton deduplication pattern in the API client (mentioned in code) prevents concurrent token invalidation—a production-quality detail that most projects miss.

## Priority Issues

**[P0] Filter/Card Visual Hierarchy Breakdown**
- **What**: 6 card background colors rotate with no semantic meaning (not tied to producer, type, price tier). Grid looks like a rainbow instead of a curated catalog.
- **Why it matters**: Users scanning products can't distinguish signal from decoration. Eye fatigue increases; focus is scattered.
- **Fix**: Reduce to 2 colors (standard + highlight/new), OR bind color to producer/category with a legend (e.g., "Green = Oaxaca producers, Orange = imported").
- **Suggested command**: `/impeccable colorize` or `/impeccable quieter` (tone down color noise)

**[P1] Mobile Filter Context Loss**
- **What**: Modal drawer hides the entire catalog while users filter. Can't see results update in real-time. Spatial context is lost.
- **Why it matters**: Users on phones can't validate filter choices immediately. They close modal, see results, then re-open modal to adjust—friction loop.
- **Fix**: Use slide-over sidebar on tablets (not full modal); add "View Results" button in modal footer on phones that closes modal and scrolls to grid.
- **Suggested command**: `/impeccable adapt` (mobile-specific UX fixes)

**[P2] Confirmation Timeout Too Short**
- **What**: "¡Listo!" button state lasts only 1.5s. Power users adding 3+ items rapidly miss the confirmation.
- **Why it matters**: No feedback = uncertainty about whether item was added. User adds same item twice, or leaves without confirming.
- **Fix**: Extend to 2.5–3s, OR replace state change with persistent toast notification (dismiss-able by user).
- **Suggested command**: `/impeccable polish` (refine micro-interactions)

**[P3] Jargon Without Tooltips**
- **What**: Filter options "Maguey," "Destilación," "Molienda" are unexplained. New users don't know "Alambique" from "Cambio." They close filters and leave.
- **Why it matters**: Accessibility + conversion. First-timers bounce instead of exploring.
- **Fix**: Add info icons (?) next to filter section titles with 1-sentence tooltips ("Alambique: traditional copper still, slower burn, smoother finish").
- **Suggested command**: `/impeccable clarify` (UX copy and help text)

**[P4] Missing Filter Affordances**
- **What**: Maestro Mezcalero is free-text search with no autocomplete or dropdown. Price range allows min > max without validation. No "Apply Filters" button (auto-apply on toggle).
- **Why it matters**: Maestro search is inefficient for power users (typing "María" returns no suggestions). Price range confusion causes silent failures (no results, user blames catalog).
- **Fix**: Convert Maestro to combobox with API suggestions. Add client-side validation (swap if min > max). Add optional "Apply" button for deliberate filtering.
- **Suggested command**: `/impeccable shape` (rethink filter UX patterns)

## Persona Red Flags

**Power User (buying 3+ bottles, wants to research):**
- No autocomplete on Maestro field → gives up filtering by producer
- Sort preference not persisted → every page refresh resets to "Popularidad"
- No way to save searches or create alerts → every session is blank slate
- "¡Listo!" timeout too short → adds 3 items, misses confirmations
- **Risk**: Abandons for competitor with better filter/sort UX

**First-Timer (new to mezcal, unsure what to buy):**
- Maguey/Destilación/Molienda have no explanations → closes filters, leaves page
- Price range default (0–5000 MXN) is too wide → sees 200 results, overwhelmed
- No curated collections ("Best Under $500," "Bold & Spicy") → forced to filter manually with jargon they don't know
- Card visual overload (6 metadata + 3 buttons) → doesn't know where to click first
- **Risk**: High bounce rate; converts only if product image is obviously appealing

## Minor Observations

- **Overflow on phones**: Product descriptions clamped to 2 lines; long product names might push text off on 320px screens. Test edge cases.
- **Price badge positioning**: Fixed to `top-[280px]` assumes image height is exactly 280px. Variable aspect ratios could misalign badge. Use CSS position relative to image container instead.
- **Missing skeleton loaders**: Loading state shows spinner, blank space. Blank space = perceived slowness. Show 6 skeleton cards that fade into real products.
- **Filter badge animation**: Fade-in animation runs once on mount. Re-adding a filter after removal doesn't replay animation—users might not notice the badge.
- **No lazy-loading**: All cards render at once. If 100+ products, DOM is heavy. Consider `IntersectionObserver` for performance.

## Questions to Consider

1. **Why 6 card colors?** Is there semantic meaning (producer region, agave type, price tier)? If not, it's decoration hurting scannability. If yes, add a legend so users know what each color means.

2. **Why is Maestro Mezcalero free-text instead of dropdown/autocomplete?** Are there 10 producers or 500+? Current implementation is inefficient for both counts—improve UX here.

3. **Are active filter badges in the header redundant?** They mirror sidebar state but users might miss them. Consolidate to one location (sidebar is better).

---

**Trend**: First run for this target, no trend yet.
**Wrote**: `.impeccable/critique/apps-web-src-components-catalog-client-tsx.md`
