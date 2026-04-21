# Editor-Compatible Patterns

Use this reference when the result should remain compatible with the Tiendu visual customizer.

## Keep configuration in schema

If the merchant should edit it in the customizer, represent it through:

- section settings
- block settings
- section block definitions
- block file schema
- presets
- template JSON or section-group JSON

Do not hide merchant-facing configuration in hardcoded Liquid branches when it should be editable.

## Keep composition in JSON when it should remain visual

Use `src/templates/*.json` for visual-editor composition.

Use `src/templates/*.liquid` only when the template should be code-only.

## Prefer presets over empty experiences

Presets help merchants start from something useful.

Good uses of presets:

- a section that should start with a heading, text, and button block
- a reusable container block that should start with one or two sensible child blocks
- a merchandising section that should start with title + product-card blocks

## Keep HTML deterministic

The editor preview swaps server-rendered section HTML.

That works best when:

- the same settings produce the same DOM structure
- section roots stay self-contained
- interactive hooks survive re-rendering
- visual state is not coupled to client-only hidden state

## Preserve section and block markers

When practical:

- keep section roots compatible with `data-section-id`
- preserve `block.tiendu_attributes` on the block root

These markers help the editor resolve hover, selection, and live updates.

## Prefer CSS variables for live theme settings

For store-wide colors and typography:

- define the setting in `settings_schema.json`
- expose it through layout-level CSS variables
- consume the variable from CSS or section markup

This is the most editor-friendly pattern for global styling changes.

## Use resource pickers for curated content

When merchants should choose exact resources, prefer schema types such as:

- `product`
- `product_list`
- `collection`
- `collection_list`
- `page`
- `page_list`
- `article`
- `article_list`

This is usually better than writing new custom fetch logic for curated modules.
