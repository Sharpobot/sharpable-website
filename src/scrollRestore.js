// Shared sessionStorage key for handing the home page's scroll position across a route change —
// Footer.jsx writes it before navigating to /privacy or /terms, App.jsx reads (and clears) it on
// mount so returning via "Back to home" lands back where the user actually was.
export const HOME_SCROLL_KEY = 'sharpable-scroll-y'
