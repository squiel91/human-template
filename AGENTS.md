# Official Tiendu Base Theme

This repository is the official Tiendu base theme.

The folder name is not important. A merchant or developer can download it, rename the directory, and adapt it to a specific store. The important part is the authoring model and file structure.

The theme is authored directly in `src/` and supports:

- Liquid layouts, templates, sections, blocks, and snippets
- JSON page templates and section-group files for the visual customizer
- theme settings in JSON
- plain CSS and static assets
- preview, sync, and deployment through the Tiendu CLI

Do not assume a TypeScript, Tailwind, React, or build-first authoring workflow for normal theme work.

## Load These Skills

Start with the skill that matches the task:

- `.agents/skills/theme-structure-overview/SKILL.md`
  Use this first for most theme work. It explains the file map, JSON-vs-Liquid template ownership, layout compatibility, Liquid objects, pagination, and the basic editing model.
- `.agents/skills/theme-customization-playbook/SKILL.md`
  Use this when adapting the base theme to a particular store, brand, catalog, content strategy, merchandising plan, or merchant workflow.
- `.agents/skills/add-icon-snippets/SKILL.md`
  Use this when adding or replacing icon snippets.
- `.agents/skills/theme-previewing-and-deployment/SKILL.md`
  Use this for Tiendu CLI setup, preview creation or attachment, pull, push, and publish.

## Core Authoring Rules

- Edit `src/`, not `dist/`.
- Treat `dist/` as a generated upload artifact.
- Prefer the smallest correct Liquid / JSON / CSS change.
- Prefer merchant-configurable settings and schema over hardcoded store content when the merchant should be able to change it later.
- Prefer JSON templates when the merchant should edit page composition in the visual customizer.
- Treat Liquid templates as code-only template entrypoints.
- Keep sections schema-driven so the visual customizer can list, add, remove, reorder, and edit them.
- Prefer object-based Liquid surfaces over legacy custom data-fetch tags.
- Preserve Spanish storefront routes and content structure unless the user explicitly asks to change them.
- Keep changes responsive, accessible, and compatible with section reloads in the theme editor.

## Authoring Surface Map

Authoritative theme files live under `src/`:

- `src/layout/theme.liquid`
  Preferred root storefront layout. Owns shared assets, layout-level variables, and header/footer section groups.
- `src/layout.liquid`
  Legacy-compatible fallback layout. Only use it directly when the theme already depends on it.
- `src/templates/*.json`
  Visual-customizer page composition. Owns section instances and their order.
- `src/templates/*.liquid`
  Renderable code-only templates, including alternative templates like `product.foo.liquid`, `collection.foo.liquid`, `page.foo.liquid`, and `article.foo.liquid`.
- `src/sections/*.liquid`
  Editable sections with `{% schema %}`.
- `src/sections/header-group.json`
  Header section group composition.
- `src/sections/footer-group.json`
  Footer section group composition.
- `src/blocks/*.liquid`
  Reusable theme blocks with their own schema and optional nested blocks.
- `src/snippets/*.liquid`
  Reusable partials.
- `src/config/settings_schema.json`
  Theme-level setting definitions.
- `src/config/settings_data.json`
  Current theme-level values and group section state.
- `src/assets/*`
  CSS, JS, and other static assets.

## How To Choose The Right Surface

Use these rules when deciding where to implement a change:

- Store-wide brand styling, typography, logo, or shared layout values:
  `settings_schema.json` + `layout/theme.liquid` + CSS variables in `src/assets/theme.css`
- Merchant-editable homepage or page composition:
  `src/templates/*.json` + sections + presets
- Reusable content module that should appear in multiple sections:
  `src/blocks/*.liquid`
- Reusable markup fragment or helper partial:
  `src/snippets/*.liquid`
- Code-only landing or structural template logic that does not need visual-editor composition:
  `src/templates/*.liquid`
- Shared shell, global assets, meta tags, header/footer groups:
  `src/layout/theme.liquid`

## Theme Model

This base theme is section-based.

The visual customizer works from:

- `src/templates/*.json` for page-level composition
- `src/sections/header-group.json`
- `src/sections/footer-group.json`
- section and block schemas in Liquid files

Liquid templates are supported for storefront rendering, including alternative template variants, but they are code-only and should not be treated as visual-editor composition files.

For new merchant-editable page composition, prefer JSON templates.

## Theme Editor Compatibility

The Tiendu visual customizer depends on schema metadata and server-rendered section HTML.

To keep theme code compatible:

- Every editable section should declare a `{% schema %}` block.
- Keep section and block settings in schema, not hidden in code.
- Prefer schema `presets` when a section or block should start with a default child-block composition.
- Keep section HTML deterministic for a given settings payload.
- Keep section markup self-contained so live section replacement works predictably.
- Preserve `block.tiendu_attributes` on the outer block element when practical.
- Keep `{{ content_for_header }}` in `src/layout/theme.liquid` so the platform can inject editor runtime code.
- Prefer CSS variables for theme-level colors and typography when live updates should happen without a full page reload.

## Store Adaptation Guidance

This base theme should help a developer, designer, or merchant tailor the storefront to a specific store.

Good adaptation patterns:

- Turn brand decisions into settings and CSS variables where possible.
- Turn repeated merchandising patterns into blocks or reusable sections.
- Turn curated content into merchant-selectable resource settings such as `product`, `product_list`, `collection`, `collection_list`, `page`, and `article_list`.
- Use presets to give merchants a strong default composition instead of starting from an empty section.
- Keep store-specific copy, trust content, banners, and help text configurable unless the user explicitly wants them hardcoded.
- Prefer reusable patterns over one-off code when the same presentation will appear in more than one place.

Load `.agents/skills/theme-customization-playbook/SKILL.md` when the task is primarily about adapting the theme to a particular store.

## Data, Routes, And Liquid Contracts

The authoritative references for Liquid objects, pagination, and route conventions live in:

- `.agents/skills/theme-structure-overview/references/liquid-objects.md`
- `.agents/skills/theme-structure-overview/references/liquid-pagination.md`
- `.agents/skills/theme-structure-overview/references/theme-structure.md`

Important route conventions:

- `/productos`
- `/categorias`
- `/paginas`
- `/blog`
- `/busqueda`

When generating links manually, preserve those route conventions unless the task explicitly changes storefront routing.

## Previewing And Deployment

When the task involves preview creation, syncing, or deployment through the CLI, use:

- `.agents/skills/theme-previewing-and-deployment/SKILL.md`

If you need a copy-only pipeline configuration, start from `tiendu.config.example.json`.

## Safe Editing Checklist

- Edit `src/`, not `dist/`.
- Choose the right surface before coding.
- Prefer JSON templates for visual-editor composition.
- Prefer configurable settings over hardcoded merchant content.
- Keep sections and blocks schema-driven.
- Preserve Spanish route conventions unless explicitly changing them.
- Keep changes responsive, accessible, and compatible with theme-editor preview updates.
