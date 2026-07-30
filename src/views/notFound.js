export function renderNotFound() {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <div class="not-found">
      <div class="not-found__code">404</div>
      <h1 class="not-found__title">Página no encontrada</h1>
      <p style="color:#64748b;margin-bottom:1.5rem">
        La ruta <span class="not-found__path">${window.location.pathname}</span>
        no existe en esta app.
      </p>

      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
        <a href="/home" class="link">← Ir a Home</a>
        <a href="/chat" class="link">Ir al Chat →</a>
      </div>
    </div>
  `;
}