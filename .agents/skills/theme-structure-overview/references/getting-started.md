# Getting Started

Use this reference when you need a quick orientation before editing the official Tiendu base theme.

## Start from `src/`

Work in these directories first:

- `src/layout/`
- `src/templates/`
- `src/sections/`
- `src/blocks/`
- `src/snippets/`
- `src/config/`
- `src/assets/`

Do not treat `dist/` as the source of truth.

## Quick task-to-surface mapping

Use this map to choose the right surface:

| Task                                                      | Preferred surface                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| Shared layout, assets, SEO defaults, header/footer groups | `src/layout/theme.liquid`                                           |
| Merchant-editable page composition                        | `src/templates/*.json`                                              |
| Code-only template logic or alternative template variants | `src/templates/*.liquid`                                            |
| Editable section markup and settings                      | `src/sections/*.liquid`                                             |
| Reusable blocks with their own schema                     | `src/blocks/*.liquid`                                               |
| Reusable partial markup                                   | `src/snippets/*.liquid`                                             |
| Theme-level settings                                      | `src/config/settings_schema.json` + `src/config/settings_data.json` |
| Shared styling                                            | `src/assets/theme.css`                                              |

## JSON vs Liquid templates

Use `src/templates/*.json` when the merchant should control page composition in the visual customizer.

Use `src/templates/*.liquid` when the template should be code-only.

Examples of supported Liquid variants:

- `product.foo.liquid`
- `collection.foo.liquid`
- `page.foo.liquid`
- `article.foo.liquid`

These render correctly, but they are not the visual-editor composition surface.

## Common editing tasks

### Add or change page composition

Edit the relevant JSON template in `src/templates/` when the result should stay merchant-editable.

Examples:

- `src/templates/index.json`
- `src/templates/product.json`
- `src/templates/collection.json`
- `src/templates/search.json`

JSON templates declare:

- which section instances exist
- each instance's settings
- the order they render in

### Add or change a section

Edit or create a section in `src/sections/*.liquid`.

Every editable section should expose its configuration through `{% schema %}`.

That schema drives the Tiendu theme customizer.

### Add or change a theme block

Use `src/blocks/*.liquid` when a block should own its own markup and schema.

Prefer block files when:

- the same block type should be reusable in more than one section
- a block is a nested container for child blocks
- inline section block schema would become large or repetitive

Key block authoring rules:

- declare the block schema in the block file
- reference the block from a section or parent block schema with `{ "type": "block-type" }`
- use schema `presets` when a block should be inserted with default child blocks or default settings
- render child blocks with `{% content_for 'blocks' %}`
- preserve `block.tiendu_attributes` on the outer block element when practical
- keep `{{ content_for_header }}` in `src/layout/theme.liquid` so the platform can inject design-mode editor runtime code

### Add or change global settings

Edit:

- `src/config/settings_schema.json` for setting definitions
- `src/layout/theme.liquid` for layout-level consumption

If the setting affects styling globally, map it to a CSS custom property in the layout and consume it from CSS or section markup.

### Add or change reusable markup

Use `src/snippets/*.liquid`.

### Add or change styling

Prefer plain CSS in:

- `src/assets/theme.css`

Use and extend the theme's CSS custom properties rather than introducing a new styling toolchain.

## Data access in Liquid

Prefer the documented object-based Liquid model.

Before assuming an object or property exists, read:

- `liquid-objects.md`
- `liquid-pagination.md`

## Theme editor compatibility

The Tiendu customizer is schema-driven and can hot-reload section HTML.

When editing sections:

- keep the HTML deterministic for a given settings payload
- keep section markup self-contained
- keep settings in schema, not hidden in code
- prefer CSS variables for live theme-setting updates
- remember that `src/templates/*.liquid` is renderable but not the visual customizer surface
