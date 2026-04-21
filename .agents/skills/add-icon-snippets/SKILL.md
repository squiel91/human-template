---
name: add-icon-snippets
description: Use this skill when adding or replacing icon snippets in the official Tiendu base theme. It covers the expected snippet location, naming convention, and generator workflow for theme icons.
---

# Add Icon Snippets

<when-to-use>
Use this skill when the task involves adding, replacing, or generating icon snippets.
</when-to-use>

<workflow>
1. Generate snippets into `src/snippets/`.
2. Keep the `icon-` prefix used by this theme.
3. Prefer generated reusable snippets over repeated inline SVG markup.
4. Render icons with explicit parameters where needed.
</workflow>

<quality-bar>
- Reuse existing icons before adding new ones.
- Keep icon naming stable and descriptive.
- Match nearby icon style and visual weight.
</quality-bar>

<references>
- `references/adding-icons.md`
</references>
