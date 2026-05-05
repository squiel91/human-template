import 'toast'
import { getTiendu, initFlyInIntros, setActionButtonLoading, setCartQuantity, syncCartQuantity } from 'theme-core'
import { setSideMenuOpen, dismissPopup, initSideMenu, initNewsletterPopups, initProductShareButtons, initStickyHeaders } from 'theme-overlays'
import { initProductGalleries, initCarousels } from 'theme-carousels'
import { getProductQuantity, validateProductQuantity, initProductQuantityInputs, initVariantSelectors, initProductViewTracking } from 'theme-product'
import { initNewsletterForms } from 'theme-forms'
import { initCollectionSorts, initBreadcrumbContextLinks } from 'theme-navigation'

const PAGE_TRANSITION_DELAY_MS = 300

const getPageTransition = () => window.__tienduPageTransition || null

const showPageTransition = () => {
  const transition = getPageTransition()
  if (transition && typeof transition.show === 'function') {
    transition.show({ animate: true })
  }
}

const hidePageTransition = () => {
  const transition = getPageTransition()
  if (transition && typeof transition.hide === 'function') {
    transition.hide()
  }
}

const hidePageTransitionImmediately = () => {
  const transition = getPageTransition()
  if (transition && typeof transition.hideImmediately === 'function') {
    transition.hideImmediately()
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

const initPageTransitions = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const overlay = document.getElementById('page-transition-overlay')
  if (!(overlay instanceof HTMLElement)) return

  const maxWaitMs = Math.max(0, Number(overlay.dataset.maxWaitMs || '0') || 0)
  let isNavigating = false

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return
    if ('button' in event && event.button !== 0) return

    const target = event.target instanceof Element ? event.target.closest('a') : null
    if (!(target instanceof HTMLAnchorElement)) return
    if (target.target === '_blank' || target.hasAttribute('download')) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const href = target.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return

    const nextUrl = new URL(target.href, window.location.origin)
    if (nextUrl.origin !== window.location.origin) return
    if (nextUrl.href === window.location.href) return
    if (
      nextUrl.pathname === window.location.pathname &&
      nextUrl.search === window.location.search &&
      nextUrl.hash !== window.location.hash
    ) return

    event.preventDefault()
    isNavigating = true
    showPageTransition()
    window.setTimeout(() => {
      window.location.href = target.href
    }, PAGE_TRANSITION_DELAY_MS)
  })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!isNavigating) hidePageTransition()
    })
  })

  if (maxWaitMs > 0) {
    window.setTimeout(() => {
      if (!isNavigating) hidePageTransition()
    }, maxWaitMs)
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      isNavigating = false
      hidePageTransitionImmediately()
    }
  })

  document.addEventListener('submit', (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    if (event.defaultPrevented) return
    if ((form.method || 'get').toLowerCase() !== 'get') return
    if (form.target === '_blank' || form.hasAttribute('data-skip-page-transition')) return

    isNavigating = true
    showPageTransition()
  })
}

const initTheme = () => {
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
  initFlyInIntros()
  initPageTransitions()

  if (buttons.some((button) => button.dataset.buttonAction === 'cart')) {
    void syncCartQuantity()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme)
} else {
  initTheme()
}
