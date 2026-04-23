import Tiendu from 'tiendu-sdk'

const getTiendu = () => Tiendu()
const COPY_RESET_MS = 1800
const POPUP_STORAGE_PREFIX = 'tiendu:popup:'
const SWIPE_PROGRESS_THRESHOLD = 0.25
const CAROUSEL_AUTOPLAY_INTERVAL = 5000

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const setActionButtonLoading = (button, loading) => {
  for (const iconNode of button.querySelectorAll('[data-button-action-icon]')) {
    iconNode.hidden = iconNode.dataset.buttonActionIcon !== (loading ? 'loader' : 'default')
  }
}

const setCartQuantity = (quantity) => {
  const badge = document.getElementById('cart-quantity-badge')
  if (!(badge instanceof HTMLElement)) return

  const nextQuantity = Math.max(0, Number(quantity) || 0)
  badge.textContent = String(nextQuantity)
  badge.hidden = nextQuantity <= 0
}

const syncCartQuantity = async () => {
  try {
    const tiendu = getTiendu()
    const { quantity } = await tiendu.cart.getQuantity()
    setCartQuantity(quantity)
  } catch {
    setCartQuantity(0)
  }
}

const setSideMenuOpen = (open) => {
  const root = document.querySelector('[data-side-menu-root]')
  if (!(root instanceof HTMLElement)) return

  const closeDelayMs = 280

  if (root.__sideMenuCloseTimer) {
    window.clearTimeout(root.__sideMenuCloseTimer)
    root.__sideMenuCloseTimer = null
  }

  if (open) {
    root.dataset.closing = 'false'
    root.dataset.open = 'true'
    root.setAttribute('aria-hidden', 'false')
    document.body.classList.add('tiendu-side-menu-open')
    return
  }

  root.dataset.closing = 'true'
  root.dataset.open = 'false'
  document.body.classList.remove('tiendu-side-menu-open')
  root.__sideMenuCloseTimer = window.setTimeout(() => {
    root.dataset.closing = 'false'
    root.setAttribute('aria-hidden', 'true')
    root.__sideMenuCloseTimer = null
  }, closeDelayMs)
}

const getPopupStorage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const syncPopupBodyState = () => {
  const hasOpenPopup = document.querySelector('[data-newsletter-popup-root]:not([hidden])')
  document.body.classList.toggle('tiendu-popup-open', Boolean(hasOpenPopup))
}

const getPopupStorageKey = (root) => {
  const configuredKey = String(root?.dataset.popupKey || '').trim()
  return `${POPUP_STORAGE_PREFIX}${configuredKey || root?.id || 'default'}`
}

const setPopupOpen = (root, open) => {
  if (!(root instanceof HTMLElement)) return
  root.hidden = !open
  root.setAttribute('aria-hidden', open ? 'false' : 'true')
  syncPopupBodyState()
}

const dismissPopup = (root, persist = true) => {
  if (!(root instanceof HTMLElement)) return

  if (root.__popupTimer) {
    window.clearTimeout(root.__popupTimer)
    root.__popupTimer = null
  }

  if (persist) {
    const storage = getPopupStorage()
    storage?.setItem(getPopupStorageKey(root), 'dismissed')
  }

  setPopupOpen(root, false)
}

const initSideMenu = () => {
  const root = document.querySelector('[data-side-menu-root]')
  if (!(root instanceof HTMLElement)) return

  const closeButtons = Array.from(root.querySelectorAll('[data-side-menu-close]'))
  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      setSideMenuOpen(false)
    }
  }

  for (const closeButton of closeButtons) {
    if (!(closeButton instanceof HTMLElement)) continue
    if (closeButton.dataset.bound === 'true') continue

    closeButton.dataset.bound = 'true'
    closeButton.addEventListener('click', (event) => {
      event.preventDefault()
      setSideMenuOpen(false)
    })
  }

  if (root.dataset.keydownBound !== 'true') {
    root.dataset.keydownBound = 'true'
    document.addEventListener('keydown', onKeydown)
  }
}

const initNewsletterPopups = () => {
  const roots = Array.from(document.querySelectorAll('[data-newsletter-popup-root]'))

  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue
    if (root.dataset.popupBound === 'true') continue

    root.dataset.popupBound = 'true'

    const forceOpen = root.dataset.popupForceOpen === 'true'
    const storage = getPopupStorage()
    const isDismissed = storage?.getItem(getPopupStorageKey(root)) === 'dismissed'
    const delaySeconds = Math.max(0, Number(root.dataset.popupDelaySeconds || '0') || 0)

    if (forceOpen) {
      setPopupOpen(root, true)
      continue
    }

    if (isDismissed) {
      setPopupOpen(root, false)
      continue
    }

    setPopupOpen(root, false)
    root.__popupTimer = window.setTimeout(() => {
      root.__popupTimer = null
      setPopupOpen(root, true)
    }, delaySeconds * 1000)
  }
}

