# Suburban Insight — Requirements Document

Source of truth: `data/proposal.pdf` (FIT3163 DS01 Project 7 proposal, 20 slides). Every requirement below is traced to its originating slide(s). Where something is inferred rather than stated outright, it is explicitly marked **[Assumption]** or **[Unclear]** — see §19–20.

## 1. Project Purpose
Suburban Insight is a web-based dashboard that helps newcomers to Melbourne make informed suburb-selection decisions by centralising suburb comparison data in one place. Stated goal: *"To improve settlement decision-making for newcomers through a centralised suburb comparison platform."* (Slide 3)

## 2. Problem Statement
Housing/suburb decisions are currently made with fragmented information. Supporting stats (Slide 3): 7.5M people in Australia born overseas (27.6% of population); 71% arranged accommodation before arriving; 52% experienced at least one housing-related problem. The core user question is simply **"Where should I live?"**, complicated by affordability, safety, and other settlement factors that are hard to evaluate suburb-by-suburb today.

## 3. Target Users
- **Primary:** International students newly arrived in Melbourne. (Slide 4)
- **Secondary:** Newcomers on a working visa, or new migrants. (Slide 4)

## 4. User Needs
- Centralised, trustworthy suburb data instead of scattered sources — 90% of surveyed students cited "too much scattered information" and "lack of suburb knowledge" as top difficulties. (Slide 5)
- A visual, intuitive way to explore unfamiliar areas — 80% of surveyed students wanted an interactive suburb map. (Slide 5, Req.1 rationale on Slide 6)
- Ability to narrow suburbs by personal circumstances (rent, income, cultural background) that existing platforms don't support. (Req.2, Slide 6)
- Direct, visual side-by-side comparison when evaluating multiple suburbs. (Req.3, Slide 6)
- Discovery of suburbs they may not have considered but which match their profile. (Slide 8 "User value")
- Confidence that the data is accurate/credible for a decision this important. (Req.5, Slide 6)

