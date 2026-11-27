# Hex-Die
Dynamic Resolution Engine for The Chronicles of Auld Ewe TTRPG.
A web application that combines the mystical elements of I-Ching hexagrams with dice rolling to create an interactive storytelling experience.

## Features

- **Hexagram Casting**: Generates one of 64 I-Ching archetypes.
- **Dice Rolling**: Supports various die types from d6 to d100.
- **Modifiers**: Allows users to apply bonuses or penalties to their rolls.

## Usage

1. Set the Difficulty Class (DC) using the input field.
2. Select a die type from the dropdown menu.
3. Optionally, apply a modifier.
4. Click "Harmonize" to cast a hexagram and roll the die.
5. Analyze the outcome using the "Analyze Outcome" button.

## Setup

1. Clone the repository.
2. Open `index.html` in your browser to start using the app.

## License

This project is licensed under [MIT License](https://opensource.org/licenses/MIT).

## Engine (canon build)

The resolution rules live in `engine/hexdie.js` (pure, no DOM; works from `file://` and in Node). All rules are data in `CONFIG`.
Rules authority: `RULES_CANON.md`. Interpretations and open flags: `DESIGN_DECISIONS.md`.

```
npm test        # 18 tests: tier tables, DC bands, odds, modifier/level-up properties, Pull, Bolt, Fate, damage, join
```

Telegram roll notifications (optional): copy `config.example.js` to `config.local.js` and fill in your values. Never commit it.