const initProductGalleries = () => {
  const roots = Array.from(document.querySelectorAll('[data-product-gallery-root]'))

  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue
    if (root.dataset.bound === 'true') continue

    const mainImage = root.querySelector('[data-product-gallery-main-image]')
    const thumbs = Array.from(root.querySelectorAll('[data-product-gallery-thumb]'))
    const prevButton = root.querySelector('[data-product-gallery-prev]')
    const nextButton = root.querySelector('[data-product-gallery-next]')

    if (!(mainImage instanceof HTMLImageElement) || thumbs.length === 0) continue

    root.dataset.bound = 'true'

    let activeIndex = thumbs.findIndex((thumb) => thumb.getAttribute('aria-current') === 'true')
    if (activeIndex < 0) activeIndex = 0

    const syncButtons = () => {
      if (prevButton instanceof HTMLButtonElement) {
        prevButton.disabled = thumbs.length <= 1
      }

      if (nextButton instanceof HTMLButtonElement) {
        nextButton.disabled = thumbs.length <= 1
      }
    }

    const setActiveIndex = (index) => {
      const nextIndex = ((index % thumbs.length) + thumbs.length) % thumbs.length
      const nextThumb = thumbs[nextIndex]
      if (!(nextThumb instanceof HTMLElement)) return

      activeIndex = nextIndex
      mainImage.src = nextThumb.dataset.imageUrl || mainImage.src
      mainImage.alt = nextThumb.dataset.imageAlt || mainImage.alt

      for (const thumb of thumbs) {
        if (!(thumb instanceof HTMLElement)) continue
        thumb.setAttribute('aria-current', thumb === nextThumb ? 'true' : 'false')
      }
    }

    root.__setCurrentImageById = (imageId) => {
      const thumbIndex = thumbs.findIndex((thumb) => Number(thumb.dataset.imageId || '0') === Number(imageId))
      if (thumbIndex >= 0) {
        setActiveIndex(thumbIndex)
      }
    }

    for (const thumb of thumbs) {
      if (!(thumb instanceof HTMLElement)) continue

      const thumbIndex = Number(thumb.dataset.imageIndex || '0')
      thumb.addEventListener('mouseenter', () => setActiveIndex(thumbIndex))
      thumb.addEventListener('focus', () => setActiveIndex(thumbIndex))
      thumb.addEventListener('click', () => setActiveIndex(thumbIndex))
    }

    if (prevButton instanceof HTMLButtonElement) {
      prevButton.addEventListener('click', () => setActiveIndex(activeIndex - 1))
    }

    if (nextButton instanceof HTMLButtonElement) {
      nextButton.addEventListener('click', () => setActiveIndex(activeIndex + 1))
    }

    setActiveIndex(activeIndex)
    syncButtons()
  }
}

