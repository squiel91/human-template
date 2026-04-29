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
