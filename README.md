# Case Board

A detective-style corkboard for linking notes, images and clues with red string.
Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Features

- **Cards:** notes, photos, sticky notes, news clippings, receipts, sketch pads, mugshots and evidence bags
- **Strings:** link any two cards, label them, recolor them, make them dashed for theories
- **Card extras:** dates, places, people and custom details; stamps (presets or your own text); paper colors; resize; fold; redact
- **Photo filters:** color, black and white, sepia, blur
- **Board tools:** box select, select all, duplicate, link selected, undo, search, trace connections
- **Arrange:** timeline (by date), untangle (force layout), scatter
- **Zoom:** 25% to 200% with buttons, Ctrl/Cmd + scroll, pinch, or the keyboard, plus a Fit button
- **Extras:** minimap, case name plate, board themes, flashlight mode, lock ("case closed"), plain-text report, optional sound
- **Saving:** automatic, in the browser (`localStorage`), plus copy/paste backup and restore

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | New note |
| `Ctrl/Cmd + A` | Select all cards |
| `Ctrl/Cmd + D` | Duplicate selected cards |
| `Ctrl/Cmd + Z` | Undo |
| `Delete` / `Backspace` | Delete selected cards |
| `Shift + click` | Add or remove a card from the selection |
| `+` / `-` / `0` | Zoom in, zoom out, reset to 100% |
| `Ctrl/Cmd + scroll` | Zoom toward the pointer (pinch works on touch screens) |
| `Esc` | Clear selection, close menus and panels |

## Deploy to GitHub Pages

1. Push this repo to GitHub on the `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` publishes the site on every push.

## Project structure

```
case-board/
├── index.html          page structure: header, menus, dialogs, board
├── css/styles.css      all styling, including one block per card type
├── js/app.js           all behavior
├── .github/workflows/  GitHub Pages deploy
├── LICENSE
└── README.md
```

## Data format

The whole board is one JSON object stored under the `caseboard` key in `localStorage`.
The Backup menu shows the same JSON.

```jsonc
{
  "title": "Case name",
  "theme": 0,              // index into TH: cork, chalk, blue, noir
  "locked": false,
  "cards": [{
    "id": "abc123", "type": "note", "x": 100, "y": 200, "rot": -2,
    "title": "", "text": "", "img": "data:image/jpeg;base64,...",
    "f": [{ "k": "Date", "v": "2026-10-14", "t": "date" }],  // extra details
    "w": 240, "h": 200,      // optional custom size
    "col": 0, "st": 0, "stx": "ALIBI", "rd": false, "fold": false, "flt": 0
  }],
  "links": [{ "id": "xyz789", "a": "abc123", "b": "def456", "label": "", "col": "#b3261e", "dash": false }]
}
```

## Adding a new card type

1. In `css/styles.css`, add a `.card.yourtype { ... }` block.
2. In `js/app.js`, add the type to the `IMG` array if it uses an uploaded image (it then also gets the `photo` class), and add a placeholder in the `t.placeholder` map inside `mk()`.
3. In `index.html`, add `<button class="nt" data-t="yourtype">Your type</button>` to the Card types menu.

## Known limits

- Storage is per browser. Use Backup to move a board between devices.
- Many large images can fill `localStorage` (about 5 MB). Images are shrunk to 700 px on import.
- The board is a fixed 3200 × 2200 canvas (zoom changes the view, not the canvas).

## Ideas

- Arrowheads on strings
- Checklist, message-bubble and map cards
- Multiple boards
- Export the board as an image

## License

MIT