const createCarousel = (root) => {
  const existingCleanup = root.__tienduCarouselCleanup
  if (typeof existingCleanup === 'function') existingCleanup()

  const viewport = root.querySelector('[data-role="viewport"]')
  const track = root.querySelector('[data-role="track"]')
  const dots = root.querySelector('[data-role="dots"]')
  const prevButton = root.querySelector('[data-role="prev-image"]')
  const nextButton = root.querySelector('[data-role="next-image"]')
  const slides = Array.from(track?.querySelectorAll('[data-tiendu-carousel-slide]') || [])

  if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement) || slides.length === 0) {
    return null
  }

  let currentIndex = 0
  let autoplayTimer = null
  let suppressClick = false
  const drag = {
    active: false,
    pointerId: null,
    startX: 0,
    offsetX: 0,
  }

  const parsedAutoplayInterval = Number(root.dataset.autoplayInterval)
  const autoplayEnabled = root.dataset.autoplayEnabled === 'true'
  const autoplayInterval = Number.isFinite(parsedAutoplayInterval) && parsedAutoplayInterval > 0
    ? parsedAutoplayInterval
    : CAROUSEL_AUTOPLAY_INTERVAL

  const hasMultiple = () => slides.length > 1
  const maxIndex = Math.max(0, slides.length - 1)
  const slideWidth = () => viewport.clientWidth || 1

  const stopAutoplay = () => {
    if (autoplayTimer == null) return
    window.clearTimeout(autoplayTimer)
    autoplayTimer = null
  }

  const queueAutoplay = () => {
    stopAutoplay()
    if (!hasMultiple()) return
    if (!autoplayEnabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    autoplayTimer = window.setTimeout(() => {
      autoplayTimer = null
      next()
      queueAutoplay()
    }, autoplayInterval)
  }

  const updateTrack = ({ animate }) => {
    const baseTranslate = -currentIndex * slideWidth()
    const dragOffset = drag.active ? drag.offsetX : 0
    track.style.transition = animate && !drag.active
      ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none'
    track.style.transform = `translate3d(${baseTranslate + dragOffset}px, 0, 0)`
  }

  const syncSlides = () => {
    for (const [index, slide] of slides.entries()) {
      slide.setAttribute('aria-hidden', index === currentIndex ? 'false' : 'true')
    }
  }

  const syncDots = () => {
    if (!(dots instanceof HTMLElement)) return
    for (const button of dots.querySelectorAll('[data-dot-index]')) {
      const index = Number(button.getAttribute('data-dot-index'))
      const isActive = index === currentIndex
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-selected', isActive ? 'true' : 'false')
    }
  }

  const syncControls = () => {
    const multiple = hasMultiple()
    if (prevButton instanceof HTMLButtonElement) {
      prevButton.hidden = !multiple
      prevButton.disabled = !multiple
    }
    if (nextButton instanceof HTMLButtonElement) {
      nextButton.hidden = !multiple
      nextButton.disabled = !multiple
    }
    if (dots instanceof HTMLElement) dots.hidden = !multiple
  }

  const goTo = (index, { animate = true, force = false } = {}) => {
    const nextIndex = clamp(index, 0, maxIndex)
    if (nextIndex === currentIndex && !drag.active && !force) return
    currentIndex = nextIndex
    syncSlides()
    syncDots()
    syncControls()
    updateTrack({ animate })
  }

  const next = () => {
    if (!hasMultiple()) return
    goTo(currentIndex === maxIndex ? 0 : currentIndex + 1, {
      animate: true,
      force: currentIndex === maxIndex,
    })
  }

  const prev = () => {
    if (!hasMultiple()) return
    goTo(currentIndex === 0 ? maxIndex : currentIndex - 1, {
      animate: true,
      force: currentIndex === 0,
    })
  }

  const startAutoplay = () => {
    queueAutoplay()
  }

  const resolveReleaseIndex = (offsetX) => {
    const threshold = Math.max(slideWidth(), 1) * SWIPE_PROGRESS_THRESHOLD
    if (Math.abs(offsetX) < threshold) return currentIndex
    if (offsetX < 0) return clamp(currentIndex + 1, 0, maxIndex)
    if (offsetX > 0) return clamp(currentIndex - 1, 0, maxIndex)
    return currentIndex
  }

  const handlePointerDown = (event) => {
    if (!hasMultiple()) return
    if (event.button !== undefined && event.button !== 0) return

    const interactiveTarget = event.target instanceof Element
      ? event.target.closest('a, button, input, select, textarea, summary')
      : null
    if (interactiveTarget && viewport.contains(interactiveTarget)) return

    stopAutoplay()
    drag.active = true
    drag.pointerId = event.pointerId
    drag.startX = event.clientX
    drag.offsetX = 0
    viewport.setPointerCapture?.(event.pointerId)
    viewport.dataset.dragging = 'true'
    updateTrack({ animate: false })
  }

  const handlePointerMove = (event) => {
    if (!drag.active) return
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return

    const rawDelta = event.clientX - drag.startX
    let delta = rawDelta
    if ((currentIndex === 0 && rawDelta > 0) || (currentIndex === maxIndex && rawDelta < 0)) {
      delta = rawDelta * 0.35
    }

    drag.offsetX = delta
    updateTrack({ animate: false })
  }

  const handlePointerEnd = (event) => {
    if (!drag.active) return
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return

    viewport.releasePointerCapture?.(event.pointerId)
    viewport.dataset.dragging = 'false'

    const moved = Math.abs(drag.offsetX)
    const nextIndex = resolveReleaseIndex(drag.offsetX)
    drag.active = false
    drag.pointerId = null
    drag.offsetX = 0
    suppressClick = moved > 6

    goTo(nextIndex, { animate: true, force: true })
    startAutoplay()
  }

  const handleViewportClick = (event) => {
    if (!suppressClick) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
  }

  const handlePrevClick = () => {
    prev()
    startAutoplay()
  }

  const handleNextClick = () => {
    next()
    startAutoplay()
  }

  const handleDotClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-dot-index]') : null
    if (!(button instanceof HTMLButtonElement)) return

    const index = Number(button.dataset.dotIndex)
    if (!Number.isFinite(index)) return

    goTo(index, { animate: true })
    startAutoplay()
  }

  const handleMouseEnter = () => stopAutoplay()
  const handleMouseLeave = () => startAutoplay()
  const handleFocusIn = () => stopAutoplay()
  const handleFocusOut = (event) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return
    startAutoplay()
  }
  const handleResize = () => updateTrack({ animate: false })

  viewport.addEventListener('pointerdown', handlePointerDown)
  viewport.addEventListener('pointermove', handlePointerMove)
  viewport.addEventListener('pointerup', handlePointerEnd)
  viewport.addEventListener('pointercancel', handlePointerEnd)
  viewport.addEventListener('click', handleViewportClick)
  prevButton?.addEventListener('click', handlePrevClick)
  nextButton?.addEventListener('click', handleNextClick)
  dots?.addEventListener('click', handleDotClick)
  root.addEventListener('mouseenter', handleMouseEnter)
  root.addEventListener('mouseleave', handleMouseLeave)
  root.addEventListener('focusin', handleFocusIn)
  root.addEventListener('focusout', handleFocusOut)
  window.addEventListener('resize', handleResize)

  syncSlides()
  syncDots()
  syncControls()
  updateTrack({ animate: false })
  startAutoplay()

  const destroy = () => {
    stopAutoplay()
    viewport.removeEventListener('pointerdown', handlePointerDown)
    viewport.removeEventListener('pointermove', handlePointerMove)
    viewport.removeEventListener('pointerup', handlePointerEnd)
    viewport.removeEventListener('pointercancel', handlePointerEnd)
    viewport.removeEventListener('click', handleViewportClick)
    prevButton?.removeEventListener('click', handlePrevClick)
    nextButton?.removeEventListener('click', handleNextClick)
    dots?.removeEventListener('click', handleDotClick)
    root.removeEventListener('mouseenter', handleMouseEnter)
    root.removeEventListener('mouseleave', handleMouseLeave)
    root.removeEventListener('focusin', handleFocusIn)
    root.removeEventListener('focusout', handleFocusOut)
    window.removeEventListener('resize', handleResize)
    delete root.__tienduCarouselCleanup
  }

  root.__tienduCarouselCleanup = destroy
  return { destroy }
}

