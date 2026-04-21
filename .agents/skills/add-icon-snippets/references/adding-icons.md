# Add Icon Snippets Reference

## Tool

This theme uses `@ckreidl/sis` to generate Liquid icon snippets from libraries such as Lucide and Heroicons.

Generate snippets into `src/snippets/` with the `icon-` prefix:

```bash
npx @ckreidl/sis add lucide menu chevron-down arrow-right -d src/snippets -p icon-
```

## Usage

Use generated snippets in Liquid like this:

```liquid
{% render 'icon-menu' %}
{% render 'icon-menu', size: 32 %}
{% render 'icon-menu', class: 'text-primary' %}
{% render 'icon-menu', stroke_width: 1.5 %}
```

## Commands

### Add

```bash
npx @ckreidl/sis add <library>:<variant> <icons...> -d src/snippets -p icon- [options]
```

### Search

```bash
npx @ckreidl/sis search <library> <icon>
```

### Tags

```bash
npx @ckreidl/sis tags <library>
```

### Variants

```bash
npx @ckreidl/sis variants <library>
```

## Quality bar

- Keep icon filenames stable and descriptive.
- Reuse existing icons when possible before adding new ones.
- Do not scatter repeated inline SVG markup across sections.
- Match the visual weight and style already used nearby in the theme.
