export function renderHome() {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <div class="view">
      <h1 class="view__title">🏠 Home</h1>
      <p class="view__subtitle">Bienvenido al chat con los Simpson</p>
      <p class="view__body">
        Aquí podés ver una galería de personajes de la serie. Hacé click en "Empezar a chatear" para interactuar y conocer al personaje que elijas. Diviértete, pero recuerda que es una demo educativa y no un chat real. ¡Disfrutá la experiencia!
      </p>

      <p class="home-actions">
        <a href="/chat" class="link link--cta">Empezar a chatear</a>
        <a href="/about" class="link">Conocer el proyecto</a>
      </p>

      <!-- Badge de debug: muestra estado interno en pantalla -->
      <div id="state-badge" class="state-badge">estado: idle</div>

      <!-- LOADING -->
      <div id="state-loading" class="state-panel state--loading hidden">
        <div class="spinner"></div>
        <p>Consultando la API...</p>
      </div>

      <!-- ERROR -->
      <div
        id="state-error"
        class="state-panel state--error hidden"
        role="alert"
        aria-live="assertive"
      >
        <p class="error-icon">⚠️</p>
        <p id="error-message"></p>
        <button id="retry-btn" class="btn btn--retry">🔄 Reintentar</button>
      </div>

      <!-- SUCCESS: grilla de cards -->
      <div id="state-success" class="hidden">
        <p id="results-count" class="results-count"></p>
        <div id="cards-grid" class="cards-grid"></div>
      </div>
    </div>
  `;
}