const initCarousels = (scope = document) => {
  const root = scope instanceof HTMLElement ? scope : document.documentElement
  const carousels = root.matches('[data-tiendu-carousel]')
    ? [root]
    : Array.from(root.querySelectorAll('[data-tiendu-carousel]'))

  for (const carousel of carousels) {
    createCarousel(carousel)
  }
}

const normalizeVariants = (variants) => Array.isArray(variants) ? variants.filter((variant) => variant && typeof variant.id === 'number') : []

const extractVariantValueMap = (variant) => {
  const valueMap = new Map()
  if (!Array.isArray(variant?.attributes)) return valueMap

  for (const attribute of variant.attributes) {
    const attributeId = Number(attribute?.id)
    const valueId = Number(attribute?.values?.[0]?.id)
    if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue
    valueMap.set(attributeId, valueId)
  }

  return valueMap
}

const serializeMap = (valueMap) => Array.from(valueMap.entries()).sort(([left], [right]) => left - right).map(([attributeId, valueId]) => `${attributeId}:${valueId}`).join(';')

const buildVariantIndex = (variants) => {
  const index = new Map()
  for (const variant of variants) {
    index.set(serializeMap(extractVariantValueMap(variant)), variant)
  }
  return index
}

const readSelectedValuesFromDom = (root) => {
  const selectedValues = new Map()
  if (!(root instanceof HTMLElement)) return selectedValues

  for (const button of root.querySelectorAll('.option-chip[aria-pressed="true"]')) {
    const attributeId = Number(button.dataset.attributeId)
    const valueId = Number(button.dataset.valueId)
    if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue
    selectedValues.set(attributeId, valueId)
  }

  for (const option of root.querySelectorAll('.variant-select__option[aria-selected="true"]')) {
    const select = option.closest('.variant-select')
    if (!(select instanceof HTMLElement)) continue
    const attributeId = Number(select.dataset.attributeId)
    const valueId = Number(option.dataset.valueId)
    if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue
    selectedValues.set(attributeId, valueId)
  }

  return selectedValues
}

