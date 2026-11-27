# RULES_CANON.md — The Chronicles of Auld Ewe
### Authoritative resolution rules. Supersedes all draft documents and all existing code.

Status: **RATIFIED by the commander** (rulings 1–5) plus the **G2b resolutions** (§6A: Signed
Agency, Ovine Pull, Bolt). **One gap remains OPEN:** the six-cell join of DC pass/fail with Outcome Tier (§7). Where any repo disagrees with this file, the repo is wrong.

---

## 1. Fate Points vs. Grace — RATIFIED

Two distinct systems. They are not the same currency and must never share a UI element.

| | **Fate Points (FP)** | **Grace** |
|---|---|---|
| Nature | Active, spendable player currency | Passive moral metric (a meter) |
| Represents | Human volition / agency | Moral standing |
| Spent on | Revealing hexagram lines, rerolling outcomes, mitigating Disaster, revealing damage lines | Not spent in play |
| Earned by | (per progression rules) | Selfless acts |
| Used during | Active play | Downtime, to cleanse Skulduggery |
| Cost | **Every 2 FP spent = +1 Skulduggery** | — |

**Implementation notes:**
- Rename every spendable "Grace point" in UI and code to **Fate Point**.
- The FP→Skulduggery accrual is integral division on *cumulative* spend, not per-transaction:
  track total FP spent and derive Skulduggery as `floor(totalFPSpent / 2)`. Per-transaction
  rounding would let a player spend 1 FP repeatedly and never accrue.
- This ruling **aligns with existing SentientHub code**, which already treats Grace as a moral
  threshold (`GRACE_THRESHOLD = 25`, `GRACES_FOR_VIRTUE = 4`, `MAX_VIRTUES = 5`) alongside
  `SKULDUGGERY_MAX = 20`. Preserve those constants.

---

## 2. DC Arithmetic — RATIFIED

The hexagram appears **twice, in two different roles**, and they are not the same hexagram.

- **Personal DC (static).** Four fixed thresholds on the character sheet, derived once at creation
  from the Hexagram Matrix:
  - Intellectual DC ← Core Trait 1 (Conscious) hexagram
  - Physical DC ← Core Trait 2 (Unconscious) hexagram
  - Emotional DC ← T&P 1 hexagram
  - Spiritual DC ← T&P 2 hexagram
- **Hexagram Cast (random).** A *new* cast of 1–64, rolled fresh at the moment of action. Unrelated
  to the character's matrix.

**Formula:**
```
Result = HexagramCast(1-64) + DieRoll(d6…d20) + Modifiers
Compare Result against the actor's fixed Personal DC for the relevant domain.
```

`identify-eweself` already derives the four static DCs correctly — that code is canon-compliant and
should be preserved as-is (see §1.4 of the route).

---

## 3. Outcome Tiers and Damage Lines — RATIFIED (supplement, not replace)

- **General/non-combat actions:** the **die roll alone** sets the Outcome Tier
  (Triumph / Conflict / Disaster) per the per-die tables. The tier sets narrative tone.
- **Combat damage:** when an injury lands, a **Fate Point** is spent to reveal the **Damage Line
  (L1–L6)**.
- **Triumph on an attack** lets the player **Force a Line** — upgrade damage severity or apply a
  higher-tier effect automatically.

**Per-die Outcome Tier tables (retained from existing code, verified against the design documents):**

| Die | Triumph | Conflict | Disaster |
|---|---|---|---|
| d6 | 6 | 5–4 | 3–1 |
| d8 | 8–7 | 6–4 | 3–1 |
| d12 | 12–10 | 9–5 | 4–1 |
| d20 | 20–16 | 15–10 | 9–1 |

**d100 is NOT canon.** It appears in the current `Hex-Die` code with a malformed band (21–79
uncovered, silently falling through to Disaster) and appears in no design document. **Remove it.**

---

## 4. Roll-Over vs. Roll-Under — RATIFIED (fixed by DC band, never GM choice)

| Personal DC | Mode | Pass condition |
|---|---|---|
| **1–16** | Roll-**Over** | Result ≥ DC |
| **17–32** | Roll-**Under** | Result ≤ DC |
| **33–48** | Roll-**Over** | Result ≥ DC |
| **49–64** | Roll-**Under** | Result ≤ DC |

