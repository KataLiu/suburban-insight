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
    onChoose: async (suburb) => {
      input.value = suburb.name;

      // Awaited before AppState.select() below — focusSuburbAnywhere() may
      // drill into a different council via loadSuburbView(), which renders
      // its own "now click a suburb" placeholder into #sidebar the moment
      // it starts. Firing these two concurrently races both of them for
      // #sidebar's content: if loadSuburbView's placeholder lands *after*
      // the sidebar has already rendered this suburb's real profile, it
      // clobbers it right back to the placeholder. Sequencing them removes
      // the race — the placeholder (if any) always settles first.
      await focusSuburbAnywhere(suburb);

      // Same selection path as the sidebar's "similar suburb" buttons — see
      // sidebar.js wireSimilarSuburbs(). Moves keyboard focus into the panel
      // once it renders (sidebar.js renderSidebar()), so choosing a result
      // doesn't strand focus on this input.
      AppState.select(suburb.id);
    },
  });
});
