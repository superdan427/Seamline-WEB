import {
  getCurrentUser,
  isPlaceSaved,
  savePlace,
  removeSavedPlace,
  getCollections,
  addPlaceToCollection,
  createCollection,
} from "../utils/storage.js";
import { isOnlinePlace } from "./filters.js";

document.getElementById("home-title")?.addEventListener("click", () => {
  window.location.href = "index.html";
});

document.getElementById("back-button")?.addEventListener("click", () => {
  history.back();
});

const params = new URLSearchParams(window.location.search);
const placeId = params.get("id");
const saveButton = document.getElementById("save-place-btn");
const saveOptionsContainer = document.createElement("div");
saveOptionsContainer.className = "save-options hidden";
saveOptionsContainer.innerHTML = `
  <div class="save-options-title">Save options</div>
  <button type="button" class="save-option-btn place-save-quick">Save without folder</button>
  <div class="save-options-row">
    <select class="save-option-select">
      <option value="">Choose a folder</option>
    </select>
    <button type="button" class="save-option-btn secondary place-save-collection">
      Save to folder
    </button>
  </div>
  <form class="save-options-form">
    <input type="text" class="save-option-input" placeholder="New folder name" />
    <button type="submit" class="save-option-btn secondary">Create & save</button>
  </form>
  <div class="save-status place-save-status"></div>
`;
saveButton?.insertAdjacentElement("afterend", saveOptionsContainer);

const placeQuickSaveBtn = saveOptionsContainer.querySelector(".place-save-quick");
const placeSaveCollectionBtn = saveOptionsContainer.querySelector(".place-save-collection");
const placeCollectionSelect = saveOptionsContainer.querySelector(".save-option-select");
const placeNewCollectionForm = saveOptionsContainer.querySelector(".save-options-form");
const placeNewCollectionInput = saveOptionsContainer.querySelector(".save-option-input");
const placeSaveStatus = saveOptionsContainer.querySelector(".place-save-status");
let currentPlace = null;

fetch("./data/places.json")
  .then((res) => res.json())
  .then((places) => {
    const place = places.find((p) => String(p.id) === String(placeId));
    if (!place) return;

    currentPlace = place;
    renderPlace(place);
    updateSaveButton();
  })
  .catch((err) => console.error("Failed to load place:", err));

function renderPlace(place) {
  const onlineOnly = isOnlinePlace(place);
  document.getElementById("place-name").textContent = place.name ?? "";
  const descriptionEl = document.getElementById("place-description");
  descriptionEl.textContent = place.more_info ?? place.pop_up ?? "";

  const catBtn = document.getElementById("place-category");
  catBtn.textContent = place.category ?? "";
  catBtn.addEventListener("click", () => {
    window.location.href = `list.html?category=${encodeURIComponent(place.category ?? "all")}`;
  });

  // Address → Apple Maps
  const addressEl = document.getElementById("place-address");
  const addressRow = addressEl?.closest(".place-address");
  if (!onlineOnly && place.address && typeof place.lat === "number" && typeof place.lng === "number") {
    addressEl.textContent = place.address;
    addressEl.href = `https://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`;
    if (addressRow) addressRow.style.removeProperty("display");
  } else if (addressRow) {
    addressRow.style.display = "none";
  }

  // Website
  const websiteEl = document.getElementById("place-website");
  const websiteRow = websiteEl?.closest(".place-website");
  if (place.website) {
    const normalizedUrl = normaliseWebsiteUrl(place.website);
    websiteEl.href = normalizedUrl;
    websiteEl.textContent = formatWebsiteLabel(normalizedUrl);
    if (websiteRow) websiteRow.style.removeProperty("display");
  } else if (websiteRow) {
    websiteRow.style.display = "none";
  }

  // Phone
  const phoneEl = document.getElementById("place-phone");
  if (place.phone) {
    phoneEl.textContent = place.phone;
    phoneEl.href = `tel:${place.phone}`;
  } else {
    phoneEl.closest(".place-phone").style.display = "none";
  }

  // Hours
  const hoursEl = document.getElementById("place-hours");
  if (place.opening_hours) {
    renderOpeningHours(hoursEl, place.opening_hours);
  } else {
    hoursEl.style.display = "none";
  }

  // Gallery (optional)
  const gallery = document.getElementById("place-gallery");
  const photos = Array.isArray(place.photos) ? place.photos : [];
  if (photos.length > 0) {
    gallery.classList.remove("hidden");
    gallery.innerHTML = photos.map((src) => `<img src="${src}" alt="" />`).join("");
  } else {
    gallery.classList.add("hidden");
  }

  hideSaveOptions();
  showPlaceSaveStatus("");
}

function normaliseWebsiteUrl(website) {
  if (!website) return "";
  if (/^https?:\/\//i.test(website)) {
    return website;
  }
  return `https://${website}`;
}