The mode is a property of the **DC value**, determined per domain, per character, at creation. It
is not chosen at the table.

**Design intent (commander):** neither high nor low hexagrams are strictly superior — Duality.
**Verified: the intent is achieved.** See §5.

---

## 5. Step-Down — RATIFIED (GM-invoked, never automatic)

- Remove the unconditional `applyStepDown()` call in `Hex-Die`. Replace with an explicit flag
  passed in the resolution request.
- **Triggers (GM only):** overwhelming odds, Noxite corruption, severe exhaustion.
- **Effect:** die size drops one tier **and** the effective hexagram value is reduced by a fixed
  amount.
- The existing `stepDownConfig` values match the documented example (d12 → d8, −8) and should be
  retained: `6→[6,2]`, `8→[6,4]`, `12→[8,8]`, `20→[12,10]`. Only the *unconditional invocation* is
  wrong, not the table.

---

## 6. DERIVED CONSEQUENCES — computed, verified, and OPEN for commander decision

The five rulings are individually clear. Rulings 2 and 4 **interact**, and the interaction produces
three effects that were not stated and are probably not intended. These were computed by exhaustive
enumeration over all 64 hexagram casts × all die faces (uniform hexagram cast, modifier 0).

### 6.1 The duality intent is CONFIRMED WORKING
Success probability is deliberately non-monotonic across the DC range, exactly as ruling 4 intends:

| DC | Mode | P(success), d6 | P(success), d20 |
|---|---|---|---|
| 1 | Over | 100% | 100% |
| 16 | Over | 82% | 92% |
| 17 | Under | 21% | 11% |
| 32 | Under | 45% | 34% |
| 33 | Over | 55% | 66% |
| 48 | Over | 32% | 43% |
| 49 | Under | 71% | 60% |
| 64 | Under | 95% | 84% |

A high hexagram is not better than a low one. **The core design goal is met.**

### 6.2 RESOLVED by §6A.2 — Band-boundary cliffs
Two adjacent DC values produce wildly different lives:

| Boundary | Effect (d6) |
|---|---|
| DC 16 (Over, 82%) → **DC 17 (Under, 21%)** | **61-point collapse across one point of DC** |
| DC 32 (Under, 45%) → DC 33 (Over, 55%) | 10-point step — acceptable |
| DC 48 (Over, 32%) → **DC 49 (Under, 71%)** | **39-point jump across one point of DC** |

A character whose Physical hexagram is 16 is competent; one with 17 is nearly helpless in the same
domain. Character creation is random, so this is assigned by chance at the 16/17 seam.

**Options:** (a) accept — it is thematically defensible that fate deals uneven hands;
(b) smooth the bands so pass rates are continuous at the seams; (c) add a compensating modifier for
DCs near a boundary. **Commander decision. Do not let an executor pick.**

### 6.3 RESOLVED by §6A.1 — Modifier sign is perverse under Roll-Under
Ruling 2's formula adds modifiers unconditionally. Under Roll-Under, **a positive skill modifier
makes you more likely to fail.** Verified at DC 24, d6: a `+3` modifier drops success to 27%, while
`−3` raises it to 37%.

**Required fix (recommend adopting as canon):** modifiers always move the Result *toward* success.
Under Roll-Over, add; under Roll-Under, subtract. Equivalently, store modifiers as signed
"advantage" and apply `Result = Cast + Die + (over ? +mod : −mod)`.
Without this, every skill a character trains actively harms them in half their domains.

### 6.4 RESOLVED by §6A.1 and §6A.3 — Die progression is inverted under Roll-Under
Levelling d6 → d8 → d12 → d20 is framed as growth. Under Roll-Under it is **decline**, because a
larger die pushes the Result up past the ceiling:

| DC (Under) | d6 | d20 | Change |
|---|---|---|---|
| 17 | 21% | 11% | **halved** |
| 32 | 45% | 34% | −11 pts |
| 49 | 71% | 60% | −11 pts |
| 64 | 95% | 84% | −11 pts |

