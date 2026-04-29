import Tiendu from 'tiendu-sdk'
import { clamp, createSwipeController } from 'carousel-utils'
import 'toast'

const getTiendu = () => Tiendu()
const COPY_RESET_MS = 1800
const POPUP_STORAGE_PREFIX = 'tiendu:popup:'
const SWIPE_PROGRESS_THRESHOLD = 0.25
const CAROUSEL_AUTOPLAY_INTERVAL = 5000

const setActionButtonLoading = (button, loading) => {
  const content = button.querySelector('[data-button-content]')
  const loader = button.querySelector('[data-button-loader]')
  if (content) {
    content.style.opacity = loading ? '0' : ''
    content.style.pointerEvents = loading ? 'none' : ''
  }
  if (loader) loader.hidden = !loading

  // Legacy fallback for old button markup with data-button-action-icon
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

    const stage = root.querySelector('[data-product-gallery-stage]')
    const track = root.querySelector('[data-product-gallery-track]')
    const slides = Array.from(root.querySelectorAll('[data-product-gallery-slide]'))
    const thumbs = Array.from(root.querySelectorAll('[data-product-gallery-thumb]'))
    const prevButton = root.querySelector('[data-product-gallery-prev]')
    const nextButton = root.querySelector('[data-product-gallery-next]')
    const modal = root.querySelector('[data-product-gallery-modal]')
    const modalImage = root.querySelector('[data-product-gallery-modal-image]')
    const modalCloseButtons = Array.from(root.querySelectorAll('[data-product-gallery-modal-close]'))

    if (!(stage instanceof HTMLElement) || !(track instanceof HTMLElement) || slides.length === 0) continue

    root.dataset.bound = 'true'
    let modalCloseTimer = null

    let activeIndex = thumbs.findIndex((thumb) => thumb.getAttribute('aria-current') === 'true')
    if (activeIndex < 0) activeIndex = 0

    const syncButtons = () => {
      if (prevButton instanceof HTMLButtonElement) {
        prevButton.disabled = slides.length <= 1
      }

      if (nextButton instanceof HTMLButtonElement) {
        nextButton.disabled = slides.length <= 1
      }
    }

    const setActiveIndex = (index) => {
      const nextIndex = ((index % slides.length) + slides.length) % slides.length
      const nextThumb = thumbs[nextIndex]

      activeIndex = nextIndex
      stage.style.setProperty('--product-gallery-index', String(activeIndex))
      stage.style.setProperty('--product-gallery-drag-offset', '0px')
      stage.dataset.dragAnimate = 'true'

      for (const thumb of thumbs) {
        if (!(thumb instanceof HTMLElement)) continue
        thumb.setAttribute('aria-current', thumb === nextThumb ? 'true' : 'false')
      }

      for (const [slideIndex, slide] of slides.entries()) {
        if (!(slide instanceof HTMLElement)) continue
        slide.setAttribute('aria-hidden', slideIndex === activeIndex ? 'false' : 'true')
      }
    }

    const getActiveImage = () => {
      const activeSlide = slides[activeIndex]
      if (!(activeSlide instanceof HTMLElement)) return null
      const image = activeSlide.querySelector('[data-product-gallery-main-image]')
      return image instanceof HTMLImageElement ? image : null
    }

    const setModalOpen = (open) => {
      if (!(modal instanceof HTMLElement) || !(modalImage instanceof HTMLImageElement)) return

      if (modalCloseTimer) {
        window.clearTimeout(modalCloseTimer)
        modalCloseTimer = null
      }

      if (open) {
        const activeImage = getActiveImage()
        if (!(activeImage instanceof HTMLImageElement)) return

        modalImage.src = activeImage.currentSrc || activeImage.src
        modalImage.alt = activeImage.alt || ''
        modal.hidden = false
        modal.setAttribute('aria-hidden', 'false')
        window.requestAnimationFrame(() => {
          modal.dataset.open = 'true'
        })
        return
      }

      modal.dataset.open = 'false'
      modal.setAttribute('aria-hidden', 'true')
      modalCloseTimer = window.setTimeout(() => {
        modal.hidden = true
        modalImage.removeAttribute('src')
        modalImage.alt = ''
        modalCloseTimer = null
      }, 260)
    }

    const maxIndex = Math.max(0, slides.length - 1)

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

    root.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return

      if (!stage.contains(target)) return
      if (target.closest('[data-product-gallery-prev], [data-product-gallery-next]')) return
      event.preventDefault()
      setModalOpen(true)
    })

    for (const closeButton of modalCloseButtons) {
      if (!(closeButton instanceof HTMLButtonElement)) continue
      closeButton.addEventListener('click', () => setModalOpen(false))
    }

    const handleGalleryKeydown = (event) => {
      if (event.key === 'Escape') {
        setModalOpen(false)
      }
    }
    document.addEventListener('keydown', handleGalleryKeydown)

    const resetStageDrag = ({ animate = true } = {}) => {
      if (!(stage instanceof HTMLElement)) return
      stage.style.setProperty('--product-gallery-drag-offset', '0px')
      stage.dataset.dragging = 'false'
      stage.dataset.dragAnimate = animate ? 'true' : 'false'
    }

    const swipeController = createSwipeController({
        element: stage,
        threshold: SWIPE_PROGRESS_THRESHOLD,
        isEnabled: () => slides.length > 1,
        getIndex: () => activeIndex,
        getMaxIndex: () => maxIndex,
        getWidth: () => stage.clientWidth || 1,
        shouldIgnoreTarget: (target) => {
          const interactiveTarget = target instanceof Element
            ? target.closest('a, button, input, select, textarea, summary')
            : null
          return Boolean(interactiveTarget && stage.contains(interactiveTarget))
        },
        onStart: () => {
          stage.dataset.dragging = 'true'
          stage.dataset.dragAnimate = 'false'
          stage.style.setProperty('--product-gallery-drag-offset', '0px')
        },
        onMove: ({ offsetX }) => {
          stage.style.setProperty('--product-gallery-drag-offset', `${offsetX}px`)
        },
        onRelease: ({ index }) => {
          resetStageDrag({ animate: true })
          setActiveIndex(index)
        },
        onCancel: () => resetStageDrag({ animate: true }),
      })

    setActiveIndex(activeIndex)
    syncButtons()
    resetStageDrag({ animate: false })
    root.__productGallerySwipeCleanup = () => {
      swipeController?.destroy()
      document.removeEventListener('keydown', handleGalleryKeydown)
    }
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
  const drag = {
    active: false,
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
    if (document.hidden) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    autoplayTimer = window.setTimeout(() => {
      autoplayTimer = null
      try {
        next()
      } catch {
        // defensive: keep the loop alive even if next() throws
      }
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

  const swipeController = createSwipeController({
    element: viewport,
    threshold: SWIPE_PROGRESS_THRESHOLD,
    isEnabled: hasMultiple,
    getIndex: () => currentIndex,
    getMaxIndex: () => maxIndex,
    getWidth: slideWidth,
    shouldIgnoreTarget: (target) => {
      const interactiveTarget = target instanceof Element
        ? target.closest('a, button, input, select, textarea, summary')
        : null
      return Boolean(interactiveTarget && viewport.contains(interactiveTarget))
    },
    onStart: () => {
      stopAutoplay()
      drag.active = true
      drag.offsetX = 0
      updateTrack({ animate: false })
    },
    onMove: ({ offsetX }) => {
      drag.offsetX = offsetX
      updateTrack({ animate: false })
    },
    onRelease: ({ index }) => {
      drag.active = false
      drag.offsetX = 0
      goTo(index, { animate: true, force: true })
      startAutoplay()
    },
    onCancel: () => {
      drag.active = false
      drag.offsetX = 0
      updateTrack({ animate: true })
      startAutoplay()
    },
  })

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
  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopAutoplay()
    } else {
      startAutoplay()
    }
  }

  const resizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateTrack({ animate: false }))
      : null
  resizeObserver?.observe(viewport)

  prevButton?.addEventListener('click', handlePrevClick)
  nextButton?.addEventListener('click', handleNextClick)
  dots?.addEventListener('click', handleDotClick)
  root.addEventListener('mouseenter', handleMouseEnter)
  root.addEventListener('mouseleave', handleMouseLeave)
  root.addEventListener('focusin', handleFocusIn)
  root.addEventListener('focusout', handleFocusOut)
  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  syncSlides()
  syncDots()
  syncControls()
  updateTrack({ animate: false })
  startAutoplay()

  const destroy = () => {
    stopAutoplay()
    swipeController?.destroy()
    prevButton?.removeEventListener('click', handlePrevClick)
    nextButton?.removeEventListener('click', handleNextClick)
    dots?.removeEventListener('click', handleDotClick)
    root.removeEventListener('mouseenter', handleMouseEnter)
    root.removeEventListener('mouseleave', handleMouseLeave)
    root.removeEventListener('focusin', handleFocusIn)
    root.removeEventListener('focusout', handleFocusOut)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    resizeObserver?.disconnect()
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

const getVariantStock = (variant) => {
  if (!variant || typeof variant.stock !== 'number') return null
  return Math.max(0, variant.stock)
}

const sanitizeQuantityValue = (value, max = null) => {
  const parsed = Number.parseInt(String(value), 10)
  const minimum = 1
  const quantity = Number.isFinite(parsed) ? parsed : minimum
  if (typeof max === 'number' && max > 0) return Math.min(Math.max(quantity, minimum), max)
  return Math.max(quantity, minimum)
}

const syncProductQuantityRoot = (root) => {
  if (!(root instanceof HTMLElement)) return

  const input = root.querySelector('[data-product-quantity-input]')
  const decrement = root.querySelector('[data-product-quantity-decrement]')
  const increment = root.querySelector('[data-product-quantity-increment]')
  if (!(input instanceof HTMLInputElement)) return

  const maxValue = Number(root.dataset.quantityMax)
  const max = Number.isFinite(maxValue) ? maxValue : null
  const disabled = root.dataset.quantityDisabled === 'true'

  if (max == null) {
    input.removeAttribute('max')
  } else {
    input.max = String(max)
  }

  input.disabled = disabled
  input.value = String(sanitizeQuantityValue(input.value, max))

  const quantity = Number.parseInt(input.value, 10) || 1
  if (decrement instanceof HTMLButtonElement) {
    decrement.disabled = disabled || quantity <= 1
  }
  if (increment instanceof HTMLButtonElement) {
    increment.disabled = disabled || (typeof max === 'number' && quantity >= max)
  }
}

const setProductQuantityStock = (productRoot, variant) => {
  if (!(productRoot instanceof HTMLElement)) return

  const stock = getVariantStock(variant)
  for (const root of productRoot.querySelectorAll('[data-product-quantity-root]')) {
    if (!(root instanceof HTMLElement)) continue

    if (stock == null) {
      delete root.dataset.quantityMax
      delete root.dataset.quantityDisabled
    } else {
      root.dataset.quantityMax = String(stock)
      root.dataset.quantityDisabled = stock <= 0 ? 'true' : 'false'
    }

    syncProductQuantityRoot(root)
  }
}

const getProductQuantity = (productRoot) => {
  const root = productRoot?.querySelector('[data-product-quantity-root]')
  const input = root?.querySelector('[data-product-quantity-input]')
  if (!(root instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return 1

  syncProductQuantityRoot(root)
  return sanitizeQuantityValue(input.value, Number.isFinite(Number(root.dataset.quantityMax)) ? Number(root.dataset.quantityMax) : null)
}

const validateProductQuantity = (productRoot, variant) => {
  const root = productRoot?.querySelector('[data-product-quantity-root]')
  const input = root?.querySelector('[data-product-quantity-input]')
  if (!(root instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return true

  const requestedQuantity = Number.parseInt(input.value, 10) || 1
  const variantStock = getVariantStock(variant)
  const maxValue = Number(root.dataset.quantityMax)
  const max = variantStock ?? (Number.isFinite(maxValue) ? maxValue : null)

  if (typeof max === 'number' && requestedQuantity > max) {
    window.notify(root.dataset.stockAlert || 'No hay suficiente stock para la cantidad seleccionada.', { type: 'error' })
    syncProductQuantityRoot(root)
    return false
  }

  return true
}

const initProductQuantityInputs = (scope = document) => {
  const root = scope instanceof HTMLElement ? scope : document.documentElement
  const quantityRoots = root.matches('[data-product-quantity-root]')
    ? [root]
    : Array.from(root.querySelectorAll('[data-product-quantity-root]'))

  for (const quantityRoot of quantityRoots) {
    if (!(quantityRoot instanceof HTMLElement)) continue
    if (quantityRoot.dataset.quantityBound === 'true') continue

    quantityRoot.dataset.quantityBound = 'true'
    const input = quantityRoot.querySelector('[data-product-quantity-input]')
    const decrement = quantityRoot.querySelector('[data-product-quantity-decrement]')
    const increment = quantityRoot.querySelector('[data-product-quantity-increment]')

    if (decrement instanceof HTMLButtonElement) {
      decrement.addEventListener('click', () => {
        if (!(input instanceof HTMLInputElement)) return
        input.value = String((Number.parseInt(input.value, 10) || 1) - 1)
        syncProductQuantityRoot(quantityRoot)
      })
    }

    if (increment instanceof HTMLButtonElement) {
      increment.addEventListener('click', () => {
        if (!(input instanceof HTMLInputElement)) return
        input.value = String((Number.parseInt(input.value, 10) || 1) + 1)
        syncProductQuantityRoot(quantityRoot)
      })
    }

    if (input instanceof HTMLInputElement) {
      input.addEventListener('input', () => {
        const maxValue = Number(quantityRoot.dataset.quantityMax)
        const max = Number.isFinite(maxValue) ? maxValue : null
        const requestedQuantity = Number.parseInt(input.value, 10)
        if (typeof max === 'number' && Number.isFinite(requestedQuantity) && requestedQuantity > max) {
          window.notify(quantityRoot.dataset.stockAlert || 'No hay suficiente stock para la cantidad seleccionada.', { type: 'error' })
        }
        syncProductQuantityRoot(quantityRoot)
      })
      input.addEventListener('change', () => syncProductQuantityRoot(quantityRoot))
    }

    syncProductQuantityRoot(quantityRoot)
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
      return
    }

    delete addToCartButton.dataset.productVariantId
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
    setProductQuantityStock(productRoot, currentVariant)
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
          window.notify('Seleccioná una opción antes de agregar al carrito', { type: 'error' })
          return
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

        if (!validateProductQuantity(productRoot, variant)) return
        const quantity = getProductQuantity(productRoot)

        await tiendu.cart.addProductVariant(
          variant,
          quantity,
          ({ updatedCartItemsQuantity }) => setCartQuantity(updatedCartItemsQuantity),
          productData
        )
        window.notify('Producto agregado al carrito', { type: 'success' })
      }
    } catch {
      window.notify(
        action === 'cart'
          ? 'No se pudo abrir el carrito'
          : action === 'add_to_cart'
            ? 'No se pudo agregar el producto al carrito'
            : 'No se pudo abrir el buscador',
        { type: 'error' }
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
    const defaultButtonText = submitButton instanceof HTMLButtonElement ? submitButton.innerText.trim() : 'Suscribirme'

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      if (!(emailInput instanceof HTMLInputElement)) return

      const email = emailInput.value.trim()
      if (!isValidEmail(email)) {
        window.notify('Por favor ingresá un email válido.', { type: 'error' })
        return
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true
        submitButton.textContent = 'Enviando...'
      }

      try {
        const tiendu = getTiendu()
        await tiendu.subscribers.add(email)
        window.notify('¡Te mandamos un email! Ahora solo te falta tocar el botón de ese email para confirmar tu subscripción.', { type: 'success' })
        emailInput.value = ''

        const popupRoot = form.closest('[data-newsletter-popup-root]')
        if (popupRoot instanceof HTMLElement) {
          dismissPopup(popupRoot)
        }
      } catch {
        window.notify('No se pudo completar la suscripción. Intentá de nuevo más tarde.', { type: 'error' })
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false
          submitButton.textContent = defaultButtonText
        }
      }
    })
  }
}

const initCollectionSorts = () => {
  const selects = Array.from(document.querySelectorAll('[data-collection-sort] select'))

  for (const select of selects) {
    if (!(select instanceof HTMLSelectElement)) continue
    if (select.dataset.sortBound === 'true') continue

    select.dataset.sortBound = 'true'
    select.addEventListener('change', () => {
      const value = select.value
      const url = new URL(window.location.href)
      url.searchParams.set('sort_by', value)
      window.location.href = url.toString()
    })
  }
}

const initBreadcrumbContextLinks = () => {
  if (document.documentElement.dataset.breadcrumbContextBound === 'true') return
  document.documentElement.dataset.breadcrumbContextBound = 'true'

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element
      ? event.target.closest('[data-breadcrumb-from-current]')
      : null
    if (!(link instanceof HTMLAnchorElement)) return

    const fromTitle = String(link.dataset.breadcrumbFromTitle || '').trim()
    if (!fromTitle) return

    const fromUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    try {
      const nextUrl = new URL(link.getAttribute('href') || link.href, window.location.origin)
      nextUrl.searchParams.set('from-title', fromTitle)
      nextUrl.searchParams.set('from-url', fromUrl)
      link.href = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    } catch {
      // Keep the server-rendered fallback href.
    }
  })
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
  initProductQuantityInputs()
  initCarousels()
  initCollectionSorts()
  initBreadcrumbContextLinks()

  if (buttons.some((button) => button.dataset.buttonAction === 'cart')) {
    void syncCartQuantity()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initButtonActions)
} else {
  initButtonActions()
}