function formatWebsiteLabel(url) {
  if (!url) return "";
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, "");
  } catch {
    return url.replace(/^https?:\/\//i, "");
  }
}

function renderOpeningHours(container, raw) {
  if (!container || !raw) return;
  container.innerHTML = "";
  container.classList.add("place-hours-list");

  const rows = formatOpeningHours(raw);
  rows.forEach(({ day, time }) => {
    const rowEl = document.createElement("div");
    rowEl.className = "place-hours-row";

    const dayEl = document.createElement("span");
    dayEl.className = "place-hours-day";
    dayEl.textContent = day;

    const timeEl = document.createElement("span");
    timeEl.className = "place-hours-time";
    timeEl.textContent = time || "";

    rowEl.appendChild(dayEl);
    rowEl.appendChild(timeEl);
    container.appendChild(rowEl);
  });
}

function formatOpeningHours(raw) {
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const rows = [];

  lines.forEach((line, index) => {
    if (!line) return;
    const parts = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      rows.push({ day: parts[0], time: parts.slice(1).join(" ") });
      return;
    }

    if (index + 1 < lines.length && !/\d/.test(line)) {
      const next = lines[index + 1].trim();
      if (next && /\d/.test(next)) {
        rows.push({ day: line, time: next });
        lines[index + 1] = "";
        return;
      }
    }

    rows.push({ day: line, time: "" });
  });

  return rows;
}

saveButton?.addEventListener("click", () => {
  if (!currentPlace) return;
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "account.html";
    return;
  }

  const saved = isPlaceSaved(user, currentPlace.id);
  if (saved) {
    removeSavedPlace(user, currentPlace.id);
    updateSaveButton();
    placeSaveStatus.textContent = "Removed from saved.";
    placeSaveStatus.classList.remove("error");
    hideSaveOptions();
  } else {
    populatePlaceCollections();
    saveOptionsContainer.classList.toggle("hidden");
  }
});

placeQuickSaveBtn?.addEventListener("click", () => {
  if (!currentPlace) return;
  const user = getCurrentUser();
  if (!user) return;
  savePlace(user, currentPlace.id);
  updateSaveButton();
  showPlaceSaveStatus("Saved to your places.");
  hideSaveOptions();
});

placeSaveCollectionBtn?.addEventListener("click", () => {
  if (!currentPlace) return;
  const user = getCurrentUser();
  if (!user) return;
  const collectionId = placeCollectionSelect.value;
  if (!collectionId) {
    showPlaceSaveStatus("Choose a folder first.", true);
    return;
  }
  addPlaceToCollection(user, collectionId, currentPlace.id);
  updateSaveButton();
  const collectionName = getCollections(user).find((c) => c.id === collectionId)?.name;
  showPlaceSaveStatus(`Saved to ${collectionName ?? "folder"}.`);
  hideSaveOptions();
});

placeNewCollectionForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentPlace) return;
  const user = getCurrentUser();
  if (!user) return;
  const name = placeNewCollectionInput.value.trim();
  if (!name) {
    showPlaceSaveStatus("Name your new folder first.", true);
    return;
  }
  try {
    const collection = createCollection(user, name);
    addPlaceToCollection(user, collection.id, currentPlace.id);
    placeNewCollectionInput.value = "";
    populatePlaceCollections();
    placeCollectionSelect.value = collection.id;
    updateSaveButton();
    showPlaceSaveStatus(`Created "${collection.name}" and saved.`);
    hideSaveOptions();
  } catch (err) {
    showPlaceSaveStatus(err.message || "Unable to create folder.", true);
  }
});

window.addEventListener("seamline:user-change", () => updateSaveButton());
window.addEventListener("seamline:saved-change", () => updateSaveButton());

function updateSaveButton() {
  if (!saveButton) return;
  const user = getCurrentUser();
  if (!currentPlace) {
    saveButton.textContent = "Save place";
    return;
  }
  if (!user) {
    saveButton.textContent = "Save place";
    return;
  }
  const saved = isPlaceSaved(user, currentPlace.id);
  saveButton.textContent = saved ? "Saved" : "Save place";
  if (saved) hideSaveOptions();
}

function populatePlaceCollections() {
  const user = getCurrentUser();
  if (!user || !placeCollectionSelect) return;
  placeCollectionSelect.innerHTML = `<option value="">Choose a folder</option>`;
  getCollections(user).forEach((collection) => {
    const option = document.createElement("option");
    option.value = collection.id;
    option.textContent = `${collection.name} (${collection.placeIds?.length ?? 0})`;
    placeCollectionSelect.appendChild(option);
  });
}

function hideSaveOptions() {
  saveOptionsContainer.classList.add("hidden");
}

function showPlaceSaveStatus(message, isError = false) {
  if (!placeSaveStatus) return;
  placeSaveStatus.textContent = message;
  placeSaveStatus.classList.toggle("error", Boolean(isError));
}
