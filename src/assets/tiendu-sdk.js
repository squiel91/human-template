let activeOverlayCleanup = null

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
const isRecord = (value) => typeof value === 'object' && value !== null

const ANALYTICS_META_EVENTS_URL = '/api/analytics/meta-events'
const PRODUCT_VARIANT_ID_PREFIX = 'TIENDU_PRODUCT_VARIANT_ID_'
const CURRENCY = 'UYU'

const generateEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

const readCookie = (name) => {
  if (typeof document === 'undefined' || !document.cookie) return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

const postBeacon = (url, body) => {
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(body),
    }).catch(() => {})
  } catch {
    // ignore
  }
}

const sendMetaCAPI = (eventName, eventId, customData) => {
  postBeacon(ANALYTICS_META_EVENTS_URL, {
    eventName,
    eventId,
    eventSourceUrl: window.location.href,
    fbp: readCookie('_fbp'),
    fbc: readCookie('_fbc'),
    ...(customData ? { customData } : {}),
  })
}

const fireFbq = (eventName, fbqData, eventId) => {
  if (typeof window.fbq !== 'function') return
  window.fbq('track', eventName, fbqData, { eventID: eventId })
}

const fireGtag = (eventName, ga4Data) => {
  if (typeof window.gtag !== 'function') return
  window.gtag('event', eventName, ga4Data)
}

const variantContentId = (variantId) => `${PRODUCT_VARIANT_ID_PREFIX}${variantId}`

const trackViewContent = (product, variant) => {
  if (!variant || typeof variant.id !== 'number') return
  const eventId = generateEventId()
  const priceCents =
    typeof variant.priceInCents === 'number'
      ? variant.priceInCents
      : typeof product?.basePriceInCents === 'number'
        ? product.basePriceInCents
        : 0
  const value = priceCents / 100
  const contentId = variantContentId(variant.id)

  const fbqData = {
    content_ids: [contentId],
    content_name: product?.title ?? '',
    content_type: 'product',
    value,
    currency: CURRENCY,
  }
  fireFbq('ViewContent', fbqData, eventId)
  sendMetaCAPI('ViewContent', eventId, fbqData)

  const ga4Data = {
    currency: CURRENCY,
    value,
    items: [
      {
        item_id: contentId,
        item_name: product?.title ?? '',
        price: value,
        quantity: 1,
      },
    ],
  }
  fireGtag('view_item', ga4Data)
}

const trackAddToCart = (variant, quantity, product) => {
  if (!variant || typeof variant.id !== 'number') return
  const eventId = generateEventId()
  const priceCents =
    typeof variant.priceInCents === 'number'
      ? variant.priceInCents
      : typeof product?.basePriceInCents === 'number'
        ? product.basePriceInCents
        : 0
  const unitPrice = priceCents / 100
  const value = (priceCents * quantity) / 100
  const contentId = variantContentId(variant.id)
  const productTitle = product?.title ?? variant?.productTitle ?? ''

  const fbqData = {
    content_ids: [contentId],
    ...(productTitle ? { content_name: productTitle } : {}),
    content_type: 'product',
    value,
    currency: CURRENCY,
    contents: [{ id: contentId, quantity }],
  }
  fireFbq('AddToCart', fbqData, eventId)
  sendMetaCAPI('AddToCart', eventId, fbqData)

  const ga4Data = {
    currency: CURRENCY,
    value,
    items: [
      {
        item_id: contentId,
        ...(productTitle ? { item_name: productTitle } : {}),
        price: unitPrice,
        quantity,
      },
    ],
  }
  fireGtag('add_to_cart', ga4Data)
}

const trackSearch = (query) => {
  const trimmed = typeof query === 'string' ? query.trim() : ''
  if (!trimmed) return
  const eventId = generateEventId()

  const fbqData = { search_string: trimmed }
  fireFbq('Search', fbqData, eventId)
  sendMetaCAPI('Search', eventId, fbqData)

  fireGtag('search', { search_term: trimmed })
}

const buildCheckoutContents = (items) => {
  if (!Array.isArray(items)) return []
  const result = []
  for (const item of items) {
    const variantId = Number(item?.productVariantId)
    const quantity = Number(item?.quantity)
    if (!Number.isFinite(variantId) || !Number.isFinite(quantity)) continue
    result.push({ id: variantContentId(variantId), quantity })
  }
  return result
}

