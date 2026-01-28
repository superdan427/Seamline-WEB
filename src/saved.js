import {
  getCurrentUser,
  getSavedPlaceIds,
  removeSavedPlace,
  getCollections,
  createCollection,
  deleteCollection,
  addPlaceToCollection,
  removePlaceFromCollection,
  getCollectionPlaceIds,
} from "../utils/storage.js";
import { supabase } from "./supabaseClient.js";

const savedMessageEl = document.getElementById("saved-message");
const savedGuestEl = document.getElementById("saved-guest");
const savedContentEl = document.getElementById("saved-content");
const savedItemsEl = document.getElementById("saved-items");
const filtersEl = document.getElementById("saved-filters");
const collectionForm = document.getElementById("collection-form");
const collectionNameInput = document.getElementById("collection-name");
const collectionListEl = document.getElementById("collection-list");

let places = [];
let activeFilter = "all";

const builtInFilters = [
  { id: "all", label: "All saved" },
  { id: "fabrics", label: "Fabrics" },
  { id: "trimmings", label: "Trimmings" },
  { id: "services", label: "Services" },
];

document.getElementById("home-title")?.addEventListener("click", () => {
  window.location.href = "index.html";
});

collectionForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) {
    showMessage("Log in to create collections.", true);
    return;
  }

  const name = collectionNameInput?.value || "";
  try {
    const collection = createCollection(user, name);
    showMessage(`Collection "${collection.name}" created.`, false);
    collectionForm.reset();
    renderCollections(user);
    setActiveFilter(`collection:${collection.id}`);
  } catch (err) {
    showMessage(err.message || "Unable to create collection.", true);
  }
});

filtersEl?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  const filterId = button.dataset.filter;
  setActiveFilter(filterId);
});

window.addEventListener("seamline:user-change", () => updateAuthState());
window.addEventListener("seamline:saved-change", () => updateAuthState());

async function loadPlaces() {
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .order("name");

  if (error) {
    showMessage("Unable to load places data.", true);
    return;
  }

  places = data || [];
  updateAuthState();
}

loadPlaces().catch(() => {
  showMessage("Unable to load places data.", true);
});

updateAuthState();

function updateAuthState() {
  const user = getCurrentUser();
  if (!user) {
    savedGuestEl?.classList.remove("hidden");
    savedContentEl?.classList.add("hidden");
    savedItemsEl.innerHTML = "";
    renderFilterButtons(null);
    renderCollectionList(null);
    return;
  }

  savedGuestEl?.classList.add("hidden");
  savedContentEl?.classList.remove("hidden");
  renderCollections(user);
}

function renderFilterButtons(user) {
  if (!filtersEl) return;
  filtersEl.innerHTML = "";
  if (!user) return;

  [...builtInFilters, ...getCollections(user).map((col) => ({
    id: `collection:${col.id}`,
    label: col.name,
  }))].forEach((filter) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.filter = filter.id;
    btn.className = filter.id === activeFilter ? "active" : "";
    btn.textContent = filter.label;
    filtersEl.appendChild(btn);
  });
}

function renderCollections(user) {
  renderFilterButtons(user);
  renderCollectionList(user);
  renderSavedItems(user);
}

function renderCollectionList(user) {
  if (!collectionListEl) return;
  collectionListEl.innerHTML = "";
  if (!user) {
    collectionListEl.textContent = "Collections will appear here.";
    collectionListEl.classList.add("muted");
    return;
  }

  const collections = getCollections(user);
  if (!collections.length) {
    collectionListEl.textContent = "No collections yet.";
    collectionListEl.classList.add("muted");
    return;
  }

  collectionListEl.classList.remove("muted");
  collections.forEach((collection) => {
    const chip = document.createElement("div");
    chip.className = "collection-chip";

    const info = document.createElement("div");
    info.className = "collection-chip-info";
    info.innerHTML = `<strong>${collection.name}</strong><span>${collection.placeIds?.length ?? 0
      } places</span>`;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `Delete ${collection.name}`);
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => {
      const confirmDelete = window.confirm(
        `Remove the "${collection.name}" collection? This does not delete your saved places.`
      );
      if (!confirmDelete) return;
      deleteCollection(user, collection.id);
      if (activeFilter === `collection:${collection.id}`) {
        setActiveFilter("all");
      } else {
        renderCollections(user);
      }
      showMessage(`Deleted "${collection.name}".`, false);
    });

    chip.appendChild(info);
    chip.appendChild(deleteBtn);
    collectionListEl.appendChild(chip);
  });
}

