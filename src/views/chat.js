import { listCharacters } from "../engine/payload.js";

export function renderChat() {
  const app = document.querySelector("#app");
  const cards = listCharacters()
    .map(
      (character) => `
        <button
          type="button"
          class="character-chip"
          data-character-id="${character.id}"
          aria-label="Hablar con ${character.name}"
        >
          <img class="character-chip__img" src="${character.image}" alt="${character.name}" />
          <span class="character-chip__name">${character.name}</span>
        </button>
      `,
    )
    .join("");

  app.innerHTML = `
    <div class="view">
      <h1 class="view__title">💬 Chat</h1>
      <p class="view__subtitle">Elegí un personaje y conversa con la IA</p>

      <div class="character-picker" id="character-picker">
        ${cards}
      </div>

      <div class="chat-window">
        <div class="chat-head" id="chat-head">
          <span class="chat-head__title">Personaje activo: Homer Simpson</span>
          <span class="chat-head__status" id="chat-status">Listo</span>
        </div>

        <div class="chat-messages" id="chat-messages" aria-live="polite"></div>

        <form class="chat-input-row" id="chat-form">
          <input
            id="chat-input"
            class="chat-input"
            placeholder="Escribe un mensaje..."
            autocomplete="off"
            maxlength="600"
          />
          <button id="chat-send" class="chat-send" type="submit">Enviar</button>
        </form>
      </div>

      <p style="font-size:0.85rem;color:#64748b;margin-top:0.75rem" id="chat-help">
        El personaje responde con personalidad propia. Si falta la API key,
        verás un error claro para configurarla sin exponer secretos.
      </p>
      <p style="margin-top:1rem"><a href="/home" class="link">← Volver a Home</a></p>
    </div>
  `;
}