# Tiendu Default Theme 2.0

The official starter theme for [Tiendu](https://tiendu.uy) storefronts.

This repository should be treated as a Liquid theme authored directly in `src/`.

For agent and theme work, the supported surface is:

- Liquid layouts, sections, snippets, and templates
- JSON template and settings files
- plain CSS
- static assets

Do not assume this theme should be extended as a build-first TypeScript or Tailwind theme.

## Start Here

- `AGENTS.md` — theme-specific agent instructions
- `.agents/skills/` — packaged repository skills for theme authoring, structure lookup, CLI deploy work, and icon snippet generation

## Working Area

Authoritative theme files live in `src/`.

Do not edit generated theme output manually. The CLI may generate `dist/` as an upload artifact, but `src/` remains the authoring surface.

## Important Theme Direction

This theme uses the current Tiendu object-based Liquid API.

Prefer surfaces like:

- `collection.products`
- `product.related_products`
- `search.results`
- `blog.articles`

and use `{% paginate %}` where pagination is needed.

Avoid legacy custom data tags such as `{% products %}`, `{% categories %}`, `{% pages %}`, and `{% blog_posts %}`.

## License

Custom Tiendu theme license. See `LICENSE`.
