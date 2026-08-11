/*
 * Slide-in/out side panel. Collapsed (zero width, hidden from layout and
 * assistive tech) by default and whenever nothing is selected; opens when
 * AppState.select() fires, closes on AppState.deselect() (wired to the
 * close button here). Doesn't touch the existing selection plumbing in
 * state.js or the sidebar rendering in sidebar.js — this only reacts to it.
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

  // Leaflet doesn't know its container resized until told — without this the
  // map keeps its old tile layout and shows grey gaps/misaligned tiles once
  // the panel's slide animation changes .map-pane's width. Only fires once
  // per transition (flex-basis is the one property actually animating).
  panel.addEventListener("transitionend", (e) => {
    if (e.propertyName === "flex-basis") invalidateMapSize();
  });

  closePanel();
});