## 5. Main User Journeys
See §5 detail in **[User Journeys](#user-journeys-standalone)** section below — duplicated there per the requested output format.

## 6. Required Dashboard Pages
Only two pages/routes are shown in the proposal (Slides 7, 9):
1. **Map & Search** (home) — `suburbaninsight.com.au`
2. **Suburb Comparison** — `suburbaninsight.com.au/compare`

No account, login, or settings pages are shown or implied — explicitly out of scope (Slide 16).

## 7. Required Dashboard Features
- Interactive map with clickable suburb markers (Req.1, Slide 6/7)
- Suburb search bar with implied autocomplete (Slide 7; "Search autocomplete" is a named WBS task, Slide 14)
- Persona/filter chip bar — "I am: …" (Slide 7)
- Suburb profile sidebar with tabbed sections: **Overview / Culture / Services** (Slide 7)
- "Recommended for You" panel driven by clustering (Slide 7, 8)
- Suburb comparison workflow: add/remove suburbs, side-by-side table (Slide 9)
- ML-based suburb clustering underlying the recommendations (Req.4, Slide 6/8)

## 8. Required Filters
Shown explicitly as chips on the map page (Slide 7): **country/cultural background** (e.g. "From China"), **family size** (e.g. "Family of 3"), **weekly budget** (e.g. "$400–600/wk"), plus an open-ended **"+ Add filter"** control implying the filter set is extensible.

Req.2 (Slide 6) states filters should cover **rent, income, and cultural background** specifically. The wireframe's "budget" chip likely maps to rent; an explicit income filter is not shown in the mockup, only in the profile stats — **[Unclear]**, see §20.

## 9. Required Charts and Visualisations
- Cultural background breakdown as a labelled horizontal bar/progress indicator per suburb, e.g. China 38%, India 22%, Australia 18%, Vietnam 10% (Slide 7)
- Same cultural-background bars shown side-by-side per suburb in the comparison view (Slide 9)
- Stat tiles (large number + caption) for median income, population growth %, overseas-born %, family household % (Slide 7)
- D3.js is the named library for "data visualisation, suburb comparisons" (Slide 10) — confirms charts should be D3-built rather than a charting framework
- The K-means cluster diagram on Slide 8 is explanatory (how the ML works), not necessarily a literal UI screen — the user-facing output of clustering is the "Recommended for You" list, not a cluster-plot chart. **[Assumption]**

## 10. Required Map Interactions
- Leaflet.js interactive map centred on Melbourne (Slide 10)
- Clickable suburb markers; clicking a suburb populates the sidebar profile (Slide 7)
- Suburbs currently shown as point markers with name labels (Box Hill, Glen Waverley, Clayton, Springvale) (Slide 7)
- The WBS lists "Leaflet map **+ GeoJSON**" (Slide 14), implying suburb boundary polygons are intended eventually, not just point pins — the map mockup itself only shows points. Boundary data source is **[Unclear]**, see §20.

## 11. Required Suburb Comparison Functions
- Add suburbs to a comparison set via chips: `Comparing: Clayton, VIC ✕ | Box Hill, VIC ✕ | + Add suburb` (Slide 9)
- "← Back to map" navigation back to the map page
- Side-by-side table grouped into **Demographics**, **Cultural Background**, **Access to Services** sections (Slide 9)
- Metrics compared: median income, population growth %, overseas-born %, family households %, median weekly rent, top cultural backgrounds, drive time to primary school/hospital/GP/childcare
- Some values are colour-highlighted (presumably to flag the "better" suburb per metric) — the exact highlighting rule is not defined. **[Unclear]**, see §20.

## 12. Required Recommendation Functions
- "Recommended for You" section on the suburb profile sidebar: *"Based on your filters — top matching suburbs: Clayton, Box Hill, Glen Waverley"* (Slide 7)
- Underlying method: K-means clustering with StandardScaler (Slide 10), on features — median income, median rent, overseas-born %, family household %, cultural background, population growth — sourced from ABS Census 2021 (Slide 8)
- Illustrative cluster labels shown: **Cluster A** "Affordable + diverse", **Cluster B** "Family-oriented", **Cluster C** "Urban + higher-rent" — explicitly marked on the slide as *"Illustrative example only; final clusters will be generated from ABS data"* (Slide 8). Actual cluster count/labels are **not fixed** and must come from real clustering output, not be hardcoded.
- WBS confirms clustering methodology tasks: feature selection → elbow/silhouette method (to choose k) → train K-means → recommend API → "For You" UI (Slide 14)

## 13. Data Required for Each Feature
| Feature | Data fields | Source (as named in proposal) |
|---|---|---|
| Map markers | Suburb name, location (points now; boundary GeoJSON later) | Not explicitly named — **[Unclear]** |
| Profile — Overview | Population, population growth % (since 2016), median weekly household income, overseas-born %, family household % | ABS Census 2021 (Slide 7, 10) |
| Profile — Culture | Cultural background % breakdown by country of origin | ABS 2021 Census: Cultural diversity in Australia (Slide 17 reference) |
| Profile — Services | Drive time to primary school, hospital, GP/clinic, childcare | ABS Road distance and drive time access measures (Slide 17 reference, Slide 10) |
| Filters (rent/income/culture) | Same demographic fields as above | ABS Census 2021 |
| Recommendations | Median income, median rent, overseas-born %, family household %, cultural background, population growth | ABS Census 2021 (Slide 8) |
| Comparison | All of the above, per suburb, plus median weekly rent | ABS Census 2021 |

Note: median weekly **rent** appears in the comparison table (Slide 9) but not in the Overview tab mockup (Slide 7, which shows income only) — both are needed in the underlying dataset regardless of which screen surfaces them.

## 14. Visual Design Requirements
- **Colour scheme: dark navy + teal**, explicitly specified in the AI-mockup prompt used to generate the wireframes (Slide 18) and consistent across both wireframes (Slides 7, 9)
- Top navbar: logo + search bar + primary CTA button ("Compare suburbs")
- Secondary filter/context bar directly under the navbar (persona chips, or "Comparing: …" chips)
- Two-panel layout: map/table on the left (larger), sidebar/detail panel on the right (narrower)
- Card-style stat tiles: large bold number + small grey caption label underneath
- Tabbed sub-sections within the sidebar (Overview / Culture / Services)
- Horizontal bar indicators for percentage breakdowns (cultural background)
- Footer/caption citing data provenance, e.g. *"VIC · Melbourne suburbs · ABS Census 2021"* (Slide 7)
- Comparison table uses colour (green) to highlight certain values per row (exact rule unclear, §20)

## 15. Functional Requirements
| ID | Requirement | Priority | Slide |
|---|---|---|---|
| FR1 | Interactive map with clickable suburbs showing demographics | High | 6 |
| FR2 | Demographic filters by rent, income, cultural background | High | 6 |
| FR3 | Side-by-side suburb comparison with charts | Med | 6 |
| FR4 | ML suburb clustering (K-means) powering recommendations | Med | 6 |
| FR5 | Suburb search with autocomplete | — | 7, 14 |
| FR6 | Suburb profile with Overview/Culture/Services tabs | — | 7 |
| FR7 | Add/remove suburbs from an active comparison set | — | 9 |

## 16. Non-Functional Requirements
| ID | Requirement | Priority | Slide |
|---|---|---|---|
| NFR1 | Data accuracy — sourced from official ABS Census data | Med | 6 |
| NFR2 | Acceptable map load time and API response time | — | 12 |
| NFR3 | Cross-browser compatibility: Chrome, Firefox, Safari | — | 12 |
| NFR4 | No login and no installation required (zero-friction access) | — | 10 |
| NFR5 | Usable by target users with measurable task completion | — | 12 |

## 17. Technical Constraints
- No budget for paid APIs or cloud services — must use free tiers (Vercel + Render) (Slide 10, 11)
- Team of 4 students with varied web/data skills — implies avoiding unnecessary framework complexity (Slide 11)
- Must use only publicly available data sources (ABS) (Slide 11)
- **Out of scope:** real-time data, mobile app, non-ABS data sources, user login/accounts, paid APIs (Slides 11, 16)
- **Timing constraint:** the proposal states *"Semester 1 = research and design only; implementation in Semester 2"* (Slide 11) — see §20 for the tension this creates with the Gantt chart.

## 18. Accessibility and Usability Considerations
- Survey found 10% of respondents cited language barriers as a difficulty (Slide 5) — suggests preferring plain language and avoiding jargon, though no explicit i18n/multilingual requirement is stated.
- Target users assumed to have basic computer literacy and desktop browser access (Slide 11) — no explicit mobile-responsive requirement, only "no mobile app" is stated as out of scope; these are not the same thing.
- Usability testing planned with 5+ international students on key tasks: find a suburb, apply filters, compare suburbs (Slide 12).
- Evaluation metrics: task completion rate, navigation clarity, data comprehension accuracy, user satisfaction (Slide 12).
- No explicit accessibility standard (e.g. WCAG level) is named anywhere in the proposal — **[Unclear]**, see §20.

## 19. Assumptions
- **[Assumption]** ABS Census data is publicly available and free to use for this academic project (stated directly, Slide 11).
- **[Assumption]** Users have desktop browsers; no dedicated mobile layout is required (Slide 11), though a responsive layout is still good practice at low cost.
- **[Assumption]** Geographic scope is Melbourne suburbs only, not all of Victoria (Slide 11).
- **[Assumption]** The current engagement (this conversation) is a head start on work the proposal originally scheduled for Semester 2, since Semester 1 was meant to be "research and design only."
- **[Assumption]** Suburb boundary/point geometry for the map will need a public geospatial source (e.g. ABS ASGS SA2 boundaries) since none is explicitly named — to be confirmed with the user before building map boundary layers.
- **[Assumption]** The "+ Add filter" control implies more filter types will be added beyond the 3 shown in the wireframe.

## 20. Unclear or Missing Information
The following must be clarified/provided before those specific features can be fully built (also tracked in the "Missing Information" list given to the user separately):
1. **Exact ABS datasets/table IDs** — only "ABS Census 2021" and "ABS Access Measures" are named generally; no specific data cube/table numbers.
2. **Suburb boundary/geometry source** for the map (GeoJSON) — mentioned only as a WBS task title (Slide 14), not specified on the data slide.
3. **Full suburb list / geographic inclusion criteria** — only 4 example suburbs shown (Clayton, Box Hill, Glen Waverley, Springvale); which LGA(s) or the full Greater Melbourne suburb set is not defined.
4. **Recommendation engine specifics** — number of clusters (k), exact feature weighting, and how active filters map to cluster-based vs. nearest-neighbour recommendations are undefined; Slide 8 explicitly says the shown clusters are illustrative only.
5. **Comparison table colour-highlighting rule** — which metrics are "higher is better" vs "lower is better" (e.g. rent vs income) is not defined.
6. **Full filter set and value ranges** — Req.2 requires rent/income/culture filters, but only 3 example chips are mocked; UI for income filter specifically is not shown.
7. **Suburb search data source** — "Search autocomplete" is a planned WBS task, but the list it autocompletes against isn't specified (presumably the master dataset, to confirm).
8. **Accessibility standard** — no WCAG or equivalent target is specified.
9. **Responsive/mobile breakpoint requirement** — "no mobile app" is out of scope, but that doesn't resolve whether the web dashboard should be responsive.
10. **Gantt chart (Slide 15) vs. "Semester 1 = design only" (Slide 11) tension** — the Gantt chart allocates Weeks 1–12 to actual build tasks (Leaflet map, FastAPI endpoints, data cleaning, D3 charts, K-means training, deployment), which appears to contradict Slide 11's statement that Semester 1 is design-only and implementation happens in Semester 2. **Needs clarification: which week/milestone are we actually starting from right now?**
11. **Error/empty state content** — named as a WBS task (Slide 14) but no specific wording/design given.
12. The linked detailed Gantt spreadsheet (Slide 20 appendix) was not accessible to me — if it contains additional detail relevant to scope or data, please share it directly.

---

## User Journeys {#user-journeys-standalone}

**Journey A — International student (Use Case 1, Slide 4):** wants affordable rent + Chinese-speaking residents near their university.
1. Lands on the map page, sets persona filters: cultural background = China, budget = $400–600/wk (Slide 7).
2. Browses map pins or reads the auto-populated "Recommended for You" list.
3. Clicks a suburb (e.g. Clayton) → sidebar opens on **Overview** tab showing income, growth, overseas-born %, family households.
4. Switches to **Culture** tab to confirm the Chinese-resident percentage.
5. Switches to **Services** tab to check drive time to campus-adjacent services.
6. Adds 2–3 candidate suburbs to comparison, navigates to `/compare`.
7. Reviews the side-by-side table, removes a suburb that doesn't fit, makes a decision.

**Journey B — Migrant family (Use Case 2, Slide 4):** wants to compare suburbs by income levels, nearby services, and overall living conditions.
1. Sets persona filters: family size, budget (Slide 7).
2. Opens multiple suburb profiles, focusing on **Overview** (income, family household %) and **Services** (school/childcare/GP drive times).
3. Adds several suburbs to the comparison set.
4. Reviews the **Demographics** and **Access to Services** sections of the comparison table side by side.
5. Uses colour-highlighted "better" values (rule TBD, §20) to narrow the shortlist.

## Requirements Traceability Checklist
| Item | Slide(s) |
|---|---|
| Problem background & stats | 3 |
| Target users | 4 |
| Use cases | 4 |
| Survey results | 5 |
| 5 significant requirements | 6 |
| Map & search wireframe | 7 |
| ML breakdown wireframe | 8 |
| Comparison wireframe | 9 |
| Tech stack | 10 |
| Assumptions & constraints | 11 |
| Testing approach | 12 |
| PM methodology | 13 |
| WBS | 14 |
| Gantt chart | 15 |
| Scope (in/out) | 16 |
| References | 17 |
| AI acknowledgement (design prompt) | 18 |
