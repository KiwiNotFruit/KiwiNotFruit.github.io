# Killing Floor 3 Data and Guides

A simple information and guide website for Killing Floor 3.

## Contents

This site contains data, guides, and information related to Killing Floor 3.

---
to do

add comment weapons.json for detail stats attributes

---

## Data pages (Weapons & Mods)

These pages store editable weapon and mod data used by the site.

Quick links (GitHub Pages)
- Weapons list: /explore/weapons.html
- Mods list: /explore/mods/

Where files live (main branch)
- explore/weapons.html  — Weapons listing page (HTML)
- explore/weapons.css   — Shared styles for weapons & mods pages
- explore/weapons.js    — Client-side script for weapons page (class/name filtering, pagination, popovers)
- explore/weapons.json  — Weapon data (edit to add/remove weapons)

- explore/mods/index.html — Mods listing page (HTML)
- explore/mods.js       — Client-side script for mods page (search, pagination)
- explore/mods.json     — Mods data (edit to add/remove mods and passive abilities)

- assets/images/weapons/ — place weapon images here (PNG/JPG). Refer to the filename in weapons.json.

Preview URL (GitHub Pages)
- https://kiwinotfruit.github.io/explore/weapons.html
- https://kiwinotfruit.github.io/explore/mods/

How to edit weapon data
- Edit explore/weapons.json. Each weapon is an object with fields:
  - id: unique id (string)
  - name: display name
  - image: filename (place file in assets/images/weapons/)
  - description: short paragraph
  - stats: object of key/value pairs (e.g., "Damage": "34")
  - mods: array of mod objects, each can include { name, short, description, stats, link }

Example weapon entry (JSON):

{
  "id": "w004",
  "name": "Example Rifle",
  "image": "example-rifle.png",
  "description": "A short description...",
  "stats": { "Damage": "40", "Fire Rate": "600 RPM" },
  "mods": [
    { "name": "Red Dot Sight", "short": "+acc", "description": "Improves accuracy.", "stats": { "Accuracy": "+8%" }, "link": "./mods/#red-dot-sight" }
  ]
}

How to edit mod data
- Edit explore/mods.json. Each mod includes:
  - id: used as the anchor (e.g., "red-dot-sight")
  - name
  - description
  - category: mod category shown on the weapons page; one of Ammunition, Arrow, Barrel, Blade, Coating, Grip, Guard, Internal, Magazine, Pommel, Quiver, Riser, Sight, Underbarrel (unknown or missing values fall back to "Uncategorized")
  - stats: object of key/value pairs
  - passives: optional array of passive abilities (each {name, description})

Weapon mod categories
- On the weapons page, a weapon's linked mods are hidden behind a "View/Select Mods" button and grouped by their mods.json category (rendered as "Category: Name").
- A category chip only appears for a weapon if at least one of its linked mods has that category, so adding/removing a category for a weapon is data-driven: set the mod's category in mods.json and link/unlink it in weapons.json.
- Category chips are ordered by the MOD_CATEGORY_ORDER list at the top of explore/weapons.js (unknown categories sort last). To override the order for a single weapon, add a "modCategories": ["Ammunition", ...] array to that weapon in weapons.json.
- Currently selected mods stay visible in a "Selected Mods" row next to the button, even while the mods panel is collapsed.

Example mod entry (JSON):

{
  "id":"red-dot-sight",
  "name":"Red Dot Sight",
  "description":"A compact optic...",
  "stats": { "Zoom": "1.1x" },
  "passives": [ { "name": "Quick Acquire", "description": "Reduces ADS time by 5%." } ]
}

Images
- Upload weapon images to assets/images/weapons/. Use the filename in the weapon's image field.
- Recommended starting size: 800×600 or 400×300. The layout crops/scales images; larger images scale down cleanly.

Search and navigation behavior
- Weapons page links filter by class; its search further filters the selected class by weapon name (case-insensitive).
- Mods page search looks in name, description and passive ability text.
- Mod links from weapon entries point to /explore/mods/#<id> and will scroll to the mod.
- Mods show passive abilities (text only) and do not require images.

Popovers and links
- Mods shown in weapons list have hover (desktop) and click (touch) popovers with short details. Links still open in a new tab.
