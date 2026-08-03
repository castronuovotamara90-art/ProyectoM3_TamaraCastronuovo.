import { getCharacter, listCharacters } from "./payload.js";

const state = {
  selectedCharacterId: "homer",
  busy: false,
  history: [],
};

export function initChatView() {
  const picker = document.querySelector("#character-picker");
  const form = document.querySelector("#chat-form");
  const input = document.querySelector("#chat-input");

  if (!picker || !form || !input) return;
  if (form.dataset.bound === "true") return;

  form.dataset.bound = "true";
  wirePicker(picker);
  wireForm(form, input);

  state.selectedCharacterId = "homer";
  state.history = [];
  renderPickerSelection();
  setStatus("Listo");
  renderAssistantMessage(`Hola, soy ${getCharacter("homer").name}. ¿De qué quieres hablar?`);
}

function wirePicker(picker) {
  picker.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const chip = target.closest(".character-chip");
    if (!(chip instanceof HTMLButtonElement)) return;

    const nextId = chip.dataset.characterId;
    if (!nextId || nextId === state.selectedCharacterId) return;

    state.selectedCharacterId = nextId;
    state.history = [];

    renderPickerSelection();

    const current = getCharacter(state.selectedCharacterId);
    setStatus("Listo");
    clearMessages();
    renderAssistantMessage(`Hola, soy ${current.name}. Estoy listo para conversar.`);
  });
}

function wireForm(form, input) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (state.busy) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    renderUserMessage(text);

    state.busy = true;
    setStatus("Pensando...");
    toggleInputs(true);

    try {
      const result = await sendChatMessage(state.selectedCharacterId, text, state.history);

      state.history.push({ role: "user", content: text });
      state.history.push({ role: "assistant", content: result.text });

      renderAssistantMessage(result.text);
      setStatus(result.truncated ? "Respuesta truncada" : "Listo");
    } catch (error) {
      renderAssistantMessage(`No pude responder: ${error?.message ?? "error desconocido"}`);
      setStatus("Error");
    } finally {
      state.busy = false;
      toggleInputs(false);
      input.focus();
    }
  });
}

async function sendChatMessage(characterId, message, history) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      characterId,
      message,
      history,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const messageText = data?.message || `HTTP ${response.status}`;
    throw new Error(messageText);
  }

  return {
    text: data.text,
    truncated: Boolean(data.truncated),
  };
}

function renderUserMessage(text) {
  appendMessage("user", text);
}

function renderAssistantMessage(text) {
  appendMessage("bot", text);
}

function appendMessage(type, text) {
  const box = document.querySelector("#chat-messages");
  if (!box) return;

  const node = document.createElement("div");
  node.className = `message ${type === "user" ? "message--user" : "message--bot"}`;
  node.textContent = text;

  box.appendChild(node);
  box.scrollTop = box.scrollHeight;
}

function clearMessages() {
  const box = document.querySelector("#chat-messages");
  if (!box) return;
  box.innerHTML = "";
}

function toggleInputs(disabled) {
  const input = document.querySelector("#chat-input");
  const send = document.querySelector("#chat-send");

  if (input instanceof HTMLInputElement) input.disabled = disabled;
  if (send instanceof HTMLButtonElement) send.disabled = disabled;
}

function setStatus(text) {
  const status = document.querySelector("#chat-status");
  const title = document.querySelector(".chat-head__title");
  const current = getCharacter(state.selectedCharacterId);

  if (status) status.textContent = text;
  if (title) title.textContent = `Personaje activo: ${current.name}`;
}

function renderPickerSelection() {
  const chips = document.querySelectorAll(".character-chip");
  const all = listCharacters();

  chips.forEach((chip) => {
    const isActive = chip.getAttribute("data-character-id") === state.selectedCharacterId;
    chip.classList.toggle("active", isActive);
  });

  const currentExists = all.some((item) => item.id === state.selectedCharacterId);
  if (!currentExists) {
    state.selectedCharacterId = "homer";
  }
}
