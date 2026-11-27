# DESIGN_DECISIONS.md — Hex-Die canon engine

Every place the engine had to interpret, deviate, or delete, with the alternative rejected.
Authority: `RULES_CANON.md` (rulings 1–5 and G2b). Items marked **FLAG** need the commander's eye.

## Built to canon (no discretion used)
- Tier from the die roll alone; tables d6/d8/d12/d20. **d100 removed** (not canon; its band left 21–79 uncovered).
- Roll-Over/Under fixed by DC band 1–16 / 17–32 / 33–48 / 49–64.
- Signed Agency, Ovine Pull (width 2; flip 1–2 adjacent, 1 one step out), the Bolt — all ratified 2026-11-27.
- Step-down is an explicit flag (GM-invoked). Fate resistance lever ships **off**.
- 2 FP spent = +1 Skulduggery, cumulative floor. Disaster mitigation +1 per FP, cap 2 per scene.

## Interpretations — ALL RULED 2026-11-27 (see 6C in RULES_CANON.md)
1. **Step-down moves the cast against the player — RULED 2026-11-27.** The penalty R lowers the hexagram cast in Roll-Over and
   raises it in Roll-Under (clamped 1–64), following the mode actually in force after any Pull. The die only changes size; the
   modifier is untouched. Rationale (commander): the hexagram is the body, the die is the mind; difficulty stays in the body.
   (An earlier draft put R on the die as a negative modifier. Withdrawn.) Tests prove step-down never helps in any mode.
   Side effect to know: at the extremes the clamp softens the penalty (a cast of 3 stepped down by 8 in Roll-Over becomes 1, not −5).
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

## THE JOIN (fixed table, closes the pass/tier gap) — APPROVED 2026-11-27
The PASS decides *what happens*; the TIER decides *what it costs and how it feels*.

| | Triumph | Conflict | Disaster |
|---|---|---|---|
| **PASS** | **Green Pasture** — clean success; on an attack, Force a Line | **Hard-Won Ground** — success with a complication | **The Wolf's Bargain** — success at a serious price; Fate Points may mitigate |
| **FAIL** | **The Noble Stumble** — no penalty, learn something, next attempt +1 (once) | **Slipped Hold** — situation holds; retry at a price | **The Cliff Edge** — a consequence lands; GM may offer success for +1 Skulduggery |

All six cells live in `CONFIG.join`; editing a name or rule is a one-line change.

## Base: the Cyber edition (`Cyber-with-ROnRU-Revised`)
This branch is built **on** the Cyber edition, not on `main` (which is an older, thinner page). Its look, layout and
table features are kept; only the resolution logic underneath was replaced by the engine.

**Kept as it was:** the Cyberpunk styling; Personal / General / Action narrative buttons; Fate Points box with *Add +1*;
Step Down checkbox; *Harmonize*, *Oraclize* and shake-to-roll; the Game Master Settings panel (groups, GM codes, player join);
Telegram notifications (roll, Fate Point, Legendary Feat, line reveal); 3-minute inactivity reset; vibrate on roll.

### Table conventions inherited from Cyber, not in RULES_CANON — KEPT by ruling 2026-11-27
7. **Fate Points cap at 5, with +3 once per 24 h (capped).** Carried over unchanged. Cyber reset the 24 h clock on every
   spend/add; here a separate `lastRegen` stamp is used so spending does not postpone the top-up. Old `{points,timestamp}`
   saves are read and migrated.
8. **"Legendary Feat"** is announced on **pass + Triumph** (Green Pasture). Cyber used `Triumph && total >= dc`, which counted a
   Roll-Under miss as a pass. Rejected: Cyber's test.
9. **Oraclize = canon line reveal** (1 FP, d6 line, substitutes the die result only if it improves the tier). Cyber's version
   picked each of 6 lines at a 25% chance and showed their Solid/Broken shape, but changed no result. Rejected: the 25% roll.

### Bugs found in the Cyber edition and fixed
- **Bot token and default chat ID hard-coded** (same leaked token as `main`; revocation remains PRODUCTION priority #1). Now read only from gitignored `config.local.js`.
- **Strict inequalities and a `33–47` Over band**, so DC 48 was resolved as Roll-Under and exact hits failed. Engine: `≥`/`≤`, band `33–48`.
- **`stepDownUsed` was undefined** inside the roll function, so the Telegram notification threw after every roll.
- **`showChangingLines` was defined twice**, and the second copy read the page with a `:contains()` selector that browsers do not support, so Oraclize threw.
- **Telegram messages used Markdown parse mode** with narratives containing `_`, `*` and brackets; Telegram rejects such messages. Now plain text.
- **GM codes only worked on the GM's own browser**: the code was a random string kept in that browser's storage, so a player's phone always answered "Invalid GM code". The code now carries the group name and chat ID itself (`GM_` + base64url), so it works across devices with no server. Legacy codes still resolve on the device that made them.
  The code is not a secret: anyone holding it can post into that chat through the bot. That is the intended design.
- The ChatConfig object generated a second GM code that never matched the one shown; removed.
- Opening the page on a desktop browser threw (`DeviceMotionEvent` undefined); shake code is now guarded.
- Clicking *Harmonize* twice without touching an input wiped the DC *after* the second roll; removed. The 3-minute inactivity reset stays.
- Page script no longer depends on globals scattered across 1,000 lines of inline narrative data; narratives load from `engine/narratives.js`.

## Deletions
- `script.js` removed (never loaded by `index.html`).
- d4, d10 and d100 options removed (not canon).
- Inline narrative blocks (~1,000 lines) moved to `engine/narratives.js`; content identical.

## Not carried over
Cyber's "scaling table" for changing lines (replaced by the canon line reveal), and its `outcomeThresholds` for d4/d10/d100.

## Character import (from identify-eweself)
- A Character arrives by **URL fragment** (`#character=...`, cleared after load), the **file picker**, or the copy remembered from
  the last visit. It is validated on arrival; a file whose DC modes disagree with this engine's bands is **rejected, not repaired**.
- Picking **Intellectual / Physical / Emotional / Spiritual** fills the DC, shows its Roll-Over/Under mode, labels the result and the
  Telegram message ("Physical check") and names the character in Telegram. Editing the DC by hand drops the label.
- The Character's `dieTier` preselects the die; it remains editable for GM-granted tiers and testing.
- `engine/character.js` is **vendored** from identify-eweself (its header says so). `tests/character-import.test.js` fails if the
  two repos' Roll-Over/Under bands ever drift apart.
- Not done: writing results back to the Character (level-up, Skulduggery, Grace). That belongs to the SentientHub contract (Move 5/6).

- Vendored `engine/allocation.js` joins `engine/character.js`; refreshed from identify-eweself (rolls, 32-point allocation, zero floor, bands `18-36` / `36-50+`). Fixture regenerated. Not done: warning on an incomplete allocation at import.
- Vendored `engine/skills.js`. The roll panel gets a skill picker (the Character's skills first, the rest at −2); the skill modifier adds to the manual modifier.
