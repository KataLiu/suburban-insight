# Acceptance Test Plan — Suburban Insight

IEEE 829-2008 Level Test Plan, **Acceptance** level: testing with real
target users, not the development team. This is the one level of the four
that **cannot be executed by an AI assistant** — it requires actual
international students. This document is the plan only; §8 is explicit
about what has and hasn't been done, with no fabricated results.

## 1. Introduction

**1.1 Document identifier:** `acceptance-test-plan.md`, v1, 2026-08-10

**1.2 Scope:** does the website actually work for its real target users —
international students and new migrants choosing a Melbourne suburb — not
whether the code is correct (that's Components/Integration/System, all of
which can and should pass before this level is attempted).

**1.3 References:** proposal Slide 12 ("Testing Approach" — this plan
formalizes its usability-testing paragraph directly, using the same
participant count and tasks already specified there), `docs/requirements.md`
§3–5 (target users, user needs, user journeys)

## 2. Participants

**Per the proposal (Slide 12): recruit 5+ international students.**
Not yet recruited. Suggested screening: currently living in or planning to
move to Melbourne, limited prior knowledge of Melbourne suburbs (so the
task reflects genuine unfamiliarity, not existing local knowledge).

## 3. Tasks (verbatim from the proposal's own plan)

1. **Find a suburb** — starting from the homepage with no prior
   instruction on how the site works, locate a specific named suburb (or
   one matching a given criterion, e.g. "affordable and near a train
   line") and open its profile.
2. **Apply filters** — narrow suburbs by a given budget and cultural
   background combination, using the filter bar.
3. **Compare suburbs** — add 2–3 suburbs to the comparison view and
   identify which one best fits a given scenario (e.g. "cheapest rent" or
   "most family households").

## 4. Evaluation Metrics (from the proposal, Slide 12)

| Metric | How it's measured |
|---|---|
| Task completion rate | % of participants who complete each of the 3 tasks without assistance |
| Navigation clarity | Did they find the council→suburb drill-down intuitive, or need prompting? |
| Data comprehension accuracy | Can they correctly state a suburb's rent/income/cluster after viewing its profile? |
| User satisfaction | Simple post-session rating/feedback |

## 5. Procedure

1. Brief participant on the scenario only (not how to use the site).
2. Observe them attempting Tasks 1–3 in order, without guiding unless
   they're fully stuck (note where/if that happens).
3. Ask the 4 evaluation questions above after each task, or once at the
   end — whichever the note-taker finds less disruptive to the session.
4. Record: time to complete each task, whether completed unassisted, and
   any comments.

## 6. Environment

The live site — either the local dev setup (`index.html` on `:5500`,
backend on `:8000`) or the deployed version once Milestone 14 is done.
Testing against a deployed URL is preferable (removes any doubt about
whether local setup quirks affected the result) but not required to run
this plan.

## 7. Pass/Fail Criteria

No numeric thresholds were specified in the proposal itself — this is
flagged as an open decision for the team, not assumed. Suggested starting
point if one is needed: all 3 tasks completed unassisted by at least 4 of
5 participants, since the proposal doesn't commit to a stricter number.

## 8. Status

**Not executed. Cannot be executed without real participants.** This
document is ready to run as-is — recruiting 5+ international students is
the only blocker, consistent with the risk already flagged in
`docs/roadmap.md` Milestone 13 ("recruiting 5+ real international student
testers takes lead time — start recruiting well before this milestone is
reached"). No results, scores, or quotes exist anywhere in this repository
for this level, and none should be added until a real session has
actually happened.
