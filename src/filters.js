export function getCategoriesFromPlaces(places, options = {}) {
  const { includeOnline = false } = options;
  const set = new Set();
  places.forEach((p) => {
    if (p.category) set.add(p.category);
  });
  const categories = ["all", ...Array.from(set)];

  if (
    includeOnline &&
    !categories.some((cat) => cat?.toString().toLowerCase() === "online") &&
    places.some((place) => isOnlinePlace(place))
  ) {
    categories.push("Online");
  }

  return categories;
}

export function filterPlacesByCategory(places, category) {
  if (!category || category === "all") return places;
  if (category.toLowerCase() === "online") return places.filter((p) => isOnlinePlace(p));
  return places.filter((p) => p.category === category);
}

export function isOnlinePlace(place) {
  const typeValue = place?.type;
  if (typeof typeValue === "string" && typeValue.trim().toLowerCase() === "online") {
    return true;
  }

  const categoryValue = place?.category;
  if (typeof categoryValue === "string" && categoryValue.trim().toLowerCase() === "online") {
    return true;
  }

  return false;
}
