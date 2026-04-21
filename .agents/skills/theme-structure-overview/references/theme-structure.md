# Theme Structure Reference

Use this reference for file ownership, template/section structure, and route conventions.

For Liquid variable shapes and pagination behavior, read:

- `liquid-objects.md`
- `liquid-pagination.md`

## Authoritative structure

This theme is authored directly in `src/`.

```text
theme-root/
├── AGENTS.md
├── README.md
├── .agents/
├── src/
│   ├── layout/
│   │   └── theme.liquid
│   ├── layout.liquid
│   ├── templates/
│   │   ├── index.json
│   │   ├── product.json
│   │   ├── collection.json
│   │   ├── list-collections.json
│   │   ├── page.json
│   │   ├── blog.json
│   │   ├── article.json
│   │   ├── search.json
│   │   ├── 404.json
│   │   └── *.liquid
│   ├── sections/
│   │   ├── *.liquid
│   │   ├── header-group.json
│   │   └── footer-group.json
│   ├── blocks/
│   │   └── *.liquid
│   ├── snippets/
│   │   └── *.liquid
│   ├── config/
│   │   ├── settings_schema.json
│   │   └── settings_data.json
│   ├── assets/
│   │   ├── theme.css
│   │   ├── theme.js
│   │   └── *
└── tiendu.config.json
```

## Layout entrypoints

`src/layout/theme.liquid` is the preferred global storefront shell.

It owns:

- document structure
- meta tags and SEO defaults
- global CSS variables from theme settings
- shared asset includes
- header and footer section-group rendering
- theme editor preview hooks

`src/layout.liquid` is supported as a legacy-compatible fallback when a theme already uses that older entrypoint.

## Template modes

### `src/templates/*.json`

JSON templates declare page composition for the visual theme editor.

They own:

- section instances
- per-instance settings
- render order

Use JSON templates when the merchant should be able to change composition through the visual customizer.

### `src/templates/*.liquid`

Liquid templates are supported for storefront rendering, including alternative variants such as:

- `product.foo.liquid`
- `collection.foo.liquid`
- `page.foo.liquid`
- `article.foo.liquid`

Use Liquid templates when the template should be code-only rather than visual-editor composition.

## Section groups

Header and footer are not declared inside page template JSON files.

They are owned by:

- `src/sections/header-group.json`
- `src/sections/footer-group.json`

and rendered through the layout.

## Sections

Sections are the main editable building blocks of the storefront.

Each section should:

- render its own markup
- declare editable settings in `{% schema %}`
- declare allowed block types when the merchant should compose repeated content
- declare `presets` when the section should start with a default block tree

## Theme blocks

Theme blocks are reusable block types rendered from section or parent block schemas.

Each block should:

- render its own markup
- declare editable settings in `{% schema %}`
- declare nested child block types when it is a container
- declare `presets` when it should start with default child blocks or settings when inserted
- render children with `{% content_for 'blocks' %}` when it accepts nested blocks

## Snippets

Snippets hold reusable markup or helpers.

Use snippets for:

- repeated partials
- icons
- extracted markup fragments
- helpers shared across sections or templates

## Settings and assets

- `src/config/settings_schema.json` defines editable theme settings
- `src/config/settings_data.json` stores current values and group section instances
- `src/assets/*` stores CSS, JS, and other static assets

Use `asset_url` in Liquid when referencing theme assets.

## Routes and language conventions

The storefront follows Spanish routes:

- `/productos`
- `/categorias`
- `/paginas`
- `/blog`
- `/busqueda`

## Practical ownership rules

- Layout-wide globals, assets, and CSS variables belong in `src/layout/theme.liquid` when possible.
- `src/layout.liquid` is a supported fallback for legacy-compatible themes.
- Page composition belongs in `src/templates/*.json` when it should stay editable in the visual customizer.
- Code-only template rendering belongs in `src/templates/*.liquid`, including alternative template variants.
- Editable markup belongs in `src/sections/*.liquid` and should use `{% schema %}`.
- Reusable block markup belongs in `src/blocks/*.liquid` and should use `{% schema %}`.
- Reusable markup belongs in `src/snippets/*.liquid`.
- Theme-level settings belong in `src/config/settings_schema.json` and `src/config/settings_data.json`.
- Do not edit `dist/`; author in `src/`.
