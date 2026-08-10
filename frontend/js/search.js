/*
 * Suburb search box with autocomplete. Filters client-side against
 * AppState.allSuburbNames (loaded once at startup — see state.js) — no
 * backend requests here.
 */

const SEARCH_MAX_RESULTS = 8;

let searchResults = [];
let searchActiveIndex = -1;

function initSuburbSearch() {
  const input = document.getElementById("suburb-search");
  const list = document.getElementById("suburb-search-results");
  const wrap = document.getElementById("suburb-search-wrap");

  input.addEventListener("input", () => {
    renderSearchResults(input, list, input.value.trim());
  });

  input.addEventListener("keydown", (e) => {
    if (list.classList.contains("hidden") && e.key !== "Escape") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveResult(input, list, Math.min(searchActiveIndex + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveResult(input, list, Math.max(searchActiveIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (searchActiveIndex >= 0 && searchResults[searchActiveIndex]) {
        e.preventDefault();
        chooseSuburb(searchResults[searchActiveIndex]);
        closeSearchResults(input, list);
      }
    } else if (e.key === "Escape") {
      closeSearchResults(input, list);
    }
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) closeSearchResults(input, list);
  });
}

function renderSearchResults(input, list, query) {
  if (!query) {
    closeSearchResults(input, list);
    return;
  }

  const q = query.toLowerCase();
  searchResults = AppState.allSuburbNames
    .filter((s) => s.name.toLowerCase().includes(q))
    .slice(0, SEARCH_MAX_RESULTS);
  searchActiveIndex = -1;
  input.setAttribute("aria-expanded", "true");
  input.removeAttribute("aria-activedescendant");

  const status = document.getElementById("suburb-search-status");

  if (!searchResults.length) {
    // role="presentation" — this isn't a selectable option, so it shouldn't
    // be counted by assistive tech navigating the listbox; the live region
    // below is what actually announces "no results" to screen readers.
    list.innerHTML = '<li class="suburb-search-empty muted" role="presentation">No suburbs match.</li>';
    list.classList.remove("hidden");
    status.textContent = "No suburbs match.";
    return;
  }

  list.innerHTML = searchResults
    .map(
      (s, i) => `
        <li
          id="suburb-search-option-${i}"
          class="suburb-search-option"
          role="option"
          aria-selected="false"
          data-index="${i}"
        >${s.name} &mdash; ${s.council || "Unknown council"}</li>
      `
    )
    .join("");

  list.querySelectorAll(".suburb-search-option").forEach((li) => {
    li.addEventListener("click", () => {
      const idx = Number(li.dataset.index);
      chooseSuburb(searchResults[idx]);
      closeSearchResults(input, list);
    });
  });

  list.classList.remove("hidden");
  status.textContent = `${searchResults.length} suburb${searchResults.length === 1 ? "" : "s"} found.`;
}

function setActiveResult(input, list, index) {
  searchActiveIndex = index;
  list.querySelectorAll(".suburb-search-option").forEach((li, i) => {
    const isActive = i === index;
    li.classList.toggle("active", isActive);
    li.setAttribute("aria-selected", String(isActive));
  });

  if (index >= 0) {
    input.setAttribute("aria-activedescendant", `suburb-search-option-${index}`);
  } else {
    input.removeAttribute("aria-activedescendant");
  }
}

function closeSearchResults(input, list) {
  list.classList.add("hidden");
  list.innerHTML = "";
  searchResults = [];
  searchActiveIndex = -1;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
  document.getElementById("suburb-search-status").textContent = "";
}

function chooseSuburb(suburb) {
  document.getElementById("suburb-search").value = suburb.name;

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
}

document.addEventListener("DOMContentLoaded", initSuburbSearch);