A character who "levels up" gets measurably worse at every Roll-Under domain, and worst of all in
the 17–32 band. Note this also interacts with ruling 3: bigger dice *do* still improve Outcome Tier
odds, so a d20 character narrates better outcomes while failing more checks.

**Options:** (a) let players choose their die per check, making die size a tactical resource rather
than a rank; ~~(b) under Roll-Under, invert the die contribution (`DieMax + 1 − roll`)~~ —
**WITHDRAWN: verified to have zero effect** (a fair die read upside-down has the same spread of
values, so every probability is identical); (c) accept, and reframe progression as widening
variance rather than increasing power. **Superseded by the §6A proposal below.**

---

## 6A. RESOLUTIONS (G2b) — RATIFIED 2026-11-27 (Signed Agency, Ovine Pull, Bolt)

Design principle, taken from the game's own framing of the Harmonized Hex & Die:
**the hexagram cast is Fate — ovine, instinctive, neutral. The die and modifiers are Agency —
human will. Agency always strives toward success; Fate does not care which way you need it to
fall.** The creature is not a perfect machine, so each fix deliberately leaves a "little jinx".

Reference implementation: `mechanics/hexdie-mitigations.js` (pure, configurable, tested).
All figures below are exact enumeration over every cast × die face × Pull face, not samples.

### 6A.1 Signed Agency — resolves §6.3 and §6.4. **Amends ruling 2.**
```
Roll-Over  domains:  Cast + Die + Mod  ≥ DC
Roll-Under domains:  Cast  ≤  DC + Die + Mod      ("your agency raises the ceiling")
```
- **Modifiers now help in both modes.** DC 24 (Under), d6: −3 → 36.5%, 0 → 41.1%, +3 → 45.8%
  (canon as ratified: 36.7 / 32.0 / 27.3 — skill was harmful).
- **Levelling up now pays in both modes.** DC 17 (Under): 46.4% → 48.0% → 51.2% → 57.4% across
  d6 → d20 (canon: 21.1% → 10.6%). Every DC is now monotonically non-decreasing with die size.
- **Perfect duality.** Average success in Over bands now equals average success in Under bands
  exactly (66.4% at d6, 74.3% at d20). Under canon, Over beat Under by 10 points at d6 and
  **29 points** at d20.
- **Finding:** under canon as ratified, a d20 character's *average* success (61.4%) was *lower*
  than a d6 character's (63.1%). Progression was a net demotion overall, not just in Under domains.
- **Mismatch reduction:** "failed the check but rolled Triumph" drops from 10.2% to 4.2% of d20
  rolls. "Passed the check but rolled Disaster" stays at ~1/3 of rolls — that is Fate carrying a
  faltering hand, and the six-cell join (§7 note) still needs its own ruling.

### 6A.2 The Ovine Pull — resolves §6.2 (band-boundary cliffs)
- **Twilight DCs:** within 2 of an internal band edge — 15, 16, 17, 18 · 31, 32, 33, 34 ·
  47, 48, 49, 50.
- On a Twilight DC, roll a **d6 Pull die** alongside the check. Instinct may drag the creature into
  the **neighbouring band's mode**:
  - adjacent to the edge (16, 17, 32, 33, 48, 49): flips on **1–2**
  - one step further (15, 18, 31, 34, 47, 50): flips on **1**
- **Cliff reduction (d6):** 16→17: 61 pts → **17 pts**; 48→49: 39 → **17**; 32→33: 11 → **0**.
  At d20 the canon 16→17 cliff was **81 pts**; now 16.
- **The jinx that remains:** the seam still bites (17 pts against a normal 1.6-pt step); the
  strong DC 15–16 character sometimes flinches (84 → 73, 82 → 63); the weak DC 17–18 character
  sometimes stumbles into competence (21 → 46). A small dimple remains — DC 18 (39%) edges out
  DC 19 (33%) — deliberately left in as flavour.
- **Optional lever (off by default):** spend 1 Fate Point to resist a flip — the human mind
  overriding instinct — feeding the existing 2 FP = +1 Skulduggery cost.
- Tunable without code changes: Twilight width and flip faces live in `MITIGATION_CONFIG.pull`.