const trackInitiateCheckout = (totalPriceInCents, items) => {
  const eventId = generateEventId()
  const value = (Number(totalPriceInCents) || 0) / 100
  const contents = buildCheckoutContents(items)
  const numItems = contents.reduce((acc, item) => acc + item.quantity, 0)

  const fbqData = {
    content_type: 'product',
    value,
    currency: CURRENCY,
    contents,
    num_items: numItems,
  }
  fireFbq('InitiateCheckout', fbqData, eventId)
  sendMetaCAPI('InitiateCheckout', eventId, fbqData)

  const ga4Data = {
    currency: CURRENCY,
    value,
    items: contents.map((entry) => ({ item_id: entry.id, quantity: entry.quantity })),
  }
  fireGtag('begin_checkout', ga4Data)
}

const trackPurchase = (totalPriceInCents, items, orderId) => {
  const eventId = generateEventId()
  const value = (Number(totalPriceInCents) || 0) / 100
  const contents = buildCheckoutContents(items)
  const numItems = contents.reduce((acc, item) => acc + item.quantity, 0)

  const fbqData = {
    content_type: 'product',
    value,
    currency: CURRENCY,
    contents,
    num_items: numItems,
    ...(orderId ? { order_id: orderId } : {}),
  }
  fireFbq('Purchase', fbqData, eventId)
  sendMetaCAPI('Purchase', eventId, fbqData)

  const ga4Data = {
    currency: CURRENCY,
    value,
    ...(orderId ? { transaction_id: orderId } : {}),
    items: contents.map((entry) => ({ item_id: entry.id, quantity: entry.quantity })),
  }
  fireGtag('purchase', ga4Data)
}

const buildUrl = (url, queryParams) => {
  if (!queryParams) return url

  const resolved = new URL(url, window.location.origin)

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue
        resolved.searchParams.append(key, String(item))
      }

      continue
    }

    resolved.searchParams.set(key, String(value))
  }

  return resolved.toString()
}

const createRequester = (baseFetch) => {
  const request = async (url, options = {}) => {
    const { queryParams, ...fetchOptions } = options
    const finalUrl = buildUrl(url, queryParams)
    const response = await baseFetch(finalUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return await response.json()
  }

  return {
    get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
    post: (url, body, options = {}) => {
      const headers = new Headers(options.headers)
      headers.set('Content-Type', 'application/json')

      return request(url, {
        ...options,
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    },
  }
}

const unwrapData = (response) => {
  if (isRecord(response) && 'data' in response) {
    return response.data ?? response
  }

  return response
}

const waitForCartSync = async (getQuantity, previousQuantity) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const { quantity } = await getQuantity()
      if (quantity > previousQuantity) return
    } catch {
      // ignore transient sync errors
    }

    await wait(60)
  }
}

