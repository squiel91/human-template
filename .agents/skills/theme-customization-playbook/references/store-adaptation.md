# Store Adaptation

Use this reference when tailoring the official Tiendu base theme to a particular store.

## Think in ownership first

Before editing, decide who should own the result after launch:

- Merchant-owned:
  settings, section settings, block settings, resource pickers, presets
- Designer-owned:
  brand system, spacing, typography, visual rhythm, asset polish
- Developer-owned:
  data flow, reusable sections/blocks/snippets, code-only templates, integrations

Choose the authoring surface that matches that ownership.

## Choose the right customization surface

| Store need                                                                         | Preferred implementation                                                                      |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Brand colors, typography, shared visual tokens                                     | theme settings + layout CSS variables + `src/assets/theme.css`                                |
| Homepage composition that the merchant should keep editing                         | `src/templates/index.json` + reusable sections + presets                                      |
| Curated list of products, collections, pages, or articles                          | schema setting pickers such as `product_list`, `collection_list`, `page_list`, `article_list` |
| Reusable card, badge, trust row, icon/text row, menu block                         | `src/blocks/*.liquid`                                                                         |
| Shared markup fragment used in multiple sections                                   | `src/snippets/*.liquid`                                                                       |
| Code-only landing or special template that does not need visual-editor composition | `src/templates/*.liquid`                                                                      |
| Shared header/footer experience                                                    | layout + section-group JSON + reusable sections                                               |

## Prefer configurable content over hardcoded content

Good candidates for settings:

- banner copy
- trust messaging
- service highlights
- contact information
- social links
- featured resources
- section titles, subtitles, and CTA labels

Hardcode only when the task explicitly wants fixed content or the content is truly structural rather than merchant-owned.

## Brand adaptation patterns

When adapting the theme to a store's brand:

- put store-wide colors and typography into theme settings
- map those settings to CSS variables in the layout
- consume those CSS variables in CSS and section markup
- prefer consistent spacing and type scales over section-by-section one-offs
- add assets to `src/assets/` and reference them through Liquid helpers

## Merchandising adaptation patterns

When adapting for merchandising and conversion:

- use presets so new sections start with useful default block composition
- use resource pickers instead of custom fetch patterns for curated content
- prefer reusable blocks for repeating content units like cards, badges, trust rows, or promo tiles
- keep homepage, product, collection, and article patterns coherent rather than inventing a new markup style in each section

## Content model adaptation patterns

When the store needs a different content shape:

- add section settings when a section needs a small number of editable knobs
- add block types when the merchant needs repeatable, reorderable content units
- add snippets when the same markup or helper is shared across different sections or templates
- add a code-only Liquid template only when JSON composition and schema-driven sections are not the right fit

## Avoid these adaptation anti-patterns

- hardcoding product or collection handles when a picker should be used instead
- putting store-specific promo content directly in the layout
- using code-only Liquid templates for pages that should remain visually editable
- duplicating the same complex markup in multiple sections instead of extracting a block or snippet
- adding legacy data-fetch tags where object-based Liquid already provides the needed data

## Final adaptation checklist

- Is the change owned by the right surface?
- Is merchant-editable content configurable rather than hardcoded?
- Does the homepage or landing composition still make sense in the visual editor?
- Are mobile layout, empty states, and long-content cases still acceptable?
- Are repeated patterns reusable instead of duplicated?
- Does the result still match the store's brand system?
