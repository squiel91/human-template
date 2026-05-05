import 'toast'
import { getTiendu, initFlyInIntros, setActionButtonLoading, setCartQuantity, syncCartQuantity } from 'theme-core'
import { setSideMenuOpen, dismissPopup, initSideMenu, initNewsletterPopups, initProductShareButtons, initStickyHeaders } from 'theme-overlays'
import { initProductGalleries, initCarousels } from 'theme-carousels'
import { getProductQuantity, validateProductQuantity, initProductQuantityInputs, initVariantSelectors, initProductViewTracking } from 'theme-product'
import { initNewsletterForms } from 'theme-forms'
import { initCollectionSorts, initBreadcrumbContextLinks } from 'theme-navigation'

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

  if (buttons.some((button) => button.dataset.buttonAction === 'cart')) {
    void syncCartQuantity()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme)
} else {
  initTheme()
}
