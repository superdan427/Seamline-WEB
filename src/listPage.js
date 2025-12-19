import { renderList, renderFilters } from "../ui/list.js";

import { getCategoriesFromPlaces, filterPlacesByCategory } from "./filters.js";

document.getElementById("home-title")?.addEventListener("click", () => {
  window.location.href = "index.html";
});

const params = new URLSearchParams(window.location.search);
const categoryFromUrl = params.get("category");

fetch("./data/places.json")
  .then((res) => res.json())
  .then((places) => {
    const categories = getCategoriesFromPlaces(places, { includeOnline: true });

    // Render filters
    renderFilters("filters", categories, (category) => {
      const filtered = filterPlacesByCategory(places, category);
      renderList("list-items", filtered, (place) => {
        window.location.href = `place.html?id=${encodeURIComponent(place.id)}`;
      });
    });

    // Initial list (supports ?category=...)
    const initialCategory = categoryFromUrl || "all";
    const initialPlaces = filterPlacesByCategory(places, initialCategory);

    renderList("list-items", initialPlaces, (place) => {
      window.location.href = `place.html?id=${encodeURIComponent(place.id)}`;
    });
  })
  .catch((err) => console.error("Failed to load places:", err));
