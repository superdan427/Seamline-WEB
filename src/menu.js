import { getCurrentUser, getCurrentUserAsync } from "../utils/storage.js";

export function setupMenu() {
  const btn = document.getElementById("menu-button");
  const menu = document.getElementById("side-menu");
  const overlay = document.getElementById("menu-overlay");
  const accountLink = document.getElementById("account-menu-link");

  if (!btn || !menu || !overlay) return;

  function open() {
    menu.classList.add("open");
    overlay.classList.remove("hidden");
    menu.setAttribute("aria-hidden", "false");
  }

  function close() {
    menu.classList.remove("open");
    overlay.classList.add("hidden");
    menu.setAttribute("aria-hidden", "true");
  }

  btn.addEventListener("click", () => {
    if (menu.classList.contains("open")) close();
    else open();
  });

  overlay.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  async function updateAccountLink() {
    if (!accountLink) return;
    const user = getCurrentUser() || (await getCurrentUserAsync());
    accountLink.textContent = user ? "My account" : "Log in / Sign up";
  }

  updateAccountLink();
  window.addEventListener("seamline:user-change", () => void updateAccountLink());
}
