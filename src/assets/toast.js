let container = null

const getContainer = () => {
  if (container) return container
  container = document.createElement('div')
  container.className = 't-toast-container'
  container.setAttribute('role', 'region')
  container.setAttribute('aria-live', 'polite')
  container.setAttribute('aria-label', 'Notificaciones')
  document.body.appendChild(container)
  return container
}

const removeToast = (el) => {
  el.classList.add('t-toast--exiting')
  el.addEventListener('transitionend', () => el.remove(), { once: true })
}

const showToast = (message, { type = 'info', duration = 4000 } = {}) => {
  const el = document.createElement('div')
  el.className = `t-toast t-toast--${type}`
  el.setAttribute('role', type === 'error' ? 'alert' : 'status')

  const body = document.createElement('span')
  body.className = 't-toast__body'
  body.textContent = message

  const closeBtn = document.createElement('button')
  closeBtn.className = 't-toast__close'
  closeBtn.type = 'button'
  closeBtn.setAttribute('aria-label', 'Cerrar notificación')
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`

  closeBtn.addEventListener('click', () => removeToast(el))

  const progress = document.createElement('span')
  progress.className = 't-toast__progress'
  progress.style.animationDuration = `${duration}ms`

  el.appendChild(body)
  el.appendChild(closeBtn)
  el.appendChild(progress)
  getContainer().appendChild(el)

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add('t-toast--visible')
    })
  })

  // Auto-dismiss
  if (duration > 0) {
    const timer = setTimeout(() => removeToast(el), duration)
    el.addEventListener('mouseenter', () => {
      clearTimeout(timer)
      progress.style.animationPlayState = 'paused'
    }, { once: true })
    el.addEventListener('mouseleave', () => {
      progress.style.animationPlayState = 'running'
    }, { once: true })
  }
}

window.notify = showToast