function renderSavedItems(user) {
  if (!savedItemsEl) return;

  if (!user) {
    savedItemsEl.innerHTML = `<p class="muted">Log in to see your saved places.</p>`;
    return;
  }

  if (!places.length) {
    savedItemsEl.innerHTML = `<p class="muted">Loading your saved places...</p>`;
    return;
  }

  const savedIds = getSavedPlaceIds(user);
  if (!savedIds.length) {
    savedItemsEl.innerHTML = `<p class="muted">You haven't saved any places yet.</p>`;
    return;
  }

  const savedPlaces = savedIds
    .map((id) => places.find((place) => String(place.id) === String(id)))
    .filter(Boolean);

  const filtered = filterPlaces(savedPlaces, user);
  if (!filtered.length) {
    savedItemsEl.innerHTML = `<p class="muted">No places match this filter yet.</p>`;
    return;
  }

  const collections = getCollections(user);
  savedItemsEl.innerHTML = "";

  filtered.forEach((place) => {
    const card = document.createElement("div");
    card.className = "saved-card";

    const info = document.createElement("div");
    info.className = "saved-card-info";
    info.innerHTML = `
      <div class="saved-card-title">${place.name ?? ""}</div>
      <div class="muted">${place.category ?? ""}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "saved-card-actions";

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "secondary-btn";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => {
      window.location.href = `place.html?id=${encodeURIComponent(place.id)}`;
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "plain-link";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      removeSavedPlace(user, place.id);
      showMessage(`Removed ${place.name} from saved.`, false);
      renderCollections(user);
    });

    actions.appendChild(viewBtn);
    actions.appendChild(removeBtn);

    card.appendChild(info);
    card.appendChild(actions);

    if (collections.length) {
      const assignRow = document.createElement("div");
      assignRow.className = "collection-assign";

      const select = document.createElement("select");
      select.innerHTML = `<option value="">Add to collection</option>`;
      collections.forEach((collection) => {
        const option = document.createElement("option");
        option.value = collection.id;
        option.textContent = collection.name;
        select.appendChild(option);
      });

      select.addEventListener("change", () => {
        const collectionId = select.value;
        if (!collectionId) return;
        addPlaceToCollection(user, collectionId, place.id);
        const updatedCollection = getCollections(user).find((c) => c.id === collectionId);
        showMessage(
          `Added to ${updatedCollection?.name ?? "collection"}.`,
          false
        );
        select.value = "";
        renderCollections(user);
      });

      assignRow.appendChild(select);
      card.appendChild(assignRow);
    }

    const memberships = collections.filter((collection) =>
      (collection.placeIds ?? []).includes(String(place.id))
    );

    if (memberships.length) {
      const tagRow = document.createElement("div");
      tagRow.className = "saved-card-collections";

      memberships.forEach((collection) => {
        const tag = document.createElement("span");
        tag.className = "collection-tag";
        tag.textContent = collection.name;

        const removeTagBtn = document.createElement("button");
        removeTagBtn.type = "button";
        removeTagBtn.className = "collection-tag-remove";
        removeTagBtn.setAttribute("aria-label", `Remove from ${collection.name}`);
        removeTagBtn.textContent = "×";
        removeTagBtn.addEventListener("click", () => {
          removePlaceFromCollection(user, collection.id, place.id);
          showMessage(`Removed from ${collection.name}.`, false);
          renderCollections(user);
        });

        tag.appendChild(removeTagBtn);
        tagRow.appendChild(tag);
      });

      card.appendChild(tagRow);
    }

    savedItemsEl.appendChild(card);
  });
}

function setActiveFilter(filterId) {
  if (!filterId) return;
  activeFilter = filterId;
  const user = getCurrentUser();
  renderFilterButtons(user);
  renderSavedItems(user);
}

function filterPlaces(list, user) {
  if (activeFilter === "all") return list;

  const lowerFilter = activeFilter.toLowerCase();
  if (lowerFilter === "fabrics") {
    return list.filter((place) => matchesCategory(place, ["fabric"]));
  }
  if (lowerFilter === "trimmings") {
    return list.filter((place) => matchesCategory(place, ["trim"]));
  }
  if (lowerFilter === "services") {
    return list.filter((place) =>
      matchesCategory(place, ["service", "tailor", "seamstress", "atelier", "studio"])
    );
  }

  if (activeFilter.startsWith("collection:")) {
    const collectionId = activeFilter.replace("collection:", "");
    const ids = getCollectionPlaceIds(user, collectionId);
    if (!ids.length) return [];
    return list.filter((place) => ids.includes(String(place.id)));
  }

  return list;
}

function matchesCategory(place, keywords = []) {
  const category = (place.category || "").toLowerCase();
  return keywords.some((word) => category.includes(word));
}

function showMessage(text, isError) {
  if (!savedMessageEl) return;
  savedMessageEl.textContent = text;
  savedMessageEl.classList.toggle("error", Boolean(isError));
}
