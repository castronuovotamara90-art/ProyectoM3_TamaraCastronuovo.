import { getFirstSixCharacters } from "./services/rmApi.js";
import { toCharacterProfileList } from "./transform/character.js";
import { render, getUserMessage } from "./ui/characterGrid.js";
import { initChatView } from "./engine/chatController.js";
import { router } from "./router.js";
import { setupLinkInterception } from "./navigation.js";

window.addEventListener("popstate", router);

setupLinkInterception();

const state = {
  status: "idle",
  data: [],
  error: null,
};

function setState(updates) {
  Object.assign(state, updates);
  render(state);
}

async function loadGallery(name) {
  setState({ status: "loading", data: [], error: null });
  try {
    const rawCharacters = await getFirstSixCharacters(name);
    const profiles = toCharacterProfileList(rawCharacters);
    setState({ status: "success", data: profiles, error: null });
  } catch (error) {
    const userMessage = getUserMessage(error);
    setState({ status: "error", data: [], error: userMessage });
  }
}

function syncHomeView() {
  const currentPath = normalizePath(window.location.pathname);
  if (currentPath !== "/home") return;

  if (state.status === "success") {
    render(state);
    return;
  }

  loadGallery("homer");
}

function syncChatView() {
  const currentPath = normalizePath(window.location.pathname);
  if (currentPath !== "/chat") return;

  initChatView();
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.id !== "retry-btn") return;

  loadGallery("homer");
});

window.addEventListener("routechange", syncHomeView);
window.addEventListener("routechange", syncChatView);

router();

function normalizePath(path) {
  if (path === "/") return "/";

  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
}
