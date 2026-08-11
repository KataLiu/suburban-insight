/*
 * Slide-in/out side panel — a pure overlay on top of the map (.map-pane's
 * own size never changes, see styles.css), so no Leaflet resize handling
 * is needed here. Collapsed by default and whenever nothing is selected;
 * opens when AppState.select() fires, closes on AppState.deselect() (wired
 * to the close button here). Doesn't touch the existing selection plumbing
 * in state.js or the sidebar rendering in sidebar.js — this only reacts to it.
 */

document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("sidebar-panel");
  const closeBtn = document.getElementById("panel-close");

  function openPanel() {
    panel.classList.add("panel-open");
    panel.removeAttribute("aria-hidden");
  }

  function closePanel() {
    panel.classList.remove("panel-open");
    panel.setAttribute("aria-hidden", "true");
  }

  AppState.onSelect(openPanel);
  AppState.onDeselect(closePanel);

  closeBtn.addEventListener("click", () => AppState.deselect());

  closePanel();
});
