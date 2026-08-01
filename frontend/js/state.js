const AppState = {
  selectedSuburbId: null,
  allSuburbs: [],
  _selectListeners: [],
  _suburbsLoadedListeners: [],

  select(suburbId) {
    this.selectedSuburbId = suburbId;
    this._selectListeners.forEach((fn) => fn(suburbId));
  },

  onSelect(fn) {
    this._selectListeners.push(fn);
  },

  setSuburbs(suburbs) {
    this.allSuburbs = suburbs;
    this._suburbsLoadedListeners.forEach((fn) => fn(suburbs));
  },

  onSuburbsLoaded(fn) {
    this._suburbsLoadedListeners.push(fn);
  },
};
