import {
  getCurrentUser,
  isPlaceSaved,
  savePlace,
  removeSavedPlace,
  getCollections,
  addPlaceToCollection,
  createCollection,
} from "../utils/storage.js";

export function setupModalClose() {
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("modal-close");
  const content = modal?.querySelector(".modal-content");

  closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
  modal?.addEventListener("click", () => modal.classList.add("hidden"));
  content?.addEventListener("click", (e) => e.stopPropagation());
}

export function openModal(place) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  if (!modal || !modalBody) return;

  const currentUser = getCurrentUser();
  const saved = isPlaceSaved(currentUser, place.id);

  const photos = Array.isArray(place.photos) ? place.photos : [];
  const galleryHtml =
    photos.length > 0
      ? `<div class="modal-gallery">
          ${photos.slice(0, 4).map((src) => `<img src="${src}" alt="" />`).join("")}
         </div>`
      : "";

  modalBody.innerHTML = `
    <div class="modal-title">${place.name ?? ""}</div>
    <div class="modal-sub">${place.category ?? ""}</div>
    ${place.pop_up ? `<p class="modal-description">${place.pop_up}</p>` : ""}

    ${galleryHtml}

    <div class="modal-actions">
      <button class="primary-btn" id="more-info-btn">More info</button>
      <button class="secondary-btn" id="save-btn" data-saved="${saved}">
        ${saved ? "Saved" : "Save"}
      </button>
      <button class="secondary-btn" id="close-btn-2">Close</button>
    </div>
  `;

  modal.classList.remove("hidden");

  modalBody.querySelector("#more-info-btn")?.addEventListener("click", () => {
    window.location.href = `place.html?id=${encodeURIComponent(place.id)}`;
  });

  modalBody.querySelector("#close-btn-2")?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  const saveBtn = modalBody.querySelector("#save-btn");
  const saveOptions = createSaveOptionsBlock();
  modalBody.appendChild(saveOptions.container);
  const closeSaveOptions = () => saveOptions.container.classList.add("hidden");

  saveBtn?.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "account.html";
      return;
    }

    const alreadySaved = isPlaceSaved(user, place.id);
    if (alreadySaved) {
      removeSavedPlace(user, place.id);
      updateSaveButton(false);
      saveOptions.showStatus("Removed from saved.", false);
      closeSaveOptions();
      return;
    }

    saveOptions.populateCollections(getCollections(user));
    saveOptions.container.classList.toggle("hidden");
  });

  saveOptions.quickSaveBtn?.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "account.html";
      return;
    }
    savePlace(user, place.id);
    updateSaveButton(true);
    saveOptions.showStatus("Saved to your places.", false);
    closeSaveOptions();
  });

  saveOptions.saveCollectionBtn?.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    const collectionId = saveOptions.collectionSelect.value;
    if (!collectionId) {
      saveOptions.showStatus("Choose a folder first.", true);
      return;
    }
    addPlaceToCollection(user, collectionId, place.id);
    updateSaveButton(true);
    const collectionName = getCollections(user).find((c) => c.id === collectionId)?.name;
    saveOptions.showStatus(`Saved to ${collectionName ?? "folder"}.`, false);
    closeSaveOptions();
  });

  saveOptions.newCollectionForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    const name = saveOptions.newCollectionInput.value.trim();
    if (!name) {
      saveOptions.showStatus("Name your new folder first.", true);
      return;
    }
    try {
      const collection = createCollection(user, name);
      addPlaceToCollection(user, collection.id, place.id);
      saveOptions.populateCollections(getCollections(user));
      saveOptions.collectionSelect.value = collection.id;
      saveOptions.newCollectionInput.value = "";
      updateSaveButton(true);
      saveOptions.showStatus(`Created "${collection.name}" and saved.`, false);
      closeSaveOptions();
    } catch (err) {
      saveOptions.showStatus(err.message || "Unable to create folder.", true);
    }
  });

  function updateSaveButton(isSaved) {
    if (saveBtn) {
      saveBtn.textContent = isSaved ? "Saved" : "Save";
      saveBtn.dataset.saved = String(isSaved);
    }
  }

  updateSaveButton(saved);
}

function createSaveOptionsBlock() {
  const container = document.createElement("div");
  container.className = "save-options hidden";
  container.innerHTML = `
    <div class="save-options-title">Save options</div>
    <button type="button" class="save-option-btn save-option-quick">Save without folder</button>
    <div class="save-options-row">
      <select class="save-option-select">
        <option value="">Choose a folder</option>
      </select>
      <button type="button" class="save-option-btn secondary save-option-collection">
        Save to folder
      </button>
    </div>
    <form class="save-options-form">
      <input type="text" class="save-option-input" placeholder="New folder name" />
      <button type="submit" class="save-option-btn secondary">Create & save</button>
    </form>
    <div class="save-status"></div>
  `;

  const quickSaveBtn = container.querySelector(".save-option-quick");
  const collectionSelect = container.querySelector(".save-option-select");
  const saveCollectionBtn = container.querySelector(".save-option-collection");
  const newCollectionForm = container.querySelector(".save-options-form");
  const newCollectionInput = container.querySelector(".save-option-input");
  const statusEl = container.querySelector(".save-status");

  function populateCollections(collections) {
    if (!collectionSelect) return;
    collectionSelect.innerHTML = `<option value="">Choose a folder</option>`;
    (collections || []).forEach((collection) => {
      const option = document.createElement("option");
      option.value = collection.id;
      option.textContent = `${collection.name} (${collection.placeIds?.length ?? 0})`;
      collectionSelect.appendChild(option);
    });
  }

  function showStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  return {
    container,
    quickSaveBtn,
    collectionSelect,
    saveCollectionBtn,
    newCollectionForm,
    newCollectionInput,
    showStatus,
    populateCollections,
  };
}
