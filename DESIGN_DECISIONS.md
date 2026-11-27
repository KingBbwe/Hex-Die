# DESIGN_DECISIONS.md — Hex-Die canon engine

Every place the engine had to interpret, deviate, or delete, with the alternative rejected.
Authority: `RULES_CANON.md` (rulings 1–5 and G2b). Items marked **FLAG** need the commander's eye.

## Built to canon (no discretion used)
- Tier from the die roll alone; tables d6/d8/d12/d20. **d100 removed** (not canon; its band left 21–79 uncovered).
- Roll-Over/Under fixed by DC band 1–16 / 17–32 / 33–48 / 49–64.
- Signed Agency, Ovine Pull (width 2; flip 1–2 adjacent, 1 one step out), the Bolt — all ratified 2026-11-27.
- Step-down is an explicit flag (GM-invoked). Fate resistance lever ships **off**.
- 2 FP spent = +1 Skulduggery, cumulative floor. Disaster mitigation +1 per FP, cap 2 per scene.

## Interpretations — FLAG
1. **Step-down penalty applies to agency, not the cast.** Old code reduced the hexagram (`max(1, hex − R)`).
   In Roll-Over that equals a negative modifier; in Roll-Under, lowering the cast *helps* the player.
   Rejected: reducing the cast. Chosen: `mod − R`. A test proves step-down never helps in any mode.
2. **Line reveal.** Docs say "reveal a line (1–6), substitute the die result, improve the tier only if the line
   exceeds the roll". Value is drawn on a d6. Line→tier uses the d6 scale (6 = Triumph, 4–5 = Conflict, 1–3 = Disaster),
   which matches **every worked example** in the docs. Rejected: looking the line up in the die's own table —
   a line (max 6) could never lift a d12/d20 roll, contradicting the docs' "d12 line 6 → Triumph".
3. **Changed die results re-resolve the pass.** A revealed line or Fate-mitigated roll replaces the agency die, so
   pass/fail is recomputed, and a natural-1 Bolt is mastered when substituted ("volition over instinct").
4. **Non-strict comparisons.** Over: `≥ DC`; Under: `≤` ceiling, per canon ruling 4. The `Cyber-with-ROnRU-Revised`
   branch used strict `>` / `<`. Rejected: strict.
5. **Damage never flips a mode.** DC shifts use the *base* DC for band lookup (`modeDc`); only the number moves.
6. **Advantage on damage lines**: keep the better line for the actor — higher in Over, lower in Under; disadvantage reverses.

## THE JOIN (proposed fixed table, closes the pass/tier gap) — FLAG, awaiting ratification
The PASS decides *what happens*; the TIER decides *what it costs and how it feels*.

| | Triumph | Conflict | Disaster |
|---|---|---|---|
| **PASS** | **Green Pasture** — clean success; on an attack, Force a Line | **Hard-Won Ground** — success with a complication | **The Wolf's Bargain** — success at a serious price; Fate Points may mitigate |
| **FAIL** | **The Noble Stumble** — no penalty, learn something, next attempt +1 (once) | **Slipped Hold** — situation holds; retry at a price | **The Cliff Edge** — a consequence lands; GM may offer success for +1 Skulduggery |

All six cells live in `CONFIG.join`; editing a name or rule is a one-line change.

## Deletions
- **`script.js` removed.** It was never loaded by `index.html`. Its only unique idea (DC comparison) is now in the
  engine, correctly. Its non-canon "within 10 of DC = Conflict" band is intentionally dropped. Full original kept on
  branch `backup/pre-engine-2026-11-27`.
- Page: d10 and d100 options removed; the dead stub buttons "Analyze Outcome" / "Oraclize" (fixed strings) removed.
- Page: the stylesheet `<link>` had a missing quote (`rel="stylesheet>`); fixed.

## Not carried over (still on older branches, listed for the record)
Group/GM-code Telegram chat management and shake-to-roll (branch `Cyber-with-ROnRU-Revised`). Telegram *roll notifications*
are kept via `config.local.js`.
