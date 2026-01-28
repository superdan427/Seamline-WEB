import {
  signupUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getCurrentUserAsync,
  getSavedPlaceIds,
} from "../utils/storage.js";
import { supabase } from "./supabaseClient.js";

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const dashboardSection = document.getElementById("account-dashboard");
const authPanels = document.getElementById("auth-panels");
const messageEl = document.getElementById("account-message");
const savedListEl = document.getElementById("saved-list");
const accountNameEl = document.getElementById("account-name");
const accountEmailEl = document.getElementById("account-email");
const logoutBtn = document.getElementById("logout-btn");

let placesCache = [];

document.getElementById("home-title")?.addEventListener("click", () => {
  window.location.href = "index.html";
});

async function loadPlaces() {
  const { data: places, error } = await supabase
    .from("places")
    .select("*")
    .order("name");

  if (error) {
    showMessage("Unable to load places data right now.", true);
    return;
  }

  placesCache = places || [];
  const user = await getCurrentUserAsync();
  renderSavedPlaces(user);
}

loadPlaces().catch(() => {
  showMessage("Unable to load places data right now.", true);
});

signupForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  signupUser({
    name: formData.get("name")?.trim(),
    email: formData.get("email")?.trim().toLowerCase(),
    password: formData.get("password"),
  })
    .then((user) => {
      showMessage(`Welcome, ${user?.name || "friend"}!`, false);
      signupForm.reset();
      updateView();
    })
    .catch((err) => {
      showMessage(err.message || "Unable to sign up.", true);
    });
});

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  loginUser({
    email: formData.get("email")?.trim().toLowerCase(),
    password: formData.get("password"),
  })
    .then(() => {
      showMessage("Logged in successfully.", false);
      loginForm.reset();
      updateView();
    })
    .catch((err) => {
      showMessage(err.message || "Login failed.", true);
    });
});

logoutBtn?.addEventListener("click", () => {
  logoutUser()
    .then(() => {
      showMessage("You have been logged out.", false);
      updateView();
    })
    .catch((err) => {
      showMessage(err.message || "Unable to log out.", true);
    });
});

window.addEventListener("seamline:user-change", () => {
  updateView();
});

window.addEventListener("seamline:saved-change", (event) => {
  const current = getCurrentUser();
  if (current && event.detail?.email === current.email) {
    renderSavedPlaces(current);
  }
});

async function updateView() {
  const user = await getCurrentUserAsync();
  if (user) {
    authPanels?.classList.add("hidden");
    dashboardSection?.classList.remove("hidden");
    accountNameEl.textContent = user.name;
    accountEmailEl.textContent = user.email;
    renderSavedPlaces(user);
  } else {
    authPanels?.classList.remove("hidden");
    dashboardSection?.classList.add("hidden");
  }
}

function renderSavedPlaces(user) {
  if (!savedListEl) return;
  savedListEl.innerHTML = "";

  if (!user) {
    savedListEl.innerHTML = `<p class="muted">Log in to see saved places.</p>`;
    return;
  }

  if (!placesCache.length) {
    savedListEl.innerHTML = `<p class="muted">Loading your saved places...</p>`;
    return;
  }

  const savedIds = getSavedPlaceIds(user);
  if (!savedIds.length) {
    savedListEl.innerHTML = `<p class="muted">You haven't saved any places yet.</p>`;
    return;
  }

  const savedPlaces = placesCache.filter((place) => savedIds.includes(String(place.id)));
  savedPlaces.forEach((place) => {
    const item = document.createElement("div");
    item.className = "saved-item";

    const title = document.createElement("div");
    title.className = "saved-item-title";
    title.innerHTML = `<span>${place.name ?? ""}</span><span class="muted">${place.category ?? ""}</span>`;

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => {
      window.location.href = `place.html?id=${encodeURIComponent(place.id)}`;
    });

    item.appendChild(title);
    item.appendChild(viewBtn);
    savedListEl.appendChild(item);
  });
}

function showMessage(text, isError) {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.classList.toggle("error", Boolean(isError));
}

void updateView();
