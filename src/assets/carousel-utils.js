export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const createSwipeController = ({
  element,
  getIndex,
  getMaxIndex,
  getWidth,
  isEnabled = () => true,
  onStart = () => {},
  onMove = () => {},
  onRelease = () => {},
  onCancel = () => {},
  shouldIgnoreTarget = () => false,
  threshold = 0.25,
  edgeResistance = 0.35,
  suppressClickDistance = 6,
}) => {
  if (!(element instanceof HTMLElement)) return null

  let suppressClick = false
  const drag = {
    active: false,
    pointerId: null,
    startX: 0,
    offsetX: 0,
  }

  const width = () => Math.max(Number(getWidth()) || element.clientWidth || 1, 1)
  const maxIndex = () => Math.max(0, Number(getMaxIndex()) || 0)
  const currentIndex = () => clamp(Number(getIndex()) || 0, 0, maxIndex())

  const resolveReleaseIndex = (offsetX) => {
    const swipeThreshold = width() * threshold
    const index = currentIndex()
    const lastIndex = maxIndex()

    if (Math.abs(offsetX) < swipeThreshold) return index
    if (offsetX < 0) return clamp(index + 1, 0, lastIndex)
    if (offsetX > 0) return clamp(index - 1, 0, lastIndex)
    return index
  }

  const handlePointerDown = (event) => {
    if (!isEnabled()) return
    if (event.button !== undefined && event.button !== 0) return
    if (shouldIgnoreTarget(event.target)) return

    drag.active = true
    drag.pointerId = event.pointerId
    drag.startX = event.clientX
    drag.offsetX = 0
    element.setPointerCapture?.(event.pointerId)
    element.dataset.dragging = 'true'
    onStart({ event })
  }

  const handlePointerMove = (event) => {
    if (!drag.active) return
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return

    const rawDelta = event.clientX - drag.startX
    const index = currentIndex()
    const lastIndex = maxIndex()
    const offsetX = (index === 0 && rawDelta > 0) || (index === lastIndex && rawDelta < 0)
      ? rawDelta * edgeResistance
      : rawDelta

    drag.offsetX = offsetX
    onMove({ event, offsetX })
  }

  const handlePointerEnd = (event) => {
    if (!drag.active) return
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return

    element.releasePointerCapture?.(event.pointerId)
    element.dataset.dragging = 'false'

    const offsetX = drag.offsetX
    const nextIndex = resolveReleaseIndex(offsetX)
    suppressClick = Math.abs(offsetX) > suppressClickDistance
    drag.active = false
    drag.pointerId = null
    drag.offsetX = 0

    onRelease({ event, offsetX, index: nextIndex })
  }

  const handlePointerCancel = (event) => {
    if (!drag.active) return
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return

    element.releasePointerCapture?.(event.pointerId)
    element.dataset.dragging = 'false'
    drag.active = false
    drag.pointerId = null
    drag.offsetX = 0
    onCancel({ event })
  }

  const handleClick = (event) => {
    if (!suppressClick) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
  }

  element.addEventListener('pointerdown', handlePointerDown)
  element.addEventListener('pointermove', handlePointerMove)
  element.addEventListener('pointerup', handlePointerEnd)
  element.addEventListener('pointercancel', handlePointerCancel)
  element.addEventListener('click', handleClick)

  return {
    destroy() {
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerup', handlePointerEnd)
      element.removeEventListener('pointercancel', handlePointerCancel)
      element.removeEventListener('click', handleClick)
    },
  }
}
