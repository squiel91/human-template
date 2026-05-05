import Tiendu from 'tiendu-sdk'

export const getTiendu = () => Tiendu()

export const setActionButtonLoading = (button, loading) => {
  const loader = button.querySelector('[data-button-loader]')
  button.dataset.loading = loading ? 'true' : 'false'
  if (loader) loader.hidden = !loading

  // Legacy fallback for old button markup with data-button-action-icon
  for (const iconNode of button.querySelectorAll('[data-button-action-icon]')) {
    iconNode.hidden = iconNode.dataset.buttonActionIcon !== (loading ? 'loader' : 'default')
  }
}

export const setCartQuantity = (quantity) => {
  const badge = document.getElementById('cart-quantity-badge')
  if (!(badge instanceof HTMLElement)) return

  const nextQuantity = Math.max(0, Number(quantity) || 0)
  badge.textContent = String(nextQuantity)
  badge.hidden = nextQuantity <= 0
}

export const syncCartQuantity = async () => {
  try {
    const tiendu = getTiendu()
    const { quantity } = await tiendu.cart.getQuantity()
    setCartQuantity(quantity)
  } catch {
    setCartQuantity(0)
  }
}

export const initFlyInIntros = (scope = document) => {
  const root = scope instanceof HTMLElement ? scope : document.documentElement
  const sections = root.matches('[data-fly-in-intro]')
    ? [root]
    : Array.from(root.querySelectorAll('[data-fly-in-intro]'))

  if (sections.length === 0) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const reveal = (section) => {
    section.dataset.flyInVisible = 'true'
  }

  const canReveal = (section) => {
    const rect = section.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    return rect.top < viewportHeight && rect.bottom > 0
  }

  for (const section of sections) {
    if (!(section instanceof HTMLElement)) continue
    section.dataset.flyInReady = 'true'

    if (prefersReducedMotion || canReveal(section)) {
      reveal(section)
    }
  }

  if (prefersReducedMotion) return

  if (!('IntersectionObserver' in window)) {
    for (const section of sections) {
      if (section instanceof HTMLElement) reveal(section)
    }
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        reveal(entry.target)
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px 160px 0px', threshold: 0 }
  )

  for (const section of sections) {
    if (
      section instanceof HTMLElement &&
      section.dataset.flyInVisible !== 'true' &&
      section.dataset.flyInObserved !== 'true'
    ) {
      section.dataset.flyInObserved = 'true'
      observer.observe(section)
    }
  }

  requestAnimationFrame(() => {
    for (const section of sections) {
      if (section instanceof HTMLElement && section.dataset.flyInVisible !== 'true' && canReveal(section)) {
        reveal(section)
        observer.unobserve(section)
      }
    }
  })
}
