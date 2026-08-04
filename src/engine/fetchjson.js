
/*
 * fetchJson.js — Helper de red: el único lugar donde validamos response.ok
 *
 * GOTCHA que resuelve:
 *   fetch() NO rechaza la promesa ante 404 o 500.
 *   Si no validamos response.ok, un 404 llega al .then() como si fuera éxito.
 *
 * Patrón del doble await:
 *   1er await -> espera la respuesta de red (headers + status)
 *   2do await -> espera que el body se deserialice a JSON
 */
export async function fetchJson(url, options = {}) {
  const { timeoutMs = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      const timeoutError = new Error(`AI provider request timed out after ${timeoutMs}ms`);
      timeoutError.status = 504;
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      }),
      timeoutPromise,
    ]); // 1er await

    if (!response.ok) {
      // OpenRouter (y la mayoria de APIs REST) devuelven el detalle del error en el
      // body como { error: { code, message, status } }. Intentamos leerlo para
      // dar un mensaje util; si el body no es JSON, usamos el mensaje generico.
      let message = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorBody = await response.json();
        if (errorBody?.error?.message) {
          message = errorBody.error.message;
        }
      } catch (_) {
        // el body no era JSON parseable, nos quedamos con el mensaje generico
      }

      const err = new Error(message);
      err.status = response.status;
      throw err;
    }

    const data = await response.json(); // 2do await: deserializa el body a JSON
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`AI provider request timed out after ${timeoutMs}ms`);
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}