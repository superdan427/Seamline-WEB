const USER_PROFILE_KEY = "seamline_user_profile";
const SESSION_KEY = "seamline_user_session";
const SAVED_KEY = "seamline_saved_places";
const COLLECTION_PREFIX = "col";

function parseJSON(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function hashPassword(password) {
  try {
    return btoa(password);
  } catch {
    return password;
  }
}

function getProfile() {
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  return parseJSON(raw, null);
}

function saveProfile(profile) {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

function setSessionEmail(email) {
  localStorage.setItem(SESSION_KEY, email);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  const profile = getProfile();
  const sessionEmail = localStorage.getItem(SESSION_KEY);
  if (profile && profile.email === sessionEmail) {
    return { name: profile.name, email: profile.email };
  }
  return null;
}

function emitUserChange() {
  window.dispatchEvent(
    new CustomEvent("seamline:user-change", { detail: getCurrentUser() })
  );
}

function emitSavedChange(email) {
  window.dispatchEvent(new CustomEvent("seamline:saved-change", { detail: { email } }));
}

export function signupUser({ name, email, password }) {
  if (!name || !email || !password) throw new Error("All fields are required.");
  const profile = { name, email, passwordHash: hashPassword(password) };
  saveProfile(profile);
  setSessionEmail(email);
  emitUserChange();
  return { name, email };
}

export function loginUser({ email, password }) {
  if (!email || !password) throw new Error("Email and password are required.");
  const profile = getProfile();
  if (!profile) throw new Error("No account found. Please sign up first.");
  if (profile.email !== email || profile.passwordHash !== hashPassword(password)) {
    throw new Error("Invalid email or password.");
  }
  setSessionEmail(email);
  emitUserChange();
  return { name: profile.name, email: profile.email };
}

export function logoutUser() {
  clearSession();
  emitUserChange();
}

function getSavedStore() {
  return parseJSON(localStorage.getItem(SAVED_KEY), {});
}

function setSavedStore(store) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(store));
}

function normalizeCollections(collections) {
  if (!collections || typeof collections !== "object") return {};
  return Object.fromEntries(
    Object.entries(collections).map(([id, col]) => {
      const normalized = {
        id: col.id || id,
        name: col.name || "Collection",
        placeIds: Array.isArray(col.placeIds) ? col.placeIds : [],
      };
      return [normalized.id, normalized];
    })
  );
}

function normalizeEntry(entry) {
  if (!entry) return { items: [], collections: {} };
  if (Array.isArray(entry)) {
    return { items: entry, collections: {} };
  }
  return {
    items: Array.isArray(entry.items) ? entry.items : [],
    collections: normalizeCollections(entry.collections),
  };
}

function getUserSavedData(user) {
  if (!user) return { items: [], collections: {} };
  const store = getSavedStore();
  const entry = normalizeEntry(store[user.email]);
  return entry;
}

function setUserSavedData(user, data) {
  if (!user) return;
  const store = getSavedStore();
  store[user.email] = data;
  setSavedStore(store);
  emitSavedChange(user.email);
}

function generateCollectionId() {
  return `${COLLECTION_PREFIX}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function getSavedPlaceIds(user) {
  if (!user) return [];
  return getUserSavedData(user).items;
}

export function isPlaceSaved(user, placeId) {
  if (!user) return false;
  return getSavedPlaceIds(user).includes(String(placeId));
}

export function savePlace(user, placeId) {
  if (!user) throw new Error("Login required");
  const data = getUserSavedData(user);
  const ids = new Set(data.items);
  ids.add(String(placeId));
  data.items = Array.from(ids);
  setUserSavedData(user, data);
  return data.items;
}

export function removeSavedPlace(user, placeId) {
  if (!user) throw new Error("Login required");
  const targetId = String(placeId);
  const data = getUserSavedData(user);
  data.items = data.items.filter((id) => id !== targetId);
  Object.values(data.collections).forEach((collection) => {
    collection.placeIds = (collection.placeIds ?? []).filter((id) => id !== targetId);
  });
  setUserSavedData(user, data);
  return data.items;
}

export function getCollections(user) {
  if (!user) return [];
  const data = getUserSavedData(user);
  return Object.values(data.collections);
}

export function createCollection(user, name) {
  if (!user) throw new Error("Login required");
  const trimmed = name?.trim();
  if (!trimmed) throw new Error("Collection name is required.");
  const data = getUserSavedData(user);
  const id = generateCollectionId();
  data.collections[id] = { id, name: trimmed, placeIds: [] };
  setUserSavedData(user, data);
  return data.collections[id];
}

export function deleteCollection(user, collectionId) {
  if (!user) throw new Error("Login required");
  const data = getUserSavedData(user);
  delete data.collections[collectionId];
  setUserSavedData(user, data);
}

export function addPlaceToCollection(user, collectionId, placeId) {
  if (!user) throw new Error("Login required");
  const data = getUserSavedData(user);
  const collection = data.collections[collectionId];
  if (!collection) throw new Error("Collection not found.");
  if (!data.items.includes(String(placeId))) {
    data.items.push(String(placeId));
  }
  const ids = new Set(collection.placeIds ?? []);
  ids.add(String(placeId));
  collection.placeIds = Array.from(ids);
  data.collections[collectionId] = collection;
  setUserSavedData(user, data);
  return collection;
}

export function removePlaceFromCollection(user, collectionId, placeId) {
  if (!user) throw new Error("Login required");
  const data = getUserSavedData(user);
  const collection = data.collections[collectionId];
  if (!collection) return;
  collection.placeIds = (collection.placeIds ?? []).filter((id) => id !== String(placeId));
  data.collections[collectionId] = collection;
  setUserSavedData(user, data);
}

export function getCollectionPlaceIds(user, collectionId) {
  if (!user) return [];
  const data = getUserSavedData(user);
  return data.collections[collectionId]?.placeIds ?? [];
}

export function isPlaceInCollection(user, collectionId, placeId) {
  if (!user) return false;
  const ids = getCollectionPlaceIds(user, collectionId);
  return ids.includes(String(placeId));
}
