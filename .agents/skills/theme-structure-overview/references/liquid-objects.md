# Liquid Objects Reference

Use this reference when you need the exact Liquid-facing contract exposed to theme files.

This document is derived from:

- `platform/src/lib/server/liquid-storefront-handler/`
- the backing TypeScript interfaces for products, collections, pages, articles, stores, images, attributes, variants, and content blocks

## Read this document like this

- `Always`: injected on every page render.
- `Page-only`: only present on some routes.
- `Section-only`: only present while rendering a section.
- `Synthetic`: computed by the storefront handler, not a stored backend entity.
- `Lazy`: fetched on first access by a Liquid drop.
- `Paginate-only`: injected by `{% paginate %}` and not guaranteed outside that block.

If a property is not documented here and is not already used in the theme, do not assume it exists.

## Always-available globals

### `store` and `shop`

Availability: `Always`

`shop` is an alias of `store`.

```ts
{
  id: number;
  name: string;
  description: string | null;
  hostname: string;
  url: string;
  country_code: string;
  currency: {
    code: string;
    name: string;
    symbol: string;
  }
  whatsapp_number: string | null;
  email_address: string | null;
}
```

Pragmatic notes:

- This is a reduced storefront-safe projection, not the full store backend object.
- Prefer `store` unless the theme already uses `shop`.

### `request`

Availability: `Always`

```ts
{
  host: string
  path: string
  url: string
  page_type:
    | 'index'
    | 'product'
    | 'list-collections'
    | 'collection'
    | 'search'
    | 'page'
    | 'blog'
    | 'article'
    | '404'
}
```

Pragmatic notes:

- This is not the raw web `Request` object.
- No headers, cookies, method, or query map are exposed here.

### `settings`

Availability: `Always`

Shape: `Record<string, unknown>` keyed by `src/config/settings_schema.json` ids.

Pragmatic notes:

- Values come from `src/config/settings_data.json`.
- Theme-level `url` settings are resolved to storefront URLs before Liquid sees them.
- Theme-level `font_picker` settings are resolved to font objects.

Font picker value shape:

```ts
{
  family: string
  fallback_families: string
  style: 'normal' | 'italic'
  weight: string
  url: string | null
  format: string | null
  picker_value: string
  'system?': boolean
  variants: Array<{
    family: string
    fallback_families: string
    style: 'normal' | 'italic'
    weight: string
    url: string | null
    format: string | null
    picker_value: string
    'system?': boolean
  }>
}
```

### Other globals

Availability: `Always`

```ts
page_title: string;
page_description: string;
canonical_url: string;
tiendu_base_url: string;
tracking_enabled: boolean;
meta_tracking_script: string;
meta_tracking_noscript: string;
google_tracking_script: string;
```

Layout-only globals:

```ts
content_for_layout: string;
content_for_header: string;
```

`content_for_header` should remain in `src/layout/theme.liquid` so the platform can inject editor-only runtime code in design mode.

Editor / preview helpers:

```ts
design_mode: boolean;
preview_mode: boolean;
```

Section and block rendering helper:

```ts
content_for_blocks?: string
```

Use it through:

```liquid
{% content_for 'blocks' %}
```

The platform also supports explicitly rendering a single block instance with:

```liquid
{% content_for 'block', id: 'block-id', type: 'block-type' %}
```

Use that only when a block truly needs fixed placement. Prefer normal preset-created blocks rendered through `{% content_for 'blocks' %}` when merchants should be able to add, remove, reorder, and edit them freely.

## Section context

### `section`

Availability: `Section-only`

```ts
{
  id: string
  type: string
  settings: Record<string, unknown>
  blocks: Array<{
    id: string
    type: string
    settings: Record<string, unknown>
    editor_attributes: string
    tiendu_attributes: string
    shopify_attributes: string
    block_order: string[]
    blocks: Array<{
      id: string
      type: string
      settings: Record<string, unknown>
      editor_attributes: string
      tiendu_attributes: string
      shopify_attributes: string
      block_order: string[]
      blocks: unknown[]
    }>
  }>
  block_order: string[]
}
```

Pragmatic notes:

- Section settings are merged with schema defaults before rendering.
- Block settings are also merged with schema defaults.
- Blocks render in section context, so they can read `section.settings.*`.
- `block.editor_attributes` is for the theme editor wrapper. Preserve it when a block root element already uses it.
- Prefer `block.tiendu_attributes` on the outer block element in Tiendu themes.
- `block.shopify_attributes` is kept as a compatibility alias for Shopify-style block files.
- Editor hover and selection resolve blocks from `data-tiendu-block-id` and sections from `data-section-id`.
- Nested block instances are available recursively on `block.blocks`.
- Render child blocks with `{% content_for 'blocks' %}` inside a section or block file.