export const Tiendu = () => {
  const requester = createRequester(fetch)
  const baseApiUrl = '/tiendu/api'

  const openOverlayIframe = async ({ src, onMessage, waitForReady = false }) => {
    if (typeof activeOverlayCleanup === 'function') {
      activeOverlayCleanup()
      activeOverlayCleanup = null
    }

    const iframe = document.createElement('iframe')
    iframe.src = src
    iframe.id = 'left-iframe'

    let isClosed = false
    let hasSettled = false
    let resolveOpen = null
    let rejectOpen = null

    const isTrustedIframeMessage = (event) => {
      if (event.origin !== window.location.origin) return false

      return iframe.contentWindow !== null && event.source === iframe.contentWindow
    }

    const settleReject = (error) => {
      if (hasSettled) return
      hasSettled = true
      resolveOpen = null
      rejectOpen?.(error)
      rejectOpen = null
    }

    const settleResolve = () => {
      if (hasSettled) return
      hasSettled = true
      resolveOpen?.(iframe)
      resolveOpen = null
      rejectOpen = null
    }

    const cleanup = () => {
      if (isClosed) return
      isClosed = true
      window.removeEventListener('message', handleIframeMessage)
      iframe.onload = null
      iframe.onerror = null
      iframe.remove()

      if (activeOverlayCleanup === cleanup) {
        activeOverlayCleanup = null
      }

      if (waitForReady) {
        settleReject(new Error('Overlay closed before it became ready'))
      }
    }

    activeOverlayCleanup = cleanup

    const handleIframeMessage = (event) => {
      if (!isTrustedIframeMessage(event)) return

      onMessage?.(event.data)

      if (event.data?.type === 'ready' && waitForReady && !hasSettled) {
        settleResolve()
      }

      if (event.data?.type === 'close') {
        cleanup()
      }
    }

    return await new Promise((resolve, reject) => {
      resolveOpen = resolve
      rejectOpen = reject
      window.addEventListener('message', handleIframeMessage)

      iframe.onerror = () => {
        cleanup()
        settleReject(new Error('Failed to load overlay iframe'))
      }

      iframe.style.position = 'fixed'
      iframe.style.top = '0'
      iframe.style.left = '0'
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.zIndex = '9999'
      iframe.style.border = 'none'
      document.body.appendChild(iframe)

      if (!waitForReady) {
        settleResolve()
      }
    })
  }

  const methods = {
    products: {
      list: async (options = {}) => await requester.get(`${baseApiUrl}/products`, { queryParams: options }),
      get: async (productId) => unwrapData(await requester.get(`${baseApiUrl}/products/${productId}`)),
      getRelated: async (productId) => unwrapData(await requester.get(`${baseApiUrl}/products/${productId}/related`)),
    },
    reviews: {
      list: async (options = {}) => await requester.get(`${baseApiUrl}/reviews`, { queryParams: options }),
    },
    collections: {
      list: async () => unwrapData(await requester.get(`${baseApiUrl}/categories`)),
      get: async (collectionId) => unwrapData(await requester.get(`${baseApiUrl}/categories/${collectionId}`)),
    },
    subscribers: {
      add: async (email) => unwrapData(await requester.post(`${baseApiUrl}/subscribers`, { email })),
    },
    images: {
      get: async (imageId) => unwrapData(await requester.get(`${baseApiUrl}/images/${imageId}`)),
    },
    pages: {
      list: async () => unwrapData(await requester.get(`${baseApiUrl}/pages`)),
      get: async (pageId) => unwrapData(await requester.get(`${baseApiUrl}/pages/${pageId}`)),
    },
    blogPosts: {
      list: async () => unwrapData(await requester.get(`${baseApiUrl}/blog-posts`)),
      get: async (blogPostId) => unwrapData(await requester.get(`${baseApiUrl}/blog-posts/${blogPostId}`)),
    },
    analytics: {
      trackPageView: () => {},
      trackViewContent,
      trackSearch,
      trackAddToCart,
      trackInitiateCheckout,
      trackPurchase,
    },
    search: {
      open: async (options = {}) => {
        const query = options.query?.trim() ?? ''
        const src = buildUrl('/tiendu/search', query ? { q: query } : undefined)
        return await openOverlayIframe({
          src,
          waitForReady: true,
          onMessage: (message) => {
            if (message?.type === 'search') {
              trackSearch(typeof message.query === 'string' ? message.query : '')
            }
          },
        })
      },
    },
    cart: {
      addProductVariant: async (productVariant, quantity, onClose, product) => {
        const previousCart = await methods.cart.getQuantity().catch(() => ({ quantity: 0 }))
        await requester.post(`${baseApiUrl}/cart/products/variants/${productVariant.id}`, { quantity })
        await waitForCartSync(methods.cart.getQuantity, previousCart.quantity)
        trackAddToCart(productVariant, quantity, product)
        await methods.cart.open(onClose)
      },
      getQuantity: async () => {
        const response = await requester.get(`${baseApiUrl}/cart/quantity`)

        return {
          quantity:
            typeof response.data?.quantity === 'number'
              ? response.data.quantity
              : typeof response.quantity === 'number'
                ? response.quantity
                : 0,
        }
      },
      open: async (onClose) => {
        const firedSteps = new Set()
        return await openOverlayIframe({
          src: '/tiendu/checkout',
          waitForReady: true,
          onMessage: (message) => {
            if (message.type === 'close' && onClose && typeof message.updatedCartItemsQuantity === 'number') {
              onClose({ updatedCartItemsQuantity: message.updatedCartItemsQuantity })
            }

            if (message.type === 'step-changed') {
              const totalPriceInCents = typeof message.totalPriceInCents === 'number' ? message.totalPriceInCents : null
              const items = Array.isArray(message.items) ? message.items : null
              if (totalPriceInCents == null || items == null) return

              if (message.step === 'delivery' && !firedSteps.has('delivery')) {
                firedSteps.add('delivery')
                trackInitiateCheckout(totalPriceInCents, items)
              } else if (message.step === 'success' && !firedSteps.has('success')) {
                firedSteps.add('success')
                trackPurchase(totalPriceInCents, items, message.orderId)
              }
            }
          },
        })
      },
    },
  }

  return methods
}

window.Tiendu = Tiendu

export default Tiendu
