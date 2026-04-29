export const initCollectionSorts = () => {
  const selects = Array.from(document.querySelectorAll('[data-collection-sort] select'))

  for (const select of selects) {
    if (!(select instanceof HTMLSelectElement)) continue
    if (select.dataset.sortBound === 'true') continue

    select.dataset.sortBound = 'true'
    select.addEventListener('change', () => {
      const value = select.value
      const url = new URL(window.location.href)
      url.searchParams.set('sort_by', value)
      url.searchParams.delete('page')
      window.location.href = url.toString()
    })
  }
}

export const initBreadcrumbContextLinks = () => {
  if (document.documentElement.dataset.breadcrumbContextBound === 'true') return
  document.documentElement.dataset.breadcrumbContextBound = 'true'

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element
      ? event.target.closest('[data-breadcrumb-from-current]')
      : null
    if (!(link instanceof HTMLAnchorElement)) return

    const fromTitle = String(link.dataset.breadcrumbFromTitle || '').trim()
    if (!fromTitle) return

    const fromUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    try {
      const nextUrl = new URL(link.getAttribute('href') || link.href, window.location.origin)
      nextUrl.searchParams.set('from-title', fromTitle)
      nextUrl.searchParams.set('from-url', fromUrl)
      link.href = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    } catch {
      // Keep the server-rendered fallback href.
    }
  })
}
