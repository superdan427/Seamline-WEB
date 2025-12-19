import {
  createMap,
  addMarkers,
  removeMarkers,
  flyToPlace,
  setMapStyle,
  showUserLocation,
} from "../map/map.js";
import { setupModalClose, openModal } from "../ui/modal.js";
import { renderFilters } from "../ui/list.js";
import { setupMenu } from "./menu.js";
import { getCategoriesFromPlaces, filterPlacesByCategory, isOnlinePlace } from "./filters.js";

setupMenu();
setupModalClose();

// Title → home (already home, but keeps consistency)
document.getElementById("home-title")?.addEventListener("click", () => {
  window.location.href = "index.html";
});

const map = createMap("map");
let markers = [];
let allPlaces = [];
let isDarkMode = false;
let userLocationMarker = null;
let userLocationCoords = null;

const styleToggleBtn = document.getElementById("style-toggle");
styleToggleBtn?.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  setMapStyle(map, isDarkMode ? "dark" : "light");
  document.body.classList.toggle("dark-mode", isDarkMode);
  if (userLocationCoords) {
    map.once("style.load", () => {
      placeUserLocationMarker(userLocationCoords);
    });
  }
  if (styleToggleBtn) {
    styleToggleBtn.textContent = isDarkMode ? "Light" : "Dark";
    styleToggleBtn.setAttribute("aria-pressed", String(isDarkMode));
  }
});

fetch("./data/places.json")
  .then((res) => res.json())
  .then((places) => {
    allPlaces = places.filter((place) => !isOnlinePlace(place));

    const categories = getCategoriesFromPlaces(allPlaces);

    renderFilters("filters", categories, (category) => {
      const filtered = filterPlacesByCategory(allPlaces, category);
      updateMap(filtered);
    });

    updateMap(allPlaces);
    document.body.classList.toggle("dark-mode", isDarkMode);
    requestUserLocation();
  })
  .catch((err) => console.error("Failed to load places:", err));

function updateMap(places) {
  removeMarkers(markers);
  markers = addMarkers(map, places, (place) => {
    flyToPlace(map, place);
    openModal(place);
  });
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = {
        lng: position.coords.longitude,
        lat: position.coords.latitude,
      };

      if (typeof coords.lng !== "number" || typeof coords.lat !== "number") return;

      userLocationCoords = coords;
      placeUserLocationMarker(coords);

      if (userLocationMarker) {
        map.flyTo({ center: [coords.lng, coords.lat], zoom: 12, duration: 1000 });
      }
    },
    (err) => {
      console.warn("User location unavailable:", err);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

function placeUserLocationMarker(coords) {
  if (!coords) return;
  userLocationMarker?.remove();
  userLocationMarker = showUserLocation(map, coords);
}
