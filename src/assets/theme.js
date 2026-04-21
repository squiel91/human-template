import Tiendu from 'tiendu-sdk'

const getTiendu = () => Tiendu()
const COPY_RESET_MS = 1800

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

  if (buttons.some((button) => button.dataset.buttonAction === 'cart')) {
    void syncCartQuantity()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initButtonActions)
} else {
  initButtonActions()
}
