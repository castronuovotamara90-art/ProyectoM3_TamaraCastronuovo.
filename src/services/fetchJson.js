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
export async function fetchJson(url) {
  const response = await fetch(url); // 1er await

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
    err.status = response.status;
    throw err;
  }
const data = await response.json(); // 2do await: deserializa el body a JSON
  return data; 
}

