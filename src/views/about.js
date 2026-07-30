export function renderAbout() {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <div class="view">
      <h1 class="view__title">ℹ️ About</h1>
      <p class="view__subtitle">Sobre el proyecto y los personajes</p>
      <p class="view__body">
        ¿Alguna vez quisiste hablar con Homer, Marge, Bart, Lisa, Maggie o Abe?
        Ahora puedes hacerlo. Esta aplicación utiliza inteligencia artificial para recrear la personalidad
        de cada personaje y ofrecer conversaciones naturales, divertidas y llenas del estilo inconfundible de Springfield.
      </p>

      <p class="view__body">
        Este proyecto ha sido desarrollado únicamente con fines demostrativos y educativos para mostrar el uso de inteligencia artificial
        en conversaciones con personajes ficticios. No existe ninguna afiliación con los propietarios de Los Simpson.
      </p>


      <p><a href="/chat" class="link">Ver el Chat →</a></p>
    </div>
  `;
}