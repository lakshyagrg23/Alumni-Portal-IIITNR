import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop Component
 * Automatically scrolls to top of page on route change
 * This ensures consistent navigation behavior across the app
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll to top instantly when route changes
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