const formatMoney = (amountInCents) => {
  const amount = Number(amountInCents) / 100
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const getVariantSetPriceData = ({ product, variants }) => {
  const pricedVariants = variants.filter((variant) => typeof variant?.priceInCents === 'number')
  if (pricedVariants.length === 0) {
    const basePrice = typeof product?.basePriceInCents === 'number' ? product.basePriceInCents : null
    const baseCompare = typeof product?.baseCompareAtPriceInCents === 'number' ? product.baseCompareAtPriceInCents : null
    return {
      label: basePrice != null ? formatMoney(basePrice) : '',
      compareLabel: basePrice != null && baseCompare != null && baseCompare > basePrice ? formatMoney(baseCompare) : '',
    }
  }

  const prices = pricedVariants.map((variant) => variant.priceInCents)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const compareValues = []
  let hasSharedCompare = true

  for (const variant of pricedVariants) {
    const compare = typeof variant.compareAtPriceInCents === 'number' ? variant.compareAtPriceInCents : null
    if (compare == null || compare <= variant.priceInCents) {
      hasSharedCompare = false
      break
    }

    compareValues.push(compare)
  }

  const compareLabel = hasSharedCompare && compareValues.length > 0 && compareValues.every((value) => value === compareValues[0])
    ? formatMoney(compareValues[0])
    : ''

  return {
    label: minPrice !== maxPrice ? `Desde ${formatMoney(minPrice)}` : formatMoney(minPrice),
    compareLabel,
  }
}

const initVariantSelectors = () => {
  const productRoot = document.querySelector('.tiendu-main-product[data-product-root]')
  if (!(productRoot instanceof HTMLElement)) return
  if (productRoot.dataset.variantBound === 'true') return

  const productJson = productRoot.querySelector('#product-json')
  const variantSelector = productRoot.querySelector('#variant-selector')
  const addToCartButton = productRoot.querySelector('[data-button-action="add_to_cart"]')
  const priceNode = productRoot.querySelector('#product-price')
  const compareNode = productRoot.querySelector('#product-compare')
  const priceWrapNode = productRoot.querySelector('[data-product-price-wrap]')
  const compareWrapNode = productRoot.querySelector('[data-product-compare-wrap]')
  const galleryRoot = productRoot.querySelector('[data-product-gallery-root]')

  if (!(productJson instanceof HTMLScriptElement) || !(variantSelector instanceof HTMLElement)) return

  let productData = null
  try {
    productData = JSON.parse(productJson.textContent || '{}')
  } catch {
    return
  }

  const variants = normalizeVariants(productData?.variants)
  const productAttributes = Array.isArray(productData?.attributes) ? productData.attributes : []
  if (variants.length === 0 || productAttributes.length === 0) return

  productRoot.dataset.variantBound = 'true'

  const variantIndex = buildVariantIndex(variants)
  const selectedValues = readSelectedValuesFromDom(variantSelector)
  const isSelectionComplete = () => productAttributes.every((attribute) => selectedValues.has(Number(attribute.id)))

  const getMatchingVariants = () => {
    if (selectedValues.size === 0) return variants

    return variants.filter((variant) => {
      const valueMap = extractVariantValueMap(variant)
      for (const [selectedAttributeId, selectedValueId] of selectedValues.entries()) {
        if (valueMap.get(selectedAttributeId) !== selectedValueId) return false
      }
      return true
    })
  }

  let currentVariant = isSelectionComplete() ? variantIndex.get(serializeMap(selectedValues)) || null : null
  let matchingVariants = getMatchingVariants()

  const isValueEnabledForSelection = (attributeId, valueId) => {
    return variants.some((variant) => {
      const valueMap = extractVariantValueMap(variant)
      if (valueMap.get(attributeId) !== valueId) return false

      for (const [selectedAttributeId, selectedValueId] of selectedValues.entries()) {
        if (selectedAttributeId === attributeId) continue
        if (valueMap.has(selectedAttributeId) && valueMap.get(selectedAttributeId) !== selectedValueId) {
          return false
        }
      }

      return true
    })
  }

  const syncVariantSelectTrigger = (select, selectedValueId) => {
    const labelNode = select.querySelector('[data-variant-select-label]')
    const swatchNode = select.querySelector('[data-variant-select-trigger-swatch]')
    const selectedOption = Array.from(select.querySelectorAll('.variant-select__option')).find((option) => Number(option.dataset.valueId) === Number(selectedValueId))

    if (labelNode instanceof HTMLElement) {
      labelNode.textContent = selectedOption?.dataset.label || 'Selecciona una opción'
      labelNode.classList.toggle('variant-select__label--placeholder', !selectedOption)
    }

    if (swatchNode instanceof HTMLElement) {
      const swatch = selectedOption?.querySelector('.variant-select__swatch')
      swatchNode.innerHTML = swatch instanceof HTMLElement ? swatch.outerHTML : ''
      swatchNode.classList.toggle('variant-select__trigger-swatch--hidden', !swatch)
    }
  }

  const syncSelectorState = () => {
    for (const chip of variantSelector.querySelectorAll('.option-chip')) {
      const attributeId = Number(chip.dataset.attributeId)
      const valueId = Number(chip.dataset.valueId)
      if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) continue
      chip.setAttribute('aria-pressed', selectedValues.get(attributeId) === valueId ? 'true' : 'false')
      chip.disabled = !isValueEnabledForSelection(attributeId, valueId)
    }

    for (const select of variantSelector.querySelectorAll('.variant-select')) {
      const attributeId = Number(select.dataset.attributeId)
      const selectedValueId = selectedValues.get(attributeId)
      for (const option of select.querySelectorAll('.variant-select__option')) {
        const valueId = Number(option.dataset.valueId)
        option.setAttribute('aria-selected', selectedValueId === valueId ? 'true' : 'false')
        option.disabled = !isValueEnabledForSelection(attributeId, valueId)
      }
      syncVariantSelectTrigger(select, selectedValueId)
    }
  }

  const syncPrice = () => {
    const priceData = currentVariant
      ? {
          label: typeof currentVariant.priceInCents === 'number' ? formatMoney(currentVariant.priceInCents) : '',
          compareLabel:
            typeof currentVariant.priceInCents === 'number' && typeof currentVariant.compareAtPriceInCents === 'number' && currentVariant.compareAtPriceInCents > currentVariant.priceInCents
              ? formatMoney(currentVariant.compareAtPriceInCents)
              : '',
        }
      : getVariantSetPriceData({ product: productData, variants: matchingVariants })

    if (priceWrapNode instanceof HTMLElement) {
      priceWrapNode.hidden = !priceData.label
    }
    if (priceNode instanceof HTMLElement) {
      priceNode.textContent = priceData.label || ''
    }

    const showCompare = Boolean(priceData.compareLabel)
    if (compareWrapNode instanceof HTMLElement) {
      compareWrapNode.hidden = !showCompare
    }
    if (compareNode instanceof HTMLElement) {
      compareNode.textContent = showCompare ? priceData.compareLabel : ''
    }
  }

  const syncAddToCart = () => {
    if (!(addToCartButton instanceof HTMLElement)) return
    if (currentVariant && typeof currentVariant.id === 'number') {
      addToCartButton.dataset.productVariantId = String(currentVariant.id)
      addToCartButton.removeAttribute('disabled')
      return
    }

    delete addToCartButton.dataset.productVariantId
    addToCartButton.setAttribute('disabled', 'true')
  }

  const syncGallery = () => {
    const imageId = currentVariant?.coverImage?.id
    if (typeof imageId !== 'number') return
    if (galleryRoot && typeof galleryRoot.__setCurrentImageById === 'function') {
      galleryRoot.__setCurrentImageById(imageId)
    }
  }

  const seededTrackedId = Number(productRoot.dataset.lastTrackedVariantId)
  let lastTrackedVariantId = Number.isFinite(seededTrackedId) ? seededTrackedId : currentVariant?.id ?? null
  let viewTrackingTimer = null

  const VIEW_TRACKING_DEBOUNCE_MS = 400

  const scheduleVariantViewTracking = () => {
    if (!currentVariant || typeof currentVariant.id !== 'number') return
    if (currentVariant.id === lastTrackedVariantId) return

    if (viewTrackingTimer) {
      window.clearTimeout(viewTrackingTimer)
    }

    const variantToTrack = currentVariant
    viewTrackingTimer = window.setTimeout(() => {
      viewTrackingTimer = null
      if (currentVariant?.id !== variantToTrack.id) return
      lastTrackedVariantId = variantToTrack.id
      try {
        getTiendu().analytics.trackViewContent(productData, variantToTrack)
      } catch {
        // tracking failures shouldn't break the page
      }
    }, VIEW_TRACKING_DEBOUNCE_MS)
  }

  const syncFromSelection = () => {
    matchingVariants = getMatchingVariants()
    const nextVariant = isSelectionComplete() ? variantIndex.get(serializeMap(selectedValues)) || null : null
    currentVariant = nextVariant
    syncSelectorState()
    syncPrice()
    syncAddToCart()
    syncGallery()
    scheduleVariantViewTracking()
  }

  variantSelector.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null
    if (!(target instanceof HTMLButtonElement)) return

    const trigger = target.closest('[data-variant-select-trigger]')
    if (trigger) {
      event.preventDefault()
      const select = trigger.closest('.variant-select')
      const menu = select?.querySelector('[data-variant-select-menu]')
      const isOpen = trigger.getAttribute('aria-expanded') === 'true'
      if (trigger instanceof HTMLButtonElement && menu instanceof HTMLElement) {
        trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true')
        menu.hidden = isOpen
      }
      return
    }

    const selectOption = target.closest('.variant-select__option')
    if (selectOption instanceof HTMLButtonElement) {
      event.preventDefault()
      const select = selectOption.closest('.variant-select')
      if (!(select instanceof HTMLElement) || selectOption.disabled) return
      const attributeId = Number(select.dataset.attributeId)
      const valueId = Number(selectOption.dataset.valueId)
      if (!Number.isFinite(attributeId) || !Number.isFinite(valueId)) return
      selectedValues.set(attributeId, valueId)
      const menu = select.querySelector('[data-variant-select-menu]')
      const selectTrigger = select.querySelector('[data-variant-select-trigger]')
      if (menu instanceof HTMLElement) menu.hidden = true
      if (selectTrigger instanceof HTMLButtonElement) selectTrigger.setAttribute('aria-expanded', 'false')
      syncFromSelection()
      return
    }

    const attributeId = Number(target.dataset.attributeId)
    const valueId = Number(target.dataset.valueId)
    if (!Number.isFinite(attributeId) || !Number.isFinite(valueId) || target.disabled) return
    selectedValues.set(attributeId, valueId)
    syncFromSelection()
  })

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return
    if (variantSelector.contains(event.target)) return
    for (const menu of variantSelector.querySelectorAll('[data-variant-select-menu]')) {
      if (menu instanceof HTMLElement) menu.hidden = true
    }
    for (const trigger of variantSelector.querySelectorAll('[data-variant-select-trigger]')) {
      if (trigger instanceof HTMLButtonElement) trigger.setAttribute('aria-expanded', 'false')
    }
  })

  syncFromSelection()
}

