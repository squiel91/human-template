import { getTiendu } from 'theme-core'

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

const getSharedVariantStock = (variants) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { consistent: false, stock: null }
  }

  const firstStock = getVariantStock(variants[0])
  const consistent = variants.every((variant) => getVariantStock(variant) === firstStock)

  return {
    consistent,
    stock: consistent ? firstStock : null,
  }
}

const getProductStockStatusContent = (root, stock) => {
  if (!(root instanceof HTMLElement)) {
    return { tone: 'neutral', message: '' }
  }

  if (typeof stock === 'number') {
    if (stock > 0) {
      const prefix = String(root.dataset.stockLabelCountPrefix || 'Tenemos').trim()
      const suffix = String(root.dataset.stockLabelCountSuffix || 'en stock').trim()
      return {
        tone: 'warning',
        message: `${prefix} ${stock} ${suffix}`.trim(),
      }
    }

    return {
      tone: 'error',
      message: String(root.dataset.stockLabelUnavailable || 'No tenemos en stock').trim(),
    }
  }

  return {
    tone: 'success',
    message: String(root.dataset.stockLabelAvailable || 'Tenemos en stock').trim(),
  }
}

const syncProductStockStatus = (productRoot, { variants = [], currentVariant = null, isSelectionComplete = false } = {}) => {
  if (!(productRoot instanceof HTMLElement)) return

  const sharedStock = getSharedVariantStock(variants)
  for (const root of productRoot.querySelectorAll('[data-product-stock-status-root]')) {
    if (!(root instanceof HTMLElement)) continue

    let nextStatus = {
      tone: 'neutral',
      message: String(root.dataset.stockLabelUnselected || 'Selecciona una para ver el stock.').trim(),
    }

    if (isSelectionComplete && currentVariant) {
      nextStatus = getProductStockStatusContent(root, getVariantStock(currentVariant))
    } else if (variants.length <= 1 || sharedStock.consistent) {
      nextStatus = getProductStockStatusContent(root, sharedStock.stock)
    }

    root.dataset.stockTone = nextStatus.tone
    const messageNode = root.querySelector('[data-product-stock-status-message]')
    if (messageNode instanceof HTMLElement) {
      messageNode.textContent = nextStatus.message
    }
  }
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

export const getProductQuantity = (productRoot) => {
  const root = productRoot?.querySelector('[data-product-quantity-root]')
  const input = root?.querySelector('[data-product-quantity-input]')
  if (!(root instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return 1

  syncProductQuantityRoot(root)
  return sanitizeQuantityValue(input.value, Number.isFinite(Number(root.dataset.quantityMax)) ? Number(root.dataset.quantityMax) : null)
}

export const validateProductQuantity = (productRoot, variant) => {
  const root = productRoot?.querySelector('[data-product-quantity-root]')
  const input = root?.querySelector('[data-product-quantity-input]')
  if (!(root instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return true

  const requestedQuantity = Number.parseInt(input.value, 10) || 1
  const variantStock = getVariantStock(variant)
  const maxValue = Number(root.dataset.quantityMax)
  const max = variantStock ?? (Number.isFinite(maxValue) ? Number(maxValue) : null)

  if (typeof max === 'number' && requestedQuantity > max) {
    window.notify(root.dataset.stockAlert || 'No hay suficiente stock para la cantidad seleccionada.', { type: 'error' })
    syncProductQuantityRoot(root)
    return false
  }

  return true
}

export const initProductQuantityInputs = (scope = document) => {
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

export const initVariantSelectors = () => {
  const productRoot = document.querySelector('.t-main-product[data-product-root]')
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
    syncProductStockStatus(productRoot, { variants, currentVariant, isSelectionComplete: isSelectionComplete() })
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

export const initProductViewTracking = () => {
  const productRoot = document.querySelector('.t-main-product[data-product-root]')
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
