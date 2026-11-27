# Hex-Die
Dynamic Resolution Engine for The Chronicles of Auld Ewe TTRPG.
A web application that combines the mystical elements of I-Ching hexagrams with dice rolling to create an interactive storytelling experience.

## Features

- **Hexagram Casting**: Generates one of 64 I-Ching archetypes.
- **Dice Rolling**: d6, d8, d12 and d20 (Outcome Tier from the die alone).
- **Modifiers**: Allows users to apply bonuses or penalties to their rolls.

## Usage

1. Set the Difficulty Class (DC) using the input field.
2. Select a die type from the dropdown menu.
3. Optionally, apply a modifier.
4. Click "Harmonize" to cast a hexagram and roll the die.
5. Use "Oraclize" (1 Fate Point) to reveal a line, or "Avert Disaster" to nudge a Disaster up.

## Setup

1. Clone the repository.
2. Open `index.html` in your browser to start using the app.

## License

This project is licensed under [MIT License](https://opensource.org/licenses/MIT).

## Engine (canon build)

All resolution rules live in `engine/hexdie.js` (pure, no DOM; works from `file://` and in Node) as data in `CONFIG`.
Rules authority: `RULES_CANON.md`. Interpretations, fixes and open flags: `DESIGN_DECISIONS.md`.

```
npm test         # 18 engine tests: tier tables, DC bands, odds, modifier/level-up properties, Pull, Bolt, Fate, damage, join
npm i -D jsdom && npm run smoke   # end-to-end page test (rolls, Telegram, GM codes, Fate Point storage)
```

Telegram (optional): copy `config.example.js` to `config.local.js` and fill in your bot token and default chat ID.
`config.local.js` is gitignored. Never commit it.

## Loading a character

Forge one in identify-eweself and use **Open in Hex-Die** (or download the JSON and pick the file here). Then tap a domain
(Intellectual, Physical, Emotional, Spiritual) to set your Personal DC and its Roll-Over/Under mode.

