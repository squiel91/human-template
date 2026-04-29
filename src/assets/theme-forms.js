import { getTiendu } from 'theme-core'
import { dismissPopup } from 'theme-overlays'

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase())
}

export const initNewsletterForms = () => {
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