### 6A.3 The Bolt — the level-up jinx
- On a **natural 1** on the agency die, agency reverses at **full die size** (the die counts as
  −D instead of +1): the ram bolts.
- d6 bolts on 1 roll in 6 but shifts the check 7 points; a d20 bolts 1 in 20 but shifts it 21.
  **The more human power you hold, the harder instinct bites when it does.**
- Cost: a near-uniform ~1.7 pts of success at every die size — felt as an event, not a tax.
- Synergy with ruling 1: a Fate Point line reveal can substitute the die result, so a player may
  spend volition to master a bolt — at a moral cost.

### 6A.4 Commander rulings
1. **Signed Agency — ADOPTED.** Amends ruling 2's formula in Roll-Under domains.
2. **Ovine Pull — ADOPTED at the proposed strength** (Twilight width 2; flip on 1–2 adjacent to the edge, on 1 one step out).
3. **The Bolt — ADOPTED.**
4. **Fate-Point resistance lever — NOT RULED. Ships OFF** (`pull.resistableWithFatePoint = false`). Revisit after playtesting.

---

## 6B. THE JOIN — APPROVED 2026-11-27, fixed table for pass/fail x Outcome Tier (closes the open gap)

The PASS decides what happens; the TIER decides what it costs and how it feels. Implemented in
`engine/hexdie.js` (`CONFIG.join`), approved by the commander on 2026-11-27. Names and rules are one-line edits.

| | Triumph | Conflict | Disaster |
|---|---|---|---|
| **PASS** | **Green Pasture**: clean success; on an attack, Force a Line | **Hard-Won Ground**: success with a complication | **The Wolf's Bargain**: success at a serious price; Fate Points may mitigate |
| **FAIL** | **The Noble Stumble**: no penalty, learn something, next attempt +1 (once) | **Slipped Hold**: situation holds; retry at a price | **The Cliff Edge**: a consequence lands; GM may offer success for +1 Skulduggery |