### Section setting resolution rules

These rules matter because setting-selected objects do not always behave like route objects.

- `collection`:
  resolves to a special collection drop with lazy `products` and `products_count`
- `collection_list`:
  resolves to an ordered array of collection objects, but those items do not get the special lazy `products` drop behavior
- `product` and `product_list`:
  resolve to product objects, but they do not get the product page `related_products` drop behavior
- `page` and `page_list`:
  resolve handles to page objects or ordered page arrays
- `article` and `article_list`:
  resolve handles to article objects or ordered article arrays
- `url`:
  resolves to a storefront-safe URL string before render

Pragmatic consequence:

- a block rendered inside a section can safely read resolved values like `section.settings.collection.name`, `section.settings.collection.url`, or `section.settings.product.title`

## Route-level variables

### `index` route

Availability: `Page-only` on `request.page_type == 'index'`

```ts
current_page: number;
products_page_size: number;
search: {
  terms: string;
  criteria: string | null;
  order: string | null;
  current_page: number;
}
```

Pragmatic notes:

- On the home page, `search` is only a lightweight form context.
- Do not assume `search.results` or `search.results_count` outside the real search route.

### `product`

Availability: `Page-only` on `request.page_type == 'product'`

Backed by: `Product` plus a `ProductDrop`

```ts
{
  id: number
  title: string
  handle: string
  coverImage: Image | null
  images: Image[] | null
  basePriceInCents: number | null
  baseCompareAtPriceInCents: number | null
  baseWeightInGrams: number | null
  description: string | null
  seo: {
    title: string | null
    description: string | null
  }
  specifications: Array<{
    name: string
    value: string
  }> | null
  metadata: unknown
  sku: string | null
  videoUrl: string | null
  isPhysical: boolean
  isListed: boolean
  averageRating: number | null
  reviewsQuantity: number
  reviews: ProductReview[]
  attributes: Attribute[]
  variants: ProductVariant[]
  url: string
  publicUrl: string
  unitsSold: number
  tienduCategoryId: number | null
  templateSuffix: string | null
  updatedAt: string
  createdAt: string

  related_products?: Product[]
  related_products_count?: number
}
```

Pragmatic notes:

- `related_products` is `Lazy` on the real product page object.
- `related_products_count` is `Lazy` on the real product page object.
- A setting-selected product does not get those lazy related-product fields.
- The route also injects `template_suffix` as a top-level helper variable.

### `product_page`

Availability: `Page-only` on `request.page_type == 'product'`

Backed by: synthetic helper object from `product-page.ts`

```ts
{
  gallery_images: Array<{
    id: number | null;
    url: string;
    alt: string;
  }>;
  price: {
    price_in_cents: number | null;
    compare_at_price_in_cents: number | null;
    price_is_from: boolean;
    compare_is_from: boolean;
  }
  stock_note: {
    tone: "success" | "warning" | "error" | "neutral";
    message: string;
  }
  requires_variant_selection: boolean;
  default_attribute_values: Array<{
    attribute_id: number;
    value_id: number;
  }>;
  quantity_hidden: boolean;
  quantity_disabled: boolean;
  quantity_max: number | null;
  add_to_cart: {
    label: string;
    icon: string;
    disabled: boolean;
  }
  reviews: Array<
    ProductReview & {
      relativeTime: string;
    }
  >;
}
```

Use this helper when the theme needs display-ready price, gallery, stock, add-to-cart, or review UI state.

### `collection` and `category`

Availability: `Page-only` on `request.page_type == 'collection'`

`category` is an alias of `collection`.

Backed by: `Collection` plus route-only sort helpers

```ts
{
  id: number
  name: string
  handle: string
  description: string | null
  productCount: number
  coverImage: Image | null
  children: Collection[]
  url: string
  publicUrl: string
  defaultSortBy: CategorySortBy
  parentId: number | null
  templateSuffix: string | null
  seo: {
    title: string | null
    description: string | null
  }
  isListed: boolean
  isPublic: boolean
  updatedAt: string
  createdAt: string

  sort_by: CategorySortBy | null
  default_sort_by: CategorySortBy
  sort_options: Array<{
    name: string
    value: CategorySortBy
  }>

  products?: Product[]
  products_count?: number
}
```

Pragmatic notes:

- On a collection page, `products` and `products_count` are `Paginate-only` for `{% paginate collection.products by ... %}`.
- The underlying collection object still uses `productCount` in camelCase.
- A single `collection` section setting resolves to a different special drop that supports lazy `products` and `products_count`.
- `sort_options` values are one of:
  - `best-selling`
  - `title-ascending`
  - `title-descending`
  - `price-ascending`
  - `price-descending`
  - `created-descending`
  - `created-ascending`
  - `manual`
