## 2026-06-15 - [CSS Transitions & Animations Pattern]
**Learning:** In a Vanilla JS Single Page Application (SPA), CSS animations on main content areas need to be manually re-triggered on navigation if the parent element remains in the DOM.
**Action:** Use `element.classList.remove('animation-class'); void element.offsetWidth; element.classList.add('animation-class');` to ensure smooth entrance animations during SPA route changes.

## 2026-06-15 - [UI Component Library Consistency]
**Learning:** When extending a legacy Vanilla JS dashboard with modern UI features like "Copy to Clipboard", ensure all utility functions are properly scoped to the global `window.ui` object to maintain compatibility with dynamically rendered HTML strings.
**Action:** Always verify `window.ui` methods before calling them in template literals across different JS modules.
