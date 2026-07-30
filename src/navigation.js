import { navigateTo } from "./router.js";

export function setupLinkInterception() {
  /*
   * En vez de poner un listener en cada <a>, ponemos uno solo en document.
   * Esto funciona con links agregados dinamicamente tambien.
   */
  document.addEventListener("click", (event) => {
    // 1. ¿El click fue en un <a> o dentro de uno?
    const link = event.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    // 2. Casos que NO interceptamos.

    // Ctrl/Cmd/Shift/Alt + click -> el usuario quiere nueva pestana/ventana.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    // target="_blank" -> disenado para abrir en otra pestana.
    if (link.target === "_blank") return;

    // Diferente origin -> link externo, que navegue normalmente.
    if (link.origin !== window.location.origin) return;

    // Anclas (#seccion) -> scroll interno, no navegacion.
    if (href.startsWith("#")) return;

    // Protocolos especiales -> los maneja el sistema operativo o el navegador.
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

    // Solo interceptamos rutas internas absolutas.
    if (!href.startsWith("/")) return;

    // 3. Si llegamos aca: SPA navigation.
    event.preventDefault();
    navigateTo(href);
  });
}