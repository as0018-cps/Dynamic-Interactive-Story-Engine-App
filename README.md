# Dynamic Interactive Story Engine

A browser-based application for creating and playing branching interactive stories. Built as a single-page application (SPA) with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, zero dependencies.

![Story Engine](assets/backgrounds/throne.png)

## Features

### Core
| Feature | Description |
|---------|-------------|
| **Branching Stories** | Scenes connected by choices; each choice leads to a new scene |
| **Conditional Choices** | Choices appear/disappear based on player state (`gold >= 10`, `has_sword == true`) |
| **State Modifiers** | Choices modify variables (`gold -= 10; has_sword = true`) |
| **Player HUD** | Live display of all story variables with change animations |
| **JSON Data Model** | Stories are structured JSON — load from file or embedded data |
| **3 Themes** | Medieval, Sci-Fi, Modern — each with a curated color palette and display font |

### Story Editor
| Feature | Description |
|---------|-------------|
| **Scene Management** | Create, edit, delete scenes with a sidebar navigator |
| **Choice Builder** | Up to 3 choices per scene with text, target, condition, and modifier fields |
| **Variable Editor** | Define initial player state variables (numbers, booleans, strings) |
| **Export / Import** | Download stories as JSON files; import them back into the editor |
| **Save to Browser** | Persist story data in `localStorage` |
| **Story Validation** | Checks for empty scene text and broken choice target links |

### Player Enhancements
| Feature | Description |
|---------|-------------|
| **Save & Resume** | Save mid-story progress to `localStorage` and resume later |
| **Playthrough Tracking** | Automatically records completed playthroughs with paths taken |
| **Playthrough History** | View past runs with scene path, ending, final state, and timestamps |
| **Visual Effects** | 10 CSS effects: shake, flash, glitch, blur, zoom, vignette, rumble, etc. |
| **Background Images** | 6 generated scene backgrounds (tavern, castle, forest, dungeon, throne, neon grid) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  index.html                 │  ← Structure & DOM
├─────────┬───────────┬───────────┬───────────┤
│ styles  │ engine.js │ editor.js │  app.js   │
│  .css   │           │           │           │
│         │ StoryEng  │ StoryEdit │ Bootstrap │
│  Theme  │           │           │ Wiring    │
│  Layout │           │           │           │
└─────────┴───────────┴───────────┴───────────┘
     UI        Logic       Editor     Glue
   Layer       Layer       Layer      Layer
```

### Separation of Concerns

| Layer | File(s) | Responsibility |
|-------|---------|---------------|
| **Rendering** | `styles.css`, `index.html` | DOM structure, themes, animations, responsive layout |
| **Logic** | `engine.js` | Story loading, condition evaluation, modifier parsing, save/load, validation, playthrough tracking |
| **Editor** | `editor.js` | Scene CRUD, variable management, export/import, validation UI |
| **Bootstrap** | `app.js` | Wires engine + editor together, mode switching, embedded default story |

The `StoryEngine` class has **zero DOM coupling to the editor** — it can be instantiated independently and fed any valid story JSON. This makes the engine fully reusable.

---

## Data Model (JSON Schema)

```json
{
  "story_title": "The Crown of Ashenvale",
  "global_theme": "medieval",
  "player_state": {
    "gold": 15,
    "has_sword": false,
    "reputation": 0
  },
  "scenes": [
    {
      "id": "tavern_entrance",
      "text": "You push open the heavy oak door of the Gilded Flagon...",
      "background_image": "tavern",
      "visual_effect": "blur",
      "choices": [
        {
          "text": "Approach the blacksmith (10 gold)",
          "target_scene_id": "buy_sword",
          "condition": "gold >= 10",
          "modifier": "gold -= 10; has_sword = true"
        }
      ]
    }
  ]
}
```

### Condition Syntax
- Comparisons: `==`, `!=`, `>=`, `<=`, `>`, `<`
- Format: `variable operator value` (space-separated)
- Example: `gold >= 10`

### Modifier Syntax
- Assignment: `has_key = true`
- Increment / Decrement: `gold += 5`, `gold -= 10`
- Multiple statements: separate with `;`

> **No `eval()` is used.** Both conditions and modifiers are parsed using simple string splitting and if/else logic.

---

## How to Run

### Option 1: Direct File
Open `index.html` in any modern browser. The embedded default story will load automatically.

### Option 2: Local Server (recommended for `fetch` support)
```bash
# Python
python -m http.server 8000 --directory .

# Node.js
npx serve .

# Then open http://localhost:8000
```

---

## Design Decisions

1. **Zero Dependencies** — No npm, no bundler, no framework. The entire app is 6 files. This keeps it portable, fast to load, and easy to audit.

2. **Simple Expression Parsing** — Conditions and modifiers are parsed by splitting strings on spaces and operators (`+=`, `-=`, `=`), using basic if/else comparisons. No custom tokenizer or `eval()` is used.

3. **CSS-Only Visual Effects** — Scene transitions (shake, glitch, flash, etc.) are pure CSS animations applied via class toggling, keeping the JS logic clean.

4. **LocalStorage Persistence** — Story data, save progress, and playthrough history use `localStorage` for simplicity. No server or database required.

5. **Basic Validation** — The validator loops through all scenes checking for empty scene text and choices that point to non-existent scene IDs (broken links). Simple and effective.

---

## Included Story

The app ships with **"The Crown of Ashenvale"** — a medieval branching narrative with 8 scenes, 2 endings (Path of Glory / Path of Cunning), and 4 player variables (gold, has_sword, reputation, has_key). It demonstrates:
- Conditional choices based on variables
- Variable modifications across scenes
- Multiple scene backgrounds and visual effects
- Branching paths that converge and diverge

---

## Browser Compatibility

Tested on: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+. Requires a modern browser with ES6+ support (classes, template literals).
