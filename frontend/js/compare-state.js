/*
 * Persists the active comparison set across index.html <-> compare.html
 * navigation. localStorage (not a query string) per docs/architecture.md —
 * there's no backend session, and this is the simplest option that survives
 * navigating between the two pages.
 */
const CompareState = {
  STORAGE_KEY: "suburbanInsight.compareIds",
  MAX_SUBURBS: 4,

  getIds() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setIds(ids) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
  },

  has(suburbId) {
    return this.getIds().includes(suburbId);
  },

  add(suburbId) {
    const ids = this.getIds();
    if (!ids.includes(suburbId) && ids.length < this.MAX_SUBURBS) {
      ids.push(suburbId);
      this.setIds(ids);
    }
    return ids;
  },

  remove(suburbId) {
    const ids = this.getIds().filter((id) => id !== suburbId);
    this.setIds(ids);
    return ids;
  },
};
