const AppState = {
  selectedSuburbId: null,
  // The currently-viewed council's suburbs (used by filters.js) — NOT every
  // Melbourne suburb, since suburb detail (incl. boundaries) is only
  // fetched per-council now. See allSuburbNames for a global lookup.
  allSuburbs: [],
  // Every suburb, name/id only (no boundary) — loaded once at startup.
  // Used to resolve "similar suburbs" names, which can point to a suburb in
  // a different council than the one currently being viewed.
  allSuburbNames: [],
  _selectListeners: [],
  _deselectListeners: [],
  _suburbsLoadedListeners: [],

  select(suburbId) {
    this.selectedSuburbId = suburbId;
    this._selectListeners.forEach((fn) => fn(suburbId));
  },

  onSelect(fn) {
    this._selectListeners.push(fn);
  },

  // Clears the current selection — e.g. the side panel's close button. No
  // prior deselect concept existed; this mirrors select()/onSelect() so
  // listeners (panel.js) can react without reaching into selectedSuburbId.
  deselect() {
    this.selectedSuburbId = null;
    this._deselectListeners.forEach((fn) => fn());
  },

  onDeselect(fn) {
    this._deselectListeners.push(fn);
  },

  setSuburbs(suburbs) {
    this.allSuburbs = suburbs;
    this._suburbsLoadedListeners.forEach((fn) => fn(suburbs));
  },

  onSuburbsLoaded(fn) {
    this._suburbsLoadedListeners.push(fn);
  },

  setAllSuburbNames(suburbs) {
    this.allSuburbNames = suburbs;
  },
};
