import { clamp, createSwipeController } from 'carousel-utils'

const SWIPE_PROGRESS_THRESHOLD = 0.25
const CAROUSEL_AUTOPLAY_INTERVAL = 5000

export const initProductGalleries = () => {
  const roots = Array.from(document.querySelectorAll('[data-product-gallery-root]'))

  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue
    if (root.dataset.bound === 'true') continue

    const stage = root.querySelector('[data-product-gallery-stage]')
    const track = root.querySelector('[data-product-gallery-track]')
    const slides = Array.from(root.querySelectorAll('[data-product-gallery-slide]'))
    const thumbs = Array.from(root.querySelectorAll('[data-product-gallery-thumb]'))
    const prevButton = root.querySelector('[data-product-gallery-prev]')
    const nextButton = root.querySelector('[data-product-gallery-next]')
    const modal = root.querySelector('[data-product-gallery-modal]')
    const modalImage = root.querySelector('[data-product-gallery-modal-image]')
    const modalCloseButtons = Array.from(root.querySelectorAll('[data-product-gallery-modal-close]'))

    if (!(stage instanceof HTMLElement) || !(track instanceof HTMLElement) || slides.length === 0) continue

    root.dataset.bound = 'true'
    let modalCloseTimer = null

    let activeIndex = thumbs.findIndex((thumb) => thumb.getAttribute('aria-current') === 'true')
    if (activeIndex < 0) activeIndex = 0

    const syncButtons = () => {
      if (prevButton instanceof HTMLButtonElement) {
        prevButton.disabled = slides.length <= 1
      }

      if (nextButton instanceof HTMLButtonElement) {
        nextButton.disabled = slides.length <= 1
      }
    }

    const setActiveIndex = (index) => {
      const nextIndex = ((index % slides.length) + slides.length) % slides.length
      const nextThumb = thumbs[nextIndex]

      activeIndex = nextIndex
      stage.style.setProperty('--product-gallery-index', String(activeIndex))
      stage.style.setProperty('--product-gallery-drag-offset', '0px')
      stage.dataset.dragAnimate = 'true'

      for (const thumb of thumbs) {
        if (!(thumb instanceof HTMLElement)) continue
        thumb.setAttribute('aria-current', thumb === nextThumb ? 'true' : 'false')
      }

      for (const [slideIndex, slide] of slides.entries()) {
        if (!(slide instanceof HTMLElement)) continue
        slide.setAttribute('aria-hidden', slideIndex === activeIndex ? 'false' : 'true')
      }
    }

    const getActiveImage = () => {
      const activeSlide = slides[activeIndex]
      if (!(activeSlide instanceof HTMLElement)) return null
      const image = activeSlide.querySelector('[data-product-gallery-main-image]')
      return image instanceof HTMLImageElement ? image : null
    }

    const setModalOpen = (open) => {
      if (!(modal instanceof HTMLElement) || !(modalImage instanceof HTMLImageElement)) return

      if (modalCloseTimer) {
        window.clearTimeout(modalCloseTimer)
        modalCloseTimer = null
      }

      if (open) {
        const activeImage = getActiveImage()
        if (!(activeImage instanceof HTMLImageElement)) return

        modalImage.src = activeImage.currentSrc || activeImage.src
        modalImage.alt = activeImage.alt || ''
        document.body.appendChild(modal)
        modal.hidden = false
        modal.setAttribute('aria-hidden', 'false')
        window.requestAnimationFrame(() => {
          modal.dataset.open = 'true'
        })
        return
      }

      modal.dataset.open = 'false'
      modal.setAttribute('aria-hidden', 'true')
      modalCloseTimer = window.setTimeout(() => {
        modal.hidden = true
        modalImage.removeAttribute('src')
        modalImage.alt = ''
        if (root.contains(modal)) {
          // already back in root
        } else {
          root.appendChild(modal)
        }
        modalCloseTimer = null
      }, 260)
    }

    const maxIndex = Math.max(0, slides.length - 1)

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

    root.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return

      if (!stage.contains(target)) return
      if (target.closest('[data-product-gallery-prev], [data-product-gallery-next]')) return
      event.preventDefault()
      setModalOpen(true)
    })

    for (const closeButton of modalCloseButtons) {
      if (!(closeButton instanceof HTMLButtonElement)) continue
      closeButton.addEventListener('click', () => setModalOpen(false))
    }

    const handleGalleryKeydown = (event) => {
      if (event.key === 'Escape') {
        setModalOpen(false)
      }
    }
    document.addEventListener('keydown', handleGalleryKeydown)

    const resetStageDrag = ({ animate = true } = {}) => {
      if (!(stage instanceof HTMLElement)) return
      stage.style.setProperty('--product-gallery-drag-offset', '0px')
      stage.dataset.dragging = 'false'
      stage.dataset.dragAnimate = animate ? 'true' : 'false'
    }

    const swipeController = createSwipeController({
      element: stage,
      threshold: SWIPE_PROGRESS_THRESHOLD,
      isEnabled: () => slides.length > 1,
      getIndex: () => activeIndex,
      getMaxIndex: () => maxIndex,
      getWidth: () => stage.clientWidth || 1,
      shouldIgnoreTarget: (target) => {
        const interactiveTarget = target instanceof Element
          ? target.closest('a, button, input, select, textarea, summary')
          : null
        return Boolean(interactiveTarget && stage.contains(interactiveTarget))
      },
      onStart: () => {
        stage.dataset.dragging = 'true'
        stage.dataset.dragAnimate = 'false'
        stage.style.setProperty('--product-gallery-drag-offset', '0px')
      },
      onMove: ({ offsetX }) => {
        stage.style.setProperty('--product-gallery-drag-offset', `${offsetX}px`)
      },
      onRelease: ({ index }) => {
        resetStageDrag({ animate: true })
        setActiveIndex(index)
      },
      onCancel: () => resetStageDrag({ animate: true }),
    })

    setActiveIndex(activeIndex)
    syncButtons()
    resetStageDrag({ animate: false })
    root.__productGallerySwipeCleanup = () => {
      swipeController?.destroy()
      document.removeEventListener('keydown', handleGalleryKeydown)
    }
  }
}