const resolveInitialProductVariant = (productData, variantSelectorRoot) => {
  const variants = normalizeVariants(productData?.variants)
  if (variants.length === 0) return null

  if (variantSelectorRoot instanceof HTMLElement) {
    const productAttributes = Array.isArray(productData?.attributes) ? productData.attributes : []
    const selectedValues = readSelectedValuesFromDom(variantSelectorRoot)
    const isComplete =
      productAttributes.length > 0 &&
      productAttributes.every((attribute) => selectedValues.has(Number(attribute.id)))
    if (isComplete) {
      const matched = buildVariantIndex(variants).get(serializeMap(selectedValues))
      if (matched) return matched
    }
  }

  return variants[0]
}

const initProductViewTracking = () => {
  const productRoot = document.querySelector('.tiendu-main-product[data-product-root]')
  if (!(productRoot instanceof HTMLElement)) return
  if (productRoot.dataset.viewTrackingFired === 'true') return

  const productJson = productRoot.querySelector('#product-json')
  if (!(productJson instanceof HTMLScriptElement)) return

  let productData = null
  try {
    productData = JSON.parse(productJson.textContent || '{}')
  } catch {
    return
  }

  const variantSelectorRoot = productRoot.querySelector('#variant-selector')
  const initialVariant = resolveInitialProductVariant(productData, variantSelectorRoot)
  if (!initialVariant) return

  productRoot.dataset.viewTrackingFired = 'true'
  productRoot.dataset.lastTrackedVariantId = String(initialVariant.id)
  try {
    getTiendu().analytics.trackViewContent(productData, initialVariant)
  } catch {
    // tracking failures shouldn't break the page
  }
}

