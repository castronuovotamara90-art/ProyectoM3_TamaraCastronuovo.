# SPA Simpsons Chat + OpenRouter (Vercel Serverless)

## Configuracion segura

1. Crea `.env` en la raiz usando `.env.example` como base.
2. Define `OPENROUTER_API_KEY` (requerida).
3. Opcional: define `OPENROUTER_MODEL`.
4. Mantiene `AI_PROVIDER=openrouter`.
5. No subas `.env` a git.

## Variables de entorno

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=pon_aqui_tu_api_key_openrouter
OPENROUTER_MODEL=openai/gpt-3.5-turbo
```

## Ejecutar en local

```bash
npm install
npm run dev
```

`npm run dev` usa `vercel dev` y expone:

- Frontend estatico
- Serverless Function en `/api/chat`

URL local esperada: `http://localhost:3000`

## Flujo de chat

1. Frontend envia `POST /api/chat` con `{ characterId, message, history }`.
2. `api/chat.js` valida metodo/body y sanitiza entrada.
3. Llama OpenRouter via `https://openrouter.ai/api/v1/chat/completions`.
4. Responde al frontend en formato normalizado.
5. Responde al frontend con:

```json
{
  "text": "...",
  "truncated": false,
  "usage": { "inputTokens": 0, "outputTokens": 0 },
  "model": "openai/gpt-3.5-turbo",
  "character": { "id": "homer", "name": "Homer Simpson" }
}
```

## Verificacion rapida

1. Abre `http://localhost:3000/api/chat` en navegador: debe responder `METHOD_NOT_ALLOWED`.
2. Prueba un POST:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"characterId":"homer","message":"Hola","history":[]}'
```

3. Debes recibir JSON con `text`.

## Problemas comunes

- `MISSING_API_KEY`: falta `OPENROUTER_API_KEY`.
- `AI_REQUEST_FAILED`: key invalida, modelo no disponible o error del proveedor.
- `AI_QUOTA_EXCEEDED` (429): revisa cuota/rate limits.
