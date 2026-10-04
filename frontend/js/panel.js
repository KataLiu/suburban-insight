/**
 * Slide-in/out side panel.
 *
 * Accessibility:
 * - Moves focus to the close button when the panel opens.
 * - Keeps keyboard focus inside the panel while it is open.
 * - Tab from the last control loops back to the close button.
 * - Shift+Tab from the close button loops to the last control.
 * - Escape closes the panel.
 * - Closing restores focus to the element that opened the panel.
 */

document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("sidebar-panel");
  const closeBtn = document.getElementById("panel-close");

  let previouslyFocusedElement = null;

  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");

  function getFocusableElements() {
    return Array.from(panel.querySelectorAll(focusableSelector))
      .filter(element => {
        return !element.hasAttribute("hidden") &&
               element.offsetParent !== null;
      });
  }

  function openPanel() {
    const activeElement = document.activeElement;

    if (
      activeElement &&
      activeElement !== document.body &&
      activeElement !== document.documentElement &&
      !panel.contains(activeElement)
    ) {
      previouslyFocusedElement = activeElement;
    }

    panel.classList.add("panel-open");
    panel.removeAttribute("aria-hidden");

    // Wait until the panel/sidebar has finished rendering,
    // then put keyboard focus on the close button.
    requestAnimationFrame(() => {
      closeBtn.focus();
    });
  }

  function closePanel() {
    panel.classList.remove("panel-open");
    panel.setAttribute("aria-hidden", "true");

    if (
      previouslyFocusedElement &&
      document.contains(previouslyFocusedElement)
    ) {
      previouslyFocusedElement.focus();
    }

    previouslyFocusedElement = null;
  }

  function handlePanelKeydown(event) {
    if (!panel.classList.contains("panel-open")) {
      return;
    }

    // Escape closes the panel.
    if (event.key === "Escape") {
      event.preventDefault();
      AppState.deselect();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements();

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift+Tab from the first element -> last element.
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    // Tab from the last element -> first element.
    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  AppState.onSelect(openPanel);
  AppState.onDeselect(closePanel);

  closeBtn.addEventListener("click", () => AppState.deselect());

  panel.addEventListener("keydown", handlePanelKeydown);

  closePanel();
});