const initProductShareButtons = () => {
  const buttons = Array.from(document.querySelectorAll('[data-button-action="share"]'))
  for (const button of buttons) {
    if (!(button instanceof HTMLButtonElement)) continue
    if (button.dataset.shareBound === 'true') continue

    button.dataset.shareBound = 'true'
    const label = button.querySelector('[data-share-label]')
    const defaultLabel = label?.textContent ?? 'Compartir'

    button.addEventListener('click', async (event) => {
      event.preventDefault()

      try {
        if (navigator.share) {
          await navigator.share({
            title: document.title,
            url: window.location.href,
          })
          return
        }

        await navigator.clipboard.writeText(window.location.href)
        if (label) {
          label.textContent = 'Link copiado'
          window.setTimeout(() => {
            label.textContent = defaultLabel
          }, COPY_RESET_MS)
        }
      } catch {
        if (label) {
          label.textContent = defaultLabel
        }
      }
    })
  }
}

const initStickyHeaders = () => {
  const stickyRoots = Array.from(document.querySelectorAll('[data-header-sticky-root]'))

  for (const stickyRoot of stickyRoots) {
    if (!(stickyRoot instanceof HTMLElement)) continue

    const sectionWrapper = stickyRoot.closest('[data-section-type="header"]')
    const stickyTarget = sectionWrapper instanceof HTMLElement ? sectionWrapper : stickyRoot

    stickyTarget.style.position = 'sticky'
    stickyTarget.style.top = '0'
    stickyTarget.style.zIndex = '30'
    stickyTarget.style.width = '100%'

    if (!stickyTarget.style.backgroundColor && stickyRoot instanceof HTMLElement) {
      stickyTarget.style.backgroundColor = stickyRoot.style.backgroundColor || 'white'
    }
  }
}

