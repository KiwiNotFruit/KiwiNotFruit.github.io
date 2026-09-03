# Killing Floor 3 Data and Guides

A simple information and guide website for Killing Floor 3.

## Contents

This site contains data, guides, and information related to Killing Floor 3.

## To Do

Add search bar in data sections

---

## Data pages (Weapons & Mods)

These pages store editable weapon and mod data used by the site.

Quick links (GitHub Pages)
- Weapons list: /data/weapons.html
- Mods list: /data/mods.html

Where files live (main branch)
- data/weapons.html  — Weapons listing page (HTML)
- data/weapons.css   — Shared styles for weapons & mods pages
- data/weapons.js    — Client-side script for weapons page (search, pagination, popovers)
- data/weapons.json  — Weapon data (edit to add/remove weapons)

- data/mods.html     — Mods listing page (HTML)
- data/mods.js       — Client-side script for mods page (search, pagination)
- data/mods.json     — Mods data (edit to add/remove mods and passive abilities)

- assets/images/weapons/ — place weapon images here (PNG/JPG). Refer to the filename in weapons.json.

Preview URL (GitHub Pages)
- https://kiwinotfruit.github.io/data/weapons.html
- https://kiwinotfruit.github.io/data/mods.html

How to edit weapon data
- Edit data/weapons.json. Each weapon is an object with fields:
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
    { "name": "Red Dot Sight", "short": "+acc", "description": "Improves accuracy.", "stats": { "Accuracy": "+8%" }, "link": "/data/mods.html#red-dot-sight" }
  ]
}

How to edit mod data
- Edit data/mods.json. Each mod includes:
  - id: used as the anchor (e.g., "red-dot-sight")
  - name
  - description
  - stats: object of key/value pairs
  - passives: optional array of passive abilities (each {name, description})

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
- Weapons page search filters by weapon name only (case-insensitive).
- Mods page search looks in name, description and passive ability text.
- Mod links from weapon entries point to /data/mods.html#<id> and will scroll to the mod.
- Mods show passive abilities (text only) and do not require images.

Popovers and links
- Mods shown in weapons list have hover (desktop) and click (touch) popovers with short details. Links still open in a new tab.

Tips
- If you prefer class-based organization, you can either:
  - create separate JSON files per class and separate HTML pages (e.g., data/commando-weapons.json + data/commando.html), or
  - add a "class" field to each weapon in weapons.json and add a single dropdown filter on weapons.html.
- Keep keys consistent in stats objects to make the display predictable.
- Use the GitHub web UI to quickly edit JSON files and upload images.

Need changes?
- I can add a README section with a JSON schema, add a class filter, change search behavior, or adjust layout/image sizes. Tell me which and I will update the repo.
