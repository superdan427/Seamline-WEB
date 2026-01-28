import { supabase } from "./supabase.js";

const SAVED_KEY = "seamline_saved_places";
const COLLECTION_PREFIX = "col";

function parseJSON(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let cachedUser = null;
let authReadyPromise = null;

function mapUser(user) {
  if (!user) return null;
  const name =
    user.user_metadata?.display_name ||
    user.user_metadata?.name ||
    user.email ||
    "";
  return { id: user.id, name, email: user.email || "" };
}

async function ensureAuthReady() {
  if (!authReadyPromise) {
    authReadyPromise = supabase.auth.getUser().then(({ data }) => {
      cachedUser = mapUser(data?.user);
      emitUserChange();
      return cachedUser;
    });
  }
  return authReadyPromise;
}

export function getCurrentUser() {
  return cachedUser;
}

export async function getCurrentUserAsync() {
  await ensureAuthReady();
  return cachedUser;
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
  return supabase.auth
    .signUp({
      email,
      password,
      options: { data: { display_name: name } },
    })
    .then(({ data, error }) => {
      if (error) throw error;
      cachedUser = mapUser(data?.user);
      emitUserChange();
      return cachedUser;
    });
}

export function loginUser({ email, password }) {
  if (!email || !password) throw new Error("Email and password are required.");
  return supabase.auth
    .signInWithPassword({ email, password })
    .then(({ data, error }) => {
      if (error) throw error;
      cachedUser = mapUser(data?.user);
      emitUserChange();
      return cachedUser;
    });
}

export function logoutUser() {
  return supabase.auth.signOut().then(({ error }) => {
    if (error) throw error;
    cachedUser = null;
    emitUserChange();
  });
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

supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = mapUser(session?.user);
  emitUserChange();
});

void ensureAuthReady();