Interpretations the engine had to make are logged in `DESIGN_DECISIONS.md` (Hex-Die repo, PR #2).

---

## 6C. COMMANDER RULINGS ON ENGINE INTERPRETATIONS — 2026-11-27

1. **Step-down** lowers the hexagram cast by R in Roll-Over and raises it by R in Roll-Under (clamped 1–64). Body carries the difficulty; the die only changes size. Supersedes the "penalty on agency" draft.
2. **Line reveal** uses a d6 as the line value for every character, whatever die they roll. Scale: 1–3 Disaster, 4–5 Conflict, 6 Triumph. Substitutes the die result only if the line beats the roll and the tier improves.
3. **Substituted results** (line reveal, Avert Disaster) are re-judged: they may flip a fail into a pass, and cancel a natural-1 Bolt.
4. **Non-strict comparison**: Over passes at ≥ DC, Under at ≤ the ceiling. DC 48 is Roll-Over.
5. **Wounds never flip the mode.** Damage moves the DC number; the band comes from the base DC.
6. **Advantage on damage lines** keeps the line better for the actor (higher in Over, lower in Under; disadvantage reverses).
7. **The Join table (6B)** approved as written.
8. **Fate Points**: cap 5, +3 once per 24 h (capped), kept as a table convention.
9. **Legendary Feat** is announced on pass + Triumph.
10. **Oraclize** is the canon line reveal at 1 Fate Point.
11. **Spending a Fate Point to resist the Ovine Pull** is permitted in principle but ships OFF (`pull.resistableWithFatePoint=false`).
12. **GM codes** embed group name and chat ID so they work across devices; the commander accepts that a code holder can post to that chat through the bot, for now.

---

## 7. Consequences for the existing code

| Repo | Status under this canon |
|---|---|
| `identify-eweself` | Four-DC derivation is **canon-compliant** — preserve. Must additionally emit the DC band/mode per domain. |
| `Hex-Die` — live inline engine | Has the tier tables (keep) but **ignores DC entirely** (must add). Step-down unconditional (must gate). d100 (must remove). |
| `Hex-Die` — dead `script.js` | Has DC comparison but with a non-canon "within 10 = Conflict" band and no tier tables. **Its DC comparison concept survives; its implementation does not.** |
| `SentientHub` | Grace-as-moral-meter constants are **canon-compliant** — preserve through the compile repair. |

**The surviving engine is neither existing engine.** It is a merge: DC comparison (from the dead
file's concept) + per-die tier tables (from the live file) + FP/line reveal + damage lines + gated
step-down. Build it fresh per Move 3; port nothing wholesale.

## 6D. COMMANDER RULINGS ON CHARACTER CREATION — 2026-11-27

1. **Soul-pattern roll**: 2d6 as a fraction. If the pair is not one of the twelve valid profiles, keep the first die and reroll the second until valid. This makes the twelve exactly equiprobable.
2. **Core-trait rolls**: two independent 2d8 rolls, hexagram = (first − 1) × 8 + second. *Flagged interpretation*: method undocumented in the source corpus; duplicates possible.
3. **32-point allocation**: nine attributes, each 1–5, 32 points in total. Default is lineage-seeded (the seed is the floor and the points to spend bring the total to 32); free build starts at all 1s with 23 to spend. *Flagged interpretation*: supersedes the old `surplus: 10` values.
4. **Zero floor**: each reroll beyond the second in 24 h costs one point, but the budget never drops below the sum of the floors: `budget = max(floorSum, 32 − penalty)`. Points to spend never go negative.
5. **Age bands**: `18-36` (ages 18–35) and `36-50+` (36 and over). Supersedes `0-50` / `50+`. SentientHub's `18-35` / `36-50` labels must be aligned.
6. **Skills** (canonical list supplied 2026-11-27, TCoAE_Character_Creation_Skills.docx): six domains, 34 groups, 111 skills; 36 are linked to an attribute (4 each) by the integration table, the other 75 carry no attribute. Default modifier −2; randomly assigned skills start at 0. *Flagged interpretations*: 3 skills are assigned at creation (count not stated); the table's parentheticals (Reason, Charisma, Strength...) disagree with the skills they sit beside, so the attribute name governs; Artistry and Command (named in the rules text, absent from the list) are kept as `rules-text` entries; no Internal/External split is stored; Acquired Skillsets are unbuilt. In Hex-Die a chosen skill adds its modifier to the roll.
7. **Skill follow-up rulings (2026-11-27)**: 3 random starter skills confirmed; the integration table's parentheticals are ignored; the 76 skills without a document link were assigned an attribute by the build (open to review, one word each in `skills.js`); every skill now has an attribute. Journey split (1-32 / 33-64) unchanged. **Acquired Skillsets** are built: only Emotional Reading and Rapport Building (both Emotion) exist; held at modifier 0, earned in play, none at creation; `linkedSkill` stays null until ruled.

## 6E. ACTION ECONOMY, RESILIENCE, DISQUIET, TONGUE POWER — COMMANDER DIRECTION 2026-11-27
Ruled by the commander:
1. Effects that the codex words as spending Grace or Fate are read as costing **Fate Points**. Grace is the moral meter and is never spent.
2. Canon dice only: every amount die is d6, d8, d12 or d20 (codex d4 maps to d6, d10 to d12; recorded per action in `engine/actions.js`).
3. Will is the battleground: 16 Will skills added (see CHARACTER_SCHEMA); Will holds 24 skills in total.
4. Skulduggery can be gained and lost by actions (sources: Ovine Fury +5, Skyrend Strike +10, Final Stand +10, Doshi magic; sinks: Defensive Chant, Honorable Yield, Purifying Light, Bleat of Unity). Sinks reduce the uncrystallised meter only, never Taints. 2 Fate Points spent still add 1 Skulduggery.
PLACEHOLDERS (engine values, awaiting ruling): Resilience = 20 + 4 x Will; Disquiet cap 10, -1 to the modifier per point; Tongue Power pool 6, cost 2 or 3 per Tongue, burnout on a Disaster, master ability once per rest, a long rest resets all; effect "when" readings (triumph / conflict / disaster / always) taken literally.
UNRULED and not built: phase-check dice and hexagram ranges, the L1-L6 line-effect table, Doshi "Skulduggery deficit/step-down" rules, Ganga/Doshi spell-level dice.