- The virtual all-products collection is synthetic and uses `id: 0`.

### `collections`

Availability: `Page-only` on `request.page_type == 'list-collections'`

```ts
Collection[]
```

Pragmatic notes:

- These are normal collection objects from the public collections tree.
- Do not assume each item has lazy `products` support.

### `search`

Availability: `Page-only` on `request.page_type == 'search'`

Backed by: synthetic `SearchDrop`

```ts
{
  terms: string
  criteria: string | null
  order: string | null
  current_page: number
  performed: boolean

  results?: Array<Product & {
    object_type: 'product'
  }>
  results_count?: number
}
```

Pragmatic notes:

- `results` is `Lazy` on the real search route object.
- `results_count` is `Lazy` on the real search route object.
- Current search is product-only.
- `criteria` and `order` are present, but current result loading only filters by `terms`.
- The route also injects top-level helpers: `current_page`, `products_page_size`, `criteria`, `order`, and `search_query`.

### `page`

Availability: `Page-only` on `request.page_type == 'page'`

Backed by: `Page`

```ts
{
  id: number
  title: string | null
  handle: string
  coverImage: Image | null
  content: ContentBlock[]
  url: string
  publicUrl: string
  seo: {
    title: string | null
    description: string | null
  }
  isListed: boolean
  isPublic: boolean
  templateSuffix: string | null
  updatedAt: string
  createdAt: string
}
```

The route also injects `template_suffix` as a top-level helper variable.

### `blog`

Availability: `Page-only` on `request.page_type == 'blog'`

Backed by: synthetic `BlogDrop`

```ts
{
  title: string
  articles?: Article[]
  articles_count?: number
}
```

Pragmatic notes:

- `articles` is `Lazy`.
- `articles_count` is `Lazy`.
- This is not a stored blog entity with id, handle, or URL fields.

### `article` and `blogPost`

Availability: `Page-only` on `request.page_type == 'article'`

`article` and `blogPost` are aliases of the same object.

Backed by: `Article`

```ts
{
  id: number
  title: string
  handle: string
  excerpt: string | null
  coverImage: Image | null
  manager: {
    name: string
  }
  content: ContentBlock[]
  url: string
  publicUrl: string
  isListed: boolean
  templateSuffix: string | null
  seo: {
    title: string | null
    description: string | null
  }
  createdAt: string
  updatedAt: string
}
```

The route also injects `template_suffix` as a top-level helper variable.

### Other route helpers

These are injected as top-level helper variables when relevant:

```ts
current_page?: number
products_page_size?: number
criteria?: string | null
order?: string | null
search_query?: string | null
template_suffix?: string | null
```

## Shared nested shapes

### `Image`

```ts
{
  id: number
  url: string
  alt: string
  hasTransparency: boolean
  height: number
  width: number
  storeId?: number | null
  userId?: number
  updatedAt?: string
  createdAt?: string
}
```

### `AttributeValue`

```ts
{
  id: number;
  attributeId: number;
  value: string;
  position: number;
  image: Image | null;
  color: string | null;
  note: string | null;
  updatedAt: string;
  createdAt: string;
}
```

### `Attribute`

```ts
{
  id: number
  storeId: number
  name: string
  displayType: 'radio' | 'dropdown'
  values: AttributeValue[]
  metaBusinessFieldMapping: string | null
  updatedAt: string
  createdAt: string
}
```

### `ProductVariant`

```ts
{
  id: number
  productId: number
  priceInCents: number | null
  weightInGrams: number | null
  compareAtPriceInCents: number | null
  stock: number | null
  sku: string | null
  coverImage: Image | null
  attributes: Attribute[]
  isListed: boolean
  updatedAt: string
  createdAt: string
}
```

### `ProductReview`

```ts
{
  id: number
  productId: number
  authorName: string
  rating: number
  isVerifiedPurchase: boolean
  content: string
  images: Image[]
  customerId: number | null
  isListed: boolean
  updatedAt: string
  createdAt: string
}
```

### `ContentBlock`

```ts
type ContentBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      type: "image";
      image: Image;
      size: "small" | "medium" | "large" | "full";
      align: "left" | "center" | "right";
    }
  | {
      type: "html";
      code: string;
    };
```

## High-value caveats

- A route object and a setting-selected object are not always the same drop type.
- `collection.products` is not generally safe outside `{% paginate %}` on collection pages.
- A single `collection` setting is more capable than `collection_list` items.
- A real product page object has lazy `related_products`; a setting-selected product does not.
- `search` on the home page is not the same as `search` on the search page.
