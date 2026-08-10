/*
 * Shared accessible suburb-search combobox: a text input (role="combobox")
 * plus a listbox dropdown, filtered by case-insensitive substring match.
 * Used by both the map page's header search (search.js) and the compare
 * page's "+ Add suburb" control (compare.js) so they share one
 * implementation and one look — see CLAUDE.md.
 */

function initSuburbCombobox({
  input,
  list,
  wrap,
  status,
  getSuburbs,
  onChoose,
  maxResults = 8,
  openOnFocus = false,
  emptyText = "No suburbs match.",
}) {
  let results = [];
  let activeIndex = -1;

  function close() {
    list.classList.add("hidden");
    list.innerHTML = "";
    results = [];
    activeIndex = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    if (status) status.textContent = "";
  }

  function setActive(index) {
    activeIndex = index;
    list.querySelectorAll('[role="option"]').forEach((li, i) => {
      const isActive = i === index;
      li.classList.toggle("active", isActive);
      li.setAttribute("aria-selected", String(isActive));
    });
    input.setAttribute("aria-activedescendant", index >= 0 ? list.children[index].id : "");
    if (index < 0) input.removeAttribute("aria-activedescendant");
  }

  function renderResults(query) {
    if (!query && !openOnFocus) {
      close();
      return;
    }

    const source = getSuburbs();
    const matches = query
      ? source.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      : source;
    results = Number.isFinite(maxResults) ? matches.slice(0, maxResults) : matches;
    activeIndex = -1;
    input.setAttribute("aria-expanded", "true");
    input.removeAttribute("aria-activedescendant");

    if (!results.length) {
      // role="presentation" — not a selectable option, so it shouldn't be
      // counted by assistive tech navigating the listbox; the live region
      // below is what actually announces the empty state.
      list.innerHTML = `<li class="suburb-search-empty muted" role="presentation">${emptyText}</li>`;
      list.classList.remove("hidden");
      if (status) status.textContent = emptyText;
      return;
    }

    list.innerHTML = results
      .map(
        (s, i) => `
          <li
            id="${list.id}-option-${i}"
            class="suburb-search-option"
            role="option"
            aria-selected="false"
            data-index="${i}"
          >${s.name}${s.council ? ` &mdash; ${s.council}` : ""}</li>
        `
      )
      .join("");

    list.querySelectorAll(".suburb-search-option").forEach((li) => {
      li.addEventListener("click", () => {
        const idx = Number(li.dataset.index);
        onChoose(results[idx]);
        close();
      });
    });

    list.classList.remove("hidden");
    if (status) status.textContent = `${results.length} suburb${results.length === 1 ? "" : "s"} found.`;
  }

  input.addEventListener("input", () => renderResults(input.value.trim()));

  if (openOnFocus) {
    input.addEventListener("focus", () => renderResults(input.value.trim()));
    input.addEventListener("click", () => {
      if (list.classList.contains("hidden")) renderResults(input.value.trim());
    });
  }

  input.addEventListener("keydown", (e) => {
    if (list.classList.contains("hidden") && e.key !== "Escape") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        onChoose(results[activeIndex]);
        close();
      }
    } else if (e.key === "Escape") {
      close();
    }
  });

  // Tab (or any other focus-away) closes the list. The 150ms delay gives a
  // mouse click on an option time to fire its own click handler first —
  // clicking a non-focusable <li> blurs the input before the click fires.
  input.addEventListener("blur", () => setTimeout(close, 150));

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) close();
  });

  return { close };
}
