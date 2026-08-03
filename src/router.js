import { renderHome } from "./views/home.js";
import { renderChat } from "./views/chat.js";
import { renderAbout } from "./views/about.js";
import { renderNotFound } from "./views/notFound.js";

// 1. TABLA DE RUTAS
// Esta tabla conecta cada pathname publico con la funcion que sabe renderizar
// su vista. Agregar una pantalla nueva deberia empezar por agregarla aca.
const routes = {
  "/home": renderHome,
  "/chat": renderChat,
  "/about": renderAbout,
};

// 2. FUNCION router()
/*
 * Lee el pathname actual, normaliza trailing slash, busca en routes.
 * Si no encuentra -> renderNotFound.
 * Siempre actualiza el link activo y el badge de debug.
 */
export function router() {
  const raw = window.location.pathname;
  const path = normalizePath(raw);

  if (path === "/") {
    history.replaceState(null, "", "/home");
    const redirectedPath = "/home";
    routes[redirectedPath]();
    updateActiveLink();
    updateRouteBadge(redirectedPath);
    emitRouteChange(redirectedPath);
    return;
  }

  const render = routes[path] || renderNotFound;

  render();
  updateActiveLink();
  updateRouteBadge(path);
  emitRouteChange(path);
}

// 3. FUNCION navigateTo(path)
/*
 * Navegacion programatica: pushState + router manual.
 * pushState NUNCA dispara popstate, por eso llamamos router() nosotros.
 */
export function navigateTo(path) {
  const nextPath = normalizePath(path);
  const currentPath = normalizePath(window.location.pathname);

  if (currentPath === nextPath) return;

  history.pushState(null, "", nextPath);
  router();
}

// 4. FUNCION updateActiveLink()
// Sincroniza el estado visual del nav con la URL actual para que el usuario
// siempre sepa en que vista esta parado.
function updateActiveLink() {
  const currentPath = normalizePath(window.location.pathname);

  document.querySelectorAll("nav a").forEach((link) => {
    const linkPath = normalizePath(link.pathname);

    if (link.origin === window.location.origin && linkPath === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// 5. FUNCION updateRouteBadge(path)
// Helper de debug visual: muestra la ruta que el router esta usando despues
// de normalizarla. Es util para clase y para detectar desfasajes con la URL.
function updateRouteBadge(path) {
  let badge = document.querySelector(".route-badge");

  if (!badge) {
    badge = document.createElement("div");
    badge.className = "route-badge";
    document.body.appendChild(badge);
  }

  badge.innerHTML = `ruta activa: <span>${path}</span>`;
}

function emitRouteChange(path) {
  window.dispatchEvent(
    new CustomEvent("routechange", {
      detail: { path },
    }),
  );
}

// Mantener la normalizacion en un helper evita que el router y el nav
// interpreten distinto rutas equivalentes como /chat y /chat/.
function normalizePath(path) {
  if (path === "/") return "/";

  const normalized = path
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.toLowerCase())
    .join("/");

  return normalized ? `/${normalized}` : "/";
}