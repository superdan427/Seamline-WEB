import { setupMenu } from "./menu.js";
import { supabase } from "./supabaseClient.js";

const SEARCH_ENABLED = true;

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

  let allPlaces = [];
  let currentQuery = "";
  let selectedTags = new Set();
  let tagOptions = [];

  function updateClearVisibility() {
    if (!clearButton || !searchInput) return;
    clearButton.classList.toggle("visible", Boolean(searchInput.value));
  }

  async function loadPlaces() {
    const { data: places, error } = await supabase
      .from("places")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching places:", error);
      return;
    }

    allPlaces = places;
    tagOptions = buildTagOptions(allPlaces);
    renderTagFilters();
    updateResults();
  }

  loadPlaces().catch((err) => {
    console.error("Error fetching places:", err);
  });

  searchInput?.addEventListener("input", (event) => {
    currentQuery = event.target.value;
    updateClearVisibility();
    updateResults();
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      updateResults();
    }
  });

  clearButton?.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
    }
    currentQuery = "";
    selectedTags.clear();
    tagFiltersEl?.querySelectorAll(".tag-filter").forEach((btn) => btn.classList.remove("active"));
    updateClearVisibility();
    updateResults();
  });

  function renderTagFilters() {
    if (!tagFiltersEl) return;
    tagFiltersEl.innerHTML = "";
    tagFiltersEl.classList.add("hidden");
  }

  updateClearVisibility();

  async function updateResults() {
    console.log("🔍 Searching for:", currentQuery);

    let query = supabase.from("places").select("*");

    // If there's a search query, use full-text search
    if (currentQuery && currentQuery.trim()) {
      query = query.textSearch("search_vector", currentQuery.trim());
    }

    // Execute query
    const { data: places, error } = await query.order("name");

    if (error) {
      console.error("Search error:", error);
      return;
    }

    console.log(`✅ Found ${places.length} results`);

    // Apply tag filtering client-side (after text search)
    const filtered = selectedTags.size > 0
      ? places.filter((place) => matchesTags(place))
      : places;

    renderResults(filtered);
  }

  function renderResults(filtered) {
    if (!resultsContainer) return;

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
        const normalizedTag = normalizeTag(tag);
        if (!normalizedTag) return;
        const badge = document.createElement("span");
        badge.className = "search-result-tag";
        badge.textContent = tag;
        badge.addEventListener("click", () => {
          currentQuery = "";
          if (searchInput) searchInput.value = "";
          selectedTags.add(normalizedTag);
          tagFiltersEl
            ?.querySelectorAll(".tag-filter")
            .forEach((btn) => btn.classList.toggle("active", selectedTags.has(btn.dataset.tag)));
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

  function matchesTags(place) {
    if (selectedTags.size === 0) return true;
    return place.tags?.some((tag) => selectedTags.has(normalizeTag(tag))) ?? false;
  }

  function normalizeTag(tag) {
    if (tag == null) return "";
    return String(tag).trim().toLowerCase();
  }

  function buildTagOptions(places) {
    const counts = new Map();
    const labels = new Map();

    (places || []).forEach((place) => {
      (place.tags || []).forEach((tag) => {
        const key = normalizeTag(tag);
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!labels.has(key)) labels.set(key, String(tag));
      });
    });

    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 7)
      .map(([key]) => ({
        value: key,
        label: labels.get(key) || key,
      }));
  }
}