const bindButtonAction = (button) => {
  if (!(button instanceof HTMLElement)) return
  if (button.dataset.bound === 'true') return

  const action = button.dataset.buttonAction
  if (!action) return

  button.dataset.bound = 'true'

  button.addEventListener('click', async (event) => {
    event.preventDefault()

    const tiendu = getTiendu()
    const shouldShowLoading = action === 'search' || action === 'cart' || action === 'add_to_cart'

    if (shouldShowLoading) {
      button.setAttribute('disabled', 'true')
      setActionButtonLoading(button, true)
    }

    try {
      if (action === 'menu') {
        setSideMenuOpen(true)
      }

      if (action === 'close_menu') {
        setSideMenuOpen(false)
      }

      if (action === 'close_popup') {
        const popupRoot = button.closest('[data-newsletter-popup-root]')
        if (popupRoot instanceof HTMLElement) {
          dismissPopup(popupRoot)
        }
      }

      if (action === 'search') {
        await tiendu.search.open({ query: button.dataset.searchQuery || '' })
      }

      if (action === 'cart') {
        await tiendu.cart.open(({ updatedCartItemsQuantity }) => {
          setCartQuantity(updatedCartItemsQuantity)
        })
      }

      if (action === 'add_to_cart') {
        const variantId = Number(button.dataset.productVariantId || '0')
        if (!variantId) {
          throw new Error('Missing variant id')
        }

        let productData = null
        let variant = { id: variantId }
        const productRoot = button.closest('[data-product-root]')
        const productJsonNode = productRoot?.querySelector('#product-json')
        if (productJsonNode instanceof HTMLScriptElement && productJsonNode.textContent) {
          try {
            productData = JSON.parse(productJsonNode.textContent)
            const matched = (productData?.variants ?? []).find((entry) => Number(entry?.id) === variantId)
            if (matched) variant = matched
          } catch {
            // fall back to id-only variant
          }
        }

        await tiendu.cart.addProductVariant(
          variant,
          1,
          ({ updatedCartItemsQuantity }) => setCartQuantity(updatedCartItemsQuantity),
          productData
        )
      }
    } catch {
      window.alert(
        action === 'cart'
          ? 'No se pudo abrir el carrito'
          : action === 'add_to_cart'
            ? 'No se pudo agregar el producto al carrito'
            : 'No se pudo abrir el buscador'
      )
    } finally {
      if (shouldShowLoading) {
        setActionButtonLoading(button, false)
        button.removeAttribute('disabled')
      }
    }
  })
}

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase())
}

const initNewsletterForms = () => {
  const forms = Array.from(document.querySelectorAll('[data-newsletter-form]'))

  for (const form of forms) {
    if (!(form instanceof HTMLFormElement)) continue
    if (form.dataset.newsletterBound === 'true') continue

    form.dataset.newsletterBound = 'true'
    const submitButton = form.querySelector('button[type="submit"]')
    const emailInput = form.querySelector('[data-newsletter-email]')
    const defaultButtonText = submitButton instanceof HTMLButtonElement ? submitButton.textContent : 'Suscribirme'

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      if (!(emailInput instanceof HTMLInputElement)) return

      const email = emailInput.value.trim()
      if (!isValidEmail(email)) {
        window.alert('Por favor ingresá un email válido.')
        return
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true
        submitButton.textContent = 'Enviando...'
      }

      try {
        const tiendu = getTiendu()
        await tiendu.subscribers.add(email)
        window.alert('¡Te mandamos un email! Ahora solo te falta tocar el botón de ese email para confirmar tu subscripción.')
        emailInput.value = ''

        const popupRoot = form.closest('[data-newsletter-popup-root]')
        if (popupRoot instanceof HTMLElement) {
          dismissPopup(popupRoot)
        }
      } catch {
        window.alert('No se pudo completar la suscripción. Intentá de nuevo más tarde.')
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false
          submitButton.textContent = defaultButtonText
        }
      }
    })
  }
}

const initButtonActions = () => {
  const buttons = Array.from(document.querySelectorAll('[data-button-action]'))
  for (const button of buttons) {
    bindButtonAction(button)
  }

  initSideMenu()
  initProductGalleries()
  initProductViewTracking()
  initVariantSelectors()
  initProductShareButtons()
  initStickyHeaders()
  initNewsletterForms()
  initNewsletterPopups()
  initCarousels()

  if (buttons.some((button) => button.dataset.buttonAction === 'cart')) {
    void syncCartQuantity()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initButtonActions)
} else {
  initButtonActions()
}
