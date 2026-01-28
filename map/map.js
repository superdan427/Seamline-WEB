export const MAP_STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
};

export function createMap(containerId) {
  // Load Mapbox token from config
  // Security: Token should have URL restrictions set in Mapbox dashboard
  mapboxgl.accessToken = window.MAPBOX_TOKEN;

  if (!mapboxgl.accessToken) {
    console.error('❌ Mapbox token not configured. Check config.local.js');
    throw new Error('Mapbox token is required to display the map');
  }

  const map = new mapboxgl.Map({
    container: containerId,
    style: MAP_STYLES.light,
    center: [-0.1276, 51.5072],
    zoom: 11,
    interactive: true,
  });

  map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
  return map;
}

export function addMarkers(map, places, onSelect) {
  const markers = [];

  places.forEach((place) => {
    if (typeof place.lng !== "number" || typeof place.lat !== "number") return;

    const el = document.createElement("div");
    el.className = "custom-marker";

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelect?.(place);
    });

    const marker = new mapboxgl.Marker(el).setLngLat([place.lng, place.lat]).addTo(map);
    markers.push(marker);
  });

  return markers;
}

export function removeMarkers(markers) {
  markers.forEach((m) => m.remove());
}

export function flyToPlace(map, place) {
  map.flyTo({
    center: [place.lng, place.lat],
    zoom: 14,
  });
}

export function setMapStyle(map, styleKey) {
  if (!map) return;
  const nextStyle = MAP_STYLES[styleKey] ?? MAP_STYLES.light;
  map.setStyle(nextStyle);
}

export function showUserLocation(map, { lng, lat }) {
  if (!map || typeof lng !== "number" || typeof lat !== "number") return null;

  const el = document.createElement("div");
  el.className = "user-location-marker";

  const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
  return marker;
}
