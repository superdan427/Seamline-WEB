import { setupMenu } from "./menu.js";

const SEARCH_ENABLED = false;

document.getElementById("home-title")?.addEventListener("click", () => {
  window.location.href = "index.html";
});

setupMenu();

const comingSoonEl = document.getElementById("search-coming-soon");
const searchAppEl = document.getElementById("search-app");

if (!SEARCH_ENABLED) {
  comingSoonEl?.classList.remove("hidden");
  searchAppEl?.classList.add("hidden");
} else {
  const searchInput = document.getElementById("search-input");
  const clearButton = document.getElementById("clear-search");
  const resultsContainer = document.getElementById("search-results");
  const summaryEl = document.getElementById("search-summary");
  const tagFiltersEl = document.getElementById("tag-filters");

  let places = [];
  let activeTags = new Set();
  let currentQuery = "";

  const featuredTags = [
    "Cheap",
    "Wholesale",
    "Denim",
    "Silk",
    "Pleating",
    "Workshops",
    "Trimmings",
    "Services",
  ];

  fetch("./data/places.json")
    .then((res) => res.json())
    .then((data) => {
      places = data;
      renderTagFilters();
      updateResults();
    })
    .catch((err) => {
      console.error("Failed to load places for search:", err);
      summaryEl.textContent = "Unable to load data.";
    });

  searchInput?.addEventListener("input", (event) => {
    currentQuery = event.target.value;
    updateResults();
  });

  clearButton?.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
    }
    currentQuery = "";
    activeTags.clear();
    tagFiltersEl?.querySelectorAll(".tag-filter").forEach((btn) => btn.classList.remove("active"));
    updateResults();
  });

  function renderTagFilters() {
    if (!tagFiltersEl) return;
    tagFiltersEl.innerHTML = "";
    featuredTags.forEach((tag) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tag-filter";
      button.textContent = tag;
      button.dataset.tag = tag.toLowerCase();
      button.addEventListener("click", () => {
        button.classList.toggle("active");
        if (button.classList.contains("active")) {
          activeTags.add(button.dataset.tag);
        } else {
          activeTags.delete(button.dataset.tag);
        }
        updateResults();
      });
      tagFiltersEl.appendChild(button);
    });
  }

  function updateResults() {
    if (!resultsContainer) return;

    const filtered = places.filter(
      (place) => matchesQuery(place, currentQuery) && matchesTags(place)
    );

    summaryEl.textContent =
      filtered.length === 0
        ? "No places match yet. Try another keyword or tag."
        : `${filtered.length} place${filtered.length !== 1 ? "s" : ""} match your search.`;

    resultsContainer.innerHTML = "";

    filtered.forEach((place) => {
      const card = document.createElement("article");
      card.className = "search-result-card";

      const title = document.createElement("h3");
      title.textContent = place.name ?? "";

      const meta = document.createElement("div");
      meta.className = "search-result-meta";
      const area = place.address ? place.address.split(",")[1]?.trim() : "";
      meta.textContent = [place.category, area].filter(Boolean).join(" · ");

      const excerpt = document.createElement("p");
      excerpt.className = "muted";
      excerpt.textContent = place.pop_up ?? "";

      const tagRow = document.createElement("div");
      tagRow.className = "search-result-tags";
      const topTags = Array.isArray(place.tags) ? place.tags.slice(0, 6) : [];
      topTags.forEach((tag) => {
        const badge = document.createElement("span");
        badge.className = "search-result-tag";
        badge.textContent = tag;
        badge.addEventListener("click", () => {
          currentQuery = "";
          if (searchInput) searchInput.value = "";
          activeTags.add(tag.toLowerCase());
          tagFiltersEl
            ?.querySelectorAll(".tag-filter")
            .forEach((btn) => btn.classList.toggle("active", activeTags.has(btn.dataset.tag)));
          updateResults();
        });
        tagRow.appendChild(badge);
      });

      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "secondary-btn";
      viewBtn.textContent = "View details";
      viewBtn.addEventListener("click", () => {
        window.location.href = `place.html?id=${encodeURIComponent(place.id)}`;
      });

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(excerpt);
      if (topTags.length) card.appendChild(tagRow);
      card.appendChild(viewBtn);

      resultsContainer.appendChild(card);
    });
  }

  function matchesQuery(place, query) {
    if (!query) return true;
    const text = query.trim().toLowerCase();
    if (!text) return true;
    const haystack = [
      place.name,
      place.category,
      place.address,
      place.pop_up,
      place.more_info,
      ...(place.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(text);
  }

  function matchesTags(place) {
    if (activeTags.size === 0) return true;
    const placeTags = (place.tags ?? []).map((t) => t.toLowerCase());
    return Array.from(activeTags).every((tag) => placeTags.some((pTag) => pTag.includes(tag)));
  }
}
