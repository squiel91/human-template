const POPUP_STORAGE_PREFIX = 'tiendu:popup:'

export const setSideMenuOpen = (open) => {
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
    document.body.classList.add('t-side-menu-open')
    return
  }

  root.dataset.closing = 'true'
  root.dataset.open = 'false'
  document.body.classList.remove('t-side-menu-open')
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
  document.body.classList.toggle('t-popup-open', Boolean(hasOpenPopup))
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

export const dismissPopup = (root, persist = true) => {
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

export const initSideMenu = () => {
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

export const initNewsletterPopups = () => {
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

export const initProductShareButtons = () => {
  const buttons = Array.from(document.querySelectorAll('[data-button-action="share"]'))
  for (const button of buttons) {
    if (!(button instanceof HTMLButtonElement)) continue
    if (button.dataset.shareBound === 'true') continue

    button.dataset.shareBound = 'true'

    button.addEventListener('click', async (event) => {
      event.preventDefault()
      const canUseWebShare = typeof navigator.share === 'function'

      try {
        if (canUseWebShare) {
          await navigator.share({
            title: document.title,
            url: window.location.href,
          })
          return
        }

        await navigator.clipboard.writeText(window.location.href)
        window.notify('Link copiado', { type: 'success' })
      } catch {
        if (!canUseWebShare) {
          window.notify('No se pudo copiar el link', { type: 'error' })
        }
      }
    })
  }
}

export const initStickyHeaders = () => {
  const stickyRoots = Array.from(document.querySelectorAll('[data-header-sticky-root]'))

  for (const stickyRoot of stickyRoots) {
    if (!(stickyRoot instanceof HTMLElement)) continue

    const sectionWrapper = stickyRoot.closest('[data-section-type="header"]')
    const stickyTarget = sectionWrapper instanceof HTMLElement ? sectionWrapper : stickyRoot

    stickyTarget.style.position = 'sticky'
    stickyTarget.style.top = '0'
    stickyTarget.style.zIndex = 'var(--z-sticky-header, 30)'
    stickyTarget.style.width = '100%'

    if (!stickyTarget.style.backgroundColor && stickyRoot instanceof HTMLElement) {
      stickyTarget.style.backgroundColor = stickyRoot.style.backgroundColor || 'white'
    }
  }
}