const createCarousel = (root) => {
  const existingCleanup = root.__tienduCarouselCleanup
  if (typeof existingCleanup === 'function') existingCleanup()

  const viewport = root.querySelector('[data-role="viewport"]')
  const track = root.querySelector('[data-role="track"]')
  const dots = root.querySelector('[data-role="dots"]')
  const prevButton = root.querySelector('[data-role="prev-image"]')
  const nextButton = root.querySelector('[data-role="next-image"]')
  const slides = Array.from(track?.querySelectorAll('[data-t-carousel-slide]') || [])

  if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement) || slides.length === 0) {
    return null
  }

  let currentIndex = 0
  let autoplayTimer = null
  const drag = {
    active: false,
    offsetX: 0,
  }

  const parsedAutoplayInterval = Number(root.dataset.autoplayInterval)
  const autoplayEnabled = root.dataset.autoplayEnabled === 'true'
  const autoplayInterval = Number.isFinite(parsedAutoplayInterval) && parsedAutoplayInterval > 0
    ? parsedAutoplayInterval
    : CAROUSEL_AUTOPLAY_INTERVAL

  const hasMultiple = () => slides.length > 1
  const maxIndex = Math.max(0, slides.length - 1)
  const slideWidth = () => viewport.clientWidth || 1

  const stopAutoplay = () => {
    if (autoplayTimer == null) return
    window.clearTimeout(autoplayTimer)
    autoplayTimer = null
  }

  const queueAutoplay = () => {
    stopAutoplay()
    if (!hasMultiple()) return
    if (!autoplayEnabled) return
    if (document.hidden) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    autoplayTimer = window.setTimeout(() => {
      autoplayTimer = null
      try {
        next()
      } catch {
        // defensive: keep the loop alive even if next() throws
      }
      queueAutoplay()
    }, autoplayInterval)
  }

  const updateTrack = ({ animate }) => {
    const baseTranslate = -currentIndex * slideWidth()
    const dragOffset = drag.active ? drag.offsetX : 0
    track.style.transition = animate && !drag.active
      ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none'
    track.style.transform = `translate3d(${baseTranslate + dragOffset}px, 0, 0)`
  }

  const syncSlides = () => {
    for (const [index, slide] of slides.entries()) {
      slide.setAttribute('aria-hidden', index === currentIndex ? 'false' : 'true')
    }
  }

  const syncDots = () => {
    if (!(dots instanceof HTMLElement)) return
    for (const button of dots.querySelectorAll('[data-dot-index]')) {
      const index = Number(button.getAttribute('data-dot-index'))
      const isActive = index === currentIndex
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-selected', isActive ? 'true' : 'false')
    }
  }

  const syncControls = () => {
    const multiple = hasMultiple()
    if (prevButton instanceof HTMLButtonElement) {
      prevButton.hidden = !multiple
      prevButton.disabled = !multiple
    }
    if (nextButton instanceof HTMLButtonElement) {
      nextButton.hidden = !multiple
      nextButton.disabled = !multiple
    }
    if (dots instanceof HTMLElement) dots.hidden = !multiple
  }

  const goTo = (index, { animate = true, force = false } = {}) => {
    const nextIndex = clamp(index, 0, maxIndex)
    if (nextIndex === currentIndex && !drag.active && !force) return
    currentIndex = nextIndex
    syncSlides()
    syncDots()
    syncControls()
    updateTrack({ animate })
  }

  const next = () => {
    if (!hasMultiple()) return
    goTo(currentIndex === maxIndex ? 0 : currentIndex + 1, {
      animate: true,
      force: currentIndex === maxIndex,
    })
  }

  const prev = () => {
    if (!hasMultiple()) return
    goTo(currentIndex === 0 ? maxIndex : currentIndex - 1, {
      animate: true,
      force: currentIndex === 0,
    })
  }

  const startAutoplay = () => {
    queueAutoplay()
  }

  const swipeController = createSwipeController({
    element: viewport,
    threshold: SWIPE_PROGRESS_THRESHOLD,
    isEnabled: hasMultiple,
    getIndex: () => currentIndex,
    getMaxIndex: () => maxIndex,
    getWidth: slideWidth,
    shouldIgnoreTarget: (target) => {
      const interactiveTarget = target instanceof Element
        ? target.closest('a, button, input, select, textarea, summary')
        : null
      return Boolean(interactiveTarget && viewport.contains(interactiveTarget))
    },
    onStart: () => {
      stopAutoplay()
      drag.active = true
      drag.offsetX = 0
      updateTrack({ animate: false })
    },
    onMove: ({ offsetX }) => {
      drag.offsetX = offsetX
      updateTrack({ animate: false })
    },
    onRelease: ({ index }) => {
      drag.active = false
      drag.offsetX = 0
      goTo(index, { animate: true, force: true })
      startAutoplay()
    },
    onCancel: () => {
      drag.active = false
      drag.offsetX = 0
      updateTrack({ animate: true })
      startAutoplay()
    },
  })

  const handlePrevClick = () => {
    prev()
    startAutoplay()
  }

  const handleNextClick = () => {
    next()
    startAutoplay()
  }

  const handleDotClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-dot-index]') : null
    if (!(button instanceof HTMLButtonElement)) return

    const index = Number(button.dataset.dotIndex)
    if (!Number.isFinite(index)) return

    goTo(index, { animate: true })
    startAutoplay()
  }

  const handleMouseEnter = () => stopAutoplay()
  const handleMouseLeave = () => startAutoplay()
  const handleFocusIn = () => stopAutoplay()
  const handleFocusOut = (event) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return
    startAutoplay()
  }
  const handleResize = () => updateTrack({ animate: false })
  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopAutoplay()
    } else {
      startAutoplay()
    }
  }

  const resizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateTrack({ animate: false }))
      : null
  resizeObserver?.observe(viewport)

  prevButton?.addEventListener('click', handlePrevClick)
  nextButton?.addEventListener('click', handleNextClick)
  dots?.addEventListener('click', handleDotClick)
  root.addEventListener('mouseenter', handleMouseEnter)
  root.addEventListener('mouseleave', handleMouseLeave)
  root.addEventListener('focusin', handleFocusIn)
  root.addEventListener('focusout', handleFocusOut)
  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  syncSlides()
  syncDots()
  syncControls()
  updateTrack({ animate: false })
  startAutoplay()

  const destroy = () => {
    stopAutoplay()
    swipeController?.destroy()
    prevButton?.removeEventListener('click', handlePrevClick)
    nextButton?.removeEventListener('click', handleNextClick)
    dots?.removeEventListener('click', handleDotClick)
    root.removeEventListener('mouseenter', handleMouseEnter)
    root.removeEventListener('mouseleave', handleMouseLeave)
    root.removeEventListener('focusin', handleFocusIn)
    root.removeEventListener('focusout', handleFocusOut)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    resizeObserver?.disconnect()
    delete root.__tienduCarouselCleanup
  }

  root.__tienduCarouselCleanup = destroy
  return { destroy }
}

export const initCarousels = (scope = document) => {
  const root = scope instanceof HTMLElement ? scope : document.documentElement
  const carousels = root.matches('[data-t-carousel]')
    ? [root]
    : Array.from(root.querySelectorAll('[data-t-carousel]'))

  for (const carousel of carousels) {
    createCarousel(carousel)
  }
}
