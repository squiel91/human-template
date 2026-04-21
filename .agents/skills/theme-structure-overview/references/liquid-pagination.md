# Liquid Pagination Reference

Use this reference when you need to render paginated lists or pagination UI.

## Practical rules first

- Prefer `{% paginate %}` for collection, search, related-product, and blog lists.
- The `paginate` object only exists inside `{% paginate %}...{% endpaginate %}`.
- The query parameter is always `page`.
- Generated page URLs preserve the current query string and hash.

## Supported paginate surfaces

### Built-in eager paginate paths

These paths have special handler support and inject the paginated items directly into context:

- `collection.products`
- `product.related_products`
- `search.results`

Pragmatic notes:

- Use these on their matching route objects.
- Inside the paginate block, both the item list and the matching `_count` field are available.

### Generic fallback paginate paths

The handler also supports array-like values outside the three built-in paths.

Common theme-relevant examples:

- `blog.articles`
- `featured_collection.products` where `featured_collection` came from a single `collection` section setting

Fallback behavior:

- the handler resolves the target array from the path you passed to `{% paginate %}`
- it tries to read a sibling count field by replacing the last segment with `*_count`
- if no count field exists, it falls back to `array.length`

Use this when the object is already known to expose the array you need.

## `paginate` object shape

```ts
{
  current_offset: number
  current_page: number
  items: number
  page_param: 'page'
  page_size: number
  pages: number
  previous: {
    title: string
    page: number
    is_link: true
    url: string
  } | null
  next: {
    title: string
    page: number
    is_link: true
    url: string
  } | null
  parts: Array<{
    title: string
    page: number
    is_link: boolean
    url: string
  }>
}
```

## `paginate.parts` item shape

```ts
{
  title: string;
  page: number;
  is_link: boolean;
  url: string;
}
```

Use `parts` when you want custom pagination markup. Use `{{ paginate | default_pagination }}` only when the default HTML is good enough.

## Recommended patterns

### Collection page products

```liquid
{% paginate collection.products by section.settings.products_per_page %}
  {% for product in collection.products %}
    {% render 'product-card', product: product %}
  {% endfor %}

  {{ paginate | default_pagination }}
{% endpaginate %}
```

### Product page related products

```liquid
{% paginate product.related_products by section.settings.limit %}
  {% if product.related_products_count > 0 %}
    {% render 'product-listing-grid', products: product.related_products %}
  {% endif %}
{% endpaginate %}
```

### Search results

```liquid
{% paginate search.results by section.settings.results_per_page %}
  {% if search.results_count > 0 %}
    {% for product in search.results %}
      {% render 'product-card', product: product %}
    {% endfor %}
  {% endif %}
{% endpaginate %}
```

### Blog articles

```liquid
{% paginate blog.articles by 12 %}
  {% for post in blog.articles %}
    <a href="{{ post.url }}">{{ post.title }}</a>
  {% endfor %}
{% endpaginate %}
```

### Single collection setting

```liquid
{% assign featured_collection = section.settings.collection %}

{% paginate featured_collection.products by section.settings.limit %}
  {% for product in featured_collection.products %}
    {% render 'product-card', product: product %}
  {% endfor %}
{% endpaginate %}
```

This works because a single `collection` setting resolves to a special collection drop that understands paginate requests.

## Caveats that matter in theme code

- On collection pages, `collection.products` should be treated as paginate-driven. Do not assume it exists before the paginate block.
- `product.related_products` is lazy on the product object, but paginate replaces it with the current page of items inside the block.
- `search.results_count` can be larger than a non-paginated lazy `search.results.length`, because non-paginated lazy loading is capped.
- `blog.articles` uses the generic fallback path, not a specialized eager loader.
- The default previous/next labels are currently inconsistent:
  - built-in paginate paths use `Previous` and `Next`
  - generic fallback paginate paths use `Anterior` and `Siguiente`

If you need consistent storefront copy, render your own pagination markup from `paginate.parts`, `paginate.previous`, and `paginate.next`.
