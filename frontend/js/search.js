/*
 * Header suburb search — configures the shared combobox (suburb-combobox.js)
 * for the map page: source list is AppState.allSuburbNames (loaded once at
 * startup, see state.js), no backend requests here.
 */

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("suburb-search");

  initSuburbCombobox({
    input,
    list: document.getElementById("suburb-search-results"),
    wrap: document.getElementById("suburb-search-wrap"),
    status: document.getElementById("suburb-search-status"),
    getSuburbs: () => AppState.allSuburbNames,
    onChoose: (suburb) => {
      input.value = suburb.name;

      // Same selection path as the sidebar's "similar suburb" buttons — see
      // sidebar.js wireSimilarSuburbs(). Works regardless of which council is
      // currently on the map; only the sidebar is guaranteed to update.
      AppState.select(suburb.id);

      // TODO (v2): auto-switch the map to the suburb's own council view when
      // it isn't the one currently displayed. Needs a council-name -> council-id
      // lookup first — allSuburbNames only carries the council *name* (e.g.
      // "Yarra"), not the id loadSuburbView() needs (e.g. "council-yarra") —
      // then call loadSuburbView(councilId, councilName) before focusing.
      // Out of scope for this pass; for now the map just stays put when the
      // result belongs to a different council than the one on screen.
      focusSuburb(suburb.id);
    },
  });
});
