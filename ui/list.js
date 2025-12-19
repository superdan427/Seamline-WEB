export function renderFilters(containerId, categories, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const orderedCategories = orderCategories(categories);

  orderedCategories.forEach((category, idx) => {
    const btn = document.createElement("button");
    const displayLabel = normalizeLabel(category);
    btn.textContent = displayLabel;
    const slug = slugify(displayLabel);
    btn.dataset.category = slug;
    btn.classList.add(`filter-${slug}`);

    if (idx === 0) btn.classList.add("active");

    btn.addEventListener("click", () => {
      container.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onSelect?.(category);
    });

    container.appendChild(btn);
  });
}

export function renderList(containerId, places, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  places.forEach((place) => {
    const item = document.createElement("div");
    item.className = "list-item";

    const name = document.createElement("div");
    name.className = "place-name";
    name.textContent = place.name ?? "";

    const category = document.createElement("div");
    category.className = "place-category";
    category.textContent = place.category ?? "";

    item.appendChild(name);
    item.appendChild(category);

    item.addEventListener("click", () => onSelect?.(place));
    container.appendChild(item);
  });
}

function slugify(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "all";
}

function normalizeLabel(category) {
  const map = {
    "fabric shop": "fabrics",
    fabrics: "fabrics",
    trimming: "trimmings",
  };

  const normalized = map[category?.toString().trim().toLowerCase()];
  return normalized ? capitalize(normalized) : category;
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function orderCategories(categories) {
  const preferredOrder = [
    "all",
    "fabrics",
    "trimmings",
    "knit/embroidery",
    "leather",
    "services",
    "markets",
  ];

  const normalized = categories.map((cat) => ({
    raw: cat,
    normalized: normalizeLabel(cat)?.toString().trim().toLowerCase(),
  }));

  const ordered = preferredOrder
    .map((key) => normalized.find((entry) => entry.normalized === key))
    .filter(Boolean);

  const remaining = normalized.filter(
    (entry) => !preferredOrder.includes(entry.normalized)
  );

  return [...ordered.map((entry) => entry.raw), ...remaining.map((entry) => entry.raw)];
}
